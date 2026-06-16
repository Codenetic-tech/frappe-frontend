import { Info, Settings, ChevronDown } from "lucide-react";

export function Deprioritization() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 justify-between select-none transition-colors">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        Deprioritization
        <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
      </div>
      <div className="flex-1 flex flex-col justify-end mt-2">
        <div className="text-[10px] text-muted-foreground font-medium">Vul. with known exploit</div>
        <div className="text-3xl font-extrabold text-foreground tracking-tight mt-1">197</div>
      </div>
    </div>
  );
}

export function RoiCalculator() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          ROI Calculator
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
        </div>
        <Settings className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
      </div>

      {/* Time Dropdown */}
      <button className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 hover:text-foreground transition-colors cursor-pointer w-fit">
        Last 90 days <ChevronDown className="w-3 h-3" />
      </button>

      {/* Metrics */}
      <div className="flex-1 flex flex-col justify-between mt-3 min-h-0 gap-2">
        {/* Triage saved */}
        <div>
          <div className="text-[10px] text-muted-foreground font-medium">Triage & Dev time saved</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">1,324</span>
            <span className="text-[10px] text-muted-foreground font-semibold">hours</span>
          </div>
        </div>

        {/* Yearly saved cost */}
        <div>
          <div className="text-[10px] text-muted-foreground font-medium">Yearly saved cost</div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight mt-0.5">$99,300</div>
        </div>
      </div>
    </div>
  );
}
