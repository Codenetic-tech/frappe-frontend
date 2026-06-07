import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { useLead, LeadItem, FilterCondition } from '@/contexts/LeadContext';
import { useAuth, HierarchyNode } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
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
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    FileText,
    Clock,
    AlertCircle,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronDown,
    Filter,
    Phone,
    MapPin,
    User,
    Calendar as CalendarIcon,
    CircleCheck,
    XCircle,
    MessageSquare,
    Zap,
    Users,
    MoreHorizontal,
    Columns3,
    Plus,
    Check,
    ChevronsUpDown,
    ExternalLink,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { LeadTimer } from '@/components/leads/LeadTimer';
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

const CATEGORY_ORDER: Record<string, number> = {
    'ZONE': 1,
    'REGION': 2,
    'BRANCH': 3,
    'RM': 4,
    'AP': 5,
    'U-AP': 6,
    'CLIENT': 7
};

const getCategoryStyles = (category?: string) => {
    switch (category?.toUpperCase()) {
        case 'ZONE': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'REGION': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'BRANCH': return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'RM': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'AP': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'U-AP': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        case 'CLIENT': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

const ITEMS_PER_PAGE = 50;

const LEAD_FILTER_FIELDS = [
    { value: 'city', label: 'City', type: 'string' },
    { value: 'lead_name', label: 'Lead Name', type: 'string' },
    { value: 'mobile_no', label: 'Mobile No', type: 'string' },
    { value: 'email', label: 'Email', type: 'string' },
    { value: 'status', label: 'Status', type: 'string' },
    { value: 'state', label: 'State', type: 'string' },
    { value: 'lead_source', label: 'Lead Source', type: 'string' },
    { value: 'assigned_to', label: 'Assigned To', type: 'string' },
    { value: 'campaign', label: 'Campaign', type: 'string' },
    { value: 'tag', label: 'Tag', type: 'string' },
    { value: 'creation', label: 'Creation Date', type: 'date' },
    { value: 'modified', label: 'Modified Date', type: 'date' },
    { value: 'validity_date', label: 'Validity Date', type: 'date' },
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
const getFieldType = (fieldValue: string) => LEAD_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const COLUMN_TO_FIELD_MAP: Record<string, string> = {
    validity: 'validity_date',
};

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const LEAD_STATUSES = [
    'New',
    'Contacted',
    'Followup',
    'Call Back',
    'RNR',
    'Switch off',
    'Client',
    'Not Interested',
    'won',
];

interface Campaign {
    name: string;
    campaign: string;
    status: string;
    form_id: string;
    current_index: number;
}

// ── Main Component ────────────────────────────────────────────────────
const Leads: React.FC = () => {
    const navigate = useNavigate();
    const { token, hierarchyData } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { leadsData, isLoading, error, count, statusCount, groupList, refreshLeadsData, updateLeadStatus, updateLeadGroup, assignLeads } = useLead();
    const { orgTreeData } = useOrgTree();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [sourceFilter, setSourceFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [currentGroup, setCurrentGroup] = useState<string>('ALL');
    const [assignedToFilter, setAssignedToFilter] = useState<string>('ALL');
    const [openAssignedToBox, setOpenAssignedToBox] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignFilter, setCampaignFilter] = useState<string>('ALL');
    const [openCampaignBox, setOpenCampaignBox] = useState(false);
    const [, setIsCampaignsLoading] = useState(false);

    const [repeatedLeadFilter, setRepeatedLeadFilter] = useState(false);

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
    const [openFilterPanel, setOpenFilterPanel] = useState(false);
    const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
    const [fieldComboOpen, setFieldComboOpen] = useState<Record<string, boolean>>({});

    // Note Dialog State
    const [noteLead, setNoteLead] = useState<LeadItem | null>(null);
    const [noteContent, setNoteContent] = useState('');
    const [isNoteSaving, setIsNoteSaving] = useState(false);

    // Bulk Actions State
    const [openBulkAssignBox, setOpenBulkAssignBox] = useState(false);

    const { user } = useAuth();
    const { addLeadNote } = useLead();

    // Filter hierarchy to exclude AP, U-AP, CLIENT
    const filteredReferList = useMemo(() => {
        if (!selectedHierarchy || selectedHierarchy.length === 0 || !hierarchyData) return [];

        const nodeMap = new Map<string, HierarchyNode>(hierarchyData.map(node => [node.name, node]));

        return selectedHierarchy.filter(id => {
            const node = nodeMap.get(id);
            if (!node) return true;
            const category = node.category?.toUpperCase();
            return category !== 'AP' && category !== 'U-AP' && category !== 'CLIENT';
        });
    }, [selectedHierarchy, hierarchyData]);

    const userOptions = useMemo(() => {
        if (!hierarchyData) return [];
        return hierarchyData
            .filter(node => node.category && !['AP', 'U-AP', 'CLIENT'].includes(node.category.toUpperCase()))
            .sort((a, b) => {
                const pa = CATEGORY_ORDER[a.category?.toUpperCase() || ''] || 99;
                const pb = CATEGORY_ORDER[b.category?.toUpperCase() || ''] || 99;
                if (pa !== pb) return pa - pb;
                return a.name.localeCompare(b.name);
            });
    }, [hierarchyData]);

    const userNameMap = useMemo(() => {
        if (!orgTreeData) return new Map<string, string>();
        return new Map(orgTreeData.map(node => [node.name, node.client_name || '']));
    }, [orgTreeData]);

    const formatUserName = useCallback((userCode: string) => {
        if (!userCode || userCode === 'ALL') return userCode;
        const name = userNameMap.get(userCode);
        if (name) {
            // Check if it's an RM type in hierarchyData
            const node = hierarchyData?.find(n => n.name === userCode);
            if (node?.category?.toUpperCase() === 'RM') {
                return `${name} ${userCode}`;
            }
            return userCode;
        }
        return userCode;
    }, [userNameMap, hierarchyData]);

    // TanStack Table state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
        const stored = localStorage.getItem('leadsColumnVisibility');
        return stored ? JSON.parse(stored) : {
            city: false,
            campaign: false,
            creation: false,
            modified: false,
            total_registration: false,
            lead_created_date: false,
            last_campaign: false,
            lead_timeline: false,
        };
    });
    const [rowSelection, setRowSelection] = useState({});

    useEffect(() => {
        localStorage.setItem('leadsColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    useEffect(() => {
        const fetchCampaigns = async () => {
            if (!token) return;
            setIsCampaignsLoading(true);
            try {
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
                const response = await fetch(`${API_BASE_URL}/api/method/rms.branch.get_campaigns`, {
                    headers: { 'token': token }
                });
                const data = await response.json();
                if (data.message?.status === 'success') {
                    setCampaigns(data.message.campaigns || []);
                }
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            } finally {
                setIsCampaignsLoading(false);
            }
        };
        fetchCampaigns();
    }, [token]);

    const formatLocalDate = useCallback((d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const loadLeadsData = useCallback(async (
        page: number,
        currentSearch: string,
        currentStatus: string,
        currentSource: string,
        currentDates: [Date, Date] | null,
        referList: string[],
        group: string,
        assignedTo: string,
        campaign: string,
        advFilters: AdvancedFilter[],
        sortState: SortingState,
        repeatedOnly: boolean,
    ) => {
        if (!token) return;

        const DOCTYPE = 'CRM Lead';
        const filters: FilterCondition[] = [];

        if (currentDates?.[0] && currentDates?.[1]) {
            filters.push([DOCTYPE, 'lead_created_date', 'Between', [formatLocalDate(currentDates[0]), formatLocalDate(currentDates[1])]]);
        }
        if (currentStatus !== 'ALL') filters.push([DOCTYPE, 'status', '=', currentStatus]);
        if (currentSource !== 'ALL') filters.push([DOCTYPE, 'lead_source', '=', currentSource]);
        if (campaign !== 'ALL') filters.push([DOCTYPE, 'campaign', '=', campaign]);
        if (assignedTo !== 'ALL') filters.push([DOCTYPE, 'assigned_to', '=', assignedTo]);
        if (group !== 'ALL') filters.push([DOCTYPE, 'group', '=', group]);
        if (currentSearch) {
            if (/^\+?\d+$/.test(currentSearch.replace(/\s/g, ''))) {
                filters.push([DOCTYPE, 'mobile_no', 'like', `%${currentSearch}%`]);
            } else {
                filters.push([DOCTYPE, 'lead_name', 'like', `%${currentSearch}%`]);
            }
        }

        if (repeatedOnly) filters.push([DOCTYPE, 'repeated_lead', '=', '1']);

        for (const f of advFilters) {
            if (!f.field || !f.operator) continue;
            if (Array.isArray(f.value) ? f.value[0] && f.value[1] : f.value) {
                filters.push([DOCTYPE, f.field, f.operator, f.value]);
            }
        }

        let order_by = '';
        if (sortState.length > 0) {
            const fieldName = COLUMN_TO_FIELD_MAP[sortState[0].id] ?? sortState[0].id;
            order_by = `\`tabCRM Lead\`.\`${fieldName}\` ${sortState[0].desc ? 'desc' : 'asc'}`;
        }

        await refreshLeadsData({
            limit_start: (page - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE,
            filters,
            order_by,
            refer_list: referList,
        });
    }, [refreshLeadsData, token, formatLocalDate]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadLeadsData(currentPage, searchQuery, statusFilter, sourceFilter, dateRange, filteredReferList, currentGroup, assignedToFilter, campaignFilter, advancedFilters, sorting, repeatedLeadFilter);
        } finally {
            setIsRefreshing(false);
        }
    };

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, dateRange, statusFilter, sourceFilter, filteredReferList, currentGroup, assignedToFilter, campaignFilter, advancedFilters, sorting, repeatedLeadFilter]);

    useEffect(() => {
        if (token) {
            loadLeadsData(currentPage, debouncedSearchQuery, statusFilter, sourceFilter, dateRange, filteredReferList, currentGroup, assignedToFilter, campaignFilter, advancedFilters, sorting, repeatedLeadFilter);
        }
    }, [currentPage, debouncedSearchQuery, dateRange, statusFilter, sourceFilter, filteredReferList, currentGroup, assignedToFilter, campaignFilter, advancedFilters, sorting, repeatedLeadFilter, token, loadLeadsData]);

    const tableData = useMemo(() => leadsData || [], [leadsData]);

    const othersCount = useMemo(() => {
        if (!statusCount) return 0;
        const mainStatuses = ['New', 'Followup', 'Not Interested', 'won'];
        return Object.entries(statusCount).reduce((acc, [key, value]) => {
            if (!mainStatuses.includes(key)) {
                return acc + (value as number);
            }
            return acc;
        }, 0);
    }, [statusCount]);

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'won': return <CircleCheck className="w-4 h-4 text-green-600" />;
            case 'Not Interested': return <XCircle className="w-4 h-4 text-red-600" />;
            case 'Call Back': return <Phone className="w-4 h-4 text-blue-600" />;
            case 'Followup': return <Clock className="w-4 h-4 text-amber-600" />;
            case 'New': return <Zap className="w-4 h-4 text-purple-600" />;
            case 'Client': return <Users className="w-4 h-4 text-emerald-600" />;
            case 'RNR': return <AlertCircle className="w-4 h-4 text-orange-600" />;
            case 'Switch off': return <Zap className="w-4 h-4 text-slate-400" />;
            case 'Others': return <Users className="w-4 h-4 text-slate-500" />;
            default: return <MessageSquare className="w-4 h-4 text-slate-400" />;
        }
    };

    // ── Column definitions (inside component to access updateLeadStatus) ──
    const columns: ColumnDef<LeadItem>[] = useMemo(() => [
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
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: 'lead_name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4"
                >
                    Lead Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const name = row.getValue('lead_name') as string;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs uppercase shrink-0">
                            {name?.[0] || 'U'}
                        </div>
                        <button
                            onClick={() => navigate(`/leads/${row.original.name}`)}
                            className="font-semibold text-slate-900 leading-tight hover:text-purple-600 transition-colors text-left focus:outline-none"
                        >
                            {name}
                        </button>
                    </div>
                );
            },
        },
        {
            accessorKey: 'mobile_no',
            header: 'Contact',
            cell: ({ row }) => {
                const mobile = row.getValue('mobile_no') as string;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-900 leading-tight">{mobile}</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const searchMobile = mobile?.replace(/^\+91/, '');
                                window.dispatchEvent(new CustomEvent('trigger-kyc-search', {
                                    detail: { clientCode: searchMobile }
                                }));
                            }}
                            className="p-1 hover:bg-purple-50 rounded-md text-purple-700 hover:text-purple-600 transition-all group/kyc"
                            title="Search in KYC Tracker"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            },
        },
        {
            accessorKey: 'lead_source',
            header: 'Source',
            cell: ({ row }) => (
                <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 py-0.5 text-[10px] font-medium">
                    {row.getValue('lead_source')}
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
                            status === 'won' ? "bg-green-100 text-green-700" :
                                status === 'New' ? "bg-purple-100 text-purple-700" :
                                    status === 'RNR' ? "bg-orange-100 text-orange-700" :
                                        status === 'Followup' ? "bg-amber-100 text-amber-700" :
                                            status === 'Not Interested' ? "bg-red-100 text-red-700" :
                                                status === 'Client' ? "bg-blue-100 text-blue-700" :
                                                    "bg-slate-100 text-slate-700"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                                status === 'won' ? "bg-green-500" :
                                    status === 'New' ? "bg-purple-500" :
                                        status === 'RNR' ? "bg-orange-500" :
                                            status === 'Followup' ? "bg-amber-500" :
                                                status === 'Not Interested' ? "bg-red-500" :
                                                    status === 'Client' ? "bg-blue-500" :
                                                        "bg-slate-500"
                            )} />
                            {status}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'city',
            header: 'City',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs">{row.getValue('city') || '-'}</span>
                </div>
            ),
        },
        {
            accessorKey: 'campaign',
            header: 'Campaign',
            cell: ({ row }) => {
                const campaign = row.getValue('campaign') as string;
                return (
                    <span className="text-xs text-slate-500 truncate block max-w-[180px] bg-slate-50 px-2 py-1 rounded" title={campaign}>
                        {campaign || '-'}
                    </span>
                );
            },
        },
        {
            id: 'notes',
            header: 'Notes',
            cell: ({ row }) => {
                const notes = row.original.notes;
                if (!notes || notes.length === 0) return <span className="text-xs text-slate-400 italic">No notes</span>;

                // Get the latest note (sort by commented_time descending and take the first one)
                const latestNote = [...notes].sort((a, b) =>
                    new Date(b.commented_time).getTime() - new Date(a.commented_time).getTime()
                )[0];

                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-col gap-0.5 max-w-[250px] cursor-help">
                                    <span className="text-sm text-slate-700 font-semibold line-clamp-2">
                                        {latestNote.notes}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[300px] p-3 rounded-xl border-slate-800 shadow-2xl bg-slate-900 text-slate-50" sideOffset={10}>
                                <div className="space-y-1.5">
                                    <p className="text-sm leading-relaxed">{latestNote.notes}</p>
                                    <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                        <span>By {latestNote.commented_by}</span>
                                        <span>{latestNote.commented_time}</span>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            id: "validity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Validity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const validityDate = row.original.validity_date;
                return (
                    <div className="hidden lg:block">
                        {validityDate && (
                            <LeadTimer validityDate={validityDate} />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'assigned_to',
            header: 'Assigned To',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                    <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-[10px]">
                        <User className="w-3 h-3" />
                    </div>
                    {formatUserName(row.getValue('assigned_to') as string) || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'creation',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4"
                >
                    Creation
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const creation = row.getValue('creation') as string;
                return (
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <CalendarIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-[12px] font-medium">{creation?.split('.')[0]}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'modified',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4"
                >
                    Modified
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const modified = row.getValue('modified') as string;
                return (
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <CalendarIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-[12px] font-medium">{modified?.split('.')[0]}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_registration',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="-ml-4"
                >
                    Registrations
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const val = row.original.total_registration;
                if (!val) return <span className="text-xs text-slate-400">-</span>;
                return (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {val}
                    </span>
                );
            },
        },
        {
            accessorKey: 'last_campaign',
            header: 'Last Campaign',
            cell: ({ row }) => {
                const val = row.original.last_campaign;
                if (!val) return <span className="text-xs text-slate-400">-</span>;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-xs text-slate-600 truncate block max-w-[180px] cursor-help">{val}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[280px] rounded-xl bg-slate-900 text-slate-50 text-xs p-2">
                                {val}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            accessorKey: 'repeated_lead',
            header: 'Repeated',
            cell: ({ row }) => {
                const val = row.original.repeated_lead;
                return val ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        Repeated
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">-</span>
                );
            },
        },
        {
            accessorKey: 'lead_timeline',
            header: 'Timeline',
            cell: ({ row }) => {
                const raw = row.original.lead_timeline;
                if (!raw) return <span className="text-xs text-slate-400">-</span>;
                const steps = raw.split('➔').map((s: string) => s.trim()).filter(Boolean);
                const parseStep = (s: string) => {
                    const m = s.match(/^(\d{2}\.\d{2}\.\d{4})\s*\((.+)\)$/);
                    return { date: m?.[1] ?? '', name: m?.[2] ?? s };
                };
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                    {steps.map((_: string, i: number) => (
                                        <React.Fragment key={i}>
                                            <div className={cn(
                                                'w-2 h-2 rounded-full shrink-0',
                                                i === steps.length - 1 ? 'bg-purple-500' : 'bg-slate-300'
                                            )} />
                                            {i < steps.length - 1 && <div className="w-3 h-px bg-slate-300" />}
                                        </React.Fragment>
                                    ))}
                                    <span className="text-[10px] font-bold text-slate-500 ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                        {steps.length}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-[320px] p-3 rounded-xl bg-slate-900 text-slate-50 shadow-2xl">
                                <div className="space-y-2">
                                    {steps.map((s: string, i: number) => {
                                        const { date, name } = parseStep(s);
                                        return (
                                            <div key={i} className="flex items-start gap-2">
                                                <div className="flex flex-col items-center pt-1 shrink-0">
                                                    <div className={cn('w-2 h-2 rounded-full', i === steps.length - 1 ? 'bg-purple-400' : 'bg-slate-500')} />
                                                    {i < steps.length - 1 && <div className="w-px h-4 bg-slate-600 mt-0.5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-purple-300 leading-none mb-0.5">{date}</p>
                                                    <p className="text-xs text-slate-200 leading-snug">{name}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            },
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => {
                const lead = row.original;
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const [newGroupInput, setNewGroupInput] = useState('');

                const handleCreateGroup = async () => {
                    if (!newGroupInput.trim()) return;
                    const success = await updateLeadGroup(lead.name, newGroupInput.trim());
                    if (success) {
                        setNewGroupInput('');
                        toast({
                            variant: "success",
                            title: "Group Updated",
                            description: `Lead moved to new group: ${newGroupInput}`,
                        });
                    }
                };

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Notes</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => {
                                    setNoteLead(lead);
                                    setNoteContent('');
                                }}
                            >
                                <span>Write Note</span>
                            </DropdownMenuItem>
                            {lead.status !== 'Client' && lead.status !== 'won' && (
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                                    {LEAD_STATUSES.filter(s => s !== lead.status && s !== 'won' && s !== 'Client' && s !== 'Contacted').map((status) => (
                                        <DropdownMenuItem
                                            key={status}
                                            onClick={() => updateLeadStatus(lead.name, status)}
                                        >
                                            {status}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>Group</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-48 p-0">
                                        <div className="max-h-[200px] overflow-y-auto p-1">
                                            {groupList.map((g) => (
                                                <DropdownMenuItem
                                                    key={g}
                                                    onClick={() => updateLeadGroup(lead.name, g)}
                                                    className={cn(lead.group === g && "bg-purple-50 text-purple-700 font-bold")}
                                                >
                                                    {g}
                                                </DropdownMenuItem>
                                            ))}
                                        </div>
                                        <DropdownMenuSeparator />
                                        <div className="p-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Input
                                                placeholder="New group..."
                                                value={newGroupInput}
                                                onChange={(e) => setNewGroupInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleCreateGroup();
                                                    }
                                                }}
                                                className="h-8 text-xs focus-visible:ring-purple-500"
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 shrink-0 hover:bg-purple-50 hover:text-purple-600"
                                                onClick={handleCreateGroup}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], [updateLeadStatus, updateLeadGroup, groupList, navigate, addLeadNote, formatUserName]);

    // ── TanStack Table Instance ──────────────────────────────────────
    const table = useReactTable({
        data: tableData,
        columns,
        manualSorting: true,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
        },
    });

    // ── Advanced Filter Helpers ─────────────────────────────────────
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
            // auto-wrap like/not like values without % so user can just type "CHE"
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

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            {/* Header & Summary Section */}
            <div className="shrink-0 space-y-4">

                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
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
                        { label: 'New', key: 'New', color: 'purple', sub: 'Just added' },
                        { label: 'Followup', key: 'Followup', color: 'amber', sub: 'In progress' },
                        { label: 'Won', key: 'won', color: 'green', sub: 'Success' },
                        { label: 'Not Interested', key: 'Not Interested', color: 'red', sub: 'Closed' },
                        { label: 'Others', key: 'Others', color: 'slate', sub: 'Remaining', value: othersCount }
                    ].map((item) => (
                        <Card key={item.key} className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-[12px] font-bold uppercase tracking-wider", `text-${item.color}-600`)}>{item.label}</span>
                                    {item.key === 'won' && count > 0 && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                            {(((statusCount['won'] || 0) / count) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <div className={cn("p-2 rounded-lg", `bg-${item.color}-50`)}>
                                    {getStatusIcon(item.key)}
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                {isLoading ? (
                                    <Skeleton className="h-8 w-12 mb-1" />
                                ) : (
                                    <p className="text-2xl font-bold text-slate-900">
                                        {item.value !== undefined ? item.value : (statusCount[item.key as keyof typeof statusCount] || 0)}
                                    </p>
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
                                <Filter className="w-4 h-4" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 shadow-xl">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-slate-800">Advanced Filters</p>
                                <span className="text-[9px] text-slate-400 font-medium">Use % as wildcard for "like"</span>
                            </div>

                            <div className="space-y-1.5">
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
                                                            ? LEAD_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 shadow-xl" side="bottom" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {LEAD_FILTER_FIELDS.map((field) => (
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
                                                    <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 shadow-xl" align="start">
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
                                                        <SelectItem value="last month" className="text-xs">Last Month</SelectItem>
                                                        <SelectItem value="last quarter" className="text-xs">Last Quarter</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : getFieldType(filter.field) === 'date' ? (
                                                <input
                                                    type="date"
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={e => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs px-2 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            ) : (
                                                <Input
                                                    placeholder={filter.operator === 'like' || filter.operator === 'not like' ? '%value%' : 'Value...'}
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={e => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs border-slate-200"
                                                />
                                            )
                                        )}

                                        {/* Remove */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => removeDraftFilter(filter.id)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs text-purple-600 hover:bg-purple-50 hover:text-purple-700 gap-1.5 px-2"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Filter
                                </Button>
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearAdvancedFilters}
                                    className="h-8 text-xs rounded-xl border-slate-200"
                                >
                                    Clear All
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={applyAdvancedFilters}
                                    className="h-8 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-4"
                                >
                                    Apply Filters
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className="w-[160px]">
                        <Select value={sourceFilter} onValueChange={setSourceFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Source" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Sources</SelectItem>
                                <SelectItem value="Facebook AD">Facebook AD</SelectItem>
                                <SelectItem value="Google AD">Google AD</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Whatsapp">Whatsapp</SelectItem>
                                <SelectItem value="Manual Lead">Manual Lead</SelectItem>
                                <SelectItem value="Seminar">Seminar</SelectItem>
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
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Followup">Followup</SelectItem>
                                <SelectItem value="Call Back">Call Back</SelectItem>
                                <SelectItem value="RNR">RNR</SelectItem>
                                <SelectItem value="Client">Client</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="Not Interested">Not Interested</SelectItem>
                                <SelectItem value="Switch off">Switch off</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Repeated Lead Checkbox */}
                    <div className="flex items-center gap-2 px-3 h-10 bg-white border border-slate-200 rounded-xl shrink-0">
                        <Checkbox
                            id="repeated-lead-filter"
                            checked={repeatedLeadFilter}
                            onCheckedChange={(v) => setRepeatedLeadFilter(!!v)}
                            className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <label htmlFor="repeated-lead-filter" className="text-xs font-semibold text-slate-600 cursor-pointer whitespace-nowrap select-none">
                            Repeated
                        </label>
                    </div>

                    {/* Campaign Filter Combobox */}
                    <div className="w-[200px]">
                        <Popover open={openCampaignBox} onOpenChange={setOpenCampaignBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCampaignBox}
                                    className="w-full justify-between bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {campaignFilter === "ALL"
                                                ? "All Campaigns"
                                                : campaignFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[240px] p-0 rounded-xl border-slate-200 shadow-xl">
                                <Command>
                                    <CommandInput placeholder="Search campaign..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No campaign found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="ALL"
                                                onSelect={() => {
                                                    setCampaignFilter("ALL");
                                                    setOpenCampaignBox(false);
                                                }}
                                                className="flex items-center justify-between"
                                            >
                                                <span>All Campaigns</span>
                                                {campaignFilter === "ALL" && <Check className="h-4 w-4 text-purple-600" />}
                                            </CommandItem>
                                            {campaigns.map((camp) => (
                                                <CommandItem
                                                    key={camp.name}
                                                    value={camp.campaign}
                                                    onSelect={() => {
                                                        setCampaignFilter(camp.campaign);
                                                        setOpenCampaignBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2"
                                                >
                                                    <span className="truncate text-sm font-medium text-slate-700">{camp.campaign}</span>
                                                    {campaignFilter === camp.campaign && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Assigned To Filter Combobox */}
                    <div className="w-[180px]">
                        <Popover open={openAssignedToBox} onOpenChange={setOpenAssignedToBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openAssignedToBox}
                                    className="w-full justify-between bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {assignedToFilter === "ALL"
                                                ? "Assigned To"
                                                : formatUserName(assignedToFilter)}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-200 shadow-xl">
                                <Command>
                                    <CommandInput placeholder="Search user..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No user found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="ALL"
                                                onSelect={() => {
                                                    setAssignedToFilter("ALL");
                                                    setOpenAssignedToBox(false);
                                                }}
                                                className="flex items-center justify-between"
                                            >
                                                <span>All Users</span>
                                                {assignedToFilter === "ALL" && <Check className="h-4 w-4 text-purple-600" />}
                                            </CommandItem>
                                            {user?.user_code && (
                                                <CommandItem
                                                    value={user.user_code}
                                                    onSelect={() => {
                                                        setAssignedToFilter(user.user_code);
                                                        setOpenAssignedToBox(false);
                                                    }}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="font-semibold text-purple-700">{user.user_code}</span>
                                                    {assignedToFilter === user.user_code && <Check className="h-4 w-4 text-purple-600" />}
                                                </CommandItem>
                                            )}
                                            {userOptions.map((user) => (
                                                <CommandItem
                                                    key={user.name}
                                                    value={`${user.name} ${userNameMap.get(user.name) || ''}`}
                                                    onSelect={() => {
                                                        setAssignedToFilter(user.name);
                                                        setOpenAssignedToBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2"
                                                >
                                                    <span className="truncate text-sm font-medium text-slate-700">{formatUserName(user.name)}</span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {user.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1.5 py-0 h-4 uppercase font-bold border",
                                                                    getCategoryStyles(user.category)
                                                                )}
                                                            >
                                                                {user.category}
                                                            </Badge>
                                                        )}
                                                        {assignedToFilter === user.name && <Check className="h-4 w-4 text-purple-600" />}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Bulk Actions */}
                    {table.getFilteredSelectedRowModel().rows.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-100 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                                {table.getFilteredSelectedRowModel().rows.length} Selected
                            </span>
                            <div className="h-4 w-[1px] bg-purple-200 mx-1" />
                            <Popover open={openBulkAssignBox} onOpenChange={setOpenBulkAssignBox}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider text-purple-700 hover:bg-purple-100 hover:text-purple-800 gap-1.5 focus:ring-0 focus:ring-offset-0">
                                        <Users className="w-3.5 h-3.5" />
                                        Assign To
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 p-0 rounded-xl border-slate-200 shadow-xl overflow-hidden">
                                    <Command>
                                        <CommandInput placeholder="Search user..." className="h-9" />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty>No user found.</CommandEmpty>
                                            <CommandGroup heading="Teams">
                                                {userOptions.map((userNode) => (
                                                    <CommandItem
                                                        key={userNode.name}
                                                        value={`${userNode.name} ${userNameMap.get(userNode.name) || ''}`}
                                                        onSelect={async () => {
                                                            const selectedLeadNames = table.getFilteredSelectedRowModel().rows.map(
                                                                (row) => row.original.name
                                                            );
                                                            const success = await assignLeads(selectedLeadNames, userNode.name);
                                                            if (success) {
                                                                table.resetRowSelection();
                                                                setOpenBulkAssignBox(false);
                                                                toast({
                                                                    variant: "success",
                                                                    title: "Leads Assigned",
                                                                    description: `Successfully assigned ${selectedLeadNames.length} leads to ${userNode.name}.`,
                                                                });
                                                            } else {
                                                                toast({
                                                                    variant: "destructive",
                                                                    title: "Assignment Failed",
                                                                    description: "Failed to assign leads. Please try again.",
                                                                });
                                                            }
                                                        }}
                                                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50"
                                                    >
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-xs text-slate-700 truncate">{formatUserName(userNode.name)}</span>
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">{userNode.category}</span>
                                                        </div>
                                                        {userNode.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1.5 py-0 h-4 uppercase font-bold border shrink-0",
                                                                    getCategoryStyles(userNode.category)
                                                                )}
                                                            >
                                                                {userNode.category}
                                                            </Badge>
                                                        )}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Name or Mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                    {/* Column Visibility Toggle */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id === 'lead_name' ? 'Lead Name' :
                                                    column.id === 'mobile_no' ? 'Contact' :
                                                        column.id === 'lead_source' ? 'Source' :
                                                            column.id === 'assigned_to' ? 'Assigned To' :
                                                                column.id === 'validity' ? 'Validity' :
                                                                    column.id === 'notes' ? 'Notes' :
                                                                        column.id === 'creation' ? 'Creation Date' :
                                                                            column.id === 'modified' ? 'Modified Date' :
                                                                                column.id}
                                            </DropdownMenuCheckboxItem>
                                        );
                                    })}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>


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

                <Dialog open={!!noteLead} onOpenChange={(open) => !open && !isNoteSaving && setNoteLead(null)}>
                    <DialogContent className="sm:max-w-md rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-900">Add Note for {noteLead?.lead_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <Textarea
                                placeholder="Type your note here..."
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                className="min-h-[120px] rounded-xl border-slate-200 focus-visible:ring-purple-500"
                            />
                        </div>
                        <DialogFooter className="flex gap-2 sm:justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setNoteLead(null)}
                                disabled={isNoteSaving}
                                className="rounded-xl border-slate-200"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!noteLead || !noteContent.trim() || !user?.user_code) return;
                                    setIsNoteSaving(true);
                                    try {
                                        const success = await addLeadNote(noteLead.name, noteContent, user.user_code);
                                        if (success) {
                                            toast({
                                                variant: "success",
                                                title: "Note Added",
                                                description: "Note has been successfully added to the lead.",
                                            });
                                            setNoteLead(null);
                                            setNoteContent('');
                                        } else {
                                            toast({
                                                variant: "destructive",
                                                title: "Error",
                                                description: "Failed to add note. Please try again.",
                                            });
                                        }
                                    } finally {
                                        setIsNoteSaving(false);
                                    }
                                }}
                                disabled={isNoteSaving || !noteContent.trim()}
                                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold"
                            >
                                {isNoteSaving && <RefreshCcw className="w-4 h-4 animate-spin" />}
                                {isNoteSaving ? 'Saving...' : 'Save Note'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}

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
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i} className="border-0">
                                        {columns.map((_, j) => (
                                            <TableCell key={j} className="py-4">
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
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
                            ) : !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-64 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Search className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600">No leads found</p>
                                                <p className="text-xs text-slate-400">Try adjusting your filters to find what you're looking for.</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setSearchQuery('');
                                                setStatusFilter('ALL');
                                                setSourceFilter('ALL');
                                                setDateRange(null);
                                            }} className="rounded-xl mt-2">
                                                Clear all filters
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Footer & Group Tabs */}
                <div className="shrink-0 border-t border-slate-100 bg-slate-50 flex items-center h-8 px-0">
                    {/* Left: Tabs */}
                    <div className="flex-1 flex items-stretch h-full overflow-x-auto no-scrollbar border-r border-slate-200">
                        {['ALL', ...groupList].map((groupName) => (
                            <button
                                key={groupName}
                                onClick={() => setCurrentGroup(groupName)}
                                className={cn(
                                    "px-4 text-[11px] font-bold flex items-center transition-all relative whitespace-nowrap",
                                    currentGroup === groupName
                                        ? "text-purple-600 bg-white border-b-2 border-b-purple-600"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border-r border-slate-100"
                                )}
                            >
                                {groupName}
                            </button>
                        ))}
                    </div>

                    {/* Right: Info Area */}
                    <div className="flex items-center gap-6 px-4 shrink-0">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                            {table.getFilteredSelectedRowModel().rows.length} SELECTED
                        </div>
                        <div className="h-4 w-[1px] bg-slate-200" />
                        <p className="text-[11px] text-slate-500 font-medium">
                            Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, count)}</span> of <span className="text-slate-900 font-bold">{count}</span> leads
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Leads;
