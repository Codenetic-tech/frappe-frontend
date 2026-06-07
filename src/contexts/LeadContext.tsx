import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { TICKETING_DEPARTMENTS } from '@/constants/departments';

export interface LeadNote {
    parent: string;
    notes: string;
    commented_by: string;
    commented_time: string;
}

export interface LeadItem {
    name: string;
    creation: string;
    modified: string;
    modified_by: string;
    owner: string;
    docstatus: number;
    idx: number;
    organization: string | null;
    website: string | null;
    territory: string | null;
    industry: string | null;
    job_title: string | null;
    source: string | null;
    lead_owner: string;
    salutation: string | null;
    first_name: string;
    last_name: string | null;
    email: string;
    mobile_no: string;
    naming_series: string;
    lead_name: string;
    middle_name: string | null;
    gender: string | null;
    phone: string | null;
    status: string;
    no_of_employees: string;
    annual_revenue: number;
    image: string;
    converted: number;
    total: number;
    net_total: number;
    sla: string | null;
    sla_creation: string | null;
    sla_status: string;
    communication_status: string;
    response_by: string | null;
    first_response_time: string | null;
    first_responded_on: string | null;
    _user_tags: string | null;
    _comments: string;
    _assign: string;
    _liked_by: string | null;
    workflow_state: string | null;
    lead_source: string;
    lead_created_date: string | null;
    ucc: string | null;
    referredby: string | null;
    nse_cm: string | null;
    nse_cd: string | null;
    bse_fo: string | null;
    branch_code: string | null;
    mcx_co: string | null;
    nse_fo: string | null;
    bse_cm: string | null;
    tradedone: string | null;
    city: string;
    state: string | null;
    pannumber: string | null;
    issue: string;
    application: string | null;
    stage: string;
    created: string | null;
    assigned: string | null;
    how_many_demat_account_can_you_open_in_a_month: string | null;
    how_much_revenue_are_you_targeting_in_a_month: string;
    campaign: string;
    what_is_your_experience_level_in_trading: string | null;
    language: string | null;
    whats_your_profession: string | null;
    other_brokers: string | null;
    what_is_your_preferred_medium_to_get_services_details: string | null;
    form_id: string;
    tag: string | null;
    type: string | null;
    website_form: string | null;
    dpid: string | null;
    last_trdaed_date: string | null;
    referer: string | null;
    kyc_stage: string | null;
    application_status: string | null;
    application_created_date: string | null;
    validity_date: string;
    assigned_to: string;
    group: string | null;
    notes?: LeadNote[];
    total_registration?: number;
    last_campaign?: string | null;
    repeated_lead?: number;
    lead_timeline?: string | null;
}

export interface LeadStatusCount {
    "Call Back": number;
    "Client": number;
    "Followup": number;
    "New": number;
    "Not Interested": number;
    "RNR": number;
    "Switch off": number;
    "won": number;
}

const INITIAL_STATUS_COUNT: LeadStatusCount = {
    "Call Back": 0,
    "Client": 0,
    "Followup": 0,
    "New": 0,
    "Not Interested": 0,
    "RNR": 0,
    "Switch off": 0,
    "won": 0,
};

export type FilterCondition = [string, string, string, string | string[]];

interface FetchLeadParams {
    limit_start?: number;
    limit_page_length?: number;
    filters?: FilterCondition[];
    order_by?: string;
    fields?: string[];
    refer_list?: string[];
}

