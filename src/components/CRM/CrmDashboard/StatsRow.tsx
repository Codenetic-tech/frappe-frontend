import { FileText, Zap, Clock, CircleCheck, XCircle, MoreHorizontal } from "lucide-react";
import { useLead } from "@/contexts/LeadContext";

const STAT_CONFIG = [
    {
        key: "total" as const,
        label: "Total",
        icon: FileText,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
    {
        key: "New" as const,
        label: "New",
        icon: Zap,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
    {
        key: "Followup" as const,
        label: "Followup",
        icon: Clock,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
    {
        key: "won" as const,
        label: "Won",
        icon: CircleCheck,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
    {
        key: "Not Interested" as const,
        label: "Not Interested",
        icon: XCircle,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
    {
        key: "others" as const,
        label: "Others",
        icon: MoreHorizontal,
        iconColor: "text-slate-600",
        iconBg: "bg-slate-50",
        valueColor: "text-slate-900",
    },
];

export function StatsRow() {
    const { count, statusCount, isLoading } = useLead();

    const othersCount =
        (statusCount["Call Back"] ?? 0) +
        (statusCount["Client"] ?? 0) +
        (statusCount["RNR"] ?? 0) +
        (statusCount["Switch off"] ?? 0);

    const getValue = (key: typeof STAT_CONFIG[number]["key"]) => {
        if (key === "total") return count;
        if (key === "others") return othersCount;
        return statusCount[key] ?? 0;
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 select-none">
            {STAT_CONFIG.map((s) => {
                const Icon = s.icon;
                const value = getValue(s.key);
                return (
                    <div
                        key={s.label}
                        className="bg-card border border-border rounded-lg px-4 py-3.5 flex items-center justify-between min-w-0 transition-colors hover:shadow-sm"
                    >
                        {/* Left: icon + label */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-2 ${s.iconBg} rounded-lg shrink-0`}>
                                <Icon className={`w-4 h-4 ${s.iconColor}`} />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium truncate">{s.label}</span>
                        </div>

                        {/* Right: value */}
                        <div className="text-right shrink-0 ml-2">
                            {isLoading ? (
                                <div className="h-6 w-10 bg-muted animate-pulse rounded" />
                            ) : (
                                <span className={`text-xl font-bold tracking-tight leading-none ${s.valueColor}`}>
                                    {value.toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
