import { ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Landmark, Monitor, Hexagon, Leaf, Zap, Building2, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Position {
  stock: string;
  ticker: string;
  icon: string;
  qty: number;
  avgPrice: string;
  ltp: string;
  currentValue: string;
  investedValue: string;
  pnl: string;
  pnlPercent: string;
  dayChange: string;
  dayChangePercent: string;
  isProfit: boolean;
  isDayProfit: boolean;
}

const positions: Position[] = [
  { stock: "Reliance", ticker: "RELIANCE", icon: "₹", qty: 10, avgPrice: "₹2,485.30", ltp: "₹2,612.45", currentValue: "₹26,124.50", investedValue: "₹24,853.00", pnl: "+₹1,271.50", pnlPercent: "+5.11%", dayChange: "+₹42.30", dayChangePercent: "+1.65%", isProfit: true, isDayProfit: true },
  { stock: "HDFC Bank", ticker: "HDFCBANK", icon: "Landmark", qty: 25, avgPrice: "₹1,642.50", ltp: "₹1,715.80", currentValue: "₹42,895.00", investedValue: "₹41,062.50", pnl: "+₹1,832.50", pnlPercent: "+4.46%", dayChange: "+₹18.60", dayChangePercent: "+1.10%", isProfit: true, isDayProfit: true },
  { stock: "TCS", ticker: "TCS", icon: "Monitor", qty: 5, avgPrice: "₹3,920.00", ltp: "₹3,845.20", currentValue: "₹19,226.00", investedValue: "₹19,600.00", pnl: "-₹374.00", pnlPercent: "-1.91%", dayChange: "-₹32.80", dayChangePercent: "-0.85%", isProfit: false, isDayProfit: false },
  { stock: "Infosys", ticker: "INFY", icon: "Hexagon", qty: 15, avgPrice: "₹1,876.20", ltp: "₹1,924.50", currentValue: "₹28,867.50", investedValue: "₹28,143.00", pnl: "+₹724.50", pnlPercent: "+2.57%", dayChange: "+₹8.40", dayChangePercent: "+0.44%", isProfit: true, isDayProfit: true },
  { stock: "Adani Power", ticker: "ADANIPOWER", icon: "Zap", qty: 50, avgPrice: "₹432.10", ltp: "₹418.65", currentValue: "₹20,932.50", investedValue: "₹21,605.00", pnl: "-₹672.50", pnlPercent: "-3.11%", dayChange: "-₹14.20", dayChangePercent: "-3.28%", isProfit: false, isDayProfit: false },
  { stock: "SBI", ticker: "SBIN", icon: "Building2", qty: 30, avgPrice: "₹628.40", ltp: "₹651.20", currentValue: "₹19,536.00", investedValue: "₹18,852.00", pnl: "+₹684.00", pnlPercent: "+3.63%", dayChange: "+₹5.90", dayChangePercent: "+0.91%", isProfit: true, isDayProfit: true },
  { stock: "ITC", ticker: "ITC", icon: "Leaf", qty: 100, avgPrice: "₹452.75", ltp: "₹461.30", currentValue: "₹46,130.00", investedValue: "₹45,275.00", pnl: "+₹855.00", pnlPercent: "+1.89%", dayChange: "-₹2.10", dayChangePercent: "-0.45%", isProfit: true, isDayProfit: false },
  { stock: "Wipro", ticker: "WIPRO", icon: "Globe", qty: 20, avgPrice: "₹462.30", ltp: "₹478.90", currentValue: "₹9,578.00", investedValue: "₹9,246.00", pnl: "+₹332.00", pnlPercent: "+3.59%", dayChange: "+₹6.50", dayChangePercent: "+1.38%", isProfit: true, isDayProfit: true },
];

const totalCurrent = 213289.5;
const totalInvested = 208636.5;
const totalPnl = totalCurrent - totalInvested;
const totalPnlPercent = ((totalPnl / totalInvested) * 100).toFixed(2);
const todayPnl = 1245.6;

const PositionBook = () => {
  const profitCount = positions.filter((p) => p.isProfit).length;
  const lossCount = positions.filter((p) => !p.isProfit).length;

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* <h2 className="text-[32px] font-serif italic text-muted-foreground mb-8 text-center pt-4">Position Book</h2> */}

        {/* Top summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Total P&L Card */}
          <div className="bg-primary rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
            <div>
              <p className="text-xs text-primary-foreground/60 mb-1">Total P&L</p>
              <div className="flex items-center gap-3">
                <span className="text-[32px] font-bold leading-none text-primary-foreground">
                  +₹{totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="inline-flex items-center gap-1 bg-foreground/10 text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-md">
                  <TrendingUp className="h-3 w-3" /> +{totalPnlPercent}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-[10px] text-primary-foreground/50">Invested</p>
                <p className="text-sm font-semibold text-primary-foreground">₹{totalInvested.toLocaleString("en-IN")}</p>
              </div>
              <div className="h-6 w-px bg-primary-foreground/20" />
              <div>
                <p className="text-[10px] text-primary-foreground/50">Current</p>
                <p className="text-sm font-semibold text-primary-foreground">₹{totalCurrent.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Right summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1.5">Today's P&L</p>
              <p className="text-xl font-bold text-success dark:text-emerald-400">+₹{todayPnl.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-1">Unrealised</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1.5">In Profit</p>
              <p className="text-xl font-bold text-success dark:text-emerald-400">{profitCount}</p>
              <p className="text-xs text-muted-foreground mt-1">stocks</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1.5">In Loss</p>
              <p className="text-xl font-bold text-destructive dark:text-red-405">{lossCount}</p>
              <p className="text-xs text-muted-foreground mt-1">stocks</p>
            </div>
          </div>
        </div>

        {/* Positions table */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground dark:text-slate-100">Open Positions</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground dark:text-slate-400 border-b border-border dark:border-slate-800">
                <th className="text-left py-2.5 font-medium">Stock</th>
                <th className="text-left py-2.5 font-medium">Qty</th>
                <th className="text-left py-2.5 font-medium">Avg Price</th>
                <th className="text-left py-2.5 font-medium">LTP</th>
                <th className="text-left py-2.5 font-medium">Current Value</th>
                <th className="text-left py-2.5 font-medium">P&L</th>
                <th className="text-left py-2.5 font-medium">Day Change</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.ticker} className="border-b border-border dark:border-slate-800 last:border-0 hover:bg-muted/30 dark:hover:bg-slate-850/40 transition-colors cursor-pointer">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 bg-black dark:bg-slate-800 rounded-full flex items-center justify-center text-white dark:text-slate-200 text-sm">
                        {pos.icon === "₹" ? pos.icon :
                          pos.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                            pos.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                              pos.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                                pos.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                  pos.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                    pos.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                      <Globe className="h-4 w-4" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground dark:text-slate-100">{pos.stock}</p>
                        <p className="text-[11px] text-muted-foreground dark:text-slate-400">{pos.ticker}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-sm text-foreground dark:text-slate-200">{pos.qty}</td>
                  <td className="py-3.5 text-sm text-foreground dark:text-slate-200">{pos.avgPrice}</td>
                  <td className="py-3.5 text-sm font-medium text-foreground dark:text-slate-100">{pos.ltp}</td>
                  <td className="py-3.5 text-sm text-foreground dark:text-slate-200">{pos.currentValue}</td>
                  <td className="py-3.5">
                    <div>
                      <p className={`text-sm font-semibold ${pos.isProfit ? "text-success dark:text-emerald-400" : "text-destructive dark:text-red-405"}`}>
                        {pos.pnl}
                      </p>
                      <p className={`text-[11px] ${pos.isProfit ? "text-success/70 dark:text-emerald-400/70" : "text-destructive/70 dark:text-red-405/70"}`}>
                        {pos.pnlPercent}
                      </p>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos.isDayProfit ? "text-success dark:text-emerald-400" : "text-destructive dark:text-red-405"}`}>
                      {pos.isDayProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {pos.dayChangePercent}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-slate-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
};

export default PositionBook;
