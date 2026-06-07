import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronRight, ArrowUpRight, ArrowDownRight, Filter,
  ChevronDown, Landmark, Hexagon, Monitor, Leaf, Zap,
  Building2, Globe, PackageOpen, AlertCircle, FileText
} from "lucide-react";
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';
import { cn } from "@/lib/utils";
import { format, subDays, isAfter, addMonths, subMonths, isBefore, startOfDay, endOfDay } from 'date-fns';

interface ClientTradeReportTabProps {
  clientCode: string;
  refreshKey?: number;
}

interface ApiTrade {
  name: string;
  traddt: string;
  bizdt: string;
  sgmt: string;
  xchg: string;
  tckrsymb: string;
  fininstrmnm: string;
  buysellind: string;
  tradqty: number;
  pric: number;
  traddttm: string;
}

interface ParsedTrade {
  id: string;
  stock: string;
  ticker: string;
  icon: string | React.ReactNode;
  side: "buy" | "sell";
  type: string;
  qty: number;
  price: string;
  time: string;
  date: string;
}

const enrichTradeIcon = (ticker: string) => {
  const upper = ticker.toUpperCase();
  if (upper.includes('NIFTY') || upper.includes('BANKNIFTY')) return "Monitor";
  if (upper.includes('RELIANCE')) return "Zap";
  if (upper.includes('HDFC') || upper.includes('SBI')) return "Landmark";
  if (upper.includes('TCS') || upper.includes('INFY')) return "Monitor";
  return "Hexagon";
};

const ClientTradeReportTab: React.FC<ClientTradeReportTabProps> = ({ clientCode, refreshKey }) => {
  const { token, logout } = useAuth();
  const [trades, setTrades] = useState<ParsedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default range: last 7 days
  const [dateRange, setDateRange] = useState<[Date, Date] | null>([
    subDays(new Date(), 7),
    new Date()
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchTrades = async () => {
      if (!token || !dateRange) return;
      setIsLoading(true);
      setError(null);

      try {
        const fromDate = format(dateRange[0], 'yyyy-MM-dd');
        const toDate = format(dateRange[1], 'yyyy-MM-dd');

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${API_BASE_URL}/api/method/rms.clientdetails.trade_report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token
          },
          body: JSON.stringify({
            client_code: clientCode,
            from_date: fromDate,
            to_date: toDate
          }),
          mode: 'cors',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
            logout();
            return;
          }
          throw new Error('Failed to fetch Trade Report');
        }

        const data = await response.json();

        if (data.message?.status === 'Ok' && Array.isArray(data.message?.data)) {
          const tradeData = data.message.data[0]?.trades || [];

          const parsed: ParsedTrade[] = tradeData.map((t: ApiTrade) => {
            const [dateStr, timeStr] = t.traddttm.split(' ');

            return {
              id: t.name,
              stock: t.tckrsymb,
              ticker: t.fininstrmnm,
              icon: enrichTradeIcon(t.fininstrmnm),
              side: t.buysellind === 'B' ? "buy" : "sell",
              type: t.sgmt,
              qty: t.tradqty,
              price: `₹${t.pric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              time: timeStr || "-",
              date: t.traddt
            };
          });

          if (isMounted) {
            setTrades(parsed);
            setIsLoading(false);
          }
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred while fetching trade report.');
          setIsLoading(false);
        }
      }
    };

    fetchTrades();

    return () => { isMounted = false; };
  }, [clientCode, token, logout, dateRange, refreshKey]);

  const handleDateChange = (value: [Date, Date] | null) => {
    if (value) {
      const [start, end] = value;
      // Enforce 2 month maximum range
      const maxDate = addMonths(start, 2);
      if (isAfter(end, maxDate)) {
        // You might want to show a toast here or just set it to the max range
        setDateRange([start, maxDate]);
        return;
      }
    }
    setDateRange(value);
  };

  if (isLoading && trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full animate-in fade-in h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header with Date Picker */}
      <div className="flex flex-wrap items-center justify-between mb-5 shrink-0 px-2 mt-4 space-y-4 md:space-y-0">
        <div className="flex items-center gap-4">
          <div className="w-[260px]">
            <DateRangePicker
              value={dateRange}
              onChange={handleDateChange}
              placeholder="Select Date Range"
              className="w-full bg-white border-slate-200 focus:ring-purple-500 rounded-xl custom-date-picker h-10 shadow-sm"
              appearance="default"
              block
              cleanable={false}
              shouldDisableDate={date => 
                isAfter(date, endOfDay(new Date())) || 
                isBefore(date, subMonths(startOfDay(new Date()), 2))
              }
              // Optional: Add custom ranges
              ranges={[
                { label: 'Today', value: [new Date(), new Date()] },
                { label: 'Last 7 Days', value: [subDays(new Date(), 7), new Date()] },
                { label: 'Last 30 Days', value: [subDays(new Date(), 30), new Date()] }
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors shrink-0 h-10">
            <Filter className="h-3 w-3" /> Filter
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center text-center w-full animate-in fade-in h-[400px]">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
            <AlertCircle size={32} />
          </div>
          <p className="text-slate-500 text-sm max-w-md">{error}</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center w-full animate-in fade-in h-[400px]">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <PackageOpen size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Trades Found</h3>
          <p className="text-slate-500 text-sm">No trades were recorded for the selected date range.</p>
        </div>
      ) : (
        <div className="flex-1 w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2.5 px-2 font-medium">Stock</th>
                <th className="text-left py-2.5 px-2 font-medium">Side</th>
                <th className="text-left py-2.5 px-2 font-medium">Type</th>
                <th className="text-left py-2.5 px-2 font-medium">Qty</th>
                <th className="text-left py-2.5 px-2 font-medium">Price</th>
                <th className="text-left py-2.5 px-2 font-medium">Time</th>
                <th className="text-left py-2.5 px-2 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                return (
                  <tr key={trade.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white text-sm shrink-0">
                          {trade.icon === "₹" ? trade.icon :
                            trade.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                              trade.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                                trade.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                                  trade.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                    trade.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                      trade.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                        <Globe className="h-4 w-4" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{trade.stock}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{trade.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trade.side === "buy" ? "text-success" : "text-destructive"}`}>
                        {trade.side === "buy" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{trade.type}</span>
                    </td>
                    <td className="py-3.5 px-2 text-sm font-bold">{trade.qty}</td>
                    <td className="py-3.5 px-2 text-sm font-medium">{trade.price}</td>
                    <td className="py-3.5 px-2">
                      <p className="text-xs font-medium text-slate-700">{trade.time}</p>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <p className="text-xs font-semibold text-slate-900 bg-slate-100/50 inline-block px-2.5 py-1 rounded-lg border border-slate-200">{trade.date}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientTradeReportTab;
