'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { CircleArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Metric } from '@/components/metric';
import { RestakeRecord } from '@/components/restake-record';
import StakeDrawer from '@/components/stake-drawer';
import { Overview } from '@/components/validator-overview';
import { useValidatorContext } from '@/provider/validator-provider';

export const ValidatorContent = ({
  validatorAddress,
}: {
  validatorAddress: string;
}) => {
  const { setValidatorAddress } = useValidatorContext();
  useEffect(() => {
    setValidatorAddress(validatorAddress);
  }, [validatorAddress]);

  return (
    <div className="flex-col md:flex container">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Link href="/" className="flex gap-2 items-center">
          <CircleArrowLeft /> <span className="text-sm">Back to home</span>{' '}
        </Link>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Validator</h2>
          <StakeDrawer />
        </div>
        <div className="space-y-4">
          <Metric />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
          </div>
          <RestakeRecord />
        </div>
      </div>
    </div>
  );
};
