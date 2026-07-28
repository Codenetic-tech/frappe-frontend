import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Ticket,
    Mail,
    Activity as ActivityIcon,
    MessageSquare,
    RefreshCw,
} from 'lucide-react';
import { useFrappeGetDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import TicketActivityTab from '@/components/TicketPage/TicketActivityTab';
import TicketCommentsTab from '@/components/TicketPage/TicketCommentsTab';
import TicketComposer from '@/components/TicketPage/TicketComposer';
import TicketDetailsPanel from '@/components/TicketPage/TicketDetailsPanel';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useTicketActivities } from '@/hooks/useTicketActivities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Tab {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
}

const TICKET_STATUSES = [
    { status: 'Open', color: 'bg-blue-500' },
    { status: 'In Progress', color: 'bg-purple-500' },
    { status: 'Resolved', color: 'bg-emerald-500' },
    { status: 'Closed', color: 'bg-slate-500' },
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Open': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
        case 'In Progress': return 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30';
        case 'Resolved': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30';
        default: return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
};

const TicketDetails: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('activity');
    const { updateDoc } = useFrappeUpdateDoc();

    const { data: ticket, isLoading, mutate } = useFrappeGetDoc<any>('HD Ticket', ticketId || '', {
        fields: [
            'name', 'subject', 'raised_by', 'status', 'priority', 'ticket_type', 'agent_group',
            'creation', 'modified', 'description', 'via_customer_portal',
            'response_by', 'first_responded_on', 'first_response_time', 'first_response_failed_by',
            'resolution_by', 'resolution_time', 'resolution_failed_by', 'agreement_status',
        ],
    });

    const { data: activities, isLoading: isActivitiesLoading, refresh: refreshActivities } = useTicketActivities(ticket?.name);

    const tabs: Tab[] = [
        { id: 'activity', label: 'Activity', icon: ActivityIcon },
        { id: 'emails', label: 'Emails', icon: Mail },
        { id: 'comments', label: 'Comments', icon: MessageSquare },
    ];

    const handleStatusUpdate = async (newStatus: string) => {
        if (!ticket) return;
        try {
            await updateDoc('HD Ticket', ticket.name, { status: newStatus });
            mutate();
            toast({
                variant: "success",
                title: "Status Updated",
                description: `Ticket status changed to ${newStatus}.`,
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update the ticket status.",
            });
        }
    };

    const handleCommentAdded = () => {
        refreshActivities();
    };

    if (isLoading && !ticket) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <Card className="p-12 rounded-3xl border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center max-w-md bg-white dark:bg-slate-900">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Ticket Not Found</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">The ticket you are looking for doesn't exist or you don't have access.</p>
                    <Button onClick={() => navigate('/ticketing')} className="rounded-xl bg-purple-600 hover:bg-purple-700 h-12 px-8 font-bold text-white">
                        Go back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-300 bg-background dark:bg-slate-950/50 overflow-hidden">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Persistent Ticket Details (25%) + Tabbed Content (75%) */}
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                    {/* Left: Ticket Details Panel — persists across all tabs */}
                    <div className="w-full lg:w-1/4 shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col lg:max-h-full lg:min-h-0 max-h-[480px]">
                        <TicketDetailsPanel
                            ticket={ticket}
                            onTicketUpdate={() => {
                                mutate();
                                refreshActivities();
                            }}
                        />
                    </div>

                    {/* Right: Tabs */}
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-2 pr-3">
                                <div className="flex flex-wrap">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-950/30'
                                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <Select value={ticket.status} onValueChange={handleStatusUpdate}>
                                        <SelectTrigger
                                            className={cn(
                                                "h-8 w-auto gap-2 pl-3 pr-2.5 rounded-lg border text-xs font-bold uppercase tracking-wide focus:ring-purple-500/30 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-60",
                                                getStatusColor(ticket.status)
                                            )}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            {TICKET_STATUSES.map((s) => (
                                                <SelectItem key={s.status} value={s.status} className="text-xs font-semibold uppercase tracking-wide">
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn("w-2 h-2 rounded-full", s.color)} />
                                                        {s.status}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                                    <button
                                        onClick={() => refreshActivities()}
                                        disabled={isActivitiesLoading}
                                        title="Refresh activity"
                                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={cn(isActivitiesLoading && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tab Content Area */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                            <ScrollArea className="flex-1 w-full">
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    {activeTab === 'activity' && <TicketActivityTab data={activities} isLoading={isActivitiesLoading} filter="all" />}
                                    {activeTab === 'emails' && <TicketActivityTab data={activities} isLoading={isActivitiesLoading} filter="communications" />}
                                    {activeTab === 'comments' && <TicketCommentsTab comments={activities?.comments ?? []} isLoading={isActivitiesLoading} />}
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>

                            <TicketComposer ticketName={ticket.name} onCommentAdded={handleCommentAdded} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetails;
