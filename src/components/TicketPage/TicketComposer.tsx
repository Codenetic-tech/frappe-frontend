import React, { useState, useEffect, useRef } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Mail, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapUnderline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { EditorToolbar } from './TiptapEditorToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface TicketComposerProps {
    ticketName: string;
    defaultTo?: string;
    onActivityAdded: () => void;
}

type ComposerMode = 'reply' | 'comment';

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

const TicketComposer: React.FC<TicketComposerProps> = ({ ticketName, defaultTo, onActivityAdded }) => {
    const [mode, setMode] = useState<ComposerMode>('reply');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [to, setTo] = useState(defaultTo || '');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const toEditedRef = useRef(false);
    const { call: runDocMethod } = useFrappePostCall('run_doc_method');

    // `defaultTo` can change after mount (it's derived from the activities
    // API, which resolves after the ticket itself) — keep following it until
    // the user actually edits the To field themselves.
    useEffect(() => {
        if (!toEditedRef.current) {
            setTo(defaultTo || '');
        }
    }, [defaultTo]);

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
        if (!replyEditor || replyEditor.isEmpty || !to.trim()) return;
        setIsSubmitting(true);
        try {
            await runDocMethod({
                dt: 'HD Ticket',
                dn: ticketName,
                method: 'reply_via_agent',
                args: {
                    attachments: [],
                    to: to.trim(),
                    cc: cc.trim(),
                    bcc: bcc.trim(),
                    message: replyEditor.getHTML(),
                },
            });
            replyEditor.commands.clearContent();
            onActivityAdded();
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to send reply.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs: { id: ComposerMode; label: string; icon: React.ComponentType<any> }[] = [
        { id: 'reply', label: 'Reply', icon: Mail },
        { id: 'comment', label: 'Comment', icon: MessageSquare },
    ];

    const renderEditorPane = (editor: Editor | null, hidden: boolean) => (
        <div
            className={cn(
                "border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 transition-all focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300",
                hidden && "hidden"
            )}
        >
            <EditorContent editor={editor} />
            <EditorToolbar editor={editor} className="border-t" />
        </div>
    );

    const replyDisabled = !replyEditor || replyEditor.isEmpty || !to.trim() || isSubmitting;
    const commentDisabled = !commentEditor || commentEditor.isEmpty || isSubmitting;

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-2 px-4 pt-2">
                <div className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setMode(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors",
                                    mode === tab.id
                                        ? "text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-450"
                                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border-b-2 border-transparent"
                                )}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

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
            </div>

            <div className="p-4 space-y-2">
                {mode === 'reply' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input
                            value={to}
                            onChange={(e) => {
                                toEditedRef.current = true;
                                setTo(e.target.value);
                            }}
                            placeholder="To"
                            className="h-8 text-xs rounded-lg"
                            disabled={isSubmitting}
                        />
                        <Input
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            placeholder="Cc"
                            className="h-8 text-xs rounded-lg"
                            disabled={isSubmitting}
                        />
                        <Input
                            value={bcc}
                            onChange={(e) => setBcc(e.target.value)}
                            placeholder="Bcc"
                            className="h-8 text-xs rounded-lg"
                            disabled={isSubmitting}
                        />
                    </div>
                )}

                {renderEditorPane(commentEditor, mode !== 'comment')}
                {renderEditorPane(replyEditor, mode !== 'reply')}
            </div>
        </div>
    );
};

export default TicketComposer;
