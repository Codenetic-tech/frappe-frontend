import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Info, BarChart2, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { useKambalaFeed } from "../../hooks/useKambalaFeed";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Stock {
  tokenKey: string; // EXCHANGE|TOKEN
  symbol: string;
  name: string;
}

interface WatchlistTab {
  id: string;
  name: string;
  stocks: Stock[];
}

const defaultWatchlists: WatchlistTab[] = [
  {
    id: "nifty50",
    name: "Nifty 50",
    stocks: [
      { tokenKey: "NSE|26000", symbol: "NIFTY 50", name: "Nifty 50 Index" },
      { tokenKey: "NSE|13", symbol: "RELIANCE", name: "Reliance Ind." },
      { tokenKey: "NSE|11536", symbol: "TCS", name: "Tata Consultancy" },
      { tokenKey: "NSE|3045", symbol: "SBIN", name: "State Bank of India" },
    ]
  },
  {
    id: "banknifty",
    name: "Bank Nifty",
    stocks: [
      { tokenKey: "NSE|26001", symbol: "BANK NIFTY", name: "Nifty Bank Index" },
      { tokenKey: "NSE|3045", symbol: "SBIN", name: "State Bank of India" }
    ]
  },
  {
    id: "sensex",
    name: "Sensex",
    stocks: [
      { tokenKey: "NSE|26000", symbol: "NIFTY 50", name: "Nifty 50 Index" },
      { tokenKey: "NSE|13", symbol: "RELIANCE", name: "Reliance Ind." }
    ]
  }
];

