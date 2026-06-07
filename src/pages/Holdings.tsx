import { ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart, BarChart3, Landmark, Monitor, Hexagon, Leaf, Zap, Building2, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Holding {
  stock: string;
  ticker: string;
  icon: string;
  qty: number;
  avgPrice: number;
  ltp: number;
  sector: string;
}

const holdings: Holding[] = [
  { stock: "Reliance", ticker: "RELIANCE", icon: "₹", qty: 10, avgPrice: 2485.3, ltp: 2612.45, sector: "Energy" },
  { stock: "HDFC Bank", ticker: "HDFCBANK", icon: "Landmark", qty: 25, avgPrice: 1642.5, ltp: 1715.8, sector: "Banking" },
  { stock: "TCS", ticker: "TCS", icon: "Monitor", qty: 5, avgPrice: 3920.0, ltp: 3845.2, sector: "IT" },
  { stock: "Infosys", ticker: "INFY", icon: "Hexagon", qty: 15, avgPrice: 1876.2, ltp: 1924.5, sector: "IT" },
  { stock: "ITC", ticker: "ITC", icon: "Leaf", qty: 100, avgPrice: 452.75, ltp: 461.3, sector: "FMCG" },
  { stock: "Adani Power", ticker: "ADANIPOWER", icon: "Zap", qty: 50, avgPrice: 432.1, ltp: 418.65, sector: "Energy" },
  { stock: "SBI", ticker: "SBIN", icon: "Building2", qty: 30, avgPrice: 628.4, ltp: 651.2, sector: "Banking" },
  { stock: "Wipro", ticker: "WIPRO", icon: "Globe", qty: 20, avgPrice: 462.3, ltp: 478.9, sector: "IT" },
];

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sectorColors: Record<string, string> = {
  Energy: "bg-primary",
  Banking: "bg-accent",
  IT: "bg-foreground",
  FMCG: "bg-warning",
};

const Holdings = () => {
  const enriched = holdings.map((h) => {
    const invested = h.qty * h.avgPrice;
    const current = h.qty * h.ltp;
    const pnl = current - invested;
    const pnlPercent = (pnl / invested) * 100;
    return { ...h, invested, current, pnl, pnlPercent };
  });

  const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
  const totalCurrent = enriched.reduce((s, h) => s + h.current, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = (totalPnl / totalInvested) * 100;

  // Sector breakdown
  const sectorMap: Record<string, { invested: number; current: number }> = {};
  enriched.forEach((h) => {
    if (!sectorMap[h.sector]) sectorMap[h.sector] = { invested: 0, current: 0 };
    sectorMap[h.sector].invested += h.invested;
    sectorMap[h.sector].current += h.current;
  });
  const sectors = Object.entries(sectorMap).map(([name, v]) => ({
    name,
    value: v.current,
    percent: ((v.current / totalCurrent) * 100).toFixed(1),
    pnl: v.current - v.invested,
  }));

  // Top gainer & loser
  const sorted = [...enriched].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const topGainer = sorted[0];
  const topLoser = sorted[sorted.length - 1];

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Top summary section - Fixed */}
      <div className="shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 mb-10">
          {/* Left: Portfolio value */}
          <div className="space-y-0">
            <p className="text-xs text-muted-foreground mb-1.5">Portfolio Value</p>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-[40px] leading-none font-bold tracking-tight">
                ₹{fmt(totalCurrent).split(".")[0]}<span className="text-2xl">.{fmt(totalCurrent).split(".")[1]}</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md ${totalPnl >= 0 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
                {totalPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 py-5 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Invested</p>
                <p className="text-xl font-bold">₹{fmt(totalInvested)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Total P&L</p>
                <p className={`text-xl font-bold ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                  {totalPnl >= 0 ? "+" : ""}₹{fmt(totalPnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Day's P&L</p>
                <p className="text-xl font-bold text-success">+₹1,245.60</p>
                <p className="text-xs text-muted-foreground mt-0.5">+0.58%</p>
              </div>
            </div>

            {/* Top gainer / loser */}
            <div className="grid grid-cols-2 gap-4 py-5 border-t border-border">
              <div className="border border-success/20 bg-success/5 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Top Gainer</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-black rounded-full flex items-center justify-center text-white text-sm">
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
                  <div>
                    <p className="text-sm font-bold">{topGainer.stock}</p>
                    <p className="text-xs text-success font-semibold">+{topGainer.pnlPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
              <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Top Loser</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 bg-black rounded-full flex items-center justify-center text-white text-sm">
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
                  <div>
                    <p className="text-sm font-bold">{topLoser.stock}</p>
                    <p className="text-xs text-destructive font-semibold">{topLoser.pnlPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sector allocation */}
          <div className="space-y-5">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" /> Sector Allocation
            </h3>

            {/* Visual bar */}
            <div className="flex h-4 rounded-full overflow-hidden">
              {sectors.map((s) => (
                <div
                  key={s.name}
                  className={`${sectorColors[s.name] || "bg-muted"} first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${s.percent}%` }}
                />
              ))}
            </div>

            {/* Sector cards */}
            <div className="grid grid-cols-2 gap-3">
              {sectors.map((s) => (
                <div key={s.name} className="border border-border rounded-2xl p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-3 w-3 rounded-full ${sectorColors[s.name] || "bg-muted"}`} />
                    <p className="text-sm font-semibold">{s.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{s.percent}% allocation</p>
                    <p className={`text-xs font-semibold ${s.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {s.pnl >= 0 ? "+" : ""}₹{fmt(s.pnl)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings table section - Scrollable */}
      <div className="flex-1 min-h-0 flex flex-col pt-4 border-t border-border">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-4 shrink-0">
          <BarChart3 className="h-4 w-4 text-muted-foreground" /> All Holdings
        </h3>

        <ScrollArea className="flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border sticky top-0 bg-white z-10">
                <th className="text-left py-2.5 font-medium">Stock</th>
                <th className="text-left py-2.5 font-medium">Qty</th>
                <th className="text-left py-2.5 font-medium">Avg Price</th>
                <th className="text-left py-2.5 font-medium">LTP</th>
                <th className="text-left py-2.5 font-medium">Invested</th>
                <th className="text-left py-2.5 font-medium">Current</th>
                <th className="text-left py-2.5 font-medium">P&L</th>
                <th className="text-left py-2.5 font-medium">Allocation</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((h) => {
                const alloc = ((h.current / totalCurrent) * 100).toFixed(1);
                return (
                  <tr key={h.ticker} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white text-sm">
                          {h.icon === "₹" ? h.icon :
                            h.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                              h.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                                h.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                                  h.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                    h.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                      h.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                        <Globe className="h-4 w-4" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm">{h.stock}</p>
                          <p className="text-[11px] text-muted-foreground">{h.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-sm">{h.qty}</td>
                    <td className="py-3.5 text-sm">₹{fmt(h.avgPrice)}</td>
                    <td className="py-3.5 text-sm font-medium">₹{fmt(h.ltp)}</td>
                    <td className="py-3.5 text-sm">₹{fmt(h.invested)}</td>
                    <td className="py-3.5 text-sm">₹{fmt(h.current)}</td>
                    <td className="py-3.5">
                      <div>
                        <p className={`text-sm font-semibold ${h.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                          {h.pnl >= 0 ? "+" : ""}₹{fmt(h.pnl)}
                        </p>
                        <p className={`text-[11px] ${h.pnl >= 0 ? "text-success/70" : "text-destructive/70"}`}>
                          {h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${alloc}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{alloc}%</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Holdings;
