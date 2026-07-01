import { Info, Settings, ChevronDown } from "lucide-react";
import { useFrappeGetDocCount } from 'frappe-react-sdk';
import { useRevenue } from "@/contexts/RevenueContext";

export function Deprioritization() {
  const { data: dormantCount = 0 } = useFrappeGetDocCount('Gopocket Client', [['activation_status', '=', 'DORMANT']]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 justify-between select-none transition-colors">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        Dormant Clients
        <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
      </div>
      <div className="flex-1 flex flex-col justify-end mt-2">
        <div className="text-[10px] text-muted-foreground font-medium">Inactive overall accounts</div>
        <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">
          {dormantCount.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export function RoiCalculator() {
  const { summary } = useRevenue();

  const directBrokerage = summary?.brokerageDirect || 0;
  const totalNetIncome = summary?.incomeTotal || 0;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          Revenue & Income
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
        </div>
        <Settings className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
      </div>

      {/* Time Dropdown */}
      <button className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 hover:text-foreground transition-colors cursor-pointer w-fit">
        Direct vs Total <ChevronDown className="w-3 h-3" />
      </button>

      {/* Metrics */}
      <div className="flex-1 flex flex-col justify-between mt-3 min-h-0 gap-2">
        {/* Direct Brokerage */}
        <div>
          <div className="text-[10px] text-muted-foreground font-medium">Direct Brokerage</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold mr-0.5">₹</span>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(directBrokerage)}
            </span>
          </div>
        </div>

        {/* Total Net Income */}
        <div>
          <div className="text-[10px] text-muted-foreground font-medium">Total Net Income</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold mr-0.5">₹</span>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(totalNetIncome)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
