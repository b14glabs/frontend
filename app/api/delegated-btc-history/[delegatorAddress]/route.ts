import { getMongoDb } from '@/lib/db';
import { errorResponse, response } from '@/utils/common';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: { delegatorAddress: string };
  },
) {
  try {
    const db = await getMongoDb();
    const collection = db.collection('delegated_btc');
    const delegatorAddress = params.delegatorAddress;
    const document = await collection.findOne(
      {
        delegator: delegatorAddress.toLowerCase(),
      },
      {
        projection: {
          _id: false,
        },
      },
    );
    if(document) {
      document.histories = document?.histories.reverse()
    }
    return response(document);
  } catch (error) {
    console.error(error);
    return errorResponse()
  }
}
