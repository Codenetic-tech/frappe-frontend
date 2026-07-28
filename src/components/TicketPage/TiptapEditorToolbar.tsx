import React from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Undo2,
    Redo2,
    Quote,
    Minus,
    Link2,
    Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ToolbarButton: React.FC<{
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-1.5 rounded-lg transition-all duration-150",
            active
                ? "bg-purple-100 text-purple-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
            disabled && "opacity-30 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);

export const EditorToolbar: React.FC<{ editor: any; className?: string }> = ({ editor, className }) => {
    if (!editor) return null;

    return (
        <div className={cn("flex items-center gap-0.5 flex-wrap px-3 py-2 border-slate-100 bg-slate-50/80", className ?? "border-b")}>
            {/* Text Style */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Bold"
            >
                <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Italic"
            >
                <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
                title="Underline"
            >
                <UnderlineIcon className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                active={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading"
            >
                <Type className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                title="Ordered List"
            >
                <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                active={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                active={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                active={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Divider */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <Minus className="w-3.5 h-3.5" />
            </ToolbarButton>

            {/* Link */}
            <ToolbarButton
                onClick={() => {
                    const previousUrl = editor.getAttributes('link').href;
                    const url = window.prompt('Enter URL:', previousUrl || 'https://');
                    if (url === null) return;
                    if (url === '') {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                        return;
                    }
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                }}
                active={editor.isActive('link')}
                title="Link"
            >
                <Link2 className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="flex-1" />

            {/* Undo / Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
            >
                <Undo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
            >
                <Redo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
        </div>
    );
};

export default EditorToolbar;