interface LeadContextType {
    leadsData: LeadItem[] | null;
    isLoading: boolean;
    error: string | null;
    count: number;
    statusCount: LeadStatusCount;
    groupList: string[];
    fetchLeadsData: (params?: FetchLeadParams, silent?: boolean) => Promise<void>;
    refreshLeadsData: (params?: FetchLeadParams) => Promise<void>;
    clearLeadsData: () => void;
    updateLeadStatus: (leadName: string, newStatus: string) => Promise<boolean>;
    updateLeadGroup: (leadName: string, newGroup: string) => Promise<boolean>;
    assignLeads: (leadNames: string[], assignedTo: string) => Promise<boolean>;
    addLeadNote: (parent: string, notes: string, commentedBy: string) => Promise<boolean>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const useLead = () => {
    const context = useContext(LeadContext);
    if (context === undefined) {
        throw new Error('useLead must be used within a LeadProvider');
    }
    return context;
};

export const LeadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, logout, user } = useAuth();
    const [leadsData, setLeadsData] = useState<LeadItem[] | null>(() => {
        const stored = sessionStorage.getItem('leadsData');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(() => {
        const stored = sessionStorage.getItem('leadsCount');
        return stored ? parseInt(stored, 10) : 0;
    });
    const [statusCount, setStatusCount] = useState<LeadStatusCount>(() => {
        const stored = sessionStorage.getItem('leadStatusCount');
        return stored ? JSON.parse(stored) : INITIAL_STATUS_COUNT;
    });
    const [groupList, setGroupList] = useState<string[]>(() => {
        const stored = sessionStorage.getItem('leadGroupList');
        return stored ? JSON.parse(stored) : [];
    });

    const isFetching = React.useRef(false);
    const hasInitialFetched = React.useRef(false);
    const lastParamsRef = React.useRef<FetchLeadParams>({});

    const fetchLeadsData = useCallback(async (params: FetchLeadParams = {}, silent: boolean = false) => {
        if (!token || isFetching.current) return;
        
        // Save these params for polling
        lastParamsRef.current = params;
        
        isFetching.current = true;
        if (!silent) setIsLoading(true);

        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.get_leads_test`;

            const payload: any = {
                filters: params.filters || [],
                order_by: params.order_by || "",
                fields: params.fields || ["*"],
                limit_start: params.limit_start || 0,
                limit_page_length: params.limit_page_length || 50,
                refer_list: params.refer_list || [],
            };

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
                throw new Error(`Failed to fetch Leads data: ${typeof errorMessage === 'string' ? errorMessage : 'Unknown error'}`);
            }

            const result: any = await response.json();

            if (result.message && result.message.status === 'error' && result.message.message === 'Token has been revoked or does not match') {
                logout();
                return;
            }

            if (result.message && result.message.data) {
                setLeadsData(result.message.data);
                sessionStorage.setItem('leadsData', JSON.stringify(result.message.data));

                setCount(result.message.total_count || 0);
                sessionStorage.setItem('leadsCount', (result.message.total_count || 0).toString());

                if (result.message.status_count) {
                    setStatusCount(result.message.status_count);
                    sessionStorage.setItem('leadStatusCount', JSON.stringify(result.message.status_count));
                } else {
                    setStatusCount(INITIAL_STATUS_COUNT);
                    sessionStorage.setItem('leadStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
                }
                if (result.message.group_list) {
                    const newList = Array.from(new Set(result.message.group_list as string[])).sort();
                    setGroupList(newList);
                    sessionStorage.setItem('leadGroupList', JSON.stringify(newList));
                }
            } else {
                setLeadsData([]);
                sessionStorage.setItem('leadsData', JSON.stringify([]));
                setCount(0);
                sessionStorage.setItem('leadsCount', '0');
                setStatusCount(INITIAL_STATUS_COUNT);
                sessionStorage.setItem('leadStatusCount', JSON.stringify(INITIAL_STATUS_COUNT));
            }
        } catch (err: any) {
            console.error('Error fetching Leads data:', err);
            setError(err.message || 'An error occurred while fetching Leads data.');
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, [token, logout]);

    const clearLeadsData = useCallback(() => {
        setLeadsData(null);
        setError(null);
        setCount(0);
        sessionStorage.removeItem('leadsData');
        sessionStorage.removeItem('leadsCount');
        sessionStorage.removeItem('leadStatusCount');
        sessionStorage.removeItem('leadGroupList');
        setGroupList([]);
        setStatusCount(INITIAL_STATUS_COUNT);
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            clearLeadsData();
            hasInitialFetched.current = false;
        }
    }, [isAuthenticated, clearLeadsData]);

    useEffect(() => {
        if (isAuthenticated && token && !hasInitialFetched.current) {
            fetchLeadsData({}, true);
            hasInitialFetched.current = true;
        }
    }, [isAuthenticated, token, fetchLeadsData]);

    // Polling Every 5 Minutes
    useEffect(() => {
        if (!token || !user?.department) return;

        // Skip polling if user is from a ticketing department
        const isTicketingUser = TICKETING_DEPARTMENTS.includes(user.department.toUpperCase());
        if (isTicketingUser) {
            console.log('Skipping Lead polling for ticketing department user');
            return;
        }

        const pollingInterval = setInterval(() => {
            console.log('Background polling for Leads data...');
            fetchLeadsData(lastParamsRef.current, true); // Silent fetch
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(pollingInterval);
    }, [token, fetchLeadsData, user?.department]);

    const refreshLeadsData = useCallback(async (params?: FetchLeadParams) => {
        await fetchLeadsData(params || {}, false);
    }, [fetchLeadsData]);

    const updateLeadStatus = useCallback(async (leadName: string, newStatus: string): Promise<boolean> => {
        if (!token) return false;

        // Prevent status update if current status is 'Client' or 'won'
        const currentLead = leadsData?.find(l => l.name === leadName);
        if (currentLead && ['Client', 'won'].includes(currentLead.status)) {
            console.warn(`Cannot update status for lead ${leadName} as it is already in a terminal state (${currentLead.status}).`);
            return false;
        }

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.update_lead_status`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ lead_name: leadName, status: newStatus }),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
                    logout();
                    return false;
                }
                throw new Error('Failed to update lead status');
            }

            const result = await response.json();
            if (result.message?.status === 'success') {
                // Update local state optimistically
                setLeadsData(prev => {
                    if (!prev) return prev;
                    const updated = prev.map(lead =>
                        lead.name === leadName ? { ...lead, status: newStatus } : lead
                    );
                    sessionStorage.setItem('leadsData', JSON.stringify(updated));
                    return updated;
                });
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error updating lead status:', err);
            return false;
        }
    }, [token, logout, leadsData]);

    const updateLeadGroup = useCallback(async (leadName: string, newGroup: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.update_lead_group`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ lead_name: leadName, group: newGroup }),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
                    logout();
                    return false;
                }
                throw new Error('Failed to update lead group');
            }

            const result = await response.json();
            if (result.message?.status === 'success') {
                // Update local state optimistically
                setLeadsData(prev => {
                    if (!prev) return prev;
                    const updated = prev.map(lead =>
                        lead.name === leadName ? { ...lead, group: newGroup } : lead
                    );
                    sessionStorage.setItem('leadsData', JSON.stringify(updated));
                    return updated;
                });

                // Update groupList if it's a new group
                setGroupList(prev => {
                    if (!prev.includes(newGroup)) {
                        const updated = [...prev, newGroup].sort();
                        sessionStorage.setItem('leadGroupList', JSON.stringify(updated));
                        return updated;
                    }
                    return prev;
                });

                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error updating lead group:', err);
            return false;
        }
    }, [token, logout]);

    const assignLeads = useCallback(async (leadNames: string[], assignedTo: string): Promise<boolean> => {
        if (!token || leadNames.length === 0) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.assign_leads`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ lead_names: leadNames, assigned_to: assignedTo }),
                mode: 'cors',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
                    logout();
                    return false;
                }
                throw new Error('Failed to assign leads');
            }

            const result = await response.json();
            if (result.message?.status === 'success') {
                // Update local state optimistically
                setLeadsData(prev => {
                    if (!prev) return prev;
                    const updated = prev.map(lead =>
                        leadNames.includes(lead.name) ? { ...lead, assigned_to: assignedTo } : lead
                    );
                    sessionStorage.setItem('leadsData', JSON.stringify(updated));
                    return updated;
                });
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error assigning leads:', err);
            return false;
        }
    }, [token, logout]);

    const addLeadNote = useCallback(async (parent: string, notes: string, commentedBy: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.branch.add_lead_note`;

            const now = new Date();
            const commented_time = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');

            const payload = {
                parent,
                notes,
                commented_by: commentedBy,
                commented_time
            };

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
                if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
                    logout();
                    return false;
                }
                throw new Error('Failed to add lead note');
            }

            const result = await response.json();
            if (result.message?.status === 'success') {
                // Update local state optimistically
                setLeadsData(prev => {
                    if (!prev) return prev;
                    const updated = prev.map(lead => {
                        if (lead.name === parent) {
                            return {
                                ...lead,
                                notes: [
                                    ...(lead.notes || []),
                                    {
                                        parent,
                                        notes,
                                        commented_by: commentedBy,
                                        commented_time
                                    }
                                ]
                            };
                        }
                        return lead;
                    });
                    sessionStorage.setItem('leadsData', JSON.stringify(updated));
                    return updated;
                });
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error adding lead note:', err);
            return false;
        }
    }, [token, logout]);

    return (
        <LeadContext.Provider value={{
            leadsData,
            isLoading,
            error,
            count,
            statusCount,
            groupList,
            fetchLeadsData,
            refreshLeadsData,
            clearLeadsData,
            updateLeadStatus,
            updateLeadGroup,
            assignLeads,
            addLeadNote
        }}>
            {children}
        </LeadContext.Provider>
    );
};
