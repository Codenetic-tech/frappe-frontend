import React, { useMemo, useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
  LineChart,
  RefreshCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Columns3,
  FileDown,
  Zap,
  Landmark,
  Monitor,
  Hexagon,
  Leaf,
  Building2,
  Globe,
  Radio,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToExcel } from '@/utils/excelExport';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';
import { useKambalaFeed, TickData } from '@/hooks/useKambalaFeed';

export interface RawOrder {
  norenordno?: string;
  uid?: string;
  actid?: string;
  token?: string;
  qty?: number | string;
  fillshares?: number | string;
  ls?: number | string;
  prc?: number | string;
  flqty?: number | string;
  flprc?: number | string;
  status?: string;
  exch?: string;
  tsym?: string;
  symbol?: string;
  trantype?: string;
  pcode?: string;
  avgprc?: number | string;
  parent1?: string;
}

export interface PositionGroup {
  actid: string;
  symbol: string;
  tsym: string;
  exch: string;
  token: string;
  tokenKey: string; // EXCH|TOKEN
  pcode: string;
  buyQty: number;
  buyValue: number;
  sellQty: number;
  sellValue: number;
  buyAvg: number;
  sellAvg: number;
  netQty: number;
  avgPrice: number;
  lastClosePrice: number;
  clientCount: number;
  clients: string[];
  actids: string[];
  orderCount: number;
  realizedPnl: number;
  lotSize: number;
}

// Helper to map single letter Kambala/Shoonya product codes to standard labels (M -> NRML, I -> MIS, C -> CNC)
export const formatProductCode = (pcode?: string): string => {
  if (!pcode) return 'NRML';
  const upper = pcode.trim().toUpperCase();
  if (upper === 'M' || upper === 'NRML' || upper === 'MARGIN') return 'NRML';
  if (upper === 'I' || upper === 'MIS' || upper === 'INTRADAY') return 'MIS';
  if (upper === 'C' || upper === 'CNC' || upper === 'CASH') return 'CNC';
  if (upper === 'B' || upper === 'BO') return 'BO';
  if (upper === 'H' || upper === 'CO') return 'CO';
  return upper;
};

// Initial fallback position dataset with separate account IDs for local preview
const DEFAULT_COLUMN_ORDER: string[] = [
  'actid',
  'symbol',
  'exch',
  'pcode',
  'buyQty',
  'buyAvg',
  'sellQty',
  'sellAvg',
  'netQty',
  'ltp',
  'investedValue',
  'currentValue',
  'liveMtm',
  'mtmPercent',
  'dayChange',
  'orderCount',
];

