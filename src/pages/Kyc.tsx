import React, { useMemo, useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
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
    UserCheck,
    FileText,
    Clock,
    AlertCircle,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    ShieldCheck,
    Filter,
    Calendar as CalendarIcon,
    Users,
    Check,
    ChevronsUpDown,
    FileDown,
    Plus,
    X,
    Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import KycTimeline from '@/components/KycTimeline';
import { exportToExcel } from '@/utils/excelExport';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { useFrappeGetDocList, useFrappeGetDocCount, useFrappeGetDoc, useFrappeDocTypeEventListener, FrappeContext } from 'frappe-react-sdk';

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

const KYC_FILTER_FIELDS = [
    { value: 'application_id', label: 'Application ID', type: 'string' },
    { value: 'user_name', label: 'User Name', type: 'string' },
    { value: 'mobile_number', label: 'Mobile Number', type: 'string' },
    { value: 'ucc', label: 'UCC', type: 'string' },
    { value: 'refer', label: 'Refer', type: 'string' },
    { value: 'kyc_stage', label: 'KYC Stage', type: 'select', options: ['MOBILE OTP', 'EMAIL OTP', 'PASSWORD SETUP', 'KRA DOB', 'PAN NAME', 'PAN CONFIRM', 'AADHAR', 'PROFILE', 'BANK ENTRY', 'SEGMENT SELECTION', 'PAYMENT', 'NOMINEE', 'INCOME PROOF', 'SIGNATURE', 'IPV', 'PDF DOWNLOAD', 'ESIGN GENERATED', 'END PAGE'] },
    { value: 'application_status', label: 'Application Status', type: 'select', options: ['IN PROGRESS', 'PENDING FOR APPROVAL', 'REJECTED', 'APPROVED', 'ACCOUNT OPENED'] },
    { value: 'src', label: 'Source (src)', type: 'string' },
    { value: 'tag', label: 'Tag', type: 'string' },
    { value: 'application_created_date', label: 'Created Date', type: 'date' },
    { value: 'application_modified_date_time', label: 'Modified Datetime', type: 'date' },
    { value: 'client_mapping', label: 'Client Mapping', type: 'select', options: ['1', '0'] },
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
    KYC_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

const getFieldOptions = (fieldValue: string): readonly string[] => {
    const field = KYC_FILTER_FIELDS.find(f => f.value === fieldValue);
    return field && 'options' in field ? (field as any).options : [];
};

interface AdvancedFilter {
    id: string;
    field: string;
    operator: string;
    value: string | [string, string];
}

const Kyc: React.FC = () => {
    const { user } = useAuth();
    const { orgTreeData } = useOrgTree();
    const { selectedHierarchy } = useFilter();
    const frappe = useContext(FrappeContext);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('kycSearchQuery') || '');
    const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
        const stored = sessionStorage.getItem('kycDateRange');
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
    const [statusFilter, setStatusFilter] = useState<string>(() => sessionStorage.getItem('kycStatusFilter') || 'ALL');
    const [stageFilter, setStageFilter] = useState<string>(() => sessionStorage.getItem('kycStageFilter') || 'ALL');
    const [referFilter, setReferFilter] = useState<string>(() => sessionStorage.getItem('kycReferFilter') || 'ALL');
    const [openReferBox, setOpenReferBox] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'application_modified_date_time',
        direction: 'desc'
    });
    const [referSearch, setReferSearch] = useState('');
    const [permissionError, setPermissionError] = useState<string | null>(null);

    const [kycData, setKycData] = useState<any[]>(() => {
        const stored = sessionStorage.getItem('kycData');
        return stored ? JSON.parse(stored) : [];
    });
    const [isLoading, setIsLoading] = useState(() => {
        const stored = sessionStorage.getItem('kycData');
        return stored ? JSON.parse(stored).length === 0 : true;
    });
    const [listError, setListError] = useState<any>(null);

    const [totalCount, setTotalCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycTotalCount');
        return stored ? Number(stored) : 0;
    });
    const [approvedCount, setApprovedCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycApprovedCount');
        return stored ? Number(stored) : 0;
    });
    const [openedCount, setOpenedCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycOpenedCount');
        return stored ? Number(stored) : 0;
    });
    const [pendingCount, setPendingCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycPendingCount');
        return stored ? Number(stored) : 0;
    });
    const [progressCount, setProgressCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycProgressCount');
        return stored ? Number(stored) : 0;
    });
    const [rejectedCount, setRejectedCount] = useState<number>(() => {
        const stored = sessionStorage.getItem('kycRejectedCount');
        return stored ? Number(stored) : 0;
    });

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

    // Filtered hierarchy for refer selection, sorted by category order
    const referOptions = useMemo(() => {
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

    const referCodeMap = useMemo(() => {
        const tree = orgTreeData;
        if (!tree) return new Map<string, string>();
        const map = new Map<string, string>();
        tree.forEach((node: any) => {
            if (node.name) {
                const code = node.code || node.org_code || node.name;
                map.set(node.name, code);
            }
        });
        return map;
    }, [orgTreeData]);

    // Optimized visible options for refer selection to prevent performance issues with large data
    const visibleReferOptions = useMemo(() => {
        if (!referOptions) return [];
        if (!referSearch) return referOptions.slice(0, 100);

        const searchLower = referSearch.toLowerCase();
        return referOptions
            .filter(opt => {
                const code = (opt as any).code || (opt as any).org_code || '';
                return opt.name.toLowerCase().includes(searchLower) ||
                    code.toLowerCase().includes(searchLower) ||
                    (opt.category && opt.category.toLowerCase().includes(searchLower));
            })
            .slice(0, 100);
    }, [referOptions, referSearch]);

    // Persistence for filters
    useEffect(() => {
        if (dateRange) {
            sessionStorage.setItem('kycDateRange', JSON.stringify([dateRange[0].toISOString(), dateRange[1].toISOString()]));
        } else {
            sessionStorage.removeItem('kycDateRange');
        }
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('kycStatusFilter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        sessionStorage.setItem('kycStageFilter', stageFilter);
    }, [stageFilter]);

    useEffect(() => {
        sessionStorage.setItem('kycReferFilter', referFilter);
    }, [referFilter]);

    useEffect(() => {
        sessionStorage.setItem('kycSearchQuery', searchQuery);
    }, [searchQuery]);

    // Clear refer search when box closes
    useEffect(() => {
        if (!openReferBox) {
            setReferSearch('');
        }
    }, [openReferBox]);

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
        if (referFilter !== 'ALL') {
            const tree = orgTreeData;
            const node = tree?.find((opt: any) => opt.name === referFilter);
            const code = (node as any)?.code || (node as any)?.org_code || referFilter;
            activeFilters.push(['refer', '=', code]);
        } else if (selectedHierarchy && selectedHierarchy.length > 0) {
            const expandedNames = expandBranches(selectedHierarchy);
            const expandedCodes = getHierarchyCodes(expandedNames);
            activeFilters.push(['refer', 'in', expandedCodes]);
        }
        return activeFilters;
    }, [selectedHierarchy, referFilter, expandBranches, getHierarchyCodes, orgTreeData]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters = [...hierarchyFilters];

        if (debouncedSearchQuery) {
            if (/^[a-zA-Z]/.test(debouncedSearchQuery)) {
                activeFilters.push(['ucc', 'like', `%${debouncedSearchQuery}%`]);
            } else if (/^\d{10}$/.test(debouncedSearchQuery)) {
                activeFilters.push(['mobile_number', 'like', `%${debouncedSearchQuery}%`]);
            } else {
                activeFilters.push(['application_id', 'like', `%${debouncedSearchQuery}%`]);
            }
        }

        if (dateRange?.[0] && dateRange?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            activeFilters.push(['application_modified_date_time', '>=', formatLocal(dateRange[0]) + " 00:00:00"]);
            activeFilters.push(['application_modified_date_time', '<=', formatLocal(dateRange[1]) + " 23:59:59"]);
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
            activeFilters.push(['application_status', '=', statusFilter]);
        }
        if (stageFilter !== 'ALL') {
            activeFilters.push(['kyc_stage', '=', stageFilter]);
        }
        return activeFilters;
    }, [totalFilters, statusFilter, stageFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, dateRange, statusFilter, stageFilter, referFilter, advancedFilters]);

    const hasPermissionError = !!permissionError;

    // Counts Queries resolved via fetchData

    const statusCount = useMemo(() => ({
        'APPROVED': approvedCount,
        'ACCOUNT OPENED': openedCount,
        'PENDING FOR APPROVAL': pendingCount,
        'IN PROGRESS': progressCount,
        'REJECTED': rejectedCount
    }), [approvedCount, openedCount, pendingCount, progressCount, rejectedCount]);

    // Rows Query
    const limit_start = (currentPage - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const orderByObj = useMemo(() => {
        if (!sortConfig) {
            return { field: 'application_modified_date_time', order: 'desc' as const };
        }
        return {
            field: sortConfig.key,
            order: sortConfig.direction
        };
    }, [sortConfig]);

    const {
        data: kycListData,
        isLoading: isDocListLoading,
        error: swrListError,
        mutate: mutateList,
    } = useFrappeGetDocList<any>(
        'KYC',
        {
            fields: [
                'name',
                'application_id',
                'user_name',
                'kyc_stage',
                'refer',
                'application_created_date',
                'application_modified_date_time',
                'application_status',
                'src',
                'tag',
                'ucc',
                'mobile_number'
            ],
            filters,
            orderBy: orderByObj,
            limit_start,
            limit,
        },
        hasPermissionError ? null : undefined
    );

    // Sync loading state
    useEffect(() => {
        setIsLoading(!!isDocListLoading);
    }, [isDocListLoading]);

    // Save kycList to state
    useEffect(() => {
        if (kycListData) {
            setKycData(kycListData);
        }
    }, [kycListData]);

    // Sync list error state
    useEffect(() => {
        if (swrListError !== undefined) {
            setListError(swrListError);
        }
    }, [swrListError]);

    // Counts queries
    const { data: sTotalCount = 0, error: totalCountErr, mutate: mutateTotalCount } = useFrappeGetDocCount('KYC', totalFilters, false, hasPermissionError ? null : undefined);
    const { data: sApprovedCount = 0, error: approvedCountErr, mutate: mutateApprovedCount } = useFrappeGetDocCount('KYC', [...totalFilters, ['application_status', '=', 'APPROVED']], false, hasPermissionError ? null : undefined);
    const { data: sOpenedCount = 0, error: openedCountErr, mutate: mutateOpenedCount } = useFrappeGetDocCount('KYC', [...totalFilters, ['application_status', '=', 'ACCOUNT OPENED']], false, hasPermissionError ? null : undefined);
    const { data: sPendingCount = 0, error: pendingCountErr, mutate: mutatePendingCount } = useFrappeGetDocCount('KYC', [...totalFilters, ['application_status', '=', 'PENDING FOR APPROVAL']], false, hasPermissionError ? null : undefined);
    const { data: sProgressCount = 0, error: progressCountErr, mutate: mutateProgressCount } = useFrappeGetDocCount('KYC', [...totalFilters, ['application_status', '=', 'IN PROGRESS']], false, hasPermissionError ? null : undefined);
    const { data: sRejectedCount = 0, error: rejectedCountErr, mutate: mutateRejectedCount } = useFrappeGetDocCount('KYC', [...totalFilters, ['application_status', '=', 'REJECTED']], false, hasPermissionError ? null : undefined);

    // Sync counts to state
    useEffect(() => {
        if (sTotalCount !== undefined) setTotalCount(sTotalCount);
        if (sApprovedCount !== undefined) setApprovedCount(sApprovedCount);
        if (sOpenedCount !== undefined) setOpenedCount(sOpenedCount);
        if (sPendingCount !== undefined) setPendingCount(sPendingCount);
        if (sProgressCount !== undefined) setProgressCount(sProgressCount);
        if (sRejectedCount !== undefined) setRejectedCount(sRejectedCount);
    }, [sTotalCount, sApprovedCount, sOpenedCount, sPendingCount, sProgressCount, sRejectedCount]);

    // Fetch full timeline document details when a row is clicked
    const { data: selectedKycDoc, isLoading: isDocLoading, error: docError } = useFrappeGetDoc<any>(
        'KYC',
        selectedAppId || '',
        selectedAppId ? undefined : null
    );

    // Watch for permission errors
    useEffect(() => {
        const errors = [swrListError, totalCountErr, approvedCountErr, openedCountErr, pendingCountErr, progressCountErr, rejectedCountErr, docError];
        for (const err of errors) {
            if (err) {
                const errAny = err as any;
                const is403 = errAny.httpStatus === 403 || errAny.status === 403 || errAny.message?.includes('403');
                const isPermissionError =
                    errAny.exception?.includes('PermissionError') ||
                    errAny.exc_type === 'PermissionError' ||
                    errAny._server_messages?.includes('PermissionError') ||
                    errAny._server_messages?.includes('Insufficient Permission') ||
                    errAny.message?.includes('Insufficient Permission');

                if (is403 || isPermissionError) {
                    setPermissionError(errAny.message || "Insufficient Permission for KYC doctype");
                    break;
                }
            }
        }
    }, [swrListError, totalCountErr, approvedCountErr, openedCountErr, pendingCountErr, progressCountErr, rejectedCountErr, docError]);

    // Save logs to sessionStorage when loaded
    useEffect(() => {
        if (kycData && kycData.length > 0) {
            sessionStorage.setItem('kycData', JSON.stringify(kycData));
        }
    }, [kycData]);

    useEffect(() => {
        sessionStorage.setItem('kycTotalCount', String(totalCount));
    }, [totalCount]);

    useEffect(() => {
        sessionStorage.setItem('kycApprovedCount', String(approvedCount));
    }, [approvedCount]);

    useEffect(() => {
        sessionStorage.setItem('kycOpenedCount', String(openedCount));
    }, [openedCount]);

    useEffect(() => {
        sessionStorage.setItem('kycPendingCount', String(pendingCount));
    }, [pendingCount]);

    useEffect(() => {
        sessionStorage.setItem('kycProgressCount', String(progressCount));
    }, [progressCount]);

    useEffect(() => {
        sessionStorage.setItem('kycRejectedCount', String(rejectedCount));
    }, [rejectedCount]);

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
            await Promise.all([
                mutateList(),
                mutateTotalCount(),
                mutateApprovedCount(),
                mutateOpenedCount(),
                mutatePendingCount(),
                mutateProgressCount(),
                mutateRejectedCount(),
            ]);
            toast.success('KYC data refreshed successfully');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Real-time listener for KYC list updates
    const handleListUpdate = useCallback((eventData: any) => {
        console.log('Realtime KYC event:', eventData);
        mutateList();
        mutateTotalCount();
        mutateApprovedCount();
        mutateOpenedCount();
        mutatePendingCount();
        mutateProgressCount();
        mutateRejectedCount();

        toast.success(`KYC record "${eventData.name}" was modified. List updated automatically.`);
    }, [mutateList, mutateTotalCount, mutateApprovedCount, mutateOpenedCount, mutatePendingCount, mutateProgressCount, mutateRejectedCount]);

    useFrappeDocTypeEventListener('KYC', handleListUpdate);

    const handleExport = async () => {
        if (!frappe) return;
        setIsExporting(true);
        setExportProgress({ current: 0, total: totalCount });
        try {
            let allData: any[] = [];
            let current_limit_start = 0;
            const limit_page_length = 5000;
            let hasMore = true;

            while (hasMore) {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };

                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/method/frappe.client.get_list`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        doctype: 'KYC',
                        fields: [
                            'name',
                            'application_id',
                            'user_name',
                            'kyc_stage',
                            'refer',
                            'application_created_date',
                            'application_modified_date_time',
                            'application_status',
                            'src',
                            'tag',
                            'ucc',
                            'nse',
                            'bse',
                            'nfo',
                            'bfo',
                            'mcx',
                            'client_mapping',
                            'mobile_number'
                        ],
                        filters: totalFilters,
                        limit_start: current_limit_start,
                        limit_page_length: limit_page_length
                    })
                });

                if (!response.ok) {
                    throw new Error(`Export fetch failed: HTTP ${response.status}`);
                }

                const result = await response.json();
                const data = result.message || [];

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
                    'Application ID': item.application_id,
                    'Mobile': item.mobile_number,
                    'UCC': item.ucc,
                    'User Name': item.user_name,
                    'Refer': item.refer,
                    'Stage': item.kyc_stage === 'END PAGE' ? 'ESIGN COMPLETED' : item.kyc_stage,
                    'Status': item.application_status || 'IN PROGRESS',
                    'Created At': item.application_created_date,
                    'Modified At': item.application_modified_date_time,
                    'NSE': item.nse === 'Active' ? 'Active' : '-',
                    'BSE': item.bse === 'Active' ? 'Active' : '-',
                    'NFO': item.nfo === 'Active' ? 'Active' : '-',
                    'BFO': item.bfo === 'Active' ? 'Active' : '-',
                    'MCX': item.mcx === 'Active' ? 'Active' : '-',
                    'Ready': item.client_mapping ? 'YES' : 'NO'
                }));

                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `KYC_Export_${todayStr}`);
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

    const count = totalCount;
    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const formatValue = (value: string | null) => value || '-';

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            {/* Header & Summary Section */}
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 dark:text-green-455 uppercase tracking-wider">Approved</span>
                            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount['APPROVED']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-purple-600 dark:text-purple-455 uppercase tracking-wider">Opened</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount['ACCOUNT OPENED']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-violet-600 dark:text-violet-455 uppercase tracking-wider">Pending</span>
                            <div className="p-2 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                                <UserCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount['PENDING FOR APPROVAL']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 dark:text-amber-455 uppercase tracking-wider">Progress</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount['IN PROGRESS']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-455 uppercase tracking-wider">Rejected</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{statusCount['REJECTED']}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    {/* Advanced Filters */}
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 gap-2 text-slate-700 dark:text-slate-250">
                                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                {advancedFilters.length > 0 && (
                                    <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                        {advancedFilters.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="w-[480px] p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 text-slate-850 dark:text-slate-200">
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
                                                            ? KYC_FILTER_FIELDS.find(f => f.value === filter.field)?.label
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
                                                            {KYC_FILTER_FIELDS.map((field) => (
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
                                            filter.operator === 'Between' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                'flex-1 h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-200 justify-start gap-1.5 min-w-0 truncate',
                                                                !(Array.isArray(filter.value) && filter.value[0]) && 'text-slate-400 dark:text-slate-500'
                                                            )}
                                                        >
                                                            <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-550" />
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
                                                        <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400" />
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
                                            ) : filter.field === 'kyc_stage' || filter.field === 'application_status' || filter.field === 'client_mapping' ? (
                                                <Select
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onValueChange={(val) => updateDraftFilter(filter.id, { value: val })}
                                                >
                                                    <SelectTrigger className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                                                        <SelectValue placeholder="Select option..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl">
                                                        {getFieldOptions(filter.field).map((opt) => (
                                                            <SelectItem key={opt} value={opt} className="text-xs">
                                                                {opt}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={getFieldType(filter.field) === 'date' ? 'date' : 'text'}
                                                    placeholder="Value"
                                                    value={typeof filter.value === 'string' ? filter.value : ''}
                                                    onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                                    className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 text-slate-800 dark:text-slate-105 rounded-lg"
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
                                    className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
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

                    <div className="w-[260px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Modified Date Range"
                        />
                    </div>

                    <div className="w-[200px]">
                        <Select value={stageFilter} onValueChange={setStageFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <SelectValue placeholder="KYC Stage" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl max-h-[300px] overflow-y-auto">
                                <SelectItem value="ALL">All Stages</SelectItem>
                                {['MOBILE OTP', 'EMAIL OTP', 'PASSWORD SETUP', 'KRA DOB', 'PAN NAME', 'PAN CONFIRM', 'AADHAR', 'PROFILE', 'BANK ENTRY', 'SEGMENT SELECTION', 'PAYMENT', 'NOMINEE', 'INCOME PROOF', 'SIGNATURE', 'IPV', 'PDF DOWNLOAD', 'ESIGN GENERATED', 'END PAGE'].map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                                <SelectItem value="PENDING FOR APPROVAL">Pending Approval</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="ACCOUNT OPENED">Account Opened</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Refer Filter Combobox */}
                    <div className="w-[220px]">
                        <Popover open={openReferBox} onOpenChange={setOpenReferBox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openReferBox}
                                    className="w-full justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {referFilter === "ALL"
                                                ? "Select Refer"
                                                : (referOptions.find((opt) => opt.name === referFilter) as any)?.code ||
                                                (referOptions.find((opt) => opt.name === referFilter) as any)?.org_code ||
                                                (referOptions.find((opt) => opt.name === referFilter) as any)?.name ||
                                                referFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                                <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                                    <CommandInput
                                        placeholder="Search refer..."
                                        className="h-9 text-slate-800 dark:text-slate-100"
                                        value={referSearch}
                                        onValueChange={setReferSearch}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No refer found.</CommandEmpty>
                                        <CommandGroup>
                                            {!referSearch && (
                                                <CommandItem
                                                    value="ALL"
                                                    onSelect={() => {
                                                        setReferFilter("ALL");
                                                        setOpenReferBox(false);
                                                    }}
                                                    className="flex items-center justify-between text-slate-700 dark:text-slate-300"
                                                >
                                                    <span>All Refers</span>
                                                    {referFilter === "ALL" && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                                                </CommandItem>
                                            )}
                                            {visibleReferOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={opt.name}
                                                    onSelect={() => {
                                                        setReferFilter(opt.name === referFilter ? "ALL" : opt.name);
                                                        setOpenReferBox(false);
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
                                                        {referFilter === opt.name && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
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
                            placeholder="Search App ID, UCC or Mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading || isExporting}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business' || user?.user_code === 'RMRL' || user?.category === 'admin') && (
                        <Button
                             onClick={handleExport}
                             disabled={isExporting || isLoading || isRefreshing}
                             variant="outline"
                             className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-250 dark:border-emerald-950 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-105 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm"
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
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl">
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
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}            {/* Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <ScrollArea className="flex-1">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('application_id')}>
                                    <div className="flex items-center gap-2">
                                        App ID
                                        {sortConfig?.key === 'application_id' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400">Number</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('ucc')}>
                                    <div className="flex items-center gap-2">
                                        UCC
                                        {sortConfig?.key === 'ucc' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('user_name')}>
                                    <div className="flex items-center gap-2">
                                        User Name
                                        {sortConfig?.key === 'user_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-450" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400">Refer</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400">Stage</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-655 dark:text-slate-400">Status</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-655 dark:text-slate-400">Ready</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800/45">
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-20 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-16 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                                        <td className="py-3 px-4 text-center"><Skeleton className="w-2 h-2 rounded-full mx-auto bg-slate-200 dark:bg-slate-800" /></td>
                                    </tr>
                                ))
                            ) : kycData && kycData.length > 0 ? (
                                kycData.map((row: any, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedAppId(row.name || row.application_id)}
                                    >
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{formatValue(row.application_id)}</td>
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                                            {row.mobile_number}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{row.ucc || '-'}</td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{formatValue(row.user_name)}</td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{row.refer ? (referCodeMap.get(row.refer) || row.refer) : '-'}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 py-0.5 text-[10px]">
                                                {row.kyc_stage === 'END PAGE' ? 'ESIGN COMPLETED' : formatValue(row.kyc_stage)}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                className={cn(
                                                    "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]",
                                                    row.application_status === 'ACCOUNT OPENED' || row.application_status === 'APPROVED' ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/30 hover:text-green-700 dark:hover:text-green-400" :
                                                        row.application_status === 'REJECTED' ? "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400" :
                                                            row.application_status === 'PENDING FOR APPROVAL' ? "bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-400" :
                                                                "bg-amber-100 dark:bg-amber-950/20 text-amber-705 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30 hover:text-amber-707 dark:hover:text-amber-400"
                                                )}
                                            >
                                                {row.application_status || 'IN PROGRESS'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full mx-auto",
                                                row.client_mapping ? "bg-green-500" : "bg-red-400 opacity-30"
                                            )} />
                                        </td>
                                    </tr>
                                ))
                            ) : !isLoading && (
                                <tr>
                                    <td colSpan={9} className="h-72 text-center">
                                        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-100/50 dark:border-slate-800 shadow-sm">
                                                <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No KYC Data Found</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto mb-6">
                                                We couldn't find any applications matching your current filters or search criteria.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setReferFilter('ALL');
                                                    setStatusFilter('ALL');
                                                    setStageFilter('ALL');
                                                    setDateRange(null);
                                                    setAdvancedFilters([]);
                                                }}
                                                className="rounded-xl px-6 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 font-semibold h-10 transition-all hover:scale-105 active:scale-95"
                                            >
                                                Clear All Filters
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>

                {/* Status Info Footer */}
                <div className="shrink-0 py-2 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-105 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-105 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, count)}</span> of <span className="text-slate-900 dark:text-slate-105 font-bold">{count}</span> applications
                    </p>
                </div>
            </Card>

            {/* Timeline Sheet */}
            <Sheet open={!!selectedAppId} onOpenChange={(open) => !open && setSelectedAppId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-md border-l-0 p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
                    <SheetHeader className="p-6 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200/20 border-2 border-white dark:border-slate-800">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Application Timeline</SheetTitle>
                                <SheetDescription className="text-slate-505 dark:text-slate-400 font-medium">
                                    ID: <span className="text-purple-600 dark:text-purple-400 font-bold">{selectedAppId}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
                        {isDocLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : docError ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-red-500 dark:text-red-400 gap-2 p-4 text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-405 mb-2" />
                                <p className="font-bold text-sm">Error Loading Timeline</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{(docError as any).message || 'There was an error while fetching the documents.'}</p>
                            </div>
                        ) : selectedAppId ? (
                            <KycTimeline
                                applicationId={selectedAppId}
                                applicationStatus={kycData?.find(k => (k.name || k.application_id) === selectedAppId)?.application_status || ''}
                                historyData={selectedKycDoc?.kyc_stage_history || []}
                            />
                        ) : null}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Kyc;
