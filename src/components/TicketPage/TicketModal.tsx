import React, { useState, useRef, useMemo, useCallback } from 'react';
import { format, setHours, setMinutes } from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    Ticket,
    MessageSquare,
    User as UserIcon,
    AlertCircle,
    Paperclip,
    Calendar as CalendarIcon,
    X,
    FileIcon,
    Clock,
    UploadCloud,
    FileImage,
    FileText,
    FileArchive,
    FileCode,
    Trash2,
    Plus,
    Building2,
} from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';

export const DEPARTMENT_EMAIL_MAP: { label: string; email: string }[] = [
    { label: 'OPERATIONS', email: 'operations@gopocket.in' },
    { label: 'KYC', email: 'ekyc@gopocket.in' },
    { label: 'RMS', email: 'rms@gopocket.in' },
    { label: 'IT', email: 'it@gopocket.in' },
    { label: 'DP', email: 'dp@gopocket.in' },
    { label: 'DIGITAL MARKETING', email: 'digitalmarketing@gopocket.in' },
];
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TiptapUnderline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { EditorToolbar } from './TiptapEditorToolbar';
import { AssigneeCombobox, type AssignedToOption } from './AssigneeCombobox';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (ticketData: any) => Promise<void>;
    loading: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_SIZE_MB = 30;

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
        return <FileImage className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return <FileArchive className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (['json', 'js', 'ts', 'html', 'css', 'py', 'sql'].includes(ext)) {
        return <FileCode className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    return <FileIcon className="w-4 h-4 text-slate-600 shrink-0" />;
};

