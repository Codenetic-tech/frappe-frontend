import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { useAuth } from './AuthContext';

export interface OrgTreeNode {
    name: string;
    parent_crm_heirarchy?: string | null;
    is_group: number;
    category: string | null;
    org_type?: string | null;
    org_name?: string | null;
    code?: string | null;
    org_code?: string | null;
    parent_org_name?: string | null;
    name1?: string | null;
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
    const { isAuthenticated } = useAuth();

    // Cache the parsed sessionStorage value in state so it has a stable reference
    const [orgTreeData, setOrgTreeData] = useState<OrgTreeNode[] | null>(() => {
        try {
            const stored = sessionStorage.getItem('orgTreeData');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Failed to read initial orgTreeData from sessionStorage:', e);
            return null;
        }
    });

    // Stable query options to prevent unnecessary useFrappeGetDocList trigger
    const docListOptions = useMemo(() => ({
        fields: [
            'name',
            'parent_crm_heirarchy',
            'is_group',
            'code',
            'org_code',
            'org_type',
            'org_name',
            'parent_org_name',
            'name1'
        ],
        limit: 100000,
        orderBy: { field: 'org_name', order: 'asc' as const }
    }), []);

    const {
        data: rawTreeData,
        error: sdkError,
        isLoading: sdkLoading,
        mutate,
    } = useFrappeGetDocList<any>(
        'CRM Heirarchy',
        docListOptions,
        isAuthenticated ? undefined : null
    );

    // Sync state when raw data is successfully fetched
    useEffect(() => {
        if (rawTreeData) {
            const mappedData = rawTreeData.map((node: any) => ({
                name: node.name || node.org_code,
                parent_crm_heirarchy: node.parent_crm_heirarchy || null,
                is_group: node.is_group ?? 0,
                category: node.org_type || null,
                org_type: node.org_type || null,
                org_name: node.org_name || null,
                code: node.code || null,
                org_code: node.org_code || null,
                parent_org_name: node.parent_org_name || null,
                name1: node.name1 || null,
            }));

            try {
                sessionStorage.setItem('orgTreeData', JSON.stringify(mappedData));
                sessionStorage.setItem('orgTreeCount', mappedData.length.toString());
            } catch (e) {
                console.warn('Failed to save orgTreeData to sessionStorage (quota exceeded):', e);
            }

            setOrgTreeData(mappedData);
        }
    }, [rawTreeData]);

    const count = useMemo(() => {
        if (orgTreeData) return orgTreeData.length;
        try {
            const storedCount = sessionStorage.getItem('orgTreeCount');
            return storedCount ? parseInt(storedCount, 10) : 0;
        } catch (e) {
            return 0;
        }
    }, [orgTreeData]);

    const error = sdkError ? (sdkError.message || 'An error occurred while fetching the org tree.') : null;
    const isLoading = sdkLoading && !orgTreeData;

    const fetchOrgTree = useCallback(async (silent?: boolean) => {
        await mutate();
    }, [mutate]);

    const refreshOrgTree = useCallback(async () => {
        await mutate();
    }, [mutate]);

    // Clear data on logout
    useEffect(() => {
        if (!isAuthenticated) {
            try {
                sessionStorage.removeItem('orgTreeData');
                sessionStorage.removeItem('orgTreeCount');
            } catch (e) {
                // Ignore
            }
        }
    }, [isAuthenticated]);

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

