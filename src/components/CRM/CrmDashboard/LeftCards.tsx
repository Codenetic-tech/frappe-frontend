import React, { useMemo } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useFrappeGetDocCount } from 'frappe-react-sdk';
import { useTickets } from "@/contexts/TicketContext";

export function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      {children}
      <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors" />
    </div>
  );
}

export function HealthScore() {
  const { data: totalClients = 0 } = useFrappeGetDocCount('Gopocket Client', []);
  const { data: activeClients = 0 } = useFrappeGetDocCount('Gopocket Client', [['activation_status', '=', 'ACTIVE']]);
  const activeRatio = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 select-none transition-colors">
      <div className="flex items-center justify-between">
        <InfoLabel>Client Activation Rate</InfoLabel>
      </div>
      <button className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 hover:text-foreground cursor-pointer transition-colors w-fit">
        Overall Ratio <ChevronDown className="w-3 h-3" />
      </button>

      <div className="flex-1 flex items-center justify-center min-h-0 mt-2">
        <div className="relative w-[120px] h-[130px] flex items-center justify-center">
          <svg viewBox="0 0 100 110" className="w-full h-full absolute inset-0">
            <defs>
              <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path
              d="M50 8 L88 22 L88 62 Q88 88 50 102 Q12 88 12 62 L12 22 Z"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.5"
              opacity="0.3"
            />
            <path
              d="M50 14 L82 26 L82 60 Q82 82 50 95 Q18 82 18 60 L18 26 Z"
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
              filter="url(#shieldGlow)"
            />
          </svg>
          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-[#eab308] tracking-tight leading-none">{activeRatio}%</span>
            <span className="text-[10px] text-muted-foreground font-medium mt-1">Active / Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdrIncidents() {
  const { statusCount } = useTickets();
  const openTickets = statusCount?.Open || 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 select-none transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Open Tickets</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <span className="text-4xl font-extrabold text-[#ef4444] tracking-tight leading-none">{openTickets}</span>
        <span className="text-[10px] text-muted-foreground font-medium mt-2">Active support cases</span>
      </div>
    </div>
  );
}

export function AdrCoverage() {
  const { ticketsData, statusCount } = useTickets();

  const priorityData = useMemo(() => {
    const counts = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    if (ticketsData) {
      ticketsData.forEach(t => {
        const p = t.priority;
        if (p in counts) {
          counts[p as keyof typeof counts]++;
        }
      });
    }
    return [
      { priority: "Urgent", count: counts.Urgent },
      { priority: "High", count: counts.High },
      { priority: "Medium", count: counts.Medium },
      { priority: "Low", count: counts.Low },
    ];
  }, [ticketsData]);

  const resolvedCount = (statusCount?.Resolved || 0) + (statusCount?.Closed || 0);
  const totalTickets = statusCount?.Total || 0;
  const slaPct = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 select-none transition-colors">
      <div className="flex items-center justify-between">
        <InfoLabel>Open Tickets by Priority</InfoLabel>
      </div>

      <div className="flex-1 min-h-0 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={priorityData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="priority"
              tick={{ fill: "var(--muted-foreground)", fontSize: 8 }}
            />
            <Radar name="Open Tickets" dataKey="count" fill="#8884d8" fillOpacity={0.45} stroke="#8884d8" strokeWidth={1.5} />
            <Legend
              iconSize={6}
              wrapperStyle={{ fontSize: "8px", color: "var(--muted-foreground)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 shrink-0">
        <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">Tickets resolved SLA...</div>
        <div className="h-[3px] bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${slaPct}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5 font-mono">
          <span className="text-foreground font-semibold">{resolvedCount}</span> / {totalTickets} ({slaPct}%)
        </div>
      </div>
    </div>
  );
}
