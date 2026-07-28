import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeUpdateDoc } from 'frappe-react-sdk';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import {
    FileText,
    CircleDot,
    Clock,
    CircleCheck,
    CircleSlash,
    MoreHorizontal,
    Search,
    RefreshCcw,
    FileDown,
    Columns3,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Check,
    ChevronsUpDown,
    Calendar as CalendarIcon,
    X,
    Mail,
    AlertCircle,
    User,
    MessageSquare,
    Tag,
    Users,
    Plus,
} from 'lucide-react';
import { TicketModal } from '@/components/TicketPage/TicketModal';
import { CreateTicketFloatingButton } from '@/components/TicketPage/CreateTicketFloatingButton';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export interface TicketItem {
    name: string;
    subject: string;
    raised_by?: string;
    status?: string;
    priority?: string;
    ticket_type?: string;
    agent_group?: string;
    custom_allocated_code?: string;
    custom_allocated_person_name?: string;
    _comments?: string;
    creation: string;
    modified: string;
    [key: string]: any;
}

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

const HD_TICKET_FILTER_FIELDS = [
    { value: 'name', label: 'Ticket ID', type: 'string' },
    { value: 'subject', label: 'Subject', type: 'string' },
    { value: 'raised_by', label: 'Raised By (Email)', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['Open', 'Replied', 'Resolved', 'Closed'] },
    { value: 'priority', label: 'Priority', type: 'string' },
    { value: 'ticket_type', label: 'Ticket Type', type: 'string' },
    { value: 'agent_group', label: 'Team', type: 'string' },
    { value: 'custom_allocated_code', label: 'Allocated Code', type: 'string' },
    { value: 'custom_allocated_person_name', label: 'Allocated Person', type: 'string' },
    { value: 'creation', label: 'Creation Date', type: 'date' },
    { value: 'modified', label: 'Modified Date', type: 'date' },
] as const;

const STRING_OPERATORS = ['like', '=', '!=', 'not like'] as const;
const DATE_OPERATORS = ['>', '<', '>=', '<=', 'Between', 'Timespan'] as const;
const SELECT_OPERATORS = ['=', '!='] as const;

const OPERATOR_LABELS: Record<string, string> = {
    '>': 'After',
    '<': 'Before',
    '>=': 'On or After',
    '<=': 'On or Before',
    'like': 'Contains',
    'not like': 'Does not contain',
    '=': 'Equals',
    '!=': 'Does not equal',
};

const getOperatorsForType = (type: string) => {
    switch (type) {
        case 'date': return [...DATE_OPERATORS];
        case 'select': return [...SELECT_OPERATORS];
        default: return [...STRING_OPERATORS];
    }
};

const getFieldType = (fieldValue: string): string =>
    HD_TICKET_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = HD_TICKET_FILTER_FIELDS.find(f => f.value === fieldValue);
    return field && 'options' in field ? (field as any).options : [];
};

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const TableWrapper = ({ scrollWholePage, children }: { scrollWholePage: boolean; children: React.ReactNode }) => {
    if (scrollWholePage) {
        return (
            <ScrollArea className="w-full">
                {children}
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        );
    }
    return (
        <ScrollArea className="flex-1 w-full">
            {children}
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
};

const postFetcher = async (key: string | [string, string] | { url: string; body: Record<string, any> }) => {
    let url = '';
    let bodyStr = '';

    if (Array.isArray(key)) {
        url = key[0];
        bodyStr = key[1];
    } else if (typeof key === 'object' && key !== null) {
        url = key.url;
        bodyStr = JSON.stringify(key.body);
    } else {
        url = key as string;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: bodyStr || undefined
    });
    if (!response.ok) {
        let errData;
        try {
            errData = await response.json();
        } catch (e) {
            errData = { message: response.statusText || 'Fetch failed' };
        }
        const error: any = new Error(errData.message || 'Fetch failed');
        error.status = response.status;
        error.info = errData;
        throw error;
    }
    const data = await response.json();
    return data.message;
};

