import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table';
import { useTickets, TicketItem, TICKET_DEPARTMENTS, isSLABreached, FetchTicketParams } from '@/contexts/TicketContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Ticket,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Filter,
    Clock,
    AlertCircle,
    CheckCircle2,
    MessageSquareDot,
    Timer,
    Zap,
    Star,
    Plus,
    Columns3,
    MoreHorizontal,
    Check,
    ChevronsUpDown,
    Trash2,
    Users,
    Calendar as CalendarIcon,
    Download,
    Eye,
    MessageSquare,
    RefreshCw,
    Calendar,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';
import { TicketModal } from '@/components/TicketPage/TicketModal';
import { toast } from '@/hooks/use-toast';

interface TicketCreateData {
    subject: string;
    description?: string;
    priority: string;
    to_department: string;
    due_date?: string | null;
    attachment?: File | null;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const ITEMS_PER_PAGE = 50;

const Tickets: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const {
        ticketsData,
        isLoading,
        error,
        count,
        statusCount,
        refreshTicketsData,
        createTicket,
        updateTicketStatus,
        assignTickets
    } = useTickets();
    const { orgTreeData } = useOrgTree();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [openAssignPopover, setOpenAssignPopover] = useState(false);

    const branchOptions = useMemo(() => {
        if (!orgTreeData) return { ticketing: [], others: [] };
        const branches = orgTreeData.filter(node => node.category === 'BRANCH');
        const ticketing = branches.filter(b => TICKET_DEPARTMENTS.includes(b.name));
        const others = branches.filter(b => !TICKET_DEPARTMENTS.includes(b.name));
        return { ticketing, others };
    }, [orgTreeData]);

    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('ticketsSearchQuery') || '');
    const [idSearchQuery, setIdSearchQuery] = useState(() => sessionStorage.getItem('ticketsIdSearchQuery') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('ticketsDateRange');
        if (stored) {
            try {
                const [start, end] = JSON.parse(stored);
                return [new Date(start), new Date(end)];
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('ticketsStatusFilter') || 'ALL');
    const [priorityFilter, setPriorityFilter] = useState<string>(() => sessionStorage.getItem('ticketsPriorityFilter') || 'ALL');

    const [currentPage, setCurrentPage] = useState(1);

    // TanStack Table state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        requester_email: false,
        created: false,
        modified: false,
    });
    const [rowSelection, setRowSelection] = useState({});

    // Previous sortConfig implementation mapped to internal state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>(() => {
        const stored = sessionStorage.getItem('ticketsSortConfig');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return { key: 'modified', direction: 'desc' };
            }
        }
        return { key: 'modified', direction: 'desc' };
    });

    const loadTicketsData = useCallback(async (page: number, currentSearch: string, currentIdSearch: string, currentStatus: string, currentPriority: string, currentDates: [Date, Date] | null, currentSort: { key: string, direction: 'asc' | 'desc' }) => {
        if (!token) return;

        const params: FetchTicketParams = {
            limit_start: (page - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        };

        if (currentSearch) {
            params.search = currentSearch;
        }

        if (currentIdSearch) {
            params.ticket_id = currentIdSearch;
        }

        if (currentStatus !== 'ALL') {
            params.status = currentStatus;
        }

        if (currentPriority !== 'ALL') {
            params.priority = currentPriority;
        }

        if (currentDates?.[0] && currentDates?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            params.from_date = formatLocal(currentDates[0]);
            params.to_date = formatLocal(currentDates[1]);
        }

        // Map UI field keys to API sort keys
        const sortKeyMap: Record<string, string> = {
            'created': 'creation',
            'modified': 'modified',
            'ticket_id': 'name',
            'subject': 'subject',
            'status': 'status',
            'priority': 'priority'
        };

        params.order_by = sortKeyMap[currentSort.key] || currentSort.key;
        params.order = currentSort.direction;

        await refreshTicketsData(params);
    }, [refreshTicketsData, token]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadTicketsData(currentPage, searchQuery, idSearchQuery, statusFilter, priorityFilter, dateRange, sortConfig);
        } finally {
            setIsRefreshing(false);
        }
    };

    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const debouncedIdSearchQuery = useDebounce(idSearchQuery, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, debouncedIdSearchQuery, statusFilter, priorityFilter, dateRange, sortConfig]);

    useEffect(() => {
        if (token) {
            loadTicketsData(currentPage, debouncedSearchQuery, debouncedIdSearchQuery, statusFilter, priorityFilter, dateRange, sortConfig);
        }
    }, [currentPage, debouncedSearchQuery, debouncedIdSearchQuery, statusFilter, priorityFilter, dateRange, sortConfig, token, loadTicketsData]);

    // Synchronize TanStack sorting with backend sortConfig
    useEffect(() => {
        if (sorting.length > 0) {
            const currentObj = sorting[0];
            setSortConfig({
                key: currentObj.id,
                direction: currentObj.desc ? 'desc' : 'asc'
            });
        }
    }, [sorting]);

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('ticketsSearchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        sessionStorage.setItem('ticketsIdSearchQuery', idSearchQuery);
    }, [idSearchQuery]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('ticketsDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('ticketsDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('ticketsStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('ticketsPriorityFilter', priorityFilter);
    }, [priorityFilter]);

    useEffect(() => {
        sessionStorage.setItem('ticketsSortConfig', JSON.stringify(sortConfig));
    }, [sortConfig]);

    // Sync restored sortConfig with TanStack Table sorting UI
    useEffect(() => {
        if (sortConfig.key) {
            setSorting([{ id: sortConfig.key, desc: sortConfig.direction === 'desc' }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayData = useMemo(() => {
        return ticketsData || [];
    }, [ticketsData]);

    const formatTicketDate = useCallback((dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            if (isNaN(date.getTime())) return dateStr;
            return format(date, 'dd-MM-yyyy hh:mm a');
        } catch (e) {
            return dateStr;
        }
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Open': return <Zap className="w-4 h-4 text-blue-600" />;
            case 'In Progress': return <Timer className="w-4 h-4 text-purple-600" />;
            case 'Resolved': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'Closed': return <AlertCircle className="w-4 h-4 text-slate-400" />;
            default: return <MessageSquareDot className="w-4 h-4 text-slate-400" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority?.toUpperCase()) {
            case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    const handleStatusUpdate = useCallback(async (ticketId: string, newStatus: string) => {
        const success = await updateTicketStatus(ticketId, newStatus);
        if (success) {
            toast({
                variant: "success",
                title: "Status Updated",
                description: `Ticket status changed to ${newStatus}.`,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update the ticket status.",
            });
        }
    }, [updateTicketStatus]);

    const handleCreateTicket = async (ticketData: TicketCreateData) => {
        setIsCreatingTicket(true);
        try {
            await createTicket(ticketData);
            setIsTicketModalOpen(false);
            toast({
                variant: "success",
                title: "Ticket Created Successfully",
                description: `Ticket for "${ticketData.subject}" has been opened.`,
            });
        } catch (error) {
            console.error('Error creating ticket:', error);
            toast({
                variant: "destructive",
                title: "Creation Failed",
                description: "There was an error creating the ticket. Please try again.",
            });
        } finally {
            setIsCreatingTicket(false);
        }
    };

    const handleBulkAssign = async (department: string) => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.ticket_id);
        if (selectedIds.length === 0) return;

        setIsAssigning(true);
        try {
            const success = await assignTickets(selectedIds, department);
            if (success) {
                table.resetRowSelection();
                setOpenAssignPopover(false);
                toast({
                    variant: "success",
                    title: "Tickets Assigned",
                    description: `Successfully assigned ${selectedIds.length} tickets to ${department}.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Assignment Failed",
                    description: "Could not assign the selected tickets.",
                });
            }
        } finally {
            setIsAssigning(false);
        }
    };

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const getStatusBadgeStyles = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'OPEN': return 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100/80 transition-colors';
            case 'IN PROGRESS': return 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/80 transition-colors';
            case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100/80 transition-colors';
            case 'CLOSED': return 'bg-slate-100 text-slate-600 border-slate-200 shadow-sm opacity-70 hover:opacity-100 transition-all';
            default: return 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100/80 transition-colors';
        }
    };

    const columns: ColumnDef<TicketItem>[] = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected()
                            ? true
                            : table.getIsSomePageRowsSelected()
                                ? 'indeterminate'
                                : false
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'ticket_id',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-3 h-8 gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Ticket ID
                    <ArrowUpDown className="h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => (
                <button
                    onClick={() => {
                        navigate(`/ticketing/${row.getValue('ticket_id')}`);
                    }}
                    className="font-bold text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                >
                    {row.getValue('ticket_id')}
                </button>
            ),
        },
        {
            accessorKey: 'subject',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-3 h-8 gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Subject
                    <ArrowUpDown className="h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex flex-col max-w-[300px]">
                    <span className="font-semibold text-slate-800 line-clamp-1">{row.original.subject}</span>
                </div>
            ),
        },
        {
            accessorKey: 'priority',
            header: 'Priority',
            cell: ({ row }) => (
                <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase", getPriorityColor(row.getValue('priority')))}>
                    {row.getValue('priority')}
                </Badge>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                const breached = isSLABreached(row.original);
                return (
                    <div className="flex flex-col gap-1.5">
                        <Badge
                            variant="outline"
                            className={cn(
                                "capitalize font-bold px-2.5 py-1 rounded-full border-none text-[10px] shadow-sm flex items-center gap-1.5 w-fit",
                                getStatusBadgeStyles(status)
                            )}
                        >
                            <div className="w-1 h-1 rounded-full bg-current" />
                            {status}
                        </Badge>
                        {breached && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase tracking-tighter ml-1">
                                <AlertTriangle size={10} strokeWidth={3} />
                                SLA Breached
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'requester_name',
            header: 'Created By',
            cell: ({ row }) => {
                const requester = row.getValue('requester_name') as string;
                const orgNode = orgTreeData?.find(n => n.name === requester);
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-slate-700 font-semibold text-sm leading-tight cursor-default">
                                {requester}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            className="bg-slate-900 text-white border-slate-800 rounded-xl px-4 py-3 shadow-2xl max-w-xs"
                        >
                            <div className="space-y-1.5">
                                <p className="text-xs font-bold text-white">{orgNode?.client_name || requester}</p>
                                {orgNode?.mail_id && (
                                    <p className="text-[11px] text-slate-300">{orgNode.mail_id}</p>
                                )}
                                {!orgNode && (
                                    <p className="text-[11px] text-slate-400 italic">Details not available</p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'to_department',
            header: 'Assigned To',
            cell: ({ row }) => {
                const assignedTo = row.getValue('to_department') as string;
                const orgNode = orgTreeData?.find(n => n.name === assignedTo);
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-slate-700 font-semibold text-sm leading-tight cursor-default">
                                {assignedTo}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            className="bg-slate-900 text-white border-slate-800 rounded-xl px-4 py-3 shadow-2xl max-w-xs"
                        >
                            <div className="space-y-1.5">
                                <p className="text-xs font-bold text-white">{orgNode?.client_name || assignedTo}</p>
                                {orgNode?.mail_id && (
                                    <p className="text-[11px] text-slate-300">{orgNode.mail_id}</p>
                                )}
                                {!orgNode && (
                                    <p className="text-[11px] text-slate-400 italic">Details not available</p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'resolved_by',
            header: 'Resolved By',
            cell: ({ row }) => {
                const resolvedBy = row.getValue('resolved_by') as string;
                if (!resolvedBy) return <span className="text-slate-400">-</span>;
                const orgNode = orgTreeData?.find(n => n.name === resolvedBy);
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-slate-700 font-semibold text-sm leading-tight cursor-default">
                                {resolvedBy}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            className="bg-slate-900 text-white border-slate-800 rounded-xl px-4 py-3 shadow-2xl max-w-xs"
                        >
                            <div className="space-y-1.5">
                                <p className="text-xs font-bold text-white">{orgNode?.client_name || resolvedBy}</p>
                                {orgNode?.mail_id && (
                                    <p className="text-[11px] text-slate-300">{orgNode.mail_id}</p>
                                )}
                                {!orgNode && (
                                    <p className="text-[11px] text-slate-400 italic">Details not available</p>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            accessorKey: 'created',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-3 h-8 gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Created Date
                    <ArrowUpDown className="h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-500 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 opacity-40" />
                    <span className="font-mono text-xs">{formatTicketDate(row.getValue('created'))}</span>
                </div>
            ),
        },
        {
            accessorKey: 'modified',
            header: ({ column }) => (
                <Button variant="ghost" className="-ml-3 h-8 gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Modified Date
                    <ArrowUpDown className="h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-400 whitespace-nowrap">
                    <Timer className="w-3.5 h-3.5 opacity-30" />
                    <span className="font-mono text-xs">{formatTicketDate(row.getValue('modified'))}</span>
                </div>
            ),
        },
        {
            accessorKey: 'rating',
            header: 'Rating',
            cell: ({ row }) => (
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "w-3.5 h-3.5",
                                star <= (row.getValue('rating') as number)
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-slate-200 fill-slate-200"
                            )}
                        />
                    ))}
                </div>
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const isCreatedByMe = user?.user_code === row.original.requester_name;
                const isAssignedToMe = user?.user_code === row.original.to_department ||
                    (user?.department && row.original.to_department &&
                        user.department.toUpperCase() === row.original.to_department.toUpperCase());

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 shadow-xl">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => navigate(`/ticketing/${row.original.ticket_id}`)}
                            >
                                View Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 py-1">Update Status</DropdownMenuLabel>

                            {isCreatedByMe ? (
                                <>
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2"
                                        onClick={() => handleStatusUpdate(row.original.ticket_id, 'Open')}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Mark as Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2"
                                        onClick={() => handleStatusUpdate(row.original.ticket_id, 'Closed')}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                                        Mark as Closed
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2"
                                        onClick={() => handleStatusUpdate(row.original.ticket_id, 'Open')}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Mark as Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2"
                                        onClick={() => handleStatusUpdate(row.original.ticket_id, 'In Progress')}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        In Progress
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="cursor-pointer gap-2"
                                        onClick={() => handleStatusUpdate(row.original.ticket_id, 'Resolved')}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Resolved
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], [formatTicketDate, user, handleStatusUpdate, navigate, orgTreeData]);

    const table = useReactTable({
        data: displayData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
        },
    });

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Ticket className="w-4 h-4 text-purple-600" />
                            </div>

                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount.Total}</p>
                            )}
                            {/* <p className="text-[10px] text-slate-500 font-medium">All Tickets</p> */}
                        </div>
                    </Card>

                    {[
                        { label: 'Open', key: 'Open', color: 'blue', sub: 'New tickets' },
                        { label: 'In Progress', key: 'In Progress', color: 'purple', sub: 'Being handled' },
                        { label: 'Resolved', key: 'Resolved', color: 'green', sub: 'Completed' },
                        { label: 'Closed', key: 'Closed', color: 'slate', sub: 'Archive' },
                    ].map((item) => (
                        <Card key={item.key} className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn("text-[12px] font-bold uppercase tracking-wider", `text-${item.color}-600`)}>{item.label}</span>
                                <div className={cn("p-2 rounded-lg", `bg-${item.color}-50`)}>
                                    {getStatusIcon(item.key)}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                {isLoading ? (
                                    <Skeleton className="h-8 w-12 mb-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900">
                                        {statusCount[item.key as keyof typeof statusCount] || 0}
                                    </p>
                                )}
                                {/* <p className="text-[10px] text-slate-500 font-medium">{item.sub}</p> */}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Filters & Actions Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-2xl backdrop-blur-sm relative z-20">
                    <div className="w-[240px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Created Date Range"
                            className="w-full bg-white border-slate-200 focus:ring-purple-500 rounded-xl custom-date-picker h-10"
                            appearance="default"
                            block
                        />
                    </div>
                    <div className="w-[160px]">
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Priority" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Priorities</SelectItem>
                                <SelectItem value="URGENT">Urgent</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="LOW">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[160px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="relative w-[180px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search ID..."
                            value={idSearchQuery}
                            onChange={(e) => setIdSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Tickets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>

                    <div className="flex items-center gap-2">

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-xl border-slate-200 bg-white h-10 gap-2">
                                    <Columns3 className="w-4 h-4 text-slate-400" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 shadow-xl">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize cursor-pointer"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id.replace(/_/g, ' ')}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            onClick={handleRefresh}
                            disabled={isRefreshing || isLoading}
                            variant="outline"
                            className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-all"
                        >
                            <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                        </Button>

                        {table.getFilteredSelectedRowModel().rows.length > 0 && (
                            <Popover open={openAssignPopover} onOpenChange={setOpenAssignPopover}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 rounded-xl gap-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 animate-in zoom-in-95 duration-200"
                                        disabled={isAssigning}
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>Assign To ({table.getFilteredSelectedRowModel().rows.length})</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[210px] p-0 rounded-2xl border-slate-200 shadow-xl overflow-hidden"
                                    align="start"
                                    onWheel={(e) => e.stopPropagation()}
                                >
                                    <Command className="border-none overflow-visible">
                                        <CommandInput placeholder="Search department or branch..." className="h-11" />
                                        <CommandList className="max-h-[220px] overflow-y-auto pointer-events-auto p-1">
                                            <CommandEmpty>No recipient found.</CommandEmpty>
                                            {branchOptions.ticketing.length > 0 && (
                                                <CommandGroup heading="Ticketing Departments">
                                                    {branchOptions.ticketing.map((branch) => {
                                                        const isUserDepartment = user?.department?.toUpperCase() === branch.name.toUpperCase();
                                                        const departmentUsers = isUserDepartment ? orgTreeData?.filter(node => node.parent_gopocket_tree === branch.name) : [];

                                                        return (
                                                            <React.Fragment key={branch.name}>
                                                                <CommandItem
                                                                    value={branch.name}
                                                                    onSelect={(currentValue) => {
                                                                        handleBulkAssign(currentValue);
                                                                    }}
                                                                    className="cursor-pointer py-2.5 rounded-lg mx-1"
                                                                >
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-700">{branch.name}</span>
                                                                            <span className="text-[10px] text-slate-400 font-mono">{branch.client_name}</span>
                                                                        </div>
                                                                    </div>
                                                                </CommandItem>

                                                                {isUserDepartment && departmentUsers && departmentUsers.length > 0 && (
                                                                    <div className="ml-4 border-l-2 border-purple-100 pl-2 my-1 space-y-1">
                                                                        {departmentUsers.map((u) => (
                                                                            <CommandItem
                                                                                key={u.name}
                                                                                value={`${branch.name}-${u.name}-${u.client_name}`}
                                                                                onSelect={() => {
                                                                                    handleBulkAssign(u.name);
                                                                                }}
                                                                                className="cursor-pointer py-2 rounded-md hover:bg-purple-50"
                                                                            >
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm font-medium text-slate-600">{u.client_name}</span>
                                                                                        <span className="text-[10px] text-slate-400 font-mono">{u.name}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            )}
                                            {branchOptions.others.length > 0 && (
                                                <CommandGroup heading="Other Branches">
                                                    {branchOptions.others.map((branch) => (
                                                        <CommandItem
                                                            key={branch.name}
                                                            value={branch.name}
                                                            onSelect={(currentValue) => {
                                                                handleBulkAssign(currentValue);
                                                            }}
                                                            className="cursor-pointer py-2.5 rounded-lg mx-1"
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-slate-600">{branch.name}</span>
                                                                    <span className="text-[10px] text-slate-400 font-mono">{branch.client_name}</span>
                                                                </div>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white border border-slate-200 rounded-xl">
                            <span className="text-sm font-bold text-purple-600">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}

            {/* Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white rounded-2xl border border-slate-100">
                <ScrollArea className="flex-1">
                    <Table>
                        <TableHeader className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-slate-100">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="h-12 px-4 text-slate-600 font-semibold">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 12 }).map((_, i) => (
                                    <TableRow key={i} className="hover:bg-transparent border-b border-slate-50">
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="py-3 px-4"><Skeleton className="h-4 w-6" /></TableCell>
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-slate-50/50 transition-colors border-slate-50 group cursor-default"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3 px-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-4 bg-slate-50 rounded-full mb-3">
                                                <Ticket className="w-10 h-10 opacity-10" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-600">No tickets found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters to find what you are looking for.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {/* Status Info Footer */}
                <div className="shrink-0 py-2 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-center items-center">
                    <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                        Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, count)}</span> of <span className="text-slate-900 font-bold">{count}</span> reported tickets
                    </p>
                </div>
            </Card>

            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-2xl flex items-center justify-center p-0 transition-all active:scale-90 hover:rotate-90"
                >
                    <Plus className="w-8 h-8" />
                </Button>
            </div>

            <TicketModal
                isOpen={isTicketModalOpen}
                onClose={() => setIsTicketModalOpen(false)}
                onSubmit={handleCreateTicket}
                loading={isCreatingTicket}
            />
        </div>
    );
};

export default Tickets;
