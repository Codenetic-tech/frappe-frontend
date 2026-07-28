import React, { useState, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Mail, MessageSquare, Send, RefreshCw, Clock } from 'lucide-react';
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

interface TicketComposerProps {
    ticketName: string;
    onCommentAdded: () => void;
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

const TicketComposer: React.FC<TicketComposerProps> = ({ ticketName, onCommentAdded }) => {
    const [mode, setMode] = useState<ComposerMode>('comment');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { call: runDocMethod } = useFrappePostCall('run_doc_method');

    const commentEditor = useEditor({
        extensions: editorExtensions('Add an internal comment...'),
        content: '',
        editorProps: { attributes: editorAttributes },
    });

    const replyEditor = useEditor({
        extensions: editorExtensions('Write your reply...'),
        content: '',
        editorProps: { attributes: editorAttributes },
    });

    useEffect(() => {
        commentEditor?.setEditable(!isSubmitting);
    }, [isSubmitting, commentEditor]);

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
            onCommentAdded();
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

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-1 px-4 pt-2">
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

            <div className="p-4 space-y-2">
                {renderEditorPane(commentEditor, mode !== 'comment')}
                {renderEditorPane(replyEditor, mode !== 'reply')}

                <div className="flex items-center justify-between gap-3">
                    {mode === 'reply' ? (
                        <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Sending email replies is coming soon — use Comment for an internal note.
                        </p>
                    ) : <span />}

                    <Button
                        onClick={handleSubmitComment}
                        disabled={mode === 'reply' || !commentEditor || commentEditor.isEmpty || isSubmitting}
                        className={cn(
                            "h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 transition-all active:scale-95 text-xs font-bold uppercase tracking-wide shrink-0",
                            (mode === 'reply' || !commentEditor || commentEditor.isEmpty || isSubmitting) && "opacity-50 grayscale"
                        )}
                    >
                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
                        {mode === 'comment' ? 'Comment' : 'Send'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TicketComposer;
