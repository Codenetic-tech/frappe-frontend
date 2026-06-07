import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ClientItem {
    name: string;
    creation: string;
    modified: string;
    client_code: string;
    client_name: string;
    branch: string;
    account_opened_date: string;
    mobile_number: string;
    parent1: string;
    activation_status: string;
    nse: string;
    bse: string;
    mcx: string;
    nfo: string;
    bfo: string;
    ncd: string;
    last_trade_date: string;
    trade_done: string;
}

export interface ClientStatusCount {
    ACTIVE: number;
    CLOSED: number;
    DORMANT: number;
}

const INITIAL_STATUS_COUNT: ClientStatusCount = {
    ACTIVE: 0,
    CLOSED: 0,
    DORMANT: 0
};

interface ClientDataResponse {
    message: {
        status: string;
        total_count: number;
        direct_client_count: number;
        indirect_client_count: number;
        count: number;
        limit_start: number;
        limit_page_length: number;
        status_count: ClientStatusCount;
        data: ClientItem[];
    };
}

interface FetchClientsParams {
    limit_start?: number;
    limit_page_length?: number;
    refer_list?: string[];
    from_date?: string;
    to_date?: string;
    mobile_no?: string;
    name?: string;
    activation_status?: string;
    parent_code?: string;
    trade_done?: string;
}

interface ClientContextType {
    clientsData: ClientItem[] | null;
    isLoading: boolean;
    error: string | null;
    totalCount: number;
    directCount: number;
    indirectCount: number;
    statusCount: ClientStatusCount;
    fetchClientsData: (params?: FetchClientsParams, silent?: boolean) => Promise<void>;
    refreshClientsData: (params?: FetchClientsParams) => Promise<void>;
    exportClientsData: (params?: FetchClientsParams, onProgress?: (current: number, total: number) => void) => Promise<ClientItem[]>;
    clearClientsData: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClients = () => {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClients must be used within a ClientProvider');
    }
    return context;
};

