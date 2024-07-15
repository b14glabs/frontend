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
import { Dashboard } from '@/types/model';
import { getErrorMessage } from '@/utils/common';

type Props = {
  coreApr: {
    max: string;
    min: string;
  };
  metrics: Dashboard['metrics'];
  validators: Dashboard['validators'];
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
  validators: [],
};

const DashboardContext = createContext(defaultValues);

export const DashboardProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [coreApr, setCoreApr] = useState<Props['coreApr']>(
    defaultValues.coreApr,
  );
  const [metrics, setMetrics] = useState<Props['metrics']>(
    defaultValues.metrics,
  );
  const [validators, setValidators] = useState<Props['validators']>(
    defaultValues.validators,
  );

  useEffect(() => {
    const getApr = async () => {
      try {
        const res = await fetch('/api/staking/search_candidate_page', {
          method: 'POST',
          body: JSON.stringify({ pageNum: 1, pageSize: 30 }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
        if (res.status !== 200) {
        }
        const data = (await res.json()) as SearchCandidateCoreDao;
        const aprSorted = data.data.records
          .filter((record) => record.btcStakeApr !== '0')
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
          setValidators(data.validators);
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
  }, []);

  const value = useMemo(() => {
    return {
      coreApr,
      metrics,
      validators,
    };
  }, [coreApr, metrics, validators]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
export const useDashboardContext = () => {
  return useContext(DashboardContext);
};
