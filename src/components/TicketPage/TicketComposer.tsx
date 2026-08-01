import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Mail, MessageSquare, Send, RefreshCw, MoreHorizontal, CornerDownLeft, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapUnderline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { EditorToolbar } from './TiptapEditorToolbar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { formatFullDateTime } from './activityUtils';
import type { TicketActivitiesResponse } from '@/hooks/useTicketActivities';
import { useAuth } from '@/contexts/AuthContext';

interface TicketComposerProps {
    ticketName: string;
    defaultTo?: string;
    ticket?: any;
    activities?: TicketActivitiesResponse | null;
    onActivityAdded: () => void;
}

type ComposerMode = 'reply' | 'comment';

interface RecipientChipInputProps {
    label: string;
    fieldKey: 'to' | 'cc' | 'bcc';
    emails: string[];
    onEmailsChange: (emails: string[]) => void;
    onDropEmail: (email: string, sourceField: 'to' | 'cc' | 'bcc', targetField: 'to' | 'cc' | 'bcc') => void;
    disabled?: boolean;
}

const RecipientChipInput: React.FC<RecipientChipInputProps> = ({
    label,
    fieldKey,
    emails,
    onEmailsChange,
    onDropEmail,
    disabled,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    const addEmail = (raw: string) => {
        const parts = raw
            .split(/[,;\s]+/)
            .map((e) => e.trim())
            .filter(Boolean);
        if (parts.length === 0) return;
        const newEmails = Array.from(new Set([...emails, ...parts]));
        onEmailsChange(newEmails);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ') {
            e.preventDefault();
            addEmail(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
            onEmailsChange(emails.slice(0, -1));
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            addEmail(inputValue);
        }
    };

    const handleRemove = (index: number) => {
        onEmailsChange(emails.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const { email, sourceField } = JSON.parse(dataStr);
            if (email && sourceField) {
                onDropEmail(email, sourceField, fieldKey);
            }
        } catch {
            // Ignore malformed data
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "flex flex-wrap items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-xl border bg-white dark:bg-slate-900 text-xs transition-all",
                isDragOver
                    ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-50/50 dark:bg-purple-950/40 border-dashed"
                    : "border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-slate-600",
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none shrink-0 pr-0.5">
                {label}:
            </span>

            {emails.map((email, idx) => (
                <span
                    key={`${email}-${idx}`}
                    draggable={!disabled}
                    onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ email, sourceField: fieldKey }));
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-medium text-xs cursor-grab active:cursor-grabbing hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all select-none shadow-sm"
                    title="Drag to move between To / Cc / Bcc"
                >
                    <span className="truncate max-w-[200px]">{email}</span>
                    {!disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(idx);
                            }}
                            className="hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-500 hover:text-purple-800 dark:hover:text-purple-100 rounded p-0.5 transition-colors"
                        >
                            <X size={11} />
                        </button>
                    )}
                </span>
            ))}

            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={disabled}
                placeholder={emails.length === 0 ? `Add ${label}...` : ''}
                className="flex-1 min-w-[90px] bg-transparent outline-none border-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 py-0.5"
            />
        </div>
    );
};

const editorExtensions = (placeholder: string) => [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Placeholder.configure({ placeholder }),
    TiptapUnderline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({ openOnClick: false, autolink: true }),
];

const editorAttributes = {
    class: 'prose prose-sm max-w-none focus:outline-none min-h-[90px] px-4 py-3 text-slate-800 dark:text-slate-200 leading-relaxed',
};

const getPreviousMailContent = (ticket?: any, activities?: TicketActivitiesResponse | null): string => {
    if (!ticket && !activities) return '';

    let rawContent = '';
    let senderName = '';
    let dateStr = '';

    const comms = activities?.communications;
    if (comms && comms.length > 0) {
        const sorted = [...comms].sort((a, b) => {
            const ta = new Date((a.communication_date || a.creation).replace(' ', 'T')).getTime();
            const tb = new Date((b.communication_date || b.creation).replace(' ', 'T')).getTime();
            return ta - tb;
        });
        const lastComm = sorted[sorted.length - 1];
        rawContent = lastComm.content || '';
        senderName = lastComm.user?.name || lastComm.user?.email || lastComm.sender || 'Sender';
        dateStr = lastComm.communication_date || lastComm.creation;
    } else if (ticket?.description) {
        rawContent = ticket.description;
        senderName = ticket.raised_by || 'Customer';
        dateStr = ticket.creation;
    }

    if (!rawContent) return '';

    const formattedDate = formatFullDateTime(dateStr);

    return `<div class="gmail_quote"><div dir="ltr" class="gmail_attr">On ${formattedDate}, ${senderName} wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex">${rawContent}</blockquote></div>`;
};

