import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetDocList, useFrappeGetDocCount } from 'frappe-react-sdk';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';
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
import { Calendar } from '@/components/ui/calendar';
import {
    Loader2,
    RefreshCcw,
    Filter,
    ArrowUpDown,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    User,
    AlertCircle,
    CheckCircle,
    Info,
    FileText,
    CircleCheck,
    X,
    Plus,
    Check,
    ChevronsUpDown,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";

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

const ACTIVITY_LOG_FILTER_FIELDS = [
    { value: 'name', label: 'Log ID', type: 'string' },
    { value: 'status', label: 'Status', type: 'string' },
    { value: 'full_name', label: 'User', type: 'string' },
    { value: 'subject', label: 'Subject', type: 'string' },
    { value: 'operation', label: 'Operation', type: 'string' },
    { value: 'creation', label: 'Creation Date', type: 'date' },
] as const;

const STRING_OPERATORS = ['like', '=', '!=', 'not like'] as const;
const DATE_OPERATORS = ['>', '<', '>=', '<=', 'Between', 'Timespan'] as const;

const OPERATOR_LABELS: Record<string, string> = {
    '>': 'After',
    '<': 'Before',
    '>=': 'On or After',
    '<=': 'On or Before',
};

const getOperatorsForType = (type: string) => type === 'date' ? [...DATE_OPERATORS] : [...STRING_OPERATORS];
const getFieldType = (fieldValue: string) => ACTIVITY_LOG_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const ActivityLog: React.FC = () => {
    const navigate = useNavigate();
    // State variables
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [sorting, setSorting] = useState<SortingState>([{ id: 'creation', desc: true }]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
    const [openFilterPanel, setOpenFilterPanel] = useState(false);
    const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
    const [fieldComboOpen, setFieldComboOpen] = useState<Record<string, boolean>>({});

    const hasPermissionError = !!permissionError;

    // Debounce search input
    const debouncedSearchQuery = useDebounce(searchQuery, 400);

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

    // Filters formulation
    const filters = useMemo(() => {
        const activeFilters: any[] = [];
        if (debouncedSearchQuery) {
            // Smart search check: if it starts with AL or a digit, search by name, otherwise by subject
            if (/^(AL|\d)/i.test(debouncedSearchQuery)) {
                activeFilters.push(['name', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                activeFilters.push(['subject', 'like', `%${debouncedSearchQuery}%`]);
            }
        }
        if (statusFilter !== 'ALL') {
            activeFilters.push(['status', '=', statusFilter]);
        }
        
        // Add advanced filters
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
    }, [debouncedSearchQuery, statusFilter, advancedFilters]);

    // Stat cards filters
    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];
        if (debouncedSearchQuery) {
            if (/^(AL|\d)/i.test(debouncedSearchQuery)) {
                activeFilters.push(['name', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                activeFilters.push(['subject', 'like', `%${debouncedSearchQuery}%`]);
            }
        }
        
        // Add advanced filters
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
    }, [debouncedSearchQuery, advancedFilters]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, advancedFilters]);

    // Sorting order representation
    const orderByObj = useMemo(() => {
        if (sorting.length === 0) {
            return { field: 'creation', order: 'desc' as const };
        }
        const sort = sorting[0];
        return {
            field: sort.id,
            order: (sort.desc ? 'desc' : 'asc') as 'desc' | 'asc'
        };
    }, [sorting]);

    // Server-side queries
    const limit_start = (currentPage - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const {
        data: logs,
        isLoading,
        error: listError,
        mutate: mutateList,
    } = useFrappeGetDocList<any>(
        'Activity Log',
        {
            fields: ['name', 'status', 'full_name', 'subject', 'operation', 'creation'],
            filters,
            orderBy: orderByObj,
            limit_start,
            limit,
        },
        hasPermissionError ? null : undefined
    );

    // Dynamic counts queries
    const { data: count = 0, error: countErr, mutate: mutateTotalCount } = useFrappeGetDocCount('Activity Log', totalFilters, false, hasPermissionError ? null : undefined);
    const { data: successCount = 0, error: successErr, mutate: mutateSuccessCount } = useFrappeGetDocCount('Activity Log', [...totalFilters, ['status', '=', 'Success']], false, hasPermissionError ? null : undefined);
    const { data: failedCount = 0, error: failedErr, mutate: mutateFailedCount } = useFrappeGetDocCount('Activity Log', [...totalFilters, ['status', '=', 'Failed']], false, hasPermissionError ? null : undefined);
    const { data: errorCount = 0, error: errorErr, mutate: mutateErrorCount } = useFrappeGetDocCount('Activity Log', [...totalFilters, ['status', '=', 'Error']], false, hasPermissionError ? null : undefined);
    const { data: warningCount = 0, error: warningErr, mutate: mutateWarningCount } = useFrappeGetDocCount('Activity Log', [...totalFilters, ['status', '=', 'Warning']], false, hasPermissionError ? null : undefined);
    const { data: infoCount = 0, error: infoErr, mutate: mutateInfoCount } = useFrappeGetDocCount('Activity Log', [...totalFilters, ['status', '=', 'Info']], false, hasPermissionError ? null : undefined);

    // Watch for 403 / Permission errors across all hooks
    useEffect(() => {
        const errors = [listError, countErr, successErr, failedErr, errorErr, warningErr, infoErr];
        for (const err of errors) {
            if (err) {
                const is403 = err.httpStatus === 403;
                const isPermissionError = 
                    err.exception?.includes('PermissionError') || 
                    err.exc_type === 'PermissionError' ||
                    err._server_messages?.includes('PermissionError') ||
                    err._server_messages?.includes('Insufficient Permission');

                if (is403 || isPermissionError) {
                    let msg = "Insufficient Permission for Activity Log";
                    try {
                        if (err._server_messages) {
                            const parsed = JSON.parse(err._server_messages);
                            if (Array.isArray(parsed) && parsed[0]?.message) {
                                msg = parsed[0].message.replace(/<[^>]*>/g, '');
                            }
                        } else if (err.message) {
                            msg = err.message;
                        }
                    } catch (e) {
                        if (err.message) msg = err.message;
                    }
                    setPermissionError(msg);
                    break;
                }
            }
        }
    }, [listError, countErr, successErr, failedErr, errorErr, warningErr, infoErr]);

    // Save logs to sessionStorage when loaded
    useEffect(() => {
        if (logs) {
            sessionStorage.setItem('activityLogsData', JSON.stringify(logs));
        }
    }, [logs]);

    // Actions
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                mutateList(),
                mutateTotalCount(),
                mutateSuccessCount(),
                mutateFailedCount(),
                mutateErrorCount(),
                mutateWarningCount(),
                mutateInfoCount(),
            ]);
            toast({
                title: "Refreshed",
                description: "Activity logs have been updated.",
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setAdvancedFilters([]);
        setCurrentPage(1);
        toast({
            title: "Filters Reset",
            description: "All search criteria and filters have been cleared.",
        });
    };

    const handleRowClick = (name: string) => {
        navigate(`/activity-log/${name}`);
    };

    // Date/time formatting helper
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr.replace(' ', 'T')); // Handle DB format spacing
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Success': return <CircleCheck className="w-4 h-4 text-green-600" />;
            case 'Failed':
            case 'Error':
                return <AlertCircle className="w-4 h-4 text-red-600" />;
            case 'Warning': return <AlertCircle className="w-4 h-4 text-amber-600" />;
            case 'Info': return <Info className="w-4 h-4 text-blue-600" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    // Columns configuration for TanStack Table
    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4 hover:bg-transparent text-slate-600 font-semibold"
                >
                    Log ID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const name = row.getValue('name') as string;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs uppercase shrink-0">
                            {name?.[0] || 'L'}
                        </div>
                        <button
                            onClick={() => handleRowClick(name)}
                            className="font-semibold text-slate-900 leading-tight hover:text-purple-600 transition-colors text-left focus:outline-none"
                        >
                            {name}
                        </button>
                    </div>
                );
            },
        },
        {
            accessorKey: 'full_name',
            header: 'User',
            cell: ({ row }) => {
                const fullName = row.getValue('full_name') as string;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-900 leading-tight">{fullName || 'System'}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'subject',
            header: 'Subject',
            cell: ({ row }) => {
                const subject = row.getValue('subject') as string;
                return (
                    <span className="text-xs text-slate-500 truncate block max-w-[320px] bg-slate-50 px-2 py-1 rounded" title={subject}>
                        {subject || '-'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'operation',
            header: 'Operation',
            cell: ({ row }) => (
                <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 py-0.5 text-[10px] font-medium">
                    {row.getValue('operation') || 'N/A'}
                </Badge>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return (
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                            status === 'Success' ? "bg-green-100 text-green-700" :
                                status === 'Failed' || status === 'Error' ? "bg-red-100 text-red-700" :
                                    status === 'Warning' ? "bg-amber-100 text-amber-700" :
                                        status === 'Info' ? "bg-blue-100 text-blue-700" :
                                            "bg-slate-100 text-slate-700"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                                status === 'Success' ? "bg-green-500" :
                                    status === 'Failed' || status === 'Error' ? "bg-red-500" :
                                        status === 'Warning' ? "bg-amber-500" :
                                            status === 'Info' ? "bg-blue-500" :
                                                "bg-slate-500"
                            )} />
                            {status}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'creation',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4 hover:bg-transparent text-slate-600 font-semibold"
                >
                    Timestamp
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs whitespace-nowrap">{formatDateTime(row.getValue('creation'))}</span>
                </div>
            ),
        },
    ], [sorting]);

    const table = useReactTable({
        data: logs || [],
        columns,
        manualSorting: true,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        state: {
            sorting,
        },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            {/* Summary Cards Grid */}
            <div className="shrink-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Total Card */}
                    <Card 
                        onClick={() => setStatusFilter('ALL')}
                        className={cn(
                            "p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer",
                            statusFilter === 'ALL' && "ring-2 ring-purple-600 ring-offset-1 border-purple-200"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-slate-50 rounded-lg">
                                <FileText className="w-4 h-4 text-slate-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{count}</p>
                            )}
                        </div>
                    </Card>

                    {[
                        { label: 'Success', key: 'Success', color: 'green', value: successCount },
                        { label: 'Failed', key: 'Failed', color: 'red', value: failedCount },
                        { label: 'Error', key: 'Error', color: 'red', value: errorCount },
                        { label: 'Warning', key: 'Warning', color: 'amber', value: warningCount },
                        { label: 'Info', key: 'Info', color: 'blue', value: infoCount }
                    ].map((item) => (
                        <Card 
                            key={item.key} 
                            onClick={() => setStatusFilter(item.key)}
                            className={cn(
                                "p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer",
                                statusFilter === item.key && "ring-2 ring-purple-600 ring-offset-1 border-purple-200"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-[12px] font-bold uppercase tracking-wider", 
                                        item.color === 'green' && "text-green-600",
                                        item.color === 'red' && "text-red-600",
                                        item.color === 'amber' && "text-amber-600",
                                        item.color === 'blue' && "text-blue-600"
                                    )}>{item.label}</span>
                                    {count > 0 && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                            {(((item.value || 0) / count) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <div className={cn("p-2 rounded-lg", 
                                    item.color === 'green' && "bg-green-50",
                                    item.color === 'red' && "bg-red-50",
                                    item.color === 'amber' && "bg-amber-50",
                                    item.color === 'blue' && "bg-blue-50"
                                )}>
                                    {getStatusIcon(item.key)}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                {isLoading ? (
                                    <Skeleton className="h-8 w-12 mb-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 shadow-xl z-50">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-800">Advanced Filters</p>
                                <span className="text-[9px] text-slate-400 font-medium">Use % as wildcard for "like"</span>
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
                                                    className="w-[150px] justify-between h-8 text-xs font-normal border-slate-200 shrink-0"
                                                >
                                                    <span className="truncate">
                                                        {filter.field
                                                            ? ACTIVITY_LOG_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {ACTIVITY_LOG_FILTER_FIELDS.map((field) => (
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
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 shrink-0">
                                                    <SelectValue placeholder="Operator" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
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
                                            filter.operator === 'Between' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400'
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
                                                    <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 shadow-xl z-[60]" align="start">
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
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200">
                                                        <SelectValue placeholder="Select period..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
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
                                                    className="flex-1 h-8 text-xs border-slate-200 rounded-lg"
                                                />
                                            )
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500 shrink-0"
                                            onClick={() => removeDraftFilter(filter.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 border-slate-200"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Condition
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAdvancedFilters}
                                        className="h-8 text-xs text-slate-500 hover:text-slate-800"
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

                    {/* Status dropdown */}
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
                                <SelectItem value="Success">Success</SelectItem>
                                <SelectItem value="Failed">Failed</SelectItem>
                                <SelectItem value="Error">Error</SelectItem>
                                <SelectItem value="Warning">Warning</SelectItem>
                                <SelectItem value="Info">Info</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Log ID or Subject..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>

                    {/* Refresh button */}
                    <Button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {/* Reset Filters */}
                    {(searchQuery || statusFilter !== 'ALL' || advancedFilters.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={handleResetFilters}
                            className="text-slate-500 hover:text-slate-900 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50"
                        >
                            Reset
                        </Button>
                    )}

                    {/* Pagination Controls nested inside Filters Row */}
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

            {/* Data Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm bg-white rounded-2xl border border-slate-100 relative group/table overflow-hidden">
                <ScrollArea className="flex-1 w-full h-full">
                    <table className="w-full caption-bottom text-sm relative min-w-[1000px]">
                        <TableHeader className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-slate-50/95 backdrop-blur-md border-b border-slate-100 hover:bg-slate-50/95 transition-none">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="font-semibold text-slate-600 h-11 whitespace-nowrap">
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
                            {permissionError ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-64 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">Permission Error</p>
                                                <p className="text-xs text-red-600 mt-1 max-w-md mx-auto leading-relaxed">{permissionError}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i} className="border-0">
                                        {columns.map((_, j) => (
                                            <TableCell key={j} className="py-4">
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : logs && logs.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="border-0 hover:bg-slate-50/50 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3 whitespace-nowrap">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-64 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Search className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600">No activity logs found</p>
                                                <p className="text-xs text-slate-400">Try adjusting your filters to find what you're looking for.</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-xl border-slate-200">
                                                Clear Search Filters
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </table>
                </ScrollArea>
            </Card>


        </div>
    );
};

export default ActivityLog;
