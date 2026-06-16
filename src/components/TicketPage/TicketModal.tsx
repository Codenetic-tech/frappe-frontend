import React, { useState, useRef, useMemo } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Ticket, MessageSquare, Building2, AlertCircle, Paperclip, Calendar as CalendarIcon, X, FileIcon, Clock, Check } from "lucide-react";
import { useTickets, TICKET_DEPARTMENTS } from '@/contexts/TicketContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (ticketData: any) => Promise<void>;
    loading: boolean;
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onSubmit, loading }) => {
    const { toast } = useToast();
    const { orgTreeData } = useOrgTree();
    const { user } = useAuth();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [toDepartment, setToDepartment] = useState('');
    const [openTo, setOpenTo] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [hours, setHoursState] = useState('05');
    const [minutes, setMinutesState] = useState('00');
    const [ampm, setAmpm] = useState('PM');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentError, setAttachmentError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const branchOptions = useMemo(() => {
        if (!orgTreeData) return { ticketing: [], others: [] };
        const branches = orgTreeData.filter(node => node.category === 'BRANCH');
        const ticketing = branches.filter(b => TICKET_DEPARTMENTS.includes(b.name));
        const others = branches.filter(b => !TICKET_DEPARTMENTS.includes(b.name));
        console.log('Branch Options:', { ticketing: ticketing.length, others: others.length });
        return { ticketing, others };
    }, [orgTreeData]);

    const hours_options = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes_options = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setAttachmentError('');

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setAttachmentError('File size exceeds 5 MB limit.');
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setAttachment(file);
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim() || !date || !toDepartment) {
            toast({
                variant: "destructive",
                title: "Required Fields Missing",
                description: "Please fill in all mandatory fields (Subject, Description, Department, and Due Date).",
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
            description,
            priority,
            to_department: toDepartment,
            due_date: due_date_str,
            attachment: attachment,
        });

        // Reset form
        setSubject('');
        setDescription('');
        setPriority('Medium');
        setToDepartment('');
        setDate(undefined);
        setHoursState('05');
        setMinutesState('00');
        setAmpm('PM');
        setAttachment(null);
        setAttachmentError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="bg-gradient-to-r from-purple-600 to-violet-700 p-8">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Ticket className="text-white w-5 h-5" />
                            </div>
                            <DialogTitle className="text-white text-2xl font-bold tracking-tight">Create New Ticket</DialogTitle>
                        </div>
                        <p className="text-purple-100 text-sm font-medium opacity-90">Please provide details about the issue or request.</p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="subject" className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-500" />
                                Ticket Subject <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Briefly describe the issue..."
                                className="border-slate-200 focus:ring-purple-500 rounded-2xl h-12 shadow-sm transition-all focus:border-purple-300"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-700 font-bold text-sm ml-1">
                                Detailed Description <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add more context and details here..."
                                className="border-slate-200 focus:ring-purple-500 rounded-2xl min-h-[120px] resize-none shadow-sm transition-all focus:border-purple-300"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-purple-500" />
                                    TO <span className="text-red-500">*</span>
                                </Label>

                                <Popover open={openTo} onOpenChange={setOpenTo}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openTo}
                                            className="w-full justify-between border-slate-200 rounded-2xl h-12 shadow-sm focus:border-purple-300 font-normal px-3"
                                        >
                                            <span className={cn(toDepartment ? "text-slate-900" : "text-slate-400")}>
                                                {toDepartment ?
                                                    orgTreeData?.find(b => b.name === toDepartment)?.name1 || toDepartment :
                                                    "Select recipient..."}
                                            </span>
                                            <Building2 className="w-4 h-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-[310px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden"
                                        align="start"
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <Command className="border-none overflow-visible">
                                            <CommandInput placeholder="Search department or branch..." className="h-11" />
                                            <CommandList className="max-h-[220px] overflow-y-auto pointer-events-auto p-1">
                                                <CommandEmpty>No recipient found.</CommandEmpty>
                                                {branchOptions.ticketing.length > 0 && (
                                                    <CommandGroup heading="Ticketing Departments">
                                                        {branchOptions.ticketing.map((branch) => (
                                                            <CommandItem
                                                                key={branch.name}
                                                                value={branch.name}
                                                                onSelect={(currentValue) => {
                                                                    setToDepartment(currentValue);
                                                                    setOpenTo(false);
                                                                }}
                                                                className="cursor-pointer py-2.5 rounded-lg mx-1"
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700">{branch.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">{branch.name1}</span>
                                                                    </div>
                                                                    {toDepartment === branch.name && (
                                                                        <Check className="h-4 w-4 text-purple-600" />
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                                {branchOptions.others.length > 0 && (
                                                    <CommandGroup heading="Other Branches">
                                                        {branchOptions.others.map((branch) => (
                                                            <CommandItem
                                                                key={branch.name}
                                                                value={branch.name}
                                                                onSelect={(currentValue) => {
                                                                    setToDepartment(currentValue);
                                                                    setOpenTo(false);
                                                                }}
                                                                className="cursor-pointer py-2.5 rounded-lg mx-1"
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-slate-600">{branch.name}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">{branch.name1}</span>
                                                                    </div>
                                                                    {toDepartment === branch.name && (
                                                                        <Check className="h-4 w-4 text-purple-600" />
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-purple-500" />
                                    Priority
                                </Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="border-slate-200 rounded-2xl h-12 shadow-sm focus:border-purple-300">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                        <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                                        <SelectItem value="High">🟠 High</SelectItem>
                                        <SelectItem value="Medium">🔵 Medium</SelectItem>
                                        <SelectItem value="Low">⚪ Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-purple-500" />
                                    Due Date & Time <span className="text-red-500">*</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-medium rounded-2xl h-12 border-slate-200 shadow-sm",
                                                !date && "text-slate-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {date ? (
                                                <span className="text-slate-900">
                                                    {format(date, "PPP")} {hours}:{minutes} {ampm}
                                                </span>
                                            ) : (
                                                <span>Select deadline...</span>
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
                                                    <SelectTrigger className="w-[65px] h-9 rounded-xl border-slate-200 bg-white">
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
                                                    <SelectTrigger className="w-[65px] h-9 rounded-xl border-slate-200 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200">
                                                        {minutes_options.map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={ampm} onValueChange={setAmpm}>
                                                    <SelectTrigger className="w-[65px] h-9 rounded-xl border-slate-200 bg-white">
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

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-purple-500" />
                                    Attachment (Max 5MB)
                                </Label>
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="ticket-attachment"
                                    />
                                    {!attachment ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full border-dashed border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded-2xl h-12 gap-2 text-slate-500 transition-all font-medium"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            Choose File
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-2xl animate-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileIcon className="w-4 h-4 text-purple-600 shrink-0" />
                                                <span className="text-sm font-semibold text-purple-900 truncate">
                                                    {attachment.name}
                                                </span>
                                                <span className="text-[10px] text-purple-400 font-medium shrink-0">
                                                    ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeAttachment}
                                                className="p-1 hover:bg-purple-200 rounded-full transition-colors group"
                                            >
                                                <X className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                                            </button>
                                        </div>
                                    )}
                                    {attachmentError && (
                                        <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 animate-in slide-in-from-top-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {attachmentError}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-2xl h-12 px-6 font-semibold text-slate-500 hover:bg-slate-50"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !subject.trim() || !description.trim() || !date || !toDepartment}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-12 px-8 font-bold shadow-lg shadow-purple-100 transition-all active:scale-95 min-w-[140px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Ticket'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
