import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useFrappeGetCall } from 'frappe-react-sdk';
import {
    Activity, RefreshCw, MessageSquare, Sparkles, Plus, Minus, Pencil,
    PhoneOutgoing, PhoneIncoming, PhoneMissed, ChevronDown, ChevronUp, Paperclip,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatFullDateTime, formatRelativeTime, formatDurationShort, getInitials, stripHtml, toJsDate } from '@/components/TicketPage/activityUtils';
import type {
    LeadActivitiesResponse, LeadDocActivity, LeadCallActivity, LeadActivityUserInfo, LeadActivityChangeData,
} from '@/hooks/useLeadActivities';

interface LeadActivityTabProps {
    data: LeadActivitiesResponse | null;
    isLoading: boolean;
    onRefresh?: () => void;
}

type FeedItem =
    | { kind: 'doc'; creation: string; key: string; item: LeadDocActivity }
    | { kind: 'call'; creation: string; key: string; item: LeadCallActivity };

const isCallActivity = (activityType: string) => activityType === 'outgoing_call' || activityType === 'incoming_call';

const buildFeed = (data: LeadActivitiesResponse | null): FeedItem[] => {
    if (!data?.message) return [];
    const raw: (LeadDocActivity | LeadCallActivity)[] = data.message.flat().filter(Boolean);

    const items: FeedItem[] = raw.map((entry, idx) => {
        if (isCallActivity(entry.activity_type)) {
            const call = entry as LeadCallActivity;
            return { kind: 'call', creation: call.creation, key: call.name || `call-${idx}`, item: call };
        }
        const doc = entry as LeadDocActivity;
        return { kind: 'doc', creation: doc.creation, key: doc.name || `${doc.activity_type}-${idx}` , item: doc };
    });

    items.sort((a, b) => {
        const ta = new Date(a.creation.replace(' ', 'T')).getTime();
        const tb = new Date(b.creation.replace(' ', 'T')).getTime();
        return tb - ta;
    });

    return items;
};

interface DayGroup {
    key: string;
    label: string;
    items: FeedItem[];
}

const dayLabel = (d: Date): string => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'EEE, d MMM yyyy');
};

// feed is already sorted newest-first, so same-day items are always adjacent.
const groupFeedByDay = (feed: FeedItem[]): DayGroup[] => {
    const groups: DayGroup[] = [];
    let current: DayGroup | null = null;

    feed.forEach((entry) => {
        const d = toJsDate(entry.creation);
        if (!d) return;
        const key = format(d, 'yyyy-MM-dd');
        if (!current || current.key !== key) {
            current = { key, label: dayLabel(d), items: [] };
            groups.push(current);
        }
        current.items.push(entry);
    });

    return groups;
};

const resolveUser = (userInfo: Record<string, LeadActivityUserInfo> | undefined, owner: string) => {
    const info = userInfo?.[owner];
    return { name: info?.fullname || owner || 'Someone', image: info?.image };
};

const displayValue = (val: string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '(empty)';
    return val;
};

const ACTIVITY_STYLES: Record<string, { icon: React.ComponentType<any>; bg: string; color: string }> = {
    comment: { icon: MessageSquare, bg: 'bg-indigo-50 dark:bg-indigo-950/30', color: 'text-indigo-600 dark:text-indigo-400' },
    changed: { icon: Pencil, bg: 'bg-amber-50 dark:bg-amber-950/30', color: 'text-amber-600 dark:text-amber-400' },
    creation: { icon: Sparkles, bg: 'bg-purple-50 dark:bg-purple-950/30', color: 'text-purple-600 dark:text-purple-400' },
    added: { icon: Plus, bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: 'text-emerald-600 dark:text-emerald-400' },
    removed: { icon: Minus, bg: 'bg-red-50 dark:bg-red-950/20', color: 'text-red-600 dark:text-red-400' },
};

const CALL_STATUS_STYLES: Record<string, string> = {
    Completed: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    Answered: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    'No Answer': 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    Failed: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
    Busy: 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900',
    Ringing: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
};

const TimelineDot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-4 ring-slate-50 dark:ring-slate-950/50 z-10 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {children}
    </span>
);

const ActivitySkeletonRow: React.FC<{ wide?: boolean }> = ({ wide }) => (
    <div className="relative flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            {wide && <Skeleton className="h-3.5 w-2/3" />}
        </div>
    </div>
);