const SAMPLE_POSITIONS: PositionGroup[] = [
  { actid: "AD6474", symbol: "NIFTY18AUG26C24400", tsym: "NIFTY18AUG26C24400", exch: "NFO", token: "45106", tokenKey: "NFO|45106", pcode: "NRML", buyQty: 65, buyValue: 6711.25, sellQty: 0, sellValue: 0, buyAvg: 103.25, sellAvg: 0, netQty: 65, avgPrice: 103.25, lastClosePrice: 109.85, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 1, realizedPnl: 0, lotSize: 65 },
  { actid: "AD6474", symbol: "NIFTY18AUG26C24600", tsym: "NIFTY18AUG26C24600", exch: "NFO", token: "45116", tokenKey: "NFO|45116", pcode: "NRML", buyQty: 195, buyValue: 12808.25, sellQty: 195, sellValue: 10933.00, buyAvg: 65.68, sellAvg: 56.06, netQty: 0, avgPrice: 65.68, lastClosePrice: 42.40, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 6, realizedPnl: -1875.25, lotSize: 65 },
  { actid: "AD6474", symbol: "NIFTY18AUG26C24800", tsym: "NIFTY18AUG26C24800", exch: "NFO", token: "45140", tokenKey: "NFO|45140", pcode: "NRML", buyQty: 65, buyValue: 962.00, sellQty: 65, sellValue: 861.25, buyAvg: 14.80, sellAvg: 13.25, netQty: 0, avgPrice: 14.80, lastClosePrice: 13.95, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 2, realizedPnl: -100.75, lotSize: 65 },
  { actid: "CL1024", symbol: "RELIANCE", tsym: "RELIANCE", exch: "NSE", token: "13", tokenKey: "NSE|13", pcode: "CNC", buyQty: 50, buyValue: 124265, sellQty: 10, sellValue: 26124, buyAvg: 2485.30, sellAvg: 2612.40, netQty: 40, avgPrice: 2453.52, lastClosePrice: 2485.30, clientCount: 1, clients: ["CL1024"], actids: ["CL1024"], orderCount: 6, realizedPnl: 1589.20, lotSize: 1 },
  { actid: "CL1001", symbol: "NIFTY 50", tsym: "NIFTY 50", exch: "NSE", token: "26000", tokenKey: "NSE|26000", pcode: "NRML", buyQty: 150, buyValue: 3678000, sellQty: 75, sellValue: 1845000, buyAvg: 24520.00, sellAvg: 24600.00, netQty: 75, avgPrice: 24440.00, lastClosePrice: 24510.00, clientCount: 1, clients: ["CL1001"], actids: ["CL1001"], orderCount: 12, realizedPnl: 6000.00, lotSize: 65 },
  { actid: "CL4012", symbol: "BANK NIFTY", tsym: "BANK NIFTY", exch: "NSE", token: "26001", tokenKey: "NSE|26001", pcode: "MIS", buyQty: 30, buyValue: 1560000, sellQty: 30, sellValue: 1572000, buyAvg: 52000.00, sellAvg: 52400.00, netQty: 0, avgPrice: 52000.00, lastClosePrice: 52400.00, clientCount: 1, clients: ["CL4012"], actids: ["CL4012"], orderCount: 5, realizedPnl: 12000.00, lotSize: 15 },
  { actid: "CL2080", symbol: "TCS", tsym: "TCS", exch: "NSE", token: "11536", tokenKey: "NSE|11536", pcode: "CNC", buyQty: 25, buyValue: 97875, sellQty: 0, sellValue: 0, buyAvg: 3915.00, sellAvg: 0, netQty: 25, avgPrice: 3915.00, lastClosePrice: 3920.00, clientCount: 1, clients: ["CL2080"], actids: ["CL2080"], orderCount: 3, realizedPnl: 0, lotSize: 1 },
  { actid: "CL1044", symbol: "SBIN", tsym: "SBIN", exch: "NSE", token: "3045", tokenKey: "NSE|3045", pcode: "CNC", buyQty: 200, buyValue: 165600, sellQty: 50, sellValue: 42250, buyAvg: 828.00, sellAvg: 845.00, netQty: 150, avgPrice: 822.33, lastClosePrice: 835.50, clientCount: 1, clients: ["CL1044"], actids: ["CL1044"], orderCount: 8, realizedPnl: 1133.50, lotSize: 1 },
  { actid: "CL3001", symbol: "INFY", tsym: "INFY", exch: "NSE", token: "1594", tokenKey: "NSE|1594", pcode: "CNC", buyQty: 80, buyValue: 148000, sellQty: 20, sellValue: 37500, buyAvg: 1850.00, sellAvg: 1875.00, netQty: 60, avgPrice: 1850.00, lastClosePrice: 1875.20, clientCount: 1, clients: ["CL3001"], actids: ["CL3001"], orderCount: 4, realizedPnl: 500.00, lotSize: 1 },
  { actid: "CL1002", symbol: "HDFCBANK", tsym: "HDFCBANK", exch: "NSE", token: "1333", tokenKey: "NSE|1333", pcode: "CNC", buyQty: 100, buyValue: 162000, sellQty: 0, sellValue: 0, buyAvg: 1620.00, sellAvg: 0, netQty: 100, avgPrice: 1620.00, lastClosePrice: 1645.00, clientCount: 1, clients: ["CL1002"], actids: ["CL1002"], orderCount: 7, realizedPnl: 0, lotSize: 1 },
  { actid: "CL2010", symbol: "ICICIBANK", tsym: "ICICIBANK", exch: "NSE", token: "4963", tokenKey: "NSE|4963", pcode: "MIS", buyQty: 60, buyValue: 70800, sellQty: 60, sellValue: 71400, buyAvg: 1180.00, sellAvg: 1190.00, netQty: 0, avgPrice: 1180.00, lastClosePrice: 1190.00, clientCount: 1, clients: ["CL2010"], actids: ["CL2010"], orderCount: 3, realizedPnl: 600.00, lotSize: 1 },
  { actid: "CL1020", symbol: "AXISBANK", tsym: "AXISBANK", exch: "NSE", token: "5900", tokenKey: "NSE|5900", pcode: "NRML", buyQty: 40, buyValue: 46800, sellQty: 10, sellValue: 11800, buyAvg: 1170.00, sellAvg: 1180.00, netQty: 30, avgPrice: 1170.00, lastClosePrice: 1182.50, clientCount: 1, clients: ["CL1020"], actids: ["CL1020"], orderCount: 2, realizedPnl: 100.00, lotSize: 1 }
];

