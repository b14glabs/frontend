'use client';
import sentryAbi from '@/abi/sentry.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { coreNetwork } from '@/constant/network';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import { useDashboardContext } from '@/provider/dashboard-provider';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { formatAmount, formatNumberWithCommas } from '@/utils/common';
import { formatUnits } from 'ethers';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Web3 from 'web3';

interface Validator {
  active: boolean;
  commission: bigint;
  contractAddress: string;
  totalAssertion: bigint;
}

export default function Home() {
  const { metrics, coreApr, validators } = useDashboardContext();
  const { signer } = useOkxWalletContext();
  const [commissionMap, setCommissionMap] = useState<{
    [key: string]: string;
  }>();
  const metricsCard = [
    {
      title: 'Total CORE Delegate',
      value: `${formatAmount(
        +formatUnits(metrics?.totalCoreAmount, 'ether'),
      )} CORE`,
    },
    {
      title: 'Total BTC Delegate',
      value: `${formatAmount(+formatUnits(metrics?.totalBtcAmount, 8))} BTC`,
    },
    {
      title: 'Validators',
      value: validators.length,
    },
  ];

  const getCommission = async () => {
    try {
      const web3 = new Web3(coreNetwork.rpcUrl);
      const contract = new web3.eth.Contract(
        sentryAbi,
        CONTRACT_ADDRESS.sentry,
      );
      const allSentries = (await contract.methods
        .getAllOperators()
        .call()) as any;
      const map: { [key: string]: string } = {};
      allSentries[0].forEach((el: Validator) => {
        map[el.contractAddress.toLowerCase()] = (Number(el.commission) / 100).toString();
      });
      setCommissionMap(map);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCommission();
  }, []);
  const round = Math.round(Date.now() / 86400000);
  return (
    <>
      <main className="container">
        <div className="space-y-2 text-center my-8">
          <h2 className="scroll-m-20 text-3xl font-semibold">Validators</h2>
          <p>
            <span className="text-sm">Round</span>{' '}
            <span className="font-bold">{formatNumberWithCommas(round)}</span>
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metricsCard.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-4">
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </section>
        <div className="w-full overflow-auto">
          <Table className="my-6">
            <TableHeader>
              <TableRow>
                <TableHead className="">Validator</TableHead>
                <TableHead>Delegated CORE | BTC</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validators.map((el, index) => (
                <TableRow className="" key={`validator-${el.validatorAddress}`}>
                  <TableCell className="text-base font-bold">
                    <Link href={`/validator/${el.validatorAddress}`}>
                      Validator {index + 1}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-base font-bold">
                      {formatAmount(
                        +formatUnits(el.coreAmount, 'ether')
                      )}
                    </span>{' '}
                    |{' '}
                    <span className="text-base font-bold">
                      {formatAmount(+formatUnits(el.btcAmount, 8))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">
                      {commissionMap &&
                        commissionMap[el.validatorAddress.toLowerCase()]}
                    </span>{' '}
                    %
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </>
  );
}