const ChangedRow: React.FC<{ entry: LeadDocActivity; owner: string; muted?: boolean }> = ({ entry, owner, muted }) => {
    const data = entry.data as LeadActivityChangeData | undefined;
    if (!data) return null;
    const isAddRemove = entry.activity_type === 'added' || entry.activity_type === 'removed';

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', muted ? 'text-xs' : 'text-sm')}>
            <span className={cn('font-bold', muted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100')}>{owner}</span>
            <span className="text-slate-500 dark:text-slate-400">
                {entry.activity_type === 'added' ? 'added' : entry.activity_type === 'removed' ? 'removed' : 'changed'}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{data.field_label || data.field}</span>
            {isAddRemove ? (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                    {displayValue(data.value)}
                </span>
            ) : (
                <>
                    <span className="text-slate-400">from</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                        {displayValue(data.old_value)}
                    </span>
                    <span className="text-slate-400">to</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-xs font-semibold">
                        {displayValue(data.value)}
                    </span>
                </>
            )}
        </div>
    );
};

const DocActivityCard: React.FC<{ entry: LeadDocActivity; userInfo?: Record<string, LeadActivityUserInfo> }> = ({ entry, userInfo }) => {
    const [expanded, setExpanded] = useState(false);
    const { name: ownerName, image } = resolveUser(userInfo, entry.owner);
    const style = ACTIVITY_STYLES[entry.activity_type] || ACTIVITY_STYLES.changed;
    const Icon = style.icon;
    const otherVersions = entry.other_versions || [];

    const handleOpenAttachment = async (e: React.MouseEvent, fileUrl: string, fileName?: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fileUrl) return;

        let targetUrl = fileUrl;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const cleanPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
            targetUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
        }

        try {
            const response = await fetch(targetUrl, { credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const newTab = window.open(blobUrl, '_blank');
            if (!newTab) {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName || 'attachment';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            console.error('Failed to fetch attachment blob, opening direct target URL:', err);
            window.open(targetUrl, '_blank');
        }
    };

    return (
        <div className="relative flex items-start gap-4">
            <TimelineDot>
                {entry.activity_type === 'comment' ? (
                    <Avatar className="h-full w-full">
                        <AvatarImage src={image} alt={ownerName} />
                        <AvatarFallback className="bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                            {getInitials(ownerName)}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <span className={cn('flex h-full w-full items-center justify-center', style.bg)}>
                        <Icon size={16} className={style.color} />
                    </span>
                )}
            </TimelineDot>

            <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 hover:border-purple-200/50 dark:hover:border-purple-900/50 transition-all">
                {entry.activity_type === 'comment' ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{ownerName}</span>
                            <span className="text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(entry.creation)}>
                                {formatRelativeTime(entry.creation)}
                            </span>
                        </div>
                        <div
                            className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5 [&_p]:m-0 [&_p+p]:mt-2"
                            dangerouslySetInnerHTML={{ __html: (entry.content as string) || '' }}
                        />
                        {entry.attachments && entry.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {entry.attachments.map((att) => (
                                    <a
                                        key={att.name}
                                        href={att.file_url}
                                        onClick={(e) => handleOpenAttachment(e, att.file_url, att.file_name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-purple-200 hover:text-purple-600 transition-colors"
                                    >
                                        <Paperclip size={11} />
                                        <span className="truncate max-w-[160px]">{att.file_name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </>
                ) : entry.activity_type === 'creation' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{ownerName}</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400">{typeof entry.data === 'string' ? entry.data : 'created this lead'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(entry.creation)}>
                            {formatRelativeTime(entry.creation)}
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <ChangedRow entry={entry} owner={ownerName} />
                            <span className="text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(entry.creation)}>
                                {formatRelativeTime(entry.creation)}
                            </span>
                        </div>

                        {otherVersions.length > 0 && (
                            <div className="mt-2">
                                <button
                                    type="button"
                                    onClick={() => setExpanded((v) => !v)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {expanded ? 'Hide' : `+${otherVersions.length} more update${otherVersions.length > 1 ? 's' : ''}`}
                                </button>
                                {expanded && (
                                    <div className="mt-2 space-y-2 pl-3 border-l-2 border-slate-100 dark:border-slate-800">
                                        {otherVersions.map((v, i) => {
                                            const vOwner = resolveUser(userInfo, v.owner).name;
                                            return (
                                                <div key={v.name || i} className="flex flex-wrap items-center justify-between gap-2">
                                                    <ChangedRow entry={v} owner={vOwner} muted />
                                                    <span className="text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(v.creation)}>
                                                        {formatRelativeTime(v.creation)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const CallActivityCard: React.FC<{ entry: LeadCallActivity }> = ({ entry }) => {
    const [expanded, setExpanded] = useState(false);
    const isOutgoing = entry.type === 'Outgoing';
    const statusStyle = CALL_STATUS_STYLES[entry.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    const otherParty = isOutgoing ? (entry._receiver?.label || entry.to) : (entry._caller?.label || entry.from);
    const DirectionIcon = entry.status === 'No Answer' || entry.status === 'Failed' ? PhoneMissed : (isOutgoing ? PhoneOutgoing : PhoneIncoming);
    const dotStyle = isOutgoing ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400';
    const durationLabel = entry.duration > 0 ? formatDurationShort(entry.duration) : null;

    // The exotel URL stored on the call log isn't directly playable — the actual
    // playback URL has to be resolved through this endpoint, fetched lazily once expanded.
    const { data: recordingData, isLoading: isRecordingLoading } = useFrappeGetCall<{ message: string }>(
        'crm.integrations.api.get_recording_url',
        { call_log_name: entry.name },
        expanded ? undefined : null
    );
    const recordingUrl = recordingData?.message;

    return (
        <div className="relative flex items-start gap-4">
            <TimelineDot>
                <span className={cn('flex h-full w-full items-center justify-center', dotStyle)}>
                    <DirectionIcon size={16} />
                </span>
            </TimelineDot>

            <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 hover:border-purple-200/50 dark:hover:border-purple-900/50 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{isOutgoing ? 'Called' : 'Call from'}</span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">{otherParty}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(entry.creation)}>
                        {formatRelativeTime(entry.creation)}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', statusStyle)}>
                        {entry.status}
                    </span>
                    {durationLabel && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{durationLabel}</span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {entry.from} &rarr; {entry.to}
                    </span>
                    {entry.recording_url && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                            {expanded ? 'Hide recording' : 'Play recording'}
                        </button>
                    )}
                </div>

                {expanded && (
                    isRecordingLoading ? (
                        <div className="flex items-center gap-2 mt-3 h-9 text-xs text-slate-400 dark:text-slate-500">
                            <RefreshCw size={12} className="animate-spin" />
                            Loading recording...
                        </div>
                    ) : recordingUrl ? (
                        <audio controls src={recordingUrl} className="w-full mt-3 h-9">
                            Your browser does not support the audio element.
                        </audio>
                    ) : (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-3">Recording unavailable.</p>
                    )
                )}

                {entry.note && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">{stripHtml(entry.note)}</p>
                )}
            </div>
        </div>
    );
};

const LeadActivityTab: React.FC<LeadActivityTabProps> = ({ data, isLoading, onRefresh }) => {
    const feed = useMemo(() => buildFeed(data), [data]);
    const dayGroups = useMemo(() => groupFeedByDay(feed), [feed]);
    const userInfo = data?.docinfo?.user_info;
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

    const toggleDay = (key: string) => {
        setCollapsedDays((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between px-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <div className="space-y-5">
                    <ActivitySkeletonRow wide />
                    <ActivitySkeletonRow />
                    <ActivitySkeletonRow wide />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-purple-600 dark:text-purple-400" />
                    Activity Timeline
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                        {feed.length}
                    </span>
                </h3>
                {onRefresh && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                    >
                        <RefreshCw size={15} />
                    </Button>
                )}
            </div>

            {dayGroups.length > 0 ? (
                <div className="space-y-6">
                    {dayGroups.map((group) => {
                        const isCollapsed = collapsedDays.has(group.key);
                        return (
                            <div key={group.key}>
                                <button
                                    type="button"
                                    onClick={() => toggleDay(group.key)}
                                    className="w-full flex items-center gap-2.5 px-1 mb-3 group/day-header"
                                >
                                    {isCollapsed ? (
                                        <ChevronDown size={13} className="text-slate-400 shrink-0" />
                                    ) : (
                                        <ChevronUp size={13} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover/day-header:text-purple-600 dark:group-hover/day-header:text-purple-400 whitespace-nowrap transition-colors">
                                        {group.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                        {group.items.length} {group.items.length === 1 ? 'activity' : 'activities'}
                                    </span>
                                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                                </button>

                                {!isCollapsed && (
                                    <div className="relative space-y-5 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 dark:before:from-slate-800 before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                                        {group.items.map((entry, idx) => (
                                            <div key={entry.key} className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}>
                                                {entry.kind === 'call' ? (
                                                    <CallActivityCard entry={entry.item} />
                                                ) : (
                                                    <DocActivityCard entry={entry.item} userInfo={userInfo} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="mx-auto w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                        <Activity size={24} className="text-slate-250 dark:text-slate-750" />
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">No activity recorded for this lead yet.</p>
                </div>
            )}
        </div>
    );
};

export default LeadActivityTab;
