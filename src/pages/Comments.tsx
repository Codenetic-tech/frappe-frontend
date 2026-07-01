import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeGetDocList, useFrappeGetDocCount, useFrappeDocTypeEventListener } from 'frappe-react-sdk';
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
    Layers,
    MessageSquare,
    Eye,
    EyeOff,
    CheckCircle2,
    Send,
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

const COMMENT_FILTER_FIELDS = [
    { value: 'name', label: 'Comment ID', type: 'string' },
    { value: 'comment_type', label: 'Comment Type', type: 'string' },
    { value: 'comment_by', label: 'Comment By', type: 'string' },
    { value: 'comment_email', label: 'Comment Email', type: 'string' },
    { value: 'subject', label: 'Subject', type: 'string' },
    { value: 'reference_doctype', label: 'Ref DocType', type: 'string' },
    { value: 'reference_name', label: 'Ref Name', type: 'string' },
    { value: 'creation', label: 'Created On', type: 'date' },
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
const getFieldType = (fieldValue: string) => COMMENT_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const Comments: React.FC = () => {
    const navigate = useNavigate();
    // State variables
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [seenFilter, setSeenFilter] = useState<string>('ALL'); // ALL, SEEN, UNSEEN
    const [publishedFilter, setPublishedFilter] = useState<string>('ALL'); // ALL, PUBLISHED, UNPUBLISHED
    const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, or specific type
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

        // Search filter
        if (debouncedSearchQuery) {
            activeFilters.push([
                'comment_by', 'like', `%${debouncedSearchQuery}%`
            ]);
        }

        // Seen filter
        if (seenFilter === 'SEEN') {
            activeFilters.push(['seen', '=', 1]);
        } else if (seenFilter === 'UNSEEN') {
            activeFilters.push(['seen', '=', 0]);
        }

        // Published filter
        if (publishedFilter === 'PUBLISHED') {
            activeFilters.push(['published', '=', 1]);
        } else if (publishedFilter === 'UNPUBLISHED') {
            activeFilters.push(['published', '=', 0]);
        }

        // Type filter
        if (typeFilter !== 'ALL') {
            activeFilters.push(['comment_type', '=', typeFilter]);
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
    }, [debouncedSearchQuery, seenFilter, publishedFilter, typeFilter, advancedFilters]);

    // Stat cards filters (ignores specific dashboard tab overrides)
    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];
        if (debouncedSearchQuery) {
            activeFilters.push(['comment_by', 'like', `%${debouncedSearchQuery}%`]);
        }
        if (typeFilter !== 'ALL') {
            activeFilters.push(['comment_type', '=', typeFilter]);
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
    }, [debouncedSearchQuery, typeFilter, advancedFilters]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [seenFilter, publishedFilter, typeFilter, advancedFilters]);

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
        data: comments,
        isLoading,
        error: listError,
        mutate: mutateList,
    } = useFrappeGetDocList<any>(
        'Comment',
        {
            fields: ['name', 'comment_type', 'comment_email', 'comment_by', 'subject', 'published', 'seen', 'reference_doctype', 'reference_name', 'content', 'creation'],
            filters,
            orderBy: orderByObj,
            limit_start,
            limit,
        },
        hasPermissionError ? null : undefined
    );

    // Dynamic counts queries
    const { data: count = 0, error: countErr, mutate: mutateTotalCount } = useFrappeGetDocCount('Comment', totalFilters, false, hasPermissionError ? null : undefined);
    const { data: unseenCount = 0, error: unseenErr, mutate: mutateUnseenCount } = useFrappeGetDocCount('Comment', [...totalFilters, ['seen', '=', 0]], false, hasPermissionError ? null : undefined);
    const { data: publishedCount = 0, error: publishedErr, mutate: mutatePublishedCount } = useFrappeGetDocCount('Comment', [...totalFilters, ['published', '=', 1]], false, hasPermissionError ? null : undefined);

    // Watch for 403 / Permission errors across all hooks
    useEffect(() => {
        const errors = [listError, countErr, unseenErr, publishedErr];
        for (const err of errors) {
            if (err) {
                const is403 = err.httpStatus === 403;
                const isPermissionError =
                    err.exception?.includes('PermissionError') ||
                    err.exc_type === 'PermissionError' ||
                    err._server_messages?.includes('PermissionError') ||
                    err._server_messages?.includes('Insufficient Permission');

                if (is403 || isPermissionError) {
                    let msg = "Insufficient Permission for Comments";
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
    }, [listError, countErr, unseenErr, publishedErr]);

    // Save comments to sessionStorage when loaded
    useEffect(() => {
        if (comments) {
            sessionStorage.setItem('commentsData', JSON.stringify(comments));
        }
    }, [comments]);

    // Actions
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                mutateList(),
                mutateTotalCount(),
                mutateUnseenCount(),
                mutatePublishedCount(),
            ]);
            toast({
                title: "Refreshed",
                description: "Comments list has been updated.",
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSeenFilter('ALL');
        setPublishedFilter('ALL');
        setTypeFilter('ALL');
        setAdvancedFilters([]);
        setCurrentPage(1);
        toast({
            title: "Filters Reset",
            description: "All search criteria and filters have been cleared.",
        });
    };

    const handleRowClick = (name: string) => {
        navigate(`/comments/${name}`);
    };

    // Date/time formatting helper
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    // Strip HTML Tags
    const stripHtml = (html?: string) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Real-time listener for Comments list updates
    const handleListUpdate = React.useCallback((eventData: any) => {
        // console.log('Realtime Comments event:', eventData);
        mutateList();
        mutateTotalCount();
        mutateUnseenCount();
        mutatePublishedCount();

        // toast({
        //     title: "Comments Updated (Realtime)",
        //     description: `Comment "${eventData.name}" was modified. List updated automatically.`,
        // });
    }, [mutateList, mutateTotalCount, mutateUnseenCount, mutatePublishedCount]);

    useFrappeDocTypeEventListener('Comment', handleListUpdate);

    // Styling helpers for comment types
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Comment': return 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
            case 'Like': return 'bg-pink-100 dark:bg-pink-950/20 text-pink-800 dark:text-pink-400 border-pink-200 dark:border-pink-900/30';
            case 'Workflow': return 'bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/30';
            case 'Created': return 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/30';
            case 'Submitted': return 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30';
            case 'Cancelled': return 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/30';
            case 'Deleted': return 'bg-rose-100 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-900/30';
            case 'Attachment': return 'bg-indigo-100 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30';
            case 'Shared': return 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-900/30';
            default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-350 border-slate-200 dark:border-slate-700';
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
                    className="-ml-4 hover:bg-transparent text-slate-600 dark:text-slate-400 font-semibold"
                >
                    Comment ID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const name = row.getValue('name') as string;
                return (
                    <button
                        onClick={() => handleRowClick(name)}
                        className="font-semibold text-purple-600 dark:text-purple-400 hover:underline hover:text-purple-700 dark:hover:text-purple-300 transition-colors text-left focus:outline-none bg-transparent"
                    >
                        {name}
                    </button>
                );
            },
        },
        {
            accessorKey: 'comment_type',
            header: 'Type',
            cell: ({ row }) => {
                const type = row.getValue('comment_type') as string;
                return (
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap",
                        getTypeColor(type)
                    )}>
                        {type || 'Comment'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'comment_by',
            header: 'Author',
            cell: ({ row }) => {
                const author = row.getValue('comment_by') as string;
                const email = row.original.comment_email as string;
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{author || 'System'}</span>
                        {email && <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{email}</span>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'content',
            header: 'Comment Details',
            cell: ({ row }) => {
                const contentText = stripHtml(row.getValue('content') as string);
                const subject = row.original.subject as string;
                return (
                    <div className="max-w-xs md:max-w-md truncate flex flex-col">
                        {subject && <span className="font-semibold text-slate-700 dark:text-slate-205 text-xs truncate mb-0.5">{subject}</span>}
                        <span className="text-slate-500 dark:text-slate-400 text-xs truncate">{contentText || '-'}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'reference',
            header: 'Reference',
            cell: ({ row }) => {
                const docType = row.original.reference_doctype as string;
                const docName = row.original.reference_name as string;
                if (!docType && !docName) return <span className="text-slate-400 dark:text-slate-550">-</span>;
                return (
                    <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-slate-100 font-semibold text-xs leading-none">{docName || '-'}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-wider">{docType || '-'}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'seen',
            header: 'Status',
            cell: ({ row }) => {
                const seen = row.getValue('seen') as boolean;
                const published = row.original.published as boolean;
                return (
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1",
                            seen ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-700" : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-405 border-blue-100 dark:border-blue-900/30"
                        )}>
                            {seen ? 'Seen' : 'Unseen'}
                        </span>
                        {published && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-405 border border-emerald-100 dark:border-emerald-900/30">
                                Published
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'creation',
            header: 'Created On',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="text-xs whitespace-nowrap">{formatDateTime(row.getValue('creation'))}</span>
                </div>
            ),
        },
    ], []);

    const table = useReactTable({
        data: comments || [],
        columns,
        manualSorting: true,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        state: {
            sorting,
        },
    });

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const commentTypes = [
        'Comment', 'Like', 'Info', 'Label', 'Workflow', 'Created', 'Submitted',
        'Cancelled', 'Updated', 'Deleted', 'Assigned', 'Assignment Completed',
        'Attachment', 'Attachment Removed', 'Shared', 'Unshared', 'Bot', 'Relinked', 'Edit'
    ];

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            {/* Summary Cards Grid */}
            <div className="shrink-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total Card */}
                    <Card
                        onClick={() => { setSeenFilter('ALL'); setPublishedFilter('ALL'); }}
                        className={cn(
                            "p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer",
                            seenFilter === 'ALL' && publishedFilter === 'ALL' && "ring-2 ring-purple-600 ring-offset-1 border-purple-200 dark:border-purple-900/50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Comments</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <MessageSquare className="w-4 h-4 text-slate-600 dark:text-slate-450" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                            )}
                        </div>
                    </Card>

                    {/* Unseen Card */}
                    <Card
                        onClick={() => { setSeenFilter('UNSEEN'); setPublishedFilter('ALL'); }}
                        className={cn(
                            "p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer",
                            seenFilter === 'UNSEEN' && "ring-2 ring-purple-600 ring-offset-1 border-purple-200 dark:border-purple-900/50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Unseen</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <EyeOff className="w-4 h-4 text-blue-600 dark:text-blue-405" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{unseenCount}</p>
                            )}
                        </div>
                    </Card>

                    {/* Published Card */}
                    <Card
                        onClick={() => { setSeenFilter('ALL'); setPublishedFilter('PUBLISHED'); }}
                        className={cn(
                            "p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer",
                            publishedFilter === 'PUBLISHED' && "ring-2 ring-purple-600 ring-offset-1 border-purple-200 dark:border-purple-900/50"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Published</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-405" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{publishedCount}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 z-50">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Advanced Filters</p>
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
                                                            ? COMMENT_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-200 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs text-foreground bg-transparent" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {COMMENT_FILTER_FIELDS.map((field) => (
                                                                <CommandItem
                                                                    key={field.value}
                                                                    value={field.label}
                                                                    onSelect={() => {
                                                                        const defaultOp = getOperatorsForType(field.type)[0];
                                                                        const defaultVal = field.type === 'date' && defaultOp === 'Between' ? ['', ''] as [string, string] : '';
                                                                        updateDraftFilter(filter.id, { field: field.value, operator: defaultOp, value: defaultVal });
                                                                        setFieldComboOpen(prev => ({ ...prev, [filter.id]: false }));
                                                                    }}
                                                                    className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
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
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0">
                                                    <SelectValue placeholder="Operator" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl">
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
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-205 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400 dark:text-slate-550'
                                                            )}
                                                        >
                                                            <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
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
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                                        <SelectValue placeholder="Select period..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200 shadow-xl">
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
                                            className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 shrink-0"
                                            onClick={() => removeDraftFilter(filter.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-850">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Condition
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

                    {/* Seen filter */}
                    <div className="w-[140px]">
                        <Select value={seenFilter} onValueChange={setSeenFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-555" />
                                    <SelectValue placeholder="Seen status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Seen/Unseen</SelectItem>
                                <SelectItem value="SEEN">Seen Only</SelectItem>
                                <SelectItem value="UNSEEN">Unseen Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Published filter */}
                    <div className="w-[155px]">
                        <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-555" />
                                    <SelectValue placeholder="Published status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Publications</SelectItem>
                                <SelectItem value="PUBLISHED">Published Only</SelectItem>
                                <SelectItem value="UNPUBLISHED">Unpublished Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Type Filter */}
                    <div className="w-[160px]">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-555" />
                                    <SelectValue placeholder="Comment Type" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl max-h-[300px]">
                                <SelectItem value="ALL">All Types</SelectItem>
                                {commentTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-555" />
                        <Input
                            placeholder="Search Author..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>

                    {/* Refresh button */}
                    <Button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {/* Reset Filters */}
                    {(searchQuery || seenFilter !== 'ALL' || publishedFilter !== 'ALL' || typeFilter !== 'ALL' || advancedFilters.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={handleResetFilters}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-150 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Reset
                        </Button>
                    )}

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-foreground">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 dark:text-slate-450 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Data Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 relative group/table overflow-hidden">
                <ScrollArea className="flex-1 w-full h-full">
                    <table className="w-full caption-bottom text-sm relative min-w-[1000px]">
                        <TableHeader className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-slate-50/95 dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/95 dark:hover:bg-slate-900/95 transition-none">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="font-semibold text-slate-600 dark:text-slate-400 h-11 whitespace-nowrap">
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
                                    <TableCell colSpan={columns.length} className="h-64 text-center text-slate-400 dark:text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Permission Error</p>
                                                <p className="text-xs text-red-600 dark:text-red-405 mt-1 max-w-md mx-auto leading-relaxed">{permissionError}</p>
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
                            ) : comments && comments.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
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
                                    <TableCell colSpan={columns.length} className="h-64 text-center text-slate-400 dark:text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950/20 rounded-full flex items-center justify-center">
                                                <Search className="w-8 h-8 text-slate-200 dark:text-slate-800" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No comments found</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your filters or search criteria.</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
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

export default Comments;
