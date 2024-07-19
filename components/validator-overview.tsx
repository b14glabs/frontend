'use client';

import { useValidatorContext } from '@/provider/validator-provider';
import { formatAmount } from '@/utils/common';
import { formatEther, formatUnits, parseUnits } from 'ethers';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const callRewardPerShare = (
  accPerShareDatas: Array<{
    value: bigint;
    idx: number;
  }>,
) => {
  const accPerShareDatasSorted = accPerShareDatas.sort((a, b) => a.idx - b.idx);
  const rewardPerShares = [];
  for (let i = 1; i < accPerShareDatasSorted.length; i++) {
    rewardPerShares.push({
      'Amount b14g per btc':
        Math.max(
          Number(accPerShareDatas[i].value) -
            Number(accPerShareDatas[i - 1].value),
          0,
        ) / 1e18,
      Round: accPerShareDatas[i].idx,
    });
  }
  return rewardPerShares;
};

export function Overview() {
  const { accPerShares } = useValidatorContext();
  const rewardPerShare = callRewardPerShare(accPerShares);
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        width={730}
        height={250}
        data={rewardPerShare}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D3500C" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#D3500C" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <XAxis dataKey="Round" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="Amount b14g per btc"
          stroke="#EA580C"
          fillOpacity={1}
          fill="url(#colorUv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
