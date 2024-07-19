import { formatAmount, getErrorMessage } from '@/utils/common';
import { Contract, formatUnits, parseUnits } from 'ethers';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import vBtcAbi from '@/abi/bep20.json';
import restakeAbi from '@/abi/restake.json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingModal, useModal } from '@/components/loading-modal';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import { useContract } from '@/hooks/useContract';
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/provider/dashboard-provider';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { useValidatorContext } from '@/provider/validator-provider';
import { switchOrCreateNetwork } from '@/utils/wallet';

const option = [25, 50, 75, 100];

export const UnbondCard = () => {
  const { vBtcBalance, priceFeedData } = useDashboardContext();
  const { validatorAddress } = useValidatorContext();
  const { evmProvider, address, signer, chainId } = useOkxWalletContext();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [currentPercent, setCurrentPercent] = useState(0);
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

  const restakeContract = useContract(
    validatorAddress,
    restakeAbi,
    evmProvider,
    signer,
  ) as Contract;
  const vBtcContract = useContract(
    CONTRACT_ADDRESS.stakeX3Btc,
    vBtcAbi,
    evmProvider,
    signer,
  ) as Contract;
  const coreAmount =
    Number(formatUnits(priceFeedData.price, 18)) * amount * 0.3;
  const unbond = async () => {
    try {
      if (parseUnits(amount.toString(), 8) > vBtcBalance)
        return toast.error(`Max amount is ${formatUnits(vBtcBalance, 8)}`);
      if (coreAmount < 1) return toast.error('Core amount unbond must greater than 1');
      setModalOpen(true);
      setModalStatus('LOADING');
      setModalHash('');
      
      await switchOrCreateNetwork(chainId);
      const allowance = await getAllowance();
      let tx;
      if (Number(formatUnits(allowance, 8)) < amount) {
        setModalTitle('Approve vBTC to validator');
        tx = await vBtcContract.approve(
          validatorAddress,
          parseUnits(amount.toString(), 8),
        );
        await tx.wait();
      }
      setModalTitle('Unbond vBTC');
      tx = await restakeContract.unbond(parseUnits(amount.toString(), 8));
      setModalHash(tx.hash);
      await tx.wait();
      
      setModalStatus('SUCCESS');
      setModalTitle('Done.');
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        setModalOpen(false);
        setModalTitle('');
      } else {
        setModalStatus('ERROR');
        setModalTitle(getErrorMessage(error));
      }
      console.error(error);
    }
  };

  const getAllowance = async () => {
    return vBtcContract.allowance(address, validatorAddress);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(e.target.value));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <LoadingModal
        modalStatus={modalStatus}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        modalTitle={modalTitle}
        modalHash={modalHash}
      />
      <DialogContent>
        <div className="mx-auto container max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="mb-2">Unbond</DialogTitle>
            <div>
              <div className="relative">
                <Input
                  className=""
                  placeholder="Amount to unbond"
                  value={amount}
                  onChange={handleChange}
                  type="number"
                />{' '}
                <span className="absolute right-3 top-[8px]">vBTC</span>
              </div>
              <div className="flex justify-end gap-2 mt-5 mb-2">
                {option.map((percent) => (
                  <div
                    key={`unbond-option-${percent}`}
                    className={cn(
                      'border rounded-lg border-slate-600 p-2 text-center text-sm',
                      {
                        'bg-slate-800 text-white': currentPercent === percent,
                      },
                    )}
                    onClick={() => {
                      setCurrentPercent(percent);
                      setAmount(
                        formatAmount(Number(formatUnits(vBtcBalance.toString(), 10)) *
                        percent)
                      );
                    }}
                  >
                    {percent} %
                  </div>
                ))}
              </div>
              <p>You will receive {formatAmount(coreAmount, 3)} Core</p>
            </div>
          </DialogHeader>

          <DialogFooter className="mt-2">
            <Button onClick={unbond} disabled={amount === 0}>
              Unbond
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>

      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Your delegated coin
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="font-bold flex justify-between items-center">
            <p className="text-lg">
              {formatAmount(+formatUnits(vBtcBalance, 8))} vBTC{' '}
            </p>
            <DialogTrigger asChild>
              <Button disabled={Number(vBtcBalance) === 0}>Unbond</Button>
            </DialogTrigger>
          </div>
        </CardContent>
      </Card>
    </Dialog>
  );
};
