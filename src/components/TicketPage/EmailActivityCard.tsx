import React, { useState } from 'react';
import { Reply, ReplyAll, MoreHorizontal, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { collapseQuotedHtml, formatFullDateTime, formatRelativeTime, getInitials, stripHtml } from './activityUtils';

export interface CommunicationAttachment {
    name: string;
    file_url: string;
    file_name: string;
}

export interface CommunicationItem {
    name: string;
    subject?: string;
    content: string;
    creation: string;
    communication_date: string;
    sender: string;
    recipients?: string | null;
    cc?: string | null;
    bcc?: string | null;
    delivery_status?: string;
    sent_or_received: 'Sent' | 'Received' | string;
    user?: { email: string; image?: string; name?: string };
    attachments?: CommunicationAttachment[];
}

interface EmailActivityCardProps {
    item: CommunicationItem;
    defaultExpanded?: boolean;
}

const EmailActivityCard: React.FC<EmailActivityCardProps> = ({ item, defaultExpanded = false }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const displayName = item.user?.name && item.user.name !== item.user?.email ? item.user.name : item.sender;
    const preview = stripHtml(item.content).slice(0, 140);
    const bodyHtml = collapseQuotedHtml(item.content);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
                <Avatar className="h-9 w-9 border border-slate-100 dark:border-slate-800 shrink-0 mt-0.5">
                    <AvatarImage src={item.user?.image || undefined} alt={displayName} />
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
                        {getInitials(displayName)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{displayName}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate">&lt;{item.sender}&gt;</span>
                    </div>
                    {expanded && item.recipients && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            To: {item.recipients}
                            {item.cc ? <span> &nbsp;cc: {item.cc}</span> : null}
                        </p>
                    )}
                    {!expanded && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{preview}</p>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span
                        className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap"
                        title={formatFullDateTime(item.communication_date || item.creation)}
                    >
                        {formatRelativeTime(item.communication_date || item.creation)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-slate-300 dark:text-slate-600">
                        <Reply size={14} />
                        <ReplyAll size={14} />
                        <MoreHorizontal size={14} />
                    </span>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4">
                    <div className="border-t border-slate-50 dark:border-slate-800 pt-4">
                        <div
                            className="email-html-content text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: bodyHtml }}
                        />

                        {item.attachments && item.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {item.attachments.map((att) => (
                                    <a
                                        key={att.name}
                                        href={att.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-purple-200 hover:text-purple-600 transition-colors"
                                    >
                                        <Paperclip size={12} />
                                        <span className="truncate max-w-[180px]">{att.file_name}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailActivityCard;

const emailHtmlStyles = `
    .email-html-content p { margin: 0 0 0.5rem 0; }
    .email-html-content p:last-child { margin-bottom: 0; }
    .email-html-content a { color: #7c3aed; text-decoration: underline; }
    .email-html-content details.quoted-toggle {
        margin-top: 0.75rem;
    }
    .email-html-content details.quoted-toggle summary.quoted-toggle-summary {
        list-style: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        background: rgba(148, 163, 184, 0.08);
    }
    .email-html-content details.quoted-toggle summary.quoted-toggle-summary::-webkit-details-marker {
        display: none;
    }
    .email-html-content details.quoted-toggle[open] summary.quoted-toggle-summary::after {
        content: "";
    }
    .email-html-content details.quoted-toggle > *:not(summary) {
        margin-top: 0.5rem;
        padding-left: 0.75rem;
        border-left: 2px solid #e2e8f0;
        color: #94a3b8;
    }
`;

if (typeof document !== 'undefined' && !document.getElementById('email-activity-card-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'email-activity-card-styles';
    styleElement.innerHTML = emailHtmlStyles;
    document.head.appendChild(styleElement);
}