const ITEMS_PER_PAGE = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const enrichStockMetadata = (symbol: string) => {
  const upper = symbol.toUpperCase();
  if (upper.includes('RELIANCE') || upper.includes('ADANI') || upper.includes('POWER') || upper.includes('NTPC') || upper.includes('ONGC')) return { icon: "Zap" };
  if (upper.includes('HDFC') || upper.includes('SBI') || upper.includes('BANK') || upper.includes('ICICI') || upper.includes('AXIS') || upper.includes('KOTAK') || upper.includes('BAJFINANCE')) return { icon: "Landmark" };
  if (upper.includes('TCS') || upper.includes('INFY') || upper.includes('WIPRO') || upper.includes('HCL')) return { icon: "Monitor" };
  if (upper.includes('ITC') || upper.includes('HINDUNILVR') || upper.includes('NESTLE')) return { icon: "Leaf" };
  if (upper.includes('TATA') || upper.includes('M&M') || upper.includes('MARUTI') || upper.includes('LT')) return { icon: "Building2" };
  if (upper.includes('SUNPHARMA') || upper.includes('DRREDDY') || upper.includes('CIPLA')) return { icon: "Globe" };
  return { icon: "Hexagon" };
};

const postFetcher = async (payload: { url: string; body: Record<string, any> }) => {
  const response = await fetch(payload.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.body)
  });
  if (!response.ok) {
    let errData;
    try { errData = await response.json(); } catch (e) { errData = { message: response.statusText || 'Fetch failed' }; }
    const error: any = new Error(errData.message || 'Fetch failed');
    error.status = response.status;
    error.info = errData;
    throw error;
  }
  const data = await response.json();
  return data.message;
};

interface LTPCellProps {
  price: number;
}

const LTPCell: React.FC<LTPCellProps> = ({ price }) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number>(price);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevPriceRef.current !== price) {
      if (price > prevPriceRef.current) {
        setFlash('up');
      } else if (price < prevPriceRef.current) {
        setFlash('down');
      }
      prevPriceRef.current = price;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setFlash(null);
      }, 1000);
    }
  }, [price]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <td className="py-3.5 px-4 text-center">
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "w-[115px] inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold font-mono transition-all duration-300 border",
            flash === 'up' && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/25 shadow-sm scale-105",
            flash === 'down' && "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/25 shadow-sm scale-105",
            !flash && "bg-transparent text-slate-900 dark:text-slate-100 border-transparent"
          )}
        >
          ₹{fmt(price)}
        </span>
      </div>
    </td>
  );
};