const GopocketTickets: React.FC = () => {
    const navigate = useNavigate();
    const { updateDoc } = useFrappeUpdateDoc();
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('ticketsSearchQuery') || '');
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
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    const handleCreateTicket = async (ticketData: any) => {
        setIsSubmittingTicket(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };

            const createRes = await fetch(`${API_BASE_URL}/api/method/frappe.client.insert`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doc: {
                        doctype: 'HD Ticket',
                        subject: ticketData.subject,
                        description: ticketData.description,
                        priority: ticketData.priority,
                        custom_allocated_to: ticketData.custom_allocated_to,
                        custom_due_date: ticketData.due_date,
                        via_customer_portal: 1,
                        status: 'Open'
                    }
                })
            });

            if (!createRes.ok) {
                const errJson = await createRes.json().catch(() => ({}));
                throw new Error(errJson.message || `HTTP ${createRes.status}: Failed to create ticket`);
            }

            const createData = await createRes.json();
            const createdDoc = createData.message;
            const ticketName = createdDoc?.name;

            if (ticketData.assigned_user && ticketName) {
                try {
                    await fetch(`${API_BASE_URL}/api/method/frappe.desk.form.assign_to.add`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            doctype: 'HD Ticket',
                            name: ticketName,
                            assign_to: [ticketData.assigned_user],
                        })
                    });
                } catch (e) {
                    console.error('Error assigning ticket:', e);
                }
            }

            if (ticketData.attachments && ticketData.attachments.length > 0 && ticketName) {
                let uploadedCount = 0;
                for (const file of ticketData.attachments) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file, file.name);
                        formData.append('doctype', 'HD Ticket');
                        formData.append('docname', ticketName);
                        formData.append('is_private', '1');

                        const uploadRes = await fetch(`${API_BASE_URL}/api/method/upload_file`, {
                            method: 'POST',
                            body: formData
                        });

                        if (uploadRes.ok) {
                            uploadedCount++;
                        }
                    } catch (e) {
                        console.error(`Error uploading ${file.name}:`, e);
                    }
                }
                if (uploadedCount > 0) {
                    toast.success(`Ticket created with ${uploadedCount} attachment(s)`);
                } else {
                    toast.success('Ticket created successfully');
                }
            } else {
                toast.success('Ticket created successfully');
            }

            setIsCreateModalOpen(false);
            refetchTickets();
            mutateChart();
        } catch (err: any) {
            console.error('Error creating ticket:', err);
            toast.error(err.message || 'Failed to create ticket');
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof TicketItem; direction: 'asc' | 'desc' } | null>({
        key: 'creation',
        direction: 'desc'
    });
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [scrollWholePage, setScrollWholePage] = useState<boolean>(() => {
        return localStorage.getItem("scroll-whole-page") === "true";
    });

    useEffect(() => {
        const handleLayoutChange = () => {
            setScrollWholePage(localStorage.getItem("scroll-whole-page") === "true");
        };
        window.addEventListener("layout-changed", handleLayoutChange);
        return () => {
            window.removeEventListener("layout-changed", handleLayoutChange);
        };
    }, []);

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
    const [openFilterPanel, setOpenFilterPanel] = useState(false);
    const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
    const [fieldComboOpen, setFieldComboOpen] = useState<Record<string, boolean>>({});

    const handleFilterPanelOpen = (open: boolean) => {
        if (open) {
            setDraftFilters(
                advancedFilters.length > 0
                    ? advancedFilters.map(f => ({ ...f }))
                    : [{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]
            );
        }
        setOpenFilterPanel(open);
    };

    const addDraftFilter = () =>
        setDraftFilters(prev => [...prev, { id: crypto.randomUUID(), field: '', operator: '', value: '' }]);

    const removeDraftFilter = (id: string) =>
        setDraftFilters(prev => prev.filter(f => f.id !== id));

    const updateDraftFilter = (id: string, updates: Partial<AdvancedFilter>) =>
        setDraftFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

    const applyAdvancedFilters = () => {
        const valid = draftFilters.filter(f => {
            if (!f.field || !f.operator) return false;
            if (Array.isArray(f.value)) return f.value[0] !== '' && f.value[1] !== '';
            return f.value !== '';
        }).map(f => {
            if ((f.operator === 'like' || f.operator === 'not like') && typeof f.value === 'string' && !f.value.includes('%')) {
                return { ...f, value: `%${f.value}%` };
            }
            return f;
        });
        setAdvancedFilters(valid);
        setOpenFilterPanel(false);
    };

    const clearAdvancedFilters = () => {
        setDraftFilters([{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
        setAdvancedFilters([]);
        setOpenFilterPanel(false);
    };

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('ticketsColumnVisibility');
        const defaults = {
            subject: true,
            raised_by: true,
            priority: true,
            ticket_type: true,
            agent_group: true,
            status: true,
            assigned_to: true,
            creation: true,
            modified: false,
        };
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('ticketsColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem('ticketsColumnWidths');
        const defaults = {
            subject: 260,
            raised_by: 200,
            priority: 140,
            ticket_type: 160,
            agent_group: 160,
            status: 160,
            assigned_to: 200,
            creation: 180,
            modified: 180,
        };
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('ticketsColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || 150;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(80, startWidth + deltaX);
            setColumnWidths(prev => {
                const updated = {
                    ...prev,
                    [columnId]: newWidth
                };
                localStorage.setItem('ticketsColumnWidths', JSON.stringify(updated));
                return updated;
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderResizeHandle = (columnId: string) => (
        <div
            onMouseDown={(e) => handleResizeStart(e, columnId)}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 group/resize flex items-center justify-center -mr-1.5"
        >
            <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 group-hover/resize:bg-purple-500/80 active:bg-purple-600 transition-colors" />
        </div>
    );

    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const stored = localStorage.getItem('ticketsColumnOrder');
        const defaultOrder = [
            'subject',
            'raised_by',
            'priority',
            'ticket_type',
            'agent_group',
            'status',
            'assigned_to',
            'creation',
            'modified'
        ];
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const filtered = [...parsed];
                defaultOrder.forEach(col => {
                    if (!filtered.includes(col)) {
                        filtered.push(col);
                    }
                });
                return filtered;
            } catch (e) {
                return defaultOrder;
            }
        }
        return defaultOrder;
    });

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        setDraggedIndex(null);
        setDraggedOverIndex(null);
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        setColumnOrder(prev => {
            const next = [...prev];
            const [dragged] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, dragged);
            localStorage.setItem('ticketsColumnOrder', JSON.stringify(next));
            return next;
        });
    };

    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [activeTicketForComment, setActiveTicketForComment] = useState<TicketItem | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    const handleAddComment = async () => {
        if (!activeTicketForComment || !commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };
            const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.insert`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doc: {
                        doctype: 'Comment',
                        comment_type: 'Comment',
                        reference_doctype: 'HD Ticket',
                        reference_name: activeTicketForComment.name,
                        content: `<p>${commentText.replace(/\n/g, '<br>')}</p>`
                    }
                })
            });

            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            if (data.message) {
                toast.success('Comment added successfully');
                setCommentText('');
                setIsCommentModalOpen(false);
                refetchTickets();
            } else {
                throw new Error('Failed to insert comment');
            }
        } catch (e: any) {
            console.error('Failed to create comment:', e);
            toast.error(e.message || 'Failed to add comment');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('ticketsSearchQuery', searchQuery);
    }, [searchQuery]);

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

    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(v => v).length;
    }, [columnVisibility]);

    const totalTableWidth = useMemo(() => {
        let width = 48 + 200 + 80; // checkbox + ticket id (pinned) + actions
        if (columnVisibility.subject) width += columnWidths.subject;
        if (columnVisibility.raised_by) width += columnWidths.raised_by;
        if (columnVisibility.priority) width += columnWidths.priority;
        if (columnVisibility.ticket_type) width += columnWidths.ticket_type;
        if (columnVisibility.agent_group) width += columnWidths.agent_group;
        if (columnVisibility.status) width += columnWidths.status;
        if (columnVisibility.assigned_to) width += columnWidths.assigned_to;
        if (columnVisibility.creation) width += columnWidths.creation;
        if (columnVisibility.modified) width += columnWidths.modified;
        return width;
    }, [columnVisibility, columnWidths]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];

        if (debouncedSearchQuery) {
            if (/^\d+$/.test(debouncedSearchQuery)) {
                activeFilters.push(['name', 'like', `%${debouncedSearchQuery}%`]);
            } else if (debouncedSearchQuery.includes('@')) {
                activeFilters.push(['raised_by', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                activeFilters.push(['subject', 'like', `%${debouncedSearchQuery}%`]);
            }
        }

        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['creation', '>=', `${formatLocal(dateRange[0])} 00:00:00`]);
            activeFilters.push(['creation', '<=', `${formatLocal(dateRange[1])} 23:59:59`]);
        }

        for (const f of advancedFilters) {
            if (!f.field || !f.operator) continue;
            if (Array.isArray(f.value)) {
                if (f.value[0] && f.value[1]) {
                    activeFilters.push([f.field, f.operator, f.value]);
                }
            } else if (f.value) {
                activeFilters.push([f.field, f.operator, f.value]);
            }
        }

        return activeFilters;
    }, [debouncedSearchQuery, dateRange, advancedFilters]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'Others') {
                activeFilters.push(['status', 'not in', ['Open', 'Replied', 'Resolved', 'Closed']]);
            } else {
                activeFilters.push(['status', '=', statusFilter]);
            }
        }
        return activeFilters;
    }, [totalFilters, statusFilter]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    // Fetch dashboard chart data for status breakdown (1 API call instead of separate counts)
    const { data: chartData, error: chartError, mutate: mutateChart } = useSWR<any>(
        [`${API_BASE_URL}/api/method/frappe.desk.doctype.dashboard_chart.dashboard_chart.get`, JSON.stringify({
            chart_name: 'Status-3',
            filters: JSON.stringify(totalFilters),
            refresh: 1
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 0 }
    );

    const chartCounts = useMemo(() => {
        let total = 0;
        let openC = 0;
        let repliedC = 0;
        let resolvedC = 0;
        let closedC = 0;
        let othersC = 0;

        if (chartData && chartData.labels && chartData.datasets?.[0]?.values) {
            const labels = chartData.labels;
            const values = chartData.datasets[0].values;

            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                const value = Number(values[i]) || 0;
                total += value;

                const lowerLabel = (label || '').toLowerCase();
                if (lowerLabel === 'open') {
                    openC = value;
                } else if (lowerLabel === 'replied') {
                    repliedC = value;
                } else if (lowerLabel === 'resolved') {
                    resolvedC = value;
                } else if (lowerLabel === 'closed') {
                    closedC = value;
                } else {
                    othersC += value;
                }
            }
        }

        return {
            totalCount: total,
            openCount: openC,
            repliedCount: repliedC,
            resolvedCount: resolvedC,
            closedCount: closedC,
            othersCount: othersC
        };
    }, [chartData]);

    const {
        totalCount,
        openCount,
        repliedCount,
        resolvedCount,
        closedCount,
        othersCount
    } = chartCounts;

    const orderBy = useMemo(() => {
        if (!sortConfig) {
            return 'creation desc';
        }
        return `${sortConfig.key} ${sortConfig.direction}`;
    }, [sortConfig]);

    const {
        data: ticketsData = [],
        error: listError,
        isLoading,
        mutate: refetchTickets
    } = useSWR<any[]>(
        [`${API_BASE_URL}/api/method/frappe.client.get_list`, JSON.stringify({
            doctype: 'HD Ticket',
            fields: [
                'name',
                'subject',
                'raised_by',
                'custom_allocated_code',
                'custom_allocated_person_name',
                'status',
                'priority',
                'ticket_type',
                'agent_group',
                '_comments',
                '_assign',
                'creation',
                'modified',
            ],
            filters,
            order_by: orderBy,
            limit_start: (currentPage - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 0 }
    );

    useEffect(() => {
        const errors = [listError, chartError];
        for (const err of errors) {
            if (err) {
                const status = err.status;
                const info = err.info || {};
                const exception = info.exception || "";
                const exc_type = info.exc_type || "";
                const _server_messages = info._server_messages || "";
                const message = info.message || err.message || "";

                const is403 = status === 403;
                const isPermissionError =
                    exception.includes('PermissionError') ||
                    exc_type === 'PermissionError' ||
                    _server_messages.includes('PermissionError') ||
                    _server_messages.includes('Insufficient Permission') ||
                    message.includes('PermissionError') ||
                    message.includes('Insufficient Permission');

                if (is403 || isPermissionError) {
                    let msg = "Insufficient Permission for HD Ticket";
                    try {
                        if (_server_messages) {
                            const parsedMsgs = JSON.parse(_server_messages);
                            if (Array.isArray(parsedMsgs) && parsedMsgs[0]?.message) {
                                msg = parsedMsgs[0].message.replace(/<[^>]*>/g, '');
                            }
                        } else if (message) {
                            msg = message;
                        }
                    } catch (e) {
                        if (message) msg = message;
                    }
                    setPermissionError(msg);
                    break;
                }
            }
        }
    }, [listError, chartError]);

    const error = listError ? (typeof listError === 'string' ? listError : (listError.message || 'An error occurred')) : permissionError;

    const handleSort = (key: keyof TicketItem) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig?.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                refetchTickets(),
                mutateChart(),
            ]);
            toast.success('Tickets data refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setDateRange(null);
        setAdvancedFilters([]);
        setCurrentPage(1);
        toast.success('All search criteria and filters have been cleared.');
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: totalCount });
        try {
            let allData: any[] = [];
            let current_limit_start = 0;
            const limit_page_length = 5000;
            let hasMore = true;

            const headers = { 'Content-Type': 'application/json' };

            while (hasMore) {
                const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'HD Ticket',
                        fields: [
                            'name',
                            'subject',
                            'raised_by',
                            'status',
                            'priority',
                            'ticket_type',
                            'agent_group',
                            'custom_allocated_code',
                            'custom_allocated_person_name',
                            '_comments',
                            'creation',
                            'modified',
                        ],
                        filters,
                        limit_start: current_limit_start,
                        limit_page_length: limit_page_length
                    })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                });

                const data = res.message;

                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    setExportProgress({ current: allData.length, total: totalCount });
                    if (data.length < limit_page_length) {
                        hasMore = false;
                    } else {
                        current_limit_start += limit_page_length;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (allData.length > 0) {
                const exportData = allData.map(item => ({
                    'Ticket ID': item.name,
                    'Subject': item.subject || '',
                    'Raised By': item.raised_by || '',
                    'Status': item.status || '',
                    'Priority': item.priority || '',
                    'Ticket Type': item.ticket_type || '',
                    'Team': item.agent_group || '',
                    'Allocated Code': item.custom_allocated_code || '',
                    'Allocated Person': item.custom_allocated_person_name || '',
                    'Comments': formatComment(item._comments),
                    'Created Date': item.creation || '',
                    'Modified Date': item.modified || '',
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Tickets_Export_${todayStr}`);
                toast.success('Excel export completed successfully');
            } else {
                toast.error('No records found to export');
            }
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, statusFilter, dateRange]);

    const sortedData = useMemo(() => {
        if (!ticketsData) return [];
        const result = [...ticketsData];
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = (a[sortConfig.key] || '').toString();
                const bValue = (b[sortConfig.key] || '').toString();
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [ticketsData, sortConfig]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const formatValue = (value: string | null | undefined) => value || '-';

    const formatComment = (commentsJson: string | null | undefined) => {
        if (!commentsJson) return '-';
        try {
            const parsed = JSON.parse(commentsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const latest = parsed[parsed.length - 1];
                const rawComment = latest?.comment || '';
                const cleanText = rawComment.replace(/<\/?[^>]+(>|$)/g, "");
                return cleanText || '-';
            }
        } catch (e) {
            console.error('Failed to parse comment JSON:', e);
        }
        return '-';
    };

    const renderStatusBadge = (status: string | null | undefined) => {
        if (!status) return '-';
        return (
            <div className="flex items-center gap-2">
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                    status === 'Open' ? "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400" :
                        status === 'Replied' ? "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
                            status === 'Resolved' ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" :
                                status === 'Closed' ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" :
                                    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                        status === 'Open' ? "bg-blue-500" :
                            status === 'Replied' ? "bg-amber-500" :
                                status === 'Resolved' ? "bg-emerald-500" :
                                    status === 'Closed' ? "bg-slate-500" :
                                        "bg-slate-500"
                    )} />
                    {status === 'Replied' ? 'In Progress' : status}
                </div>
            </div>
        );
    };

    const renderPriorityBadge = (priority: string | null | undefined) => {
        if (!priority) return <span className="text-slate-400 dark:text-slate-500">-</span>;
        const lower = priority.toLowerCase();
        return (
            <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 w-fit",
                lower === 'urgent' ? "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400" :
                    lower === 'high' ? "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400" :
                        lower === 'medium' ? "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
                            lower === 'low' ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" :
                                "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            )}>
                {priority}
            </div>
        );
    };

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-6",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card
                        onClick={() => setStatusFilter('ALL')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 transition-opacity",
                            statusFilter === 'ALL' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Open')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600 transition-opacity",
                            statusFilter === 'Open' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Open</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <CircleDot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{openCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Replied')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transition-opacity",
                            statusFilter === 'Replied' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Progress</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{repliedCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Resolved')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transition-opacity",
                            statusFilter === 'Resolved' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <CircleCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{resolvedCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Closed')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700 transition-opacity",
                            statusFilter === 'Closed' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Closed</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                                <CircleSlash className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{closedCount}</p>
                            )}
                        </div>
                    </Card>

                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Tag className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 text-slate-800 dark:text-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Advanced Filters</p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Use % as wildcard for "like"</span>
                            </div>

                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
                                {draftFilters.map((filter) => (
                                    <div key={filter.id} className="flex items-center gap-2">
                                        {/* Field combobox */}
                                        <Popover
                                            open={fieldComboOpen[filter.id] ?? false}
                                            onOpenChange={(open) => setFieldComboOpen(prev => ({ ...prev, [filter.id]: open }))}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-[150px] justify-between h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0"
                                                >
                                                    <span className="truncate">
                                                        {filter.field
                                                            ? HD_TICKET_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {HD_TICKET_FILTER_FIELDS.map((field) => (
                                                                <CommandItem
                                                                    key={field.value}
                                                                    value={field.label}
                                                                    onSelect={() => {
                                                                        const defaultOp = getOperatorsForType(field.type)[0];
                                                                        const defaultVal = field.type === 'date' && defaultOp === 'Between' ? ['', ''] as [string, string] : '';
                                                                        updateDraftFilter(filter.id, { field: field.value, operator: defaultOp, value: defaultVal });
                                                                        setFieldComboOpen(prev => ({ ...prev, [filter.id]: false }));
                                                                    }}
                                                                    className="text-xs"
                                                                >
                                                                    <Check className={cn('mr-2 h-3 w-3', filter.field === field.value ? 'opacity-100' : 'opacity-0')} />
                                                                    {field.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Operator */}
                                        {filter.field && (
                                            <Select
                                                value={filter.operator}
                                                onValueChange={(val) => {
                                                    const newVal = val === 'Between' ? ['', ''] as [string, string] : '';
                                                    updateDraftFilter(filter.id, { operator: val, value: newVal });
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shrink-0">
                                                    <SelectValue placeholder="Operator" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                    {getOperatorsForType(getFieldType(filter.field)).map((op: string) => (
                                                        <SelectItem key={op} value={op} className="text-xs">
                                                            {OPERATOR_LABELS[op] ?? op}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {/* Value */}
                                        {filter.field && filter.operator && (
                                            getFieldType(filter.field) === 'select' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select option..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                        {getFieldOptions(filter.field).map((opt: string) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">{opt === 'Replied' ? 'In Progress' : opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : filter.operator === 'Between' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400 dark:text-slate-500'
                                                            )}
                                                        >
                                                            <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400" />
                                                            <span className="truncate">
                                                                {Array.isArray(filter.value) && filter.value[0]
                                                                    ? filter.value[1]
                                                                        ? `${filter.value[0]} → ${filter.value[1]}`
                                                                        : filter.value[0]
                                                                    : 'Pick date range'}
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[60]" align="start">
                                                        <Calendar
                                                            mode="range"
                                                            selected={{
                                                                from: Array.isArray(filter.value) && filter.value[0]
                                                                    ? (() => { const [y, m, d] = filter.value[0].split('-').map(Number); return new Date(y, m - 1, d); })()
                                                                    : undefined,
                                                                to: Array.isArray(filter.value) && filter.value[1]
                                                                    ? (() => { const [y, m, d] = filter.value[1].split('-').map(Number); return new Date(y, m - 1, d); })()
                                                                    : undefined,
                                                            }}
                                                            onSelect={(range) => {
                                                                const fmt = (dt: Date | undefined) => {
                                                                    if (!dt) return '';
                                                                    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                                                                };
                                                                updateDraftFilter(filter.id, { value: [fmt(range?.from), fmt(range?.to)] });
                                                            }}
                                                            numberOfMonths={2}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : filter.operator === 'Timespan' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select period..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                        <SelectItem value="today" className="text-xs">Today</SelectItem>
                                                        <SelectItem value="yesterday" className="text-xs">Yesterday</SelectItem>
                                                        <SelectItem value="last week" className="text-xs">Last Week</SelectItem>
                                                        <SelectItem value="this week" className="text-xs">This Week</SelectItem>
                                                        <SelectItem value="last month" className="text-xs">Last Month</SelectItem>
                                                        <SelectItem value="this month" className="text-xs">This Month</SelectItem>
                                                        <SelectItem value="this quarter" className="text-xs">This Quarter</SelectItem>
                                                        <SelectItem value="last quarter" className="text-xs">Last Quarter</SelectItem>
                                                        <SelectItem value="this year" className="text-xs">This Year</SelectItem>
                                                        <SelectItem value="last year" className="text-xs">Last Year</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={getFieldType(filter.field) === 'date' ? 'date' : 'text'}
                                                    placeholder="Value"
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg"
                                                />
                                            )
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 shrink-0"
                                            onClick={() => removeDraftFilter(filter.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-t-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                    <Tag className="w-3.5 h-3.5" /> Add Condition
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAdvancedFilters}
                                        className="h-8 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={applyAdvancedFilters}
                                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-[260px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Creation Date Range"
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Replied">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedRows.size > 0 && (
                        <div className="flex items-center gap-2 px-3 h-10 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">
                                {selectedRows.size} Selected
                            </span>
                            <div className="h-4 w-[1px] bg-purple-200 mx-1" />
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRows(new Set())} className="h-6 w-6 text-purple-700 hover:bg-purple-100 rounded-md" title="Clear selection">
                                <X className="w-3.5 h-3.5 animate-in" />
                            </Button>
                        </div>
                    )}

                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Subject, ID, Email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>



                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'subject', label: 'Subject' },
                                    { id: 'raised_by', label: 'Raised By' },
                                    { id: 'priority', label: 'Priority' },
                                    { id: 'ticket_type', label: 'Ticket Type' },
                                    { id: 'agent_group', label: 'Team' },
                                    { id: 'status', label: 'Status' },
                                    { id: 'assigned_to', label: 'Assigned To' },
                                    { id: 'creation', label: 'Created At' },
                                    { id: 'modified', label: 'Modified At' },
                                ].map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        className="capitalize cursor-pointer"
                                        checked={columnVisibility[col.id]}
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility(prev => ({ ...prev, [col.id]: checked }))
                                        }
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {(searchQuery || statusFilter !== 'ALL' || dateRange !== null || advancedFilters.length > 0) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResetFilters}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Reset
                        </Button>
                    )}

                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5 animate-bounce shrink-0" />
                    {error}
                </div>
            )}

            {/* Table Section */}
            <Card className={cn(
                "border-none shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col",
                scrollWholePage ? "" : "flex-1 min-h-0 overflow-hidden"
            )}>
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="text-sm table-fixed" style={{ width: '100%', minWidth: totalTableWidth }}>
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                <th className="text-left py-3 px-4 sticky left-0 bg-slate-50 dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-20" style={{ width: 48, minWidth: 48, maxWidth: 48 }}>
                                    <Checkbox
                                        checked={sortedData.length > 0 && sortedData.every(row => selectedRows.has(row.name))}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedRows(new Set(sortedData.map(row => row.name)));
                                            } else {
                                                setSelectedRows(new Set());
                                            }
                                        }}
                                    />
                                </th>
                                <th className="text-left py-3 px-4 sticky left-[48px] bg-slate-50 dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-20 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('name')} style={{ width: 200, minWidth: 200, maxWidth: 200 }}>
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        Ticket ID
                                        {sortConfig?.key === 'name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                    </div>
                                </th>
                                {columnOrder.map((colId, index) => {
                                    if (!columnVisibility[colId]) return null;

                                    let content: React.ReactNode = null;
                                    let onClickHandler: (() => void) | undefined = undefined;

                                    if (colId === 'subject') {
                                        onClickHandler = () => handleSort('subject');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Subject
                                                {sortConfig?.key === 'subject' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'raised_by') {
                                        onClickHandler = () => handleSort('raised_by');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Raised By
                                                {sortConfig?.key === 'raised_by' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'priority') {
                                        content = <div className="truncate pr-2">Priority</div>;
                                    } else if (colId === 'ticket_type') {
                                        content = <div className="truncate pr-2">Ticket Type</div>;
                                    } else if (colId === 'agent_group') {
                                        content = <div className="truncate pr-2">Team</div>;
                                    } else if (colId === 'status') {
                                        onClickHandler = () => handleSort('status');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Status
                                                {sortConfig?.key === 'status' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'assigned_to') {
                                        onClickHandler = () => handleSort('custom_allocated_person_name');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Assigned To
                                                {sortConfig?.key === 'custom_allocated_person_name' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'creation') {
                                        onClickHandler = () => handleSort('creation');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Created At
                                                {sortConfig?.key === 'creation' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    } else if (colId === 'modified') {
                                        onClickHandler = () => handleSort('modified');
                                        content = (
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                Modified At
                                                {sortConfig?.key === 'modified' ? (
                                                    sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                                ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400 shrink-0" />}
                                            </div>
                                        );
                                    }

                                    return (
                                        <th
                                            key={colId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => {
                                                handleDragOver(e);
                                                setDraggedOverIndex(index);
                                            }}
                                            onDragLeave={() => setDraggedOverIndex(null)}
                                            onDragEnd={() => {
                                                setDraggedIndex(null);
                                                setDraggedOverIndex(null);
                                            }}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={cn(
                                                "text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-grab active:cursor-grabbing select-none group/col relative transition-all duration-150 hover:bg-slate-100/50 dark:hover:bg-slate-800/30",
                                                draggedIndex !== null && draggedIndex !== index && draggedOverIndex === index && "bg-purple-50/50 dark:bg-purple-950/10"
                                            )}
                                            onClick={onClickHandler}
                                            style={{
                                                width: columnWidths[colId],
                                                minWidth: columnWidths[colId],
                                                maxWidth: columnWidths[colId]
                                            }}
                                        >
                                            {content}
                                            {renderResizeHandle(colId)}
                                            {draggedOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 w-1 bg-purple-600 z-30 pointer-events-none animate-pulse",
                                                    draggedIndex < index ? "right-0" : "left-0"
                                                )} />
                                            )}
                                        </th>
                                    );
                                })}
                                <th className="p-0 m-0 border-none w-auto" style={{ minWidth: 0 }} />
                                <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 sticky right-0 bg-slate-50 dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-20" style={{ width: 80, minWidth: 80, maxWidth: 80 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={visibleColumnCount + 4} className="p-4">
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row: TicketItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group whitespace-nowrap"
                                    >
                                        <td className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800" onClick={(e) => e.stopPropagation()} style={{ width: 48, minWidth: 48, maxWidth: 48 }}>
                                            <Checkbox
                                                checked={selectedRows.has(row.name)}
                                                onCheckedChange={(checked) => {
                                                    const next = new Set(selectedRows);
                                                    if (checked) {
                                                        next.add(row.name);
                                                    } else {
                                                        next.delete(row.name);
                                                    }
                                                    setSelectedRows(next);
                                                }}
                                            />
                                        </td>
                                        <td className="py-3 px-4 sticky left-[48px] bg-white dark:bg-slate-900 border-r border-r-slate-100 dark:border-r-slate-800/50 z-10 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/40" style={{ width: 200, minWidth: 200, maxWidth: 200 }}>
                                            <button
                                                onClick={() => navigate(`/ticketing/${row.name}`)}
                                                className="font-extrabold text-purple-600 dark:text-purple-400 leading-tight hover:text-purple-700 dark:hover:text-purple-300 transition-colors text-left focus:outline-none truncate block w-full"
                                            >
                                                {row.name}
                                            </button>
                                        </td>
                                        {columnOrder.map((colId) => {
                                            if (!columnVisibility[colId]) return null;
                                            if (colId === 'subject') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.subject, minWidth: columnWidths.subject, maxWidth: columnWidths.subject }} title={row.subject}>
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">{formatValue(row.subject)}</span>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'raised_by') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.raised_by, minWidth: columnWidths.raised_by, maxWidth: columnWidths.raised_by }}>
                                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                                                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-xs truncate">{formatValue(row.raised_by)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'priority') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.priority, minWidth: columnWidths.priority, maxWidth: columnWidths.priority }}>
                                                        {renderPriorityBadge(row.priority)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'ticket_type') {
                                                return (
                                                    <td key={colId} className="py-3 px-4 text-slate-500 dark:text-slate-400 truncate" style={{ width: columnWidths.ticket_type, minWidth: columnWidths.ticket_type, maxWidth: columnWidths.ticket_type }}>
                                                        {formatValue(row.ticket_type)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'agent_group') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.agent_group, minWidth: columnWidths.agent_group, maxWidth: columnWidths.agent_group }}>
                                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                                                            <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="truncate">{formatValue(row.agent_group)}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'status') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.status, minWidth: columnWidths.status, maxWidth: columnWidths.status }}>
                                                        {renderStatusBadge(row.status)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'assigned_to') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.assigned_to, minWidth: columnWidths.assigned_to, maxWidth: columnWidths.assigned_to }}>
                                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs truncate">
                                                            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] shrink-0">
                                                                <User className="w-3 h-3" />
                                                            </div>
                                                            <span className="truncate">
                                                                {row.custom_allocated_person_name || row.custom_allocated_code ? (
                                                                    `${row.custom_allocated_person_name || ''} ${row.custom_allocated_code ? `(${row.custom_allocated_code})` : ''}`.trim()
                                                                ) : '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'creation') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.creation, minWidth: columnWidths.creation, maxWidth: columnWidths.creation }}>
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                                                            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-[12px] font-medium truncate">{row.creation ? row.creation.split(' ')[0] : ''}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (colId === 'modified') {
                                                return (
                                                    <td key={colId} className="py-3 px-4" style={{ width: columnWidths.modified, minWidth: columnWidths.modified, maxWidth: columnWidths.modified }}>
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                                                            <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                                            <span className="text-[12px] font-medium truncate">{row.modified ? row.modified.split(' ')[0] : ''}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return null;
                                        })}
                                        {/* Spacer Column */}
                                        <td className="p-0 m-0 border-none w-auto" style={{ minWidth: 0 }} />
                                        <td className="py-3 px-4 text-right sticky right-0 bg-white dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800" onClick={(e) => e.stopPropagation()} style={{ width: 80, minWidth: 80, maxWidth: 80 }}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl p-1.5">
                                                    <DropdownMenuLabel className="text-sm font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5">Change Status</DropdownMenuLabel>
                                                    {['Open', 'Replied', 'Resolved', 'Closed']
                                                        .filter(s => s !== row.status)
                                                        .map((status) => (
                                                            <DropdownMenuItem
                                                                key={status}
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc('HD Ticket', row.name, { status });
                                                                        toast.success(`Status updated to ${status === 'Replied' ? 'In Progress' : status}`);
                                                                        refetchTickets();
                                                                        mutateChart();
                                                                    } catch (err) {
                                                                        toast.error('Failed to update status');
                                                                    }
                                                                }}
                                                                className="text-sm py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                                            >
                                                                {status === 'Replied' ? 'In Progress' : status}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1.5" />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setActiveTicketForComment(row);
                                                            setCommentText('');
                                                            setIsCommentModalOpen(true);
                                                        }}
                                                        className="text-sm py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Add Comment
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={visibleColumnCount + 4} className="h-48 text-center text-slate-400 dark:text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Tag className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No results found matching your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableWrapper>

                {/* Status Info Footer */}
                <div className="shrink-0 py-3 px-4 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-200 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-200 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-200 font-bold">{totalCount}</span> tickets
                    </p>
                </div>
            </Card>

            {/* Comment Modal */}
            <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                            Add Comment
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                            Add a new comment for {activeTicketForComment?.subject || 'this ticket'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <textarea
                            className="w-full h-32 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100 transition-all resize-none"
                            placeholder="Write your comment here..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="flex sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsCommentModalOpen(false)}
                            className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddComment}
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-4"
                        >
                            {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Ticket Floating Button & Modal */}
            <CreateTicketFloatingButton onClick={() => setIsCreateModalOpen(true)} />
            <TicketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTicket}
                loading={isSubmittingTicket}
            />
        </div>
    );
};

export default GopocketTickets;
