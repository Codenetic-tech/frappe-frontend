import React, { useMemo, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { FrappeContext, useFrappeDocTypeEventListener, useFrappeUpdateDoc } from 'frappe-react-sdk';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import {
    FileText,
    Zap,
    Clock,
    CircleCheck,
    XCircle,
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
    Users,
    UserCheck,
    ExternalLink,
    Filter,
    Plus,
    AlertCircle,
    Phone,
    MapPin,
    User
} from 'lucide-react';

export interface LeadItem {
    name: string;
    first_name?: string;
    mobile_no?: string;
    custom_allocated_code?: string;
    custom_allocated_person_name?: string;
    source?: string;
    status: string;
    custom_city?: string;
    custom_campaign_name?: string;
    creation: string;
    modified: string;
    lead_name?: string;
    industry?: string;
    validity_date?: string;
    language?: string;
    whats_your_profession?: string;
    gender?: string;
    city?: string;
    state?: string;
    ucc?: string;
    pannumber?: string;
    form_id?: string;
    campaign?: string;
    branch_code?: string;
    referredby?: string;
    what_is_your_experience_level_in_trading?: string;
    what_is_your_preferred_medium_to_get_services_details?: string;
    how_many_demat_account_can_you_open_in_a_month?: string;
    how_much_revenue_are_you_targeting_in_a_month?: number;
    no_of_employees?: number;
    tradedone?: string;
    other_brokers?: string;
    issue?: string;
    nse_cm?: number;
    nse_cd?: number;
    bse_fo?: number;
    mcx_co?: number;
    nse_fo?: number;
    bse_fo_segment?: number;
    bse_cm?: number;
    [key: string]: any;
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

const CRM_LEAD_FILTER_FIELDS = [
    { value: 'name', label: 'Lead ID', type: 'string' },
    { value: 'first_name', label: 'First Name', type: 'string' },
    { value: 'mobile_no', label: 'Mobile Number', type: 'string' },
    { value: 'custom_allocated_code', label: 'Allocated Code', type: 'string' },
    { value: 'custom_allocated_person_name', label: 'Allocated Person', type: 'string' },
    { value: 'source', label: 'Source', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['New', 'Followup', 'Not Interested', 'Call Back', 'Switch off', 'RNR', 'won', 'Client'] },
    { value: 'custom_city', label: 'City', type: 'string' },
    { value: 'custom_campaign_name', label: 'Campaign Name', type: 'string' },
    { value: 'creation', label: 'Creation Date', type: 'date' },
    { value: 'modified', label: 'Modified Date', type: 'date' },
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

const getFieldType = (fieldValue: string): string =>
    CRM_LEAD_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = CRM_LEAD_FILTER_FIELDS.find(f => f.value === fieldValue);
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

const Leads: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { orgTreeData } = useOrgTree();
    const frappe = useContext(FrappeContext);
    const { updateDoc } = useFrappeUpdateDoc();
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const isBulkUpdatingRef = useRef(false);

    const handleBulkAssign = async (targetParent: any) => {
        setIsRefreshing(true);
        isBulkUpdatingRef.current = true;
        try {
            const displayName = targetParent.name1 || targetParent.client_name || userNameMap.get(targetParent.name) || targetParent.name;

            await Promise.all(
                Array.from(selectedRows).map(leadName =>
                    updateDoc('CRM Lead', leadName, {
                        custom_allocated_to: targetParent.name,
                    })
                )
            );

            toast.success(`Successfully assigned ${selectedRows.size} leads to ${displayName}`);
            setSelectedRows(new Set());
            
            await Promise.all([
                refetchLeads(),
                mutateTotalCount(),
                mutateNewCount(),
                mutateFollowupCount(),
                mutateWonCount(),
                mutateNotInterestedCount(),
                mutateOthersCount(),
            ]);
        } catch (err) {
            console.error(err);
            toast.error('Failed to assign some leads');
        } finally {
            isBulkUpdatingRef.current = false;
            setIsRefreshing(false);
        }
    };

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('leadsSearchQuery') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('leadsDateRange');
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
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('leadsStatusFilter') || 'ALL');
    const [parentFilter, setParentFilter] = useState<string>(() => sessionStorage.getItem('leadsParentFilter') || 'ALL');
    const [openParentBox, setOpenParentBox] = useState(false);
    const [parentSearch, setParentSearch] = useState('');

    useEffect(() => {
        if (!openParentBox) {
            setParentSearch('');
        }
    }, [openParentBox]);

    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof LeadItem; direction: 'asc' | 'desc' } | null>({
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
        const stored = localStorage.getItem('leadsColumnVisibility');
        return stored ? JSON.parse(stored) : {
            first_name: true,
            mobile_no: true,
            source: true,
            status: true,
            assigned_to: true,
            city: true,
            campaign: false,
            creation: true,
            modified: false,
        };
    });

    useEffect(() => {
        localStorage.setItem('leadsColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    // Persistence for filters
    useEffect(() => {
        sessionStorage.setItem('leadsSearchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('leadsDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('leadsDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('leadsStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('leadsParentFilter', parentFilter);
    }, [parentFilter]);

    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(v => v).length;
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

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters: any[] = [];

        // Hierarchy filters
        const parentFilterList = selectedHierarchy && selectedHierarchy.length > 0
            ? expandBranches(selectedHierarchy)
            : [];
        const combinedParents = parentFilter !== 'ALL'
            ? [...new Set([parentFilter, ...parentFilterList])]
            : parentFilterList;

        const combinedCodes = getHierarchyCodes(combinedParents);

        if (combinedCodes.length > 0) {
            activeFilters.push(['custom_allocated_code', 'in', combinedCodes]);
        }

        // Search Query
        if (debouncedSearchQuery) {
            if (/^\d/.test(debouncedSearchQuery)) {
                activeFilters.push(['mobile_no', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                if (debouncedSearchQuery.toUpperCase().startsWith('CRM-')) {
                    activeFilters.push(['name', 'like', `%${debouncedSearchQuery}%`]);
                } else {
                    activeFilters.push(['first_name', 'like', `%${debouncedSearchQuery}%`]);
                }
            }
        }

        // Date Range
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
    }, [selectedHierarchy, parentFilter, expandBranches, getHierarchyCodes, debouncedSearchQuery, dateRange, advancedFilters]);

    const filters = useMemo(() => {
        const activeFilters = [...totalFilters];
        if (statusFilter !== 'ALL') {
            if (statusFilter === 'Others') {
                activeFilters.push(['status', 'not in', ['New', 'Followup', 'won', 'Not Interested']]);
            } else {
                activeFilters.push(['status', '=', statusFilter]);
            }
        }
        return activeFilters;
    }, [totalFilters, statusFilter]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    // Count queries via SWR
    const { data: totalCount = 0, error: totalCountErr, mutate: mutateTotalCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: totalFilters
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: newCount = 0, mutate: mutateNewCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: [...totalFilters, ['status', '=', 'New']]
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: followupCount = 0, mutate: mutateFollowupCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: [...totalFilters, ['status', '=', 'Followup']]
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: wonCount = 0, mutate: mutateWonCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: [...totalFilters, ['status', '=', 'won']]
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: notInterestedCount = 0, mutate: mutateNotInterestedCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: [...totalFilters, ['status', '=', 'Not Interested']]
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: othersCount = 0, mutate: mutateOthersCount } = useSWR(
        [`${API_BASE_URL}/api/method/frappe.client.get_count`, JSON.stringify({
            doctype: 'CRM Lead',
            filters: [...totalFilters, ['status', 'not in', ['New', 'Followup', 'won', 'Not Interested']]]
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    // Sorting config & string calculation for backend
    const orderBy = useMemo(() => {
        if (!sortConfig) {
            return 'creation desc';
        }
        return `${sortConfig.key} ${sortConfig.direction}`;
    }, [sortConfig]);

    // List query via SWR
    const {
        data: leadsData = [],
        error: listError,
        isLoading,
        mutate: refetchLeads
    } = useSWR<any[]>(
        [`${API_BASE_URL}/api/method/frappe.client.get_list`, JSON.stringify({
            doctype: 'CRM Lead',
            fields: [
                'name',
                'first_name',
                'mobile_no',
                'custom_allocated_code',
                'custom_allocated_person_name',
                'source',
                'status',
                'custom_city',
                'custom_campaign_name',
                'creation',
                'modified',
            ],
            filters,
            order_by: orderBy,
            limit_start: (currentPage - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        })],
        postFetcher,
        { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const count = totalCount;

    useEffect(() => {
        const errors = [listError, totalCountErr];
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
                    let msg = "Insufficient Permission for CRM Lead";
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
    }, [listError, totalCountErr]);

    // Save leads to sessionStorage when loaded
    useEffect(() => {
        if (leadsData && leadsData.length > 0) {
            sessionStorage.setItem('leadsData', JSON.stringify(leadsData));
        }
    }, [leadsData]);

    const error = listError ? (typeof listError === 'string' ? listError : (listError.message || 'An error occurred')) : permissionError;

    const handleSort = (key: keyof LeadItem) => {
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
                refetchLeads(),
                mutateTotalCount(),
                mutateNewCount(),
                mutateFollowupCount(),
                mutateWonCount(),
                mutateNotInterestedCount(),
                mutateOthersCount(),
            ]);
            toast.success('Leads data refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Real-time listener for CRM Lead updates via WebSocket
    const handleListUpdate = useCallback((eventData: any) => {
        if (isBulkUpdatingRef.current) return;
        console.log('Realtime CRM Lead event:', eventData);
        refetchLeads();
        mutateTotalCount();
        mutateNewCount();
        mutateFollowupCount();
        mutateWonCount();
        mutateNotInterestedCount();
        mutateOthersCount();
    }, [refetchLeads, mutateTotalCount, mutateNewCount, mutateFollowupCount, mutateWonCount, mutateNotInterestedCount, mutateOthersCount]);

    useFrappeDocTypeEventListener('CRM Lead', handleListUpdate);

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('ALL');
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
                        doctype: 'CRM Lead',
                        fields: [
                            'name',
                            'first_name',
                            'mobile_no',
                            'custom_allocated_code',
                            'custom_allocated_person_name',
                            'source',
                            'status',
                            'custom_city',
                            'custom_campaign_name',
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
                    'Lead ID': item.name,
                    'Name': item.first_name || '',
                    'Mobile': item.mobile_no || '',
                    'Allocated Code': item.custom_allocated_code || '',
                    'Allocated Person': item.custom_allocated_person_name || '',
                    'Source': item.source || '',
                    'Status': item.status || '',
                    'City': item.custom_city || '',
                    'Campaign Name': item.custom_campaign_name || '',
                    'Created Date': item.creation || '',
                    'Modified Date': item.modified || '',
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Leads_Export_${todayStr}`);
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
    }, [debouncedSearchQuery, statusFilter, parentFilter, dateRange]);

    const sortedData = useMemo(() => {
        if (!leadsData) return [];
        const result = [...leadsData];
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
    }, [leadsData, sortConfig]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const formatValue = (value: string | null | undefined) => value || '-';

    const renderStatusBadge = (status: string | null | undefined) => {
        if (!status) return '-';
        return (
            <div className="flex items-center gap-2">
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                    status === 'won' ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400" :
                        status === 'New' ? "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400" :
                            status === 'RNR' ? "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400" :
                                status === 'Followup' ? "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
                                    status === 'Not Interested' ? "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400" :
                                        status === 'Client' ? "bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400" :
                                            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
    };

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-6",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                        onClick={() => setStatusFilter('New')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transition-opacity",
                            statusFilter === 'New' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">New</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{newCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Followup')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transition-opacity",
                            statusFilter === 'Followup' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Followup</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{followupCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('won')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transition-opacity",
                            statusFilter === 'won' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Won</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                                <CircleCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{wonCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Not Interested')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 transition-opacity",
                            statusFilter === 'Not Interested' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Not Interested</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{notInterestedCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card
                        onClick={() => setStatusFilter('Others')}
                        className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className={cn(
                            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-slate-500 to-slate-700 transition-opacity",
                            statusFilter === 'Others' ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Others</span>
                            <div className="p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
                                <MoreHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{othersCount}</p>
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
                                <Filter className="w-4 h-4 text-slate-500" />
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
                                                            ? CRM_LEAD_FILTER_FIELDS.find(f => f.value === filter.field)?.label
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
                                                            {CRM_LEAD_FILTER_FIELDS.map((field) => (
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
                             placeholder="Creation Date Range"
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Followup">Followup</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="Not Interested">Not Interested</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
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
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                                        className="h-9 text-slate-800 dark:text-slate-100"
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
                                                    className="flex items-center justify-between focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
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
                                                    className="flex items-center justify-between gap-2 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
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

                    {selectedRows.size > 0 && (
                        <div className="flex items-center gap-2 px-3 h-10 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider whitespace-nowrap">
                                {selectedRows.size} Selected
                            </span>
                            <div className="h-4 w-[1px] bg-purple-200 mx-1" />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider text-purple-700 hover:bg-purple-100 hover:text-purple-800 gap-1.5 focus:ring-0 focus:ring-offset-0">
                                        <Users className="w-3.5 h-3.5" />
                                        Assign To
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
                                    <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                        <CommandInput placeholder="Search user..." className="h-9 text-slate-800 dark:text-slate-100" value={parentSearch} onValueChange={setParentSearch} />
                                        <CommandList className="max-h-[300px]">
                                            <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No user found.</CommandEmpty>
                                            <CommandGroup>
                                                {visibleParentOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.name}
                                                        value={`${opt.code || ''} ${opt.org_code || ''} ${opt.name} ${opt.name1 || ''}`}
                                                        onSelect={() => {
                                                            handleBulkAssign(opt);
                                                        }}
                                                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    >
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate">
                                                                {opt.category === 'RM' || opt.org_type === 'RM'
                                                                    ? `${opt.code || opt.org_code || opt.name} ${opt.name1 || ''}`.trim()
                                                                    : (opt.code || opt.org_code || opt.name)}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tighter">{opt.category}</span>
                                                        </div>
                                                        {opt.category && (
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[8px] px-1.5 py-0 h-4 uppercase font-bold border shrink-0",
                                                                    getCategoryStyles(opt.category)
                                                                )}
                                                            >
                                                                {opt.category}
                                                            </Badge>
                                                        )}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedRows(new Set())} className="h-6 w-6 text-purple-700 hover:bg-purple-100 rounded-md" title="Clear selection">
                                <X className="w-3.5 h-3.5 animate-in" />
                            </Button>
                        </div>
                    )}

                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Name, ID, Mobile..."
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
                            className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm"
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
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'first_name', label: 'First Name' },
                                    { id: 'mobile_no', label: 'Mobile' },
                                    { id: 'source', label: 'Source' },
                                    { id: 'status', label: 'Status' },
                                    { id: 'assigned_to', label: 'Assigned To' },
                                    { id: 'city', label: 'City' },
                                    { id: 'campaign', label: 'Campaign' },
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

                    {(searchQuery || statusFilter !== 'ALL' || parentFilter !== 'ALL' || dateRange !== null || advancedFilters.length > 0) && (
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
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                <th className="text-left py-4 px-4 w-12">
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
                                {columnVisibility.first_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('first_name')}>
                                        <div className="flex items-center gap-2">
                                            First Name
                                            {sortConfig?.key === 'first_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.mobile_no && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Contact</th>}
                                {columnVisibility.source && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Source</th>}
                                {columnVisibility.status && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-2">
                                            Status
                                            {sortConfig?.key === 'status' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.assigned_to && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('custom_allocated_person_name')}>
                                        <div className="flex items-center gap-2">
                                            Assigned To
                                            {sortConfig?.key === 'custom_allocated_person_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.city && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">City</th>}
                                {columnVisibility.campaign && <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Campaign</th>}
                                {columnVisibility.creation && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('creation')}>
                                        <div className="flex items-center gap-2">
                                            Created At
                                            {sortConfig?.key === 'creation' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.modified && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('modified')}>
                                        <div className="flex items-center gap-2">
                                            Modified At
                                            {sortConfig?.key === 'modified' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={visibleColumnCount + 2} className="p-4">
                                            <Skeleton className="h-8 w-full rounded-lg" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row: LeadItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group whitespace-nowrap"
                                    >
                                        <td className="py-4 px-4 w-12" onClick={(e) => e.stopPropagation()}>
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
                                        {columnVisibility.first_name && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs uppercase shrink-0">
                                                        {(row.first_name || row.lead_name || 'U')[0]}
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/leads/${row.name}`)}
                                                        className="font-semibold text-slate-900 dark:text-slate-100 leading-tight hover:text-purple-600 transition-colors text-left focus:outline-none"
                                                    >
                                                        {formatValue(row.first_name || row.lead_name)}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.mobile_no && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                        <Phone className="w-3 h-3 text-slate-400" />
                                                        <span className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{row.mobile_no || '-'}</span>
                                                    </div>
                                                    {row.mobile_no && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const searchMobile = row.mobile_no?.replace(/^\+91/, '');
                                                                window.dispatchEvent(new CustomEvent('trigger-kyc-search', {
                                                                    detail: { clientCode: searchMobile }
                                                                }));
                                                            }}
                                                            className="p-1 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-md text-purple-700 hover:text-purple-600 transition-all group/kyc"
                                                            title="Search in KYC Tracker"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.source && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                {formatValue(row.source)}
                                            </td>
                                        )}
                                        {columnVisibility.status && (
                                            <td className="py-4 px-4">
                                                {renderStatusBadge(row.status)}
                                            </td>
                                        )}
                                        {columnVisibility.assigned_to && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium text-xs">
                                                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">
                                                        <User className="w-3 h-3" />
                                                    </div>
                                                    {row.custom_allocated_person_name || row.custom_allocated_code ? (
                                                        `${row.custom_allocated_person_name || ''} ${row.custom_allocated_code ? `(${row.custom_allocated_code})` : ''}`.trim()
                                                    ) : '-'}
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.city && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    <span className="text-xs">{formatValue(row.custom_city)}</span>
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.campaign && (
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                {formatValue(row.custom_campaign_name)}
                                            </td>
                                        )}
                                        {columnVisibility.creation && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                    <CalendarIcon className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[12px] font-medium">{row.creation ? row.creation.split(' ')[0] : ''}</span>
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.modified && (
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                    <CalendarIcon className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[12px] font-medium">{row.modified ? row.modified.split(' ')[0] : ''}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                                    <DropdownMenuLabel className="text-xs text-slate-400 dark:text-slate-500">Change Status</DropdownMenuLabel>
                                                    {['New', 'Followup', 'Not Interested', 'Call Back', 'Switch off', 'RNR', 'won', 'Client']
                                                        .filter(s => s !== row.status)
                                                        .map((status) => (
                                                            <DropdownMenuItem
                                                                key={status}
                                                                onClick={async () => {
                                                                    try {
                                                                        await updateDoc('CRM Lead', row.name, { status });
                                                                        toast.success(`Status updated to ${status}`);
                                                                        refetchLeads();
                                                                    } catch (err) {
                                                                        toast.error('Failed to update status');
                                                                    }
                                                                }}
                                                                className="text-xs"
                                                            >
                                                                {status}
                                                            </DropdownMenuItem>
                                                        ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={visibleColumnCount + 2} className="h-48 text-center text-slate-400 dark:text-slate-500">
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
                <div className="shrink-0 py-2 px-4 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-200 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-200 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-200 font-bold">{totalCount}</span> leads
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Leads;
