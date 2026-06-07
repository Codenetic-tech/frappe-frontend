import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { TICKETING_DEPARTMENTS as TICKET_DEPARTMENTS } from '@/constants/departments';
// eslint-disable-next-line react-refresh/only-export-components
export { TICKET_DEPARTMENTS };

export interface TicketItem {
    name: string;
    ticket_id: string;
    subject: string;
    description: string;
    status: 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    to_department: string;
    requester_name: string;
    requester_email: string;
    assigned_to: string;
    created: string;
    modified: string;
    created_by: string;
    source: string;
    rating: number;
    resolved_by?: string;
    due_date?: string;
    reply?: { notes: string, commented_by: string, commented_time: string }[];
}

// eslint-disable-next-line react-refresh/only-export-components
export const isSLABreached = (ticket: TicketItem) => {
    if (!ticket.due_date || ticket.status === 'Resolved' || ticket.status === 'Closed') {
        return false;
    }
    try {
        const dueDate = new Date(ticket.due_date.replace(' ', 'T'));
        return dueDate < new Date();
    } catch (e) {
        return false;
    }
};

export interface TicketStatusCount {
    "Total": number;
    "Open": number;
    "In Progress": number;
    "Resolved": number;
    "Closed": number;
}

export interface FetchTicketParams {
    limit_start?: number;
    limit_page_length?: number;
    from_date?: string;
    to_date?: string;
    status?: string;
    priority?: string;
    search?: string;
    order_by?: string;
    order?: 'asc' | 'desc';
    ticket_id?: string;
    global_search?: string;
}

// TICKET_DEPARTMENTS is now imported from @/constants/departments as TICKETING_DEPARTMENTS

interface CreateTicketData {
    subject: string;
    description?: string;
    to_department: string;
    priority: string;
    due_date?: string;
    attachment?: File | null;
}

interface TicketApiItem {
    name: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    to: string;
    created_by: string;
    creation: string;
    modified: string;
    rating?: number;
    resolved_by?: string;
    due_date?: string;
    reply?: { notes: string; commented_by: string; commented_time: string }[];
}

