'use client';

import { useValidatorContext } from '@/provider/validator-provider';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function Overview() {
  const { accPerShares } = useValidatorContext();
  const copyData = [...accPerShares];
  const data = copyData.map((acc, idx) => {
    const currentDay = new Date(
      Date.now() - (13 - idx) * 86400 * 1000,
    ).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
    });
    return {
      name: currentDay,
      accPerShares: acc,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        width={730}
        height={250}
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D3500C" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#D3500C" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="accPerShares"
          stroke="#EA580C"
          fillOpacity={1}
          fill="url(#colorUv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
