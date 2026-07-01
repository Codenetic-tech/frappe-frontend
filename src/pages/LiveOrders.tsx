import React, { useMemo, useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Users,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Filter,
    Calendar as CalendarIcon,
    Check,
    ChevronsUpDown,
    Columns3,
    Plus,
    X,
    FileDown,
    ClipboardList,
    TrendingUp,
    TrendingDown,
    XCircle,
    HelpCircle,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { useFrappeGetDoc, FrappeContext } from 'frappe-react-sdk';

export interface OrderItem {
    norenordno: string;
    uid: string;
    actid: string;
    token: string;
    partid: string;
    qty: number;
    ls: number;
    prc: number;
    remarks: string;
    flqty: number;
    flprc: number;
    flid: string;
    fltm: string;
    prctyp: string;
    ret: string;
    exchordid: string;
    dscqty: number;
    branch: string;
    exch_tm: string;
    amo: string;
    ti: string;
    ordenttm: string;
    targetbroker: string;
    uidc: string;
    reporttype: string;
    os: string;
    parent1: string;
    status: string;
    exui: string;
    instname: string;
    pp: number;
    mult: number;
    prcftr: number;
    st_intrn: string;
    tm: string;
    client_name: string;
    exch: string;
    tsym: string;
    trantype: string;
    pcode: string;
    avgprc: number;
    ntm: string;
    kidid: string;
    fillshares: number;
    norentm: string;
    rejreason: string;
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
        case 'ZONE': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
        case 'REGION': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30';
        case 'BRANCH': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700';
        case 'RM': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
        case 'AP': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
        case 'U-AP': return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30';
        case 'CLIENT': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
        default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
};

const ORDER_FILTER_FIELDS = [
    { value: 'norenordno', label: 'Order No (norenordno)', type: 'string' },
    { value: 'uid', label: 'Client ID (uid)', type: 'string' },
    { value: 'actid', label: 'Account ID (actid)', type: 'string' },
    { value: 'token', label: 'Token', type: 'string' },
    { value: 'partid', label: 'Participant ID (partid)', type: 'string' },
    { value: 'qty', label: 'Quantity (qty)', type: 'number' },
    { value: 'ls', label: 'Lot Size (ls)', type: 'number' },
    { value: 'prc', label: 'Price (prc)', type: 'number' },
    { value: 'remarks', label: 'Remarks', type: 'string' },
    { value: 'flqty', label: 'Filled Qty (flqty)', type: 'number' },
    { value: 'flprc', label: 'Filled Price (flprc)', type: 'number' },
    { value: 'flid', label: 'Fill ID (flid)', type: 'string' },
    { value: 'fltm', label: 'Fill Time (fltm)', type: 'string' },
    { value: 'prctyp', label: 'Price Type (prctyp)', type: 'select', options: ['LMT', 'MKT', 'SL-LMT', 'SL-MKT'] },
    { value: 'ret', label: 'Retention (ret)', type: 'select', options: ['DAY', 'IOC', 'EOS'] },
    { value: 'exchordid', label: 'Exchange Order ID (exchordid)', type: 'string' },
    { value: 'dscqty', label: 'Disclosed Qty (dscqty)', type: 'number' },
    { value: 'branch', label: 'Branch', type: 'string' },
    { value: 'exch_tm', label: 'Exchange Time (exch_tm)', type: 'string' },
    { value: 'amo', label: 'AMO Flag (amo)', type: 'select', options: ['Yes', 'No'] },
    { value: 'ti', label: 'Time Interval (ti)', type: 'string' },
    { value: 'ordenttm', label: 'Order Entry Time (ordenttm)', type: 'string' },
    { value: 'targetbroker', label: 'Target Broker', type: 'string' },
    { value: 'uidc', label: 'User ID Category (uidc)', type: 'string' },
    { value: 'reporttype', label: 'Report Type', type: 'string' },
    { value: 'os', label: 'Order Origin/Status (os)', type: 'string' },
    { value: 'parent1', label: 'Parent Code (parent1)', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['COMPLETE', 'OPEN', 'CANCELED', 'REJECTED', 'TRIGGER_PENDING', 'INVALID_STATUS_TYPE'] },
    { value: 'exui', label: 'Exui', type: 'string' },
    { value: 'instname', label: 'Instrument Name (instname)', type: 'string' },
    { value: 'pp', label: 'Price Precision (pp)', type: 'number' },
    { value: 'mult', label: 'Multiplier (mult)', type: 'number' },
    { value: 'prcftr', label: 'Price Factor (prcftr)', type: 'number' },
    { value: 'st_intrn', label: 'ST Intern', type: 'string' },
    { value: 'tm', label: 'Time (tm)', type: 'string' },
    { value: 'client_name', label: 'Client Name', type: 'string' },
    { value: 'exch', label: 'Exchange (exch)', type: 'select', options: ['BFO', 'BSE', 'MCX', 'NCOM', 'NFO', 'NSE'] },
    { value: 'tsym', label: 'Trading Symbol (tsym)', type: 'string' },
    { value: 'trantype', label: 'Transaction Type (trantype)', type: 'select', options: ['B', 'S'] },
    { value: 'pcode', label: 'Product Code (pcode)', type: 'select', options: ['CNC', 'MIS', 'NRML', 'CO', 'BO'] },
    { value: 'avgprc', label: 'Average Price (avgprc)', type: 'number' },
    { value: 'ntm', label: 'NTM', type: 'string' },
    { value: 'kidid', label: 'Kid ID (kidid)', type: 'string' },
    { value: 'fillshares', label: 'Filled Shares (fillshares)', type: 'number' },
    { value: 'norentm', label: 'Order Datetime (norentm)', type: 'date' },
    { value: 'rejreason', label: 'Reject Reason (rejreason)', type: 'string' },
] as const;

const STRING_OPERATORS = ['like', '=', '!=', 'not like'] as const;
const DATE_OPERATORS = ['>', '<', '>=', '<=', 'Between', 'Timespan'] as const;
const NUMBER_OPERATORS = ['=', '!=', '>', '<', '>=', '<='] as const;
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
        case 'number': return [...NUMBER_OPERATORS];
        case 'select': return [...SELECT_OPERATORS];
        default: return [...STRING_OPERATORS];
    }
};

