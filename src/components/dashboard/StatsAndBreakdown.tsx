import { ChevronDown, Info, ChevronRight, Landmark, Monitor } from "lucide-react";

const StatsRow = () => {
  return (
    <div className="grid grid-cols-3 gap-6 py-5 border-t border-border">
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Total profit</p>
        <p className="text-xl font-bold text-success">+$6,801.19</p>
        <p className="text-xs text-muted-foreground mt-0.5">+15.81%</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Avg. monthly growing</p>
        <p className="text-xl font-bold flex items-center gap-1">
          ~1.34% <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">~$523</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Best-profit token</p>
        <div className="flex items-center gap-2.5 mt-1">
          <div className="h-9 w-9 bg-black rounded-full flex items-center justify-center text-white">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">HDFC Bank</p>
            <p className="text-[11px] text-muted-foreground">HDFCBANK</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScoreRow = () => {
  return (
    <div className="grid grid-cols-3 gap-6 py-5 border-t border-border">
      <div>
        <p className="text-xs text-muted-foreground mb-2.5">Portfolio score</p>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-accent/30 flex items-center justify-center border-[3px] border-accent/50">
            <span className="font-bold text-base">B</span>
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">69<span className="text-sm font-normal text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground">Good</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-1">
          AIRA <Info className="h-3 w-3 text-muted-foreground" />
        </p>
        <p className="text-xl font-bold text-success">74% <span className="text-sm">▲</span></p>
        <p className="text-xs text-muted-foreground mt-0.5">Rebalance accuracy</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-1">
          PRI <Info className="h-3 w-3 text-muted-foreground" />
        </p>
        <p className="text-xl font-bold">0.45</p>
        <p className="text-xs text-muted-foreground mt-0.5">Resilience index: Risky</p>
      </div>
    </div>
  );
};

const BreakdownTable = () => {
  const rows = [
    { icon: <span className="text-sm font-bold">₹</span>, name: "Reliance", ticker: "RELIANCE", amount: "0.264", value: "$9,767.63", allocation: "19.62%", price: "$36,998.62" },
    { icon: <Monitor className="h-4 w-4" />, name: "TCS", ticker: "TCS", amount: "3.05", value: "$6,124.76", allocation: "12.28%", price: "$2,008.12" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Breakdown</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left py-2.5 font-medium">Token</th>
            <th className="text-left py-2.5 font-medium">Amount</th>
            <th className="text-left py-2.5 font-medium">Value</th>
            <th className="text-left py-2.5 font-medium">Allocation</th>
            <th className="text-left py-2.5 font-medium">Price</th>
            <th className="py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="border-b border-border last:border-0">
              <td className="py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">
                    {row.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.ticker}</p>
                  </div>
                </div>
              </td>
              <td className="py-3.5 text-sm">{row.amount}</td>
              <td className="py-3.5 text-sm">{row.value}</td>
              <td className="py-3.5 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-foreground" />
                  {row.allocation}
                </span>
              </td>
              <td className="py-3.5 text-sm">{row.price}</td>
              <td className="py-3.5">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { StatsRow, ScoreRow, BreakdownTable };
