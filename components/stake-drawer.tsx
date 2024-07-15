'use client';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ReloadIcon } from '@radix-ui/react-icons';
import * as ethers from 'ethers';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import bep20Abi from '@/abi/bep20.json';
import pledgeAgentAbi from '@/abi/pledgeAgent.json';
import priceFeedAbi from '@/abi/priceFeed.json';
import restakeHackathonAbi from '@/abi/restake.json';
import { DelegateBtcHistories } from '@/components/delegated-histories';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import { useContract } from '@/hooks/useContract';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { DelegateHistory } from '@/types/model';

import { LoadingModal, useModal } from '@/components/loading-modal';
import { getRandomData } from '@/constant/data';
import { coreNetwork } from '@/constant/network';
import { useValidatorContext } from '@/provider/validator-provider';
import { formatAmount, getErrorMessage } from '@/utils/common';
import { switchOrCreateNetwork } from '@/utils/wallet';
import Web3 from 'web3';
type PriceFeedData = {
  price: string;
  decimal: number;
  timestamp: string;
};

const formatBalance = (balance: string, decimal = 18) =>
  ethers.formatUnits(balance, decimal);

const coreProvider = new ethers.JsonRpcProvider(coreNetwork.rpcUrl);

export default function StakeDrawer() {
  const { account, provider, address, connect, evmProvider, signer, chainId } =
    useOkxWalletContext();
  const { validatorAddress } = useValidatorContext();
  const vBtcContract = useContract(
    CONTRACT_ADDRESS.stakeX3Btc,
    bep20Abi,
    evmProvider,
    signer,
  ) as ethers.Contract;
  const priceFeedContract = useContract(
    CONTRACT_ADDRESS.priceFeed,
    priceFeedAbi,
    evmProvider,
    signer,
  ) as ethers.Contract;
  const pledgeAgentContract = useContract(
    CONTRACT_ADDRESS.pledgeAgent,
    pledgeAgentAbi,
    evmProvider,
    signer,
  ) as ethers.Contract;

  const restakeHackathonContract = useContract(
    validatorAddress,
    restakeHackathonAbi,
    evmProvider,
    signer,
  ) as ethers.Contract;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [btcTx, setBtcTx] = useState<DelegateHistory>();
  const [coreBalance, setCoreBalance] = useState<string>('0');
  const [vBtcBalance, setvBtcBalance] = useState<string>('0');
  const [priceFeedData, setPriceFeedData] = useState<PriceFeedData>();
  const [loadingGenerateMock, setLoadingGenerateMock] = useState(false);
  const [forceUpdateHistory, setForceUpdateHistory] = useState(false);

  const {
    modalStatus,
    setModalStatus,
    modalTitle,
    setModalTitle,
    modalOpen,
    setModalOpen,
    setModalHash,
    modalHash,
  } = useModal();

  const getData = async () => {
    getVbtcBalance();
    getPriceFeed();
    getCoreBalance();
  };

  const getPriceFeed = async () => {
    try {
      const priceFeed = await priceFeedContract.getLastData();
      setPriceFeedData({
        price: priceFeed[0].toString(),
        decimal: Number(priceFeed[1]),
        timestamp: priceFeed[2].toString(),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getVbtcBalance = async () => {
    try {
      const balance = await vBtcContract.balanceOf(address);
      setvBtcBalance(balance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getCoreBalance = async () => {
    try {
      const coreBalance = await coreProvider.getBalance(address);
      setCoreBalance(coreBalance.toString());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!open || !validatorAddress) return;
    if (account && address && signer && chainId === coreNetwork.chainId) {
      getData();
    }
  }, [account, address, signer, chainId, open]);

  useEffect(() => {
    if (evmProvider) switchOrCreateNetwork(chainId);
  }, [evmProvider]);

  async function generate() {
    try {
      switchOrCreateNetwork(chainId);
      setLoadingGenerateMock(true);
      const mockData = getRandomData();
      const btcReiceipt = {
        endRound: mockData.endRound,
        value: +mockData.btcValue,
        delegator: address,
        agent: '0x651dA43BE21FdB85615A58350Cc09D019C3f47c4',
        fee: 0,
        feeReceiver: '0x0000000000000000000000000000000000000000',
        rewardIndex: 1,
      };

      const tx = await pledgeAgentContract.updateBtcReiptMock(
        '0x' + mockData.btcTxId,
        btcReiceipt,
        '0x' + mockData.btcTxId,
        Web3.utils.hexToBytes(Web3.utils.asciiToHex(mockData.script)),
        mockData.btcBlockHeight,
        0,
      );
      await tx.wait()
      await fetch('/api/new-delegated-btc', {
        method: 'POST',
        body: JSON.stringify({
          coreTxId: tx.hash,
        }),
        headers: {
          'Content-type': 'application/json',
        },
      });
      setForceUpdateHistory(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingGenerateMock(false);
    }
  }

  const clearBtcTx = () => {
    setBtcTx(undefined);
  };
  const restake = async () => {
    try {
      if (!address) return toast.info('Connect wallet first');
      if (!btcTx) return toast.error('Not selected tx');
      setLoading(true);
      setModalOpen(true);
      setModalStatus('LOADING');
      setModalTitle('');
      setModalHash('');
      const round = Math.round(Date.now() / 86400000)
      if(+btcTx.endRound < round){
        setModalTitle(`End round must greater than current round. Current is ${round}`);
        setModalStatus('ERROR');
        return;
      }

      const btcTxValue = +btcTx?.value as number;
      const amountCoreRequired = ethers.parseUnits(
        (
          parseInt(btcTxValue.toString()) *
          3 *
          Number(Web3.utils.fromWei(priceFeedData?.price as string, 'ether'))
        ).toString(),
        9,
      );
      const coreBalance = await coreProvider.getBalance(address);
      if (coreBalance < amountCoreRequired) {
        setModalTitle('Not enough CORE balance');
        setModalStatus('ERROR');
        return;
      }

      if (BigInt(vBtcBalance) < btcTxValue) {
        setModalTitle('Not enough vBTC balance');
        setModalStatus('ERROR');
        return;
      }
      await switchOrCreateNetwork(chainId);
      setModalTitle('Transfer VBTC to contract');
      const transferVbtcTx = await vBtcContract.transfer(
        CONTRACT_ADDRESS.txManagement,
        btcTx.value,
      );
      await transferVbtcTx.wait();
      setModalTitle('Stake');
      const stakeTx = await restakeHackathonContract.reStake(
        btcTx?.bitcoinTxId,
        {
          value: amountCoreRequired,
        },
      );
      setModalHash(stakeTx.hash);
      await stakeTx.wait();
      fetch('/api/new-restake', {
        method: 'POST',
        body: JSON.stringify({
          coreTxId: stakeTx.hash,
        }),
      });
      setModalStatus('SUCCESS');
      setModalTitle('Done.');
      getData();
    } catch (error: any) {
      console.error('Restake error', error);
      if (error.code === 'ACTION_REJECTED') {
        setModalOpen(false);
        setModalTitle('');
      } else {
        setModalStatus('ERROR');
        setModalTitle(getErrorMessage(error));
      }

      toast.error(error as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild onClick={clearBtcTx}>
        <Button>Delegate</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto container max-h-[90vh]">
          <DrawerHeader>
            <div className="flex justify-between">
              <div>
                <LoadingModal
                  modalStatus={modalStatus}
                  modalOpen={modalOpen}
                  setModalOpen={setModalOpen}
                  modalTitle={modalTitle}
                  modalHash={modalHash}
                />
                <DrawerTitle className="mb-2">Restake</DrawerTitle>
                <DrawerDescription>
                  Choose your Bitcoin transaction delegate prior to restaking.
                </DrawerDescription>
              </div>
              <div className="select-text flex flex-col items-end gap-1">
                <div>
                  <span className="text-sm">Your CORE | BTC</span> :{' '}
                  <span className="font-bold">
                    {formatAmount(+coreBalance / 1e18, 4)}
                  </span>{' '}
                  |{' '}
                  <span className="font-bold">
                    {formatBalance(vBtcBalance, 8)}
                  </span>
                </div>
                <Button
                  className="w-min text-sm bg-green-600 hover:bg-green-700"
                  onClick={generate}
                  disabled={!!loadingGenerateMock}
                >
                  Generate lock btc{' '}
                  {loadingGenerateMock && (
                    <ReloadIcon className="ml-1 h-4 w-4 animate-spin" />
                  )}
                </Button>
              </div>
            </div>
          </DrawerHeader>
          <div className="p-4 pb-0 select-text">
            <DelegateBtcHistories
              setBtcTx={setBtcTx}
              btcTx={btcTx}
              forceUpdate={forceUpdateHistory}
            />
          </div>
          <DrawerFooter>
            <Button
              disabled={!!!btcTx?.bitcoinTxId || loading}
              onClick={restake}
            >
              {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
