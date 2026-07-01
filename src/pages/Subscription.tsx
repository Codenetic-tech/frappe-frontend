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
import { DateRangePicker } from '@/components/ui/date-range-picker';

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
    created_user: string | null;
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
    if (days === null) return <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>;

    if (days > 7) {
        return (
            <Badge className="bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                {days} days remaining
            </Badge>
        );
    }
    if (days > 0) {
        return (
            <Badge className="bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                {days} {days === 1 ? 'day' : 'days'} remaining
            </Badge>
        );
    }
    if (days === 0) {
        return (
            <Badge className="bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
                Expires today
            </Badge>
        );
    }
    return (
        <Badge className="bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-none font-semibold text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full">
            Expired {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} ago
        </Badge>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        approved: 'bg-green-700 dark:bg-green-600 text-white',
        pending: 'bg-amber-100 dark:bg-amber-950/20 text-amber-750 dark:text-amber-400',
        expired: 'bg-red-100 dark:bg-red-950/20 text-red-705 dark:text-red-400',
        rejected: 'bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400',
    };
    const key = status?.toLowerCase() || '';
    const style = styles[key] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    return (
        <Badge className={cn('capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]', style)}>
            {status || 'Unknown'}
        </Badge>
    );
};

const Subscription: React.FC = () => {
    const { user } = useAuth();

    const [data, setData] = useState<SubscriptionItem[]>(() => {
        const stored = sessionStorage.getItem('subscriptionData');
        return stored ? JSON.parse(stored) : [];
    });
    const [totalCount, setTotalCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('subscriptionTotalCount');
        return stored ? Number(stored) : 0;
    });
    const [totalPages, setTotalPages] = useState<number>(() => {
        const stored = sessionStorage.getItem('subscriptionTotalPages');
        return stored ? Number(stored) : 1;
    });
    const [summary, setSummary] = useState<SummaryData>(() => {
        const stored = sessionStorage.getItem('subscriptionSummary');
        return stored ? JSON.parse(stored) : { Approved: 0, Rejected: 0, Pending: 0, Expired: 0 };
    });
    const [isLoading, setIsLoading] = useState(() => {
        const stored = sessionStorage.getItem('subscriptionData');
        return stored ? JSON.parse(stored).length === 0 : true;
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Filters with sessionStorage hydration
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('subscriptionStatusFilter') || 'ALL');
    const [toolFilter, setToolFilter] = useState<string>(() => sessionStorage.getItem('subscriptionToolFilter') || 'ALL');
    const [clientCodeSearch, setClientCodeSearch] = useState<string>(() => sessionStorage.getItem('subscriptionClientCodeSearch') || '');
    const [createdBySearch, setCreatedBySearch] = useState<string>(() => sessionStorage.getItem('subscriptionCreatedBySearch') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('subscriptionDateRange');
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
    const [currentPage, setCurrentPage] = useState<number>(() => {
        const stored = sessionStorage.getItem('subscriptionCurrentPage');
        return stored ? Number(stored) : 1;
    });

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

    // Persist filters to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('subscriptionStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('subscriptionToolFilter', toolFilter);
    }, [toolFilter]);

    useEffect(() => {
        sessionStorage.setItem('subscriptionClientCodeSearch', clientCodeSearch);
    }, [clientCodeSearch]);

    useEffect(() => {
        sessionStorage.setItem('subscriptionCreatedBySearch', createdBySearch);
    }, [createdBySearch]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('subscriptionDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('subscriptionDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('subscriptionCurrentPage', String(currentPage));
    }, [currentPage]);

    const debouncedClientCode = useDebounce(clientCodeSearch, 400);
    const debouncedCreatedBy = useDebounce(createdBySearch, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedClientCode, debouncedCreatedBy, statusFilter, toolFilter, dateRange]);

    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];
        if (debouncedClientCode) {
            activeFilters.push(['client_code', 'like', `%${debouncedClientCode}%`]);
        }
        if (debouncedCreatedBy) {
            activeFilters.push(['created_by', 'like', `%${debouncedCreatedBy}%`]);
        }
        if (toolFilter !== 'ALL') {
            activeFilters.push(['tool_name', '=', toolFilter]);
        }
        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['payment_date', '>=', formatLocal(dateRange[0]) + " 00:00:00"]);
            activeFilters.push(['payment_date', '<=', formatLocal(dateRange[1]) + " 23:59:59"]);
        }
        return activeFilters;
    }, [debouncedClientCode, debouncedCreatedBy, toolFilter, dateRange]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            activeFilters.push(['status', '=', statusFilter]);
        }
        return activeFilters;
    }, [totalFilters, statusFilter]);

    const orderByObj = useMemo(() => {
        if (!sortConfig) {
            return { field: 'modified', order: 'desc' as const };
        }
        return {
            field: sortConfig.key,
            order: sortConfig.direction
        };
    }, [sortConfig]);

    const fetchData = useCallback(async () => {
        const savedFiltersStr = sessionStorage.getItem('subscriptionCacheFilters');
        const currentFiltersStr = JSON.stringify(filters);
        const filtersMatch = savedFiltersStr === currentFiltersStr;

        if (!filtersMatch) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            const limit_start = (currentPage - 1) * PAGE_LENGTH;
            const limit_page_length = PAGE_LENGTH;
            const order_by = orderByObj ? `${orderByObj.field} ${orderByObj.order}` : 'modified desc';

            const [
                listRes,
                totalRes,
                approvedRes,
                pendingRes,
                expiredRes,
                rejectedRes
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'Tools Subscription',
                        fields: [
                            'name',
                            'tool_name',
                            'amount',
                            'incentive_amount',
                            'payment_date',
                            'start_date',
                            'end_date',
                            'payment_reference_number',
                            'status',
                            'created_by',
                            'client_code',
                            'trading_view_id',
                            'client_name',
                            'created_user'
                        ],
                        filters,
                        order_by,
                        limit_start,
                        limit_page_length
                    })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Tools Subscription', filters: totalFilters })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Tools Subscription', filters: [...totalFilters, ['status', '=', 'Approved']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Tools Subscription', filters: [...totalFilters, ['status', '=', 'Pending']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Tools Subscription', filters: [...totalFilters, ['status', '=', 'Expired']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Tools Subscription', filters: [...totalFilters, ['status', '=', 'Rejected']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                })
            ]);

            const listData = listRes.message || [];
            setData(listData);
            sessionStorage.setItem('subscriptionData', JSON.stringify(listData));
            sessionStorage.setItem('subscriptionCacheFilters', currentFiltersStr);

            const total = totalRes.message || 0;
            setTotalCount(total);
            sessionStorage.setItem('subscriptionTotalCount', String(total));

            const pages = Math.ceil(total / PAGE_LENGTH) || 1;
            setTotalPages(pages);
            sessionStorage.setItem('subscriptionTotalPages', String(pages));

            const newSummary = {
                Approved: approvedRes.message || 0,
                Pending: pendingRes.message || 0,
                Expired: expiredRes.message || 0,
                Rejected: rejectedRes.message || 0
            };
            setSummary(newSummary);
            sessionStorage.setItem('subscriptionSummary', JSON.stringify(newSummary));

        } catch (err: any) {
            console.error('Error fetching subscriptions:', err);
            setError(err.message || 'Failed to load subscriptions');
            toast.error('Failed to load subscriptions');
        } finally {
            setIsLoading(false);
        }
    }, [filters, totalFilters, currentPage, orderByObj]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchData();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreate = async (formData: SubscriptionFormData) => {
        setIsCreating(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.insert`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    doc: {
                        doctype: 'Tools Subscription',
                        tool_name: formData.tool_name,
                        amount: parseInt(formData.amount, 10),
                        payment_reference_number: formData.payment_reference_number,
                        client_code: formData.client_code,
                        trading_view_id: formData.trading_view_id,
                        payment_date: formData.payment_date,
                        status: 'Pending',
                        created_by: user?.email || user?.id || null
                    }
                }),
            });
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const json = await res.json();
            if (json.message) {
                toast.success('Subscription created successfully');
                setIsModalOpen(false);
                await fetchData();
            } else {
                throw new Error('Failed to create subscription');
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
                    <Card className="p-4 border-border dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-450" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Approved</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.Approved}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.Pending}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Expired</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.Expired}</p>
                        )}
                    </Card>

                    <Card className="p-4 border-border dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rejected</span>
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Ban className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            </div>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : (
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.Rejected}</p>
                        )}
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Payment Date Range */}
                    <div className="w-[230px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Payment Date Range"
                        />
                    </div>

                    {/* Status */}
                    <div className="w-[155px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-purple-500 rounded-xl h-10 text-slate-800 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
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
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-purple-500 rounded-xl h-10 text-slate-800 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <SelectValue placeholder="Tool" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                                <SelectItem value="ALL">All Tools</SelectItem>
                                <SelectItem value="Option 10">Option 10</SelectItem>
                                <SelectItem value="Option Bulls">Option Bulls</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Client Code */}
                    <div className="relative w-[170px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Client code..."
                            value={clientCodeSearch}
                            onChange={(e) => setClientCodeSearch(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-purple-500 rounded-xl h-10 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    {/* Created By */}
                    <div className="relative w-[160px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Created by..."
                            value={createdBySearch}
                            onChange={(e) => setCreatedBySearch(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-purple-500 rounded-xl h-10 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-850 dark:text-slate-200 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-850 dark:text-slate-200 gap-2">
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
                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200">
                            <span className="text-sm font-bold text-purple-600">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}

            {/* Table */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-805">
                <ScrollArea className="flex-1">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('client_code')}>
                                    <div className="flex items-center gap-2">
                                        Client Code
                                        <SortIcon col="client_code" />
                                    </div>
                                </th>
                                {columnVisibility.client_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('client_name')}>
                                        <div className="flex items-center gap-2">
                                            Client Name
                                            <SortIcon col="client_name" />
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.tool_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col whitespace-nowrap" onClick={() => handleSort('tool_name')}>
                                        <div className="flex items-center gap-2">
                                            Tool Name
                                            <SortIcon col="tool_name" />
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.amount && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Amount</th>
                                )}
                                {columnVisibility.incentive_amount && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Incentive</th>
                                )}
                                {columnVisibility.start_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Start Date</th>
                                )}
                                {columnVisibility.end_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">End Date</th>
                                )}
                                {columnVisibility.days_remaining && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarClock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            Remaining
                                        </div>
                                    </th>
                                )}
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Status</th>
                                {columnVisibility.payment_reference_number && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Payment Ref</th>
                                )}
                                {columnVisibility.payment_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Payment Date</th>
                                )}
                                {columnVisibility.created_by && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Created By</th>
                                )}
                                {columnVisibility.trading_view_id && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">TV ID</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
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
                                    <tr key={row.name || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors group">
                                        <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap">
                                            {row.client_code || '-'}
                                        </td>
                                        {columnVisibility.client_name && (
                                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{row.client_name || '-'}</td>
                                        )}
                                        {columnVisibility.tool_name && (
                                            <td className="py-4 px-4 text-slate-700 dark:text-slate-200 font-medium">{row.tool_name || '-'}</td>
                                        )}
                                        {columnVisibility.amount && (
                                            <td className="py-4 px-4 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold">
                                                {row.amount != null ? `₹${row.amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.incentive_amount && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                                {row.incentive_amount != null ? `₹${row.incentive_amount.toLocaleString('en-IN')}` : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.start_date && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                                                {row.start_date || '-'}
                                            </td>
                                        )}
                                        {columnVisibility.end_date && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
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
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                                {row.payment_reference_number || '-'}
                                            </td>
                                        )}
                                        {columnVisibility.payment_date && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                                                {row.payment_date ? row.payment_date.split(' ')[0] : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.created_by && (
                                            <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap">{row.created_user || '-'}</td>
                                        )}
                                        {columnVisibility.trading_view_id && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-xs">{row.trading_view_id || '-'}</td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={visibleColumnCount} className="h-48 text-center text-slate-400 dark:text-slate-650">
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

                <div className="shrink-0 py-2 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing{' '}
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{rangeStart}</span>
                        {' '}to{' '}
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{rangeEnd}</span>
                        {' '}of{' '}
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</span>
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
