import { getMongoDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { RestakeModel } from '@/types/model';
import { WithId } from 'mongodb';
import { errorResponse, response } from '@/utils/common';

const perPage = 100;

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    const body = await req.json();
    let { validatorAddress, stakerAddress } = body;
    if (!validatorAddress && !stakerAddress) {
      return response(
        {
          error: 'Missing validatorAddress, stakerAddress. Required 1',
        },
        400,
      );
    }
    validatorAddress = validatorAddress ? validatorAddress.toLowerCase() : null;
    stakerAddress = stakerAddress ? stakerAddress.toLowerCase() : null;
    const db = await getMongoDb();
    const restakeHistoryCol = db.collection('restake_history');
    const validatorCol = db.collection('validator');
    const page = req.nextUrl.searchParams.get('page') ?? 1;

    let delegatorsCount = null;
    const query = {} as any;

    if (validatorAddress) {
      query.validatorAddress = validatorAddress;
      const validator = await validatorCol.findOne({
        validatorAddress,
      });
      delegatorsCount = validator?._id ? validator.delegatorsCount : 0;
    } else {
      query.stakerAddress = stakerAddress;
    }
    const totalCount = await restakeHistoryCol.countDocuments(query);
    const totalPage = Math.ceil(totalCount / perPage);

    const result = (await restakeHistoryCol
      .find(query, {
        projection: {
          _id: false,
        },
      })
      .skip((+page - 1) * perPage)
      .limit(perPage)
      .toArray()).reverse() as WithId<RestakeModel>[];

    return response({
      data: result,
      page: +page,
      totalPage: +totalPage,
      totalCount: +totalCount,
      delegatorsCount,
    });
  } catch (error) {
    console.error(error);
    return errorResponse();
  }
}
