import React from 'react';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatFullDateTime, formatRelativeTime, getInitials } from './activityUtils';
import type { TicketCommentItem } from '@/hooks/useTicketActivities';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TicketCommentsTabProps {
    comments: TicketCommentItem[];
    isLoading: boolean;
}

const TicketCommentsTab: React.FC<TicketCommentsTabProps> = ({ comments, isLoading }) => {
    const { user } = useAuth();
    const currentUserEmail = user?.email;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading comments...</p>
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-slate-200 dark:text-slate-600" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Comments Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 text-sm">
                        Internal comments on this ticket will appear here. They are not visible to the customer.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3">
            {comments.map((item) => {
                const isMe = Boolean(
                    currentUserEmail && (item.user?.email === currentUserEmail || item.commented_by === currentUserEmail)
                );
                return (
                    <div
                        key={item.name}
                        className={cn(
                            "flex items-start gap-3 p-4 rounded-2xl border shadow-sm transition-all w-[90%] sm:w-[82%]",
                            isMe
                                ? "ml-auto bg-purple-50/40 dark:bg-purple-950/25 border-purple-200/70 dark:border-purple-900/50"
                                : "mr-auto bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                        )}
                    >
                        <Avatar className="h-8 w-8 border border-slate-100 dark:border-slate-800 shrink-0">
                            <AvatarFallback className="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                                {getInitials(item.user?.name || item.commented_by)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {item.user?.name || item.commented_by}
                                </span>
                                {isMe && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                                        You
                                    </span>
                                )}
                                <span className="ml-auto text-[10px] text-slate-400 shrink-0" title={formatFullDateTime(item.creation)}>
                                    {formatRelativeTime(item.creation)}
                                </span>
                            </div>
                            <div
                                className="text-sm text-slate-600 dark:text-slate-300 mt-1 html-content"
                                dangerouslySetInnerHTML={{ __html: item.content || '' }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TicketCommentsTab;
