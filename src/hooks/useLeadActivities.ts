import { useCallback, useEffect, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';

export interface LeadActivityUserInfo {
    fullname: string;
    image?: string;
    name: string;
    email: string;
    time_zone?: string;
}

export interface LeadActivityChangeData {
    field: string;
    field_label: string;
    old_value?: string | null;
    value?: string | null;
}

export interface LeadDocActivity {
    name?: string;
    activity_type: 'comment' | 'changed' | 'creation' | 'added' | 'removed' | string;
    creation: string;
    owner: string;
    content?: string;
    data?: string | LeadActivityChangeData;
    options?: string;
    other_versions?: LeadDocActivity[];
    attachments?: { name: string; file_url: string; file_name?: string }[];
    is_lead?: boolean;
}

export interface LeadCallActivity {
    name: string;
    activity_type: 'outgoing_call' | 'incoming_call' | string;
    caller: string;
    receiver: string | null;
    from: string;
    to: string;
    duration: number;
    start_time: string;
    end_time: string;
    status: string;
    type: 'Outgoing' | 'Incoming' | string;
    recording_url?: string;
    creation: string;
    note?: string | null;
    _duration?: string;
    _caller?: { label: string; image?: string | null };
    _receiver?: { label: string; image?: string | null };
}

export interface LeadActivitiesResponse {
    docinfo: {
        user_info: Record<string, LeadActivityUserInfo>;
        [key: string]: any;
    };
    message: any[][];
}

export function useLeadActivities(leadId: string | undefined) {
    // get_activities sets frappe.response.docinfo/message directly, so the
    // response body IS { docinfo, message } — no extra "message" envelope to unwrap.
    const { call, loading } = useFrappePostCall<LeadActivitiesResponse>(
        'crm.api.activities.get_activities'
    );
    const [data, setData] = useState<LeadActivitiesResponse | null>(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    const refresh = useCallback(async () => {
        if (!leadId) return;
        try {
            const res = await call({ name: leadId });
            setData(res ?? null);
        } catch (err) {
            console.error('Failed to fetch lead activities:', err);
        } finally {
            setHasLoadedOnce(true);
        }
    }, [leadId, call]);

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leadId]);

    return { data, isLoading: loading && !hasLoadedOnce, refresh };
}
