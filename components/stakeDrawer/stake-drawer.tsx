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
import { useDashboardContext } from '@/provider/dashboard-provider';
import { shortenString } from '@/utils/string';
import { SelectTxLock } from '@/components/stakeDrawer/select-tx';
import { SelectCoreValidator } from '@/components/stakeDrawer/select-core-validator';
import { Record, SearchCandidateCoreDao } from '@/types/coredao';

export const formatBalance = (balance: string, decimal = 18) =>
  ethers.formatUnits(balance, decimal);

const coreProvider = new ethers.JsonRpcProvider(coreNetwork.rpcUrl);

export default function StakeDrawer() {
  const { account, provider, address, connect, evmProvider, signer, chainId } =
    useOkxWalletContext();
  const { coredaoValidators, coreBalance, vBtcBalance, priceFeedData } =
    useDashboardContext();
  const { validatorAddress } = useValidatorContext();

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
  const [loadingGenerateMock, setLoadingGenerateMock] = useState(false);
  const [forceUpdateHistory, setForceUpdateHistory] = useState(false);
  const [step, setStep] = useState(1);
  const [coreValidator, setCoreValidator] = useState<Record | undefined>();

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
      await tx.wait();
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
      const round = Math.round(Date.now() / 86400000);
      if (+btcTx.endRound < round) {
        setModalTitle(
          `End round must greater than current round. Current is ${round}`,
        );
        setModalStatus('ERROR');
        return;
      }

      const btcTxValue = +btcTx?.value as number;
      const amountCoreRequired = ethers.parseUnits(
        (
          parseInt(btcTxValue.toString()) *
          3 *
          Number(ethers.formatUnits(priceFeedData?.price.toString(), 18))
        ).toString(),
        9,
      );

      const coreBalance = await coreProvider.getBalance(address);
      if (coreBalance < amountCoreRequired) {
        setModalTitle('Not enough CORE balance');
        setModalStatus('ERROR');
        return;
      }
      await switchOrCreateNetwork(chainId);
      setModalTitle('Transfer VBTC to contract');
      setModalTitle('Stake');
      const stakeTx = await restakeHackathonContract.reStakeAndDelegate(
        btcTx?.bitcoinTxId,
        coreValidator?.operatorAddressHash,
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

  const handleButton = () => {
    switch (step) {
      case 1:
        setStep(2);
        break;
      case 2:
        restake();
    }
  };

  const backBtn = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const buttonSubmitDisable = () => {
    if (step === 1 && !btcTx) return true;
    if (step === 2 && !coreValidator) return true;
    return false;
  };
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild onClick={clearBtcTx}>
        <Button>Delegate</Button>
      </DrawerTrigger>
      <DrawerContent>
        <LoadingModal
          modalStatus={modalStatus}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          modalTitle={modalTitle}
          modalHash={modalHash}
        />
        <div className="mx-auto container max-h-[90vh]">
          {step === 1 && (
            <SelectTxLock
              btcTx={btcTx as DelegateHistory}
              coreBalance={coreBalance}
              vBtcBalance={vBtcBalance}
              forceUpdateHistory={forceUpdateHistory}
              generate={generate}
              loadingGenerateMock={loadingGenerateMock}
              priceFeedData={priceFeedData}
              setBtcTx={setBtcTx}
            />
          )}
          {step === 2 && (
            <SelectCoreValidator
              setCoreValidator={setCoreValidator}
              coreValidator={coreValidator}
            />
          )}
          <DrawerFooter>
            {/* <Button
              disabled={!!!btcTx?.bitcoinTxId || loading}
              onClick={restake}
            >
              {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button> */}
            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={backBtn}
                variant={'outline'}
                className="border-neutral-500"
                disabled={step === 1}
              >
                Back
              </Button>
              <Button onClick={handleButton} disabled={buttonSubmitDisable()}>
                {step === 1 ? 'Next (Choose core validator)' : 'Submit'}
              </Button>
            </div>
            <DrawerClose asChild>
              <Button variant="outline" className="mt-3">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
