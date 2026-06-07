import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronRight, TrendingUp, TrendingDown, PieChart,
  BarChart3, Landmark, Monitor, Hexagon, Leaf, Zap,
  Building2, Globe, PackageOpen, AlertCircle, AlertTriangle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientHoldingsTabProps {
  clientCode: string;
  refreshKey?: number;
}

interface ApiHolding {
  name: string;
  nse_tsym?: string;
  bse_tsym?: string;
  npoadqty?: string;
  upload_prc?: string;
  close_prc?: string;
}

interface ParsedHolding {
  stock: string;
  ticker: string;
  icon: string | React.ReactNode;
  qty: number;
  avgPrice: number;
  ltp: number;
  sector: string;
  invested: number;
  current: number;
  pnl: number;
  pnlPercent: number;
}

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sectorColors: Record<string, string> = {
  Energy: "bg-primary",
  Banking: "bg-accent",
  IT: "bg-foreground",
  FMCG: "bg-warning",
  Others: "bg-muted-foreground",
};

// Helper to assign pseudo-data to API holding so it matches Holdings.tsx perfectly
const enrichStockMetadata = (ticker: string) => {
  const upper = ticker.toUpperCase();
  if (upper.includes('RELIANCE') || upper.includes('ADANI') || upper.includes('POWER')) return { icon: "Zap", sector: "Energy" };
  if (upper.includes('HDFC') || upper.includes('SBI') || upper.includes('BANK')) return { icon: "Landmark", sector: "Banking" };
  if (upper.includes('TCS') || upper.includes('INFY') || upper.includes('WIPRO')) return { icon: "Monitor", sector: "IT" };
  if (upper.includes('ITC') || upper.includes('TATA') || upper.includes('RENUKA')) return { icon: "Leaf", sector: "FMCG" };
  return { icon: "Hexagon", sector: "Others" };
};

