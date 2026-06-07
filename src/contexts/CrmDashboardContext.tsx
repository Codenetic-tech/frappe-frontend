import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface DistributionItem {
    label: string;
    count: number;
}

export interface CrmSummaryData {
    status: string;
    total_clients: number;
    state_distribution: DistributionItem[];
    age_distribution: DistributionItem[];
    gender_distribution: DistributionItem[];
    activation_status_distribution: DistributionItem[];
    annual_income_distribution: DistributionItem[];
}

interface CrmDashboardContextType {
    data: CrmSummaryData | null;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    lastUpdated: string;
    fetchData: (isRefresh?: boolean) => Promise<void>;
}

const CrmDashboardContext = createContext<CrmDashboardContextType | undefined>(undefined);

export const useCrmDashboard = () => {
    const ctx = useContext(CrmDashboardContext);
    if (!ctx) throw new Error('useCrmDashboard must be used within a CrmDashboardProvider');
    return ctx;
};

const readSession = <T,>(key: string, fallback: T): T => {
    try {
        const v = sessionStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch {
        return fallback;
    }
};

export const CrmDashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated } = useAuth();

    const [data, setData] = useState<CrmSummaryData | null>(() => readSession('crmDashboardData', null));
    const [lastUpdated, setLastUpdated] = useState<string>(() => readSession('crmDashboardLastUpdated', ''));
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFetching = useRef(false);
    const hasInitialFetched = useRef(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!token || isFetching.current) return;
        isFetching.current = true;
        setError(null);

        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/method/rms.branch.get_clients_summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': token },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const resJson = await response.json();
            if (resJson.message?.status === 'success') {
                const updated = new Date().toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                });
                setData(resJson.message);
                setLastUpdated(updated);
                sessionStorage.setItem('crmDashboardData', JSON.stringify(resJson.message));
                sessionStorage.setItem('crmDashboardLastUpdated', JSON.stringify(updated));
            } else {
                throw new Error('Failed to load dashboard summaries.');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching dashboard data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            isFetching.current = false;
        }
    }, [token]);

    // Clear on logout
    useEffect(() => {
        if (!isAuthenticated) {
            setData(null);
            setLastUpdated('');
            setError(null);
            sessionStorage.removeItem('crmDashboardData');
            sessionStorage.removeItem('crmDashboardLastUpdated');
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated]);

    // Initial fetch after login — skip if sessionStorage already has data
    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            hasInitialFetched.current = true;
            const cached = sessionStorage.getItem('crmDashboardData');
            if (!cached) fetchData();
        }
    }, [isAuthenticated, token, fetchData]);

    return (
        <CrmDashboardContext.Provider value={{ data, isLoading, isRefreshing, error, lastUpdated, fetchData }}>
            {children}
        </CrmDashboardContext.Provider>
    );
};
