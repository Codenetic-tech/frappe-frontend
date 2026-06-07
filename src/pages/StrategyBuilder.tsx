import { useState } from "react";
import {
    Save,
    Play,
    Zap,
    Plus,
    Trash2,
    ChevronDown,
    LineChart,
    BarChart3,
    Activity,
    Target,
    ShieldAlert,
    TrendingUp,
    Download,
    Filter,
    ArrowLeft,
    ChevronRight,
    Maximize2,
    Clock,
    Layers,
    Info
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// --- Types ---
type Condition = {
    id: string;
    indicator: string;
    operator: string;
    value: string;
    logic?: "AND" | "OR";
};

// --- Mock Data ---
const indicators = ["RSI", "MACD", "EMA (20)", "SMA (50)", "Bollinger Bands", "VWAP", "Supertrend"];
const operators = [">", "<", "Crosses Above", "Crosses Below", "Equals"];

const backtestResults = [
    { id: 1, date: "2024-03-01 10:30", symbol: "RELIANCE", type: "BUY", price: "2980.50", pnl: "+15.20", status: "Closed" },
    { id: 2, date: "2024-03-01 14:15", symbol: "RELIANCE", type: "SELL", price: "3005.10", pnl: "+24.60", status: "Closed" },
    { id: 3, date: "2024-03-02 09:45", symbol: "HDFCBANK", type: "BUY", price: "1420.00", pnl: "-5.40", status: "Closed" },
    { id: 4, date: "2024-03-02 11:20", symbol: "TCS", type: "BUY", price: "4122.00", pnl: "+45.00", status: "Open" },
];

const StrategyBuilder = () => {
    const [strategyName, setStrategyName] = useState("Alpha Breakout V2");
    const [entryConditions, setEntryConditions] = useState<Condition[]>([
        { id: "1", indicator: "RSI", operator: "Crosses Above", value: "30" }
    ]);
    const [isBacktestCollapsed, setIsBacktestCollapsed] = useState(false);

    const addCondition = () => {
        const newCond: Condition = {
            id: Math.random().toString(36).substr(2, 9),
            indicator: "EMA (20)",
            operator: ">",
            value: "0",
            logic: "AND"
        };
        setEntryConditions([...entryConditions, newCond]);
    };

    const removeCondition = (id: string) => {
        setEntryConditions(entryConditions.filter(c => c.id !== id));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* 1️⃣ Top Navigation Bar */}
            <nav className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 tracking-wider">
                            <span>DASHBOARD</span>
                            <ChevronRight className="h-3 w-3" />
                            <span>STRATEGIES</span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-primary italic">NEW STRATEGY</span>
                        </div>
                        <input
                            value={strategyName}
                            onChange={(e) => setStrategyName(e.target.value)}
                            className="text-lg font-bold bg-transparent border-none p-0 focus:ring-0 text-slate-900 w-64"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                        <Save className="h-4 w-4" /> Save
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                        <Play className="h-4 w-4" /> Backtest
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">
                        <Zap className="h-4 w-4 fill-white" /> Deploy Strategy
                    </button>
                </div>
            </nav>

            {/* Main Content Areas */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* 2️⃣ Left Panel – Strategy Configuration */}
                <ScrollArea className="w-[320px] bg-white border-r border-slate-100 shrink-0">
                    <div className="p-5 space-y-8">
                        {/* Strategy Details */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                Configuration <Layers className="h-3 w-3" />
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Strategy Type</label>
                                    <div className="relative">
                                        <select className="w-full bg-slate-50 border-0 rounded-xl px-3.5 py-2.5 text-sm appearance-none focus:ring-1 focus:ring-primary outline-none">
                                            <option>Intraday</option>
                                            <option>Positional</option>
                                            <option>Options Scalping</option>
                                            <option>Futures Trend</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Capital Allocation</label>
                                    <div className="relative">
                                        <input type="number" defaultValue="100000" className="w-full bg-slate-50 border-0 rounded-xl px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none" />
                                        <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400">INR</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-500">Risk per Trade</label>
                                        <span className="text-xs font-bold text-primary">1.5%</span>
                                    </div>
                                    <input type="range" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary" />
                                </div>
                            </div>
                        </section> section

                        {/* Entry Conditions */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entry Conditions</h3>
                            <div className="space-y-3">
                                {entryConditions.map((cond, index) => (
                                    <div key={cond.id} className="group relative">
                                        {index > 0 && (
                                            <div className="flex justify-center -mt-1.5 -mb-1.5 z-10 relative">
                                                <span className="bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">AND</span>
                                            </div>
                                        )}
                                        <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 border border-transparent hover:border-slate-200 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">RULE #{index + 1}</span>
                                                <button onClick={() => removeCondition(cond.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <select className="w-full bg-white border-0 rounded-lg px-2 py-1.5 text-xs font-medium outline-none shadow-sm">
                                                {indicators.map(ind => <option key={ind}>{ind}</option>)}
                                            </select>
                                            <select className="w-full bg-white border-0 rounded-lg px-2 py-1.5 text-xs font-medium outline-none shadow-sm">
                                                {operators.map(op => <option key={op}>{op}</option>)}
                                            </select>
                                            <input type="text" defaultValue={cond.value} className="w-full bg-white border-0 rounded-lg px-2 py-1.5 text-xs font-bold outline-none shadow-sm" />
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={addCondition}
                                    className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-all"
                                >
                                    <Plus className="h-4 w-4" /> Add Condition
                                </button>
                            </div>
                        </section>

                        {/* Exit Conditions */}
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exit Conditions</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Stop Loss</label>
                                        <div className="flex items-center gap-1">
                                            <input type="text" defaultValue="2.0" className="bg-transparent border-0 p-0 text-sm font-bold w-full outline-none" />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Target</label>
                                        <div className="flex items-center gap-1">
                                            <input type="text" defaultValue="5.0" className="bg-transparent border-0 p-0 text-sm font-bold w-full outline-none" />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs font-semibold text-slate-700">Trailing Stop Loss</span>
                                    <div className="w-8 h-4 bg-primary rounded-full relative cursor-pointer">
                                        <div className="absolute right-0.5 top-0.5 h-3 w-3 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </ScrollArea>

                {/* Main Section Inner */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* 3️⃣ Main Panel – Chart & Visualization */}
                    <div className="flex-1 relative bg-white m-3 rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <header className="p-4 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">RELIANCE</span>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">NSE</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                                    {["1m", "5m", "15m", "1H", "D"].map(tf => (
                                        <button key={tf} className={`px-2 py-0.5 rounded text-[10px] font-bold ${tf === "15m" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                                    <Maximize2 className="h-4 w-4" />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] relative">
                            {/* Chart Mockup */}
                            <div className="w-[90%] h-[70%] flex flex-col gap-4">
                                <div className="flex-1 flex items-end justify-between gap-1 overflow-hidden px-4">
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <div key={i} className="flex flex-col items-center gap-0.5 w-full">
                                            <div className={`w-full bg-slate-100/50 rounded-sm mb-1`} style={{ height: `${20 + Math.random() * 40}%` }} />
                                            <div className="w-[3px] bg-slate-300 rounded-full" style={{ height: `${10 + Math.random() * 20}px` }} />
                                            <div className={`w-[8px] rounded-sm ${Math.random() > 0.5 ? "bg-emerald-500/80" : "bg-rose-500/80"}`} style={{ height: `${Math.random() * 50 + 20}px` }} />
                                            <div className="w-[3px] bg-slate-300 rounded-full" style={{ height: `${10 + Math.random() * 20}px` }} />
                                        </div>
                                    ))}
                                </div>
                                {/* Strategy Indicators Overlay */}
                                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center px-4">
                                    <svg className="w-full h-[60%] opacity-20" viewBox="0 0 1000 200">
                                        <path d="M0,100 C100,20 200,180 300,50 C400,20 500,150 600,80 C700,50 800,120 900,10 1000,100" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
                                        <path d="M0,150 C100,130 200,160 300,140 C400,120 500,160 600,130 C700,110 800,150 900,120 1000,150" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300" />
                                    </svg>
                                    {/* Signal Markers */}
                                    <div className="absolute top-[40%] left-[30%] bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce">BUY</div>
                                    <div className="absolute top-[20%] left-[80%] bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce">SELL</div>
                                </div>
                            </div>

                            {/* Floating Toolbar */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-2xl flex items-center gap-4 border border-white/10 shadow-2xl">
                                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <LineChart className="h-4 w-4" /> <span className="text-[10px] font-bold">CANDLES</span>
                                </button>
                                <div className="h-4 w-px bg-white/10" />
                                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Activity className="h-4 w-4" /> <span className="text-[10px] font-bold">INDICATORS</span>
                                </button>
                                <div className="h-4 w-px bg-white/10" />
                                <button className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <Clock className="h-4 w-4" /> <span className="text-[10px] font-bold">REPLAY</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 5️⃣ Bottom Panel – Backtest Results (Collapsible) */}
                    <div className={`mx-3 mb-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all duration-300 ${isBacktestCollapsed ? "h-12" : "h-64"}`}>
                        <header className="p-3 border-b border-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-bold uppercase tracking-wider">Backtest Results</h3>
                                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold ml-2">86% Success</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-100">
                                    <Download className="h-3 w-3" /> EXPORT CSV
                                </button>
                                <button
                                    onClick={() => setIsBacktestCollapsed(!isBacktestCollapsed)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isBacktestCollapsed ? "rotate-180" : ""}`} />
                                </button>
                            </div>
                        </header>

                        {!isBacktestCollapsed && (
                            <ScrollArea className="flex-1">
                                <div className="p-4">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <th className="pb-3 px-2">Timestamp</th>
                                                <th className="pb-3 px-2">Symbol</th>
                                                <th className="pb-3 px-2">Side</th>
                                                <th className="pb-3 px-2">Fill Price</th>
                                                <th className="pb-3 px-2">Net P&L</th>
                                                <th className="pb-3 px-2">State</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs">
                                            {backtestResults.map((row) => (
                                                <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 px-2 text-slate-500 font-medium">{row.date}</td>
                                                    <td className="py-3 px-2 font-bold">{row.symbol}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`font-black tracking-tighter ${row.type === "BUY" ? "text-emerald-500" : "text-rose-500"}`}>{row.type}</span>
                                                    </td>
                                                    <td className="py-3 px-2 font-semibold">₹{row.price}</td>
                                                    <td className={`py-3 px-2 font-bold ${row.pnl.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>{row.pnl}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${row.status === "Closed" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        )}
                    </div>
                </div>

                {/* 4️⃣ Right Panel – Performance Preview */}
                <ScrollArea className="w-[280px] bg-white border-l border-slate-100 shrink-0">
                    <div className="p-5 space-y-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                            Performance <BarChart3 className="h-3.5 w-3.5 text-primary" />
                        </h3>

                        {/* Performance Cards Container */}
                        <div className="space-y-3">
                            {[
                                { label: "Expectancy (Win Rate)", val: "72.4%", icon: Target, trend: "+4%", color: "text-emerald-500", bg: "bg-emerald-50" },
                                { label: "Profit Factor", val: "2.84", icon: TrendingUp, trend: "Excellent", color: "text-emerald-500", bg: "bg-emerald-50" },
                                { label: "Max Drawdown", val: "4.2%", icon: ShieldAlert, trend: "Stable", color: "text-rose-500", bg: "bg-rose-50" },
                                { label: "Sharpe Ratio", val: "1.95", icon: Activity, trend: "High Efficiency", color: "text-blue-500", bg: "bg-blue-50" },
                                { label: "Expected Returns", val: "₹18.5k", icon: BarChart3, trend: "Per Month", color: "text-primary", bg: "bg-primary/10" },
                            ].map((metric) => (
                                <div key={metric.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-default group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-1.5 ${metric.bg} rounded-lg ${metric.color}`}>
                                            <metric.icon className="h-4 w-4" />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase ${metric.color}`}>
                                            {metric.trend}
                                        </span>
                                    </div>
                                    <h4 className="text-[10px] font-bold text-slate-400 mb-0.5">{metric.label}</h4>
                                    <p className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">{metric.val}</p>
                                </div>
                            ))}
                        </div>

                        {/* Tiny Capital Curve */}
                        <div className="bg-slate-900 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equity Curve</h4>
                                <p className="text-sm font-bold text-white mt-1">₹1,24,500.00</p>
                            </div>
                            <div className="h-16 flex items-end gap-1 px-1 relative z-10">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="flex-1 bg-primary/40 rounded-t-sm hover:bg-primary transition-all cursor-pointer" style={{ height: `${20 + (i * 7) + (Math.random() * 15)}%` }} />
                                ))}
                            </div>
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                        </div>

                        <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2">
                                <Info className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Note</span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-400">
                                Performance data is based on historical backtesting using paper-trade execution simulation. Actual results may vary due to slippage and market dynamics.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default StrategyBuilder;
