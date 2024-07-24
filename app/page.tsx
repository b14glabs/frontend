'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDashboardContext } from '@/provider/dashboard-provider';
import { formatAmount, formatNumberWithCommas } from '@/utils/common';
import { formatUnits } from 'ethers';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export default function Home() {
  const { validators } = useDashboardContext();
  let totalCore = BigInt(0);
  let totalBtc = BigInt(0);
  validators.forEach(item => {
    totalCore += item.coreAmount;
    totalBtc += item.btcAmount;
  })
  const metricsCard = [
    {
      title: 'Total CORE Delegated',
      value: `${formatAmount(
        +formatUnits(totalCore, 'ether'),
      )} CORE`,
    },
    {
      title: 'Total BTC Delegated',
      value: `${formatAmount(+formatUnits(totalBtc, 8))} BTC`,
    },
    {
      title: 'Observers',
      value: validators.length,
      tooltip: "Observers monitor and confirm the accuracy of each Bitcoin block stored on the Core Chain. They earn rewards for accurate confirmations and face penalties for incorrect ones."

    },
  ];

  const round = Math.round(Date.now() / 86400000);
  return (
    <>
      <main className="container">
        <div className="space-y-2 text-center my-8">
          <h2 className="scroll-m-20 text-3xl font-semibold">Observers</h2>
          <p>
            <span className="text-sm">Round</span>{' '}
            <span className="font-bold">{formatNumberWithCommas(round)}</span>
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metricsCard.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className='flex justify-between w-full'>
                  <div className="text-sm font-medium">{metric.title}</div>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {metric.tooltip && <Info className="text-muted-foreground" size={20} />}
                      </TooltipTrigger>
                      <TooltipContent className='font-medium max-w-96'>
                        <p>{metric.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                <TableHead className="">Observer</TableHead>
                <TableHead>Delegated CORE | BTC</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validators.map((el, index) => (
                <TableRow className="" key={`validator-${el.validatorAddress}`}>
                  <TableCell className="text-base font-bold">
                    <Link href={`/validator/${el.validatorAddress}`} className='flex gap-2 items-center'>
                      <img src={`${index + 1}.png`} className='w-8 h-8 rounded-full'/>
                      Observer {index + 1}
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
                      {el.commission}
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
