import React, { useState, useEffect, useCallback } from 'react';
import { 
    Clock, 
    User, 
    CheckCircle, 
    Activity, 
    ArrowRight,
    RefreshCw,
    UserPlus,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { useTickets } from '@/contexts/TicketContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface TicketTimelineTabProps {
    ticketId: string;
}

interface ActivityItem {
    message: string;
    time: string;
    isReply?: boolean;
}

interface HistoryItem {
    commented_time: string;
    commented_by: string;
    reply: string;
}

const TicketTimelineTab: React.FC<TicketTimelineTabProps> = ({ ticketId }) => {
    const { fetchTicketActivity, fetchTicketHistory } = useTickets();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const stripHtml = (html: string) => {
        if (!html) return '';
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        } catch (e) {
            // Fallback for simple tag removal if DOMParser fails
            return html.replace(/<[^>]*>/g, '');
        }
    };

    const loadActivity = useCallback(async () => {
        setIsLoading(true);
        try {
            const [activityData, historyData] = await Promise.all([
                fetchTicketActivity(ticketId),
                fetchTicketHistory(ticketId)
            ]);

            if (activityData) {
                const typedActivityData = activityData as unknown as ActivityItem[];
                let processedActivities: ActivityItem[] = [...typedActivityData];

                // Enrich activities with history data for replies
                if (historyData && historyData.length > 0) {
                    // Clone and sort history for proximity matching
                    const historyPool = historyData as unknown as HistoryItem[];
                    const matchedHistoryIndices = new Set<number>();

                    processedActivities = typedActivityData.map(act => {
                        // The system message is often "Administrator added rows for reply"
                        if (act.message.includes("added rows for reply")) {
                            const actTime = new Date(act.time.replace(' ', 'T')).getTime();

                            // Proximity Search: Find the closest UNMATCHED history record within a 5-minute (300s) window
                            let bestMatchIndex = -1;
                            let minDiff = 300 * 1000; // 5 minutes threshold

                            historyPool.forEach((hist, index) => {
                                if (matchedHistoryIndices.has(index)) return;

                                const histTime = new Date(hist.commented_time.replace(' ', 'T')).getTime();
                                const diff = Math.abs(actTime - histTime);

                                if (diff <= minDiff) {
                                    minDiff = diff;
                                    bestMatchIndex = index;
                                }
                            });

                            if (bestMatchIndex !== -1) {
                                const match = historyPool[bestMatchIndex];
                                matchedHistoryIndices.add(bestMatchIndex);
                                return {
                                    ...act,
                                    message: `${match.commented_by} replied: ${stripHtml(match.reply)}`,
                                    isReply: true
                                };
                            }
                        }
                        return act;
                    });
                }

                setActivities(processedActivities);
            }
        } catch (error) {
            console.error('Error loading timeline data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [ticketId, fetchTicketActivity, fetchTicketHistory]);

    useEffect(() => {
        loadActivity();
    }, [loadActivity]);

    const formatActivityMessage = (msg: string) => {
        // If it's an enriched reply message (contains "replied: "), we don't want to strip "Guest" 
        // from the user's name if they are named Guest, but usually we just want to clean system messages.
        if (msg.includes(' replied: ')) return msg;
        
        // Remove "Guest " prefix from system messages if it exists (case-insensitive)
        const cleaned = msg.replace(/^Guest\s+/i, '');
        return cleaned;
    };

    const getActivityIcon = (item: ActivityItem) => {
        if (item.isReply) return <MessageSquare className="w-4 h-4 text-indigo-500" />;
        
        const lowerMsg = item.message.toLowerCase();
        if (lowerMsg.includes('created')) return <Activity className="w-4 h-4 text-blue-500" />;
        if (lowerMsg.includes('assigned')) return <UserPlus className="w-4 h-4 text-purple-500" />;
        if (lowerMsg.includes('status changed')) {
            if (lowerMsg.includes("'resolved'") || lowerMsg.includes("'closed'")) {
                return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            }
            return <RefreshCw className="w-4 h-4 text-amber-500" />;
        }
        if (lowerMsg.includes('reply') || lowerMsg.includes('comment')) return <MessageSquare className="w-4 h-4 text-indigo-500" />;
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    };

    const formatActivityTime = (timeStr: string) => {
        if (!timeStr) return '';
        try {
            // Handle ISO-like string from API (2026-04-21 10:31:03.478714)
            const date = new Date(timeStr.replace(' ', 'T'));
            return format(date, 'MMM dd, yyyy • hh:mm a');
        } catch (e) {
            return timeStr;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Timeline...</p>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                    <Activity className="w-8 h-8 text-slate-200" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">No Activity Found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-1">We couldn't find any recorded activity for this ticket.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100" />

                <div className="space-y-10">
                    {activities.map((item, index) => {
                        const cleanedMessage = formatActivityMessage(item.message);
                        const isLast = index === activities.length - 1;

                        return (
                            <div key={index} className="relative flex gap-6 group">
                                {/* Dot Icon Container */}
                                <div className="relative z-10 shrink-0">
                                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        {getActivityIcon(item)}
                                    </div>
                                    {/* Highlighting the most recent activity */}
                                    {index === 0 && (
                                        <div className="absolute -inset-1 bg-purple-500/10 rounded-2xl animate-pulse -z-10" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div className="space-y-1">
                                            <p className="text-sm md:text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors duration-300">
                                                {cleanedMessage}
                                            </p>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock size={12} />
                                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest leading-none pt-0.5">
                                                    {formatActivityTime(item.time)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Activity Badge */}
                                        <div className="shrink-0 flex self-start md:self-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                                                item.isReply ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                cleanedMessage.toLowerCase().includes('resolved') || cleanedMessage.toLowerCase().includes('closed') 
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : cleanedMessage.toLowerCase().includes('created')
                                                        ? "bg-blue-50 text-blue-600 border-blue-100"
                                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                            )}>
                                                {item.isReply ? 'Reply' :
                                                 cleanedMessage.toLowerCase().includes('status') ? 'Status Update' : 
                                                 cleanedMessage.toLowerCase().includes('assigned') ? 'Assignment' :
                                                 cleanedMessage.toLowerCase().includes('created') ? 'System' : 'Activity'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Detailed view for status changes if we wanted to parse more, 
                                        but simple display is requested */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TicketTimelineTab;
