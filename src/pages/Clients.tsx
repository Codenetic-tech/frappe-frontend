import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients, ClientItem } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
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
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';

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

const Clients: React.FC = () => {
    const navigate = useNavigate();
    const { token, user, hierarchyData } = useAuth();
    const { selectedHierarchy } = useFilter();
    const {
        clientsData,
        isLoading,
        error,
        totalCount,
        directCount,
        indirectCount,
        statusCount,
        refreshClientsData,
        exportClientsData
    } = useClients();
    const { orgTreeData } = useOrgTree();

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
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ClientItem; direction: 'asc' | 'desc' } | null>(null);

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
        if (!hierarchyData) return [];
        return hierarchyData
            .filter(item => item.is_group === 1)
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

    const loadClientsData = useCallback(async (page: number, currentSearch: string, currentStatus: string, currentTradeDone: string, currentParent: string, currentDates: [Date, Date] | null, currentHierarchy: string[]) => {
        if (!token) return;

        const params: any = {
            limit_start: (page - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        };

        // VirtualizedTree selection → expanded in ClientContext
        if (currentHierarchy && currentHierarchy.length > 0) {
            params.refer_list = currentHierarchy;
        }

        // Combobox parent → sent raw (no expansion) via parent_code
        if (currentParent !== 'ALL') {
            params.parent_code = currentParent;
        }

        if (currentSearch) {
            if (/^\d/.test(currentSearch)) {
                params.mobile_no = currentSearch;
            } else {
                params.name = currentSearch;
            }
        }

        if (currentDates?.[0] && currentDates?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            params.from_date = formatLocal(currentDates[0]);
            params.to_date = formatLocal(currentDates[1]);
        }

        if (currentStatus !== 'ALL') {
            params.activation_status = currentStatus;
        }

        if (currentTradeDone !== 'ALL') {
            params.trade_done = currentTradeDone;
        }

        await refreshClientsData(params);
    }, [refreshClientsData, token]);

    const handleSort = (key: keyof ClientItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig?.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadClientsData(currentPage, searchQuery, statusFilter, tradeDoneFilter, parentFilter, dateRange, selectedHierarchy);
        } finally {
            setIsRefreshing(false);
        }
    };
    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: 0 });
        try {
            const params: any = {};

            if (selectedHierarchy && selectedHierarchy.length > 0) {
                params.refer_list = selectedHierarchy;
            }

            if (parentFilter !== 'ALL') {
                params.parent_code = parentFilter;
            }

            if (searchQuery) {
                if (/^\d/.test(searchQuery)) {
                    params.mobile_no = searchQuery;
                } else {
                    params.name = searchQuery;
                }
            }

            if (dateRange?.[0] && dateRange?.[1]) {
                const formatLocal = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                params.from_date = formatLocal(dateRange[0]);
                params.to_date = formatLocal(dateRange[1]);
            }

            if (statusFilter !== 'ALL') {
                params.activation_status = statusFilter;
            }

            if (tradeDoneFilter !== 'ALL') {
                params.trade_done = tradeDoneFilter;
            }

            const data = await exportClientsData(params, (current, total) => {
                setExportProgress({ current, total });
            });

            if (data.length > 0) {
                // Rename keys for better Excel headers
                const exportData = data.map(item => ({
                    'Client Code': item.client_code,
                    'Name': item.client_name,
                    'Mobile': item.mobile_number,
                    'Parent': item.parent1,
                    'Opened Date': item.account_opened_date,
                    'Trade Done': item.trade_done,
                    'Last Trade': item.last_trade_date,
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

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, statusFilter, tradeDoneFilter, parentFilter, dateRange]);

    useEffect(() => {
        if (token) {
            loadClientsData(currentPage, debouncedSearchQuery, statusFilter, tradeDoneFilter, parentFilter, dateRange, selectedHierarchy);
        }
    }, [currentPage, debouncedSearchQuery, statusFilter, tradeDoneFilter, parentFilter, dateRange, selectedHierarchy, token, loadClientsData]);

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
            'ACTIVE': "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700",
            'REACTIVATED': "bg-purple-100 text-purple-700 hover:bg-purple-100 hover:text-purple-700",
            'SUSPENDED': "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700",
            'CLOSED': "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700",
            'DORMANT': "bg-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-700",
            'INACTIVE': "bg-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-400",
            'NOT ENABLED': "bg-slate-100 text-slate-700 hover:bg-slate-100 hover:text-slate-700",
        };

        const currentStyle = statusStyles[normalizedStatus] || "bg-slate-50 text-slate-300";

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
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            <div className="shrink-0 space-y-4">
                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Users className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 uppercase tracking-wider">Direct</span>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <UserCheck className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{directCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">Indirect</span>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <UserPlus className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{indirectCount}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount.ACTIVE}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 uppercase tracking-wider">Closed</span>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount.CLOSED}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 uppercase tracking-wider">Dormant</span>
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount.DORMANT}</p>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-2xl backdrop-blur-sm relative z-20">
                    <div className="w-[260px]">
                        <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            placeholder="Account Opened Range"
                            className="w-full bg-white border-slate-200 focus:ring-purple-500 rounded-xl custom-date-picker h-10"
                            appearance="default"
                            block
                        />
                    </div>
                    <div className="w-[180px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                                <SelectItem value="DORMANT">Dormant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[180px]">
                        <Select value={tradeDoneFilter} onValueChange={setTradeDoneFilter}>
                            <SelectTrigger className="bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                                    <SelectValue placeholder="Trade Done" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
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
                                    className="w-full justify-between bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {parentFilter === "ALL"
                                                ? "Select Parent"
                                                : formatUserName(parentOptions.find((opt) => opt.name === parentFilter)?.name || parentFilter)}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 rounded-xl border-slate-200 shadow-xl">
                                <Command>
                                    <CommandInput placeholder="Search parent..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No parent found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="ALL"
                                                onSelect={() => {
                                                    setParentFilter("ALL");
                                                    setOpenParentBox(false);
                                                }}
                                                className="flex items-center justify-between"
                                            >
                                                <span>All Parents</span>
                                                {parentFilter === "ALL" && <Check className="h-4 w-4 text-purple-600" />}
                                            </CommandItem>
                                            {parentOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={`${opt.name} ${userNameMap.get(opt.name) || ''}`}
                                                    onSelect={() => {
                                                        setParentFilter(opt.name === parentFilter ? "ALL" : opt.name);
                                                        setOpenParentBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2"
                                                >
                                                    <span className="truncate text-sm">{formatUserName(opt.name)}</span>
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
                                                        {parentFilter === opt.name && <Check className="h-3.5 w-3.5 text-purple-600" />}
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
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Search Client Code"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading || isExporting}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business') && (
                        <Button
                            onClick={handleExport}
                            disabled={isExporting || isLoading || isRefreshing}
                            variant="outline"
                            className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-sm"
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
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 gap-2">
                                <Columns3 className="w-4 h-4" />
                                Columns
                                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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
                                        className="capitalize"
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

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}

            {/* Table Section */}
            <Card className="flex-1 min-h-0 flex flex-col border-none shadow-sm overflow-hidden bg-white rounded-2xl border border-slate-100">
                <ScrollArea className="flex-1">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col" onClick={() => handleSort('client_code')}>
                                    <div className="flex items-center gap-2">
                                        Client Code
                                        {sortConfig?.key === 'client_code' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />}
                                    </div>
                                </th>
                                {columnVisibility.mobile && <th className="text-left py-4 px-4 font-semibold text-slate-600">Mobile</th>}
                                {columnVisibility.client_name && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col" onClick={() => handleSort('client_name')}>
                                        <div className="flex items-center gap-2">
                                            Client Name
                                            {sortConfig?.key === 'client_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                            ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />}
                                        </div>
                                    </th>
                                )}
                                {columnVisibility.opened_date && <th className="text-left py-4 px-4 font-semibold text-slate-600">Opened Date</th>}
                                {columnVisibility.trade_done && <th className="text-left py-4 px-4 font-semibold text-slate-600">First Trade</th>}
                                {columnVisibility.last_trade && <th className="text-left py-4 px-4 font-semibold text-slate-600">Last Trade Date</th>}
                                {columnVisibility.parent && <th className="text-left py-4 px-4 font-semibold text-slate-600">Parent</th>}
                                {columnVisibility.nse && <th className="text-center py-4 px-4 font-semibold text-slate-600">NSE</th>}
                                {columnVisibility.bse && <th className="text-center py-4 px-4 font-semibold text-slate-600">BSE</th>}
                                {columnVisibility.mcx && <th className="text-center py-4 px-4 font-semibold text-slate-600">MCX</th>}
                                {columnVisibility.nfo && <th className="text-center py-4 px-4 font-semibold text-slate-600">NFO</th>}
                                {columnVisibility.bfo && <th className="text-center py-4 px-4 font-semibold text-slate-600">BFO</th>}
                                {columnVisibility.status && <th className="text-left py-4 px-4 font-semibold text-slate-600">Status</th>}
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
                                sortedData.map((row: ClientItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="py-4 px-4 font-semibold text-slate-900 leading-tight">
                                            <button
                                                onClick={() => navigate(`/clients/${row.client_code}`)}
                                                className="hover:text-purple-600 transition-colors text-left focus:outline-none"
                                            >
                                                {formatValue(row.client_code)}
                                            </button>
                                        </td>
                                        {columnVisibility.mobile && (
                                            <td className="py-4 px-4 font-semibold text-slate-900 leading-tight">
                                                <div className="flex items-center gap-2">
                                                    {row.mobile_number}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.dispatchEvent(new CustomEvent('trigger-kyc-search', {
                                                                detail: { clientCode: row.mobile_number }
                                                            }));
                                                        }}
                                                        className="p-1 hover:bg-purple-50 rounded-md text-purple-700 hover:text-purple-600 transition-all group/kyc"
                                                        title="Search in KYC Tracker"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {columnVisibility.client_name && <td className="py-4 px-4 text-slate-500">{formatValue(row.client_name)}</td>}
                                        {columnVisibility.opened_date && <td className="py-4 px-4 text-slate-500 font-mono text-xs">{formatValue(row.account_opened_date)}</td>}
                                        {columnVisibility.trade_done && (
                                            <td className="py-4 px-4">
                                                <Badge
                                                    className={cn(
                                                        "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]",
                                                        row.trade_done === 'TRUE' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}
                                                >
                                                    {row.trade_done || 'FALSE'}
                                                </Badge>
                                            </td>
                                        )}
                                        {columnVisibility.last_trade && <td className="py-4 px-4 text-slate-500 font-mono text-xs">{formatValue(row.last_trade_date)}</td>}
                                        {columnVisibility.parent && <td className="py-4 px-4 text-slate-500">{formatValue(row.parent1)}</td>}
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
                                                        row.activation_status === 'ACTIVE' ? "bg-green-700 text-white hover:bg-green-700 hover:text-white" :
                                                            row.activation_status === 'CLOSED' ? "bg-red-700 text-white hover:bg-red-700 hover:text-white" :
                                                                "bg-amber-700 text-white hover:bg-amber-700 hover:text-white"
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
                                    <td colSpan={visibleColumnCount} className="h-48 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No results found matching your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>

                {/* Status Info Footer */}
                <div className="shrink-0 py-2 px-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 font-bold">{totalCount}</span> clients
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Clients;
