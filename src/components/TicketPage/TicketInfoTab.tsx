import React from 'react';
import { 
    Clock, 
    User, 
    Building, 
    AlertCircle, 
    CheckCircle2, 
    Circle, 
    Timer,
    MessageSquare,
    AlertTriangle,
    BadgeAlert
} from 'lucide-react';
import { TicketItem, isSLABreached } from '@/contexts/TicketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TicketInfoTabProps {
    ticket: TicketItem;
}

const TicketInfoTab: React.FC<TicketInfoTabProps> = ({ ticket }) => {
    const getStatusStyles = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'IN PROGRESS': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'CLOSED': return 'bg-slate-50 text-slate-700 border-slate-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-red-50 text-red-700 border-red-100';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const formatTicketDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            return format(new Date(dateStr.replace(' ', 'T')), 'dd-MM-yyyy hh:mm a');
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-5xl mx-auto">
            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">{ticket.subject}</h2>
                        <Badge variant="outline" className="font-mono text-xs text-slate-500 bg-slate-50">
                            {ticket.ticket_id}
                        </Badge>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                        <Clock size={14} />
                        Opened on {formatTicketDate(ticket.created)}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge className={cn("px-4 py-1.5 rounded-xl border-none shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider", getStatusStyles(ticket.status))}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        {ticket.status}
                    </Badge>
                    <Badge variant="outline" className={cn("px-4 py-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider", getPriorityStyles(ticket.priority))}>
                        {ticket.priority} Priority
                    </Badge>
                </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-500" />
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[200px]">
                                {ticket.description || "No description provided."}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <User className="w-4 h-4 text-purple-500" />
                                Requester Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-700 font-bold text-lg shadow-sm">
                                    {ticket.requester_name.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-slate-900">{ticket.requester_name}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{ticket.requester_email}</p>
                                </div>
                            </div>
                            
                            <Separator className="bg-slate-100" />
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                                    <Badge variant="outline" className="rounded-lg bg-slate-50 text-slate-600 border-slate-200">
                                        {ticket.to_department}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Created By</span>
                                    <span className="text-sm font-semibold text-slate-700">{ticket.created_by}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source</span>
                                    <span className="text-sm font-semibold text-slate-700">{ticket.source}</span>
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</span>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                isSLABreached(ticket) ? "text-red-600" : "text-slate-700"
                                            )}>
                                                {formatTicketDate(ticket.due_date || '')}
                                            </span>
                                            {isSLABreached(ticket) && (
                                                <Badge className="bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold uppercase tracking-tight h-5">
                                                    SLA Breached
                                                </Badge>
                                            )}
                                            {!ticket.due_date && (
                                                <span className="text-xs text-slate-400 italic">Not set</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-white">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Timer className="w-4 h-4 text-purple-500" />
                                Activity Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="relative flex flex-col items-center">
                                    <div className="w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-50" />
                                    <div className="w-0.5 h-full bg-slate-100 my-1" />
                                </div>
                                <div className="flex-1 pb-6">
                                    <p className="text-xs font-bold text-slate-800">Ticket Created</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{formatTicketDate(ticket.created)}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative flex flex-col items-center">
                                    <div className="w-3 h-3 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-800">Last Modified</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{formatTicketDate(ticket.modified)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketInfoTab;
