import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionModal, type SubscriptionFormData } from '@/components/SubscriptionPage/SubscriptionModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from "@/components/ui/dropdown-menu";
import {
    CreditCard,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Filter,
    Columns3,
    CalendarClock,
    Plus,
    Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';

const PAGE_LENGTH = 20;

export interface SubscriptionItem {
    name: string;
    tool_name: string;
    amount: number;
    incentive_amount: number;
    first_amount_date: string | null;
    start_date: string | null;
    end_date: string | null;
    payment_reference_number: string | null;
    status: string;
    created_by: string | null;
    subscriber: string | null;
    client_code: string | null;
    trading_view_id: string | null;
    client_name: string | null;
    payment_date: string | null;
}

interface SummaryData {
    Approved: number;
    Rejected: number;
    Pending: number;
    Expired: number;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const getDaysRemaining = (endDate: string | null): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const DaysRemainingBadge: React.FC<{ endDate: string | null }> = ({ endDate }) => {
    const days = getDaysRemaining(endDate);
    if (days === null) return <span className="text-slate-400 text-xs">-</span>;

    if (days > 7) {
        return (
            <Badge className="bg-green-100 text-green-700 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                {days} days remaining
            </Badge>
        );
    }
    if (days > 0) {
        return (
            <Badge className="bg-amber-100 text-amber-700 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                {days} {days === 1 ? 'day' : 'days'} remaining
            </Badge>
        );
    }
    if (days === 0) {
        return (
            <Badge className="bg-amber-100 text-amber-700 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                Expires today
            </Badge>
        );
    }
    return (
        <Badge className="bg-red-100 text-red-700 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
            Expired {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} ago
        </Badge>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        approved: 'bg-green-700 text-white',
        pending: 'bg-amber-100 text-amber-700',
        expired: 'bg-red-100 text-red-700',
        rejected: 'bg-slate-100 text-slate-500',
    };
    const key = status?.toLowerCase() || '';
    const style = styles[key] || 'bg-slate-100 text-slate-600';
    return (
        <Badge className={cn('capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]', style)}>
            {status || 'Unknown'}
        </Badge>
    );
};

const Subscription: React.FC = () => {
    const { token } = useAuth();

    const [data, setData] = useState<SubscriptionItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [summary, setSummary] = useState<SummaryData>({ Approved: 0, Rejected: 0, Pending: 0, Expired: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [toolFilter, setToolFilter] = useState('ALL');
    const [clientCodeSearch, setClientCodeSearch] = useState('');
    const [createdBySearch, setCreatedBySearch] = useState('');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [sortConfig, setSortConfig] = useState<{ key: keyof SubscriptionItem; direction: 'asc' | 'desc' } | null>(null);

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('subscriptionColumnVisibility');
        return stored ? JSON.parse(stored) : {
            client_name: true,
            tool_name: true,
            amount: true,
            incentive_amount: false,
            start_date: true,
            end_date: true,
            days_remaining: true,
            payment_reference_number: false,
            payment_date: true,
            created_by: true,
            trading_view_id: false,
        };
    });

    useEffect(() => {
        localStorage.setItem('subscriptionColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    const debouncedClientCode = useDebounce(clientCodeSearch, 400);
    const debouncedCreatedBy = useDebounce(createdBySearch, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange]);

    const fetchData = useCallback(async (
        page: number,
        clientCode: string,
        createdBy: string,
        status: string,
        tool: string,
        dates: [Date, Date] | null,
    ) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

            const body: Record<string, unknown> = {
                page,
                page_length: PAGE_LENGTH,
            };

            if (clientCode) body.client_code = clientCode;
            if (createdBy) body.created_by = createdBy;
            if (status !== 'ALL') body.status = status;
            if (tool !== 'ALL') body.tool_name = tool;

            if (dates?.[0] && dates?.[1]) {
                const fmt = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                body.from_date = fmt(dates[0]);
                body.to_date = fmt(dates[1]);
            }

            const res = await fetch(`${API_BASE_URL}/api/method/rms.subscription.get_subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const json = await res.json();
            const msg = json.message;

            if (msg?.status === 'success') {
                setData(msg.tools_subscription || []);
                setTotalCount(msg.pagination?.total_count ?? 0);
                setTotalPages(msg.pagination?.total_pages ?? 1);
                if (msg.summary) setSummary(msg.summary);
            } else {
                throw new Error(msg?.message || 'Unexpected response format');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load subscriptions');
            toast.error('Failed to load subscriptions');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData(currentPage, debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange);
    }, [currentPage, debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange, fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchData(currentPage, debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreate = async (formData: SubscriptionFormData) => {
        if (!token) return;
        setIsCreating(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const res = await fetch(`${API_BASE_URL}/api/method/rms.subscription.create_subscriber`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const json = await res.json();
            if (json.message?.status === 'success' || res.ok) {
                toast.success('Subscription created successfully');
                setIsModalOpen(false);
                await fetchData(currentPage, debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange);
            } else {
                throw new Error(json.message?.message || 'Failed to create subscription');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to create subscription');
        } finally {
            setIsCreating(false);
        }
    };

    const handleSort = (key: keyof SubscriptionItem) => {
        setSortConfig(prev =>
            prev?.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        );
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;
        return [...data].sort((a, b) => {
            const aVal = String(a[sortConfig.key] ?? '');
            const bVal = String(b[sortConfig.key] ?? '');
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const visibleColumnCount = useMemo(() =>
        2 + Object.values(columnVisibility).filter(Boolean).length,
        [columnVisibility]
    );

    const SortIcon = ({ col }: { col: keyof SubscriptionItem }) => {
        if (sortConfig?.key !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-4 h-4 text-purple-600" />
            : <ChevronDown className="w-4 h-4 text-purple-600" />;
    };

    const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_LENGTH + 1;
    const rangeEnd = Math.min(currentPage * PAGE_LENGTH, totalCount);

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            <div className="shrink-0 space-y-4">
                {/* Stats Cards — driven by API summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <CreditCard className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 uppercase tracking-wider">Approved</span>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900">{summary.Approved}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 uppercase tracking-wider">Pending</span>
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900">{summary.Pending}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 uppercase tracking-wider">Expired</span>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <XCircle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900">{summary.Expired}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Ban className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900">{summary.Rejected}</p>
                        )}
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Payment Date Range */}
                    <div className="w-[230px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Payment Date Range"
                            className="w-full bg-white border-slate-200 rounded-xl custom-date-picker h-10"
                            appearance="default"
                            block
                        />
                    </div>

                    {/* Status */}
                    <div className="w-[155px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Expired">Expired</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tool Name */}
                    <div className="w-[155px]">
                        <Select value={toolFilter} onValueChange={setToolFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Tool" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Tools</SelectItem>
                                <SelectItem value="Option 10">Option 10</SelectItem>
                                <SelectItem value="Option Bulls">Option Bulls</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Client Code */}
                    <div className="relative w-[170px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Client code..."
                            value={clientCodeSearch}
                            onChange={(e) => setClientCodeSearch(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>

                    {/* Created By */}
                    <div className="relative w-[160px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Created by..."
                            value={createdBySearch}
                            onChange={(e) => setCreatedBySearch(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>

                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'client_name', label: 'Client Name' },
                                    { id: 'tool_name', label: 'Tool Name' },
                                    { id: 'amount', label: 'Amount' },
                                    { id: 'incentive_amount', label: 'Incentive' },
                                    { id: 'start_date', label: 'Start Date' },
                                    { id: 'end_date', label: 'End Date' },
                                    { id: 'days_remaining', label: 'Days Remaining' },
                                    { id: 'payment_reference_number', label: 'Payment Ref' },
                                    { id: 'payment_date', label: 'Payment Date' },
                                    { id: 'created_by', label: 'Created By' },
                                    { id: 'trading_view_id', label: 'TradingView ID' },
                                ].map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
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

                    {/* Pagination */}
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
                            disabled={currentPage >= totalPages || totalPages === 0 || isLoading}
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

            {/* Table */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white rounded-2xl border border-slate-100">
                <ScrollArea className="flex-1">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('client_code')}>
                                    <div className="flex items-center gap-2">
                                        Client Code
                                        <SortIcon col="client_code" />
                                    </div>
                                </th>
                                {columnVisibility.client_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('client_name')}>
                                        <div className="flex items-center gap-2">
                                            Client Name
                                            <SortIcon col="client_name" />
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.tool_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('tool_name')}>
                                        <div className="flex items-center gap-2">
                                            Tool Name
                                            <SortIcon col="tool_name" />
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.amount && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Amount</th>
                                )}
                                {columnVisibility.incentive_amount && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Incentive</th>
                                )}
                                {columnVisibility.start_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Start Date</th>
                                )}
                                {columnVisibility.end_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">End Date</th>
                                )}
                                {columnVisibility.days_remaining && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                            Remaining
                                        </div>
                                    </th>
                                )}
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Status</th>
                                {columnVisibility.payment_reference_number && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Payment Ref</th>
                                )}
                                {columnVisibility.payment_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Payment Date</th>
                                )}
                                {columnVisibility.created_by && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">Created By</th>
                                )}
                                {columnVisibility.trading_view_id && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 whitespace-nowrap">TV ID</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={visibleColumnCount} className="p-4">
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row, i) => (
                                    <tr key={row.name || i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-4 font-semibold text-slate-900 leading-tight whitespace-nowrap">
                                            {row.client_code || '-'}
                                        </td>
                                        {columnVisibility.client_name && (
                                            <td className="py-4 px-4 text-slate-600">{row.client_name || '-'}</td>
                                        )}
                                        {columnVisibility.tool_name && (
                                            <td className="py-4 px-4 text-slate-700 font-medium">{row.tool_name || '-'}</td>
                                        )}
                                        {columnVisibility.amount && (
                                            <td className="py-4 px-4 text-slate-700 font-mono text-xs font-semibold">
                                                {row.amount != null ? `₹${row.amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.incentive_amount && (
                                            <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                                                {row.incentive_amount != null ? `₹${row.incentive_amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.start_date && (
                                            <td className="py-4 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                                {row.start_date || '-'}
                                            </td>
                                        )}
                                        {columnVisibility.end_date && (
                                            <td className="py-4 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                                {row.end_date || '-'}
                                            </td>
                                        )}
                                        {columnVisibility.days_remaining && (
                                            <td className="py-4 px-4">
                                                <DaysRemainingBadge endDate={row.end_date} />
                                            </td>
                                        )}
                                        <td className="py-4 px-4">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        {columnVisibility.payment_reference_number && (
                                            <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                                                {row.payment_reference_number || '-'}
                                            </td>
                                        )}
                                        {columnVisibility.payment_date && (
                                            <td className="py-4 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                                {row.payment_date ? row.payment_date.split(' ')[0] : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.created_by && (
                                            <td className="py-4 px-4 text-slate-500 text-xs">{row.created_by || '-'}</td>
                                        )}
                                        {columnVisibility.trading_view_id && (
                                            <td className="py-4 px-4 text-slate-500 text-xs">{row.trading_view_id || '-'}</td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={visibleColumnCount} className="h-48 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <CreditCard className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No subscriptions found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>

                <div className="shrink-0 py-2 px-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Showing{' '}
                        <span className="text-slate-900 font-bold">{rangeStart}</span>
                        {' '}to{' '}
                        <span className="text-slate-900 font-bold">{rangeEnd}</span>
                        {' '}of{' '}
                        <span className="text-slate-900 font-bold">{totalCount}</span>
                        {' '}subscriptions
                    </p>
                </div>
            </Card>

            {/* Floating Create Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-2xl flex items-center justify-center p-0 transition-all active:scale-90 hover:rotate-90"
                >
                    <Plus className="w-8 h-8" />
                </Button>
            </div>

            <SubscriptionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreate}
                loading={isCreating}
            />
        </div>
    );
};

export default Subscription;