const getFieldType = (fieldValue: string) =>
    ORDER_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = ORDER_FILTER_FIELDS.find(f => f.value === fieldValue);
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
    return <ScrollArea className="flex-1">{children}</ScrollArea>;
};

const LiveOrders: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { orgTreeData } = useOrgTree();
    const frappe = useContext(FrappeContext);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('ordersSearchQuery') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('ordersDateRange');
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

    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('ordersStatusFilter') || 'ALL');
    const [exchangeFilter, setExchangeFilter] = useState<string>(() => sessionStorage.getItem('ordersExchangeFilter') || 'ALL');
    const [tranTypeFilter, setTranTypeFilter] = useState<string>(() => sessionStorage.getItem('ordersTranTypeFilter') || 'ALL');
    const [parentFilter, setParentFilter] = useState<string>(() => sessionStorage.getItem('ordersParentFilter') || 'ALL');

    const [openParentBox, setOpenParentBox] = useState(false);
    const [parentSearch, setParentSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'norentm',
        direction: 'desc'
    });
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const [ordersData, setOrdersData] = useState<any[]>(() => {
        const stored = sessionStorage.getItem('ordersData');
        return stored ? JSON.parse(stored) : [];
    });
    const [isLoading, setIsLoading] = useState(() => {
        const stored = sessionStorage.getItem('ordersData');
        return stored ? JSON.parse(stored).length === 0 : true;
    });
    const [listError, setListError] = useState<any>(null);

    // Counts States
    const [totalCount, setTotalCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersTotalCount');
        return stored ? Number(stored) : 0;
    });
    const [completeCount, setCompleteCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersCompleteCount');
        return stored ? Number(stored) : 0;
    });
    const [openCount, setOpenCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersOpenCount');
        return stored ? Number(stored) : 0;
    });
    const [canceledCount, setCanceledCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersCanceledCount');
        return stored ? Number(stored) : 0;
    });
    const [rejectedCount, setRejectedCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersRejectedCount');
        return stored ? Number(stored) : 0;
    });
    const [triggerCount, setTriggerCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('ordersTriggerCount');
        return stored ? Number(stored) : 0;
    });

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
        const stored = localStorage.getItem('ordersColumnVisibility');
        return stored ? JSON.parse(stored) : {
            uid: true,
            client_name: true,
            tsym: true,
            trantype: true,
            qty: true,
            prc: true,
            avgprc: true,
            exch: true,
            status: true,
            norentm: true,
            norenordno: false,
            actid: false,
            branch: false,
            parent1: false,
            rejreason: false,
        };
    });

    useEffect(() => {
        localStorage.setItem('ordersColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('ordersSearchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('ordersDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('ordersDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('ordersStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('ordersExchangeFilter', exchangeFilter);
    }, [exchangeFilter]);

    useEffect(() => {
        sessionStorage.setItem('ordersTranTypeFilter', tranTypeFilter);
    }, [tranTypeFilter]);

    useEffect(() => {
        sessionStorage.setItem('ordersParentFilter', parentFilter);
    }, [parentFilter]);

    // Clear parent search when box closes
    useEffect(() => {
        if (!openParentBox) {
            setParentSearch('');
        }
    }, [openParentBox]);

    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(v => v).length;
    }, [columnVisibility]);

    // Filtered hierarchy for parent selection, sorted by category order
    const parentOptions = useMemo(() => {
        const tree = orgTreeData;
        if (!tree) return [];
        return [...tree]
            .sort((a, b) => {
                const pa = CATEGORY_ORDER[a.category?.toUpperCase() || ''] || 99;
                const pb = CATEGORY_ORDER[b.category?.toUpperCase() || ''] || 99;
                if (pa !== pb) return pa - pb;
                return a.name.localeCompare(b.name);
            });
    }, [orgTreeData]);

    const visibleParentOptions = useMemo(() => {
        if (!parentOptions) return [];
        if (!parentSearch) return parentOptions.slice(0, 100);

        const searchLower = parentSearch.toLowerCase();
        return parentOptions
            .filter(opt => {
                const code = (opt as any).code || (opt as any).org_code || '';
                return opt.name.toLowerCase().includes(searchLower) ||
                    code.toLowerCase().includes(searchLower) ||
                    (opt.category && opt.category.toLowerCase().includes(searchLower));
            })
            .slice(0, 100);
    }, [parentOptions, parentSearch]);

    const expandBranches = useCallback((selectedNodes: string[]) => {
        const tree = orgTreeData;
        if (!tree || !Array.isArray(tree)) return selectedNodes;

        const childrenMap = new Map<string, string[]>();
        tree.forEach(node => {
            const parent = node.parent_crm_heirarchy;
            if (parent) {
                if (!childrenMap.has(parent)) {
                    childrenMap.set(parent, []);
                }
                childrenMap.get(parent)!.push(node.name);
            }
        });

        const allCodes = new Set<string>();
        const collectDescendants = (nodeId: string) => {
            allCodes.add(nodeId);
            const children = childrenMap.get(nodeId);
            if (children) {
                children.forEach(collectDescendants);
            }
        };

        selectedNodes.forEach(name => collectDescendants(name));
        return Array.from(allCodes);
    }, [orgTreeData]);

    const getHierarchyCodes = useCallback((names: string[]) => {
        const tree = orgTreeData;
        if (!tree) return names;
        const codeMap = new Map<string, string>();
        tree.forEach((node: any) => {
            if (node.name) {
                const code = node.code || node.org_code || node.name;
                codeMap.set(node.name, code);
            }
        });
        return names.map(name => codeMap.get(name) || name);
    }, [orgTreeData]);

    const hierarchyFilters = useMemo(() => {
        const activeFilters: any[] = [];
        if (parentFilter !== 'ALL') {
            const tree = orgTreeData;
            const node = tree?.find((opt: any) => opt.name === parentFilter);
            const code = (node as any)?.code || (node as any)?.org_code || parentFilter;
            activeFilters.push(['parent1', '=', code]);
        } else if (selectedHierarchy && selectedHierarchy.length > 0) {
            const expandedNames = expandBranches(selectedHierarchy);
            const expandedCodes = getHierarchyCodes(expandedNames);
            activeFilters.push(['parent1', 'in', expandedCodes]);
        }
        return activeFilters;
    }, [selectedHierarchy, parentFilter, expandBranches, getHierarchyCodes, orgTreeData]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters = [...hierarchyFilters];

        if (debouncedSearchQuery) {
            if (/^\d+$/.test(debouncedSearchQuery)) {
                // Number check - match Order No (norenordno)
                activeFilters.push(['norenordno', 'like', `%${debouncedSearchQuery}%`]);
            } else if (debouncedSearchQuery.length <= 8) {
                // Typically client code / UID
                activeFilters.push(['uid', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                // Name check
                activeFilters.push(['client_name', 'like', `%${debouncedSearchQuery}%`]);
            }
        }

        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['norentm', '>=', formatLocal(dateRange[0]) + " 00:00:00"]);
            activeFilters.push(['norentm', '<=', formatLocal(dateRange[1]) + " 23:59:59"]);
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
    }, [hierarchyFilters, debouncedSearchQuery, dateRange, advancedFilters]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            activeFilters.push(['status', '=', statusFilter]);
        }
        if (exchangeFilter !== 'ALL') {
            activeFilters.push(['exch', '=', exchangeFilter]);
        }
        if (tranTypeFilter !== 'ALL') {
            activeFilters.push(['trantype', '=', tranTypeFilter]);
        }
        return activeFilters;
    }, [totalFilters, statusFilter, exchangeFilter, tranTypeFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, dateRange, statusFilter, exchangeFilter, tranTypeFilter, parentFilter, advancedFilters]);

    const hasPermissionError = !!permissionError;

    // Row sorting config
    const orderByObj = useMemo(() => {
        if (!sortConfig) {
            return { field: 'norentm', order: 'desc' as const };
        }
        return {
            field: sortConfig.key,
            order: sortConfig.direction
        };
    }, [sortConfig]);

    const limit_start = (currentPage - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const fetchData = useCallback(async () => {
        const savedFiltersStr = sessionStorage.getItem('ordersCacheFilters');
        const currentFiltersStr = JSON.stringify(filters);
        const filtersMatch = savedFiltersStr === currentFiltersStr;

        setIsRefreshing(true);
        if (!filtersMatch) {
            setIsLoading(true);
        }
        setListError(null);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Fetch list and counts in parallel via POST payload
            const [
                listRes,
                totalRes,
                completeRes,
                openRes,
                canceledRes,
                rejectedRes,
                triggerRes
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'Sky Order Feed',
                        fields: [
                            'norenordno',
                            'uid',
                            'actid',
                            'token',
                            'partid',
                            'qty',
                            'ls',
                            'prc',
                            'remarks',
                            'flqty',
                            'flprc',
                            'flid',
                            'fltm',
                            'prctyp',
                            'ret',
                            'exchordid',
                            'dscqty',
                            'branch',
                            'exch_tm',
                            'amo',
                            'ti',
                            'ordenttm',
                            'targetbroker',
                            'uidc',
                            'reporttype',
                            'os',
                            'parent1',
                            'status',
                            'exui',
                            'instname',
                            'pp',
                            'mult',
                            'prcftr',
                            'st_intrn',
                            'tm',
                            'client_name',
                            'exch',
                            'tsym',
                            'trantype',
                            'pcode',
                            'avgprc',
                            'ntm',
                            'kidid',
                            'fillshares',
                            'norentm',
                            'rejreason'
                        ],
                        filters,
                        order_by: `${orderByObj.field} ${orderByObj.order}`,
                        limit_start,
                        limit_page_length: limit
                    })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: totalFilters })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: [...totalFilters, ['status', '=', 'COMPLETE']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: [...totalFilters, ['status', '=', 'OPEN']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: [...totalFilters, ['status', '=', 'CANCELED']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: [...totalFilters, ['status', '=', 'REJECTED']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                }),
                fetch(`${API_BASE_URL}/api/method/frappe.client.get_count`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ doctype: 'Sky Order Feed', filters: [...totalFilters, ['status', '=', 'TRIGGER_PENDING']] })
                }).then(r => {
                    if (!r.ok) throw new Error(`HTTP error ${r.status}`);
                    return r.json();
                })
            ]);

            if (listRes.message) {
                setOrdersData(listRes.message);
                sessionStorage.setItem('ordersData', JSON.stringify(listRes.message));
                sessionStorage.setItem('ordersCacheFilters', JSON.stringify(filters));
            }
            if (totalRes.hasOwnProperty('message')) setTotalCount(totalRes.message || 0);
            if (completeRes.hasOwnProperty('message')) setCompleteCount(completeRes.message || 0);
            if (openRes.hasOwnProperty('message')) setOpenCount(openRes.message || 0);
            if (canceledRes.hasOwnProperty('message')) setCanceledCount(canceledRes.message || 0);
            if (rejectedRes.hasOwnProperty('message')) setRejectedCount(rejectedRes.message || 0);
            if (triggerRes.hasOwnProperty('message')) setTriggerCount(triggerRes.message || 0);

        } catch (err: any) {
            console.error('Error fetching orders data:', err);
            setListError(err);

            const is403 = err.status === 403 || err.message?.includes('403');
            const isPermissionError =
                err.exception?.includes('PermissionError') ||
                err.exc_type === 'PermissionError' ||
                err.message?.includes('PermissionError') ||
                err.message?.includes('Insufficient Permission');

            if (is403 || isPermissionError) {
                setPermissionError(err.message || "Insufficient Permission for Sky Order Feed doctype");
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [filters, totalFilters, orderByObj, limit_start, limit, setIsRefreshing]);

    useEffect(() => {
        if (!hasPermissionError) {
            fetchData();
        }
    }, [fetchData, hasPermissionError]);

    // Fetch full order details when a row is clicked
    const { data: selectedOrderDoc, isLoading: isDocLoading } = useFrappeGetDoc<any>(
        'Sky Order Feed',
        selectedOrderId || '',
        selectedOrderId ? undefined : null
    );

    // Save orders to sessionStorage when loaded
    useEffect(() => {
        if (ordersData && ordersData.length > 0) {
            sessionStorage.setItem('ordersData', JSON.stringify(ordersData));
        }
    }, [ordersData]);

    useEffect(() => {
        sessionStorage.setItem('ordersTotalCount', String(totalCount));
    }, [totalCount]);

    useEffect(() => {
        sessionStorage.setItem('ordersCompleteCount', String(completeCount));
    }, [completeCount]);

    useEffect(() => {
        sessionStorage.setItem('ordersOpenCount', String(openCount));
    }, [openCount]);

    useEffect(() => {
        sessionStorage.setItem('ordersCanceledCount', String(canceledCount));
    }, [canceledCount]);

    useEffect(() => {
        sessionStorage.setItem('ordersRejectedCount', String(rejectedCount));
    }, [rejectedCount]);

    useEffect(() => {
        sessionStorage.setItem('ordersTriggerCount', String(triggerCount));
    }, [triggerCount]);

    const error = listError ? (listError.message || 'An error occurred') : permissionError;

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig?.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchData();
            toast.success('Live orders refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setExchangeFilter('ALL');
        setTranTypeFilter('ALL');
        setParentFilter('ALL');
        setDateRange(null);
        setAdvancedFilters([]);
        setCurrentPage(1);
        toast.success('All filters and search criteria cleared.');
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: totalCount });
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            let allData: any[] = [];
            let current_limit_start = 0;
            const limit_page_length = 5000;
            let hasMore = true;

            while (hasMore) {
                const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'Sky Order Feed',
                        fields: [
                            'norenordno',
                            'uid',
                            'actid',
                            'client_name',
                            'tsym',
                            'trantype',
                            'qty',
                            'fillshares',
                            'prc',
                            'avgprc',
                            'exch',
                            'status',
                            'branch',
                            'parent1',
                            'norentm',
                            'rejreason'
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
                    'Order No': item.norenordno,
                    'Client ID': item.uid,
                    'Account ID': item.actid,
                    'Client Name': item.client_name,
                    'Symbol': item.tsym,
                    'Type': item.trantype === 'B' ? 'BUY' : item.trantype === 'S' ? 'SELL' : item.trantype,
                    'Qty': item.qty,
                    'Filled Qty': item.fillshares,
                    'Price': item.prc,
                    'Avg Price': item.avgprc,
                    'Exchange': item.exch,
                    'Status': item.status,
                    'Branch': item.branch,
                    'Parent': item.parent1,
                    'Order Time': item.norentm,
                    'Reject Reason': item.rejreason
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Live_Orders_Export_${todayStr}`);
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



    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const formatValue = (value: string | number | null) => value !== undefined && value !== null && value !== '' ? value : '-';

    const renderExchangeBadge = (exch: string | null | undefined) => {
        if (!exch) return '-';
        const ex = exch.toUpperCase();

        const badgeStyles: Record<string, string> = {
            'NSE': 'bg-blue-50 text-blue-700 border-blue-150 hover:bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
            'NFO': 'bg-cyan-50 text-cyan-700 border-cyan-150 hover:bg-cyan-50 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30',
            'BSE': 'bg-indigo-50 text-indigo-700 border-indigo-150 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
            'MCX': 'bg-orange-50 text-orange-700 border-orange-150 hover:bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
            'BFO': 'bg-rose-50 text-rose-700 border-rose-150 hover:bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
            'NCOM': 'bg-slate-50 text-slate-700 border-slate-150 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };

        const currentStyle = badgeStyles[ex] || 'bg-slate-50 text-slate-600 border-slate-150 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

        return (
            <Badge variant="outline" className={cn("font-bold px-2 py-0.5 rounded-md text-[10px]", currentStyle)}>
                {ex}
            </Badge>
        );
    };

    const renderStatusBadge = (status: string | null | undefined) => {
        if (!status) return '-';
        const st = status.toUpperCase();

        const badgeStyles: Record<string, string> = {
            'COMPLETE': 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30',
            'OPEN': 'bg-blue-100 text-blue-750 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
            'CANCELED': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
            'REJECTED': 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
            'TRIGGER_PENDING': 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-405 dark:border-purple-900/30',
            'INVALID_STATUS_TYPE': 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        };

        const currentStyle = badgeStyles[st] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

        return (
            <Badge className={cn("font-bold px-2.5 py-0.5 rounded-full text-[10px] capitalize border-none", currentStyle)}>
                {status.replace(/_/g, ' ').toLowerCase()}
            </Badge>
        );
    };

    const renderTranTypeBadge = (type: string | null | undefined) => {
        if (!type) return '-';
        const t = type.toUpperCase();
        return t === 'B' ? (
            <Badge variant="outline" className="font-bold px-2 py-0.5 rounded-md text-[10px] bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                BUY
            </Badge>
        ) : (
            <Badge variant="outline" className="font-bold px-2 py-0.5 rounded-md text-[10px] bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                SELL
            </Badge>
        );
    };

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-6",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            <div className="shrink-0 space-y-4">
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total Orders</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 dark:text-green-455 uppercase tracking-wider">Complete</span>
                            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completeCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 dark:text-blue-455 uppercase tracking-wider">Open</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{openCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-455 uppercase tracking-wider">Canceled</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{canceledCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-455 uppercase tracking-wider">Rejected</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{rejectedCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-purple-600 dark:text-purple-455 uppercase tracking-wider">Trigger Pending</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1 bg-slate-200 dark:bg-slate-800" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{triggerCount}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters Trigger */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-250 gap-2 shrink-0">
                                <Filter className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50">
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
                                                            ? ORDER_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs text-slate-800 dark:text-slate-100" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {ORDER_FILTER_FIELDS.map((field) => (
                                                                <CommandItem
                                                                    key={field.value}
                                                                    value={field.label}
                                                                    onSelect={() => {
                                                                        const defaultOp = getOperatorsForType(field.type)[0];
                                                                        const defaultVal = field.type === 'date' && defaultOp === 'Between' ? ['', ''] as [string, string] : '';
                                                                        updateDraftFilter(filter.id, { field: field.value, operator: defaultOp, value: defaultVal });
                                                                        setFieldComboOpen(prev => ({ ...prev, [filter.id]: false }));
                                                                    }}
                                                                    className="text-xs text-slate-700 dark:text-slate-300 font-medium"
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
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
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
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400 dark:text-slate-500'
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
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select period..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
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
                                            ) : getFieldType(filter.field) === 'select' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select option..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                                        {getFieldOptions(filter.field).map((opt) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">
                                                                {opt}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={getFieldType(filter.field) === 'date' ? 'date' : (getFieldType(filter.field) === 'number' ? 'number' : 'text')}
                                                    placeholder="Value"
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 text-slate-800 dark:text-slate-100 rounded-lg"
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

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350"
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
                                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 border-none"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Date Picker */}
                    <div className="w-[260px] shrink-0">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Order Date Range"
                        />
                    </div>

                    {/* Status Select */}
                    <div className="w-[160px] shrink-0">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-805 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2 truncate">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="COMPLETE">Complete</SelectItem>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="CANCELED">Canceled</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                                <SelectItem value="TRIGGER_PENDING">Trigger Pending</SelectItem>
                                <SelectItem value="INVALID_STATUS_TYPE">Invalid Status</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Exchange Select */}
                    <div className="w-[150px] shrink-0">
                        <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-805 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2 truncate">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <SelectValue placeholder="Exchange" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <SelectItem value="ALL">All Exchanges</SelectItem>
                                <SelectItem value="NSE">NSE</SelectItem>
                                <SelectItem value="NFO">NFO</SelectItem>
                                <SelectItem value="BSE">BSE</SelectItem>
                                <SelectItem value="MCX">MCX</SelectItem>
                                <SelectItem value="BFO">BFO</SelectItem>
                                <SelectItem value="NCOM">NCOM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Transaction Type Select */}
                    <div className="w-[140px] shrink-0">
                        <Select value={tranTypeFilter} onValueChange={setTranTypeFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-805 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2 truncate">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <SelectValue placeholder="Type" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="B">Buy</SelectItem>
                                <SelectItem value="S">Sell</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Parent Combobox Filter */}
                    <div className="w-[200px] shrink-0">
                        <Popover open={openParentBox} onOpenChange={setOpenParentBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openParentBox}
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {parentFilter === "ALL"
                                                ? "Select Parent"
                                                : (parentOptions.find((opt) => opt.name === parentFilter) as any)?.code ||
                                                (parentOptions.find((opt) => opt.name === parentFilter) as any)?.org_code ||
                                                (parentOptions.find((opt) => opt.name === parentFilter) as any)?.name ||
                                                parentFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                    <CommandInput
                                        placeholder="Search parent..."
                                        className="h-9 text-slate-800 dark:text-slate-100"
                                        value={parentSearch}
                                        onValueChange={setParentSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No parent found.</CommandEmpty>
                                        <CommandGroup>
                                            {!parentSearch && (
                                                <CommandItem
                                                    value="ALL"
                                                    onSelect={() => {
                                                        setParentFilter("ALL");
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between text-slate-700 dark:text-slate-300"
                                                >
                                                    <span>All Parents</span>
                                                    {parentFilter === "ALL" && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                                </CommandItem>
                                            )}
                                            {visibleParentOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={opt.name}
                                                    onSelect={() => {
                                                        setParentFilter(opt.name === parentFilter ? "ALL" : opt.name);
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                                                >
                                                    <span className="truncate text-sm">
                                                        {(opt as any).code || (opt as any).org_code || opt.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {opt.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1 py-0 h-3.5 uppercase font-bold border",
                                                                    getCategoryStyles(opt.category)
                                                                )}
                                                            >
                                                                {opt.category}
                                                            </Badge>
                                                        )}
                                                        {parentFilter === opt.name && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[200px] h-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Search client ID, name, order no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-805 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10 text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Columns selection dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850 gap-2 shrink-0">
                                <Columns3 className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Columns</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                            <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                                {Object.keys(columnVisibility).map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col}
                                        checked={columnVisibility[col]}
                                        onCheckedChange={(checked) =>
                                            setColumnVisibility((prev) => ({ ...prev, [col]: checked }))
                                        }
                                        className="text-xs uppercase font-medium text-slate-700 dark:text-slate-300"
                                    >
                                        {col.replace(/1/g, '').replace(/norentm/g, 'datetime').replace(/norenordno/g, 'order no').replace(/tsym/g, 'symbol').replace(/trantype/g, 'side').replace(/exch/g, 'exchange').replace(/uid/g, 'client id').replace(/actid/g, 'account id').replace(/avgprc/g, 'avg price').replace(/rejreason/g, 'reject reason')}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Refresh Button */}
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading || isExporting}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {/* Reset Button */}
                    {(searchQuery || statusFilter !== 'ALL' || exchangeFilter !== 'ALL' || tranTypeFilter !== 'ALL' || parentFilter !== 'ALL' || dateRange !== null || advancedFilters.length > 0) && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResetFilters}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-905 dark:hover:text-slate-100 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            Reset
                        </Button>
                    )}

                    {/* Pagination in header row */}
                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0 text-slate-800 dark:text-slate-200">
                            <span className="text-sm font-bold text-purple-600">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850"
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
            )}            {/* Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                {/* Order No column - always visible */}
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('norenordno')}>
                                    <div className="flex items-center gap-2">
                                        Order No
                                        {sortConfig?.key === 'norenordno' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                    </div>
                                </th>
                                {columnVisibility.uid && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('uid')}>
                                        <div className="flex items-center gap-2">
                                            Client ID
                                            {sortConfig?.key === 'uid' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.client_name && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('client_name')}>
                                        <div className="flex items-center gap-2">
                                            Client Name
                                            {sortConfig?.key === 'client_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.tsym && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('tsym')}>
                                        <div className="flex items-center gap-2">
                                            Symbol
                                            {sortConfig?.key === 'tsym' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.trantype && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('trantype')}>
                                        <div className="flex items-center gap-2">
                                            Side
                                            {sortConfig?.key === 'trantype' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.qty && (
                                    <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('qty')}>
                                        <div className="flex items-center gap-2 justify-end">
                                            Qty / Filled
                                            {sortConfig?.key === 'qty' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.prc && (
                                    <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('prc')}>
                                        <div className="flex items-center gap-2 justify-end">
                                            Price
                                            {sortConfig?.key === 'prc' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.avgprc && (
                                    <th className="text-right py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('avgprc')}>
                                        <div className="flex items-center gap-2 justify-end">
                                            Avg Price
                                            {sortConfig?.key === 'avgprc' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.exch && (
                                    <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Exchange</th>
                                )}
                                {columnVisibility.status && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-2">
                                            Status
                                            {sortConfig?.key === 'status' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.norentm && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('norentm')}>
                                        <div className="flex items-center gap-2">
                                            Datetime
                                            {sortConfig?.key === 'norentm' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.actid && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Account ID</th>
                                )}
                                {columnVisibility.branch && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Branch</th>
                                )}
                                {columnVisibility.parent1 && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Parent</th>
                                )}
                                {columnVisibility.rejreason && (
                                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Reject Reason</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/45">
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-800" /></td>
                                        {columnVisibility.uid && <td className="py-3 px-4"><Skeleton className="h-4 w-16 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.client_name && <td className="py-3 px-4"><Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.tsym && <td className="py-3 px-4"><Skeleton className="h-4 w-20 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.trantype && <td className="py-3 px-4"><Skeleton className="h-4 w-12 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.qty && <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.prc && <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.avgprc && <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.exch && <td className="py-3 px-4 text-center"><Skeleton className="h-4 w-12 mx-auto rounded-md bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.status && <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.norentm && <td className="py-3 px-4"><Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.actid && <td className="py-3 px-4"><Skeleton className="h-4 w-16 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.branch && <td className="py-3 px-4"><Skeleton className="h-4 w-20 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.parent1 && <td className="py-3 px-4"><Skeleton className="h-4 w-20 bg-slate-200 dark:bg-slate-800" /></td>}
                                        {columnVisibility.rejreason && <td className="py-3 px-4"><Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-800" /></td>}
                                    </tr>
                                ))
                            ) : ordersData && ordersData.length > 0 ? (
                                ordersData.map((row: any, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedOrderId(row.norenordno)}
                                    >
                                        <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">{formatValue(row.norenordno)}</td>
                                        {columnVisibility.uid && <td className="py-3 px-4 text-slate-700 dark:text-slate-350 font-mono text-xs">{formatValue(row.uid)}</td>}
                                        {columnVisibility.client_name && <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-semibold">{formatValue(row.client_name)}</td>}
                                        {columnVisibility.tsym && <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 font-bold">{formatValue(row.tsym)}</td>}
                                        {columnVisibility.trantype && <td className="py-3 px-4">{renderTranTypeBadge(row.trantype)}</td>}
                                        {columnVisibility.qty && (
                                            <td className="py-3 px-4 text-right font-medium">
                                                <span className="text-slate-900 dark:text-slate-100">{formatValue(row.qty)}</span>
                                                <span className="text-slate-400 dark:text-slate-500 text-xs font-normal"> / {formatValue(row.fillshares || 0)}</span>
                                            </td>
                                        )}
                                        {columnVisibility.prc && <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{formatValue(row.prc)}</td>}
                                        {columnVisibility.avgprc && <td className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-350">{formatValue(row.avgprc || 0)}</td>}
                                        {columnVisibility.exch && <td className="py-3 px-4 text-center">{renderExchangeBadge(row.exch)}</td>}
                                        {columnVisibility.status && <td className="py-3 px-4">{renderStatusBadge(row.status)}</td>}
                                        {columnVisibility.norentm && <td className="py-3 px-4 text-slate-500 dark:text-slate-405 text-xs whitespace-nowrap">{formatValue(row.norentm)}</td>}
                                        {columnVisibility.actid && <td className="py-3 px-4 text-slate-500 dark:text-slate-405 font-mono text-xs">{formatValue(row.actid)}</td>}
                                        {columnVisibility.branch && <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatValue(row.branch)}</td>}
                                        {columnVisibility.parent1 && <td className="py-3 px-4 text-slate-500 dark:text-slate-405 font-mono text-xs">{formatValue(row.parent1)}</td>}
                                        {columnVisibility.rejreason && (
                                            <td className="py-3 px-4 text-slate-500 dark:text-slate-405 text-xs max-w-[200px] truncate" title={row.rejreason}>
                                                {formatValue(row.rejreason)}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={visibleColumnCount + 1} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-550">
                                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-100/50 dark:border-slate-800 shadow-sm">
                                                <ClipboardList className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No Orders Found</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto mb-6">
                                                We couldn't find any orders matching your current filters or search criteria.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleResetFilters}
                                                className="rounded-xl px-6 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350 bg-white dark:bg-slate-900 font-semibold h-10 transition-all hover:scale-105 active:scale-95"
                                            >
                                                Clear All Filters
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableWrapper>

                {/* Status Info Footer */}
                <div className="shrink-0 py-2 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</span> orders
                    </p>
                </div>
            </Card>

            {/* Order Details Drawer Sheet */}
            <Sheet open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-xl border-l-0 p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
                    <SheetHeader className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/20 border-2 border-white dark:border-slate-900">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-905 dark:text-slate-100">Order Execution Details</SheetTitle>
                                <SheetDescription className="text-slate-505 dark:text-slate-400 font-medium">
                                    Order ID: <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">{selectedOrderId}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            {isDocLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" />
                                        <Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" />
                                    </div>
                                    <Skeleton className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" />
                                        <Skeleton className="h-10 w-full bg-slate-200 dark:bg-slate-800" />
                                    </div>
                                </div>
                            ) : selectedOrderDoc ? (
                                <div className="space-y-6">
                                    {/* Section 1: Instrument & Core Details */}
                                    <div className="bg-slate-50 dark:bg-slate-950/20 rounded-2xl p-4 border border-slate-100/80 dark:border-slate-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Trading Symbol</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">{formatValue(selectedOrderDoc.tsym)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {renderTranTypeBadge(selectedOrderDoc.trantype)}
                                                {renderExchangeBadge(selectedOrderDoc.exch)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                                            <div>
                                                <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-bold block">Status</span>
                                                <div className="mt-1">{renderStatusBadge(selectedOrderDoc.status)}</div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-405 dark:text-slate-500 uppercase font-bold block">Product Code</span>
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 block font-mono">{formatValue(selectedOrderDoc.pcode)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Pricing & Execution */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5" /> Pricing & Quantity
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Price</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatValue(selectedOrderDoc.prc)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Average Price</span>
                                                <span className="text-sm font-bold text-slate-905 dark:text-slate-100">{formatValue(selectedOrderDoc.avgprc || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Total Quantity</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatValue(selectedOrderDoc.qty)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Filled Shares</span>
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatValue(selectedOrderDoc.fillshares || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Filled Qty</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.flqty || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Filled Price</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.flprc || 0)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Lot Size</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.ls)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Disclosed Qty</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.dscqty)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Client & Hierarchy */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" /> Client & Hierarchy
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Client ID (uid)</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">{formatValue(selectedOrderDoc.uid)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Client Name</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatValue(selectedOrderDoc.client_name)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Account ID (actid)</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.actid)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Branch</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.branch)}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Parent (parent1)</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.parent1)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Exchange & Order Metadata */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5" /> Execution Timestamps
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Order Entry Time</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.ordenttm)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Exchange Time</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.exch_tm)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Fill Time</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.fltm)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Order DateTime</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.norentm)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Exchange Order ID</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.exchordid)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Fill ID</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.flid)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 5: Other Parameters */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                                            <Info className="w-3.5 h-3.5" /> Order Properties
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Price Type</span>
                                                <span className="text-sm font-semibold text-slate-750 dark:text-slate-250 font-mono">{formatValue(selectedOrderDoc.prctyp)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Retention</span>
                                                <span className="text-sm font-semibold text-slate-750 dark:text-slate-250 font-mono">{formatValue(selectedOrderDoc.ret)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">AMO Flag</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.amo)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Target Broker</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.targetbroker)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Order Status (os)</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.os)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Report Type</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.reporttype)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Multiplier</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.mult)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Price Factor</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.prcftr)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Price Precision</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatValue(selectedOrderDoc.pp)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Token</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.token)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Participant ID</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.partid)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium block">Kid ID</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatValue(selectedOrderDoc.kidid)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rejection Details */}
                                    {selectedOrderDoc.rejreason && (
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4">
                                            <span className="text-[10px] text-red-500 dark:text-red-405 uppercase font-bold block mb-1">Reject Reason</span>
                                            <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">{selectedOrderDoc.rejreason}</p>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default LiveOrders;
