'use client';
import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';
import { SearchCandidateCoreDao } from '@/types/coredao';
import { toast } from 'react-toastify';
import { Dashboard, Validator } from '@/types/model';
import { getErrorMessage } from '@/utils/common';
import { useContract } from '@/hooks/useContract';
import { CONTRACT_ADDRESS } from '@/constant/web3';
import priceFeedAbi from '@/abi/priceFeed.json';
import sentryAbi from '@/abi/sentry.json';
import bep20Abi from '@/abi/bep20.json';
import { JsonRpcProvider, Contract, ethers } from 'ethers';
import { coreNetwork } from '@/constant/network';
import { useOkxWalletContext } from '@/provider/okx-wallet-provider';
import { PriceFeedData } from '@/types';

type Props = {
  coreApr: {
    max: string;
    min: string;
  };
  metrics: Dashboard['metrics'];
  validators: Dashboard['validators'];
  vBtcBalance: bigint;
  coreBalance: bigint;
  coredaoValidators: SearchCandidateCoreDao['data']['records'];
  priceFeedData: PriceFeedData;
};

const defaultValues: Props = {
  coreApr: {
    max: '0',
    min: '0',
  },
  metrics: {
    totalBtcAmount: '0',
    totalCoreAmount: '0',
    validatorsCount: 0,
  },
  vBtcBalance: BigInt(0),
  coreBalance: BigInt(0),
  validators: [],
  coredaoValidators: [],
  priceFeedData: {
    decimal: 0,
    price: BigInt(0),
    timestamp: BigInt(0),
  },
};

const DashboardContext = createContext(defaultValues);

export const DashboardProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [vBtcBalance, setvBtcBalance] = useState<Props['vBtcBalance']>(
    defaultValues.vBtcBalance,
  );
  const [coreBalance, setCoreBalance] = useState<Props['coreBalance']>(
    defaultValues.coreBalance,
  );
  const [coreApr, setCoreApr] = useState<Props['coreApr']>(
    defaultValues.coreApr,
  );
  const [metrics, setMetrics] = useState<Props['metrics']>(
    defaultValues.metrics,
  );
  const [validators, setValidators] = useState<Props['validators']>(
    defaultValues.validators,
  );
  const [priceFeedData, setPriceFeedData] = useState<Props['priceFeedData']>(
    defaultValues.priceFeedData,
  );
  const { address } = useOkxWalletContext();

  const [coredaoValidators, setCoredaoValidators] = useState<
    Props['coredaoValidators']
  >([]);
  const sentryContract = useContract(
    CONTRACT_ADDRESS.sentry,
    sentryAbi,
    new JsonRpcProvider(coreNetwork.rpcUrl),
    null,
  ) as Contract;

  const vBtcContract = useContract(
    CONTRACT_ADDRESS.stakeX3Btc,
    bep20Abi,
    new JsonRpcProvider(coreNetwork.rpcUrl),
    null,
  ) as ethers.Contract;

  const priceFeedContract = useContract(
    CONTRACT_ADDRESS.priceFeed,
    priceFeedAbi,
    new JsonRpcProvider(coreNetwork.rpcUrl),
    null,
  ) as Contract;

  const getPriceFeed = async () => {
    try {
      const priceFeed = await priceFeedContract.getLastData();
      setPriceFeedData({
        price: priceFeed[0],
        decimal: Number(priceFeed[1]),
        timestamp: priceFeed[2],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const getCoreBalance = async () => {
    try {
      if (!address) return;
      const coreProvider = new ethers.JsonRpcProvider(coreNetwork.rpcUrl);
      const coreBalance = await coreProvider.getBalance(address);
      setCoreBalance(coreBalance);
    } catch (error) {
      console.error(error);
    }
  };
  const getVbtcBalance = async () => {
    try {
      if (!address) return;
      const balance = await vBtcContract.balanceOf(address);
      setvBtcBalance(balance);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    getCoreBalance();
    getVbtcBalance();
  }, [address]);

  useEffect(() => {
    const getCoreTestnetValidator = async () => {
      try {
        const testnetRes = await fetch(
          '/api-test/staking/search_candidate_page',
          {
            method: 'POST',
            body: JSON.stringify({ pageNum: 1, pageSize: 30 }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          },
        );
        const data = (await testnetRes.json()) as SearchCandidateCoreDao;
        const activeRecords = data.data.records.filter(
          (record) => record.active,
        );
        setCoredaoValidators(activeRecords);
      } catch (error) {
        console.error(error);
        toast.error('Get apr from coredao failed');
      }
    };

    const getApr = async () => {
      try {
        const mainnetRes = await fetch(
          '/api-main/staking/search_candidate_page',
          {
            method: 'POST',
            body: JSON.stringify({ pageNum: 1, pageSize: 30 }),
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          },
        );
        const data = (await mainnetRes.json()) as SearchCandidateCoreDao;
        const activeRecords = data.data.records.filter(
          (record) => record.active,
        );
        const aprSorted = activeRecords
          .sort((a, b) => Number(b.apr) - Number(a.apr))
          .map((el) => el['btcStakeApr']);
        setCoreApr({
          max: aprSorted[0],
          min: aprSorted[aprSorted.length - 1],
        });
      } catch (error) {
        console.error(error);
        toast.error('Get apr from coredao failed');
      }
    };
    const getMetrics = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.status === 200) {
          const data = (await res.json()) as Dashboard;
          setMetrics(data.metrics);
          const map: Record<string, Validator> = {};
          data.validators.forEach((item) => {
            map[item['validatorAddress'].toLowerCase()] = item;
          });
          const allSentries = await sentryContract.getAllOperators();
          const validators = allSentries[0].map((el: any) => {
            const validatorAddress = el.contractAddress.toLowerCase()
            const coreAmount = map[validatorAddress]
              ? map[validatorAddress]['coreAmount']
              : '0';
            const btcAmount = map[validatorAddress]
              ? map[validatorAddress]['btcAmount']
              : '0';
            const delegatorsCount = map[validatorAddress]
              ? map[validatorAddress]['delegatorsCount']
              : 0;
            return {
              validatorAddress: el.contractAddress.toLowerCase(),
              coreAmount,
              delegatorsCount,
              btcAmount,
            };
          });
          setValidators(validators);
        } else {
          throw `Get metrics failed with status ${res.status}`;
        }
      } catch (error) {
        console.error(error);
        toast.error(getErrorMessage(error));
      }
    };
    getApr();
    getMetrics();
    getPriceFeed();
    getCoreTestnetValidator();
  }, []);
  const value = useMemo(() => {
    return {
      coreApr,
      metrics,
      validators,
      coredaoValidators,
      coreBalance,
      vBtcBalance,
      priceFeedData,
    };
  }, [coreApr, metrics, validators, coredaoValidators, coreBalance, vBtcBalance, priceFeedData]);
  console.log("coreBalance dashboard", coreBalance)
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
export const useDashboardContext = () => {
  return useContext(DashboardContext);
};
