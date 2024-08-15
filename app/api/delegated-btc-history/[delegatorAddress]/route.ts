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
    const delegatedCol = db.collection('delegated_btc');
    const restakeCol = db.collection("restake_history");
    
    const delegatorAddress = params.delegatorAddress;
    const document = await delegatedCol.findOne(
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
      const restakeHistory = await restakeCol.find(
        {
          stakerAddress: delegatorAddress.toLowerCase(),
        },
        {
          projection: {
            _id: false,
          },
        },
      ).toArray();
      const hashmap : any = {}
      restakeHistory.forEach((el: any) => {
        hashmap[el["bitcoinTxId"]] = true
      })
      document.histories = document.histories.filter((el: any) => !hashmap[el["bitcoinTxId"]])
    }
    
    return response(document);
  } catch (error) {
    console.error(error);
    return errorResponse()
  }
}
