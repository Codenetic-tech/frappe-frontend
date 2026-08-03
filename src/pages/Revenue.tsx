import React, { useState, useEffect, useMemo } from 'react';
import { useRevenue, RevenueFetchParams, RevenueItem, SegmentBreakdown, getSegmentValue, getSegmentDetails } from '@/contexts/RevenueContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    TrendingUp,
    IndianRupee,
    Users,
    RefreshCcw,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    FileDown,
    Search,
    Network,
    X,
    Info,
    Columns3,
} from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from '@/hooks/use-toast';
import { exportToExcel } from '@/utils/excelExport';
import { cn } from '@/lib/utils';

// ── all revenue columns config ───────────────────────────────────────────────

export interface ColumnDef {
    id: string;
    label: string;
    defaultVisible: boolean;
    defaultWidth: number;
    align: 'left' | 'right';
}

const BROKERAGE_SEGMENT_IDS = ['nfo', 'nse', 'mcx', 'bse', 'bfo', 'ncom'];
const INCOME_SEGMENT_IDS = ['nfo_income', 'nse_income', 'mcx_income', 'bse_income', 'bfo_income', 'ncom_income'];
const ALL_SEGMENT_IDS = [...BROKERAGE_SEGMENT_IDS, ...INCOME_SEGMENT_IDS];

