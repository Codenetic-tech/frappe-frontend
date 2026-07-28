import { useCallback, useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import type { CommunicationItem } from '@/components/TicketPage/EmailActivityCard';

export interface TicketActivityUser {
    email: string;
    image?: string;
    name?: string;
}

export interface TicketHistoryItem {
    name: string;
    action: string;
    owner: string;
    creation: string;
    user?: TicketActivityUser;
}

export interface TicketViewItem {
    name: string;
    creation: string;
    viewed_by: string;
    user?: TicketActivityUser;
}

export interface TicketCommentItem {
    name: string;
    content?: string;
    commented_by?: string;
    creation: string;
    is_pinned?: number;
    attachments?: any[];
    user?: TicketActivityUser;
}

export interface TicketActivitiesResponse {
    comments: TicketCommentItem[];
    communications: CommunicationItem[];
    history: TicketHistoryItem[];
    views: TicketViewItem[];
    calls: any[];
}

export function useTicketActivities(ticketId: string | undefined) {
    const { call, loading } = useFrappePostCall<{ message: TicketActivitiesResponse }>(
        'helpdesk.helpdesk.doctype.hd_ticket.api.get_ticket_activities'
    );
    const [data, setData] = useState<TicketActivitiesResponse | null>(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const refresh = useCallback(async () => {
        if (!ticketId) return;
        try {
            const res = await call({ ticket: ticketId });
            setData(res?.message ?? null);
        } catch (err) {
            console.error('Failed to fetch ticket activities:', err);
        } finally {
            setHasLoadedOnce(true);
        }
    }, [ticketId, call]);

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId]);

    return { data, isLoading: loading && !hasLoadedOnce, refresh };
}
