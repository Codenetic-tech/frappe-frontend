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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
    Wallet, TrendingUp, TrendingDown, PieChart, BarChart3, Landmark, Monitor, Hexagon,
    Leaf, Zap, Building2, Globe, PackageOpen, AlertCircle, AlertTriangle, RefreshCcw,
    Search, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, Filter,
    Check, ChevronsUpDown, Columns3, ExternalLink, Plus, X, FileDown, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { exportToExcel } from '@/utils/excelExport';
import { FrappeContext } from 'frappe-react-sdk';
import useSWR from 'swr';

export interface HoldingItem {
    name: string; creation: string; modified: string;
    actid: string; upload_prc: string; prod: string; hold_qty: string;
    npoadqty: string; benqty: string; brkhaircut: string; npoadt1qty: string;
    close_prc: string; interop_key: string; interop_exch: string; isin: string;
    usedqty: string; sell_amt: string; trdqty: string;
    nse_tsym: string; bse_tsym: string; nse_exch: string; nse_token: string;
    nse_pp: string; nse_ti: string; nse_ls: string; bse_exch: string;
    bse_token: string; bse_pp: string; bse_ti: string; bse_ls: string;
    dpqty: string; unplgdqty: string; colqty: string; brkcolqty: string;
    hair_cut: string; t1colqty: string; t1hair_cut: string; t1close_prc: string;
    btstqty: string;
    // Backend-computed fields
    actual_closing_price: number;
    invested_amount: number;
    current_value: number;
    mtm: number;
    total_qty: number;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const ITEMS_PER_PAGE = 50;
const CATEGORY_ORDER: Record<string, number> = {
    'ZONE': 1, 'REGION': 2, 'BRANCH': 3, 'RM': 4, 'AP': 5, 'U-AP': 6, 'CLIENT': 7
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

const HOLDINGS_FILTER_FIELDS = [
    { value: 'actid', label: 'Client Code', type: 'string' },
    { value: 'isin', label: 'ISIN', type: 'string' },
    { value: 'nse_tsym', label: 'NSE Symbol', type: 'string' },
    { value: 'bse_tsym', label: 'BSE Symbol', type: 'string' },
    { value: 'prod', label: 'Product', type: 'string' },
    { value: 'interop_key', label: 'Interop Key', type: 'string' },
    { value: 'interop_exch', label: 'Interop Exch', type: 'string' },
    { value: 'upload_prc', label: 'Upload Price', type: 'number' },
    { value: 'close_prc', label: 'Close Price', type: 'number' },
    { value: 'npoadqty', label: 'Net Position Qty', type: 'number' },
    { value: 'hold_qty', label: 'Hold Qty', type: 'number' },
    { value: 'benqty', label: 'Beneficiary Qty', type: 'number' },
    { value: 'usedqty', label: 'Used Qty', type: 'number' },
    { value: 'sell_amt', label: 'Sell Amount', type: 'number' },
    { value: 'trdqty', label: 'Trade Qty', type: 'number' },
] as const;

const STRING_OPERATORS = ['like', '=', '!=', 'not like'] as const;
const NUMBER_OPERATORS = ['=', '!=', '>', '<', '>=', '<='] as const;
const OPERATOR_LABELS: Record<string, string> = {
    '>': 'Greater than', '<': 'Less than', '>=': 'Greater or equal', '<=': 'Less or equal',
    'like': 'Contains', 'not like': 'Does not contain', '=': 'Equals', '!=': 'Does not equal',
};
const getOperatorsForType = (type: string) => {
    switch (type) { case 'number': return [...NUMBER_OPERATORS]; default: return [...STRING_OPERATORS]; }
};
const getFieldType = (fieldValue: string) =>
    HOLDINGS_FILTER_FIELDS.find(f => f.value === fieldValue)?.type ?? 'string';

interface AdvancedFilter { id: string; field: string; operator: string; value: string; }

const TableWrapper = ({ scrollWholePage, children }: { scrollWholePage: boolean; children: React.ReactNode }) => {
    if (scrollWholePage) {
        return (<ScrollArea className="w-full">{children}<ScrollBar orientation="horizontal" /></ScrollArea>);
    }
    return <ScrollArea className="flex-1">{children}</ScrollArea>;
};

const postFetcher = async (payload: { url: string; body: Record<string, any> }) => {
    const response = await fetch(payload.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.body)
    });
    if (!response.ok) {
        let errData;
        try { errData = await response.json(); } catch (e) { errData = { message: response.statusText || 'Fetch failed' }; }
        const error: any = new Error(errData.message || 'Fetch failed');
        error.status = response.status; error.info = errData;
        throw error;
    }
    const data = await response.json();
    return data.message;
};

