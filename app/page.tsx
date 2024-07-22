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
      title: 'Total CORE Delegate',
      value: `${formatAmount(
        +formatUnits(totalCore, 'ether'),
      )} CORE`,
    },
    {
      title: 'Total BTC Delegate',
      value: `${formatAmount(+formatUnits(totalBtc, 8))} BTC`,
    },
    {
      title: 'Validators',
      value: validators.length,
    },
  ];

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