const Watchlist = () => {
  const [watchlists, setWatchlists] = useState<WatchlistTab[]>(() => {
    const saved = localStorage.getItem("gopocket-watchlists");
    return saved ? JSON.parse(saved) : defaultWatchlists;
  });
  const [activeTab, setActiveTab] = useState("nifty50");
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Persist watchlists
  useEffect(() => {
    localStorage.setItem("gopocket-watchlists", JSON.stringify(watchlists));
  }, [watchlists]);

  const activeWatchlist = watchlists.find((w) => w.id === activeTab);
  const watchlistStocks = activeWatchlist?.stocks || [];

  // Search logic debounced
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: searchedContracts } = useFrappeGetDocList<any>(
    "Contract Master",
    {
      fields: ["token", "symbol", "exchange", "trading_symbol", "formatted_ins_name", "pdc"],
      orFilters: debouncedSearchQuery ? [
        ["symbol", "like", `%${debouncedSearchQuery}%`],
        ["trading_symbol", "like", `%${debouncedSearchQuery}%`],
        ["formatted_ins_name", "like", `%${debouncedSearchQuery}%`]
      ] : undefined,
      orderBy: { field: "order", order: "asc" },
      limit: 100
    },
    debouncedSearchQuery ? undefined : null
  );

  // Derive subcribed tokens
  const activeTokens = useMemo(() => {
    return watchlistStocks.map((s) => s.tokenKey);
  }, [watchlistStocks]);

  const searchTokens = useMemo(() => {
    if (!searchedContracts) return [];
    return searchedContracts.map((c: any) => `${c.exchange}|${c.token}`);
  }, [searchedContracts]);

  const allSubscribedTokens = useMemo(() => {
    const combined = new Set([...activeTokens, ...searchTokens]);
    return Array.from(combined);
  }, [activeTokens, searchTokens]);

  // Feed subscription
  const { ticks } = useKambalaFeed(allSubscribedTokens);

  const handleAddWatchlist = () => {
    const newId = `custom_${Date.now()}`;
    const newName = `Watchlist ${watchlists.length + 1}`;
    setWatchlists([...watchlists, { id: newId, name: newName, stocks: [] }]);
    setActiveTab(newId);
  };

  const handleAddStock = (contract: any) => {
    const tokenKey = `${contract.exchange}|${contract.token}`;
    if (!activeWatchlist) return;
    if (activeWatchlist.stocks.some(s => s.tokenKey === tokenKey)) return;

    const newStock: Stock = {
      tokenKey,
      symbol: contract.symbol,
      name: contract.formatted_ins_name || contract.trading_symbol || contract.symbol
    };

    setWatchlists(prev => prev.map(wl => {
      if (wl.id === activeTab) {
        return {
          ...wl,
          stocks: [...wl.stocks, newStock]
        };
      }
      return wl;
    }));

    setSearchQuery("");
  };

  const handleRemoveStock = (tokenKey: string) => {
    if (!activeWatchlist) return;
    setWatchlists(prev => prev.map(wl => {
      if (wl.id === activeTab) {
        return {
          ...wl,
          stocks: wl.stocks.filter(s => s.tokenKey !== tokenKey)
        };
      }
      return wl;
    }));
  };

  const isSearchingActive = searchQuery.trim() !== "";

  const displayItems = useMemo(() => {
    if (isSearchingActive) {
      if (!searchedContracts) return [];
      const exchangePriority: Record<string, number> = {
        "NSE": 1,
        "BSE": 2,
        "NFO": 3,
        "BFO": 4,
      };

      const sortedContracts = [...searchedContracts].sort((a: any, b: any) => {
        const priorityA = exchangePriority[a.exchange] ?? 99;
        const priorityB = exchangePriority[b.exchange] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return (a.symbol || "").localeCompare(b.symbol || "");
      });

      return sortedContracts.map((c: any) => {
        const tokenKey = `${c.exchange}|${c.token}`;
        const inWatchlist = watchlistStocks.some(s => s.tokenKey === tokenKey);
        return {
          tokenKey,
          symbol: c.symbol,
          name: c.formatted_ins_name || c.trading_symbol || c.symbol,
          pdc: c.pdc,
          inWatchlist,
          isSearchResult: true,
          contract: c
        };
      });
    } else {
      return watchlistStocks.map(s => ({
        tokenKey: s.tokenKey,
        symbol: s.symbol,
        name: s.name,
        pdc: null,
        inWatchlist: true,
        isSearchResult: false,
        contract: null
      }));
    }
  }, [isSearchingActive, searchedContracts, watchlistStocks]);

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
            className="w-full bg-slate-50 dark:bg-slate-900 border border-border/60 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
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
                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                }`}
            >
              {wl.name}
            </button>
          ))}
          <button
            onClick={handleAddWatchlist}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors"
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
          {displayItems.length} {isSearchingActive ? "match" : "stock"}{displayItems.length !== 1 ? (isSearchingActive ? "es" : "s") : ""}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">
          {isSearchingActive ? "Search Results" : activeWatchlist?.name}
        </span>
      </div>

      {/* Stock List */}
      <ScrollArea className="flex-1">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-muted-foreground">
              {isSearchingActive ? "No matching scripts found" : "No stocks found"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isSearchingActive ? "Try another search term" : "Search and select scripts to add them"}
            </p>
          </div>
        ) : (
          displayItems.map((item) => {
            const tick = ticks[item.tokenKey];
            const lp = tick?.lp ? parseFloat(tick.lp) : (item.pdc ? parseFloat(item.pdc) : null);
            const changePercent = tick?.pc ? parseFloat(tick.pc) : null;
            const absoluteChange = (lp !== null && changePercent !== null)
              ? (lp - (lp / (1 + changePercent / 100)))
              : null;

            const isPositive = changePercent !== null ? changePercent >= 0 : true;
            const isHovered = hoveredStock === item.tokenKey;
            return (
              <div
                key={item.tokenKey}
                className="group relative flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-border/20 last:border-0"
                onMouseEnter={() => setHoveredStock(item.tokenKey)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => {
                  if (!item.inWatchlist && item.contract) {
                    handleAddStock(item.contract);
                  }
                }}
              >
                {/* Left: Symbol + Name */}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {item.symbol}
                    <span className="text-[9px] text-muted-foreground/80 dark:text-slate-400 font-bold ml-1.5 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.tokenKey.split('|')[0]}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">{item.name}</span>
                </div>

                {/* Right: Price or Hover Actions */}
                {isHovered ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {item.inWatchlist ? (
                      <>
                        <button className="px-2 py-1 text-[10px] font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                          B
                        </button>
                        <button className="px-2 py-1 text-[10px] font-bold rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                          S
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStock(item.tokenKey);
                          }}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-955/20 text-rose-550 dark:text-rose-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.contract) handleAddStock(item.contract);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    )}
                    <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Info">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Chart">
                      <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      {lp !== null ? `₹${lp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </span>
                    {changePercent !== null && absoluteChange !== null ? (
                      <span className={`text-[11px] font-medium flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                        {isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isPositive ? "+" : ""}{absoluteChange.toFixed(2)} ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 italic">
                        {item.isSearchResult ? "Click to Add" : "No Feed"}
                      </span>
                    )}
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
