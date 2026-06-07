import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface KycItem {
    application_id: string | null;
    user_name: string | null;
    kyc_stage: string | null;
    refer: string | null;
    application_created_date: string | null;
    application_modified_date_time: string | null;
    application_status: string | null;
    src: string | null;
    tag: string | null;
    ucc: string | null;
    nse: string | null;
    bse: string | null;
    nfo: string | null;
    bfo: string | null;
    mcx: string | null;
    client_mapping: boolean | null;
    mobile_number: string | null;
    kyc_stage_history?: KycStageHistory[];
}

export interface KycStageHistory {
    kyc_stage: string;
    stage_status: string;
    rejection_reason: string;
    updated_on: string;
}

export interface KycStatusCount {
    'IN PROGRESS': number;
    'PENDING FOR APPROVAL': number;
    'REJECTED': number;
    'APPROVED': number;
    'ACCOUNT OPENED': number;
}

const INITIAL_STATUS_COUNT: KycStatusCount = {
    'IN PROGRESS': 0,
    'PENDING FOR APPROVAL': 0,
    'REJECTED': 0,
    'APPROVED': 0,
    'ACCOUNT OPENED': 0,
};

interface KycDataResponse {
    message: {
        count: number;
        status_count?: KycStatusCount;
        data: KycItem[];
    };
}

interface FetchKycParams {
    limit_start?: number;
    limit_page_length?: number;
    from_application_modified_date_time?: string;
    to_application_modified_date_time?: string;
    application_id?: string;
    ucc_field?: string;
    mobile_no?: string;
    application_status?: string;
    refer_list?: string[];
    skip_expand?: boolean;
}

interface KycContextType {
    kycData: KycItem[] | null;
    isLoading: boolean;
    error: string | null;
    count: number;
    statusCount: KycStatusCount;
    selectedBranches: string[];
    setSelectedBranches: (branches: string[]) => void;
    fetchKycData: (params?: FetchKycParams, silent?: boolean) => Promise<void>;
    refreshKycData: (params?: FetchKycParams) => Promise<void>;
    exportKycData: (params?: FetchKycParams, onProgress?: (current: number, total: number) => void) => Promise<KycItem[]>;
    clearKycData: () => void;
}

const KycContext = createContext<KycContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useKyc = () => {
    const context = useContext(KycContext);
    if (context === undefined) {
        throw new Error('useKyc must be used within a KycProvider');
    }
    return context;
};

