import React, { useState } from 'react';
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
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (taskData: any) => Promise<void>;
    loading: boolean;
    userEmail: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, loading, userEmail }) => {
    const { data: leadsData } = useFrappeGetDocList<any>('CRM Lead', {
        fields: ['name', 'lead_name'],
        limit: 100,
        orderBy: { field: 'modified', order: 'desc' }
    });
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [date, setDate] = useState<Date>();
    const [time, setTime] = useState('09:00');
    const [selectedLead, setSelectedLead] = useState<string>('');
    const [leadSearch, setLeadSearch] = useState('');

    const filteredLeads = leadsData?.filter(lead => 
        lead.lead_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
        lead.name.toLowerCase().includes(leadSearch.toLowerCase())
    ).slice(0, 10);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;

        const dueDateTime = new Date(date);
        const [hours, minutes] = time.split(':');
        dueDateTime.setHours(parseInt(hours), parseInt(minutes));

        await onSubmit({
            title,
            description,
            priority,
            due_date: dueDateTime.toISOString(),
            leadId: selectedLead,
        });

        // Reset form
        setTitle('');
        setDescription('');
        setPriority('Medium');
        setDate(undefined);
        setTime('09:00');
        setSelectedLead('');
        setLeadSearch('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-white text-2xl font-bold">Create New Task</DialogTitle>
                        <p className="text-blue-100 text-sm mt-1">Add a new task to your schedule and stay organized.</p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-slate-700 font-semibold">Task Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="border-slate-200 focus:ring-blue-500 rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-700 font-semibold">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add some details..."
                                className="border-slate-200 focus:ring-blue-500 rounded-xl min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="border-slate-200 rounded-xl">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="High">🔴 High Priority</SelectItem>
                                        <SelectItem value="Medium">🟡 Medium Priority</SelectItem>
                                        <SelectItem value="Low">🔵 Low Priority</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal border-slate-200 rounded-xl",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="time" className="text-slate-700 font-semibold">Due Time</Label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="border-slate-200 focus:ring-blue-500 rounded-xl"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    Link to Lead
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal border-slate-200 rounded-xl bg-white",
                                                !selectedLead && "text-muted-foreground"
                                            )}
                                        >
                                            <Search className="mr-2 h-4 w-4 text-slate-400" />
                                            {selectedLead ? leadsData?.find(l => l.name === selectedLead)?.lead_name : "Search leads..."}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="end">
                                        <div className="p-3 border-b border-slate-100">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                <Input 
                                                    placeholder="Find lead..." 
                                                    className="pl-8 h-8 rounded-lg text-xs"
                                                    value={leadSearch}
                                                    onChange={e => setLeadSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <ScrollArea className="h-[200px]">
                                            <div className="p-1">
                                                {filteredLeads?.map(lead => (
                                                    <button
                                                        key={lead.name}
                                                        type="button"
                                                        onClick={() => setSelectedLead(lead.name)}
                                                        className={cn(
                                                            "w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex flex-col gap-0.5",
                                                            selectedLead === lead.name && "bg-blue-50 text-blue-700"
                                                        )}
                                                    >
                                                        <span className="font-semibold">{lead.lead_name}</span>
                                                        <span className="text-[10px] opacity-70">{lead.name}</span>
                                                    </button>
                                                ))}
                                                {filteredLeads?.length === 0 && (
                                                    <div className="p-4 text-center text-[10px] text-slate-400">
                                                        No leads found
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !title || !date}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Task'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
