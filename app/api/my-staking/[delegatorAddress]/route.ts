import { getMongoDb } from '@/lib/db';
import { errorResponse, response } from '@/utils/common';
import { NextRequest } from 'next/server';

const perPage = 100000;

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      delegatorAddress: string;
    };
  },
) {
  try {
    let { delegatorAddress } = params;
    if (!delegatorAddress)
      return new Response(JSON.stringify({ error: 'Missing address' }), {
        status: 400,
      });
    delegatorAddress = delegatorAddress.toString();

    const db = await getMongoDb();
    const restakeHistoryCol = db.collection('restake_history');

    const result = await restakeHistoryCol
      .aggregate([
        {
          $match: {
            stakerAddress: delegatorAddress,
          },
        },
        {
          $addFields: {
            coreAmountAsNumber: { $toDouble: '$coreAmount' },
            btcAmountAsNumber: { $toDouble: '$btcAmount' },
          },
        },
        {
          $group: {
            _id: null,
            totalCoreAmount: {
              $sum: '$coreAmountAsNumber',
            },
            totalBtcAmount: {
              $sum: '$btcAmountAsNumber',
            },
          },
        },
        {
          $project: {
            _id: false,
            totalCoreAmount: true,
            totalBtcAmount: true,
          },
        },
      ])
      .toArray();
    if (!result.length) {
      return response({
        data: {
          totalCoreAmount: '0',
          totalBtcAmount: '0',
        },
      });
    }
    return response({
      data: {
        totalCoreAmount: result[0].totalCoreAmount.toString(),
        totalBtcAmount: result[0].totalBtcAmount.toString(),
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse();
  }
}
