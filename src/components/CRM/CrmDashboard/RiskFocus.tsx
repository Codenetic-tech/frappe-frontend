import { TrendingDown, TrendingUp } from "lucide-react";
import { useFrappeGetDocCount } from 'frappe-react-sdk';

// Heights at each of the control points (left edge, 3 dividers, right edge)
const H = [160, 95, 70, 10, 2];
const HALO = H.map((h, i) => h + (i === 4 ? 2 : 18));

const W = 800;
const SEG = W / 4;
const CY = 100;

function buildPath(heights: number[]) {
  // top edge L→R, then bottom edge R→L
  const top = heights.map((h, i) => `${i === 0 ? "M" : "L"} ${i * SEG},${CY - h / 2}`).join(" ");
  const bottom = [...heights]
    .map((h, i) => ({ h, i }))
    .reverse()
    .map(({ h, i }) => `L ${i * SEG},${CY + h / 2}`)
    .join(" ");
  return `${top} ${bottom} Z`;
}

export function RiskFocus() {
  const { data: leadCount = 0, isLoading: isLeadLoading } = useFrappeGetDocCount('CRM Lead', []);
  const { data: kycCount = 0, isLoading: isKycLoading } = useFrappeGetDocCount('KYC', []);
  const { data: clientCount = 0, isLoading: isClientLoading } = useFrappeGetDocCount('Gopocket Client', []);
  const { data: activeCount = 0, isLoading: isActiveLoading } = useFrappeGetDocCount('Gopocket Client', [['activation_status', '=', 'ACTIVE']]);

  const kycPct = leadCount > 0 ? Math.round(((kycCount - leadCount) / leadCount) * 100) : 0;
  const clientPct = kycCount > 0 ? Math.round(((clientCount - kycCount) / kycCount) * 100) : 0;
  const activePct = clientCount > 0 ? Math.round(((activeCount - clientCount) / clientCount) * 100) : 0;

  const innerPath = buildPath(H);
  const outerPath = buildPath(HALO);

  const PercentageChange = ({ pct }: { pct: number }) => {
    if (pct === 0) return <span className="text-[9px] font-bold text-muted-foreground">0%</span>;
    const isDrop = pct < 0;
    const colorClass = isDrop ? "text-[#ef4444]" : "text-[#4ade80]";
    const Icon = isDrop ? TrendingDown : TrendingUp;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${colorClass} leading-none`}>
        <Icon className="w-2.5 h-2.5" /> {pct}%
      </span>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 overflow-hidden select-none transition-colors">
      {/* Title */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground tracking-tight">Conversion Funnel</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border text-xs">
        <button className="pb-2 -mb-px border-b-2 border-primary text-primary font-bold cursor-pointer">
          Overview
        </button>
        <button className="pb-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          Analysis
        </button>
      </div>

      {/* Funnel Layout Container */}
      <div className="relative flex-1 mt-4 min-h-0">
        
        {/* SVG Funnel Shape taking full width */}
        <div className="absolute inset-0">
          {/* Dashed vertical dividers for the 4 segments */}
          <div className="absolute inset-0 grid grid-cols-4 pointer-events-none z-10">
            <div className="border-r border-dashed border-border/60 h-full" />
            <div className="border-r border-dashed border-border/60 h-full" />
            <div className="border-r border-dashed border-border/60 h-full" />
            <div className="h-full" />
          </div>

          <svg
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="funnelInnerGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#f5ca3c" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="85%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="funnelOuterGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#ea580c" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.08" />
              </linearGradient>
              <filter id="funnelSoft" x="-2%" y="-10%" width="104%" height="120%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
            </defs>

            {/* Outer halo gradient */}
            <path d={outerPath} fill="url(#funnelOuterGrad)" filter="url(#funnelSoft)" />
            {/* Inner primary gradient */}
            <path d={innerPath} fill="url(#funnelInnerGrad)" />
          </svg>
        </div>

      </div>

      {/* Under Funnel: Columns for the 4 stages */}
      <div className="grid grid-cols-4 mt-3 shrink-0">

        {/* Column 1: Leads */}
        <div className="px-1 flex flex-col justify-between">
          <div className="text-[10px] text-muted-foreground font-medium leading-none mb-1">
            100%
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold truncate leading-normal">
            Leads
          </div>
          <div className="text-[20px] font-bold text-foreground tracking-tight mt-1 leading-none">
            {isLeadLoading ? '...' : leadCount.toLocaleString()}
          </div>
        </div>

        {/* Column 2: KYC Started */}
        <div className="px-1 flex flex-col justify-between">
          <div className="flex items-center">
            <PercentageChange pct={kycPct} />
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold truncate leading-normal mt-1">
            KYC Started
          </div>
          <div className="text-[20px] font-bold text-foreground tracking-tight mt-1 leading-none">
            {isKycLoading ? '...' : kycCount.toLocaleString()}
          </div>
        </div>

        {/* Column 3: Registered Clients */}
        <div className="px-1 flex flex-col justify-between">
          <div className="flex items-center">
            <PercentageChange pct={clientPct} />
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold truncate leading-normal mt-1">
            Registered
          </div>
          <div className="text-[20px] font-bold text-foreground tracking-tight mt-1 leading-none">
            {isClientLoading ? '...' : clientCount.toLocaleString()}
          </div>
        </div>

        {/* Column 4: Active Clients */}
        <div className="px-1 flex flex-col justify-between">
          <div className="flex items-center">
            <PercentageChange pct={activePct} />
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold truncate leading-normal mt-1">
            Active Clients
          </div>
          <div className="text-[20px] font-bold text-foreground tracking-tight mt-1 leading-none">
            {isActiveLoading ? '...' : activeCount.toLocaleString()}
          </div>
        </div>

      </div>
    </div>
  );
}
