import { formatBalance } from '@/components/stakeDrawer/stake-drawer';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useDashboardContext } from '@/provider/dashboard-provider';
import { Record } from '@/types/coredao';
import { formatAmount } from '@/utils/common';
import { shortenString } from '@/utils/string';
import { Dispatch, SetStateAction } from 'react';

export function SelectCoreValidator({
  coreValidator,
  setCoreValidator,
}: {
  coreValidator: Record | undefined;
  setCoreValidator: Dispatch<SetStateAction<Record | undefined>>;
}) {
  const { coredaoValidators } = useDashboardContext();
  return (
    <div className="max-h-[300px] overflow-y-scroll">
      <Table className="relative">
        <TableHeader className="sticky top-0 bg-white">
          <TableRow>
            <TableHead>Validator</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-right">CORE Reward Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coredaoValidators.map((validator) => (
            <TableRow key={validator.operatorAddressHash} onClick={() => setCoreValidator(validator)} className={cn('hover:bg-white', {
              '!bg-slate-300 font-semibold':
              validator.operatorAddressHash === coreValidator?.operatorAddressHash,
            })}>
              <TableCell className="font-bold">
                {/* <img src={coreValidator?.operatorAddress.candidateLogo}/> */}
                <a
                  href={`https://stake.test.btcs.network/validator/${validator.operatorAddressHash}`}
                  target="_blank"
                >
                  {validator.operatorAddress.candidateName
                    ? validator.operatorAddress.candidateName
                    : shortenString(validator.operatorAddressHash, 4)}
                </a>
              </TableCell>
              <TableCell className="text-right font-bold">
                {validator.commission / 10} %
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatAmount(+validator.apr, 2)} %
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
