import React, { useState } from "react";
import { Search, Plus, Info, BarChart2, ChevronUp, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Stock Data for each predefined watchlist ---
interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
}

const nifty50Stocks: Stock[] = [
  { symbol: "RELIANCE", name: "Reliance Ind.", ltp: 2612.45, change: 42.30, changePercent: 1.65 },
  { symbol: "TCS", name: "Tata Consultancy", ltp: 3845.20, change: -32.80, changePercent: -0.85 },
  { symbol: "HDFCBANK", name: "HDFC Bank", ltp: 1715.80, change: 18.60, changePercent: 1.10 },
  { symbol: "INFY", name: "Infosys Ltd.", ltp: 1924.50, change: 8.40, changePercent: 0.44 },
  { symbol: "ICICIBANK", name: "ICICI Bank", ltp: 1052.30, change: -5.20, changePercent: -0.49 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", ltp: 2534.10, change: 12.90, changePercent: 0.51 },
  { symbol: "ITC", name: "ITC Ltd.", ltp: 461.30, change: -2.10, changePercent: -0.45 },
  { symbol: "SBIN", name: "State Bank of India", ltp: 651.20, change: 5.90, changePercent: 0.91 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", ltp: 1182.40, change: 22.50, changePercent: 1.94 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra", ltp: 1745.60, change: -8.30, changePercent: -0.47 },
];

const bankNiftyStocks: Stock[] = [
  { symbol: "HDFCBANK", name: "HDFC Bank", ltp: 1715.80, change: 18.60, changePercent: 1.10 },
  { symbol: "ICICIBANK", name: "ICICI Bank", ltp: 1052.30, change: -5.20, changePercent: -0.49 },
  { symbol: "SBIN", name: "State Bank of India", ltp: 651.20, change: 5.90, changePercent: 0.91 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra", ltp: 1745.60, change: -8.30, changePercent: -0.47 },
  { symbol: "AXISBANK", name: "Axis Bank", ltp: 1098.50, change: 14.20, changePercent: 1.31 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", ltp: 1432.80, change: -18.40, changePercent: -1.27 },
  { symbol: "BANKBARODA", name: "Bank of Baroda", ltp: 248.60, change: 3.10, changePercent: 1.26 },
  { symbol: "PNB", name: "Punjab Natl Bank", ltp: 102.35, change: 1.45, changePercent: 1.44 },
  { symbol: "FEDERALBNK", name: "Federal Bank", ltp: 158.90, change: -0.80, changePercent: -0.50 },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank", ltp: 78.40, change: 2.10, changePercent: 2.75 },
];

const sensexStocks: Stock[] = [
  { symbol: "RELIANCE", name: "Reliance Ind.", ltp: 2612.45, change: 42.30, changePercent: 1.65 },
  { symbol: "TCS", name: "Tata Consultancy", ltp: 3845.20, change: -32.80, changePercent: -0.85 },
  { symbol: "HDFCBANK", name: "HDFC Bank", ltp: 1715.80, change: 18.60, changePercent: 1.10 },
  { symbol: "INFY", name: "Infosys Ltd.", ltp: 1924.50, change: 8.40, changePercent: 0.44 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", ltp: 2534.10, change: 12.90, changePercent: 0.51 },
  { symbol: "ITC", name: "ITC Ltd.", ltp: 461.30, change: -2.10, changePercent: -0.45 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", ltp: 7240.80, change: 85.60, changePercent: 1.20 },
  { symbol: "MARUTI", name: "Maruti Suzuki", ltp: 10820.50, change: -120.30, changePercent: -1.10 },
  { symbol: "LT", name: "Larsen & Toubro", ltp: 3452.70, change: 28.40, changePercent: 0.83 },
  { symbol: "SUNPHARMA", name: "Sun Pharma", ltp: 1165.30, change: -6.80, changePercent: -0.58 },
];

interface WatchlistTab {
  id: string;
  name: string;
  stocks: Stock[];
}

const defaultWatchlists: WatchlistTab[] = [
  { id: "nifty50", name: "Nifty 50", stocks: nifty50Stocks },
  { id: "banknifty", name: "Bank Nifty", stocks: bankNiftyStocks },
  { id: "sensex", name: "Sensex", stocks: sensexStocks },
];

const Watchlist = () => {
  const [watchlists, setWatchlists] = useState<WatchlistTab[]>(defaultWatchlists);
  const [activeTab, setActiveTab] = useState("nifty50");
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeWatchlist = watchlists.find((w) => w.id === activeTab);
  const filteredStocks = activeWatchlist?.stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddWatchlist = () => {
    const newId = `custom_${Date.now()}`;
    const newName = `Watchlist ${watchlists.length + 1}`;
    setWatchlists([...watchlists, { id: newId, name: newName, stocks: [] }]);
    setActiveTab(newId);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-border/60 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              onClick={() => setActiveTab(wl.id)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${activeTab === wl.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                }`}
            >
              {wl.name}
            </button>
          ))}
          <button
            onClick={handleAddWatchlist}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
            title="Add Watchlist"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Separator */}
      <div className="border-b border-border/40" />

      {/* Stock count */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-medium">
          {filteredStocks.length} stock{filteredStocks.length !== 1 ? "s" : ""}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">
          {activeWatchlist?.name}
        </span>
      </div>

      {/* Stock List */}
      <ScrollArea className="flex-1">
        {filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-muted-foreground">No stocks found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Add stocks to this watchlist</p>
          </div>
        ) : (
          filteredStocks.map((stock) => {
            const isPositive = stock.change >= 0;
            const isHovered = hoveredStock === stock.symbol;
            return (
              <div
                key={stock.symbol}
                className="group relative flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer border-b border-border/20 last:border-0"
                onMouseEnter={() => setHoveredStock(stock.symbol)}
                onMouseLeave={() => setHoveredStock(null)}
              >
                {/* Left: Symbol + Name */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{stock.symbol}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{stock.name}</span>
                </div>

                {/* Right: Price or Hover Actions */}
                {isHovered ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                      B
                    </button>
                    <button className="px-2 py-1 text-[10px] font-bold rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                      S
                    </button>
                    <button className="p-1 rounded hover:bg-slate-200 transition-colors" title="Info">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1 rounded hover:bg-slate-200 transition-colors" title="Chart">
                      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      ₹{stock.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[11px] font-medium flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                      {isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isPositive ? "+" : ""}{stock.change.toFixed(2)} ({isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};

export default Watchlist;