interface TicketContextType {
    ticketsData: TicketItem[] | null;
    isLoading: boolean;
    error: string | null;
    count: number;
    statusCount: TicketStatusCount;
    refreshTicketsData: (params?: FetchTicketParams) => Promise<void>;
    fetchTicketsData: (params?: FetchTicketParams, silent?: boolean) => Promise<void>;
    createTicket: (ticketData: CreateTicketData) => Promise<void>;
    updateTicketStatus: (ticketId: string, newStatus: string) => Promise<boolean>;
    assignTickets: (ticketIds: string[], department: string) => Promise<boolean>;
    addTicketReply: (ticketId: string, notes: string, commentedBy: string, attachment?: File | null) => Promise<boolean>;
    fetchTicketHistory: (ticketId: string) => Promise<Record<string, unknown>[] | null>;
    fetchTicketActivity: (ticketId: string) => Promise<Record<string, unknown>[] | null>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTickets = () => {
    const context = useContext(TicketContext);
    if (!context) {
        throw new Error('useTickets must be used within a TicketProvider');
    }
    return context;
};

// Removed generateMockTickets as we are now using real API data

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, isAuthenticated, user } = useAuth();
    const lastParamsRef = React.useRef<FetchTicketParams>({});
    const [ticketsData, setTicketsData] = useState<TicketItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    const [statusCount, setStatusCount] = useState<TicketStatusCount>({
        "Total": 0,
        "Open": 0,
        "In Progress": 0,
        "Resolved": 0,
        "Closed": 0
    });

    const fetchTicketsData = useCallback(async (params: FetchTicketParams = {}, silent: boolean = false) => {
        if (!isAuthenticated || !token) return;

        // Store params for polling
        lastParamsRef.current = params;

        if (!silent) setIsLoading(true);
        setError(null);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const isGlobalSearch = !!params.search || !!params.global_search;
            const apiUrl = isGlobalSearch
                ? `${API_BASE_URL}/api/method/rms.tickets.global_search`
                : `${API_BASE_URL}/api/method/rms.tickets.get_tickets_cached`;

            const payload: Record<string, unknown> = {
                limit_start: params.limit_start || 0,
                limit_page_length: params.limit_page_length || 50,
                order_by: params.order_by || 'modified',
                order: params.order || 'desc'
            };

            if (isGlobalSearch) {
                payload.search_term = params.search || params.global_search;
            }

            if (params.status && params.status !== 'ALL') payload.status = params.status;
            if (params.priority && params.priority !== 'ALL') payload.priority = params.priority;
            if (params.from_date) payload.from_date = params.from_date;
            if (params.to_date) payload.to_date = params.to_date;
            if (params.ticket_id) {
                payload.name = params.ticket_id;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.message && data.message.status === 'success') {
                const apiData = data.message.data || [];

                // Map API fields to UI model fields
                const mappedTickets: TicketItem[] = apiData.map((t: TicketApiItem) => ({
                    name: t.name,
                    ticket_id: t.name,
                    subject: t.subject,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    to_department: t.to,
                    requester_name: t.created_by,
                    requester_email: '', // Not in API
                    assigned_to: '', // Not in API
                    created: t.creation,
                    modified: t.modified,
                    created_by: t.created_by,
                    source: 'Web',
                    rating: t.rating || 0,
                    resolved_by: t.resolved_by,
                    due_date: t.due_date,
                    reply: t.reply || []
                }));

                const apiStatusCounts = data.message.status_count;

                setTicketsData(mappedTickets);
                setCount(data.message.total_count || 0);

                if (apiStatusCounts) {
                    const counts: TicketStatusCount = {
                        "Total": data.message.total_count || 0,
                        "Open": apiStatusCounts.Open || 0,
                        "In Progress": apiStatusCounts["In Progress"] || 0,
                        "Resolved": apiStatusCounts.Resolved || 0,
                        "Closed": apiStatusCounts.Closed || 0
                    };
                    setStatusCount(counts);
                } else {
                    // Update total count but retain status breakdown for global search
                    setStatusCount(prev => ({
                        ...prev,
                        "Total": data.message.total_count || 0
                    }));
                }
            } else {
                throw new Error(data.message?.message || 'Failed to fetch tickets');
            }

        } catch (err) {
            console.error('Error fetching Tickets data:', err);
            setError('An error occurred while fetching tickets. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, token]);

    const refreshTicketsData = useCallback(async (params?: FetchTicketParams) => {
        await fetchTicketsData(params || {}, false);
    }, [fetchTicketsData]);

    const createTicket = async (ticketData: CreateTicketData) => {
        setIsLoading(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.create_ticket`;

            let body;
            const headers: Record<string, string> = {
                'token': token || ''
            };

            if (ticketData.attachment) {
                const formData = new FormData();
                formData.append('subject', ticketData.subject);
                formData.append('description', ticketData.description || '');
                formData.append('to', ticketData.to_department);
                formData.append('priority', ticketData.priority);
                if (ticketData.due_date) {
                    formData.append('due_date', ticketData.due_date);
                }
                formData.append('attachment', ticketData.attachment);
                body = formData;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    subject: ticketData.subject,
                    description: ticketData.description,
                    to: ticketData.to_department,
                    priority: ticketData.priority,
                    due_date: ticketData.due_date
                });
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message?.message || `API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.message && data.message.status === 'success') {
                // Success - we refresh to get the latest list (though currently mocked)
                // In a real scenario, this would fetch from the server
                await refreshTicketsData();

                // For better UX while fetch is still mocked, we could manually insert it too
                // but refreshTicketsData is safer if the user has other logic.
            } else {
                throw new Error(data.message?.message || 'Failed to create ticket');
            }

        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const updateTicketStatus = useCallback(async (ticketId: string, newStatus: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.update_ticket_status`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ name: ticketId, status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message?.message || `API error: ${response.status}`);
            }

            const result = await response.json();
            if (result.message && result.message.status === 'success') {
                // Update local state optimistically
                setTicketsData(prev => {
                    if (!prev) return prev;
                    return prev.map(ticket =>
                        ticket.ticket_id === ticketId ? { ...ticket, status: newStatus as TicketItem['status'] } : ticket
                    );
                });

                // Also trigger a silent refresh to update counts
                refreshTicketsData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating ticket status:', error);
            return false;
        }
    }, [token, refreshTicketsData]);

    const addTicketReply = useCallback(async (ticketId: string, notes: string, commentedBy: string, attachment?: File | null): Promise<boolean> => {
        if (!token) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.add_ticket_reply`;

            const now = new Date();
            const commented_time = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');

            let body;
            const headers: Record<string, string> = {
                'token': token
            };

            if (attachment) {
                const formData = new FormData();
                formData.append('name', ticketId);
                formData.append('reply', notes);
                formData.append('commented_by', commentedBy);
                formData.append('commented_time', commented_time);
                formData.append('attachment', attachment);
                body = formData;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    name: ticketId,
                    reply: notes,
                    commented_by: commentedBy,
                    commented_time
                });
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message?.message || `API error: ${response.status}`);
            }

            const result = await response.json();
            if (result.message && result.message.status === 'success') {
                // Update local state optimistically
                setTicketsData(prev => {
                    if (!prev) return prev;
                    return prev.map(ticket => {
                        if (ticket.ticket_id === ticketId) {
                            return {
                                ...ticket,
                                reply: [
                                    ...(ticket.reply || []),
                                    { notes, commented_by: commentedBy, commented_time }
                                ]
                            };
                        }
                        return ticket;
                    });
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding ticket reply:', error);
            return false;
        }
    }, [token]);

    const fetchTicketHistory = useCallback(async (ticketId: string): Promise<Record<string, unknown>[] | null> => {
        if (!token) return null;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.get_ticket_history`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ name: ticketId })
            });

            if (!response.ok) {
                console.error(`API error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            if (data.message && data.message.status === 'success') {
                return data.message.data || [];
            }
            return null;
        } catch (error) {
            console.error('Error fetching ticket history:', error);
            return null;
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated && token) {
            fetchTicketsData({}, true);
        } else {
            setTicketsData(null);
            setCount(0);
        }
    }, [isAuthenticated, token, fetchTicketsData]);

    // Polling Every 5 Minutes
    useEffect(() => {
        if (!token || !user?.department) return;

        // Only poll if user is from a ticketing department
        const isTicketingUser = TICKET_DEPARTMENTS.includes(user.department.toUpperCase());
        if (!isTicketingUser) return;

        const pollingInterval = setInterval(() => {
            console.log('Background polling for Tickets data...');
            fetchTicketsData(lastParamsRef.current, true); // Silent fetch
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(pollingInterval);
    }, [token, fetchTicketsData, user?.department]);

    const fetchTicketActivity = useCallback(async (ticketId: string): Promise<Record<string, unknown>[] | null> => {
        if (!token) return null;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.get_ticket_activity`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({ name: ticketId })
            });

            if (!response.ok) {
                console.error(`API error: ${response.status}`);
                return null;
            }

            const data = await response.json();
            if (data.message && data.message.status === 'success') {
                return data.message.data || [];
            }
            return null;
        } catch (error) {
            console.error('Error fetching ticket activity:', error);
            return null;
        }
    }, [token]);

    const assignTickets = useCallback(async (ticketIds: string[], department: string): Promise<boolean> => {
        if (!token) return false;
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const apiUrl = `${API_BASE_URL}/api/method/rms.tickets.bulk_assign`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                body: JSON.stringify({
                    ticket_ids: ticketIds,
                    to: department
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message?.message || `API error: ${response.status}`);
            }

            const result = await response.json();
            if (result.message && result.message.status === 'success') {
                // Refresh local data to show updated department
                await refreshTicketsData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error assigning tickets:', error);
            return false;
        }
    }, [token, refreshTicketsData]);

    return (
        <TicketContext.Provider value={{
            ticketsData,
            isLoading,
            error,
            count,
            statusCount,
            fetchTicketsData,
            refreshTicketsData,
            createTicket,
            updateTicketStatus,
            assignTickets,
            addTicketReply,
            fetchTicketHistory,
            fetchTicketActivity
        }}>
            {children}
        </TicketContext.Provider>
    );
};
