import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronRight,
    Home,
    ChevronLeft,
    Ticket,
    FileText,
    MessageSquare,
    RefreshCw,
    Activity,
    Info,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import { useTickets, TicketItem, isSLABreached } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import TicketInfoTab from '@/components/TicketPage/TicketInfoTab';
import TicketChatTab from '@/components/TicketPage/TicketChatTab';
import TicketTimelineTab from '@/components/TicketPage/TicketTimelineTab';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface Tab {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
}

const TicketDetails: React.FC = () => {
    const { ticketsData, isLoading, refreshTicketsData, updateTicketStatus } = useTickets();
    const { user } = useAuth();
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<TicketItem | null>(null);
    const [activeTab, setActiveTab] = useState('chat');

    const isAssignedToMe = useMemo(() => {
        if (!ticket || !user) return false;
        return user.user_code === ticket.to_department;
    }, [ticket, user]);

    const tabs: Tab[] = [
        { id: 'chat', label: 'Communication', icon: MessageSquare },
        { id: 'info', label: 'Ticket Details', icon: Info },
        { id: 'timeline', label: 'Timeline', icon: Activity },
    ];

    // Find current ticket
    useEffect(() => {
        if (ticketId && ticketsData) {
            const currentTicket = ticketsData.find(t => t.ticket_id === ticketId);
            if (currentTicket) {
                setTicket(currentTicket);
            }
        }
    }, [ticketId, ticketsData]);

    // Navigation logic
    const allTickets = useMemo(() => ticketsData || [], [ticketsData]);
    const currentIndex = useMemo(() => allTickets.findIndex(t => t.ticket_id === ticketId), [allTickets, ticketId]);

    const goToPrevious = () => {
        if (currentIndex > 0) {
            navigate(`/ticketing/${allTickets[currentIndex - 1].ticket_id}`);
        }
    };

    const goToNext = () => {
        if (currentIndex < allTickets.length - 1) {
            navigate(`/ticketing/${allTickets[currentIndex + 1].ticket_id}`);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!ticket) return;
        const success = await updateTicketStatus(ticket.ticket_id, newStatus);
        if (success) {
            toast({
                variant: "success",
                title: "Status Updated",
                description: `Ticket status changed to ${newStatus}.`,
            });
            refreshTicketsData(); // Refresh to get latest data including modified time
        }
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
                        <Ticket className="w-10 h-10 text-slate-305 dark:text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Ticket Not Found</h2>
                    <p className="text-slate-505 dark:text-slate-400 mb-8">The ticket you are looking for doesn't exist or you don't have access.</p>
                    <Button onClick={() => navigate('/ticketing')} className="rounded-xl bg-purple-600 hover:bg-purple-700 h-12 px-8 font-bold text-white">
                        Go back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-300 bg-stone-200/50 dark:bg-slate-950/20 overflow-hidden">
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-2 leading-none">
                    <div className="flex items-center gap-2 text-sm text-slate-505 dark:text-slate-400 font-medium">
                        <button onClick={() => navigate('/ticketing')} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 focus:outline-none">
                            <Home size={16} />
                            Ticketing
                        </button>
                        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{ticket.ticket_id}</span>
                        <div className={cn(
                            "ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            ticket.status === 'Open' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30' :
                                ticket.status === 'In Progress' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/30' :
                                    ticket.status === 'Resolved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' :
                                        'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        )}>
                            {ticket.status}
                        </div>
                        {isSLABreached(ticket) && (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                <AlertTriangle size={12} strokeWidth={3} />
                                SLA Breached
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToPrevious}
                                disabled={currentIndex <= 0}
                                className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <div className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 shadow-sm uppercase tracking-widest whitespace-nowrap">
                                {currentIndex + 1} / {allTickets.length}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToNext}
                                disabled={currentIndex >= allTickets.length - 1}
                                className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-8 bg-slate-200 dark:bg-slate-800 hidden md:block" />

                        <div className="flex items-center gap-2">
                            {(() => {
                                const isCreatedByMe = user?.user_code === ticket.requester_name;
                                const statusOptions = isCreatedByMe ? [
                                    { status: 'Open', color: 'bg-blue-500' },
                                    { status: 'Closed', color: 'bg-slate-500' }
                                ] : [
                                    { status: 'Open', color: 'bg-blue-500' },
                                    { status: 'In Progress', color: 'bg-purple-500' },
                                    { status: 'Resolved', color: 'bg-emerald-500' }
                                ];

                                return statusOptions.map((s) => (
                                    <Button
                                        key={s.status}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStatusUpdate(s.status)}
                                        className={cn(
                                            "hidden md:flex rounded-xl text-[10px] font-bold uppercase tracking-wider gap-2 h-9 border-slate-200 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-all px-4",
                                            ticket.status === s.status && "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 hover:text-white dark:hover:text-slate-900"
                                        )}
                                    >
                                        {!(ticket.status === s.status) && <div className={cn("w-2 h-2 rounded-full", s.color)} />}
                                        {ticket.status === s.status && <CheckCircle size={14} className="text-emerald-400 dark:text-emerald-600" />}
                                        {s.status}
                                    </Button>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Main Tabs Navigation */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
                    <div className="flex">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-450 bg-purple-50 dark:bg-purple-950/20'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-250 hover:bg-gray-50 dark:hover:bg-slate-850/40'
                                        }`}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-xl rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                    <ScrollArea className="flex-1">
                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 h-full">
                            {activeTab === 'info' && <TicketInfoTab ticket={ticket} />}
                            {activeTab === 'chat' && <TicketChatTab ticket={ticket} onReplyAdded={refreshTicketsData} />}
                            {activeTab === 'timeline' && <TicketTimelineTab ticketId={ticket.ticket_id} />}
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </Card>
            </div>
        </div>
    );
};

export default TicketDetails;

const Separator = ({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical', className?: string }) => (
    <div className={cn(
        "bg-slate-100 dark:bg-slate-800 shrink-0",
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'w-[1px] h-full',
        className
    )} />
);
