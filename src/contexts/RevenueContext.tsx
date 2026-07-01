import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import useSWR from 'swr';
import { useAuth } from './AuthContext';
import { useOrgTree } from './OrgTreeContext';

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
    const { user, isAuthenticated, logout, frappeUser } = useAuth();
    const { call: postRevenue } = useFrappePostCall('gopocket.revenue.get_revenue');

    const [localFrappeUser, setLocalFrappeUser] = useState<any>(() => {
        try {
            const saved = sessionStorage.getItem('frappe_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const syncUser = () => {
            try {
                const saved = sessionStorage.getItem('frappe_user');
                if (saved) {
                    setLocalFrappeUser(JSON.parse(saved));
                }
            } catch (e) {
                console.error("Error syncing user in RevenueContext:", e);
            }
        };

        window.addEventListener("frappe-user-updated", syncUser);
        window.addEventListener("layout-changed", syncUser);
        return () => {
            window.removeEventListener("frappe-user-updated", syncUser);
            window.removeEventListener("layout-changed", syncUser);
        };
    }, []);

    const { orgTreeData } = useOrgTree();
    const currentFrappeUser = localFrappeUser || frappeUser;
    const userCode = currentFrappeUser?.username || user?.user_code || '';

    const rootCode = useMemo(() => {
        const isAdmin = userCode.toLowerCase() === 'administrator' || user?.category === 'admin';
        if (isAdmin && orgTreeData && orgTreeData.length > 0) {
            const names = new Set(orgTreeData.map(n => n.name));
            const roots = orgTreeData.filter(n => !n.parent_crm_heirarchy || !names.has(n.parent_crm_heirarchy));
            if (roots.length > 0) {
                const businessRoot = roots.find(r => (r.code || r.org_code || r.name || '').toLowerCase() === 'business');
                const selectedRoot = businessRoot || roots[0];
                return selectedRoot.code || selectedRoot.org_code || selectedRoot.name || '';
            }
        }
        return userCode;
    }, [userCode, user?.category, orgTreeData]);

    // Active filters and page state
    const [currentPage, setCurrentPage] = useState<number>(
        () => readSession('revenueCurrentPage', 1)
    );
    const [appliedParams, setAppliedParams] = useState<RevenueFetchParams>(
        () => readSession('revenueAppliedParams', DEFAULT_REVENUE_PARAMS)
    );

    // Sync state changes to session storage so they persist across routes
    useEffect(() => {
        sessionStorage.setItem('revenueCurrentPage', JSON.stringify(currentPage));
    }, [currentPage]);

    useEffect(() => {
        sessionStorage.setItem('revenueAppliedParams', JSON.stringify(appliedParams));
    }, [appliedParams]);

    // Setup SWR key and fetcher
    const swrKey = isAuthenticated && rootCode
        ? ['revenue', appliedParams, currentPage, rootCode]
        : null;

    const fetcher = useCallback(async ([_, params, page, code]: [string, RevenueFetchParams, number, string]) => {
        let res;
        try {
            res = await postRevenue({
                from: params.from,
                to: params.to,
                limit_start: (page - 1) * PAGE_SIZE,
                limit_page_length: PAGE_SIZE,
                client_codes: params.client_codes,
                sub_codes: params.sub_codes,
            });
        } catch (err: any) {
            console.error("Error fetching revenue:", err);
            const errorMsg = err?.message || err?.statusText || 'Failed to fetch revenue data';
            const reason = typeof errorMsg === 'object' ? (errorMsg.message || JSON.stringify(errorMsg)) : String(errorMsg);
            throw new Error(reason);
        }

        const msg = res?.message || res;

        if (msg?.status === 'success' && msg?.data?.status === 1) {
            return msg.data;
        } else {
            let reason = 'Failed to fetch revenue data';
            if (msg?.response) {
                try {
                    const parsed = JSON.parse(msg.response);
                    if (parsed.reason) reason = parsed.reason;
                } catch (_) {}
            } else if (msg?.message) {
                reason = typeof msg.message === 'object' ? (msg.message.message || JSON.stringify(msg.message)) : String(msg.message);
            }
            throw new Error(reason);
        }
    }, [postRevenue]);

    const { data: swrData, error: swrError, isLoading: swrLoading, mutate: swrMutate } = useSWR(swrKey, fetcher, {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    });

    // Derive data from SWR cache
    const revenueData = swrData?.data || null;
    const summary = swrData?.summary || null;
    const totalRecords = swrData?.total_records || 0;
    const totalPages = swrData?.total_pages || 0;
    const isLoading = swrLoading;
    const error = swrError ? swrError.message : null;

    const fetchRevenue = useCallback(async (params: RevenueFetchParams, page: number) => {
        setAppliedParams(params);
        setCurrentPage(page);
    }, []);

    const refreshRevenue = useCallback(async () => {
        await swrMutate();
    }, [swrMutate]);

    const exportRevenue = useCallback(async (
        params: RevenueFetchParams,
        onProgress?: (current: number, total: number) => void
    ): Promise<RevenueItem[]> => {
        if (!isAuthenticated) return [];
        const EXPORT_PAGE_SIZE = 20000;
        const MAX_RECORDS = 50000;
        const all: RevenueItem[] = [];
        let page = 1;
        let totalPgs = 1;

        while (page <= totalPgs && all.length < MAX_RECORDS) {
            const res = await postRevenue({
                from: params.from,
                to: params.to,
                limit_start: (page - 1) * EXPORT_PAGE_SIZE,
                limit_page_length: EXPORT_PAGE_SIZE,
                client_codes: params.client_codes,
                sub_codes: params.sub_codes,
            });

            const msg = res?.message || res;

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
    }, [isAuthenticated, postRevenue]);

    const clearRevenueData = useCallback(() => {
        setAppliedParams(DEFAULT_REVENUE_PARAMS);
        setCurrentPage(1);
        swrMutate(null, false);
    }, [swrMutate]);

    // Clear on logout
    useEffect(() => {
        if (!isAuthenticated) {
            clearRevenueData();
        }
    }, [isAuthenticated, clearRevenueData]);

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