// ─── Main Modal Component ───────────────────────────────────────────────────────
export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [subject, setSubject] = useState('');
    const [department, setDepartment] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [assignedTo, setAssignedTo] = useState<AssignedToOption | null>(null);

    const handleDepartmentChange = (deptLabel: string) => {
        setDepartment(deptLabel);
        const found = DEPARTMENT_EMAIL_MAP.find(d => d.label === deptLabel);
        if (found) {
            setAssignedTo({
                user: found.email,
                code: found.label,
                for_value: found.email,
            });
        }
    };
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [hours, setHoursState] = useState('05');
    const [minutes, setMinutesState] = useState('00');
    const [ampm, setAmpm] = useState('PM');

    // Multi-file upload states
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentError, setAttachmentError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tiptap Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Placeholder.configure({
                placeholder: 'Describe the issue in detail — steps to reproduce, expected behavior, impact...',
            }),
            TiptapUnderline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[180px] px-4 py-3 text-slate-800 leading-relaxed',
            },
        },
        shouldRerenderOnTransaction: true,
    });

    const hours_options = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes_options = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const validateAndAddFiles = (newFiles: FileList | File[]) => {
        setAttachmentError('');
        const fileArray = Array.from(newFiles);
        let errorMsg = '';
        const validFiles: File[] = [];
        let currentTotalBytes = attachments.reduce((sum, f) => sum + f.size, 0);

        for (const file of fileArray) {
            if (attachments.some(existing => existing.name === file.name && existing.size === file.size)) continue;
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                errorMsg = `"${file.name}" exceeds max limit of ${MAX_FILE_SIZE_MB}MB.`;
                continue;
            }
            if (currentTotalBytes + file.size > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
                errorMsg = `Total attachments size cannot exceed ${MAX_TOTAL_SIZE_MB}MB.`;
                break;
            }
            currentTotalBytes += file.size;
            validFiles.push(file);
        }

        if (errorMsg) setAttachmentError(errorMsg);
        if (validFiles.length > 0) setAttachments(prev => [...prev, ...validFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) validateAndAddFiles(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) validateAndAddFiles(e.dataTransfer.files);
    };

    const removeAttachment = (indexToRemove: number) => { setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove)); setAttachmentError(''); };
    const clearAllAttachments = () => { setAttachments([]); setAttachmentError(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

    const totalAttachmentsSize = useMemo(() => attachments.reduce((acc, f) => acc + f.size, 0), [attachments]);

    const getEditorHtml = useCallback(() => {
        if (!editor) return '';
        return editor.getHTML();
    }, [editor]);

    const isDescriptionEmpty = useCallback(() => {
        if (!editor) return true;
        return editor.isEmpty;
    }, [editor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const descHtml = getEditorHtml();
        const descEmpty = isDescriptionEmpty();

        if (!subject.trim() || descEmpty || !assignedTo?.for_value) {
            toast({
                variant: "destructive",
                title: "Required Fields Missing",
                description: "Please fill in all mandatory fields (Subject, Description, and To). If you already picked a TO recipient, reopen the field and re-select it.",
            });
            return;
        }

        let due_date_str = null;
        if (date) {
            let h = parseInt(hours);
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            const finalDate = setMinutes(setHours(new Date(date), h), parseInt(minutes));
            due_date_str = format(finalDate, 'yyyy-MM-dd HH:mm:ss');
        }

        await onSubmit({
            subject,
            description: descHtml,
            priority,
            department,
            custom_allocated_to: assignedTo.for_value,
            assigned_user: assignedTo.user,
            due_date: due_date_str,
            attachment: attachments[0] || null,
            attachments: attachments,
        });

        // Reset form
        setSubject('');
        setDepartment('');
        editor?.commands.clearContent();
        setPriority('Medium');
        setAssignedTo(null);
        setDate(undefined);
        setHoursState('05');
        setMinutesState('00');
        setAmpm('PM');
        setAttachments([]);
        setAttachmentError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-violet-800 px-8 py-6">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                                <Ticket className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-white text-xl font-bold tracking-tight">Create New Ticket</DialogTitle>
                                <p className="text-purple-200 text-xs font-medium mt-0.5">Fill in the details to log a support or task ticket.</p>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="bg-white flex flex-col max-h-[80vh]">
                    <ScrollArea className="flex-1 max-h-[calc(80vh-140px)]">
                    <div className="px-8 py-6 space-y-6">

                        {/* Subject — Full Width */}
                        <div className="space-y-2">
                            <Label htmlFor="subject" className="text-slate-700 font-bold text-sm ml-0.5 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-500" />
                                Subject <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Briefly describe the issue..."
                                className="border-slate-200 focus:ring-purple-500 rounded-xl h-11 shadow-sm transition-all focus:border-purple-300 font-medium"
                                required
                            />
                        </div>

                        {/* Rich Text Description — Full Width, Prominent */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold text-sm ml-0.5 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-500" />
                                Detailed Description <span className="text-red-500">*</span>
                            </Label>
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all">
                                <EditorToolbar editor={editor} />
                                <EditorContent editor={editor} />
                            </div>
                        </div>

                        {/* Metadata Row — 4 columns on larger screens */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Department */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-xs ml-0.5 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                                    Department
                                </Label>
                                <Select value={department} onValueChange={handleDepartmentChange}>
                                    <SelectTrigger className="border-slate-200 rounded-xl h-10 shadow-sm focus:border-purple-300 font-medium text-sm">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                        {DEPARTMENT_EMAIL_MAP.map((dept) => (
                                            <SelectItem key={dept.label} value={dept.label}>
                                                {dept.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Assign To */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-xs ml-0.5 flex items-center gap-1.5">
                                    <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                                    TO <span className="text-red-500">*</span>
                                </Label>
                                <AssigneeCombobox value={assignedTo} onChange={setAssignedTo} />
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-xs ml-0.5 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
                                    Priority
                                </Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="border-slate-200 rounded-xl h-10 shadow-sm focus:border-purple-300 font-medium text-sm">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                        <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                                        <SelectItem value="High">🟠 High</SelectItem>
                                        <SelectItem value="Medium">🔵 Medium</SelectItem>
                                        <SelectItem value="Low">⚪ Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Due Date */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-xs ml-0.5 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
                                    Due Date & Time
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-medium rounded-xl h-10 border-slate-200 shadow-sm bg-white hover:bg-slate-50 text-sm",
                                                !date && "text-slate-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                                            {date ? (
                                                <span className="text-slate-900 font-medium text-xs">
                                                    {format(date, "PPP")} {hours}:{minutes} {ampm}
                                                </span>
                                            ) : (
                                                <span className="text-xs">Select deadline...</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            className="rounded-t-2xl"
                                        />
                                        <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50/50 rounded-b-2xl">
                                            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                                            <div className="flex items-center gap-1.5">
                                                <Select value={hours} onValueChange={setHoursState}>
                                                    <SelectTrigger className="w-[60px] h-8 rounded-lg border-slate-200 bg-white text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200">
                                                        {hours_options.map(h => (
                                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="text-slate-400 font-bold">:</span>
                                                <Select value={minutes} onValueChange={setMinutesState}>
                                                    <SelectTrigger className="w-[60px] h-8 rounded-lg border-slate-200 bg-white text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200">
                                                        {minutes_options.map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={ampm} onValueChange={setAmpm}>
                                                    <SelectTrigger className="w-[60px] h-8 rounded-lg border-slate-200 bg-white text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200">
                                                        <SelectItem value="AM">AM</SelectItem>
                                                        <SelectItem value="PM">PM</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* File Upload — Full Width */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-700 font-bold text-sm ml-0.5 flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-purple-500" />
                                    Attachments ({attachments.length})
                                </Label>
                                {attachments.length > 0 && (
                                    <span className="text-xs text-slate-500 font-medium">
                                        Total: {formatFileSize(totalAttachmentsSize)} / {MAX_TOTAL_SIZE_MB}MB
                                    </span>
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                id="ticket-attachments"
                                multiple
                            />

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group text-center",
                                    isDragging
                                        ? "border-purple-600 bg-purple-50/80 scale-[1.01]"
                                        : "border-slate-200 hover:border-purple-400 hover:bg-purple-50/30 bg-slate-50/40"
                                )}
                            >
                                <div className="p-2.5 bg-purple-100/80 text-purple-700 rounded-xl mb-1.5 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-semibold text-slate-700">
                                    <span className="text-purple-600 underline underline-offset-2">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Multiple files up to {MAX_FILE_SIZE_MB}MB each
                                </p>
                            </div>

                            {attachmentError && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 border border-red-100 p-2 rounded-xl animate-in slide-in-from-top-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{attachmentError}</span>
                                </div>
                            )}

                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attached Files</span>
                                        <button
                                            type="button"
                                            onClick={clearAllAttachments}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-semibold transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 className="w-3 h-3" /> Clear All
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                                        {attachments.map((file, idx) => (
                                            <div
                                                key={`${file.name}-${idx}`}
                                                className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-lg hover:border-purple-200 hover:bg-purple-50/20 transition-all"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                                    {getFileIcon(file.name)}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-slate-700 truncate" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            {formatFileSize(file.size)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }}
                                                    className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0"
                                                    title="Remove attachment"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl h-10 px-5 font-semibold text-slate-500 hover:bg-slate-100 text-sm"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !subject.trim() || isDescriptionEmpty() || !assignedTo?.for_value}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 px-6 font-bold shadow-lg shadow-purple-200 transition-all active:scale-95 min-w-[130px] text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Create Ticket
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