const LivePositions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('ordersSearchQuery') || '');

  useEffect(() => {
    sessionStorage.setItem('ordersSearchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleSync = () => {
      const stored = sessionStorage.getItem('ordersSearchQuery');
      if (stored !== null) {
        setSearchQuery(stored);
      }
    };
    window.addEventListener('focus', handleSync);
    return () => window.removeEventListener('focus', handleSync);
  }, []);

  const [exchangeFilter, setExchangeFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'netQty', direction: 'desc' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLotsView, setIsLotsView] = useState<boolean>(() => {
    return localStorage.getItem('positionsIsLotsView') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('positionsIsLotsView', String(isLotsView));
  }, [isLotsView]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('positionsColumnOrder');
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored);
        let order = [...parsed];
        DEFAULT_COLUMN_ORDER.forEach(col => {
          if (!order.includes(col)) {
            order.push(col);
          }
        });
        return order;
      } catch (e) {
        return DEFAULT_COLUMN_ORDER;
      }
    }
    return DEFAULT_COLUMN_ORDER;
  });

  useEffect(() => {
    localStorage.setItem('positionsColumnOrder', JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

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
      localStorage.setItem('positionsColumnOrder', JSON.stringify(next));
      return next;
    });
  };

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('positionsColumnVisibility');
    const defaults = {
      actid: true,
      symbol: true,
      exch: true,
      pcode: true,
      buyQty: true,
      buyAvg: true,
      sellQty: true,
      sellAvg: true,
      netQty: true,
      ltp: true,
      investedValue: true,
      currentValue: true,
      liveMtm: true,
      mtmPercent: true,
      dayChange: true,
      orderCount: true,
    };
    if (stored) {
      try { return { ...defaults, ...JSON.parse(stored) }; } catch (e) { return defaults; }
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('positionsColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Construct SERVER-SIDE filters for Sky Order Feed doctype
  const { serverFilters, serverOrFilters } = useMemo(() => {
    const filters: any[] = [];
    const orFilters: any[] = [];

    // Filter server-side by search query (actid, uid, tsym, client_name)
    if (debouncedSearch && debouncedSearch.trim()) {
      const term = debouncedSearch.trim();
      const q = `%${term}%`;

      orFilters.push(['actid', 'like', q]);
      orFilters.push(['uid', 'like', q]);
      orFilters.push(['tsym', 'like', q]);
      orFilters.push(['client_name', 'like', q]);
    }

    if (exchangeFilter !== 'ALL') {
      filters.push(['exch', '=', exchangeFilter]);
    }
    if (productFilter !== 'ALL') {
      if (productFilter === 'NRML') {
        filters.push(['pcode', 'in', ['M', 'NRML', 'MARGIN']]);
      } else if (productFilter === 'MIS') {
        filters.push(['pcode', 'in', ['I', 'MIS', 'INTRADAY']]);
      } else if (productFilter === 'CNC') {
        filters.push(['pcode', 'in', ['C', 'CNC', 'CASH']]);
      } else {
        filters.push(['pcode', '=', productFilter]);
      }
    }

    return { serverFilters: filters, serverOrFilters: orFilters };
  }, [debouncedSearch, exchangeFilter, productFilter]);

  // Fetch raw orders from Sky Order Feed doctype with SERVER-SIDE filters
  const { data: rawOrders, isLoading, mutate, error } = useSWR<RawOrder[]>(
    {
      url: `${API_BASE_URL}/api/method/frappe.client.get_list`,
      body: {
        doctype: 'Sky Order Feed',
        fields: ['norenordno', 'uid', 'actid', 'token', 'qty', 'fillshares', 'ls', 'prc', 'flqty', 'flprc', 'status', 'exch', 'tsym', 'trantype', 'pcode', 'avgprc', 'parent1'],
        filters: serverFilters,
        or_filters: serverOrFilters.length > 0 ? serverOrFilters : undefined,
        limit_page_length: 5000
      }
    },
    postFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  // Group server-filtered orders into SEPARATE positions for every client (Account ID + Symbol + Exchange + Product Code)
  const aggregatedPositions = useMemo<PositionGroup[]>(() => {
    let ordersToProcess: RawOrder[] = [];

    if (rawOrders && Array.isArray(rawOrders)) {
      ordersToProcess = rawOrders;
    } else if (!error && rawOrders === undefined) {
      ordersToProcess = [];
    }

    if (ordersToProcess.length === 0) {
      if (!rawOrders && !error) {
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          return SAMPLE_POSITIONS.filter(p =>
            p.actid.toLowerCase().includes(q) ||
            p.symbol.toLowerCase().includes(q) ||
            p.clients.some(c => c.toLowerCase().includes(q))
          );
        }
        return SAMPLE_POSITIONS;
      }
      return [];
    }

    const groups: Record<string, PositionGroup> = {};

    ordersToProcess.forEach(ord => {
      const status = (ord.status || "").toUpperCase();
      const fillshares = parseFloat(String(ord.fillshares || "0"));
      const flqty = parseFloat(String(ord.flqty || "0"));
      const qty = parseFloat(String(ord.qty || "0"));

      let executedQty = 0;
      if (status === 'COMPLETE' || status === 'FILLED' || status === 'COMPLETED') {
        if (fillshares > 0) {
          executedQty = fillshares;
        } else if (qty > 0) {
          executedQty = qty;
        } else {
          executedQty = flqty;
        }
      } else if (fillshares > 0) {
        executedQty = fillshares;
      } else if (flqty > 0) {
        executedQty = flqty;
      } else {
        return;
      }

      if (executedQty <= 0) return;

      const actid = (ord.actid || ord.uid || "UNKNOWN").trim();
      const symbol = (ord.tsym || ord.symbol || "UNKNOWN").trim().toUpperCase();
      if (!symbol || symbol === "UNKNOWN") return;

      const exch = ord.exch || "NSE";
      const rawPcode = ord.pcode || "CNC";
      const formattedPcode = formatProductCode(rawPcode); // Map M -> NRML, I -> MIS, C -> CNC
      const token = ord.token || "";
      const tokenKey = `${exch}|${token}`;
      const trantype = (ord.trantype || "B").toUpperCase();

      const prc = parseFloat(String(ord.flprc || ord.avgprc || ord.prc || "0"));
      const val = executedQty * prc;
      const ls = parseFloat(String(ord.ls || "1")) || 1;

      // Group key: Account ID + Symbol + Exchange + Formatted Product Code (Every client position is kept separate)
      const groupKey = `${actid}|${symbol}|${exch}|${formattedPcode}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          actid,
          symbol,
          tsym: ord.tsym || symbol,
          exch,
          token,
          tokenKey,
          pcode: formattedPcode,
          buyQty: 0,
          buyValue: 0,
          sellQty: 0,
          sellValue: 0,
          buyAvg: 0,
          sellAvg: 0,
          netQty: 0,
          avgPrice: 0,
          lastClosePrice: prc,
          clientCount: 1,
          clients: [ord.uid || actid],
          actids: [actid],
          orderCount: 0,
          realizedPnl: 0,
          lotSize: ls > 0 ? ls : 1,
        };
      }

      const g = groups[groupKey];
      g.orderCount += 1;
      if (ord.uid && !g.clients.includes(ord.uid)) g.clients.push(ord.uid);

      if (trantype === 'B' || trantype === 'BUY') {
        g.buyQty += executedQty;
        g.buyValue += val;
      } else {
        g.sellQty += executedQty;
        g.sellValue += val;
      }
    });

    return Object.values(groups).map(g => {
      const netQty = g.buyQty - g.sellQty;
      const buyAvg = g.buyQty > 0 ? g.buyValue / g.buyQty : 0;
      const sellAvg = g.sellQty > 0 ? g.sellValue / g.sellQty : 0;
      let avgPrice = 0;
      let realizedPnl = 0;

      if (netQty > 0) {
        avgPrice = buyAvg;
        realizedPnl = g.sellQty * (sellAvg - buyAvg);
      } else if (netQty < 0) {
        avgPrice = sellAvg;
        realizedPnl = g.buyQty * (sellAvg - buyAvg);
      } else {
        avgPrice = buyAvg > 0 ? buyAvg : sellAvg;
        realizedPnl = g.sellValue - g.buyValue;
      }

      return {
        ...g,
        netQty,
        avgPrice,
        buyAvg,
        sellAvg,
        realizedPnl,
      };
    });
  }, [rawOrders, error, debouncedSearch]);

  // Reset current page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, exchangeFilter, productFilter, statusTab]);

  // Filter positions by Open/Closed tabs
  const filteredPositions = useMemo(() => {
    return aggregatedPositions.filter(p => {
      if (statusTab === 'OPEN' && p.netQty === 0) return false;
      if (statusTab === 'CLOSED' && p.netQty !== 0) return false;
      return true;
    });
  }, [aggregatedPositions, statusTab]);

  // Sort logic
  const sortedPositions = useMemo(() => {
    if (!sortConfig) return filteredPositions;
    const res = [...filteredPositions];
    res.sort((a: any, b: any) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return res;
  }, [filteredPositions, sortConfig]);

  // Pagination (20 records per page)
  const totalRecords = sortedPositions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));

  const currentPaginatedSlice = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedPositions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedPositions, currentPage]);

  // Subscribe ONLY to the 20 records on the active page
  const tokensToSubscribe = useMemo(() => {
    return Array.from(
      new Set(
        currentPaginatedSlice
          .map(p => p.tokenKey)
          .filter(t => {
            if (!t || typeof t !== 'string') return false;
            const parts = t.split('|');
            return parts.length === 2 && parts[0].trim() !== '' && parts[1].trim() !== '';
          })
      )
    );
  }, [currentPaginatedSlice]);

  const { ticks, isConnected } = useKambalaFeed(tokensToSubscribe);

  // Compute live row values using ticks from KambalaFeedContext
  const enrichedPaginatedPositions = useMemo(() => {
    return currentPaginatedSlice.map(p => {
      const tick: TickData | undefined = ticks[p.tokenKey] || ticks[p.token] || ticks[p.symbol];
      const ltp = tick?.lp !== undefined && tick.lp !== null && tick.lp !== ""
        ? parseFloat(String(tick.lp))
        : (p.lastClosePrice || p.avgPrice);

      const dayChangePercent = tick?.pc !== undefined && tick.pc !== null && tick.pc !== ""
        ? parseFloat(String(tick.pc))
        : null;

      const absQty = Math.abs(p.netQty);
      const investedValue = absQty * p.avgPrice;
      const currentValue = absQty * ltp;

      let liveMtm = 0;
      if (p.netQty > 0) {
        liveMtm = p.realizedPnl + ((ltp - p.avgPrice) * p.netQty);
      } else if (p.netQty < 0) {
        liveMtm = p.realizedPnl + ((p.avgPrice - ltp) * Math.abs(p.netQty));
      } else {
        liveMtm = p.realizedPnl;
      }

      const liveMtmPercent = investedValue > 0 ? (liveMtm / investedValue) * 100 : 0;
      const isProfit = liveMtm >= 0;

      return {
        ...p,
        ltp,
        dayChangePercent,
        investedValue,
        currentValue,
        liveMtm,
        liveMtmPercent,
        isProfit,
        meta: enrichStockMetadata(p.symbol)
      };
    });
  }, [currentPaginatedSlice, ticks]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
      toast.success('Live positions refreshed from server');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const exportData = sortedPositions.map(p => {
        const tick = ticks[p.tokenKey] || ticks[p.token] || ticks[p.symbol];
        const ltp = tick?.lp ? parseFloat(String(tick.lp)) : p.lastClosePrice;
        const absQty = Math.abs(p.netQty);
        const inv = absQty * p.avgPrice;
        const curr = absQty * ltp;
        let mtm = p.netQty > 0 ? p.realizedPnl + ((ltp - p.avgPrice) * p.netQty) : (p.netQty < 0 ? p.realizedPnl + ((p.avgPrice - ltp) * absQty) : p.realizedPnl);
        const mtmPct = inv > 0 ? (mtm / inv) * 100 : 0;
        return {
          'Account ID': p.actid,
          'Symbol': p.symbol,
          'Exchange': p.exch,
          'Product': formatProductCode(p.pcode),
          'Buy Qty': p.buyQty,
          'Buy Avg': p.buyAvg,
          'Sell Qty': p.sellQty,
          'Sell Avg': p.sellAvg,
          'Net Qty': p.netQty,
          'LTP': ltp,
          'Invested Value': inv,
          'Current Value': curr,
          'Live MTM': mtm,
          'MTM %': `${mtmPct >= 0 ? '+' : ''}${mtmPct.toFixed(2)}%`,
          'Orders': p.orderCount
        };
      });
      const dateStr = new Date().toISOString().split('T')[0];
      exportToExcel(exportData, `Live_Positions_${dateStr}`);
      toast.success('Export completed');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const visibleColumnCount = useMemo(() => Object.values(columnVisibility).filter(Boolean).length, [columnVisibility]);

  return (
    <div className="p-4 flex flex-col space-y-4 h-full overflow-hidden">
      {/* Header Controls */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Live Position Book
              </h1>
              {/* Animated Live Feed Badge with dot matching Live Orders style */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border",
                  isConnected
                    ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                    : "bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-amber-500")} />
                  {isConnected ? `Live Feed Active (${tokensToSubscribe.length} tokens)` : "Connecting Socket..."}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Show in Lots Switch Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-9 shadow-sm">
              <Switch
                id="lots-view-toggle"
                checked={isLotsView}
                onCheckedChange={setIsLotsView}
                className="scale-90 data-[state=checked]:bg-purple-600"
              />
              <label htmlFor="lots-view-toggle" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap">
                Show in Lots
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-xl h-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 gap-1.5"
            >
              <RefreshCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-xl h-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              Export
            </Button>
          </div>
        </div>

        {/* Filter Controls Row matching Live Orders layout */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2">
            {/* Status Tabs */}
            <div className="flex items-center bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setStatusTab('ALL')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", statusTab === 'ALL' ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900")}
              >
                All
              </button>
              <button
                onClick={() => setStatusTab('OPEN')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", statusTab === 'OPEN' ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900")}
              >
                Open
              </button>
              <button
                onClick={() => setStatusTab('CLOSED')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", statusTab === 'CLOSED' ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900")}
              >
                Closed
              </button>
            </div>

            {/* Exchange Filter */}
            <Select value={exchangeFilter} onValueChange={setExchangeFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectItem value="ALL">All Exch</SelectItem>
                <SelectItem value="NSE">NSE</SelectItem>
                <SelectItem value="BSE">BSE</SelectItem>
                <SelectItem value="NFO">NFO</SelectItem>
                <SelectItem value="BFO">BFO</SelectItem>
                <SelectItem value="MCX">MCX</SelectItem>
              </SelectContent>
            </Select>

            {/* Product Filter */}
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <SelectItem value="ALL">All Products</SelectItem>
                <SelectItem value="CNC">CNC</SelectItem>
                <SelectItem value="MIS">MIS</SelectItem>
                <SelectItem value="NRML">NRML</SelectItem>
                <SelectItem value="CO">CO</SelectItem>
                <SelectItem value="BO">BO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Server-side Search & Column Visibility */}
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search actid, client ID, symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Column Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-1 text-xs">
                  <Columns3 className="w-3.5 h-3.5 text-slate-500" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DropdownMenuGroup>
                  {DEFAULT_COLUMN_ORDER.map((colKey) => (
                    <DropdownMenuCheckboxItem
                      key={colKey}
                      checked={columnVisibility[colKey]}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({ ...prev, [colKey]: checked }))}
                      className="text-xs capitalize cursor-pointer"
                    >
                      {colKey === 'mtmPercent' ? 'MTM %' : colKey === 'buyAvg' ? 'Buy Avg' : colKey === 'sellAvg' ? 'Sell Avg' : colKey.replace(/([A-Z])/g, ' $1')}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Position Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm">
        <ScrollArea className="flex-1 w-full">
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-[1250px]">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
              <tr>
                {columnOrder.map((colId, index) => {
                  if (!columnVisibility[colId]) return null;

                  let titleNode: React.ReactNode = null;
                  let sortKey: string | null = null;
                  let alignClass = 'text-left';

                  switch (colId) {
                    case 'actid':
                      titleNode = 'Account ID';
                      sortKey = 'actid';
                      break;
                    case 'symbol':
                      titleNode = 'Symbol';
                      sortKey = 'symbol';
                      break;
                    case 'exch':
                      titleNode = 'Exch';
                      break;
                    case 'pcode':
                      titleNode = 'Product';
                      break;
                    case 'buyQty':
                      titleNode = isLotsView ? 'Buy (Lots)' : 'Buy Qty';
                      sortKey = 'buyQty';
                      alignClass = 'text-right';
                      break;
                    case 'buyAvg':
                      titleNode = 'Buy Avg';
                      sortKey = 'buyAvg';
                      alignClass = 'text-right';
                      break;
                    case 'sellQty':
                      titleNode = isLotsView ? 'Sell (Lots)' : 'Sell Qty';
                      sortKey = 'sellQty';
                      alignClass = 'text-right';
                      break;
                    case 'sellAvg':
                      titleNode = 'Sell Avg';
                      sortKey = 'sellAvg';
                      alignClass = 'text-right';
                      break;
                    case 'netQty':
                      titleNode = isLotsView ? 'Net (Lots)' : 'Net Qty';
                      sortKey = 'netQty';
                      alignClass = 'text-right';
                      break;
                    case 'ltp':
                      titleNode = 'LTP';
                      sortKey = 'ltp';
                      alignClass = 'text-center';
                      break;
                    case 'investedValue':
                      titleNode = 'Invested';
                      alignClass = 'text-right';
                      break;
                    case 'currentValue':
                      titleNode = 'Current Val';
                      alignClass = 'text-right';
                      break;
                    case 'liveMtm':
                      titleNode = 'Live MTM (P&L)';
                      sortKey = 'liveMtm';
                      alignClass = 'text-right';
                      break;
                    case 'mtmPercent':
                      titleNode = 'MTM %';
                      sortKey = 'liveMtmPercent';
                      alignClass = 'text-right';
                      break;
                    case 'dayChange':
                      titleNode = 'Day Chg';
                      alignClass = 'text-right';
                      break;
                    case 'orderCount':
                      titleNode = 'Orders';
                      alignClass = 'text-center';
                      break;
                    default:
                      return null;
                  }

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
                      onClick={sortKey ? () => handleSort(sortKey!) : undefined}
                      className={cn(
                        "py-3.5 px-4 cursor-grab active:cursor-grabbing select-none relative transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-900 group/col",
                        alignClass,
                        draggedIndex !== null && draggedIndex !== index && draggedOverIndex === index && "bg-purple-50/50 dark:bg-purple-950/20"
                      )}
                    >
                      <div className={cn("flex items-center gap-1", alignClass === 'text-right' && "justify-end", alignClass === 'text-center' && "justify-center")}>
                        {titleNode}
                        {sortKey && <ArrowUpDown className="w-3 h-3 opacity-50 group-hover/col:opacity-100" />}
                      </div>
                      {draggedOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                        <div className={cn(
                          "absolute top-0 bottom-0 w-1 bg-purple-600 z-30 pointer-events-none animate-pulse",
                          draggedIndex < index ? "right-0" : "left-0"
                        )} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={visibleColumnCount} className="p-4">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : enrichedPaginatedPositions.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-base">No open positions found</p>
                    <p className="text-xs text-slate-400 mt-1">Try searching another actid, client ID, or clearing filters</p>
                  </td>
                </tr>
              ) : (
                enrichedPaginatedPositions.map((pos) => {
                  const isLong = pos.netQty > 0;
                  const isShort = pos.netQty < 0;
                  const isClosed = pos.netQty === 0;

                  return (
                    <tr key={`${pos.actid}-${pos.symbol}-${pos.exch}-${pos.pcode}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                      {columnOrder.map((colId) => {
                        if (!columnVisibility[colId]) return null;

                        switch (colId) {
                          case 'actid':
                            return (
                              <td key={colId} className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {pos.actid}
                              </td>
                            );
                          case 'symbol':
                            return (
                              <td key={colId} className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400">
                                    {pos.meta.icon === 'Zap' && <Zap className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Landmark' && <Landmark className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Monitor' && <Monitor className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Leaf' && <Leaf className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Building2' && <Building2 className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Globe' && <Globe className="w-3.5 h-3.5" />}
                                    {pos.meta.icon === 'Hexagon' && <Hexagon className="w-3.5 h-3.5" />}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm tracking-tight">{pos.symbol}</span>
                                    {isClosed && (
                                      <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                                        <div className="w-1 h-1 rounded-full animate-pulse bg-amber-500" />
                                        CLOSED
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'exch':
                            return (
                              <td key={colId} className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-slate-500" />
                                    {pos.exch}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'pcode':
                            return (
                              <td key={colId} className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-purple-500" />
                                    {formatProductCode(pos.pcode)}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'buyQty':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500 shrink-0" />
                                    {isLotsView ? (pos.buyQty / (pos.lotSize || 1)) : pos.buyQty}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'buyAvg':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                                {pos.buyAvg > 0 ? `₹${fmt(pos.buyAvg)}` : '-'}
                              </td>
                            );
                          case 'sellQty':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-mono whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-rose-500 shrink-0" />
                                    {isLotsView ? (pos.sellQty / (pos.lotSize || 1)) : pos.sellQty}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'sellAvg':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                                {pos.sellAvg > 0 ? `₹${fmt(pos.sellAvg)}` : '-'}
                              </td>
                            );
                          case 'netQty':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                  {isLong && (
                                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500 shrink-0" />
                                      BUY +{isLotsView ? (pos.netQty / (pos.lotSize || 1)) : pos.netQty}
                                    </div>
                                  )}
                                  {isShort && (
                                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 whitespace-nowrap shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-rose-500 shrink-0" />
                                      SELL {isLotsView ? (pos.netQty / (pos.lotSize || 1)) : pos.netQty}
                                    </div>
                                  )}
                                  {isClosed && (
                                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-slate-400 shrink-0" />
                                      0
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          case 'ltp':
                            return <LTPCell key={colId} price={pos.ltp} />;
                          case 'investedValue':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                                ₹{fmt(pos.investedValue)}
                              </td>
                            );
                          case 'currentValue':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300 font-mono">
                                ₹{fmt(pos.currentValue)}
                              </td>
                            );
                          case 'liveMtm':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-bold text-sm font-mono">
                                <span className={cn(pos.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                  {pos.liveMtm >= 0 ? "+" : ""}₹{fmt(pos.liveMtm)}
                                </span>
                              </td>
                            );
                          case 'mtmPercent':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end">
                                  <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 inline-flex",
                                    pos.isProfit
                                      ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                                      : "bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                                  )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", pos.isProfit ? "bg-emerald-500" : "bg-rose-500")} />
                                    {pos.liveMtmPercent >= 0 ? "+" : ""}{pos.liveMtmPercent.toFixed(2)}%
                                  </div>
                                </div>
                              </td>
                            );
                          case 'dayChange':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right">
                                {pos.dayChangePercent !== null ? (
                                  <div className="flex items-center justify-end">
                                    <div className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 inline-flex",
                                      pos.dayChangePercent >= 0
                                        ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                                        : "bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                                    )}>
                                      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", pos.dayChangePercent >= 0 ? "bg-emerald-500" : "bg-rose-500")} />
                                      {pos.dayChangePercent >= 0 ? "+" : ""}{pos.dayChangePercent.toFixed(2)}%
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">—</span>
                                )}
                              </td>
                            );
                          case 'orderCount':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-center">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                  {pos.orderCount}
                                </span>
                              </td>
                            );
                          default:
                            return null;
                        }
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Footer info bar & Pagination controls */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span>
              Showing {totalRecords > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} of {totalRecords} positions
            </span>
            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-purple-500" />
              20 record feed subscription
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivePositions;
