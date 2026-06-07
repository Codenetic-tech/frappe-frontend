import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface RevenueItem {
    ucc: string;
    name: string;
    branch: string;
    parent: string;
    path?: string;
    level?: number;
    brokerage: number;
    payout: number;
    income: number;
}

export interface RevenueSummary {
    brokerageDirect: number;
    brokerageInDirect: number;
    brokerageTotal: number;
    payoutDirect: number;
    payoutInDirect: number;
    payoutTotal: number;
    incomeDirect: number;
    incomeInDirect: number;
    incomeTotal: number;
}

export interface RevenueFetchParams {
    from: string;
    to: string;
    client_codes: string[];
    sub_codes: string[];
}

const PAGE_SIZE = 100;

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const DEFAULT_REVENUE_PARAMS: RevenueFetchParams = {
    from: fmt(firstOfMonth),
    to: fmt(today),
    client_codes: [],
    sub_codes: [],
};

interface RevenueContextType {
    revenueData: RevenueItem[] | null;
    summary: RevenueSummary | null;
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    appliedParams: RevenueFetchParams;
    isLoading: boolean;
    error: string | null;
    pageSize: number;
    fetchRevenue: (params: RevenueFetchParams, page: number) => Promise<void>;
    refreshRevenue: () => Promise<void>;
    exportRevenue: (
        params: RevenueFetchParams,
        onProgress?: (current: number, total: number) => void
    ) => Promise<RevenueItem[]>;
    clearRevenueData: () => void;
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined);