export const KycProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, hierarchyData, logout } = useAuth();
    const [kycData, setKycData] = useState<KycItem[] | null>(() => {
        const stored = sessionStorage.getItem('kycData');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(() => {
        const stored = sessionStorage.getItem('kycCount');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [statusCount, setStatusCount] = useState<KycStatusCount>(() => {
        const stored = sessionStorage.getItem('kycStatusCount');
        return stored ? JSON.parse(stored) : INITIAL_STATUS_COUNT;
    });
    const [selectedBranches, setSelectedBranches] = useState<string[]>(() => {
        const stored = sessionStorage.getItem('kycSelectedBranches');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        sessionStorage.setItem('kycSelectedBranches', JSON.stringify(selectedBranches));
    }, [selectedBranches]);
    const isFetching = React.useRef(false);
    const hasInitialFetched = React.useRef(false);

    const expandBranches = useCallback((selectedNodes: string[]) => {
        if (!hierarchyData || !Array.isArray(hierarchyData)) return selectedNodes;

        // Build a Map for fast lookup (Parent -> Children[])
        const childrenMap = new Map<string, string[]>();
        hierarchyData.forEach(node => {
            const parent = node.parent_gopocket_tree;
            if (parent) {
                if (!childrenMap.has(parent)) {
                    childrenMap.set(parent, []);
                }
                childrenMap.get(parent)!.push(node.name);
            }
        });

        const allCodes = new Set<string>();
        const collectDescendants = (nodeId: string) => {
            allCodes.add(nodeId);
            const children = childrenMap.get(nodeId);
            if (children) {
                children.forEach(collectDescendants);
            }
        };

        selectedNodes.forEach(name => collectDescendants(name));
        return Array.from(allCodes);
    }, [hierarchyData]);

    const fetchKycData = useCallback(async (params: FetchKycParams = {}, silent: boolean = false) => {
        if (!token || isFetching.current) return;
        isFetching.current = true;
        if (!silent) setIsLoading(true);

        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.kyc`;

            // Default payload for pagination
            const payload: any = {
                limit_start: params.limit_start || 0,
                limit_page_length: params.limit_page_length || 20
            };

            // Add optional filters
            if (params.from_application_modified_date_time) payload.from_application_modified_date_time = params.from_application_modified_date_time;
            if (params.to_application_modified_date_time) payload.to_application_modified_date_time = params.to_application_modified_date_time;
            if (params.application_id) payload.application_id = params.application_id;
            if (params.ucc_field) payload.ucc_field = params.ucc_field;
            if (params.mobile_no) payload.mobile_no = params.mobile_no;
            if (params.application_status) payload.application_status = params.application_status;

            // Add branch filters with expansion
            const branchesToFilter = params.refer_list || selectedBranches;
            if (branchesToFilter && branchesToFilter.length > 0) {
                payload.refer_list = params.skip_expand ? branchesToFilter : expandBranches(branchesToFilter);
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify(payload),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (errorData.message && errorData.message.status === 'error' && errorData.message.message === 'Token has been revoked or does not match') {
                    logout();
                    return;
                }

                const errorMessage = errorData.exception ||
                    (typeof errorData.message === 'string' ? errorData.message : errorData.message?.error) ||
                    response.statusText;

                if (typeof errorMessage === 'string' &&
                    (errorMessage.toLowerCase().includes("no kyc data found") || errorMessage.toLowerCase().includes("no kyc data found"))) {
                    setKycData([]);
                    setCount(0);
                    setStatusCount(INITIAL_STATUS_COUNT);
                    setError(null);
                    sessionStorage.setItem('kycData', JSON.stringify([]));
                    sessionStorage.setItem('kycCount', '0');
                    sessionStorage.setItem('kycStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
                    return;
                }
                throw new Error(`Failed to fetch KYC data: ${typeof errorMessage === 'string' ? errorMessage : 'Unknown error'}`);
            }

            const result: any = await response.json();

            if (result.message && result.message.status === 'error' && result.message.message === 'Token has been revoked or does not match') {
                logout();
                return;
            }

            if (result.message && result.message.data) {
                setKycData(result.message.data);
                sessionStorage.setItem('kycData', JSON.stringify(result.message.data));

                setCount(result.message.count || 0);
                sessionStorage.setItem('kycCount', (result.message.count || 0).toString());

                if (result.message.status_count) {
                    setStatusCount(result.message.status_count);
                    sessionStorage.setItem('kycStatusCount', JSON.stringify(result.message.status_count));
                } else {
                    setStatusCount(INITIAL_STATUS_COUNT);
                    sessionStorage.setItem('kycStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
                }
            } else {
                setKycData([]);
                sessionStorage.setItem('kycData', JSON.stringify([]));
                setCount(0);
                sessionStorage.setItem('kycCount', '0');
                setStatusCount(INITIAL_STATUS_COUNT);
                sessionStorage.setItem('kycStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
            }
        } catch (err: any) {
            console.error('Error fetching KYC data:', err);
            setError(err.message || 'An error occurred while fetching KYC data.');
            // Keeping existing data intact to prevent UI flashes during network errors
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [token, selectedBranches, expandBranches, logout]);

    const clearKycData = useCallback(() => {
        setKycData(null);
        setError(null);
        setCount(0);
        sessionStorage.removeItem('kycData');
        sessionStorage.removeItem('kycCount');
        sessionStorage.removeItem('kycStatusCount');
        sessionStorage.removeItem('kycSelectedBranches');
    }, []);


    // Clear data on logout
    useEffect(() => {
        if (!isAuthenticated) {
            clearKycData();
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated, clearKycData]);

    // Automatically fetch initial KYC data after login
    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            fetchKycData({}, true); // silent fetch
            hasInitialFetched.current = true;
        }
    }, [isAuthenticated, token, fetchKycData]);

    const refreshKycData = useCallback(async (params?: FetchKycParams) => {
        await fetchKycData(params || {}, false);
    }, [fetchKycData]);

    const exportKycData = useCallback(async (params: FetchKycParams = {}, onProgress?: (current: number, total: number) => void): Promise<KycItem[]> => {
        if (!token) return [];

        let allData: KycItem[] = [];
        let limit_start = 0;
        const limit_page_length = 10000;
        let totalToFetch = -1;

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const apiUrl = `${API_BASE_URL}/api/method/rms.branch.kyc`;
        let useFallback = false;

        const fetchData = async (url: string, start: number) => {
            const payload: any = {
                limit_start: start,
                limit_page_length: limit_page_length
            };

            if (params.from_application_modified_date_time) payload.from_application_modified_date_time = params.from_application_modified_date_time;
            if (params.to_application_modified_date_time) payload.to_application_modified_date_time = params.to_application_modified_date_time;
            if (params.application_id) payload.application_id = params.application_id;
            if (params.ucc_field) payload.ucc_field = params.ucc_field;
            if (params.mobile_no) payload.mobile_no = params.mobile_no;
            if (params.application_status) payload.application_status = params.application_status;

            const branchesToFilter = params.refer_list || selectedBranches;
            if (branchesToFilter && branchesToFilter.length > 0) {
                payload.refer_list = params.skip_expand ? branchesToFilter : expandBranches(branchesToFilter);
            }

            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify(payload),
                mode: 'cors',
            });
        };

        try {
            while (totalToFetch === -1 || limit_start < totalToFetch) {
                let response = await fetchData(useFallback ? `${API_BASE_URL}/api/method/rms.branch.kyc` : apiUrl, limit_start);

                if (!response.ok && !useFallback) {
                    console.warn("download_kyc endpoint failed, falling back to kyc endpoint");
                    useFallback = true;
                    response = await fetchData(`${API_BASE_URL}/api/method/rms.branch.kyc`, limit_start);
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch KYC data for export at ${limit_start}`);
                }

                const result: any = await response.json();

                if (result.message && result.message.data) {
                    allData = [...allData, ...result.message.data];
                    totalToFetch = result.message.count || 0;

                    if (onProgress) {
                        onProgress(allData.length, totalToFetch);
                    }

                    if (result.message.data.length < limit_page_length) {
                        break;
                    }

                    limit_start += limit_page_length;
                } else {
                    break;
                }
            }
            return allData;
        } catch (err) {
            console.error('Error exporting KYC data:', err);
            throw err;
        }
    }, [token, selectedBranches, expandBranches]);

    return (
        <KycContext.Provider value={{
            kycData,
            isLoading,
            error,
            count,
            statusCount,
            selectedBranches,
            setSelectedBranches,
            fetchKycData,
            refreshKycData,
            exportKycData,
            clearKycData
        }}>
            {children}
        </KycContext.Provider>
    );

};