const ClientHoldingsTab: React.FC<ClientHoldingsTabProps> = ({ clientCode, refreshKey }) => {
  const { token, logout } = useAuth();
  const [holdings, setHoldings] = useState<ParsedHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHoldings = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);

      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${API_BASE_URL}/api/method/rms.clientdetails.holdings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token
          },
          body: JSON.stringify({ client_code: clientCode }),
          mode: 'cors',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
            logout();
            return;
          }
          throw new Error('Failed to fetch Holdings');
        }

        const data = await response.json();

        if (data.message?.status === 'Ok' && Array.isArray(data.message?.data)) {
          const holdData = data.message.data[0]?.holdings || [];

          const parsed: ParsedHolding[] = holdData.map((h: ApiHolding) => {
            const rawTicker = h.nse_tsym || h.bse_tsym || h.name || "UNKNOWN";
            const ticker = rawTicker.replace('-EQ', '');
            const stock = ticker.substring(0, 15);

            const meta = enrichStockMetadata(ticker);
            const qty = Math.abs(parseFloat(h.npoadqty || "0"));
            const avgPrice = Math.abs(parseFloat(h.upload_prc || "0"));

            let ltp = parseFloat(h.close_prc || "0");
            if (ltp > 0 && ltp > avgPrice * 10) ltp = ltp / 100;

            const invested = qty * avgPrice;
            const current = qty * ltp;
            const pnl = current - invested;
            const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

            return {
              stock,
              ticker,
              icon: meta.icon,
              sector: meta.sector,
              qty,
              avgPrice,
              ltp,
              invested,
              current,
              pnl,
              pnlPercent
            };
          }).filter((h: ParsedHolding) => h.qty > 0 || h.invested > 0);

          if (isMounted) {
            setHoldings(parsed);
            setIsLoading(false);
          }
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred while fetching holdings.');
          setIsLoading(false);
        }
      }
    };

    fetchHoldings();

    return () => { isMounted = false; };
  }, [clientCode, token, logout, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 w-full animate-in fade-in h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full animate-in fade-in h-[500px]">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center w-full animate-in fade-in h-[500px]">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <PackageOpen size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Holdings Found</h3>
        <p className="text-slate-500 text-sm">Portfolio holdings for {clientCode} are empty.</p>
      </div>
    );
  }

  const totalInvested = holdings.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.current, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Sector breakdown
  const sectorMap: Record<string, { invested: number; current: number }> = {};
  holdings.forEach((h) => {
    if (!sectorMap[h.sector]) sectorMap[h.sector] = { invested: 0, current: 0 };
    sectorMap[h.sector].invested += h.invested;
    sectorMap[h.sector].current += h.current;
  });
  const sectors = Object.entries(sectorMap).map(([name, v]) => ({
    name,
    value: v.current,
    percent: totalCurrent > 0 ? ((v.current / totalCurrent) * 100).toFixed(1) : "0",
    pnl: v.current - v.invested,
  })).sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

  // Top gainer & loser
  const sorted = [...holdings].filter(h => h.invested > 0).sort((a, b) => b.pnlPercent - a.pnlPercent);
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  return (
    <div className="p-2 h-full flex flex-col w-full animate-in fade-in duration-500 overflow-visible">
      {/* Top summary section */}
      <div className="shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 mb-10">
          {/* Left: Portfolio value */}
          <div className="space-y-0">
            <p className="text-xs text-muted-foreground mb-1.5 font-sans">Portfolio Value</p>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-[40px] leading-none font-bold tracking-tight">
                ₹{fmt(totalCurrent).split(".")[0]}<span className="text-2xl">.{fmt(totalCurrent).split(".")[1]}</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md ${totalPnl >= 0 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                {totalPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 py-5 border-t border-border mt-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-sans">Invested</p>
                <p className="text-xl font-bold">₹{fmt(totalInvested)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-sans">Total P&L</p>
                <p className={`text-xl font-bold ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalPnl >= 0 ? "+" : ""}₹{fmt(totalPnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-sans">Day's P&L</p>
                <p className="text-xl font-bold text-success">-</p>
                <p className="text-xs text-muted-foreground mt-0.5">-</p>
              </div>
            </div>

            {/* Top Movers */}
            {topGainer && topLoser && (
              <div className="grid grid-cols-2 gap-4 py-5 border-t border-border mt-auto">
                <div className="border border-success/20 bg-success/5 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Top Gainer</p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-black rounded-full flex items-center justify-center text-white text-sm shrink-0">
                      {topGainer.icon === "₹" ? "₹" :
                        topGainer.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                          topGainer.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                            topGainer.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                              topGainer.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                topGainer.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                  topGainer.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                    <Globe className="h-4 w-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{topGainer.stock}</p>
                      <p className="text-xs text-success font-semibold">+{topGainer.pnlPercent.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
                <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Top Loser</p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-black rounded-full flex items-center justify-center text-white text-sm shrink-0">
                      {topLoser.icon === "₹" ? "₹" :
                        topLoser.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                          topLoser.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                            topLoser.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                              topLoser.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                topLoser.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                  topLoser.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                    <Globe className="h-4 w-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{topLoser.stock}</p>
                      <p className="text-xs text-destructive font-semibold">{topLoser.pnlPercent.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Allocation Grid */}
          <div className="space-y-4 flex flex-col min-w-0">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" /> Allocation
            </h3>

            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] auto-rows-max gap-1.5 w-full">
              {[...holdings].sort((a, b) => b.current - a.current).slice(0, 8).map((h, idx) => {
                const allocPercent = totalCurrent > 0 ? ((h.current / totalCurrent) * 100).toFixed(1) : "0";
                const iconEle = h.icon === "₹" ? "₹" :
                  h.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                    h.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                      h.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                        h.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                          h.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                            h.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                              <Globe className="h-4 w-4" />;
                const pattern = idx % 8;

                if (pattern === 0) return (
                  <div key={h.ticker} className="row-span-2 bg-primary text-primary-foreground rounded-xl p-3 flex flex-col justify-between min-h-[130px] overflow-hidden min-w-0">
                    <div>
                      <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white shrink-0 text-sm">{iconEle}</div>
                      <p className="font-semibold mt-2 text-[13px] truncate w-full">{h.stock}</p>
                    </div>
                    <div className="mt-auto overflow-hidden">
                      <span className="text-base font-bold truncate block w-full">₹{fmt(h.current).split('.')[0]}</span>
                      <span className="text-[11px] opacity-70 block">{allocPercent}%</span>
                    </div>
                  </div>
                );
                if (pattern === 1) return (
                  <div key={h.ticker} className="col-span-2 border border-border rounded-xl p-3 bg-card min-w-0 overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-1 w-full relative">
                      <div className="h-6 w-6 bg-black rounded-lg flex items-center justify-center text-white shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{iconEle}</div>
                      <span className="text-[13px] font-semibold truncate flex-1 block min-w-0">{h.stock}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between w-full overflow-hidden gap-2">
                      <span className="font-bold truncate flex-1 text-sm">₹{fmt(h.current).split('.')[0]}</span>
                      <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{allocPercent}%</span>
                    </div>
                  </div>
                );
                if (pattern === 2 || pattern === 3) return (
                  <div key={h.ticker} className="border border-border rounded-xl p-2.5 bg-card flex flex-col justify-between min-h-[70px] min-w-0 overflow-hidden">
                    <div className="w-full">
                      <div className="flex items-center gap-1.5 mb-0.5 w-full">
                        <div className="h-6 w-6 bg-black rounded-lg flex items-center justify-center text-white shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{iconEle}</div>
                        <span className="text-[11px] font-bold truncate flex-1 block min-w-0">{h.stock}</span>
                      </div>
                    </div>
                    <p className="text-[13px] mt-1 flex items-center justify-between w-full shrink-0 gap-1"><span className="font-bold truncate flex-1">₹{fmt(h.current).split('.')[0]}</span> <span className="text-muted-foreground text-[10px] font-semibold shrink-0">{allocPercent}%</span></p>
                  </div>
                );
                if (pattern === 4) return (
                  <div key={h.ticker} className="row-span-2 bg-primary text-primary-foreground rounded-xl p-3 flex flex-col justify-between min-h-[130px] overflow-hidden min-w-0">
                    <div>
                      <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white shrink-0 text-sm">{iconEle}</div>
                      <p className="font-semibold mt-2 text-[13px] truncate w-full">{h.stock}</p>
                    </div>
                    <div className="mt-auto overflow-hidden">
                      <span className="text-base font-bold truncate block w-full">₹{fmt(h.current).split('.')[0]}</span>
                      <span className="text-[11px] opacity-70 block">{allocPercent}%</span>
                    </div>
                  </div>
                );
                if (pattern === 5 || pattern === 6) return (
                  <div key={h.ticker} className="border border-border rounded-xl p-2.5 bg-card relative flex flex-col justify-between min-h-[70px] min-w-0 overflow-hidden">
                    {h.pnl < 0 && <AlertTriangle className="absolute top-2 right-2 h-3 w-3 text-destructive" />}
                    <div className="w-full">
                      <div className="h-6 w-6 bg-black rounded-lg flex items-center justify-center text-white mb-0.5 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{iconEle}</div>
                      <p className="text-[11px] font-bold truncate w-full pr-4">{h.stock}</p>
                    </div>
                    <p className="text-[13px] mt-1 flex items-center justify-between w-full gap-1"><span className="font-bold truncate flex-1">₹{fmt(h.current).split('.')[0]}</span> <span className="text-muted-foreground font-semibold text-[10px] shrink-0">{allocPercent}%</span></p>
                  </div>
                );
                if (pattern === 7) return (
                  <div key={h.ticker} className="col-span-2 border border-border rounded-xl p-2.5 bg-card flex items-center justify-between min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <div className="h-6 w-6 bg-black rounded-lg flex items-center justify-center text-white shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{iconEle}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate w-full">{h.stock}</p>
                      </div>
                    </div>
                    <p className="text-[13px] shrink-0 flex gap-1 items-center"><span className="font-bold max-w-[60%] truncate">₹{fmt(h.current).split('.')[0]}</span> <span className="text-muted-foreground font-semibold text-[10px] shrink-0">{allocPercent}%</span></p>
                  </div>
                );
                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings table section - Scrollable */}
      <div className="flex-1 flex flex-col">

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
              <tr className="text-xs text-muted-foreground border-b border-border bg-white z-10 w-full">
                <th className="text-left py-2.5 px-2 font-medium">Stock</th>
                <th className="text-left py-2.5 px-2 font-medium">Qty</th>
                <th className="text-left py-2.5 px-2 font-medium">Avg Price</th>
                <th className="text-left py-2.5 px-2 font-medium">LTP</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Invested</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Last day closing</th>
                <th className="text-left py-2.5 px-2 font-medium">P&L</th>
                <th className="text-left py-2.5 px-2 font-medium hidden lg:table-cell">Allocation</th>
                <th className="py-2.5 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const alloc = totalCurrent > 0 ? ((h.current / totalCurrent) * 100).toFixed(1) : "0";
                return (
                  <tr key={h.ticker} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer w-full">
                    <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white text-sm shrink-0">
                          {h.icon === "₹" ? "₹" :
                            h.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                              h.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                                h.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                                  h.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                    h.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                      h.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                        <Globe className="h-4 w-4" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{h.stock}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{h.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-sm">{h.qty}</td>
                    <td className="py-3.5 px-2 text-sm">₹{fmt(h.avgPrice)}</td>
                    <td className="py-3.5 px-2 text-sm font-medium">₹{fmt(h.ltp)}</td>
                    <td className="py-3.5 px-2 text-sm hidden md:table-cell">₹{fmt(h.invested)}</td>
                    <td className="py-3.5 px-2 text-sm hidden md:table-cell">₹{fmt(h.current)}</td>
                    <td className="py-3.5 px-2">
                      <div>
                        <p className={`text-sm font-semibold ${h.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {h.pnl >= 0 ? "+" : ""}₹{fmt(h.pnl)}
                        </p>
                        <p className={`text-[11px] ${h.pnl >= 0 ? "text-success/70" : "text-destructive/70"}`}>
                          {h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${alloc}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{alloc}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientHoldingsTab;