const ALL_REVENUE_COLUMNS: ColumnDef[] = [
    { id: 'sr_no', label: 'S.No.', defaultVisible: true, defaultWidth: 80, align: 'left' },
    { id: 'ucc', label: 'UCC', defaultVisible: true, defaultWidth: 140, align: 'left' },
    { id: 'name', label: 'Name', defaultVisible: true, defaultWidth: 220, align: 'left' },
    { id: 'branch', label: 'Branch', defaultVisible: true, defaultWidth: 140, align: 'left' },
    { id: 'parent', label: 'Parent', defaultVisible: true, defaultWidth: 140, align: 'left' },
    { id: 'brokerage', label: 'Brokerage', defaultVisible: true, defaultWidth: 160, align: 'right' },
    { id: 'nfo', label: 'NFO Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'nse', label: 'NSE Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'mcx', label: 'MCX Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'bse', label: 'BSE Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'bfo', label: 'BFO Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'ncom', label: 'NCOM Brokerage', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'payout', label: 'Payout', defaultVisible: true, defaultWidth: 160, align: 'right' },
    { id: 'income', label: 'Income', defaultVisible: true, defaultWidth: 160, align: 'right' },
    { id: 'nfo_income', label: 'NFO Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'nse_income', label: 'NSE Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'mcx_income', label: 'MCX Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'bse_income', label: 'BSE Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'bfo_income', label: 'BFO Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
    { id: 'ncom_income', label: 'NCOM Income', defaultVisible: false, defaultWidth: 150, align: 'right' },
];

// ── segment breakdown popover helper ──────────────────────────────────────────

const SEGMENT_KEYS: { key: keyof Omit<SegmentBreakdown, 'total'>; label: string }[] = [
    { key: 'nfo', label: 'NFO' },
    { key: 'nse', label: 'NSE' },
    { key: 'mcx', label: 'MCX' },
    { key: 'bse', label: 'BSE' },
    { key: 'bfo', label: 'BFO' },
    { key: 'ncom', label: 'NCOM' },
];

const SegmentBreakdownPopover: React.FC<{
    title: string;
    data: number | SegmentBreakdown | null | undefined;
    trigger?: React.ReactNode;
}> = ({ title, data, trigger }) => {
    const details = getSegmentDetails(data);
    const hasData = typeof data === 'object' && data !== null;

    if (!hasData) return null;

    const formatVal = (v: number) =>
        v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger || (
                    <button
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer shrink-0 ml-1"
                        title="View Segment Breakdown"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-64 p-3 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50"
                align="end"
            >
                <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate pr-2">{title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30 shrink-0">
                            ₹{formatVal(details.total)}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {SEGMENT_KEYS.map(({ key, label }) => {
                            const val = details[key] ?? 0;
                            const isNonZero = val !== 0;
                            return (
                                <div
                                    key={key}
                                    className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                                        isNonZero
                                            ? 'bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100'
                                            : 'text-slate-400 dark:text-slate-600 opacity-50'
                                    }`}
                                >
                                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider">{label}</span>
                                    <span>₹{formatVal(val)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// ── category helpers (same as KYC) ──────────────────────────────────────────

const CATEGORY_ORDER: Record<string, number> = {
    'ZONE': 1, 'REGION': 2, 'BRANCH': 3, 'RM': 4, 'AP': 5, 'U-AP': 6, 'CLIENT': 7,
};

const getCategoryStyles = (cat?: string) => {
    switch (cat?.toUpperCase()) {
        case 'ZONE':   return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30';
        case 'REGION': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30';
        case 'BRANCH': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-850 dark:text-slate-300 dark:border-slate-800';
        case 'RM':     return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30';
        case 'AP':     return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30';
        case 'U-AP':   return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/30';
        case 'CLIENT': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30';
        default:       return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
};

// ── multi-select combobox (KYC pattern) ─────────────────────────────────────

interface ComboOption { value: string; label: string; category?: string; }

interface MultiSelectComboboxProps {
    options: ComboOption[];
    selected: string[];
    onToggle: (value: string) => void;
    onClear: () => void;
    placeholder: string;
    searchPlaceholder: string;
    icon: React.ReactNode;
    showCategoryBadge?: boolean;
}

const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
    options, selected, onToggle, onClear,
    placeholder, searchPlaceholder, icon, showCategoryBadge = false,
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const visibleOptions = useMemo(() => {
        if (!search) return options.slice(0, 100);
        const s = search.toLowerCase();
        return options
            .filter(o => 
                o.value.toLowerCase().includes(s) || 
                o.label.toLowerCase().includes(s) || 
                (o.category?.toLowerCase().includes(s) ?? false)
            )
            .slice(0, 100);
    }, [options, search]);

    useEffect(() => { if (!open) setSearch(''); }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="min-w-[170px] max-w-[210px] justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl h-10 px-3 font-normal hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 shrink-0"
                >
                    <div className="flex items-center gap-2 truncate min-w-0">
                        {icon}
                        <span className="truncate text-sm">
                            {selected.length === 0 ? placeholder : `${placeholder} (${selected.length})`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {selected.length > 0 && (
                            <span
                                role="button" tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClear(); } }}
                                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="w-4 h-4 opacity-50 text-slate-400 dark:text-slate-500" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50" align="start">
                <Command shouldFilter={false} className="bg-white dark:bg-slate-900">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        className="h-9 dark:text-slate-100"
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList className="bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                        <CommandEmpty className="text-slate-500 dark:text-slate-400">No results found.</CommandEmpty>
                        <CommandGroup>
                            <ScrollArea className="h-[240px]">
                                {visibleOptions.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.value}
                                        onSelect={() => onToggle(opt.value)}
                                        className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                    >
                                        <Checkbox
                                            checked={selected.includes(opt.value)}
                                            onCheckedChange={() => onToggle(opt.value)}
                                            className="shrink-0 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 dark:border-slate-700"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono flex-1 truncate">
                                            {opt.label}
                                        </span>
                                        {showCategoryBadge && opt.category && (
                                            <Badge
                                                variant="outline"
                                                className={`text-[8px] px-1 py-0 h-3.5 uppercase font-bold border shrink-0 ${getCategoryStyles(opt.category)}`}
                                            >
                                                {opt.category}
                                            </Badge>
                                        )}
                                    </CommandItem>
                                ))}
                            </ScrollArea>
                        </CommandGroup>
                    </CommandList>
                </Command>
                {selected.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-2 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{selected.length} selected</span>
                        <button onClick={onClear} className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-800 dark:hover:text-purple-300">
                            Clear all
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

// ── helpers ──────────────────────────────────────────────────────────────────

const parseDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const TableWrapper = ({ scrollWholePage = false, children }: { scrollWholePage?: boolean; children: React.ReactNode }) => {
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

// ── page ─────────────────────────────────────────────────────────────────────

const Revenue: React.FC = () => {
    const { orgTreeData } = useOrgTree();
    const tree = orgTreeData;
    const {
        revenueData, summary, totalRecords, totalPages, currentPage,
        appliedParams, isLoading, error, pageSize,
        fetchRevenue, exportRevenue,
    } = useRevenue();

    // UI filter state — initialised from context so navigating back restores filters
    const [dateRange, setDateRange] = useState<[Date, Date]>([
        parseDate(appliedParams.from),
        parseDate(appliedParams.to),
    ]);
    const [selectedClientCodes, setSelectedClientCodes] = useState<string[]>(appliedParams.client_codes);
    const [selectedSubCodes, setSelectedSubCodes] = useState<string[]>(appliedParams.sub_codes);

    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('revenueColumnVisibility');
        const defaults: Record<string, boolean> = {};
        ALL_REVENUE_COLUMNS.forEach(c => { defaults[c.id] = c.defaultVisible; });
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('revenueColumnVisibility', JSON.stringify(columnVisibility));
    }, [columnVisibility]);

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const stored = localStorage.getItem('revenueColumnWidths');
        const defaults: Record<string, number> = {};
        ALL_REVENUE_COLUMNS.forEach(c => { defaults[c.id] = c.defaultWidth; });
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    });

    useEffect(() => {
        localStorage.setItem('revenueColumnWidths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const stored = localStorage.getItem('revenueColumnOrder');
        const defaultOrder = ALL_REVENUE_COLUMNS.map(c => c.id);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const filtered = parsed.filter((c: string) => defaultOrder.includes(c));
                defaultOrder.forEach((col, idx) => {
                    if (!filtered.includes(col)) {
                        filtered.splice(idx, 0, col);
                    }
                });
                return filtered;
            } catch {
                return defaultOrder;
            }
        }
        return defaultOrder;
    });

    useEffect(() => {
        localStorage.setItem('revenueColumnOrder', JSON.stringify(columnOrder));
    }, [columnOrder]);

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

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

    const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || 150;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(80, startWidth + deltaX);
            setColumnWidths(prev => {
                const updated = {
                    ...prev,
                    [columnId]: newWidth
                };
                localStorage.setItem('revenueColumnWidths', JSON.stringify(updated));
                return updated;
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderResizeHandle = (columnId: string) => (
        <div
            onMouseDown={(e) => handleResizeStart(e, columnId)}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
            }}
            className="absolute right-0 top-0 h-full w-3 cursor-col-resize z-20 group/resize flex items-center justify-center -mr-1.5"
        >
            <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-800 group-hover/resize:bg-purple-500/80 active:bg-purple-600 transition-colors" />
        </div>
    );

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        setDraggedIndex(null);
        setDraggedOverIndex(null);
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        setColumnOrder(prev => {
            const next = [...prev];
            const [dragged] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, dragged);
            localStorage.setItem('revenueColumnOrder', JSON.stringify(next));
            return next;
        });
    };

    const totalTableWidth = useMemo(() => {
        return columnOrder.reduce((acc, colId) => {
            if (columnVisibility[colId]) {
                return acc + (columnWidths[colId] || 150);
            }
            return acc;
        }, 0);
    }, [columnOrder, columnVisibility, columnWidths]);

    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(Boolean).length;
    }, [columnVisibility]);

    const [sortConfig, setSortConfig] = useState<{ key: RKey; direction: 'asc' | 'desc' } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

    // Option lists from hierarchy
    const clientOptions = useMemo((): ComboOption[] =>
        ((tree as any[]) ?? [])
            .filter(n => n.category?.toUpperCase() === 'CLIENT')
            .map(n => {
                const codeVal = n.code || n.org_code || n.name;
                const isRM = n.org_type === 'RM' || n.category === 'RM';
                const labelVal = isRM
                    ? `${codeVal} ${n.name1 || ''}`.trim()
                    : codeVal;
                return { value: codeVal, label: labelVal, category: n.category ?? undefined };
            })
            .sort((a, b) => a.value.localeCompare(b.value)),
        [tree]
    );

    const subCodeOptions = useMemo((): ComboOption[] =>
        ((tree as any[]) ?? [])
            .filter(n => n.category?.toUpperCase() !== 'CLIENT')
            .map(n => {
                const codeVal = n.code || n.org_code || n.name;
                const isRM = n.org_type === 'RM' || n.category === 'RM';
                const labelVal = isRM
                    ? `${codeVal} ${n.name1 || ''}`.trim()
                    : codeVal;
                return { value: codeVal, label: labelVal, category: n.category ?? undefined };
            })
            .sort((a, b) => {
                const pa = CATEGORY_ORDER[a.category?.toUpperCase() ?? ''] ?? 99;
                const pb = CATEGORY_ORDER[b.category?.toUpperCase() ?? ''] ?? 99;
                return pa !== pb ? pa - pb : a.value.localeCompare(b.value);
            }),
        [tree]
    );

    useEffect(() => {
        if (error) {
            const description = typeof error === 'object'
                ? ((error as any).message || JSON.stringify(error))
                : String(error);
            toast({ variant: "destructive", title: "Error", description });
        }
    }, [error]);

    // ── filter submit ────────────────────────────────────────────────────────

    const buildParams = (clientCodes: string[], subCodes: string[]): RevenueFetchParams => ({
        from: formatDate(dateRange[0]),
        to: formatDate(dateRange[1]),
        client_codes: clientCodes,
        sub_codes: subCodes,
    });

    const handleSubmit = () => {
        setSortConfig(null);
        fetchRevenue(buildParams(selectedClientCodes, selectedSubCodes), 1);
    };

    const goToPage = (page: number) => fetchRevenue(appliedParams, page);

    const toggleClientCode = (code: string) => {
        setSelectedClientCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const toggleSubCode = (code: string) => {
        setSelectedSubCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    // ── export ───────────────────────────────────────────────────────────────

    const handleExport = async () => {
        setIsExporting(true);
        setExportProgress({ current: 0, total: 0 });
        try {
            const all = await exportRevenue(appliedParams, (current, total) =>
                setExportProgress({ current, total })
            );
            if (all.length === 0) { toast({ variant: "destructive", title: "No Records", description: "No records found to export" }); return; }
            
            const exportRows = all.map((r, idx) => {
                const b = getSegmentDetails(r.brokerage);
                const p = getSegmentDetails(r.payout);
                const inc = getSegmentDetails(r.income);
                return {
                    'S.No.': idx + 1,
                    'UCC': r.ucc,
                    'Name': r.name,
                    'Branch': r.branch,
                    'Parent': r.parent,
                    'Brokerage Total': b.total,
                    'Brokerage NFO': b.nfo,
                    'Brokerage NSE': b.nse,
                    'Brokerage MCX': b.mcx,
                    'Brokerage BSE': b.bse,
                    'Brokerage BFO': b.bfo,
                    'Brokerage NCOM': b.ncom,
                    'Payout Total': p.total,
                    'Payout NFO': p.nfo,
                    'Payout NSE': p.nse,
                    'Payout MCX': p.mcx,
                    'Payout BSE': p.bse,
                    'Payout BFO': p.bfo,
                    'Payout NCOM': p.ncom,
                    'Income Total': inc.total,
                    'Income NFO': inc.nfo,
                    'Income NSE': inc.nse,
                    'Income MCX': inc.mcx,
                    'Income BSE': inc.bse,
                    'Income BFO': inc.bfo,
                    'Income NCOM': inc.ncom,
                };
            });

            exportToExcel(
                exportRows,
                `Revenue_Export_${formatDate(new Date())}`
            );
            toast({ variant: "success", title: "Exported", description: `Exported ${all.length} records successfully` });
        } catch {
            toast({ variant: "destructive", title: "Export Failed", description: "Export failed. Please try again." });
        } finally {
            setIsExporting(false);
            setExportProgress({ current: 0, total: 0 });
        }
    };

    // ── sort ─────────────────────────────────────────────────────────────────

    type RKey = 'sr_no' | 'ucc' | 'name' | 'branch' | 'parent' | 'brokerage' | 'payout' | 'income' | 'nfo' | 'nse' | 'mcx' | 'bse' | 'bfo' | 'ncom' | 'nfo_income' | 'nse_income' | 'mcx_income' | 'bse_income' | 'bfo_income' | 'ncom_income';

    const handleSort = (key: RKey) => {
        setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const sortedData = useMemo(() => {
        if (!revenueData || !sortConfig) return revenueData ?? [];

        if (sortConfig.key === 'sr_no') {
            return sortConfig.direction === 'asc' ? revenueData : [...revenueData].reverse();
        }

        return [...revenueData].sort((a, b) => {
            let av: any = a[sortConfig.key as keyof RevenueItem];
            let bv: any = b[sortConfig.key as keyof RevenueItem];

            if (BROKERAGE_SEGMENT_IDS.includes(sortConfig.key)) {
                av = getSegmentDetails(a.brokerage)[sortConfig.key as keyof Omit<SegmentBreakdown, 'total'>] ?? 0;
                bv = getSegmentDetails(b.brokerage)[sortConfig.key as keyof Omit<SegmentBreakdown, 'total'>] ?? 0;
            } else if (INCOME_SEGMENT_IDS.includes(sortConfig.key)) {
                const rawKey = sortConfig.key.replace('_income', '') as keyof Omit<SegmentBreakdown, 'total'>;
                av = getSegmentDetails(a.income)[rawKey] ?? 0;
                bv = getSegmentDetails(b.income)[rawKey] ?? 0;
            } else if (sortConfig.key === 'brokerage' || sortConfig.key === 'payout' || sortConfig.key === 'income') {
                av = getSegmentValue(av);
                bv = getSegmentValue(bv);
            }

            if (typeof av === 'number' && typeof bv === 'number')
                return sortConfig.direction === 'asc' ? av - bv : bv - av;
            return sortConfig.direction === 'asc'
                ? String(av ?? '').localeCompare(String(bv ?? ''))
                : String(bv ?? '').localeCompare(String(av ?? ''));
        });
    }, [revenueData, sortConfig]);

    const formatCurrency = (v: number) =>
        v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const SortIcon = ({ col }: { col: RKey }) =>
        sortConfig?.key === col
            ? sortConfig.direction === 'asc'
                ? <ChevronUp className="w-4 h-4 text-purple-600" />
                : <ChevronDown className="w-4 h-4 text-purple-600" />
            : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-650 group-hover/col:text-slate-400" />;

    // ── loading overlay ──────────────────────────────────────────────────────

    const LOADING_QUOTES = [
        "Sit back and relax, we're getting things ready for you.",
        "Crunching the numbers, just a moment...",
        "Gathering your revenue data across all accounts...",
        "Almost there! Fetching the latest brokerage figures.",
        "Good things take a little time. Hang tight!",
        "Calculating direct and indirect revenue...",
        "Your data is on its way. Thanks for your patience!",
    ];

    const LoadingOverlay = () => {
        const [quoteIdx, setQuoteIdx] = useState(0);
        const [fade, setFade] = useState(true);

        useEffect(() => {
            const interval = setInterval(() => {
                setFade(false);
                setTimeout(() => {
                    setQuoteIdx(i => (i + 1) % LOADING_QUOTES.length);
                    setFade(true);
                }, 400);
            }, 2200);
            return () => clearInterval(interval);
        }, []);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 dark:bg-slate-950/30 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-6 p-10 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full mx-4">
                    {/* Spinner rings */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                        <span className="absolute inset-0 rounded-full border-4 border-purple-100 dark:border-purple-900/30" />
                        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
                        <span className="absolute inset-2 rounded-full border-4 border-transparent border-t-indigo-400 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                        <IndianRupee className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100">Fetching Revenue Data</p>
                        <p
                            className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed transition-opacity duration-400"
                            style={{ opacity: fade ? 1 : 0 }}
                        >
                            {LOADING_QUOTES[quoteIdx]}
                        </p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                            <span
                                key={i}
                                className="w-2 h-2 rounded-full bg-purple-400 dark:bg-purple-500 animate-bounce"
                                style={{ animationDelay: `${i * 0.18}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ── render ───────────────────────────────────────────────────────────────

    return (
        <div className={cn(
            "p-4 flex flex-col space-y-4",
            scrollWholePage ? "min-h-full" : "h-full overflow-hidden"
        )}>
            {isLoading && <LoadingOverlay />}

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                {([
                    {
                        label: 'Brokerage',
                        total: summary?.brokerageTotal,
                        direct: summary?.brokerageDirect,
                        indirect: summary?.brokerageInDirect,
                        accent: 'border-purple-400',
                        iconBg: 'bg-purple-50 dark:bg-purple-950/30',
                        iconColor: 'text-purple-600 dark:text-purple-400',
                        labelColor: 'text-purple-600 dark:text-purple-400',
                        directColor: 'text-purple-700 dark:text-purple-300',
                        indirectColor: 'text-purple-500 dark:text-purple-400',
                    },
                    {
                        label: 'Payout',
                        total: summary?.payoutTotal,
                        direct: summary?.payoutDirect,
                        indirect: summary?.payoutInDirect,
                        accent: 'border-orange-400',
                        iconBg: 'bg-orange-50 dark:bg-orange-950/30',
                        iconColor: 'text-orange-600 dark:text-orange-400',
                        labelColor: 'text-orange-600 dark:text-orange-400',
                        directColor: 'text-orange-700 dark:text-orange-300',
                        indirectColor: 'text-orange-500 dark:text-orange-400',
                    },
                    {
                        label: 'Income',
                        total: summary?.incomeTotal,
                        direct: summary?.incomeDirect,
                        indirect: summary?.incomeInDirect,
                        accent: 'border-teal-400',
                        iconBg: 'bg-teal-50 dark:bg-teal-950/30',
                        iconColor: 'text-teal-600 dark:text-teal-400',
                        labelColor: 'text-teal-600 dark:text-teal-400',
                        directColor: 'text-teal-700 dark:text-teal-300',
                        indirectColor: 'text-teal-500 dark:text-teal-400',
                    },
                ] as const).map(({ label, total, direct, indirect, accent, iconBg, iconColor, labelColor, directColor, indirectColor }) => {
                    const totalVal = total != null ? getSegmentValue(total) : null;
                    const directVal = direct != null ? getSegmentValue(direct) : null;
                    const indirectVal = indirect != null ? getSegmentValue(indirect) : null;

                    return (
                        <Card key={label} className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-4 ${accent}`}>
                            <div className="p-4">
                                {/* Header — label + total inline */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`p-1.5 ${iconBg} rounded-lg shrink-0`}>
                                            <IndianRupee className={`w-3.5 h-3.5 ${iconColor}`} />
                                        </div>
                                        <span className={`text-xs font-bold ${labelColor} uppercase tracking-widest shrink-0`}>{label}</span>
                                        {isLoading ? (
                                            <Skeleton className="h-5 w-28 ml-1 bg-slate-200 dark:bg-slate-850" />
                                        ) : (
                                            <div className="flex items-center gap-1 min-w-0 ml-1">
                                                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate">
                                                    ₹{totalVal != null ? formatCurrency(totalVal) : '—'}
                                                </span>
                                                <SegmentBreakdownPopover title={`Total ${label}`} data={total} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Direct / Indirect breakdown */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Direct</p>
                                            <SegmentBreakdownPopover title={`Direct ${label}`} data={direct} />
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-850" />
                                        ) : (
                                            <p className={`text-sm font-bold ${directColor} tabular-nums`}>
                                                ₹{directVal != null ? formatCurrency(directVal) : '—'}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Indirect</p>
                                            <SegmentBreakdownPopover title={`Indirect ${label}`} data={indirect} />
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-850" />
                                        ) : (
                                            <p className={`text-sm font-bold ${indirectColor} tabular-nums`}>
                                                ₹{indirectVal != null ? formatCurrency(indirectVal) : '—'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm shrink-0 relative z-20 overflow-x-auto">
                {/* Export — left side */}
                <Button
                    onClick={handleExport}
                    disabled={isExporting || isLoading}
                    variant="outline"
                    className="rounded-xl h-10 px-4 font-semibold gap-2 border-emerald-250 dark:border-emerald-850/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-705 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 transition-all shadow-sm shrink-0"
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

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 shrink-0" />

                <DateRangePicker
                    value={dateRange}
                    onChange={(val) => {
                        if (!val) return;
                        setDateRange(val);
                        setSortConfig(null);
                        fetchRevenue({
                            from: formatDate(val[0]),
                            to: formatDate(val[1]),
                            client_codes: appliedParams.client_codes,
                            sub_codes: appliedParams.sub_codes,
                        }, 1);
                    }}
                    placeholder="Date Range"
                    className="w-[230px] shrink-0 dark:bg-slate-950"
                />

                <MultiSelectCombobox
                    options={clientOptions}
                    selected={selectedClientCodes}
                    onToggle={toggleClientCode}
                    onClear={() => setSelectedClientCodes([])}
                    placeholder="Clients"
                    searchPlaceholder="Search client code..."
                    icon={<Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                />

                <MultiSelectCombobox
                    options={subCodeOptions}
                    selected={selectedSubCodes}
                    onToggle={toggleSubCode}
                    onClear={() => setSelectedSubCodes([])}
                    placeholder="Sub Codes"
                    searchPlaceholder="Search sub code..."
                    icon={<Network className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    showCategoryBadge
                />

                <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="rounded-xl h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2 shrink-0"
                >
                    <Search className="w-4 h-4" />
                    Submit
                </Button>

                {(selectedClientCodes.length > 0 || selectedSubCodes.length > 0) && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSelectedClientCodes([]);
                            setSelectedSubCodes([]);
                            setSortConfig(null);
                            fetchRevenue(buildParams([], []), 1);
                        }}
                        disabled={isLoading}
                        className="rounded-xl h-10 px-4 font-semibold gap-2 border-red-250 dark:border-red-950/50 bg-red-50 dark:bg-red-950/20 text-red-605 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 transition-all shrink-0"
                    >
                        <X className="w-4 h-4" />
                        Clear Filters
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 ml-auto shrink-0">
                            <Columns3 className="w-4 h-4" />
                            Columns
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 p-1 z-50 max-h-[360px] overflow-y-auto">
                        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                            Standard Columns
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {ALL_REVENUE_COLUMNS.filter(c => !ALL_SEGMENT_IDS.includes(c.id)).map((col) => (
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
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                            Brokerage Segments
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {ALL_REVENUE_COLUMNS.filter(c => BROKERAGE_SEGMENT_IDS.includes(c.id)).map((col) => (
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
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                            Income Segments
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            {ALL_REVENUE_COLUMNS.filter(c => INCOME_SEGMENT_IDS.includes(c.id)).map((col) => (
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

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRevenue(appliedParams, currentPage)}
                    disabled={isLoading}
                    className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
                    title="Refresh"
                >
                    <RefreshCcw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>

                <div className="flex items-center gap-2 border-l pl-3 border-slate-200 dark:border-slate-800 shrink-0">
                    <Button
                        variant="outline" size="sm"
                        onClick={() => goToPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || isLoading}
                        className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-205"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200">
                        <span className="text-sm font-bold text-purple-600">{currentPage}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-550 font-bold">/</span>
                        <span className="text-xs text-slate-500 dark:text-slate-405 font-bold">{totalPages || 1}</span>
                    </div>
                    <Button
                        variant="outline" size="sm"
                        onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages || totalPages === 0 || isLoading}
                        className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-205"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Applied filter badges */}
            {(appliedParams.client_codes.length > 0 || appliedParams.sub_codes.length > 0) && (
                <div className="flex flex-wrap gap-2 shrink-0 px-1">
                    {appliedParams.client_codes.map(c => (
                        <Badge key={c} variant="outline" className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30 px-2 py-0.5">
                            Client: {c}
                        </Badge>
                    ))}
                    {appliedParams.sub_codes.map(c => (
                        <Badge key={c} variant="outline" className="text-[11px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30 px-2 py-0.5">
                            Sub: {c}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Table */}
            <Card className={cn(
                "border-none shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col",
                scrollWholePage ? "" : "flex-1 min-h-0 overflow-hidden"
            )}>
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="text-sm table-fixed" style={{ width: '100%', minWidth: totalTableWidth }}>
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-30">
                            <tr className="border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                {columnOrder.filter(colId => colId !== 'income').map((colId, index) => {
                                    if (!columnVisibility[colId]) return null;

                                    const colDef = ALL_REVENUE_COLUMNS.find(c => c.id === colId);
                                    if (!colDef) return null;

                                    const isRight = colDef.align === 'right';
                                    const isBrokerageSeg = BROKERAGE_SEGMENT_IDS.includes(colId);
                                    const isIncomeSeg = INCOME_SEGMENT_IDS.includes(colId);

                                    return (
                                        <th
                                            key={colId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => {
                                                handleDragOver(e);
                                                setDraggedOverIndex(index);
                                            }}
                                            onDragLeave={() => setDraggedOverIndex(null)}
                                            onDragEnd={() => {
                                                setDraggedIndex(null);
                                                setDraggedOverIndex(null);
                                            }}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className={cn(
                                                "py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-grab active:cursor-grabbing select-none group/col relative transition-all duration-150 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 sticky top-0 bg-slate-50 dark:bg-slate-900 z-30",
                                                isRight ? "text-right" : "text-left",
                                                isBrokerageSeg && "text-purple-600 dark:text-purple-400",
                                                isIncomeSeg && "text-teal-600 dark:text-teal-400",
                                                draggedIndex !== null && draggedIndex !== index && draggedOverIndex === index && "bg-purple-50/50 dark:bg-purple-950/10"
                                            )}
                                            onClick={() => handleSort(colId as RKey)}
                                            style={{
                                                width: columnWidths[colId] || colDef.defaultWidth,
                                                minWidth: columnWidths[colId] || colDef.defaultWidth,
                                                maxWidth: columnWidths[colId] || colDef.defaultWidth,
                                            }}
                                        >
                                            <div className={cn("flex items-center gap-2 truncate pr-2", isRight && "justify-end")}>
                                                <span>{colDef.label}</span>
                                                <SortIcon col={colId as RKey} />
                                            </div>
                                            {renderResizeHandle(colId)}
                                            {draggedOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                                                <div className={cn(
                                                    "absolute top-0 bottom-0 w-1 bg-purple-600 z-30 pointer-events-none animate-pulse",
                                                    draggedIndex < index ? "right-0" : "left-0"
                                                )} />
                                            )}
                                        </th>
                                    );
                                })}
                                {/* Spacer Column so table expands to fill container seamlessly */}
                                <th className="p-0 m-0 border-none w-auto sticky top-0 bg-slate-50 dark:bg-slate-900 z-30" style={{ minWidth: 0 }} />
                                {/* Fixed Sticky Income Column on Right */}
                                {columnVisibility.income && (
                                    <th
                                        className="text-right py-4 px-4 font-semibold text-teal-600 dark:text-teal-400 sticky top-0 right-0 bg-slate-50 dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-40 cursor-pointer select-none group/col relative"
                                        onClick={() => handleSort('income')}
                                        style={{
                                            width: columnWidths.income || 160,
                                            minWidth: columnWidths.income || 160,
                                            maxWidth: columnWidths.income || 160,
                                        }}
                                    >
                                        <div className="flex items-center justify-end gap-2 truncate pr-2">
                                            <span>Income</span>
                                            <SortIcon col="income" />
                                        </div>
                                        {renderResizeHandle('income')}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={visibleColumnCount + 1} className="p-4">
                                            <Skeleton className="h-8 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                                        </td>
                                    </tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row, idx) => {
                                    const srNo = (currentPage - 1) * (pageSize || 100) + idx + 1;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/45 transition-colors whitespace-nowrap">
                                            {columnOrder.filter(colId => colId !== 'income').map((colId) => {
                                                if (!columnVisibility[colId]) return null;

                                                const colDef = ALL_REVENUE_COLUMNS.find(c => c.id === colId);
                                                const w = columnWidths[colId] || colDef?.defaultWidth || 150;
                                                const widthStyle = {
                                                    width: w,
                                                    minWidth: w,
                                                    maxWidth: w,
                                                };

                                                if (colId === 'sr_no') {
                                                    return (
                                                        <td key={colId} style={widthStyle} className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                                            {srNo}
                                                        </td>
                                                    );
                                                }

                                            if (colId === 'ucc') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono text-sm truncate">
                                                        {row.ucc}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'name') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-slate-700 dark:text-slate-200 text-sm truncate" title={row.name}>
                                                        {row.name}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'branch') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-slate-650 dark:text-slate-350 text-sm truncate">
                                                        {row.branch}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'parent') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-slate-650 dark:text-slate-350 text-sm font-mono truncate">
                                                        {row.parent}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'brokerage') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-right font-mono font-semibold text-emerald-705 dark:text-emerald-400">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span>₹{formatCurrency(getSegmentValue(row.brokerage))}</span>
                                                            <SegmentBreakdownPopover title={`${row.name || row.ucc} - Brokerage`} data={row.brokerage} />
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            if (BROKERAGE_SEGMENT_IDS.includes(colId)) {
                                                const segVal = (getSegmentDetails(row.brokerage) as any)[colId] ?? 0;
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-200 text-xs truncate">
                                                        ₹{formatCurrency(segVal)}
                                                    </td>
                                                );
                                            }
                                            if (INCOME_SEGMENT_IDS.includes(colId)) {
                                                const rawKey = colId.replace('_income', '');
                                                const segVal = (getSegmentDetails(row.income) as any)[rawKey] ?? 0;
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-right font-mono font-medium text-teal-700 dark:text-teal-300 text-xs truncate">
                                                        ₹{formatCurrency(segVal)}
                                                    </td>
                                                );
                                            }
                                            if (colId === 'payout') {
                                                return (
                                                    <td key={colId} style={widthStyle} className="py-4 px-4 text-right font-mono font-semibold text-orange-605 dark:text-orange-400">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span>₹{formatCurrency(getSegmentValue(row.payout))}</span>
                                                            <SegmentBreakdownPopover title={`${row.name || row.ucc} - Payout`} data={row.payout} />
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return null;
                                        })}
                                        {/* Spacer Column */}
                                        <td className="p-0 m-0 border-none w-auto" style={{ minWidth: 0 }} />
                                        {/* Fixed Sticky Income Cell on Right */}
                                        {columnVisibility.income && (
                                            <td
                                                className="py-4 px-4 text-right font-mono font-semibold text-teal-705 dark:text-teal-400 sticky right-0 bg-white dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800/50 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800"
                                                style={{
                                                    width: columnWidths.income || 160,
                                                    minWidth: columnWidths.income || 160,
                                                    maxWidth: columnWidths.income || 160,
                                                }}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    <span>₹{formatCurrency(getSegmentValue(row.income))}</span>
                                                    <SegmentBreakdownPopover title={`${row.name || row.ucc} - Income`} data={row.income} />
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        ) : (
                                <tr>
                                    <td colSpan={visibleColumnCount + 1} className="h-48 text-center text-slate-400 dark:text-slate-600">
                                        <div className="flex flex-col items-center justify-center">
                                            <IndianRupee className="w-10 h-10 mb-2 opacity-10" />
                                            <p className="text-sm font-medium">No revenue records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </TableWrapper>

                <div className="shrink-0 py-2 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing{' '}
                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                            {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                        </span>
                        {' '}to{' '}
                        <span className="text-slate-900 font-bold">
                            {Math.min(currentPage * pageSize, totalRecords)}
                        </span>
                        {' '}of{' '}
                        <span className="text-slate-900 font-bold">{totalRecords}</span> records
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Revenue;