export const ClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, user, isAuthenticated, hierarchyData, logout } = useAuth();

    const [clientsData, setClientsData] = useState<ClientItem[] | null>(() => {
        const stored = sessionStorage.getItem('clientsData');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(() => {
        const stored = sessionStorage.getItem('clientsTotalCount');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [directCount, setDirectCount] = useState(() => {
        const stored = sessionStorage.getItem('clientsDirectCount');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [indirectCount, setIndirectCount] = useState(() => {
        const stored = sessionStorage.getItem('clientsIndirectCount');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [statusCount, setStatusCount] = useState<ClientStatusCount>(() => {
        const stored = sessionStorage.getItem('clientsStatusCount');
        return stored ? JSON.parse(stored) : INITIAL_STATUS_COUNT;
    });

    const isFetching = React.useRef(false);
    const hasInitialFetched = React.useRef(false);

    const expandBranches = useCallback((selectedNodes: string[]) => {
        if (!hierarchyData || !Array.isArray(hierarchyData)) return selectedNodes;

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

    const fetchClientsData = useCallback(async (params: FetchClientsParams = {}, silent: boolean = false) => {
        if (!token || isFetching.current) return;
        isFetching.current = true;
        if (!silent) setIsLoading(true);

        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const branchCategories = ["HO", "ZONE", "REGION", "BRANCH", null, ""];
            const isBranchUser = branchCategories.includes(user?.category as any);

            // If there's a hierarchy filter, always use get_clients
            const hasHierarchyFilter = (params.refer_list && params.refer_list.length > 0) || params.parent_code;

            const apiUrl = (isBranchUser && !hasHierarchyFilter)
                ? `${API_BASE_URL}/api/method/rms.branch.get_clients_branch`
                : `${API_BASE_URL}/api/method/rms.branch.get_clients`;

            const payload: any = {
                limit_start: params.limit_start || 0,
                limit_page_length: params.limit_page_length || 20
            };

            if (params.from_date) payload.from_date = params.from_date;
            if (params.to_date) payload.to_date = params.to_date;
            if (params.mobile_no) payload.mobile_no = params.mobile_no;
            if (params.name) payload.name = params.name;
            if (params.activation_status) payload.activation_status = params.activation_status;
            if (params.trade_done && params.trade_done !== 'ALL') payload.trade_done = params.trade_done;

            // Expand VirtualizedTree selections, then append parent_code raw (no expansion)
            const expandedHierarchy = params.refer_list && params.refer_list.length > 0
                ? expandBranches(params.refer_list)
                : [];

            if (params.parent_code) {
                payload.refer_list = [...new Set([params.parent_code, ...expandedHierarchy])];
            } else if (expandedHierarchy.length > 0) {
                payload.refer_list = expandedHierarchy;
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

                const errorMessage = errorData.exception || errorData.message || response.statusText;
                throw new Error(`Failed to fetch Clients data: ${typeof errorMessage === 'string' ? errorMessage : 'Unknown error'}`);
            }

            const result: ClientDataResponse = await response.json();

            if (result.message && result.message.data) {
                setClientsData(result.message.data);
                sessionStorage.setItem('clientsData', JSON.stringify(result.message.data));

                setTotalCount(result.message.total_count || 0);
                sessionStorage.setItem('clientsTotalCount', (result.message.total_count || 0).toString());

                setDirectCount(result.message.direct_client_count || 0);
                sessionStorage.setItem('clientsDirectCount', (result.message.direct_client_count || 0).toString());

                setIndirectCount(result.message.indirect_client_count || 0);
                sessionStorage.setItem('clientsIndirectCount', (result.message.indirect_client_count || 0).toString());

                if (result.message.status_count) {
                    setStatusCount(result.message.status_count);
                    sessionStorage.setItem('clientsStatusCount', JSON.stringify(result.message.status_count));
                } else {
                    setStatusCount(INITIAL_STATUS_COUNT);
                    sessionStorage.setItem('clientsStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
                }
            } else {
                setClientsData([]);
                sessionStorage.setItem('clientsData', JSON.stringify([]));
                setTotalCount(0);
                sessionStorage.setItem('clientsTotalCount', '0');
                setStatusCount(INITIAL_STATUS_COUNT);
                sessionStorage.setItem('clientsStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
            }
        } catch (err: any) {
            console.error('Error fetching Clients data:', err);
            setError(err.message || 'An error occurred while fetching Clients data.');
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [token, user, expandBranches, logout]);

    const exportClientsData = useCallback(async (params: FetchClientsParams = {}, onProgress?: (current: number, total: number) => void): Promise<ClientItem[]> => {
        if (!token) return [];

        let allData: ClientItem[] = [];
        let limit_start = 0;
        const limit_page_length = 10000;
        let totalToFetch = -1;

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const apiUrl = `${API_BASE_URL}/api/method/rms.branch.download_clients`;

        try {
            while (totalToFetch === -1 || limit_start < totalToFetch) {
                const payload: any = {
                    limit_start: limit_start,
                    limit_page_length: limit_page_length
                };

                if (params.from_date) payload.from_date = params.from_date;
                if (params.to_date) payload.to_date = params.to_date;
                if (params.mobile_no) payload.mobile_no = params.mobile_no;
                if (params.name) payload.name = params.name;
                if (params.activation_status) payload.activation_status = params.activation_status;

                const expandedHierarchy = params.refer_list && params.refer_list.length > 0
                    ? expandBranches(params.refer_list)
                    : [];

                if (params.parent_code) {
                    payload.refer_list = [...new Set([params.parent_code, ...expandedHierarchy])];
                } else if (expandedHierarchy.length > 0) {
                    payload.refer_list = expandedHierarchy;
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
                    throw new Error(`Failed to fetch Clients for export at ${limit_start}`);
                }

                const result: ClientDataResponse = await response.json();

                if (result.message && result.message.data) {
                    allData = [...allData, ...result.message.data];
                    totalToFetch = result.message.total_count || 0;

                    if (onProgress) {
                        onProgress(allData.length, totalToFetch);
                    }

                    if (result.message.data.length < limit_page_length) {
                        // Reached the end
                        break;
                    }

                    limit_start += limit_page_length;
                } else {
                    break;
                }
            }
            return allData;
        } catch (err) {
            console.error('Error exporting Clients data:', err);
            throw err;
        }
    }, [token, expandBranches]);

    const clearClientsData = useCallback(() => {
        setClientsData(null);
        setError(null);
        setTotalCount(0);
        setDirectCount(0);
        setIndirectCount(0);
        setStatusCount(INITIAL_STATUS_COUNT);
        sessionStorage.removeItem('clientsData');
        sessionStorage.removeItem('clientsTotalCount');
        sessionStorage.removeItem('clientsDirectCount');
        sessionStorage.removeItem('clientsIndirectCount');
        sessionStorage.removeItem('clientsStatusCount');
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            clearClientsData();
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated, clearClientsData]);

    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            fetchClientsData({}, true);
            hasInitialFetched.current = true;
        }
    }, [isAuthenticated, token, fetchClientsData]);

    const refreshClientsData = useCallback(async (params?: FetchClientsParams) => {
        await fetchClientsData(params || {}, false);
    }, [fetchClientsData]);

    return (
        <ClientContext.Provider value={{
            clientsData,
            isLoading,
            error,
            totalCount,
            directCount,
            indirectCount,
            statusCount,
            fetchClientsData,
            refreshClientsData,
            exportClientsData,
            clearClientsData
        }}>
            {children}
        </ClientContext.Provider>
    );
};