export const useRevenue = () => {
    const ctx = useContext(RevenueContext);
    if (!ctx) throw new Error('useRevenue must be used within a RevenueProvider');
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

export const RevenueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, logout } = useAuth();

    const [revenueData, setRevenueData] = useState<RevenueItem[] | null>(
        () => readSession('revenueData', null)
    );
    const [summary, setSummary] = useState<RevenueSummary | null>(
        () => readSession('revenueSummary', null)
    );
    const [totalRecords, setTotalRecords] = useState<number>(
        () => readSession('revenueTotalRecords', 0)
    );
    const [totalPages, setTotalPages] = useState<number>(
        () => readSession('revenueTotalPages', 0)
    );
    const [currentPage, setCurrentPage] = useState<number>(
        () => readSession('revenueCurrentPage', 1)
    );
    const [appliedParams, setAppliedParams] = useState<RevenueFetchParams>(
        () => readSession('revenueAppliedParams', DEFAULT_REVENUE_PARAMS)
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFetching = React.useRef(false);
    const hasInitialFetched = React.useRef(false);

    const fetchRevenue = useCallback(async (params: RevenueFetchParams, page: number, silent = false) => {
        if (!token || isFetching.current) return;
        isFetching.current = true;
        if (!silent) setIsLoading(true);
        setError(null);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/method/rms.clientdetails.get_revenue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': token },
                body: JSON.stringify({
                    from: params.from,
                    to: params.to,
                    limit_start: page - 1,
                    limit_page_length: PAGE_SIZE,
                    client_codes: params.client_codes,
                    sub_codes: params.sub_codes,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData?.message;
                if (errMsg?.message === 'Token has been revoked or does not match') {
                    logout();
                    return;
                }
                let reason = 'Failed to fetch revenue data';
                if (errMsg?.response) {
                    try {
                        const parsed = JSON.parse(errMsg.response);
                        if (parsed.reason) reason = parsed.reason;
                    } catch (_) { /* ignore */ }
                } else if (errMsg?.message) {
                    reason = errMsg.message;
                }
                throw new Error(reason);
            }

            const json = await response.json();
            const msg = json.message;

            if (msg?.status === 'success' && msg?.data?.status === 1) {
                const data: RevenueItem[] = msg.data.data || [];
                const sum: RevenueSummary = msg.data.summary || null;
                const total: number = msg.data.total_records || 0;
                const pages: number = msg.data.total_pages || 0;

                setRevenueData(data);
                setSummary(sum);
                setTotalRecords(total);
                setTotalPages(pages);
                setCurrentPage(page);
                setAppliedParams(params);

                sessionStorage.setItem('revenueData', JSON.stringify(data));
                sessionStorage.setItem('revenueSummary', JSON.stringify(sum));
                sessionStorage.setItem('revenueTotalRecords', JSON.stringify(total));
                sessionStorage.setItem('revenueTotalPages', JSON.stringify(pages));
                sessionStorage.setItem('revenueCurrentPage', JSON.stringify(page));
                sessionStorage.setItem('revenueAppliedParams', JSON.stringify(params));
            } else {
                let reason = 'Failed to fetch revenue data';
                if (msg?.response) {
                    try {
                        const parsed = JSON.parse(msg.response);
                        if (parsed.reason) reason = parsed.reason;
                    } catch (_) { /* unparseable response, use fallback */ }
                } else if (msg?.message) {
                    reason = msg.message;
                }
                throw new Error(reason);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching revenue.');
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [token, logout]);

    const refreshRevenue = useCallback(async () => {
        await fetchRevenue(appliedParams, currentPage, false);
    }, [fetchRevenue, appliedParams, currentPage]);

    const exportRevenue = useCallback(async (
        params: RevenueFetchParams,
        onProgress?: (current: number, total: number) => void
    ): Promise<RevenueItem[]> => {
        if (!token) return [];
        const EXPORT_PAGE_SIZE = 20000;
        const MAX_RECORDS = 50000;
        const all: RevenueItem[] = [];
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        let page = 1;
        let totalPgs = 1;

        while (page <= totalPgs && all.length < MAX_RECORDS) {
            const response = await fetch(`${API_BASE_URL}/api/method/rms.clientdetails.get_revenue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': token },
                body: JSON.stringify({
                    from: params.from,
                    to: params.to,
                    limit_start: (page - 1) * EXPORT_PAGE_SIZE,
                    limit_page_length: EXPORT_PAGE_SIZE,
                    client_codes: params.client_codes,
                    sub_codes: params.sub_codes,
                }),
            });

            if (!response.ok) throw new Error('Export fetch failed');
            const json = await response.json();
            const msg = json.message;

            if (msg?.status === 'success' && msg?.data?.status === 1) {
                all.push(...(msg.data.data || []));
                totalPgs = Math.ceil((msg.data.total_records || 0) / EXPORT_PAGE_SIZE);
                if (onProgress) onProgress(page, totalPgs);
            } else {
                throw new Error('Failed during export');
            }
            page++;
        }
        return all;
    }, [token]);

    const clearRevenueData = useCallback(() => {
        setRevenueData(null);
        setSummary(null);
        setTotalRecords(0);
        setTotalPages(0);
        setCurrentPage(1);
        setAppliedParams(DEFAULT_REVENUE_PARAMS);
        setError(null);
        ['revenueData', 'revenueSummary', 'revenueTotalRecords', 'revenueTotalPages',
            'revenueCurrentPage', 'revenueAppliedParams'].forEach(k => sessionStorage.removeItem(k));
    }, []);

    // Clear on logout
    useEffect(() => {
        if (!isAuthenticated) {
            clearRevenueData();
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated, clearRevenueData]);

    // Silent initial fetch after login (skip if sessionStorage already has data)
    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            hasInitialFetched.current = true;
            const cached = sessionStorage.getItem('revenueData');
            if (!cached) {
                fetchRevenue(DEFAULT_REVENUE_PARAMS, 1, true);
            }
        }
    }, [isAuthenticated, token, fetchRevenue]);

    return (
        <RevenueContext.Provider value={{
            revenueData,
            summary,
            totalRecords,
            totalPages,
            currentPage,
            appliedParams,
            isLoading,
            error,
            pageSize: PAGE_SIZE,
            fetchRevenue,
            refreshRevenue,
            exportRevenue,
            clearRevenueData,
        }}>
            {children}
        </RevenueContext.Provider>
    );
};
