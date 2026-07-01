import { ChevronDown } from "lucide-react";
import { useTickets } from "@/contexts/TicketContext";

const openData = [165, 168, 170, 172, 175, 185, 182];
const resolvedData = [15, 18, 16, 17, 18, 17, 18];
const labels = ["16/05", "17/05", "18/05", "19/05", "20/05", "21/05", "22/05"];

function Line({ data, color, max }: { data: number[]; color: string; max: number }) {
  const w = 380, h = 140, padY = 15, padX = 25;
  const step = (w - padX * 2) / (data.length - 1);
  const pts = data.map((v, i) => [padX + i * step, h - padY - (v / max) * (h - padY * 2)] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <>
      {/* Path line */}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot points */}
      {pts.map(([x, y], i) => (
        <circle 
          key={i} 
          cx={x} 
          cy={y} 
          r="3.5" 
          fill={color} 
          stroke="var(--card)" 
          strokeWidth="1.5" 
          className="cursor-pointer hover:r-5 transition-all" 
        />
      ))}
    </>
  );
}

export function OpenResolved() {
  const { statusCount } = useTickets();
  const openCount = statusCount?.Open || 0;
  const resolvedCount = (statusCount?.Resolved || 0) + (statusCount?.Closed || 0);

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 overflow-hidden select-none transition-colors">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Open vs. Resolved Tickets</span>
        
        {/* Dropdowns */}
        <div className="flex gap-1.5">
          <button className="flex items-center gap-1 bg-muted border border-border text-muted-foreground text-[9px] font-bold px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap">
            All Depts <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/60" />
          </button>
          <button className="flex items-center gap-1 bg-muted border border-border text-muted-foreground text-[9px] font-bold px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap">
            All Status <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/60" />
          </button>
        </div>
      </div>
      
      {/* Date Dropdown */}
      <button className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 hover:text-foreground transition-colors cursor-pointer w-fit">
        Last week <ChevronDown className="w-3 h-3" />
      </button>
      
      {/* Chart SVG */}
      <div className="flex-1 min-h-0 mt-3 relative">
        <svg viewBox="0 0 380 150" className="w-full h-full">
          {/* Grid lines (0, 50, 100, 150, 200) */}
          {[0, 50, 100, 150, 200].map((v, i) => {
            const h = 140, padY = 15;
            const y = h - padY - (v / 200) * (h - padY * 2);
            return (
              <g key={i}>
                <line x1="25" y1={y} x2="355" y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
                <text x="0" y={y + 3} className="text-[9px] text-muted-foreground fill-current font-mono">{v}</text>
              </g>
            );
          })}
          
          {/* Open Line (Red) */}
          <Line data={openData} color="#ef4444" max={200} />
          
          {/* Resolved Line (Green) */}
          <Line data={resolvedData} color="#22c55e" max={200} />
          
          {/* Date Axis Labels */}
          {labels.map((l, i) => {
            const w = 380, padX = 25;
            const step = (w - padX * 2) / 6;
            const x = padX + i * step;
            return (
              <text key={l} x={x} y="148" className="text-[9px] text-muted-foreground fill-current font-mono" textAnchor="middle">
                {l}
              </text>
            );
          })}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 text-[10px] mt-2 shrink-0">
        <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] border border-[#ef4444]/30" />
          Open ({openCount})
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-[#22c55e]/30" />
          Resolved ({resolvedCount})
        </span>
      </div>
    </div>
  );
}
