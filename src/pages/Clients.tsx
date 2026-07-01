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
    Users,
    UserCheck,
    UserPlus,
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
    ExternalLink,
    Plus,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { useFrappeGetDocList, useFrappeGetDocCount, FrappeContext } from 'frappe-react-sdk';
import useSWR from 'swr';

export interface ClientItem {
    name: string;
    creation: string;
    modified: string;
    client_code: string;
    client_name: string;
    branch: string;
    account_opened_date: string;
    mobile_number: string;
    parent1: string;
    activation_status: string;
    nse: string;
    bse: string;
    mcx: string;
    nfo: string;
    bfo: string;
    last_traded_day: string;
    trade_done: string;
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
        case 'ZONE': return 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
        case 'REGION': return 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
        case 'BRANCH': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700';
        case 'RM': return 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50';
        case 'AP': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
        case 'U-AP': return 'bg-cyan-100 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50';
        case 'CLIENT': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
        default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
};

const GOPOCKET_CLIENT_FILTER_FIELDS = [
    { value: 'client_code', label: 'Client Code', type: 'string' },
    { value: 'client_name', label: 'Client Name', type: 'string' },
    { value: 'pan_number', label: 'PAN Number', type: 'string' },
    { value: 'branch', label: 'Branch', type: 'string' },
    { value: 'mobile_number', label: 'Mobile Number', type: 'string' },
    { value: 'email_id', label: 'Email ID', type: 'string' },
    { value: 'parent1', label: 'Parent Code', type: 'string' },
    { value: 'state', label: 'State', type: 'string' },
    { value: 'pin', label: 'PIN Code', type: 'string' },
    { value: 'annual_income', label: 'Annual Income', type: 'string' },
    { value: 'customer_type', label: 'Customer Type', type: 'select', options: ['Company', 'HUF', 'Individual', 'NRI (NRO A/C)', 'On Behalf Of Minor'] },
    { value: 'gender', label: 'Gender', type: 'select', options: ['M', 'F', 'N'] },
    { value: 'marital_status', label: 'Marital Status', type: 'select', options: ['Married', 'Un-Married', 'Others'] },
    { value: 'account_opened_date', label: 'Account Opened Date', type: 'date' },
    { value: 'dob', label: 'DOB', type: 'date' },
    { value: 'first_trade_day', label: 'First Trade Day', type: 'date' },
    { value: 'last_traded_day', label: 'Last Traded Day', type: 'date' },
    { value: 'traded_days', label: 'Traded Days', type: 'number' },
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
    GOPOCKET_CLIENT_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = GOPOCKET_CLIENT_FILTER_FIELDS.find(f => f.value === fieldValue);
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

const postFetcher = async (payload: { url: string; body: Record<string, any> }) => {
    const response = await fetch(payload.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload.body)
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

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { orgTreeData } = useOrgTree();
    const frappe = useContext(FrappeContext);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('clientsSearchQuery') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('clientsDateRange');
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
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('clientsStatusFilter') || 'ALL');
    const [tradeDoneFilter, setTradeDoneFilter] = useState<string>(() => sessionStorage.getItem('clientsTradeDoneFilter') || 'ALL');
    const [parentFilter, setParentFilter] = useState<string>(() => sessionStorage.getItem('clientsParentFilter') || 'ALL');
    const [openParentBox, setOpenParentBox] = useState(false);
    const [parentSearch, setParentSearch] = useState('');

    useEffect(() => {
        if (!openParentBox) {
            setParentSearch('');
        }
    }, [openParentBox]);

    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ClientItem; direction: 'asc' | 'desc' } | null>({
        key: 'account_opened_date',
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
        const stored = localStorage.getItem('clientsColumnVisibility');
        return stored ? JSON.parse(stored) : {
            mobile: true,
            client_name: true,
            opened_date: true,
            trade_done: true,
            last_trade: true,
            parent: true,
            nse: false,
            bse: false,
            mcx: false,
            nfo: false,
            bfo: false,
            status: true,
        };
    });

    useEffect(() => {
        localStorage.setItem('clientsColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('clientsSearchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('clientsDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('clientsDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('clientsStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('clientsTradeDoneFilter', tradeDoneFilter);
    }, [tradeDoneFilter]);

    useEffect(() => {
        sessionStorage.setItem('clientsParentFilter', parentFilter);
    }, [parentFilter]);

    const visibleColumnCount = useMemo(() => {
        // client_code is always visible
        return 1 + Object.values(columnVisibility).filter(v => v).length;
    }, [columnVisibility]);

    // Filtered hierarchy for parent selection, sorted by category order
    const parentOptions = useMemo(() => {
        const tree = orgTreeData;
        if (!tree) return [];
        return (tree as Array<any>)
            .filter(item => item.is_group === 1)
            .sort((a, b) => {
                const pa = CATEGORY_ORDER[a.category?.toUpperCase() || ''] || 99;
                const pb = CATEGORY_ORDER[b.category?.toUpperCase() || ''] || 99;
                if (pa !== pb) return pa - pb;
                return a.name.localeCompare(b.name);
            });
    }, [orgTreeData]);

    const userNameMap = useMemo(() => {
        if (!orgTreeData) return new Map<string, string>();
        return new Map(orgTreeData.map(node => [node.name, node.name1 || '']));
    }, [orgTreeData]);

    const userCodeMap = useMemo(() => {
        const tree = orgTreeData;
        if (!tree) return new Map<string, string>();
        return new Map(
            (tree as any[]).map(node => {
                const code = node.code || node.org_code || node.name;
                const isRM = node.org_type === 'RM' || node.category === 'RM';
                const displayName = isRM ? `${code} ${node.name1 || ''}`.trim() : code;
                return [node.name, displayName];
            })
        );
    }, [orgTreeData]);

    const visibleParentOptions = useMemo(() => {
        if (!parentOptions) return [];
        if (!parentSearch) return parentOptions.slice(0, 100);

        const searchLower = parentSearch.toLowerCase();
        return parentOptions
            .filter(opt => {
                const code = opt.code || opt.org_code || '';
                const clientName = userNameMap.get(opt.name) || '';
                const name1 = opt.name1 || '';
                return opt.name.toLowerCase().includes(searchLower) ||
                    code.toLowerCase().includes(searchLower) ||
                    clientName.toLowerCase().includes(searchLower) ||
                    name1.toLowerCase().includes(searchLower) ||
                    (opt.category && opt.category.toLowerCase().includes(searchLower));
            })
            .slice(0, 100);
    }, [parentOptions, parentSearch, userNameMap]);

    const formatUserName = useCallback((userCode: string) => {
        if (!userCode || userCode === 'ALL') return userCode;
        const name = userNameMap.get(userCode);
        if (name) {
            // Check if it's an RM type in orgTreeData
            const node = orgTreeData?.find(n => n.name === userCode);
            if (node?.category?.toUpperCase() === 'RM') {
                return `${name} ${userCode}`;
            }
            return userCode;
        }
        return userCode;
    }, [userNameMap, orgTreeData]);

    // Define hierarchy tree expansion logic
    const expandBranches = useCallback((selectedNodes: string[]) => {
        if (!orgTreeData || !Array.isArray(orgTreeData)) return selectedNodes;

        const childrenMap = new Map<string, string[]>();
        orgTreeData.forEach(node => {
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
        const parentFilterList = selectedHierarchy && selectedHierarchy.length > 0
            ? expandBranches(selectedHierarchy)
            : [];
        const combinedParents = parentFilter !== 'ALL'
            ? [...new Set([parentFilter, ...parentFilterList])]
            : parentFilterList;

        const combinedCodes = getHierarchyCodes(combinedParents);

        if (combinedCodes.length > 0) {
            activeFilters.push(['parent1', 'in', combinedCodes]);
        }
        return activeFilters;
    }, [selectedHierarchy, parentFilter, expandBranches, getHierarchyCodes]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters = [...hierarchyFilters];

        if (debouncedSearchQuery) {
            if (/^\d/.test(debouncedSearchQuery)) {
                activeFilters.push(['mobile_number', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                activeFilters.push(['client_code', 'like', `%${debouncedSearchQuery}%`]);
            }
        }

        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['account_opened_date', '>=', formatLocal(dateRange[0])]);
            activeFilters.push(['account_opened_date', '<=', formatLocal(dateRange[1])]);
        }

        if (tradeDoneFilter !== 'ALL') {
            activeFilters.push(['trade_done', '=', tradeDoneFilter]);
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
    }, [hierarchyFilters, debouncedSearchQuery, dateRange, tradeDoneFilter, advancedFilters]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            activeFilters.push(['activation_status', '=', statusFilter]);
        }
        return activeFilters;
    }, [totalFilters, statusFilter]);

    const rootParentNode = useMemo(() => {
        if (parentFilter !== 'ALL') {
            return parentFilter;
        }
        if (selectedHierarchy && selectedHierarchy.length > 0) {
            return selectedHierarchy[0];
        }
        return user?.user_code || '';
    }, [parentFilter, selectedHierarchy, user]);

    const directFilters = useMemo(() => {
        return [...totalFilters, ['parent_type', 'in', ['BRANCH', 'RM', 'ZONE', 'HO', 'REGION']]];
    }, [totalFilters]);

    const indirectFilters = useMemo(() => {
        return [...totalFilters, ['parent_type', 'in', ['U-AP', 'AUTHOPER']]];
    }, [totalFilters]);

    // List Query setup
    const limit_start = (currentPage - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const orderByObj = useMemo(() => {
        if (!sortConfig) {
            return { field: 'account_opened_date', order: 'desc' as const };
        }
        return {
            field: sortConfig.key,
            order: sortConfig.direction
        };
    }, [sortConfig]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    // Count queries via SWR
    const { data: totalCount = 0, error: totalCountErr, mutate: mutateTotalCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: totalFilters }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: activeCount = 0, error: activeCountErr, mutate: mutateActiveCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: [...totalFilters, ['activation_status', '=', 'ACTIVE']] }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: closedCount = 0, error: closedCountErr, mutate: mutateClosedCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: [...totalFilters, ['activation_status', '=', 'CLOSED']] }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: dormantCount = 0, error: dormantCountErr, mutate: mutateDormantCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: [...totalFilters, ['activation_status', '=', 'DORMANT']] }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: directCount = 0, error: directCountErr, mutate: mutateDirectCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: directFilters }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: indirectCount = 0, error: indirectCountErr, mutate: mutateIndirectCount } = useSWR(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_count`,
            body: { doctype: 'Gopocket Client', filters: indirectFilters }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    // List query via SWR
    const {
        data: clientsData = [],
        error: listError,
        isLoading,
        mutate: mutateList
    } = useSWR<any[]>(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_list`,
            body: {
                doctype: 'Gopocket Client',
                fields: [
                    'client_code',
                    'client_name',
                    'mobile_number',
                    'parent1',
                    'account_opened_date',
                    'trade_done',
                    'last_traded_day',
                    'nse',
                    'bse',
                    'mcx',
                    'nfo',
                    'bfo',
                    'activation_status'
                ],
                filters,
                order_by: `${orderByObj.field} ${orderByObj.order}`,
                limit_start,
                limit_page_length: limit
            }
        },
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const statusCount = useMemo(() => ({
        ACTIVE: activeCount,
        CLOSED: closedCount,
        DORMANT: dormantCount
    }), [activeCount, closedCount, dormantCount]);

    useEffect(() => {
        const errors = [listError, totalCountErr, activeCountErr, closedCountErr, dormantCountErr, directCountErr, indirectCountErr];
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
                    let msg = "Insufficient Permission for Gopocket Client";
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
    }, [listError, totalCountErr, activeCountErr, closedCountErr, dormantCountErr, directCountErr, indirectCountErr]);

    // Save clients to sessionStorage when loaded
    useEffect(() => {
        if (clientsData && clientsData.length > 0) {
            sessionStorage.setItem('clientsData', JSON.stringify(clientsData));
        }
    }, [clientsData]);

    const error = listError ? (typeof listError === 'string' ? listError : (listError.message || 'An error occurred')) : permissionError;

    const handleSort = (key: keyof ClientItem) => {
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
                mutateList(),
                mutateTotalCount(),
                mutateActiveCount(),
                mutateClosedCount(),
                mutateDormantCount(),
                mutateDirectCount(),
                mutateIndirectCount(),
            ]);
            toast.success('Clients data refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
        setTradeDoneFilter('ALL');
        setParentFilter('ALL');
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

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const headers = { 'Content-Type': 'application/json' };

            while (hasMore) {
                const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'Gopocket Client',
                        fields: [
                            'client_code',
                            'client_name',
                            'mobile_number',
                            'parent1',
                            'account_opened_date',
                            'trade_done',
                            'last_traded_day',
                            'nse',
                            'bse',
                            'mcx',
                            'nfo',
                            'bfo',
                            'activation_status'
                        ],
                        filters: totalFilters,
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
                    'Client Code': item.client_code,
                    'Name': item.client_name,
                    'Mobile': item.mobile_number,
                    'Parent': item.parent1,
                    'Opened Date': item.account_opened_date,
                    'Trade Done': item.trade_done,
                    'Last Trade': item.last_traded_day,
                    'NSE': item.nse,
                    'BSE': item.bse,
                    'MCX': item.mcx,
                    'NFO': item.nfo,
                    'BFO': item.bfo,
                    'Status': item.activation_status
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Clients_Export_${todayStr}`);
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
    }, [debouncedSearchQuery, statusFilter, tradeDoneFilter, parentFilter, dateRange]);

    const sortedData = useMemo(() => {
        if (!clientsData) return [];
        const result = [...clientsData];
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
    }, [clientsData, sortConfig]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const formatValue = (value: string | null) => value || '-';

    const renderExchangeBadge = (status: string | null | undefined) => {
        if (!status) return '-';

        const normalizedStatus = status.toUpperCase();

        const statusStyles: Record<string, string> = {
            'ACTIVE': "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-300",
            'REACTIVATED': "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300",
            'SUSPENDED': "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300",
            'CLOSED': "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300",
            'DORMANT': "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-300",
            'INACTIVE': "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-400 dark:hover:text-slate-400",
            'NOT ENABLED': "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300",
        };

        const currentStyle = statusStyles[normalizedStatus] || "bg-slate-50 dark:bg-slate-850 text-slate-300 dark:text-slate-600";

        const displayText = normalizedStatus === 'INACTIVE' ? 'NOT ENABLED' : status;

        return (
            <Badge
                className={cn(
                    "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px] whitespace-nowrap",
                    currentStyle
                )}
            >
                {displayText}
            </Badge>
        );
    };

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-6",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 dark:text-green-405 uppercase tracking-wider">Direct</span>
                            <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                                <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{directCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Indirect</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{indirectCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-405 uppercase tracking-wider">Active</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount.ACTIVE}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-405 uppercase tracking-wider">Closed</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount.CLOSED}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-405 uppercase tracking-wider">Dormant</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-405" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount.DORMANT}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-750 dark:text-slate-200 shadow-xl z-50">
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
                                                            ? GOPOCKET_CLIENT_FILTER_FIELDS.find(f => f.value === filter.field)?.label
                                                            : 'Select field...'}
                                                    </span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs text-foreground bg-transparent" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {GOPOCKET_CLIENT_FILTER_FIELDS.map((field) => (
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
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-205 shrink-0">
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
                                            getFieldType(filter.field) === 'select' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                                        <SelectValue placeholder="Select option..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl">
                                                        {getFieldOptions(filter.field).map((opt: string) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
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
                                                    type={getFieldType(filter.field) === 'date' ? 'date' : (getFieldType(filter.field) === 'number' ? 'number' : 'text')}
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

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-t-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addDraftFilter}
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
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

                    <div className="w-[260px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Account Opened Range"
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                                <SelectItem value="DORMANT">Dormant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[180px]">
                        <Select value={tradeDoneFilter} onValueChange={setTradeDoneFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <SelectValue placeholder="Trade Done" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Trade Status</SelectItem>
                                <SelectItem value="TRUE">Trade Done</SelectItem>
                                <SelectItem value="FALSE">No Trade</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Parent Filter Combobox */}
                    <div className="w-[200px]">
                        <Popover open={openParentBox} onOpenChange={setOpenParentBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openParentBox}
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                        <span className="truncate">
                                            {parentFilter === "ALL"
                                                ? "Select Parent"
                                                : userCodeMap.get(parentFilter) || parentFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                    <CommandInput
                                        placeholder="Search parent..."
                                        className="h-9 text-foreground bg-transparent"
                                        value={parentSearch}
                                        onValueChange={setParentSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No parent found.</CommandEmpty>
                                        <CommandGroup>
                                            {!parentSearch && (
                                                <CommandItem
                                                    value="ALL"
                                                    onSelect={() => {
                                                        setParentFilter("ALL");
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between focus:bg-slate-105 dark:focus:bg-slate-800 cursor-pointer"
                                                >
                                                    <span>All Parents</span>
                                                    {parentFilter === "ALL" && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                                </CommandItem>
                                            )}
                                            {visibleParentOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={`${opt.code || ''} ${opt.org_code || ''} ${opt.name} ${opt.name1 || ''} ${userNameMap.get(opt.name) || ''}`}
                                                    onSelect={() => {
                                                        setParentFilter(opt.name === parentFilter ? "ALL" : opt.name);
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2 focus:bg-slate-105 dark:focus:bg-slate-800 cursor-pointer"
                                                >
                                                    <span className="truncate text-sm">
                                                        {opt.category === 'RM' || opt.org_type === 'RM'
                                                            ? `${opt.code || opt.org_code || opt.name} ${opt.name1 || ''}`.trim()
                                                            : (opt.code || opt.org_code || opt.name)}
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

                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <Input
                            placeholder="Search Client Code"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading || isExporting}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business') && (
                        <Button
                            onClick={handleExport}
                            disabled={isExporting || isLoading || isRefreshing}
                            variant="outline"
                            className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 transition-all shadow-sm"
                        >
                            {isExporting ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 animate-spin" />
                                    <span className="text-[10px] font-bold">
                                        {exportProgress.total > 0 ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileDown className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Export</span>
                                </>
                            )}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'mobile', label: 'Mobile' },
                                    { id: 'client_name', label: 'Client Name' },
                                    { id: 'opened_date', label: 'Opened Date' },
                                    { id: 'trade_done', label: 'Trade Done' },
                                    { id: 'last_trade', label: 'Last Trade' },
                                    { id: 'parent', label: 'Parent' },
                                    { id: 'nse', label: 'NSE' },
                                    { id: 'bse', label: 'BSE' },
                                    { id: 'mcx', label: 'MCX' },
                                    { id: 'nfo', label: 'NFO' },
                                    { id: 'bfo', label: 'BFO' },
                                    { id: 'status', label: 'Status' },
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

                    {(searchQuery || statusFilter !== 'ALL' || tradeDoneFilter !== 'ALL' || parentFilter !== 'ALL' || dateRange !== null || advancedFilters.length > 0) && (
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
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-205"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-foreground">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-405">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-205"
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
            <Card className={cn(
                "border-none shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col",
                scrollWholePage ? "" : "flex-1 min-h-0 overflow-hidden"
            )}>
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('client_code')}>
                                    <div className="flex items-center gap-2">
                                        Client Code
                                        {sortConfig?.key === 'client_code' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                    </div>
                                </th>
                                {columnVisibility.mobile && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Mobile</th>}
                                {columnVisibility.client_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('client_name')}>
                                        <div className="flex items-center gap-2">
                                            Client Name
                                            {sortConfig?.key === 'client_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.opened_date && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('account_opened_date')}>
                                        <div className="flex items-center gap-2">
                                            Opened Date
                                            {sortConfig?.key === 'account_opened_date' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.trade_done && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">First Trade</th>}
                                {columnVisibility.last_trade && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('last_traded_day')}>
                                        <div className="flex items-center gap-2">
                                            Last Trade Date
                                            {sortConfig?.key === 'last_traded_day' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.parent && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('parent1')}>
                                        <div className="flex items-center gap-2">
                                            Parent
                                            {sortConfig?.key === 'parent1' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.nse && <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">NSE</th>}
                                {columnVisibility.bse && <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">BSE</th>}
                                {columnVisibility.mcx && <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">MCX</th>}
                                {columnVisibility.nfo && <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">NFO</th>}
                                {columnVisibility.bfo && <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">BFO</th>}
                                {columnVisibility.status && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('activation_status')}>
                                        <div className="flex items-center gap-2">
                                            Status
                                            {sortConfig?.key === 'activation_status' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
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
                                sortedData.map((row: ClientItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                    >
                                        <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                            <button
                                                onClick={() => navigate(`/clients/${row.client_code}`)}
                                                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left focus:outline-none bg-transparent"
                                            >
                                                {formatValue(row.client_code)}
                                            </button>
                                        </td>
                                        {columnVisibility.mobile && (
                                            <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                                <div className="flex items-center gap-2">
                                                    {row.mobile_number}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.dispatchEvent(new CustomEvent('trigger-kyc-search', {
                                                                detail: { clientCode: row.mobile_number }
                                                            }));
                                                        }}
                                                        className="p-1 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md text-purple-700 dark:text-purple-400 hover:text-purple-650 dark:hover:text-purple-300 transition-all group/kyc bg-transparent"
                                                        title="Search in KYC Tracker"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.client_name && <td className="py-4 px-4 text-slate-500 dark:text-slate-400">{formatValue(row.client_name)}</td>}
                                        {columnVisibility.opened_date && <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{formatValue(row.account_opened_date)}</td>}
                                        {columnVisibility.trade_done && (
                                            <td className="py-4 px-4">
                                                <Badge
                                                    className={cn(
                                                        "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]",
                                                        row.trade_done === 'TRUE' ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                                                    )}
                                                >
                                                    {row.trade_done || 'FALSE'}
                                                </Badge>
                                            </td>
                                        )}
                                        {columnVisibility.last_trade && <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{formatValue(row.last_traded_day)}</td>}
                                        {columnVisibility.parent && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                {row.parent1 ? (userCodeMap.get(row.parent1) || row.parent1) : '-'}
                                            </td>
                                        )}
                                        {columnVisibility.nse && <td className="py-4 px-4 text-center">{renderExchangeBadge(row.nse)}</td>}
                                        {columnVisibility.bse && <td className="py-4 px-4 text-center">{renderExchangeBadge(row.bse)}</td>}
                                        {columnVisibility.mcx && <td className="py-4 px-4 text-center">{renderExchangeBadge(row.mcx)}</td>}
                                        {columnVisibility.nfo && <td className="py-4 px-4 text-center">{renderExchangeBadge(row.nfo)}</td>}
                                        {columnVisibility.bfo && <td className="py-4 px-4 text-center">{renderExchangeBadge(row.bfo)}</td>}
                                        {columnVisibility.status && (
                                            <td className="py-4 px-4">
                                                <Badge
                                                    className={cn(
                                                        "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]",
                                                        row.activation_status === 'ACTIVE' ? "bg-green-700 dark:bg-green-600 text-white hover:bg-green-700 hover:text-white" :
                                                            row.activation_status === 'CLOSED' ? "bg-red-700 dark:bg-red-600 text-white hover:bg-red-700 hover:text-white" :
                                                                "bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-700 hover:text-white"
                                                    )}
                                                >
                                                    {row.activation_status || 'UNKNOWN'}
                                                </Badge>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={visibleColumnCount} className="h-48 text-center text-slate-400 dark:text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No results found matching your filters</p>
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
                        Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</span> clients
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Clients;
