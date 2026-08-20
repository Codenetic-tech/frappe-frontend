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

export interface PositionDoc {
  name?: string;
  clientid?: string;
  tradingsymbol?: string;
  symbol?: string;
  exch?: string;
  token?: string;
  product?: string;
  instrument?: string;
  netbuyqtylots?: string | number;
  netsellqtylots?: string | number;
  netqtylots?: string | number;
  mtom?: string | number;
  pnl?: string | number;
  ltp?: string | number;
  actualprice?: string | number;
  buyavgprice?: string | number;
  sellavgprice?: string | number;
  netbuyactualprice?: string | number;
  netsellactualprice?: string | number;
  netqty?: string | number;
  cfbuyqty?: string | number;
  cfsellqty?: string | number;
  cfbuyavgprice?: string | number;
  daybuyqty?: string | number;
  daysellqty?: string | number;
  daynetqty?: string | number;
  daybuyavgprice?: string | number;
  netbuyval?: string | number;
  netsellval?: string | number;
  netval?: string | number;
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
  // Volume fields for Today PNL and Net PNL calculation (optional)
  buyVolume?: number;
  sellVolume?: number;
  buyVolumeNet?: number;
  sellVolumeNet?: number;
  netbuyactualprice?: number;
  netsellactualprice?: number;
  prcftr?: number;
  // Carry Forward attributes
  isCarryForward: boolean;
  isCfClosedToday: boolean;
  cfBuyQty: number;
  cfSellQty: number;
  cfNetQty: number;
  cfBuyAvg: number;
  dayBuyQty: number;
  daySellQty: number;
  dayNetQty: number;
  dayBuyAvg: number;
  dayMtm: number;
  docMtom: number;
  docPnl: number;
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

// Initial fallback position dataset with Carry Forward positions & CF closed today positions for local preview
const DEFAULT_COLUMN_ORDER: string[] = [
  'actid',
  'symbol',
  'posType',
  'exch',
  'pcode',
  'buyQty',
  'buyAvg',
  'buyVolume',
  'sellQty',
  'sellAvg',
  'sellVolume',
  'netQty',
  'ltp',
  'investedValue',
  'currentValue',
  'todayPnl',
  'netPnl',
  'mtmPercent',
  'dayChange',
  'orderCount',
];

const SAMPLE_POSITIONS: PositionGroup[] = [
  { actid: "AD6474", symbol: "NIFTY18AUG26C24400", tsym: "NIFTY18AUG26C24400", exch: "NFO", token: "45106", tokenKey: "NFO|45106", pcode: "NRML", buyQty: 65, buyValue: 6711.25, sellQty: 0, sellValue: 0, buyAvg: 103.25, sellAvg: 0, netQty: 65, avgPrice: 103.25, lastClosePrice: 109.85, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 1, realizedPnl: 0, lotSize: 65, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 65, cfSellQty: 0, cfNetQty: 65, cfBuyAvg: 103.25, dayBuyQty: 0, daySellQty: 0, dayNetQty: 0, dayBuyAvg: 0, dayMtm: 429.00, docMtom: 429.00, docPnl: 0 },
  { actid: "AD6474", symbol: "NIFTY18AUG26C24600", tsym: "NIFTY18AUG26C24600", exch: "NFO", token: "45116", tokenKey: "NFO|45116", pcode: "NRML", buyQty: 195, buyValue: 12808.25, sellQty: 195, sellValue: 10933.00, buyAvg: 65.68, sellAvg: 56.06, netQty: 0, avgPrice: 65.68, lastClosePrice: 42.40, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 6, realizedPnl: -1875.25, lotSize: 65, isCarryForward: true, isCfClosedToday: true, cfBuyQty: 195, cfSellQty: 0, cfNetQty: 195, cfBuyAvg: 65.68, dayBuyQty: 0, daySellQty: 195, dayNetQty: -195, dayBuyAvg: 0, dayMtm: -1875.25, docMtom: -1875.25, docPnl: -1875.25 },
  { actid: "AD6474", symbol: "NIFTY18AUG26C24800", tsym: "NIFTY18AUG26C24800", exch: "NFO", token: "45140", tokenKey: "NFO|45140", pcode: "NRML", buyQty: 65, buyValue: 962.00, sellQty: 65, sellValue: 861.25, buyAvg: 14.80, sellAvg: 13.25, netQty: 0, avgPrice: 14.80, lastClosePrice: 13.95, clientCount: 1, clients: ["AD6474"], actids: ["AD6474"], orderCount: 2, realizedPnl: -100.75, lotSize: 65, isCarryForward: false, isCfClosedToday: false, cfBuyQty: 0, cfSellQty: 0, cfNetQty: 0, cfBuyAvg: 0, dayBuyQty: 65, daySellQty: 65, dayNetQty: 0, dayBuyAvg: 14.80, dayMtm: -100.75, docMtom: -100.75, docPnl: -100.75 },
  { actid: "CL1024", symbol: "RELIANCE", tsym: "RELIANCE", exch: "NSE", token: "13", tokenKey: "NSE|13", pcode: "CNC", buyQty: 50, buyValue: 124265, sellQty: 10, sellValue: 26124, buyAvg: 2485.30, sellAvg: 2612.40, netQty: 40, avgPrice: 2453.52, lastClosePrice: 2485.30, clientCount: 1, clients: ["CL1024"], actids: ["CL1024"], orderCount: 6, realizedPnl: 1589.20, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 50, cfSellQty: 0, cfNetQty: 50, cfBuyAvg: 2485.30, dayBuyQty: 0, daySellQty: 10, dayNetQty: -10, dayBuyAvg: 0, dayMtm: 1269.20, docMtom: 1589.20, docPnl: 1589.20 },
  { actid: "CL1001", symbol: "NIFTY 50", tsym: "NIFTY 50", exch: "NSE", token: "26000", tokenKey: "NSE|26000", pcode: "NRML", buyQty: 150, buyValue: 3678000, sellQty: 75, sellValue: 1845000, buyAvg: 24520.00, sellAvg: 24600.00, netQty: 75, avgPrice: 24440.00, lastClosePrice: 24510.00, clientCount: 1, clients: ["CL1001"], actids: ["CL1001"], orderCount: 12, realizedPnl: 6000.00, lotSize: 65, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 150, cfSellQty: 0, cfNetQty: 150, cfBuyAvg: 24520.00, dayBuyQty: 0, daySellQty: 75, dayNetQty: -75, dayBuyAvg: 0, dayMtm: 6000.00, docMtom: 6000.00, docPnl: 6000.00 },
  { actid: "CL4012", symbol: "BANK NIFTY", tsym: "BANK NIFTY", exch: "NSE", token: "26001", tokenKey: "NSE|26001", pcode: "MIS", buyQty: 30, buyValue: 1560000, sellQty: 30, sellValue: 1572000, buyAvg: 52000.00, sellAvg: 52400.00, netQty: 0, avgPrice: 52000.00, lastClosePrice: 52400.00, clientCount: 1, clients: ["CL4012"], actids: ["CL4012"], orderCount: 5, realizedPnl: 12000.00, lotSize: 15, isCarryForward: false, isCfClosedToday: false, cfBuyQty: 0, cfSellQty: 0, cfNetQty: 0, cfBuyAvg: 0, dayBuyQty: 30, daySellQty: 30, dayNetQty: 0, dayBuyAvg: 52000.00, dayMtm: 12000.00, docMtom: 12000.00, docPnl: 12000.00 },
  { actid: "CL2080", symbol: "TCS", tsym: "TCS", exch: "NSE", token: "11536", tokenKey: "NSE|11536", pcode: "CNC", buyQty: 25, buyValue: 97875, sellQty: 0, sellValue: 0, buyAvg: 3915.00, sellAvg: 0, netQty: 25, avgPrice: 3915.00, lastClosePrice: 3920.00, clientCount: 1, clients: ["CL2080"], actids: ["CL2080"], orderCount: 3, realizedPnl: 0, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 25, cfSellQty: 0, cfNetQty: 25, cfBuyAvg: 3915.00, dayBuyQty: 0, daySellQty: 0, dayNetQty: 0, dayBuyAvg: 0, dayMtm: 125.00, docMtom: 125.00, docPnl: 0 },
  { actid: "CL1044", symbol: "SBIN", tsym: "SBIN", exch: "NSE", token: "3045", tokenKey: "NSE|3045", pcode: "CNC", buyQty: 200, buyValue: 165600, sellQty: 50, sellValue: 42250, buyAvg: 828.00, sellAvg: 845.00, netQty: 150, avgPrice: 822.33, lastClosePrice: 835.50, clientCount: 1, clients: ["CL1044"], actids: ["CL1044"], orderCount: 8, realizedPnl: 1133.50, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 200, cfSellQty: 0, cfNetQty: 200, cfBuyAvg: 828.00, dayBuyQty: 0, daySellQty: 50, dayNetQty: -50, dayBuyAvg: 0, dayMtm: 1133.50, docMtom: 1133.50, docPnl: 1133.50 },
  { actid: "CL3001", symbol: "INFY", tsym: "INFY", exch: "NSE", token: "1594", tokenKey: "NSE|1594", pcode: "CNC", buyQty: 80, buyValue: 148000, sellQty: 20, sellValue: 37500, buyAvg: 1850.00, sellAvg: 1875.00, netQty: 60, avgPrice: 1850.00, lastClosePrice: 1875.20, clientCount: 1, clients: ["CL3001"], actids: ["CL3001"], orderCount: 4, realizedPnl: 500.00, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 80, cfSellQty: 0, cfNetQty: 80, cfBuyAvg: 1850.00, dayBuyQty: 0, daySellQty: 20, dayNetQty: -20, dayBuyAvg: 0, dayMtm: 500.00, docMtom: 500.00, docPnl: 500.00 },
  { actid: "CL1002", symbol: "HDFCBANK", tsym: "HDFCBANK", exch: "NSE", token: "1333", tokenKey: "NSE|1333", pcode: "CNC", buyQty: 100, buyValue: 162000, sellQty: 0, sellValue: 0, buyAvg: 1620.00, sellAvg: 0, netQty: 100, avgPrice: 1620.00, lastClosePrice: 1645.00, clientCount: 1, clients: ["CL1002"], actids: ["CL1002"], orderCount: 7, realizedPnl: 0, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 100, cfSellQty: 0, cfNetQty: 100, cfBuyAvg: 1620.00, dayBuyQty: 0, daySellQty: 0, dayNetQty: 0, dayBuyAvg: 0, dayMtm: 2500.00, docMtom: 2500.00, docPnl: 0 },
  { actid: "CL2010", symbol: "ICICIBANK", tsym: "ICICIBANK", exch: "NSE", token: "4963", tokenKey: "NSE|4963", pcode: "MIS", buyQty: 60, buyValue: 70800, sellQty: 60, sellValue: 71400, buyAvg: 1180.00, sellAvg: 1190.00, netQty: 0, avgPrice: 1180.00, lastClosePrice: 1190.00, clientCount: 1, clients: ["CL2010"], actids: ["CL2010"], orderCount: 3, realizedPnl: 600.00, lotSize: 1, isCarryForward: false, isCfClosedToday: false, cfBuyQty: 0, cfSellQty: 0, cfNetQty: 0, cfBuyAvg: 0, dayBuyQty: 60, daySellQty: 60, dayNetQty: 0, dayBuyAvg: 1180.00, dayMtm: 600.00, docMtom: 600.00, docPnl: 600.00 },
  { actid: "CL1020", symbol: "AXISBANK", tsym: "AXISBANK", exch: "NSE", token: "5900", tokenKey: "NSE|5900", pcode: "NRML", buyQty: 40, buyValue: 46800, sellQty: 10, sellValue: 11800, buyAvg: 1170.00, sellAvg: 1180.00, netQty: 30, avgPrice: 1170.00, lastClosePrice: 1182.50, clientCount: 1, clients: ["CL1020"], actids: ["CL1020"], orderCount: 2, realizedPnl: 100.00, lotSize: 1, isCarryForward: true, isCfClosedToday: false, cfBuyQty: 40, cfSellQty: 0, cfNetQty: 40, cfBuyAvg: 1170.00, dayBuyQty: 0, daySellQty: 10, dayNetQty: -10, dayBuyAvg: 0, dayMtm: 100.00, docMtom: 100.00, docPnl: 100.00 }
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
  const [statusTab, setStatusTab] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'CARRY_FORWARD'>('ALL');
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
        let parsed: string[] = JSON.parse(stored);
        parsed = parsed.flatMap(col => {
          if (col === 'liveMtm') return ['todayPnl', 'netPnl'];
          if (col === 'dayMtm') return [];
          return [col];
        });
        let order = Array.from(new Set(parsed));
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
      posType: true,
      exch: true,
      pcode: true,
      buyQty: true,
      buyAvg: true,
      buyVolume: true,
      sellQty: true,
      sellAvg: true,
      sellVolume: true,
      netQty: true,
      ltp: true,
      investedValue: true,
      currentValue: true,
      todayPnl: true,
      netPnl: true,
      mtmPercent: true,
      dayChange: true,
      orderCount: true,
    };
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if ('liveMtm' in parsed || 'dayMtm' in parsed) {
          if ('liveMtm' in parsed) parsed.netPnl = parsed.liveMtm;
          if ('dayMtm' in parsed) parsed.todayPnl = parsed.dayMtm;
        }
        return { ...defaults, ...parsed };
      } catch (e) { return defaults; }
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

  // Construct SERVER-SIDE filters for Positions doctype (Carry Forward positions)
  const { serverFilters: posFilters, serverOrFilters: posOrFilters } = useMemo(() => {
    const filters: any[] = [];
    const orFilters: any[] = [];

    if (debouncedSearch && debouncedSearch.trim()) {
      const term = debouncedSearch.trim();
      const q = `%${term}%`;
      orFilters.push(['clientid', 'like', q]);
      orFilters.push(['tradingsymbol', 'like', q]);
      orFilters.push(['symbol', 'like', q]);
    }

    if (exchangeFilter !== 'ALL') {
      filters.push(['exch', '=', exchangeFilter]);
    }
    if (productFilter !== 'ALL') {
      if (productFilter === 'NRML') {
        filters.push(['product', 'in', ['M', 'NRML', 'MARGIN']]);
      } else if (productFilter === 'MIS') {
        filters.push(['product', 'in', ['I', 'MIS', 'INTRADAY']]);
      } else if (productFilter === 'CNC') {
        filters.push(['product', 'in', ['C', 'CNC', 'CASH']]);
      } else {
        filters.push(['product', '=', productFilter]);
      }
    }

    return { serverFilters: filters, serverOrFilters: orFilters };
  }, [debouncedSearch, exchangeFilter, productFilter]);

  // Fetch raw orders from Sky Order Feed doctype with SERVER-SIDE filters
  const { data: rawOrders, isLoading: isOrdersLoading, mutate: mutateOrders, error: ordersError } = useSWR<RawOrder[]>(
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

  // Fetch Carry Forward positions from DocType `Positions`
  const { data: rawPositions, isLoading: isPositionsLoading, mutate: mutatePositions, error: positionsError } = useSWR<PositionDoc[]>(
    {
      url: `${API_BASE_URL}/api/method/frappe.client.get_list`,
      body: {
        doctype: 'Positions',
        fields: [
          'name', 'clientid', 'tradingsymbol', 'symbol', 'exch', 'token', 'product',
          'cfbuyqty', 'cfsellqty', 'cfbuyavgprice',
          'daybuyqty', 'daysellqty', 'daynetqty', 'daybuyavgprice',
          'netbuyqty', 'netsellqty', 'netqty', 'netqtylots', 'netbuyqtylots', 'netsellqtylots',
          'buyavgprice', 'sellavgprice', 'actualprice', 'ltp',
          'netbuyactualprice', 'netsellactualprice',
          'mtom', 'pnl', 'netval', 'netbuyval', 'netsellval'
        ],
        filters: posFilters,
        or_filters: posOrFilters.length > 0 ? posOrFilters : undefined,
        limit_page_length: 5000
      }
    },
    postFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const isLoading = isOrdersLoading && isPositionsLoading;
  const error = ordersError || positionsError;

  // Group server-filtered orders and carry forward positions into SEPARATE positions for every client (Client ID + Symbol + Exchange + Product Code)
  const aggregatedPositions = useMemo<PositionGroup[]>(() => {
    const groups: Record<string, PositionGroup> = {};

    // Build upfront lot size mapping for each position group key
    const lotSizeMap: Record<string, number> = {};

    const extractLs = (docOrOrd: any): number => {
      let ls = parseFloat(String(docOrOrd.ls || docOrOrd.lotsize || "0"));
      if (ls > 0) return ls;

      const nQty = parseFloat(String(docOrOrd.netqty || docOrOrd.netbuyqty || docOrOrd.netsellqty || "0"));
      const nLots = parseFloat(String(docOrOrd.netqtylots || docOrOrd.netbuyqtylots || docOrOrd.netsellqtylots || "0"));
      if (nQty !== 0 && nLots !== 0) {
        ls = Math.round(Math.abs(nQty / nLots));
        if (ls > 0) return ls;
      }
      return 1;
    };

    if (rawPositions && Array.isArray(rawPositions)) {
      rawPositions.forEach(p => {
        const actid = (p.clientid || "").trim();
        const symbol = (p.tradingsymbol || p.symbol || "").trim().toUpperCase();
        if (!symbol) return;
        const exch = p.exch || "NSE";
        const pcode = formatProductCode(p.product);
        const key = `${actid}|${symbol}|${exch}|${pcode}`;
        const ls = extractLs(p);
        if (ls > 1) lotSizeMap[key] = ls;
      });
    }

    if (rawOrders && Array.isArray(rawOrders)) {
      rawOrders.forEach(o => {
        const actid = (o.actid || o.uid || "").trim();
        const symbol = (o.tsym || o.symbol || "").trim().toUpperCase();
        if (!symbol) return;
        const exch = o.exch || "NSE";
        const pcode = formatProductCode(o.pcode);
        const key = `${actid}|${symbol}|${exch}|${pcode}`;
        const ls = parseFloat(String(o.ls || "0"));
        if (ls > 1) lotSizeMap[key] = ls;
      });
    }

    // Helper to convert lot quantities to total unit quantity
    const toUnits = (qty: number, lotSize: number): number => {
      if (!qty || qty === 0) return 0;
      if (lotSize <= 1) return qty;
      if (Math.abs(qty) < lotSize) {
        return qty * lotSize;
      }
      return qty;
    };

    // 1. Process Carry Forward positions from DocType `Positions`
    if (rawPositions && Array.isArray(rawPositions)) {
      rawPositions.forEach(posDoc => {
        const actid = (posDoc.clientid || "").trim();
        const symbol = (posDoc.tradingsymbol || posDoc.symbol || "UNKNOWN").trim().toUpperCase();
        if (!symbol || symbol === "UNKNOWN") return;

        const exch = posDoc.exch || "NSE";
        const rawPcode = posDoc.product || "NRML";
        const formattedPcode = formatProductCode(rawPcode);
        const token = posDoc.token || "";
        const tokenKey = `${exch}|${token}`;
        const groupKey = `${actid}|${symbol}|${exch}|${formattedPcode}`;

        const lotSize = lotSizeMap[groupKey] || extractLs(posDoc);

        const cfBuyQty = toUnits(parseFloat(String(posDoc.cfbuyqty || "0")), lotSize);
        const cfSellQty = toUnits(parseFloat(String(posDoc.cfsellqty || "0")), lotSize);
        const cfNetQty = cfBuyQty - cfSellQty;
        const cfBuyAvg = parseFloat(String(posDoc.buyavgprice || posDoc.cfbuyavgprice || "0"));

        const dayBuyQty = toUnits(parseFloat(String(posDoc.daybuyqty || "0")), lotSize);
        const daySellQty = toUnits(parseFloat(String(posDoc.daysellqty || "0")), lotSize);
        const dayBuyAvg = parseFloat(String(posDoc.daybuyavgprice || posDoc.buyavgprice || "0"));

        const rawNetQtyDoc = parseFloat(String(posDoc.netqty || "0"));
        const netQtyDoc = toUnits(rawNetQtyDoc, lotSize);
        const docMtom = parseFloat(String(posDoc.mtom || "0"));
        const docPnl = parseFloat(String(posDoc.pnl || "0"));

        const cfBuyVolume = cfBuyQty * cfBuyAvg;
        const cfSellVolume = cfSellQty * (parseFloat(String(posDoc.sellavgprice || "0")) || 0);
        const netbuyactualprice = parseFloat(String(posDoc.netbuyactualprice || posDoc.buyavgprice || "0"));
        const netsellactualprice = parseFloat(String(posDoc.netsellactualprice || posDoc.sellavgprice || "0"));
        const cfBuyVolumeNet = cfBuyQty * netbuyactualprice;
        const cfSellVolumeNet = cfSellQty * netsellactualprice;

        if (!groups[groupKey]) {
          groups[groupKey] = {
            actid,
            symbol,
            tsym: posDoc.tradingsymbol || symbol,
            exch,
            token,
            tokenKey,
            pcode: formattedPcode,
            buyQty: cfBuyQty + dayBuyQty,
            buyValue: cfBuyVolume + (dayBuyQty * dayBuyAvg),
            sellQty: cfSellQty + daySellQty,
            sellValue: cfSellVolume,
            buyAvg: cfBuyAvg,
            sellAvg: parseFloat(String(posDoc.sellavgprice || "0")) || 0,
            netQty: netQtyDoc !== 0 ? netQtyDoc : (cfNetQty + dayBuyQty - daySellQty),
            avgPrice: cfBuyAvg,
            lastClosePrice: parseFloat(String(posDoc.actualprice || posDoc.ltp || "0")) || cfBuyAvg,
            clientCount: 1,
            clients: [actid],
            actids: [actid],
            orderCount: 0,
            realizedPnl: docPnl,
            lotSize: lotSize > 0 ? lotSize : 1,
            buyVolume: cfBuyVolume + (dayBuyQty * dayBuyAvg),
            sellVolume: cfSellVolume,
            buyVolumeNet: cfBuyVolumeNet + (dayBuyQty * dayBuyAvg),
            sellVolumeNet: cfSellVolumeNet,
            netbuyactualprice,
            netsellactualprice,
            prcftr: 1,
            isCarryForward: cfBuyQty > 0 || cfSellQty > 0 || cfNetQty !== 0,
            isCfClosedToday: false,
            cfBuyQty,
            cfSellQty,
            cfNetQty,
            cfBuyAvg,
            dayBuyQty,
            daySellQty,
            dayNetQty: dayBuyQty - daySellQty,
            dayBuyAvg,
            dayMtm: docMtom,
            docMtom,
            docPnl,
          };
        }
      });
    }

    // 2. Process raw orders from `Sky Order Feed`
    let ordersToProcess: RawOrder[] = [];
    if (rawOrders && Array.isArray(rawOrders)) {
      ordersToProcess = rawOrders;
    }

    ordersToProcess.forEach(ord => {
      const status = (ord.status || "").toUpperCase();
      const fillshares = parseFloat(String(ord.fillshares || "0"));
      const flqty = parseFloat(String(ord.flqty || "0"));
      const qty = parseFloat(String(ord.qty || "0"));

      let rawExecutedQty = 0;
      if (status === 'COMPLETE' || status === 'FILLED' || status === 'COMPLETED') {
        if (fillshares > 0) rawExecutedQty = fillshares;
        else if (qty > 0) rawExecutedQty = qty;
        else rawExecutedQty = flqty;
      } else if (fillshares > 0) rawExecutedQty = fillshares;
      else if (flqty > 0) rawExecutedQty = flqty;
      else return;

      if (rawExecutedQty <= 0) return;

      const actid = (ord.actid || ord.uid || "UNKNOWN").trim();
      const symbol = (ord.tsym || ord.symbol || "UNKNOWN").trim().toUpperCase();
      if (!symbol || symbol === "UNKNOWN") return;

      const exch = ord.exch || "NSE";
      const rawPcode = ord.pcode || "CNC";
      const formattedPcode = formatProductCode(rawPcode);
      const token = ord.token || "";
      const tokenKey = `${exch}|${token}`;
      const trantype = (ord.trantype || "B").toUpperCase();
      const prc = parseFloat(String(ord.avgprc || ord.flprc || ord.prc || "0"));
      const ls = parseFloat(String(ord.ls || "1")) || 1;

      const groupKey = `${actid}|${symbol}|${exch}|${formattedPcode}`;
      const lotSize = lotSizeMap[groupKey] || ls;
      const executedQty = toUnits(rawExecutedQty, lotSize);
      const val = executedQty * prc;

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
          lotSize: lotSize > 0 ? lotSize : 1,
          buyVolume: 0,
          sellVolume: 0,
          buyVolumeNet: 0,
          sellVolumeNet: 0,
          netbuyactualprice: 0,
          netsellactualprice: 0,
          prcftr: 1,
          isCarryForward: false,
          isCfClosedToday: false,
          cfBuyQty: 0,
          cfSellQty: 0,
          cfNetQty: 0,
          cfBuyAvg: 0,
          dayBuyQty: 0,
          daySellQty: 0,
          dayNetQty: 0,
          dayBuyAvg: 0,
          dayMtm: 0,
          docMtom: 0,
          docPnl: 0,
        };
      }

      const g = groups[groupKey];
      g.orderCount += 1;
      if (token && !g.token) {
        g.token = token;
        g.tokenKey = tokenKey;
      }
      if (lotSize > 1) g.lotSize = lotSize;

      if (trantype === 'B' || trantype === 'BUY') {
        g.dayBuyQty += executedQty;
        g.buyQty += executedQty;
        g.buyValue += val;
        g.buyVolume = (g.buyVolume || 0) + val;
        g.buyVolumeNet = (g.buyVolumeNet || 0) + val;
      } else {
        g.daySellQty += executedQty;
        g.sellQty += executedQty;
        g.sellValue += val;
        g.sellVolume = (g.sellVolume || 0) + val;
        g.sellVolumeNet = (g.sellVolumeNet || 0) + val;
      }
    });

    const allGroups = Object.values(groups);

    // Fallback to SAMPLE_POSITIONS if no backend records exist and no error
    if (allGroups.length === 0 && !rawOrders && !rawPositions && !error) {
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

    return allGroups.map(g => {
      const netQty = g.buyQty - g.sellQty;
      const buyAvg = g.buyQty > 0 ? g.buyValue / g.buyQty : 0;
      const sellAvg = g.sellQty > 0 ? g.sellValue / g.sellQty : 0;
      let avgPrice = 0;
      let realizedPnl = g.realizedPnl || 0;

      if (netQty > 0) {
        avgPrice = buyAvg;
        realizedPnl = g.sellQty > 0 ? g.sellQty * (sellAvg - buyAvg) : g.realizedPnl;
      } else if (netQty < 0) {
        avgPrice = sellAvg;
        realizedPnl = g.buyQty > 0 ? g.buyQty * (sellAvg - buyAvg) : g.realizedPnl;
      } else {
        avgPrice = buyAvg > 0 ? buyAvg : sellAvg;
        realizedPnl = (g.sellValue > 0 || g.buyValue > 0) ? (g.sellValue - g.buyValue) : g.realizedPnl;
      }

      // Determine if Carry Forward position was closed today
      const isCarryForward = g.isCarryForward || g.cfNetQty !== 0 || g.cfBuyQty > 0 || g.cfSellQty > 0;
      const isCfClosedToday = isCarryForward && g.cfNetQty !== 0 && netQty === 0;

      return {
        ...g,
        netQty,
        avgPrice,
        buyAvg,
        sellAvg,
        realizedPnl,
        isCarryForward,
        isCfClosedToday,
        dayNetQty: g.dayBuyQty - g.daySellQty,
      };
    });
  }, [rawOrders, rawPositions, error, debouncedSearch]);

  // Reset current page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, exchangeFilter, productFilter, statusTab]);

  // Filter positions by Open/Closed/Carry Forward tabs
  const filteredPositions = useMemo(() => {
    return aggregatedPositions.filter(p => {
      if (statusTab === 'OPEN' && p.netQty === 0) return false;
      if (statusTab === 'CLOSED' && p.netQty !== 0) return false;
      if (statusTab === 'CARRY_FORWARD' && !p.isCarryForward) return false;
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

      const rawBuyVolume = typeof p.buyVolume === 'number' && !isNaN(p.buyVolume) && p.buyVolume > 0
        ? p.buyVolume
        : (p.buyValue || (p.buyQty * (p.cfBuyAvg || p.buyAvg || 0)));

      const rawSellVolume = typeof p.sellVolume === 'number' && !isNaN(p.sellVolume) && p.sellVolume > 0
        ? p.sellVolume
        : (p.sellValue || (p.sellQty * (p.sellAvg || 0)));

      const rawBuyVolumeNet = typeof p.buyVolumeNet === 'number' && !isNaN(p.buyVolumeNet) && p.buyVolumeNet > 0
        ? p.buyVolumeNet
        : (p.buyQty * (p.netbuyactualprice || p.cfBuyAvg || p.buyAvg || 0));

      const rawSellVolumeNet = typeof p.sellVolumeNet === 'number' && !isNaN(p.sellVolumeNet) && p.sellVolumeNet > 0
        ? p.sellVolumeNet
        : (p.sellQty * (p.netsellactualprice || p.sellAvg || 0));

      const buyAvg = p.buyQty > 0 ? (rawBuyVolume / p.buyQty) : (p.buyAvg || 0);
      const sellAvg = p.sellQty > 0 ? (rawSellVolume / p.sellQty) : (p.sellAvg || 0);

      let avgPrice = 0;
      if (p.netQty > 0) {
        avgPrice = p.buyQty > 0 ? (rawBuyVolumeNet / p.buyQty) : (p.avgPrice || buyAvg);
      } else if (p.netQty < 0) {
        avgPrice = p.sellQty > 0 ? (rawSellVolumeNet / p.sellQty) : (p.avgPrice || sellAvg);
      } else {
        avgPrice = p.avgPrice || buyAvg || sellAvg || 0;
      }
      if (!avgPrice || isNaN(avgPrice)) {
        avgPrice = p.avgPrice || p.cfBuyAvg || buyAvg || sellAvg || 0;
      }

      const investedValue = absQty * avgPrice;
      const currentValue = absQty * ltp;

      // Exact formulas from reference implementation:
      // Today PNL = (ltp * netQty) + (sellVolume - buyVolume)
      // Net PNL = (ltp * netQty) + (sellVolumeNet - buyVolumeNet)
      const dayMtm = (ltp * p.netQty) + (rawSellVolume - rawBuyVolume);
      const liveMtm = (ltp * p.netQty) + (rawSellVolumeNet - rawBuyVolumeNet);

      const liveMtmPercent = investedValue > 0 ? (liveMtm / investedValue) * 100 : 0;
      const isProfit = liveMtm >= 0;

      return {
        ...p,
        ltp,
        buyAvg,
        sellAvg,
        avgPrice,
        dayChangePercent,
        investedValue,
        currentValue,
        liveMtm,
        dayMtm,
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
      await Promise.all([mutateOrders(), mutatePositions()]);
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
        const buyAvg = p.buyQty > 0 ? (p.buyVolume / p.buyQty) : p.buyAvg;
        const sellAvg = p.sellQty > 0 ? (p.sellVolume / p.sellQty) : p.sellAvg;
        const avgPrice = p.netQty > 0 ? (p.buyVolumeNet > 0 ? p.buyVolumeNet / p.buyQty : buyAvg) : (p.netQty < 0 ? (p.sellVolumeNet > 0 ? p.sellVolumeNet / p.sellQty : sellAvg) : (buyAvg || sellAvg || p.avgPrice));
        const inv = absQty * avgPrice;
        const curr = absQty * ltp;
        const dayMtm = (ltp * p.netQty) + ((p.sellVolume || 0) - (p.buyVolume || 0));
        const mtm = (ltp * p.netQty) + ((p.sellVolumeNet || 0) - (p.buyVolumeNet || 0));
        const mtmPct = inv > 0 ? (mtm / inv) * 100 : 0;
        return {
          'Account ID': p.actid,
          'Symbol': p.symbol,
          'Position Type': p.isCfClosedToday ? 'CF Closed Today' : p.isCarryForward ? 'Carry Forward' : 'Intraday',
          'Exchange': p.exch,
          'Product': formatProductCode(p.pcode),
          'Buy Qty': p.buyQty,
          'Buy Avg': buyAvg,
          'Buy Volume': p.buyVolume || 0,
          'Sell Qty': p.sellQty,
          'Sell Avg': sellAvg,
          'Sell Volume': p.sellVolume || 0,
          'Net Qty': p.netQty,
          'LTP': ltp,
          'Invested Value': inv,
          'Current Value': curr,
          'MTM': dayMtm,
          'Net PNL': mtm,
          'Net PNL %': `${mtmPct >= 0 ? '+' : ''}${mtmPct.toFixed(2)}%`,
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
              {/* Animated Live Feed Badge */}
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

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2">
            {/* Status Tabs including Carry Forward */}
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
              <button
                onClick={() => setStatusTab('CARRY_FORWARD')}
                className={cn("px-3 py-1 text-xs font-bold rounded-lg transition-colors", statusTab === 'CARRY_FORWARD' ? "bg-purple-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900")}
              >
                Carry Forward
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
                      {colKey === 'posType' ? 'Position Type' : colKey === 'todayPnl' ? 'MTM' : colKey === 'netPnl' ? 'Net PNL' : colKey === 'mtmPercent' ? 'Net PNL %' : colKey === 'buyAvg' ? 'Buy Avg' : colKey === 'buyVolume' ? 'Buy Volume' : colKey === 'sellAvg' ? 'Sell Avg' : colKey === 'sellVolume' ? 'Sell Volume' : colKey.replace(/([A-Z])/g, ' $1')}
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
          <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-[1350px]">
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
                    case 'posType':
                      titleNode = 'Pos Type';
                      sortKey = 'isCarryForward';
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
                    case 'buyVolume':
                      titleNode = 'Buy Volume';
                      sortKey = 'buyVolume';
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
                    case 'sellVolume':
                      titleNode = 'Sell Volume';
                      sortKey = 'sellVolume';
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
                    case 'todayPnl':
                      titleNode = 'MTM';
                      sortKey = 'dayMtm';
                      alignClass = 'text-right';
                      break;
                    case 'netPnl':
                      titleNode = 'Net PNL';
                      sortKey = 'liveMtm';
                      alignClass = 'text-right';
                      break;
                    case 'mtmPercent':
                      titleNode = 'Net PNL %';
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
                    <p className="font-semibold text-base">No positions found</p>
                    <p className="text-xs text-slate-400 mt-1">Try searching another account ID, symbol, or clearing filters</p>
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm tracking-tight">{pos.symbol}</span>
                                    {pos.isCfClosedToday && (
                                      <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                        <div className="w-1 h-1 rounded-full animate-pulse bg-amber-500" />
                                        CF CLOSED TODAY
                                      </div>
                                    )}
                                    {!pos.isCfClosedToday && pos.isCarryForward && isClosed && (
                                      <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500">
                                        <div className="w-1 h-1 rounded-full animate-pulse bg-slate-400" />
                                        CLOSED
                                      </div>
                                    )}
                                    {!pos.isCfClosedToday && !pos.isCarryForward && isClosed && (
                                      <div className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500">
                                        <div className="w-1 h-1 rounded-full animate-pulse bg-slate-400" />
                                        CLOSED
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'posType':
                            return (
                              <td key={colId} className="py-3.5 px-4">
                                {pos.isCfClosedToday ? (
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 inline-flex">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-amber-500 shrink-0" />
                                    CF CLOSED TODAY
                                  </div>
                                ) : pos.isCarryForward ? (
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 inline-flex">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-blue-500 shrink-0" />
                                    CARRY FORWARD
                                  </div>
                                ) : (
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-slate-400 shrink-0" />
                                    INTRADAY
                                  </div>
                                )}
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
                          case 'buyVolume':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                                {(pos.buyVolume || 0) > 0 ? `₹${fmt(pos.buyVolume || 0)}` : '-'}
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
                          case 'sellVolume':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400 font-mono">
                                {(pos.sellVolume || 0) > 0 ? `₹${fmt(pos.sellVolume || 0)}` : '-'}
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
                          case 'todayPnl':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-mono">
                                <span className={cn("font-bold text-sm", pos.dayMtm >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                  {pos.dayMtm >= 0 ? "+" : ""}₹{fmt(pos.dayMtm)}
                                </span>
                              </td>
                            );
                          case 'netPnl':
                            return (
                              <td key={colId} className="py-3.5 px-4 text-right font-mono">
                                <span className={cn("font-bold text-sm", pos.isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
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

