'use client';

import restakeContractAbi from '@/abi/restake.json';
import sentryAbi from '@/abi/sentry.json';
import { coreNetwork } from '@/constant/network';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import { useContract } from '@/hooks/useContract';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { RestakeHistory, RestakeHistoryWithLoading } from '@/types/model';
import { formatAmount, getErrorMessage } from '@/utils/common';
import {
  Contract,
  formatEther,
  formatUnits,
  JsonRpcProvider,
  parseEther,
  parseUnits,
} from 'ethers';
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
  delegatedCoin: bigint;
  coreDelegatedCoin: bigint;
  commission: string;
  validatorAddress: string;
  accPerShares: Array<{
    idx: number;
    value: bigint;
  }>;
  restakeHistories: RestakeHistoryWithLoading;
  delegatorsCount: number;
  restakeApr: string;
  coreValidatorStakedByUserAddress: string | undefined;
  reward: bigint;
  coreReward: bigint;
  setValidatorAddress: (address: string) => void;
  getRestakeHistory: (page: number) => void;
  getReward: () => void;
  getTotalBtcStake: () => void;
  getTotalCoreStake: () => void
};

const defaultValues: Props = {
  delegatedCoin: BigInt(0),
  coreDelegatedCoin: BigInt(0),
  commission: '5',
  validatorAddress: '',
  restakeApr: '0',
  accPerShares: [],
  restakeHistories: {
    data: [],
    isLoading: false,
    page: 1,
    totalPage: 1,
    totalCount: 0,
  },
  coreValidatorStakedByUserAddress: undefined,
  delegatorsCount: 0,
  reward: BigInt(0),
  coreReward: BigInt(0),
  setValidatorAddress: () => {
  },
  getRestakeHistory: () => {
  },
  getReward: () => {
  },
  getTotalBtcStake: () => {
  },
  getTotalCoreStake: () => {
  },

};

const ValidatorContext = createContext(defaultValues);
const TWO_WEEK_DAYS = 14;

export const ValidatorProvider: FC<{ children: ReactNode }> = ({
                                                                 children,
                                                               }) => {
  const { address } = useOkxWalletContext();

  const [delegatedCoin, setDelegatedCoin] = useState(
    defaultValues.delegatedCoin,
  );
  const [coreDelegatedCoin, setCoreDelegatedCoin] = useState(
    defaultValues.coreDelegatedCoin,
  );
  const [commission, setCommission] = useState('5');
  const [validatorAddress, setValidatorAddress] = useState(
    defaultValues.validatorAddress,
  );
  const [accPerShares, setAccPerShares] = useState<Props['accPerShares']>([]);
  const [restakeApr, setRestakeApr] = useState('0');
  const [restakeHistories, setRestakeHistories] = useState<
    Props['restakeHistories']
  >(defaultValues.restakeHistories);
  const [delegatorsCount, setDelegatorsCount] = useState(0);
  const [reward, setReward] = useState(defaultValues.reward);
  const [coreReward, setCoreReward] = useState(defaultValues.coreReward);
  const [coreValidatorStakedByUserAddress, setCoreValidatorStakedByUserAddress] = useState<Props['coreValidatorStakedByUserAddress']>(defaultValues.coreValidatorStakedByUserAddress);

  const restakeHackthonContract = useContract(
    validatorAddress,
    restakeContractAbi,
    new JsonRpcProvider(coreNetwork.rpcUrl),
    null,
  ) as Contract;
  const sentryContract = useContract(
    CONTRACT_ADDRESS.sentry,
    sentryAbi,
    new JsonRpcProvider(coreNetwork.rpcUrl),
    null,
  ) as Contract;

  const getCoreValidatorStakedByUser = async () => {
    try {
      if (!address) return;
      const coreValidatorStakedByUser = await restakeHackthonContract.coreValidatorStakedByUser(address);
      setCoreValidatorStakedByUserAddress(coreValidatorStakedByUser[0] as string);
    } catch (error) {
      console.error(error);
    }
  };


  const getData = async () => {
    try {
      getAccPerShare();
      getTotalBtcStake();
      getTotalCoreStake();
      getRestakeHistory();
      getCommission();
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    calApr(accPerShares.map((el) => el.value.toString()));
  }, [accPerShares, delegatedCoin]);
  const getCommission = async () => {
    const res = await sentryContract.getAllOperators();
    const validatorList = res[0];
    validatorList.forEach((el: any) => {
      if (el[3].toLowerCase() === validatorAddress.toLowerCase()) {
        setCommission((Number(el[1]) / 100).toString());
      }
    });
  };
  const getTotalBtcStake = async () => {
    try {
      const res = await restakeHackthonContract.getPoolTotalStake(); // 0: amount, 1: prevUnlockTime
      setDelegatedCoin(res.amount.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getTotalCoreStake = async () => {
    try {
      const res = await restakeHackthonContract.totalCoreStaked();
      setCoreDelegatedCoin(res);
    } catch (error) {
      console.error(error);
    }
  };

  const getAccPerShare = async () => {
    const provider = new JsonRpcProvider(coreNetwork.rpcUrl);
    const latestBlock = await provider.getBlock('latest');
    // @ts-ignore
    const round = Math.floor(latestBlock?.timestamp / 86400);
    let listAccPerShare = await restakeHackthonContract.getAccPerShareBatch(round - TWO_WEEK_DAYS, round);
    const listData = [];
    for (let i = 0; i < TWO_WEEK_DAYS; i++) {
      listData.push({
        value: listAccPerShare[i],
        idx: round - TWO_WEEK_DAYS + i,
      });
    }
    setAccPerShares(listData);
  };

  const calApr = async (accPerShares: Array<string>) => {
    if (accPerShares && accPerShares.length === TWO_WEEK_DAYS) {
      const rewardPerSharePerDay = (Number(accPerShares[accPerShares.length - 1]) - Number(accPerShares[0])) / 13;
      const rewardPerSharePerYear = (rewardPerSharePerDay * 365) / 1e18; // in b14g.
      const balanceBtcPerYear = 57000 * Number(formatUnits(delegatedCoin.toString(), 8)); // core + btc in $
      const restakeApr = (rewardPerSharePerYear * 100) / balanceBtcPerYear;
      setRestakeApr(restakeApr.toString());
      return;
    }
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
      if (!address) return setReward(BigInt(0));
      const data = await restakeHackthonContract.currentReward.staticCall(
        address,
        { from: address },
      );
      setReward(data);
    } catch (error) {
      setReward(BigInt(0));
      console.error(error);
    }
  };
  const getCoreReward = async () => {
    try {
      if (!address) return setCoreReward(BigInt(0));
      const data = await restakeHackthonContract.claimCore.staticCall(address);
      setCoreReward(data);
    } catch (error) {
      setCoreReward(BigInt(0));
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
    getCoreReward();
    getCoreValidatorStakedByUser();
  }, [address, validatorAddress]);

  const value = useMemo(() => {
    return {
      delegatedCoin,
      coreReward,
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
      coreDelegatedCoin,
      coreValidatorStakedByUserAddress,
      getTotalCoreStake,
      getTotalBtcStake,
    };
  }, [getTotalCoreStake, getTotalBtcStake, delegatedCoin, coreReward, commission, validatorAddress, accPerShares, restakeHistories, delegatorsCount, restakeApr, reward, getReward, getRestakeHistory, coreDelegatedCoin, coreValidatorStakedByUserAddress]);

  return (
    <ValidatorContext.Provider value={value}>
      {children}
    </ValidatorContext.Provider>
  );
};

export const useValidatorContext = () => {
  return useContext(ValidatorContext);
};
