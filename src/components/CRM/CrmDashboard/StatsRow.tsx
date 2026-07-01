import { FileText, Zap, Clock, CircleCheck, XCircle, MoreHorizontal } from "lucide-react";
import { useFrappeGetDocCount } from 'frappe-react-sdk';

const STAT_CONFIG = [
    {
        key: "total" as const,
        label: "Total",
        icon: FileText,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
    {
        key: "New" as const,
        label: "New",
        icon: Zap,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
    {
        key: "Followup" as const,
        label: "Followup",
        icon: Clock,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
    {
        key: "won" as const,
        label: "Won",
        icon: CircleCheck,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
    {
        key: "Not Interested" as const,
        label: "Not Interested",
        icon: XCircle,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
    {
        key: "others" as const,
        label: "Others",
        icon: MoreHorizontal,
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-50 dark:bg-slate-800/50",
        valueColor: "text-slate-900 dark:text-slate-100",
    },
];

export function StatsRow() {
    const { data: totalCount = 0, isLoading: totalLoading } = useFrappeGetDocCount('CRM Lead', []);
    const { data: newCount = 0, isLoading: newLoading } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'New']]);
    const { data: followupCount = 0, isLoading: followupLoading } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'Followup']]);
    const { data: wonCount = 0, isLoading: wonLoading } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'won']]);
    const { data: notInterestedCount = 0, isLoading: notInterestedLoading } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'Not Interested']]);
    
    const { data: callbackCount = 0 } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'Call Back']]);
    const { data: clientStatusCount = 0 } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'Client']]);
    const { data: rnrCount = 0 } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'RNR']]);
    const { data: switchoffCount = 0 } = useFrappeGetDocCount('CRM Lead', [['status', '=', 'Switch off']]);

    const othersCount = callbackCount + clientStatusCount + rnrCount + switchoffCount;

    const isLoading = totalLoading || newLoading || followupLoading || wonLoading || notInterestedLoading;

    const getValue = (key: typeof STAT_CONFIG[number]["key"]) => {
        if (key === "total") return totalCount;
        if (key === "others") return othersCount;
        if (key === "New") return newCount;
        if (key === "Followup") return followupCount;
        if (key === "won") return wonCount;
        if (key === "Not Interested") return notInterestedCount;
        return 0;
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