const TicketComposer: React.FC<TicketComposerProps> = ({ ticketName, defaultTo, ticket, activities, onActivityAdded }) => {
    const { frappeUser } = useAuth();
    const [mode, setMode] = useState<ComposerMode>('reply');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [bccEmails, setBccEmails] = useState<string[]>([]);
    const [showQuotedContent, setShowQuotedContent] = useState(false);
    const [quotedInserted, setQuotedInserted] = useState(false);

    const toEditedRef = useRef(false);
    const ccEditedRef = useRef(false);
    const { call: runDocMethod } = useFrappePostCall('run_doc_method');
    const { call: getTicketAssignees } = useFrappePostCall<{ message: string }>(
        'helpdesk.helpdesk.doctype.hd_ticket.api.get_ticket_assignees'
    );

    const previousMailContent = useMemo(() => {
        return getPreviousMailContent(ticket, activities);
    }, [ticket, activities]);

    useEffect(() => {
        setShowQuotedContent(false);
        setQuotedInserted(false);
    }, [previousMailContent]);

    // `defaultTo` can change after mount — keep following it until the user
    // actually edits the To field themselves.
    useEffect(() => {
        if (!toEditedRef.current && defaultTo) {
            const parsed = defaultTo
                .split(/[,;\s]+/)
                .map((e) => e.trim())
                .filter(Boolean);
            setToEmails(parsed);
        }
    }, [defaultTo]);

    // Cc defaults to everyone the ticket is currently assigned to.
    useEffect(() => {
        if (!ticketName) return;
        getTicketAssignees({ ticket: ticketName })
            .then((res) => {
                if (ccEditedRef.current) return;
                try {
                    const parsed = res?.message ? JSON.parse(res.message) : [];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCcEmails(parsed.filter(Boolean));
                    }
                } catch {
                    // ignore malformed response — Cc just stays empty
                }
            })
            .catch(() => {});
    }, [ticketName, getTicketAssignees]);

    const handleDropEmail = (
        email: string,
        sourceField: 'to' | 'cc' | 'bcc',
        targetField: 'to' | 'cc' | 'bcc'
    ) => {
        if (sourceField === targetField) return;

        if (sourceField === 'to') setToEmails((prev) => prev.filter((e) => e !== email));
        if (sourceField === 'cc') setCcEmails((prev) => prev.filter((e) => e !== email));
        if (sourceField === 'bcc') setBccEmails((prev) => prev.filter((e) => e !== email));

        if (targetField === 'to') {
            toEditedRef.current = true;
            setToEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
        }
        if (targetField === 'cc') {
            ccEditedRef.current = true;
            setCcEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
        }
        if (targetField === 'bcc') {
            setBccEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
        }
    };

    const commentEditor = useEditor({
        extensions: editorExtensions('Add an internal comment...'),
        content: '',
        editorProps: { attributes: editorAttributes },
        shouldRerenderOnTransaction: true,
    });

    const replyEditor = useEditor({
        extensions: editorExtensions('Write your reply...'),
        content: '',
        editorProps: { attributes: editorAttributes },
        shouldRerenderOnTransaction: true,
    });

    useEffect(() => {
        commentEditor?.setEditable(!isSubmitting);
        replyEditor?.setEditable(!isSubmitting);
    }, [isSubmitting, commentEditor, replyEditor]);

    const handleInsertQuote = () => {
        if (!replyEditor || !previousMailContent) return;
        replyEditor.commands.insertContent('<br><br>' + previousMailContent);
        setQuotedInserted(true);
        setShowQuotedContent(false);
    };

    const handleSubmitComment = async () => {
        if (!commentEditor || commentEditor.isEmpty) return;
        setIsSubmitting(true);
        try {
            await runDocMethod({
                dt: 'HD Ticket',
                dn: ticketName,
                method: 'new_comment',
                args: {
                    content: commentEditor.getHTML(),
                    attachments: [],
                },
            });
            commentEditor.commands.clearContent();
            onActivityAdded();
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to add comment.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitReply = async () => {
        if (!replyEditor || replyEditor.isEmpty) return;
        setIsSubmitting(true);
        try {
            let finalMessage = replyEditor.getHTML();
            if (previousMailContent && !quotedInserted && !finalMessage.includes('gmail_quote')) {
                finalMessage = `${finalMessage}<br><br>${previousMailContent}`;
            }

            const toStr = toEmails.join(', ');
            const ccStr = ccEmails.join(', ');
            const bccStr = bccEmails.join(', ');

            const isAgent = frappeUser?.roles?.some(
                (r: any) => (typeof r === 'string' ? r : r.role)?.toLowerCase().includes('agent')
            );

            let sentSuccessfully = false;

            if (isAgent === false) {
                await runDocMethod({
                    dt: 'HD Ticket',
                    dn: ticketName,
                    method: 'create_communication_via_contact',
                    args: {
                        message: finalMessage,
                        attachments: [],
                    },
                });
                sentSuccessfully = true;
            } else {
                try {
                    await runDocMethod({
                        dt: 'HD Ticket',
                        dn: ticketName,
                        method: 'reply_via_agent',
                        args: {
                            attachments: [],
                            to: toStr.trim(),
                            cc: ccStr.trim(),
                            bcc: bccStr.trim(),
                            message: finalMessage,
                        },
                    });
                    sentSuccessfully = true;
                } catch (agentErr: any) {
                    const errStr = typeof agentErr === 'string' ? agentErr : JSON.stringify(agentErr || {});
                    if (
                        errStr.includes('not permitted to reply as an agent') ||
                        errStr.includes('PermissionError') ||
                        agentErr?.exc_type === 'PermissionError' ||
                        agentErr?.exception?.includes('PermissionError')
                    ) {
                        await runDocMethod({
                            dt: 'HD Ticket',
                            dn: ticketName,
                            method: 'create_communication_via_contact',
                            args: {
                                message: finalMessage,
                                attachments: [],
                            },
                        });
                        sentSuccessfully = true;
                    } else {
                        throw agentErr;
                    }
                }
            }

            if (sentSuccessfully) {
                setShowQuotedContent(false);
                setQuotedInserted(false);
                replyEditor.commands.clearContent();
                onActivityAdded();
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err?.message || 'Failed to send reply.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs: { id: ComposerMode; label: string; icon: React.ComponentType<any> }[] = [
        { id: 'reply', label: 'Reply', icon: Mail },
        { id: 'comment', label: 'Comment', icon: MessageSquare },
    ];

    const renderEditorPane = (editor: Editor | null, hidden: boolean, isReplyPane?: boolean) => (
        <div
            className={cn(
                "border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 transition-all focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 flex flex-col",
                hidden && "hidden"
            )}
        >
            <EditorContent editor={editor} className="flex-1" />

            {isReplyPane && previousMailContent && !quotedInserted && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {!showQuotedContent ? (
                        <button
                            type="button"
                            onClick={() => setShowQuotedContent(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                            title="Show quoted email content"
                        >
                            <MoreHorizontal size={15} />
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Show quoted mail</span>
                        </button>
                    ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Quoted Previous Mail
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleInsertQuote}
                                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1"
                                    >
                                        <CornerDownLeft size={12} />
                                        Insert in editor
                                    </button>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuotedContent(false)}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        Hide
                                    </button>
                                </div>
                            </div>
                            <div
                                className="email-html-content text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: previousMailContent }}
                            />
                        </div>
                    )}
                </div>
            )}

            <EditorToolbar editor={editor} className="border-t" />
        </div>
    );

    const replyDisabled = !replyEditor || replyEditor.isEmpty || isSubmitting;
    const commentDisabled = !commentEditor || commentEditor.isEmpty || isSubmitting;

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
                <div className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setMode(tab.id);
                                    if (isMinimized) setIsMinimized(false);
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors",
                                    mode === tab.id
                                        ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40"
                                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                )}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={mode === 'comment' ? handleSubmitComment : handleSubmitReply}
                        disabled={mode === 'comment' ? commentDisabled : replyDisabled}
                        className={cn(
                            "h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition-all active:scale-95 text-xs font-bold uppercase tracking-wide shrink-0",
                            (mode === 'comment' ? commentDisabled : replyDisabled) && "opacity-50 grayscale"
                        )}
                    >
                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
                        {mode === 'comment' ? 'Comment' : 'Send'}
                    </Button>

                    <button
                        type="button"
                        onClick={() => setIsMinimized((prev) => !prev)}
                        className="h-8 px-2.5 flex items-center justify-center gap-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold shrink-0"
                        title={isMinimized ? "Expand composer" : "Minimize composer"}
                    >
                        <span className="hidden sm:inline text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                            {isMinimized ? "Expand" : "Minimize"}
                        </span>
                        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="p-4 pt-2 space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                    {mode === 'reply' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <RecipientChipInput
                                label="To"
                                fieldKey="to"
                                emails={toEmails}
                                onEmailsChange={(newEmails) => {
                                    toEditedRef.current = true;
                                    setToEmails(newEmails);
                                }}
                                onDropEmail={handleDropEmail}
                                disabled={isSubmitting}
                            />
                            <RecipientChipInput
                                label="Cc"
                                fieldKey="cc"
                                emails={ccEmails}
                                onEmailsChange={(newEmails) => {
                                    ccEditedRef.current = true;
                                    setCcEmails(newEmails);
                                }}
                                onDropEmail={handleDropEmail}
                                disabled={isSubmitting}
                            />
                            <RecipientChipInput
                                label="Bcc"
                                fieldKey="bcc"
                                emails={bccEmails}
                                onEmailsChange={(newEmails) => setBccEmails(newEmails)}
                                onDropEmail={handleDropEmail}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {renderEditorPane(commentEditor, mode !== 'comment')}
                    {renderEditorPane(replyEditor, mode !== 'reply', true)}
                </div>
            )}
        </div>
    );
};

export default TicketComposer;