const enrichStockMetadata = (ticker: string) => {
    const upper = ticker.toUpperCase();
    if (upper.includes('RELIANCE') || upper.includes('ADANI') || upper.includes('POWER') || upper.includes('NTPC') || upper.includes('ONGC')) return { icon: "Zap", sector: "Energy" };
    if (upper.includes('HDFC') || upper.includes('SBI') || upper.includes('BANK') || upper.includes('ICICI') || upper.includes('AXIS') || upper.includes('KOTAK')) return { icon: "Landmark", sector: "Banking" };
    if (upper.includes('TCS') || upper.includes('INFY') || upper.includes('WIPRO') || upper.includes('HCL') || upper.includes('TECHM')) return { icon: "Monitor", sector: "IT" };
    if (upper.includes('ITC') || upper.includes('HINDUNILVR') || upper.includes('NESTLE') || upper.includes('BRITANNIA') || upper.includes('DABUR')) return { icon: "Leaf", sector: "FMCG" };
    if (upper.includes('TATA') || upper.includes('M&M') || upper.includes('MARUTI') || upper.includes('EICHER') || upper.includes('HEROMOTOCO')) return { icon: "Building2", sector: "Auto" };
    if (upper.includes('SUNPHARMA') || upper.includes('DRREDDY') || upper.includes('CIPLA') || upper.includes('DIVISLAB')) return { icon: "Globe", sector: "Pharma" };
    return { icon: "Hexagon", sector: "Others" };
};

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ClientHoldings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { selectedHierarchy } = useFilter();
    const { orgTreeData } = useOrgTree();
    const frappe = useContext(FrappeContext);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('holdingsSearchQuery') || '');
    const [prodFilter, setProdFilter] = useState<string>(() => sessionStorage.getItem('holdingsProdFilter') || 'ALL');
    const [sectorFilter, setSectorFilter] = useState<string>(() => sessionStorage.getItem('holdingsSectorFilter') || 'ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: keyof HoldingItem | 'total_qty' | 'actual_closing_price' | 'invested_amount' | 'current_value' | 'mtm' | 'pnlPercent'; direction: 'asc' | 'desc' } | null>({ key: 'total_qty', direction: 'desc' });
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [scrollWholePage, setScrollWholePage] = useState<boolean>(() => localStorage.getItem("scroll-whole-page") === "true");

    useEffect(() => {
        const handleLayoutChange = () => setScrollWholePage(localStorage.getItem("scroll-whole-page") === "true");
        window.addEventListener("layout-changed", handleLayoutChange);
        return () => window.removeEventListener("layout-changed", handleLayoutChange);
    }, []);

    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
    const [openFilterPanel, setOpenFilterPanel] = useState(false);
    const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
    const [fieldComboOpen, setFieldComboOpen] = useState<Record<string, boolean>>({});

    const handleFilterPanelOpen = (open: boolean) => {
        if (open) {
            setDraftFilters(advancedFilters.length > 0 ? advancedFilters.map(f => ({ ...f })) : [{ id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
        }
        setOpenFilterPanel(open);
    };

    const addDraftFilter = () => setDraftFilters(prev => [...prev, { id: crypto.randomUUID(), field: '', operator: '', value: '' }]);
    const removeDraftFilter = (id: string) => setDraftFilters(prev => prev.filter(f => f.id !== id));
    const updateDraftFilter = (id: string, updates: Partial<AdvancedFilter>) => setDraftFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

    const applyAdvancedFilters = () => {
        const valid = draftFilters.filter(f => {
            if (!f.field || !f.operator) return false;
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
        const stored = localStorage.getItem('holdingsColumnVisibility');
        return stored ? JSON.parse(stored) : {
            symbol: true, isin: true, qty: true, upload_prc: true, close_prc: true,
            actual_closing_price: true, invested_amount: true, current_value: true, mtm: true, gain_loss_pct: true,
            prod: true, interop: false, sector: true, allocation: true,
        };
    });

    useEffect(() => { localStorage.setItem('holdingsColumnVisibility', JSON.stringify(columnVisibility)); }, [columnVisibility]);
    useEffect(() => { sessionStorage.setItem('holdingsSearchQuery', searchQuery); }, [searchQuery]);
    useEffect(() => { sessionStorage.setItem('holdingsProdFilter', prodFilter); }, [prodFilter]);
    useEffect(() => { sessionStorage.setItem('holdingsSectorFilter', sectorFilter); }, [sectorFilter]);

    const visibleColumnCount = useMemo(() => 1 + Object.values(columnVisibility).filter(v => v).length, [columnVisibility]);

    const parentOptions = useMemo(() => {
        const tree = orgTreeData;
        if (!tree) return [];
        return (tree as Array<any>).filter(item => item.is_group === 1).sort((a, b) => {
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
        return new Map((tree as any[]).map(node => {
            const code = node.code || node.org_code || node.name;
            const isRM = node.org_type === 'RM' || node.category === 'RM';
            const displayName = isRM ? `${code} ${node.name1 || ''}`.trim() : code;
            return [node.name, displayName];
        }));
    }, [orgTreeData]);

    const expandBranches = useCallback((selectedNodes: string[]) => {
        if (!orgTreeData || !Array.isArray(orgTreeData)) return selectedNodes;
        const childrenMap = new Map<string, string[]>();
        orgTreeData.forEach(node => {
            const parent = node.parent_crm_heirarchy;
            if (parent) {
                if (!childrenMap.has(parent)) childrenMap.set(parent, []);
                childrenMap.get(parent)!.push(node.name);
            }
        });
        const allCodes = new Set<string>();
        const collectDescendants = (nodeId: string) => {
            allCodes.add(nodeId);
            const children = childrenMap.get(nodeId);
            if (children) children.forEach(collectDescendants);
        };
        selectedNodes.forEach(name => collectDescendants(name));
        return Array.from(allCodes);
    }, [orgTreeData]);

    const getHierarchyCodes = useCallback((names: string[]) => {
        const tree = orgTreeData;
        if (!tree) return names;
        const codeMap = new Map<string, string>();
        tree.forEach((node: any) => { if (node.name) { const code = node.code || node.org_code || node.name; codeMap.set(node.name, code); } });
        return names.map(name => codeMap.get(name) || name);
    }, [orgTreeData]);

    const hierarchyFilters = useMemo(() => {
        const activeFilters: any[] = [];
        const parentFilterList = selectedHierarchy && selectedHierarchy.length > 0 ? expandBranches(selectedHierarchy) : [];
        const combinedCodes = getHierarchyCodes(parentFilterList);
        if (combinedCodes.length > 0) activeFilters.push(['actid', 'in', combinedCodes]);
        return activeFilters;
    }, [selectedHierarchy, expandBranches, getHierarchyCodes]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    const totalFilters = useMemo(() => {
        const activeFilters = [...hierarchyFilters];
        if (debouncedSearchQuery) activeFilters.push(['isin', 'like', `%${debouncedSearchQuery}%`]);
        if (prodFilter !== 'ALL') activeFilters.push(['prod', '=', prodFilter]);
        for (const f of advancedFilters) {
            if (!f.field || !f.operator) continue;
            if (f.value) activeFilters.push([f.field, f.operator, f.value]);
        }
        return activeFilters;
    }, [hierarchyFilters, debouncedSearchQuery, prodFilter, advancedFilters]);

    const filters = useMemo(() => [...totalFilters], [totalFilters]);
    const limit_start = (currentPage - 1) * ITEMS_PER_PAGE;
    const limit = ITEMS_PER_PAGE;

    const orderByObj = useMemo(() => {
        if (!sortConfig) return { field: 'total_qty', order: 'desc' as const };
        return { field: sortConfig.key, order: sortConfig.direction };
    }, [sortConfig]);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    const { data: totalCount = 0, error: totalCountErr, mutate: mutateTotalCount } = useSWR(
        { url: `${API_BASE_URL}/api/method/frappe.client.get_count`, body: { doctype: 'Holdings', filters: totalFilters } },
        postFetcher, { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const { data: holdingsData = [], error: listError, isLoading, mutate: mutateList } = useSWR<any[]>(
        {
            url: `${API_BASE_URL}/api/method/frappe.client.get_list`,
            body: {
                doctype: 'Holdings',
                fields: ['name', 'actid', 'upload_prc', 'close_prc', 'npoadqty', 'hold_qty', 'benqty', 'usedqty', 'sell_amt', 'trdqty', 'prod', 'nse_tsym', 'bse_tsym', 'isin', 'interop_key', 'interop_exch', 'creation', 'modified', 'actual_closing_price', 'invested_amount', 'current_value', 'mtm', 'total_qty'],
                filters, order_by: `${orderByObj.field} ${orderByObj.order}`, limit_start, limit_page_length: limit
            }
        },
        postFetcher, { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    // ── Summary API ───────────────────────────────────────────────────────
    const { data: summaryData, isLoading: isSummaryLoading, mutate: mutateSummary } = useSWR<{
        total_invested_amount: number;
        total_current_value: number;
        total_mtm: number;
        top_gainer: { interop_key: string; gain_pct: number } | null;
        top_loser: { interop_key: string; gain_pct: number } | null;
    }>(
        {
            url: `${API_BASE_URL}/api/method/gopocket.gopocket.doctype.holdings.holdings.get_holdings_summary`,
            body: { filters: JSON.stringify(totalFilters) }
        },
        postFetcher, { revalidateOnFocus: false, revalidateOnReconnect: true }
    );

    const summary = useMemo(() => ({
        totalInvested: summaryData?.total_invested_amount ?? 0,
        totalAUM: summaryData?.total_current_value ?? 0,
        totalMTM: summaryData?.total_mtm ?? 0,
        totalMTMPct: (summaryData?.total_invested_amount ?? 0) > 0
            ? ((summaryData!.total_mtm / summaryData!.total_invested_amount) * 100)
            : 0,
        topGainer: summaryData?.top_gainer ?? null,
        topLoser: summaryData?.top_loser ?? null,
    }), [summaryData]);

    const parsedHoldings = useMemo(() => {
        if (!holdingsData || !Array.isArray(holdingsData)) return [];
        return holdingsData.map((h: any) => {
            const rawTicker = h.nse_tsym || h.bse_tsym || h.isin || h.name || "UNKNOWN";
            const ticker = rawTicker.replace('-EQ', '').replace('-BE', '');
            const stock = ticker.substring(0, 15);
            const meta = enrichStockMetadata(ticker);
            const avgPrice = Math.abs(parseFloat(h.upload_prc || "0"));
            const ltp = parseFloat(h.actual_closing_price || h.close_prc || "0");
            const qty = parseFloat(h.total_qty ?? h.npoadqty ?? "0");
            const invested = parseFloat(h.invested_amount ?? "0");
            const current = parseFloat(h.current_value ?? "0");
            const pnl = parseFloat(h.mtm ?? "0");
            const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
            return { ...h, stock, ticker, icon: meta.icon, sector: meta.sector, qty, avgPrice, ltp, invested, current, pnl, pnlPercent };
        }).filter((h: any) => h.qty > 0 || h.invested > 0);
    }, [holdingsData]);

    const filteredHoldings = useMemo(() => {
        if (sectorFilter === 'ALL') return parsedHoldings;
        return parsedHoldings.filter((h: any) => h.sector === sectorFilter);
    }, [parsedHoldings, sectorFilter]);

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
                const isPermissionError = exception.includes('PermissionError') || exc_type === 'PermissionError' || _server_messages.includes('PermissionError') || _server_messages.includes('Insufficient Permission') || message.includes('PermissionError') || message.includes('Insufficient Permission');
                if (is403 || isPermissionError) {
                    let msg = "Insufficient Permission for Holdings";
                    try {
                        if (_server_messages) {
                            const parsedMsgs = JSON.parse(_server_messages);
                            if (Array.isArray(parsedMsgs) && parsedMsgs[0]?.message) msg = parsedMsgs[0].message.replace(/<[^>]*>/g, '');
                        } else if (message) msg = message;
                    } catch (e) { if (message) msg = message; }
                    setPermissionError(msg);
                    break;
                }
            }
        }
    }, [listError, totalCountErr]);

    useEffect(() => { if (holdingsData && holdingsData.length > 0) sessionStorage.setItem('holdingsData', JSON.stringify(holdingsData)); }, [holdingsData]);

    const error = listError ? (typeof listError === 'string' ? listError : (listError.message || 'An error occurred')) : permissionError;

    const handleSort = (key: keyof HoldingItem | 'total_qty' | 'actual_closing_price' | 'invested_amount' | 'current_value' | 'mtm' | 'pnlPercent') => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig?.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try { await Promise.all([mutateList(), mutateTotalCount(), mutateSummary()]); toast.success('Holdings data refreshed successfully'); }
        finally { setIsRefreshing(false); }
    };

    const handleResetFilters = () => {
        setSearchQuery(''); setProdFilter('ALL'); setSectorFilter('ALL'); setAdvancedFilters([]); setCurrentPage(1);
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
            const headers = { 'Content-Type': 'application/json' };
            while (hasMore) {
                const res = await fetch(`${API_BASE_URL}/api/method/frappe.client.get_list`, {
                    method: 'POST', headers,
                    body: JSON.stringify({
                        doctype: 'Holdings',
                        fields: ['actid', 'upload_prc', 'close_prc', 'npoadqty', 'hold_qty', 'benqty', 'usedqty', 'sell_amt', 'trdqty', 'prod', 'nse_tsym', 'bse_tsym', 'isin', 'interop_key', 'interop_exch', 'actual_closing_price', 'invested_amount', 'current_value', 'mtm', 'total_qty'],
                        filters: totalFilters, limit_start: current_limit_start, limit_page_length
                    })
                }).then(r => { if (!r.ok) throw new Error(`HTTP error ${r.status}`); return r.json(); });
                const data = res.message;
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    setExportProgress({ current: allData.length, total: totalCount });
                    if (data.length < limit_page_length) hasMore = false; else current_limit_start += limit_page_length;
                } else { hasMore = false; }
            }
            if (allData.length > 0) {
                const exportData = allData.map((item: any) => ({
                    'Client Code': item.actid, 'ISIN': item.isin, 'NSE Symbol': item.nse_tsym, 'BSE Symbol': item.bse_tsym,
                    'Product': item.prod, 'Total Qty': item.total_qty, 'Hold Qty': item.hold_qty, 'Beneficiary Qty': item.benqty,
                    'Used Qty': item.usedqty, 'Upload Price': item.upload_prc, 'Actual Closing Price': item.actual_closing_price, 'Close Price': item.close_prc,
                    'Invested Amount': item.invested_amount, 'Current Value': item.current_value, 'MTM': item.mtm,
                    'Gain/Loss %': item.invested_amount > 0 ? ((item.mtm / item.invested_amount) * 100).toFixed(2) + '%' : '0.00%',
                    'Sell Amount': item.sell_amt, 'Trade Qty': item.trdqty, 'Interop Key': item.interop_key, 'Interop Exch': item.interop_exch,
                }));
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                exportToExcel(exportData, `Holdings_Export_${todayStr}`);
                toast.success('Excel export completed successfully');
            } else { toast.error('No records found to export'); }
        } catch (err) { console.error('Export failed:', err); toast.error('Export failed. Please try again.'); }
        finally { setIsExporting(false); }
    };

    useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, prodFilter, sectorFilter, advancedFilters]);

    const sortedData = useMemo(() => {
        if (!filteredHoldings) return [];
        const result = [...filteredHoldings];
        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const numericKeys = ['total_qty', 'actual_closing_price', 'invested_amount', 'current_value', 'mtm', 'pnlPercent'];
                let aValue: any = a[sortConfig.key];
                let bValue: any = b[sortConfig.key];
                if (numericKeys.includes(sortConfig.key as string)) {
                    aValue = parseFloat(aValue ?? 0);
                    bValue = parseFloat(bValue ?? 0);
                } else {
                    aValue = (aValue || '').toString();
                    bValue = (bValue || '').toString();
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [filteredHoldings, sortConfig]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const formatValue = (value: string | null) => value || '-';

    const renderIcon = (iconName: string) => {
        const iconClass = "h-4 w-4";
        switch (iconName) {
            case 'Zap': return <Zap className={iconClass} />;
            case 'Landmark': return <Landmark className={iconClass} />;
            case 'Monitor': return <Monitor className={iconClass} />;
            case 'Hexagon': return <Hexagon className={iconClass} />;
            case 'Leaf': return <Leaf className={iconClass} />;
            case 'Building2': return <Building2 className={iconClass} />;
            case 'Globe': return <Globe className={iconClass} />;
            default: return <Hexagon className={iconClass} />;
        }
    };

    const sectorColors: Record<string, string> = {
        Energy: "bg-amber-500", Banking: "bg-blue-500", IT: "bg-purple-500", FMCG: "bg-green-500",
        Auto: "bg-red-500", Pharma: "bg-cyan-500", Others: "bg-slate-500",
    };

    return (
        <div className={cn("p-4 flex flex-col space-y-6", scrollWholePage ? "min-h-full" : "h-full overflow-hidden")}>
            <div className="shrink-0 space-y-4">
                {/* Summary Grid - 5 Cards from backend API */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {/* Invested Amount */}
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Invested Amt</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                        </div>
                        <div className="space-y-0.5">
                            {isSummaryLoading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{fmt(summary.totalInvested).split('.')[0]}<span className="text-lg">.{fmt(summary.totalInvested).split('.')[1]}</span></p>}
                        </div>
                    </Card>

                    {/* Current Value */}
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Current Value</span>
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg"><Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                        </div>
                        <div className="space-y-0.5">
                            {isSummaryLoading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">₹{fmt(summary.totalAUM).split('.')[0]}<span className="text-lg">.{fmt(summary.totalAUM).split('.')[1]}</span></p>}
                        </div>
                    </Card>

                    {/* MTM / Total P&L */}
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className={cn("absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity", summary.totalMTM >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600")}></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-[12px] font-bold uppercase tracking-wider", summary.totalMTM >= 0 ? "text-green-600 dark:text-green-405" : "text-red-600 dark:text-red-405")}>Total MTM ({summary.totalMTMPct >= 0 ? "+" : ""}{summary.totalMTMPct.toFixed(2)}%)</span>
                            <div className={cn("p-2 rounded-lg", summary.totalMTM >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20")}>
                                {summary.totalMTM >= 0 ? <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            {isSummaryLoading ? <Skeleton className="h-8 w-24 mb-1" /> : (
                                <p className={cn("text-2xl font-bold", summary.totalMTM >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>{summary.totalMTM >= 0 ? "+" : ""}₹{fmt(Math.abs(summary.totalMTM))}</p>
                            )}
                        </div>
                    </Card>

                    {/* Top Gainer */}
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-green-600 dark:text-green-405 uppercase tracking-wider">Top Gainer {summary.topGainer ? `(${summary.topGainer.gain_pct.toFixed(2)}%)` : ''}</span>
                            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" /></div>
                        </div>
                        <div className="space-y-0.5">
                            {isSummaryLoading ? <Skeleton className="h-8 w-20 mb-1" /> : summary.topGainer ? (
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{summary.topGainer.interop_key || '—'}</p>
                            ) : <p className="text-sm text-slate-400 dark:text-slate-500">No data</p>}
                        </div>
                    </Card>

                    {/* Top Loser */}
                    <Card className="p-4 border-border shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-bold text-red-600 dark:text-red-405 uppercase tracking-wider">Top Loser {summary.topLoser ? `(${summary.topLoser.gain_pct.toFixed(2)}%)` : ''}</span>
                            <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
                        </div>
                        <div className="space-y-0.5">
                            {isSummaryLoading ? <Skeleton className="h-8 w-20 mb-1" /> : summary.topLoser ? (
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{summary.topLoser.interop_key || '—'}</p>
                            ) : <p className="text-sm text-slate-400 dark:text-slate-500">No data</p>}
                        </div>
                    </Card>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl backdrop-blur-sm relative z-20">
                    <Popover open={openFilterPanel} onOpenChange={handleFilterPanelOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 gap-2">
                                <Filter className="w-4 h-4 text-slate-500" />
                                {advancedFilters.length > 0 && <span className="bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">{advancedFilters.length}</span>}
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
                                        <Popover open={fieldComboOpen[filter.id] ?? false} onOpenChange={(open) => setFieldComboOpen(prev => ({ ...prev, [filter.id]: open }))}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-[150px] justify-between h-8 text-xs font-normal border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0">
                                                    <span className="truncate">{filter.field ? HOLDINGS_FILTER_FIELDS.find(f => f.value === filter.field)?.label : 'Select field...'}</span>
                                                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[170px] p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl z-[60]" side="bottom" align="start">
                                                <Command className="bg-white dark:bg-slate-900">
                                                    <CommandInput placeholder="Search field..." className="h-8 text-xs text-foreground bg-transparent" />
                                                    <CommandList>
                                                        <CommandEmpty className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">No field found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {HOLDINGS_FILTER_FIELDS.map((field) => (
                                                                <CommandItem key={field.value} value={field.label} onSelect={() => { const defaultOp = getOperatorsForType(field.type)[0]; updateDraftFilter(filter.id, { field: field.value, operator: defaultOp, value: '' }); setFieldComboOpen(prev => ({ ...prev, [filter.id]: false })); }} className="text-xs focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                                                                    <Check className={cn('mr-2 h-3 w-3', filter.field === field.value ? 'opacity-100' : 'opacity-0')} />{field.label}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {filter.field && (
                                            <Select value={filter.operator} onValueChange={(val) => updateDraftFilter(filter.id, { operator: val, value: '' })}>
                                                <SelectTrigger className="h-8 text-xs w-[95px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shrink-0"><SelectValue placeholder="Operator" /></SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xl">
                                                    {getOperatorsForType(getFieldType(filter.field)).map((op: string) => <SelectItem key={op} value={op} className="text-xs">{OPERATOR_LABELS[op] ?? op}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {filter.field && filter.operator && (
                                            <Input type={getFieldType(filter.field) === 'number' ? 'number' : 'text'} placeholder="Value" value={filter.value} onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })} className="flex-1 h-8 text-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg" />
                                        )}
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-500 hover:text-red-500 shrink-0" onClick={() => removeDraftFilter(filter.id)}><X className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button type="button" variant="outline" size="sm" onClick={addDraftFilter} className="h-8 text-xs gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"><Plus className="w-3.5 h-3.5" /> Add Condition</Button>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={clearAdvancedFilters} className="h-8 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Clear All</Button>
                                    <Button type="button" size="sm" onClick={applyAdvancedFilters} className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold">Apply Filters</Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-[180px]">
                        <Select value={prodFilter} onValueChange={setProdFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2"><Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /><SelectValue placeholder="Product" /></div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Products</SelectItem>
                                <SelectItem value="CNC">CNC (Delivery)</SelectItem>
                                <SelectItem value="MIS">MIS (Intraday)</SelectItem>
                                <SelectItem value="NRML">NRML (Carry Forward)</SelectItem>
                                <SelectItem value="CO">CO (Cover Order)</SelectItem>
                                <SelectItem value="BO">BO (Bracket Order)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[180px]">
                        <Select value={sectorFilter} onValueChange={setSectorFilter}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 focus:ring-purple-500 rounded-xl h-10">
                                <div className="flex items-center gap-2"><PieChart className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /><SelectValue placeholder="Sector" /></div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xl">
                                <SelectItem value="ALL">All Sectors</SelectItem>
                                <SelectItem value="Energy">Energy</SelectItem>
                                <SelectItem value="Banking">Banking</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                                <SelectItem value="FMCG">FMCG</SelectItem>
                                <SelectItem value="Auto">Auto</SelectItem>
                                <SelectItem value="Pharma">Pharma</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <Input placeholder="Search ISIN or Symbol" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:ring-purple-500 rounded-xl h-10" />
                    </div>

                    <Button onClick={handleRefresh} disabled={isRefreshing || isLoading || isExporting} variant="outline" className="rounded-xl px-4 font-semibold gap-2 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <RefreshCcw className={cn("w-4 h-4", (isRefreshing || isLoading) && "animate-spin")} />
                    </Button>

                    {(user?.user_code === 'HO' || user?.user_code === 'DRCT' || user?.user_code === 'Business') && (
                        <Button onClick={handleExport} disabled={isExporting || isLoading || isRefreshing} variant="outline" className="rounded-xl px-4 font-semibold gap-2 h-10 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 transition-all shadow-sm">
                            {isExporting ? (
                                <><RefreshCcw className="w-4 h-4 animate-spin" /><span className="text-[10px] font-bold">{exportProgress.total > 0 ? `${exportProgress.current}/${exportProgress.total}` : 'Exporting...'}</span></>
                            ) : (
                                <><FileDown className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Export</span></>
                            )}
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2"><Columns3 className="w-4 h-4" />Columns<ChevronDown className="w-3.5 h-3.5 opacity-50" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            <DropdownMenuGroup>
                                {[
                                    { id: 'symbol', label: 'Symbol' }, { id: 'isin', label: 'ISIN' }, { id: 'qty', label: 'Total Qty' },
                                    { id: 'upload_prc', label: 'Upload Price' }, { id: 'close_prc', label: 'Close Price' },
                                    { id: 'actual_closing_price', label: 'Actual Close Price' },
                                    { id: 'invested_amount', label: 'Invested Amount' }, { id: 'current_value', label: 'Current Value' },
                                    { id: 'mtm', label: 'MTM' },
                                    { id: 'gain_loss_pct', label: 'Gain/Loss %' },
                                    { id: 'prod', label: 'Product' }, { id: 'interop', label: 'Interop' },
                                    { id: 'sector', label: 'Sector' }, { id: 'allocation', label: 'Allocation' },
                                ].map((col) => (
                                    <DropdownMenuCheckboxItem key={col.id} className="capitalize cursor-pointer" checked={columnVisibility[col.id]} onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, [col.id]: checked }))}>{col.label}</DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {(searchQuery || prodFilter !== 'ALL' || sectorFilter !== 'ALL' || advancedFilters.length > 0) && (
                        <Button type="button" variant="ghost" onClick={handleResetFilters} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">Reset</Button>
                    )}

                    <div className="flex items-center gap-2 ml-auto border-l pl-3 border-slate-200 dark:border-slate-800">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isLoading} className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1.5 px-3 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-foreground">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentPage}</span>
                            <span className="text-xs text-slate-400 font-bold">/</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{totalPages || 1}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0 || isLoading} className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="w-3.5 h-3.5" />{error}
                </div>
            )}

            <Card className={cn("border-none shadow-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col", scrollWholePage ? "" : "flex-1 min-h-0 overflow-hidden")}>
                <TableWrapper scrollWholePage={scrollWholePage}>
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('actid')}>
                                    <div className="flex items-center gap-2">Client Code{sortConfig?.key === 'actid' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                </th>
                                {columnVisibility.symbol && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('nse_tsym')}>
                                        <div className="flex items-center gap-2">Symbol{sortConfig?.key === 'nse_tsym' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.isin && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('isin')}>
                                        <div className="flex items-center gap-2">ISIN{sortConfig?.key === 'isin' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.qty && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('total_qty')}>
                                        <div className="flex items-center justify-end gap-2">Total Qty{sortConfig?.key === 'total_qty' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.upload_prc && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('upload_prc')}>
                                        <div className="flex items-center justify-end gap-2">Buy Price{sortConfig?.key === 'upload_prc' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.close_prc && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('close_prc')}>
                                        <div className="flex items-center justify-end gap-2">Close Price{sortConfig?.key === 'close_prc' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.actual_closing_price && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('actual_closing_price')}>
                                        <div className="flex items-center justify-end gap-2">Actual Close{sortConfig?.key === 'actual_closing_price' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.invested_amount && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('invested_amount')}>
                                        <div className="flex items-center justify-end gap-2">Invested Amt{sortConfig?.key === 'invested_amount' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.current_value && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('current_value')}>
                                        <div className="flex items-center justify-end gap-2">Current Value{sortConfig?.key === 'current_value' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.mtm && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('mtm')}>
                                        <div className="flex items-center justify-end gap-2">MTM{sortConfig?.key === 'mtm' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.gain_loss_pct && (
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('pnlPercent')}>
                                        <div className="flex items-center justify-end gap-2">Gain/Loss %{sortConfig?.key === 'pnlPercent' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.prod && (
                                    <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none group/col" onClick={() => handleSort('prod')}>
                                        <div className="flex items-center justify-center gap-2">Product{sortConfig?.key === 'prod' ? (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover/col:text-slate-400" />}</div>
                                    </th>
                                )}
                                {columnVisibility.interop && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Interop</th>
                                )}
                                {columnVisibility.sector && (
                                    <th className="text-center py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Sector</th>
                                )}
                                {columnVisibility.allocation && (
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">Allocation</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}><td colSpan={visibleColumnCount} className="p-4"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                                ))
                            ) : sortedData.length > 0 ? (
                                sortedData.map((row: any, index: number) => {
                                    const alloc = summary.totalAUM > 0 ? ((row.current / summary.totalAUM) * 100).toFixed(1) : "0";
                                    return (
                                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                                            <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                                <button onClick={() => navigate(`/clients/${row.actid}`)} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left focus:outline-none bg-transparent">{formatValue(row.actid)}</button>
                                            </td>
                                            {columnVisibility.symbol && (
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 bg-black dark:bg-slate-800 rounded-full flex items-center justify-center text-white dark:text-slate-200 text-sm shrink-0">{renderIcon(row.icon)}</div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate">{row.stock}</p>
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{row.ticker}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            {columnVisibility.isin && <td className="py-4 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{formatValue(row.isin)}</td>}
                                            {columnVisibility.qty && <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">{fmt(parseFloat(row.total_qty ?? 0))}</td>}
                                            {columnVisibility.upload_prc && <td className="py-4 px-4 text-right text-slate-500 dark:text-slate-400">₹{fmt(row.avgPrice)}</td>}
                                            {columnVisibility.close_prc && <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100 font-medium">₹{fmt(parseFloat(row.close_prc ?? 0))}</td>}
                                            {columnVisibility.actual_closing_price && <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100 font-medium">₹{fmt(parseFloat(row.actual_closing_price ?? 0))}</td>}
                                            {columnVisibility.invested_amount && <td className="py-4 px-4 text-right text-slate-500 dark:text-slate-400">₹{fmt(parseFloat(row.invested_amount ?? 0))}</td>}
                                            {columnVisibility.current_value && <td className="py-4 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">₹{fmt(parseFloat(row.current_value ?? 0))}</td>}
                                            {columnVisibility.mtm && (
                                                <td className="py-4 px-4 text-right">
                                                    <p className={cn("text-sm font-semibold", parseFloat(row.mtm ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                                        {parseFloat(row.mtm ?? 0) >= 0 ? "+" : ""}₹{fmt(Math.abs(parseFloat(row.mtm ?? 0)))}
                                                    </p>
                                                </td>
                                            )}
                                            {columnVisibility.gain_loss_pct && (
                                                <td className="py-4 px-4 text-right">
                                                    <Badge className={cn("font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]", row.pnlPercent >= 0 ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400")}>
                                                        {row.pnlPercent >= 0 ? "+" : ""}{row.pnlPercent.toFixed(2)}%
                                                    </Badge>
                                                </td>
                                            )}
                                            {columnVisibility.prod && (
                                                <td className="py-4 px-4 text-center">
                                                    <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px]">{row.prod || '-'}</Badge>
                                                </td>
                                            )}
                                            {columnVisibility.interop && (
                                                <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-xs">
                                                    <div>{formatValue(row.interop_key)}</div>
                                                    <div className="text-slate-400 dark:text-slate-550">{formatValue(row.interop_exch)}</div>
                                                </td>
                                            )}
                                            {columnVisibility.sector && (
                                                <td className="py-4 px-4 text-center">
                                                    <Badge className={cn("capitalize font-bold px-2.5 py-0.5 rounded-full border-none text-[10px] text-white", sectorColors[row.sector] || "bg-slate-500")}>{row.sector}</Badge>
                                                </td>
                                            )}
                                            {columnVisibility.allocation && (
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={cn("h-full rounded-full", sectorColors[row.sector] || "bg-slate-500")} style={{ width: `${alloc}%` }} />
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{alloc}%</span>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            ) : !isLoading && (
                                <tr><td colSpan={visibleColumnCount} className="h-48 text-center text-slate-400 dark:text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <PackageOpen className="w-10 h-10 mb-2 opacity-10" />
                                        <p className="text-sm font-medium">No holdings found matching your filters</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </TableWrapper>

                <div className="shrink-0 py-2 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{totalCount}</span> holdings
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default ClientHoldings;
