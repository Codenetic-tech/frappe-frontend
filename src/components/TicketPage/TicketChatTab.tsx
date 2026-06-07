import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTickets, TicketItem } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Send,
    User,
    Clock,
    RefreshCw,
    Paperclip,
    MoreVertical,
    Phone,
    Video,
    Search,
    Smile,
    Check,
    CheckCheck,
    AlertCircle,
    Info,
    Calendar,
    Users,
    FileText,
    ExternalLink,
    Eye,
    Download,
    X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const ATTACHMENT_BASE_URL = "https://live.gopocket.in";

interface TicketChatTabProps {
    ticket: TicketItem;
    onReplyAdded?: () => void;
}

const TicketChatTab: React.FC<TicketChatTabProps> = ({ ticket, onReplyAdded }) => {
    const { user } = useAuth();
    const { addTicketReply, fetchTicketHistory } = useTickets();
    const { orgTreeData } = useOrgTree();
    const [history, setHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [newReply, setNewReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [chatAttachment, setChatAttachment] = useState<File | null>(null);
    const [chatAttachmentError, setChatAttachmentError] = useState('');
    const chatFileInputRef = useRef<HTMLInputElement>(null);

    const isImageFile = (filename: string | null) => {
        if (!filename) return false;
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setChatAttachmentError('');

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setChatAttachmentError('File size exceeds 5 MB limit.');
                setChatAttachment(null);
                if (chatFileInputRef.current) chatFileInputRef.current.value = '';
                return;
            }
            setChatAttachment(file);
        }
    };

    const removeChatAttachment = () => {
        setChatAttachment(null);
        setChatAttachmentError('');
        if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    };

    const loadHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        const data = await fetchTicketHistory(ticket.ticket_id);
        if (data) {
            // Sort by time: oldest at top, newest at bottom
            const sorted = [...(data as any[])].sort((a, b) =>
                new Date(a.commented_time.replace(' ', 'T')).getTime() - new Date(b.commented_time.replace(' ', 'T')).getTime()
            );
            setHistory(sorted);
        }
        setIsHistoryLoading(false);
    }, [ticket.ticket_id, fetchTicketHistory]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Scroll to bottom when new history items are added
    useEffect(() => {
        if (scrollRef.current && !isHistoryLoading) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [history, isHistoryLoading]);

    // Auto-resize textarea height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [newReply]);

    const handleSubmit = async () => {
        if (!newReply.trim() || !user?.user_code) return;

        setIsSubmitting(true);
        try {
            const success = await addTicketReply(ticket.ticket_id, newReply.trim(), user.user_code, chatAttachment);
            if (success) {
                setNewReply('');
                removeChatAttachment();
                await loadHistory(); // Refresh from server
                if (onReplyAdded) onReplyAdded();
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to send reply.",
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const formatMessageTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            return format(new Date(dateStr.replace(' ', 'T')), 'hh:mm a');
        } catch (e) {
            return '';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'bg-blue-500';
            case 'IN PROGRESS': return 'bg-purple-500';
            case 'RESOLVED': return 'bg-emerald-500';
            default: return 'bg-slate-500';
        }
    };

    const getMessageContent = (item: any) => {
        if (item.reply) return item.reply;
        if (item.canned_response_details?.description) return item.canned_response_details.description;
        return '';
    };

    return (
        <div className="flex h-[calc(100vh-280px)] bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
            {/* 1. Left Sidebar: Ticket Info (Visible on LG screens) */}
            <div className="w-[280px] border-r border-slate-50 p-6 hidden lg:flex flex-col space-y-8 bg-slate-50/20">
                <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ticket Overview</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(ticket.status))} />
                                    <span className="text-sm font-bold text-slate-700">{ticket.status}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Priority</p>
                                <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                                    {ticket.priority}
                                </Badge>
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Requester</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-slate-100">
                                        <AvatarFallback className="bg-purple-50 text-purple-600 text-[8px] font-bold">
                                            {getInitials(ticket.requester_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-slate-700 truncate">{ticket.requester_name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Department</p>
                                <span className="text-xs font-semibold text-slate-500">{ticket.to_department}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto">
                    <div className="p-4 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Internal Tools</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[Paperclip, Search, Info].map((Icon, i) => (
                                <Button key={i} variant="ghost" className="h-10 w-full rounded-xl hover:bg-white hover:shadow-sm">
                                    <Icon className="w-4 h-4 text-slate-400" />
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Chat Area (70%) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Chat Header */}
                <div className="h-16 border-b border-slate-50 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-md">{ticket.subject}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {history.length} Messages • {ticket.status}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-slate-600">
                            <Search size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-slate-600">
                            <MoreVertical size={18} />
                        </Button>
                    </div>
                </div>

                {/* Message Window */}
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    <div className="space-y-6">
                        {/* System Message / Date Separator */}
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100"></div>
                            </div>
                            <span className="relative bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Communication History
                            </span>
                        </div>

                        {isHistoryLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Loading history...</p>
                            </div>
                        ) : history.length > 0 ? (
                            history.map((item, idx) => {
                                const isMe = item.commented_by === user?.user_code;
                                const content = getMessageContent(item);
                                return (
                                    <div key={idx} className={cn(
                                        "flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                        isMe ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <Avatar className="h-8 w-8 border border-white shadow-sm flex-shrink-0">
                                            <AvatarFallback className={cn(
                                                "text-[10px] font-bold",
                                                isMe ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {getInitials(item.commented_by)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className={cn(
                                            "max-w-[85%] space-y-1",
                                            isMe ? "items-end" : "items-start"
                                        )}>
                                            {!isMe && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <p className="text-[10px] font-bold text-slate-400 ml-1 cursor-help">
                                                            {orgTreeData?.find(n => n.name === item.commented_by)?.client_name || item.commented_by}
                                                        </p>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-slate-900 border-slate-800 text-white rounded-xl">
                                                        <div className="space-y-0.5">
                                                            <p className="text-[11px] font-bold">
                                                                {orgTreeData?.find(n => n.name === item.commented_by)?.client_name || item.commented_by}
                                                            </p>
                                                            {orgTreeData?.find(n => n.name === item.commented_by)?.mail_id && (
                                                                <p className="text-[10px] text-slate-300">
                                                                    {orgTreeData.find(n => n.name === item.commented_by)?.mail_id}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                            <div
                                                className={cn(
                                                    "p-4 rounded-3xl text-sm leading-relaxed shadow-sm html-content",
                                                    isMe
                                                        ? "bg-purple-600 text-white rounded-br-none"
                                                        : "bg-slate-50 text-slate-700 rounded-bl-none border border-slate-100"
                                                )}
                                                dangerouslySetInnerHTML={{ __html: content }}
                                            />

                                            {/* Attachment Preview Section */}
                                            {item.attachment && (
                                                <div
                                                    className={cn(
                                                        "mt-2 p-3 rounded-2xl border flex items-center gap-3 backdrop-blur-sm group cursor-pointer transition-all shadow-sm max-w-sm",
                                                        isMe
                                                            ? "bg-purple-700/30 border-purple-400/50 hover:bg-purple-700/50"
                                                            : "bg-white/80 border-slate-100 hover:bg-white"
                                                    )}
                                                    onClick={() => {
                                                        setSelectedAttachment(item.attachment);
                                                        setIsPreviewOpen(true);
                                                    }}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                        isMe ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"
                                                    )}>
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-[10px] font-bold uppercase tracking-widest leading-none mb-1",
                                                            isMe ? "text-purple-200" : "text-slate-400"
                                                        )}>
                                                            Attached File
                                                        </p>
                                                        <p className={cn(
                                                            "text-xs font-bold truncate",
                                                            isMe ? "text-white" : "text-slate-700"
                                                        )}>
                                                            {item.attachment.split('/').pop()}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2">
                                                        <Eye size={16} className={isMe ? "text-white" : "text-purple-600"} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className={cn("flex items-center gap-1.5 px-1", isMe ? "justify-end" : "justify-start")}>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tabular-nums leading-none">
                                                    {formatMessageTime(item.commented_time)}
                                                </span>
                                                {isMe && <CheckCheck size={12} className="text-purple-400" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                                    <MessageSquare size={32} />
                                </div>
                                <p className="text-sm font-semibold italic leading-none">No messages yet</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Redesigned Bottom Input (70% column bottom) */}
                <div className="p-4 bg-white shrink-0 mt-auto flex flex-col gap-2">
                    {/* Attachment preview above input */}
                    {chatAttachment && (
                        <div className="max-w-3xl mx-auto w-full">
                            <div className="inline-flex items-center justify-between p-2 pr-3 bg-purple-50 border border-purple-100 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center border border-purple-100/50">
                                        <FileText className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div className="flex flex-col min-w-0 mr-4">
                                        <span className="text-xs font-semibold text-purple-900 truncate max-w-[200px]">
                                            {chatAttachment.name}
                                        </span>
                                        <span className="text-[9px] text-purple-500 font-medium tracking-wide">
                                            {(chatAttachment.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={removeChatAttachment}
                                    className="p-1 hover:bg-purple-200 text-purple-400 hover:text-purple-600 rounded-lg transition-colors group"
                                    title="Remove attachment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    {chatAttachmentError && (
                        <div className="max-w-3xl mx-auto w-full">
                            <p className="text-[10px] font-bold text-red-500 flex items-center gap-1.5 animate-in slide-in-from-top-1 bg-red-50 w-fit px-2.5 py-1 rounded-md">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {chatAttachmentError}
                            </p>
                        </div>
                    )}

                    <div className="max-w-3xl mx-auto w-full flex items-end gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-100 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:bg-white transition-all duration-300">
                        <input
                            type="file"
                            ref={chatFileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            id="chat-reply-attachment"
                        />
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => chatFileInputRef.current?.click()}
                            className={cn(
                                "h-10 w-10 rounded-xl transition-colors mb-0.5",
                                chatAttachment ? "text-purple-600 bg-purple-50" : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                            )}>
                            <Paperclip size={20} />
                        </Button>
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            placeholder="Type a message..."
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            className="flex-1 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-sm py-2.5 placeholder-slate-400 text-slate-700 font-medium resize-none min-h-[44px] max-h-40 overflow-y-auto custom-scrollbar"
                            disabled={isSubmitting}
                        />
                        <div className="flex items-center gap-1 mb-0.5">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-purple-600 hidden sm:flex">
                                <Smile size={20} />
                            </Button>
                            <Button
                                size="icon"
                                onClick={handleSubmit}
                                disabled={!newReply.trim() || isSubmitting}
                                className={cn(
                                    "h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition-all active:scale-95 flex-shrink-0",
                                    (!newReply.trim() || isSubmitting) && "opacity-50 grayscale"
                                )}
                            >
                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send size={18} />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attachment Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="sm:max-w-[90vw] h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white flex flex-col">
                    <DialogHeader className="p-4 border-b border-slate-50 flex flex-row items-center justify-between shrink-0 h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-bold text-slate-800 leading-tight">
                                    {selectedAttachment?.split('/').pop()}
                                </DialogTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Attachment Preview</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mr-8">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 rounded-xl text-slate-500 hover:text-purple-600 font-bold text-[10px] uppercase gap-2 hover:bg-purple-50 transition-colors"
                                onClick={() => window.open(`${ATTACHMENT_BASE_URL}${selectedAttachment}`, '_blank')}
                            >
                                <ExternalLink size={14} />
                                Open Directly
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 w-full bg-slate-50/50 relative overflow-hidden flex flex-col items-center justify-center p-4">
                        {selectedAttachment ? (
                            isImageFile(selectedAttachment) ? (
                                <div className="w-full h-full flex items-center justify-center p-4">
                                    <img
                                        src={`${ATTACHMENT_BASE_URL}${selectedAttachment}`}
                                        alt="Attachment Preview"
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-500"
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto p-12 bg-white rounded-[32px] shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                                        <FileText size={48} />
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-bold text-slate-800">Preview Restricted</h3>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                            The server policy for this file type ({selectedAttachment.split('.').pop()?.toUpperCase()}) prevents in-app viewing.
                                            Please open it in a new window for secure access.
                                        </p>
                                    </div>
                                    <Button
                                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-14 px-10 font-bold flex items-center gap-2 shadow-lg shadow-purple-100 group mt-2"
                                        onClick={() => window.open(`${ATTACHMENT_BASE_URL}${selectedAttachment}`, '_blank')}
                                    >
                                        <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
                                        Open Original File
                                    </Button>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-300">
                                <RefreshCw className="w-12 h-12 animate-spin" />
                                <p className="font-bold text-xs uppercase tracking-widest">Loading Preview...</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketChatTab;

/**
 * Custom CSS for HTML content in chat bubbles
 */
const chatHtmlStyles = `
    .html-content p {
        margin: 0;
        line-height: inherit;
    }
    .html-content ul, .html-content ol {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
    }
    .html-content li {
        margin-bottom: 0.25rem;
    }
    .html-content strong {
        font-weight: 700;
        color: inherit;
    }
    .html-content br {
        content: "";
        display: block;
        margin-top: 0.5rem;
    }
`;

if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = chatHtmlStyles;
    document.head.appendChild(styleElement);
}

const MessageSquare = ({ size, className }: { size: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
