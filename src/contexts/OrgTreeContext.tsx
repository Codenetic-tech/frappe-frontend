import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface OrgTreeNode {
    name: string;
    parent_gopocket_tree: string;
    is_group: number;
    category: string | null;
    client_name: string | null;
    mail_id: string | null;
    Department: string | null;
    role: string | null;
}

interface OrgTreeContextType {
    orgTreeData: OrgTreeNode[] | null;
    isLoading: boolean;
    error: string | null;
    count: number;
    fetchOrgTree: (silent?: boolean) => Promise<void>;
    refreshOrgTree: () => Promise<void>;
}

const OrgTreeContext = createContext<OrgTreeContextType | undefined>(undefined);

export const useOrgTree = () => {
    const context = useContext(OrgTreeContext);
    if (context === undefined) {
        throw new Error('useOrgTree must be used within an OrgTreeProvider');
    }
    return context;
};

export const OrgTreeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, logout } = useAuth();
    const [orgTreeData, setOrgTreeData] = useState<OrgTreeNode[] | null>(() => {
        const stored = sessionStorage.getItem('orgTreeData');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(() => {
        const stored = sessionStorage.getItem('orgTreeCount');
        return stored ? parseInt(stored, 10) : 0;
    });

    const isFetching = React.useRef(false);
    const hasInitialFetched = React.useRef(false);

    const fetchOrgTree = useCallback(async (silent: boolean = false) => {
        if (!token || isFetching.current) return;
        isFetching.current = true;
        if (!silent) setIsLoading(true);
        setError(null);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.org_heirarchy`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({}),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (errorData.message && errorData.message.status === 'error' && errorData.message.message === 'Token has been revoked or does not match') {
                    logout();
                    return;
                }

                throw new Error(`Failed to fetch org tree: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.message && result.message.status === 'error' && result.message.message === 'Token has been revoked or does not match') {
                logout();
                return;
            }

            if (result.message && result.message.data) {
                setOrgTreeData(result.message.data);
                sessionStorage.setItem('orgTreeData', JSON.stringify(result.message.data));

                const totalCount = result.message.count || result.message.data.length;
                setCount(totalCount);
                sessionStorage.setItem('orgTreeCount', totalCount.toString());
            } else {
                setOrgTreeData([]);
                sessionStorage.setItem('orgTreeData', JSON.stringify([]));
                setCount(0);
                sessionStorage.setItem('orgTreeCount', '0');
            }
        } catch (err: any) {
            console.error('Error fetching org tree:', err);
            setError(err.message || 'An error occurred while fetching the org tree.');
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [token, logout]);

    const refreshOrgTree = useCallback(async () => {
        await fetchOrgTree(true);
    }, [fetchOrgTree]);

    // Clear data on logout
    useEffect(() => {
        if (!isAuthenticated) {
            setOrgTreeData(null);
            setError(null);
            setCount(0);
            sessionStorage.removeItem('orgTreeData');
            sessionStorage.removeItem('orgTreeCount');
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated]);

    // Automatically fetch after login — only if no cached data exists
    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            hasInitialFetched.current = true;
            // Skip API call if sessionStorage already has the data (e.g. page refresh)
            const cached = sessionStorage.getItem('orgTreeData');
            if (!cached) {
                fetchOrgTree(true);
            }
        }
    }, [isAuthenticated, token, fetchOrgTree]);

    return (
        <OrgTreeContext.Provider value={{
            orgTreeData,
            isLoading,
            error,
            count,
            fetchOrgTree,
            refreshOrgTree,
        }}>
            {children}
        </OrgTreeContext.Provider>
    );
};
