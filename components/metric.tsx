'use client';
import { Info } from 'lucide-react';

import { CopyWrapper } from '@/components/copy-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import restakeAbi from '@/abi/restake.json';
import { LoadingModal, useModal } from '@/components/loading-modal';
import { Button } from '@/components/ui/button';
import { useContract } from '@/hooks/useContract';
import { useDashboardContext } from '@/provider/dashboard-provider';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { useValidatorContext } from '@/provider/validator-provider';
import { formatAmount, getErrorMessage } from '@/utils/common';
import { shortenString } from '@/utils/string';
import { Contract } from 'ethers';
import { useEffect } from 'react';
import { DelegatorIcon } from '@/components/icon/delegator-icon';
import { UnbondCard } from '@/components/unbond-card';

export const Metric = () => {
  const { coreApr } = useDashboardContext();
  const {
    delegatedCoin,
    currentAccPerShare,
    restakeApr,
    validatorAddress,
    delegatorsCount,
    commission,
    reward,
    getReward,
  } = useValidatorContext();
  const { evmProvider, address, signer, chainId, connect } =
    useOkxWalletContext();
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

  const claim = async () => {
    try {
      setModalOpen(true);
      setModalStatus('LOADING');
      setModalHash('');
      setModalTitle('Claim reward');
      const tx = await restakeContract.claimReward();
      setModalHash(tx.hash);
      await tx.wait();
      setModalStatus('SUCCESS');
      setModalTitle('Done.');
      getReward();
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


  const unbond = () => {
    try {
      
    } catch (error) {
      console.error(error)
    }
  };
  return (
    <div className="flex flex-wrap gap-4 justify-center -mx-2">
      <LoadingModal
        modalStatus={modalStatus}
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
        modalTitle={modalTitle}
        modalHash={modalHash}
      />
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delegated Coin</CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="text-2xl font-bold">
            {formatAmount(+delegatedCoin / 1e8)} BTC
          </div>
        </CardContent>
      </Card>
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Max APR</CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground" size={20} />
              </TooltipTrigger>
              <TooltipContent className="max-w-96">
                <p>
                  The APR value is calculated by adding the maximum value from
                  CoreDAO to the value from the validator.
                </p>
                <p>
                  Max | Min core Apr:{' '}
                  <span className="font-bold">
                    {formatAmount(+coreApr.max, 3)}
                  </span>{' '}
                  |{' '}
                  <span className="font-bold">
                    {formatAmount(+coreApr.min, 3)}
                  </span>{' '}
                  %
                </p>
                <p>
                  Validator Apr:{' '}
                  <span className="font-bold">
                    {formatAmount(+restakeApr, 5)}
                  </span>{' '}
                  %
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="text-2xl font-bold">
            {formatAmount(+restakeApr + +coreApr.max, 3)} %
          </div>
        </CardContent>
      </Card>
      {/* <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Account Per Share
          </CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground" size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nothing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="text-2xl font-bold">{currentAccPerShare}</div>
        </CardContent>
      </Card> */}
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Commission</CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground" size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nothing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="text-2xl font-bold">{commission} %</div>
        </CardContent>
      </Card>
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BTC Delegators</CardTitle>
          <DelegatorIcon />
        </CardHeader>
        <CardContent className="mt-4">
          <div className="text-2xl font-bold">{delegatorsCount}</div>
        </CardContent>
      </Card>
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Operator Address
          </CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground" size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>The validator contract address</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="text-base font-bold">
            <CopyWrapper value={validatorAddress}>
              {shortenString(validatorAddress, 4)}
            </CopyWrapper>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full md:w-[calc(50%-1rem)] lg:w-[calc(33%-1rem)] px-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Your reward</CardTitle>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground" size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nothing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="font-bold flex justify-between items-center">
            <p className="text-lg">{formatAmount(+reward / 1e18, 3)} B14G </p>
            <Button
              onClick={claim}
              disabled={Number(formatAmount(+reward / 1e18, 3)) === 0}
            >
              Claim
            </Button>
          </div>
        </CardContent>
      </Card>
      <UnbondCard />
    </div>
  );
};
