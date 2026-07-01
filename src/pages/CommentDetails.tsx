import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappeUpdateDoc, useFrappeDocumentEventListener } from 'frappe-react-sdk';
import {
    ChevronRight, Home, ChevronLeft, User, FileText,
    Clock, AlertCircle, RefreshCw, Loader2,
    Calendar, Code, Layers, CalendarCheck, MessageSquare, ShieldCheck, Mail, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';

interface Tab {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
}

const CommentDetails: React.FC = () => {
    const { commentId } = useParams<{ commentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('content');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Form editing state
    const [formCommentType, setFormCommentType] = useState('Comment');
    const [formCommentEmail, setFormCommentEmail] = useState('');
    const [formCommentBy, setFormCommentBy] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formPublished, setFormPublished] = useState(false);
    const [formSeen, setFormSeen] = useState(false);
    const [formRefDocType, setFormRefDocType] = useState('');
    const [formRefName, setFormRefName] = useState('');

    const tabs: Tab[] = [
        { id: 'content', label: 'Comment Content', icon: MessageSquare },
        { id: 'status_ref', label: 'Status & Reference', icon: ShieldCheck }
    ];

    // Retrieve comments list from sessionStorage for navigation
    const allComments = useMemo(() => {
        const stored = sessionStorage.getItem('commentsData');
        return stored ? JSON.parse(stored) : [];
    }, [commentId]);

    // Find current index
    const currentCommentIndex = useMemo(() => {
        return allComments.findIndex((c: any) => c.name === commentId);
    }, [allComments, commentId]);

    // Document details query
    const {
        data: docDetails,
        isLoading,
        error: docError,
        mutate: refetchDoc
    } = useFrappeGetDoc<any>('Comment', commentId || undefined);

    // Update query hook
    const { updateDoc, loading: isSaving } = useFrappeUpdateDoc();

    // Populate form fields on data load
    useEffect(() => {
        if (docDetails) {
            setFormCommentType(docDetails.comment_type || 'Comment');
            setFormCommentEmail(docDetails.comment_email || '');
            setFormCommentBy(docDetails.comment_by || '');
            setFormSubject(docDetails.subject || '');
            setFormContent(docDetails.content || '');
            setFormPublished(!!docDetails.published);
            setFormSeen(!!docDetails.seen);
            setFormRefDocType(docDetails.reference_doctype || '');
            setFormRefName(docDetails.reference_name || '');
        }
    }, [docDetails]);

    const goToPreviousComment = () => {
        if (currentCommentIndex > 0) {
            navigate(`/comments/${allComments[currentCommentIndex - 1].name}`);
        }
    };

    const goToNextComment = () => {
        if (currentCommentIndex < allComments.length - 1) {
            navigate(`/comments/${allComments[currentCommentIndex + 1].name}`);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchDoc();
            toast({
                title: 'Refreshed',
                description: 'Comment details have been updated.',
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentId) return;

        try {
            const updatePayload: any = {
                comment_type: formCommentType,
                comment_email: formCommentEmail,
                comment_by: formCommentBy,
                subject: formSubject,
                content: formContent,
                published: formPublished ? 1 : 0,
                seen: formSeen ? 1 : 0,
                reference_doctype: formRefDocType || null,
                reference_name: formRefName || null,
            };

            await updateDoc('Comment', commentId, updatePayload);
            toast({
                title: 'Comment Updated',
                description: `Successfully updated comment details.`,
            });
            refetchDoc();
        } catch (err: any) {
            toast({
                title: 'Update Failed',
                description: err.message || 'An error occurred while saving.',
                variant: 'destructive',
            });
        }
    };

    // Real-time listener for document updates
    const handleDocUpdate = React.useCallback((eventData: any) => {
        console.log('Realtime Comment details event:', eventData);
        refetchDoc();
        toast({
            title: "Comment Updated (Realtime)",
            description: `This comment was modified by another process. Details reloaded.`,
        });
    }, [refetchDoc]);

    useFrappeDocumentEventListener('Comment', commentId || '', handleDocUpdate);

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-850 last:border-0 group">
            <div className="flex items-center gap-3">
                {Icon && <Icon size={16} className="text-slate-400 dark:text-slate-550 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />}
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value || '-'}</span>
        </div>
    );

    const commentTypes = [
        'Comment', 'Like', 'Info', 'Label', 'Workflow', 'Created', 'Submitted',
        'Cancelled', 'Updated', 'Deleted', 'Assigned', 'Assignment Completed',
        'Attachment', 'Attachment Removed', 'Shared', 'Unshared', 'Bot', 'Relinked', 'Edit'
    ];

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                <span className="text-sm">Fetching comment details...</span>
            </div>
        );
    }

    if (docError || !docDetails) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Comment Not Found</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">The requested comment details could not be loaded.</p>
                <Button onClick={() => navigate('/comments')} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
                    Back to Comments
                </Button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-stone-200/50 dark:bg-transparent">
            <form onSubmit={handleSave} className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Breadcrumbs & Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">
                        <button
                            type="button"
                            onClick={() => navigate('/comments')}
                            className="hover:text-purple-600 dark:hover:text-purple-405 transition-colors flex items-center gap-1.5 focus:outline-none bg-transparent"
                        >
                            <Home size={16} />
                            Backoffice
                        </button>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
                        <button
                            type="button"
                            onClick={() => navigate('/comments')}
                            className="hover:text-purple-600 dark:hover:text-purple-405 transition-colors focus:outline-none bg-transparent"
                        >
                            Comments
                        </button>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{docDetails.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                            <div className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                docDetails.seen ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" : "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30"
                            )}>
                                {docDetails.seen ? 'Seen' : 'Unseen'}
                            </div>
                            {docDetails.published === 1 && (
                                <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30">
                                    Published
                                </div>
                            )}
                        </div>
                    </div>

                    {allComments.length > 0 && currentCommentIndex !== -1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={goToPreviousComment}
                                disabled={currentCommentIndex <= 0}
                                className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <div className="px-3 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                {currentCommentIndex + 1} / {allComments.length}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={goToNextComment}
                                disabled={currentCommentIndex >= allComments.length - 1}
                                className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0 flex items-center justify-between">
                    <div className="flex overflow-x-auto no-scrollbar flex-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap relative min-w-[180px] justify-center bg-transparent",
                                        activeTab === tab.id
                                            ? 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    )}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center px-4 border-l border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all bg-transparent"
                            title="Refresh details"
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={18} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Tab Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
                    <ScrollArea className="flex-1 w-full">
                        <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Tab 1: Comment Content */}
                            <div className={cn("max-w-4xl mx-auto space-y-8", activeTab !== 'content' && "hidden")}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left column: Editable Fields */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Author & Subject</h3>
                                            <div className="bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formCommentType" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Comment Type
                                                    </Label>
                                                    <Select value={formCommentType} onValueChange={setFormCommentType}>
                                                        <SelectTrigger id="formCommentType" className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500">
                                                            <SelectValue placeholder="Select type..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 shadow-xl max-h-[250px]">
                                                            {commentTypes.map(type => (
                                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formCommentBy" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Comment By (Author Name)
                                                    </Label>
                                                    <Input
                                                        id="formCommentBy"
                                                        value={formCommentBy}
                                                        onChange={(e) => setFormCommentBy(e.target.value)}
                                                        placeholder="Enter Author Name"
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formCommentEmail" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Comment Email
                                                    </Label>
                                                    <Input
                                                        id="formCommentEmail"
                                                        type="email"
                                                        value={formCommentEmail}
                                                        onChange={(e) => setFormCommentEmail(e.target.value)}
                                                        placeholder="Enter Email"
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formSubject" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Subject
                                                    </Label>
                                                    <Input
                                                        id="formSubject"
                                                        value={formSubject}
                                                        onChange={(e) => setFormSubject(e.target.value)}
                                                        placeholder="Enter Subject"
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column: Content Textarea */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Body Content</h3>
                                            <div className="bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formContent" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        HTML / Text Content
                                                    </Label>
                                                    <Textarea
                                                        id="formContent"
                                                        value={formContent}
                                                        onChange={(e) => setFormContent(e.target.value)}
                                                        placeholder="Enter HTML or Plain Text Content..."
                                                        rows={8}
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500 resize-y min-h-[160px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tab 2: Reference & Status */}
                            <div className={cn("max-w-4xl mx-auto space-y-8", activeTab !== 'status_ref' && "hidden")}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left column: References & Toggles */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Reference document & status</h3>
                                            <div className="bg-slate-50/30 dark:bg-slate-950/10 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 space-y-5">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formRefDocType" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Reference Document Type
                                                    </Label>
                                                    <Input
                                                        id="formRefDocType"
                                                        value={formRefDocType}
                                                        onChange={(e) => setFormRefDocType(e.target.value)}
                                                        placeholder="e.g. DocType"
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="formRefName" className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                                                        Reference Name
                                                    </Label>
                                                    <Input
                                                        id="formRefName"
                                                        value={formRefName}
                                                        onChange={(e) => setFormRefName(e.target.value)}
                                                        placeholder="Enter document name"
                                                        className="border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus-visible:ring-purple-500"
                                                    />
                                                </div>

                                                <div className="flex items-center gap-6 pt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="formPublished"
                                                            checked={formPublished}
                                                            onCheckedChange={(checked) => setFormPublished(!!checked)}
                                                            className="rounded border-slate-300 dark:border-slate-700 text-purple-605 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-offset-slate-900"
                                                        />
                                                        <Label htmlFor="formPublished" className="text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer select-none">
                                                            Published
                                                        </Label>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id="formSeen"
                                                            checked={formSeen}
                                                            onCheckedChange={(checked) => setFormSeen(!!checked)}
                                                            className="rounded border-slate-300 dark:border-slate-700 text-purple-605 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-offset-slate-900"
                                                        />
                                                        <Label htmlFor="formSeen" className="text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer select-none">
                                                            Seen
                                                        </Label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right column: Readonly Metadata */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Metadata</h3>
                                            <div className="bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/60 space-y-1">
                                                <InfoRow label="Document ID" value={docDetails.name} icon={Code} />
                                                <InfoRow label="Reference Owner" value={docDetails.reference_owner} icon={User} />
                                                <InfoRow label="IP Address" value={docDetails.ip_address} icon={ShieldCheck} />
                                                <InfoRow label="Owner / Creator" value={docDetails.owner} icon={User} />
                                                <InfoRow label="Created On" value={formatDateTime(docDetails.creation)} icon={Calendar} />
                                                <InfoRow label="Modified On" value={formatDateTime(docDetails.modified)} icon={Clock} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>

                    {/* Sticky footer for saving changes */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/comments')}
                            className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-100 text-slate-700 dark:text-slate-205 rounded-xl transition-colors px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md font-bold px-6"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CommentDetails;
