import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useKyc, KycItem } from '@/contexts/KycContext';
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
    FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';
import KycTimeline from '@/components/KycTimeline';
import { exportToExcel } from '@/utils/excelExport';
import { toast } from 'sonner';
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

const Kyc: React.FC = () => {
    const { token, user, hierarchyData } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { kycData, isLoading, error, count, statusCount, refreshKycData, exportKycData } = useKyc();
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
    const [referFilter, setReferFilter] = useState<string>(() => sessionStorage.getItem('kycReferFilter') || 'ALL');
    const [openReferBox, setOpenReferBox] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof KycItem; direction: 'asc' | 'desc' } | null>(null);
    const [referSearch, setReferSearch] = useState('');

    // Filtered hierarchy for refer selection, sorted by category order
    const referOptions = useMemo(() => {
        if (!hierarchyData) return [];
        return hierarchyData
            .sort((a, b) => {
                const pa = CATEGORY_ORDER[a.category?.toUpperCase() || ''] || 99;
                const pb = CATEGORY_ORDER[b.category?.toUpperCase() || ''] || 99;
                if (pa !== pb) return pa - pb;
                return a.name.localeCompare(b.name);
            });
    }, [hierarchyData]);

    // Optimized visible options for refer selection to prevent performance issues with large data
    const visibleReferOptions = useMemo(() => {
        if (!referOptions) return [];
        if (!referSearch) return referOptions.slice(0, 100);

        const searchLower = referSearch.toLowerCase();
        return referOptions
            .filter(opt =>
                opt.name.toLowerCase().includes(searchLower) ||
                (opt.category && opt.category.toLowerCase().includes(searchLower))
            )
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

    const loadKycData = useCallback(async (page: number, currentSearch: string, currentStatus: string, currentDates: [Date, Date] | null, currentHierarchy: string[], currentRefer: string) => {
        if (!token) return;

        const params: any = {
            limit_start: (page - 1) * ITEMS_PER_PAGE,
            limit_page_length: ITEMS_PER_PAGE
        };

        // Combobox refer filter takes priority — sends only that code (no expansion)
        if (currentRefer !== 'ALL') {
            params.refer_list = [currentRefer];
            params.skip_expand = true;
        } else if (currentHierarchy && currentHierarchy.length > 0) {
            params.refer_list = currentHierarchy;
        }

        if (currentSearch) {
            if (/^[a-zA-Z]/.test(currentSearch)) {
                params.ucc_field = currentSearch;
            } else if (/^\d{10}$/.test(currentSearch)) {
                params.mobile_no = currentSearch;
            } else {
                params.application_id = currentSearch;
            }
        }

        if (currentDates?.[0] && currentDates?.[1]) {
            const formatLocal = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            params.from_application_modified_date_time = formatLocal(currentDates[0]) + " 00:00:00";
            params.to_application_modified_date_time = formatLocal(currentDates[1]) + " 23:59:59";
        }

        if (currentStatus !== 'ALL') {
            params.application_status = currentStatus;
        }

        await refreshKycData(params);
    }, [refreshKycData, token]);

    const handleSort = (key: keyof KycItem) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig?.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await loadKycData(currentPage, searchQuery, statusFilter, dateRange, selectedHierarchy, referFilter);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: 0 });
        try {
            const params: any = {};

            if (referFilter !== 'ALL') {
                params.refer_list = [referFilter];
                params.skip_expand = true;
            } else if (selectedHierarchy && selectedHierarchy.length > 0) {
                params.refer_list = selectedHierarchy;
            }

            if (searchQuery) {
                if (/^[a-zA-Z]/.test(searchQuery)) {
                    params.ucc_field = searchQuery;
                } else if (/^\d{10}$/.test(searchQuery)) {
                    params.mobile_no = searchQuery;
                } else {
                    params.application_id = searchQuery;
                }
            }

            if (dateRange?.[0] && dateRange?.[1]) {
                const formatLocal = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                params.from_application_modified_date_time = formatLocal(dateRange[0]) + " 00:00:00";
                params.to_application_modified_date_time = formatLocal(dateRange[1]) + " 23:59:59";
            }

            if (statusFilter !== 'ALL') {
                params.application_status = statusFilter;
            }

            const data = await exportKycData(params, (current, total) => {
                setExportProgress({ current, total });
            });

            if (data.length > 0) {
                const exportData = data.map(item => ({
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

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, dateRange, statusFilter, referFilter]);

    useEffect(() => {
        if (token) {
            loadKycData(currentPage, debouncedSearchQuery, statusFilter, dateRange, selectedHierarchy, referFilter);
        }
    }, [currentPage, debouncedSearchQuery, dateRange, statusFilter, selectedHierarchy, referFilter, token, loadKycData]);

    const filteredData = useMemo(() => {
        if (!kycData) return [];
        const result = [...kycData];
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
    }, [kycData, sortConfig]);

    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

    const formatValue = (value: string | null) => value || '-';

    const renderSegmentBadge = (status: string | null | undefined) => {
        const isActive = status === 'Active';
        return (
            <Badge
                variant="outline"
                className={cn(
                    "py-0 text-[10px] px-2 h-5 rounded-full font-bold uppercase tracking-tight transition-colors w-16 justify-center border",
                    isActive
                        ? "bg-green-100/50 text-green-700 border-green-200"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                )}
            >
                {isActive ? 'Active' : '-'}
            </Badge>
        );
    };

    return (
        <div className="p-4 h-full flex flex-col overflow-hidden space-y-6">
            {/* Header & Summary Section */}
            <div className="shrink-0 space-y-4">
                {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">KYC Applications</h1>
                        <p className="text-slate-500 text-sm">Manage and track customer onboarding status</p>
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        variant="outline"
                        className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-all"
                    >
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div> */}

                {/* Status Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">Total</span>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <FileText className="w-4 h-4 text-purple-600" />
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

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 uppercase tracking-wider">Approved</span>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount['APPROVED']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-purple-600 uppercase tracking-wider">Opened</span>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <ShieldCheck className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount['ACCOUNT OPENED']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-violet-600 uppercase tracking-wider">Pending</span>
                            <div className="p-2 bg-violet-50 rounded-lg">
                                <UserCheck className="w-4 h-4 text-violet-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount['PENDING FOR APPROVAL']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-amber-600 uppercase tracking-wider">Progress</span>
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <Clock className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount['IN PROGRESS']}</p>
                            )}
                        </div>
                    </Card>

                    <Card className="p-4 border-border shadow-sm bg-white border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 uppercase tracking-wider">Rejected</span>
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isLoading ? (
                                <Skeleton className="h-8 w-12 mb-1" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900">{statusCount['REJECTED']}</p>
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
                            placeholder="Modified Date Range"
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
                                    className="w-full justify-between bg-white border-slate-200 focus:ring-purple-500 rounded-xl h-10 px-3 font-normal"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">
                                            {referFilter === "ALL"
                                                ? "Select Refer"
                                                : referOptions.find((opt) => opt.name === referFilter)?.name || referFilter}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0 rounded-xl border-slate-200 shadow-xl">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Search refer..."
                                        className="h-9"
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
                                                    className="flex items-center justify-between"
                                                >
                                                    <span>All Refers</span>
                                                    {referFilter === "ALL" && <Check className="h-4 w-4 text-purple-600" />}
                                                </CommandItem>
                                            )}
                                            {visibleReferOptions.map((opt) => (
                                                <CommandItem
                                                    key={opt.name}
                                                    value={opt.name}
                                                    onSelect={(currentValue) => {
                                                        // Use opt.name directly as currentValue from cmdk might be different if filtered
                                                        setReferFilter(opt.name === referFilter ? "ALL" : opt.name);
                                                        setOpenReferBox(false);
                                                    }}
                                                    className="flex items-center justify-between gap-2"
                                                >
                                                    <span className="truncate text-sm">{opt.name}</span>
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
                                                        {referFilter === opt.name && <Check className="h-3.5 w-3.5 text-purple-600" />}
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
                            placeholder="Search App ID, UCC or Mobile..."
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

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business' || user?.user_code === 'RMRL') && (
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
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col" onClick={() => handleSort('application_id')}>
                                    <div className="flex items-center gap-2">
                                        App ID
                                        {sortConfig?.key === 'application_id' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Number</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col" onClick={() => handleSort('ucc')}>
                                    <div className="flex items-center gap-2">
                                        UCC
                                        {sortConfig?.key === 'ucc' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600 cursor-pointer select-none group/col" onClick={() => handleSort('user_name')}>
                                    <div className="flex items-center gap-2">
                                        User Name
                                        {sortConfig?.key === 'user_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />
                                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/col:text-slate-400" />}
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Refer</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Stage</th>
                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                                {/* <th className="text-center py-3 px-4 font-semibold text-slate-600">NSE</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-600">BSE</th>
                                <th className="text-center py-3 px-4 font-semibold text-slate-600">NFO</th> */}
                                <th className="text-center py-3 px-4 font-semibold text-slate-600">Ready</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50">
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
                                        <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                                        <td className="py-3 px-4 text-center"><Skeleton className="w-2 h-2 rounded-full mx-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((row: KycItem, index: number) => (
                                    <tr
                                        key={index}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedAppId(row.application_id)}
                                    >
                                        <td className="py-3 px-4 font-medium text-slate-900">{formatValue(row.application_id)}</td>
                                        <td className="py-3 px-4 font-medium text-slate-900">
                                            {row.mobile_number}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{row.ucc || '-'}</td>
                                        <td className="py-3 px-4 text-slate-700">{formatValue(row.user_name)}</td>
                                        <td className="py-3 px-4 text-slate-700">{formatValue(row.refer)}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="outline" className="text-purple-600 bg-purple-50 border-purple-100 py-0.5 text-[10px]">
                                                {row.kyc_stage === 'END PAGE' ? 'ESIGN COMPLETED' : formatValue(row.kyc_stage)}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                className={cn(
                                                    "capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]",
                                                    row.application_status === 'ACCOUNT OPENED' || row.application_status === 'APPROVED' ? "bg-green-100 text-green-700 hover:bg-green-100 hover:text-green-700" :
                                                        row.application_status === 'REJECTED' || row.application_status === 'REJECTED' ? "bg-red-100 text-red-700 hover:bg-red-100 hover:text-red-700" :
                                                            row.application_status === 'PENDING FOR APPROVAL' ? "bg-purple-100 text-purple-700 hover:bg-purple-100 hover:text-purple-700" :
                                                                "bg-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-700"
                                                )}
                                            >
                                                {row.application_status || 'IN PROGRESS'}
                                            </Badge>
                                        </td>
                                        {/* <td className="py-3 px-4 text-center">{renderSegmentBadge(row.nse)}</td>
                                        <td className="py-3 px-4 text-center">{renderSegmentBadge(row.bse)}</td>
                                        <td className="py-3 px-4 text-center">{renderSegmentBadge(row.nfo)}</td> */}
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
                                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100/50 shadow-sm">
                                                <FileText className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">No KYC Data Found</h3>
                                            <p className="text-sm text-slate-500 max-w-[280px] mx-auto mb-6">
                                                We couldn't find any applications matching your current filters or search criteria.
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setReferFilter('ALL');
                                                    setStatusFilter('ALL');
                                                    setDateRange(null);
                                                }}
                                                className="rounded-xl px-6 border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold h-10 transition-all hover:scale-105 active:scale-95"
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
                <div className="shrink-0 py-2 px-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 font-medium">
                        Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, count)}</span> of <span className="text-slate-900 font-bold">{count}</span> applications
                    </p>
                </div>
            </Card>

            {/* Timeline Sheet */}
            <Sheet open={!!selectedAppId} onOpenChange={(open) => !open && setSelectedAppId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-md border-l-0 p-0 overflow-hidden flex flex-col bg-white">
                    <SheetHeader className="p-6 border-b bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-200 border-2 border-white">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900">Application Timeline</SheetTitle>
                                <SheetDescription className="text-slate-500 font-medium">
                                    ID: <span className="text-purple-600 font-bold">{selectedAppId}</span>
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
                        {selectedAppId && (
                            <KycTimeline
                                applicationId={selectedAppId}
                                applicationStatus={kycData?.find(k => k.application_id === selectedAppId)?.application_status || ''}
                                historyData={kycData?.find(k => k.application_id === selectedAppId)?.kyc_stage_history || []}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Kyc;
