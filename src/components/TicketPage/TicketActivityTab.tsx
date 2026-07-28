import React, { useMemo } from 'react';
import { Activity, MessageSquare, History as HistoryIcon, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmailActivityCard from './EmailActivityCard';
import { formatFullDateTime, formatRelativeTime, getInitials, stripHtml } from './activityUtils';
import type { TicketActivitiesResponse } from '@/hooks/useTicketActivities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketActivityTabProps {
    data: TicketActivitiesResponse | null;
    isLoading: boolean;
    filter?: 'all' | 'communications';
}

type FeedEntry =
    | { type: 'communication'; date: string; key: string; item: TicketActivitiesResponse['communications'][number] }
    | { type: 'history'; date: string; key: string; item: TicketActivitiesResponse['history'][number] }
    | { type: 'comment'; date: string; key: string; item: TicketActivitiesResponse['comments'][number] }
    | { type: 'view'; date: string; key: string; item: TicketActivitiesResponse['views'][number] };

const buildFeed = (data: TicketActivitiesResponse | null, filter: 'all' | 'communications'): FeedEntry[] => {
    if (!data) return [];
    const entries: FeedEntry[] = [];

    (data.communications || []).forEach((item) => {
        entries.push({ type: 'communication', date: item.communication_date || item.creation, key: item.name, item });
    });

    if (filter === 'all') {
        (data.history || []).forEach((item) => {
            entries.push({ type: 'history', date: item.creation, key: `history-${item.name}`, item });
        });
        (data.comments || []).forEach((item) => {
            entries.push({ type: 'comment', date: item.creation, key: `comment-${item.name}`, item });
        });
        (data.views || []).forEach((item) => {
            entries.push({ type: 'view', date: item.creation, key: `view-${item.name}`, item });
        });
    }

    entries.sort((a, b) => {
        const ta = new Date(a.date.replace(' ', 'T')).getTime();
        const tb = new Date(b.date.replace(' ', 'T')).getTime();
        return ta - tb;
    });

    return entries;
};

const TicketActivityTab: React.FC<TicketActivityTabProps> = ({ data, isLoading, filter = 'all' }) => {
    const feed = useMemo(() => buildFeed(data, filter), [data, filter]);

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Skeleton className="h-3.5 w-32" />
                                <Skeleton className="h-3 w-10" />
                            </div>
                            <Skeleton className="h-3.5 w-full" />
                            {i !== 1 && <Skeleton className="h-3.5 w-2/3" />}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (feed.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <Activity className="w-8 h-8 text-slate-200 dark:text-slate-600" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {filter === 'communications' ? 'No Emails Yet' : 'No Activity Yet'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 text-sm">
                        {filter === 'communications'
                            ? 'Emails sent or received on this ticket will appear here.'
                            : 'Activity on this ticket will appear here.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3">
            {feed.map((entry) => {
                if (entry.type === 'communication') {
                    return <EmailActivityCard key={entry.key} item={entry.item} defaultExpanded />;
                }

                if (entry.type === 'history') {
                    const actor = entry.item.user?.name || entry.item.user?.email || entry.item.owner;
                    return (
                        <div key={entry.key} className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                            <HistoryIcon size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="truncate">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">{actor}</span> {entry.item.action}
                            </span>
                            <span className="ml-auto shrink-0" title={formatFullDateTime(entry.item.creation)}>
                                {formatRelativeTime(entry.item.creation)}
                            </span>
                        </div>
                    );
                }

                if (entry.type === 'view') {
                    const actor = entry.item.user?.name || entry.item.user?.email || entry.item.viewed_by;
                    return (
                        <div key={entry.key} className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                            <Eye size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="truncate">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">{actor}</span> viewed this ticket
                            </span>
                            <span className="ml-auto shrink-0" title={formatFullDateTime(entry.item.creation)}>
                                {formatRelativeTime(entry.item.creation)}
                            </span>
                        </div>
                    );
                }

                const actor = entry.item.user?.name || entry.item.user?.email || entry.item.commented_by || 'Someone';
                const text = stripHtml(entry.item.content) || 'left a comment';
                return (
                    <div
                        key={entry.key}
                        className="flex items-start gap-3 p-4 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20"
                    >
                        <Avatar className="h-8 w-8 border border-slate-100 dark:border-slate-800 shrink-0">
                            <AvatarFallback className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                {getInitials(actor)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{actor}</span>
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                    "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                                )}>
                                    <MessageSquare size={9} className="inline mr-1 -mt-0.5" />
                                    Comment
                                </span>
                                <span className="ml-auto text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(entry.item.creation)}>
                                    {formatRelativeTime(entry.item.creation)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{text}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TicketActivityTab;
