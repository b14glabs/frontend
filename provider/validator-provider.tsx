'use client';

import restakeContractAbi from '@/abi/restake.json';
import sentryAbi from '@/abi/sentry.json';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import { useContract } from '@/hooks/useContract';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { RestakeHistory, RestakeHistoryWithLoading } from '@/types/model';
import { getErrorMessage } from '@/utils/common';
import { Contract, JsonRpcProvider } from 'ethers';
import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';

type Props = {
  delegatedCoin: string;
  commission: string;
  validatorAddress: string;
  currentAccPerShare: number;
  accPerShares: Array<string>;
  restakeHistories: RestakeHistoryWithLoading;
  delegatorsCount: number;
  restakeApr: string;
  reward: string;
  setValidatorAddress: (address: string) => void;
  getRestakeHistory: (page: number) => void;
  getReward: () => void;
};

const defaultValues: Props = {
  delegatedCoin: '0',
  commission: '5',
  validatorAddress: '',
  currentAccPerShare: 0,
  restakeApr: '0',
  accPerShares: [],
  restakeHistories: {
    data: [],
    isLoading: false,
    page: 1,
    totalPage: 1,
    totalCount: 0,
  },
  delegatorsCount: 0,
  reward: '0',
  setValidatorAddress: () => {},
  getRestakeHistory: () => {},
  getReward: () => {},
};

const ValidatorContext = createContext(defaultValues);
const TWO_WEEK_DAYS = 14;

export const ValidatorProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { address } = useOkxWalletContext();

  const [delegatedCoin, setDelegatedCoin] = useState('0');
  const [commission, setCommission] = useState('5');
  const [validatorAddress, setValidatorAddress] = useState(
    defaultValues.validatorAddress,
  );
  const [accPerShares, setAccPerShares] = useState<Array<string>>([]);
  const [restakeApr, setRestakeApr] = useState('0');
  const [restakeHistories, setRestakeHistories] = useState<
    Props['restakeHistories']
  >(defaultValues.restakeHistories);
  const [delegatorsCount, setDelegatorsCount] = useState(0);
  const [reward, setReward] = useState(defaultValues.reward);
  const restakeHackthonContract = useContract(
    validatorAddress,
    restakeContractAbi,
    new JsonRpcProvider('https://rpc.test.btcs.network'),
    null,
  ) as Contract;
  const sentryContract = useContract(
    CONTRACT_ADDRESS.sentry,
    sentryAbi,
    new JsonRpcProvider('https://rpc.test.btcs.network'),
    null,
  ) as Contract;

  const getData = async () => {
    try {
        getAccPerShare()
        getTotalStake()
        getRestakeHistory()
        getCommission()
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };

  const getCommission = async () => {
    const res = await sentryContract.getAllSentries();
    const validatorList = res[0];
    validatorList.forEach((el: any) => {
      if (el[3].toLowerCase() === validatorAddress.toLowerCase()) {
        setCommission(el[1].toString());
      }
    });
  };
  const getTotalStake = async () => {
    try {
      const res = await restakeHackthonContract.getPoolTotalStake(); // 0: amount, 1: prevUnlockTime
      setDelegatedCoin(res.amount.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getAccPerShare = async () => {
    const round = Math.round(Date.now() / 86400000);
    const listData = await Promise.all(
      new Array(14)
        .fill(0)
        .map((_, idx) => {
          return restakeHackthonContract.accPerShare(round - idx)
        }),
    );
    setAccPerShares(listData.map((el) => el.toString()));
    await calApr(listData.map((el) => el.toString()));
  };

  const calApr = async (accPerShares: Array<string>) => {
    if (accPerShares && accPerShares.length === TWO_WEEK_DAYS) {
      const restakeApr =
        (((Number(accPerShares[accPerShares.length - 1]) -
          Number(accPerShares[0])) /
          14) *
          365) /
        100;
      setRestakeApr(restakeApr.toString());
      return;
    }
    console.error('not enough data to cal apr');
  };

  const getRestakeHistory = async (page = 1) => {
    try {
      setRestakeHistories({
        ...restakeHistories,
        isLoading: true,
      });
      const res = await fetch(`/api/restake-history?page=${page}`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          validatorAddress,
        }),
      });
      if (res.status === 200) {
        const data = (await res.json()) as RestakeHistory;
        setRestakeHistories({
          ...restakeHistories,
          data: data.data,
          page: data.page,
          totalCount: data.totalCount,
          totalPage: data.totalPage,
        });
        setDelegatorsCount(data.delegatorsCount as number);
      }
    } catch (error) {
      console.error(error);
      toast.error('Get restake history records failed.');
    } finally {
      setRestakeHistories((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    }
  };

  const getReward = async () => {
    try {
      if (!address) return setReward('0');
      const data = await restakeHackthonContract.currentReward.staticCall(
        address,
      );
      setReward(data.toString());
    } catch (error) {
      setReward('0');
      console.error(error);
    }
  };

  useEffect(() => {
    if (!validatorAddress) return;
    getData();
  }, [validatorAddress]);

  useEffect(() => {
    if (!validatorAddress) return;
    getReward();
  }, [address, validatorAddress]);

  const value = useMemo(() => {
    return {
      delegatedCoin,
      commission,
      validatorAddress,
      accPerShares,
      setValidatorAddress,
      restakeHistories,
      delegatorsCount,
      restakeApr,
      reward,
      getReward,
      getRestakeHistory,
      currentAccPerShare:
        accPerShares && accPerShares.length > 1
          ? Number(accPerShares[accPerShares.length - 1]) -
            Number(accPerShares[accPerShares.length - 2])
          : 0,
    };
  }, [
    delegatedCoin,
    commission,
    validatorAddress,
    accPerShares,
    restakeHistories,
    delegatorsCount,
    restakeApr,
    reward,
  ]);

  return (
    <ValidatorContext.Provider value={value}>
      {children}
    </ValidatorContext.Provider>
  );
};

export const useValidatorContext = () => {
  return useContext(ValidatorContext);
};
