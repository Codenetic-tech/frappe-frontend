import { TrendingUp, ChevronDown, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceDot } from "recharts";

const chartData = [
  { date: "10-25", value: 48800 },
  { date: "11-1", value: 49200 },
  { date: "11-5", value: 50200 },
  { date: "11-8", value: 49800 },
  { date: "11-10", value: 50800 },
  { date: "11-12", value: 49500 },
  { date: "11-15", value: 50400 },
  { date: "11-18", value: 51200 },
  { date: "11-20", value: 50600 },
];

const EvaluationCard = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Evaluation</h3>
      <p className="text-xs text-muted-foreground">Total assets</p>

      {/* Value row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[40px] leading-none font-bold tracking-tight">
          $49,825<span className="text-2xl">.82</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-accent/25 text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-md">
            <TrendingUp className="h-3 w-3" /> 1.9%
          </span>
          <span className="bg-accent/25 text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-md">
            $747.29
          </span>
        </div>
      </div>

      {/* Performance badge */}
      <div className="inline-flex items-center gap-1.5 border border-border text-foreground text-xs font-medium px-3 py-1.5 rounded-full">
        Strong performance <Zap className="h-3 w-3 fill-primary text-primary" />
      </div>

      {/* Time period selector */}
      <div className="flex justify-end">
        <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
          Last 30 days
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Chart */}
      <div className="h-[160px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="hsl(0, 0%, 8%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(0,0%,45%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(0,0%,45%)' }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 500', 'dataMax + 500']}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(0,0%,90%)', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(0, 0%, 8%)"
              strokeWidth={1.5}
              fill="url(#chartGrad)"
            />
            <ReferenceDot x="11-10" y={50800} r={4} fill="hsl(0,0%,8%)" stroke="none" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline slider */}
      <div className="relative h-6 mx-2">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-border rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 left-[15%] right-[40%] h-[3px] bg-accent rounded-full" />
        {[10, 25, 40, 55, 70, 85].map((pos) => (
          <div
            key={pos}
            className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-border border border-card"
            style={{ left: `${pos}%` }}
          />
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-foreground border-2 border-card shadow-md cursor-pointer"
          style={{ left: '40%' }}
        />
        {/* Rebalance label */}
        <div className="absolute -top-5 left-[28%] text-[10px] text-muted-foreground flex items-center gap-0.5">
          Rebalance 11-13 <span className="text-foreground">›</span>
        </div>
      </div>
    </div>
  );
};

export default EvaluationCard;
