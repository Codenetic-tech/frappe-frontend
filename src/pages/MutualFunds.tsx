import { useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Star,
    ChevronRight,
    Sparkles,
    ArrowUpRight,
    BarChart3,
    PieChart,
    Award,
    Zap,
    Shield,
    Target,
    ArrowDownRight, // Added ArrowDownRight
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea import

// --- Types ---
interface MutualFund {
    id: string;
    name: string;
    category: string;
    amc: string;
    nav: number;
    aum: string;
    cagr1Y: number;
    cagr3Y: number;
    cagr5Y: number;
    xirr: number;
    rating: number;
    riskLevel: "Low" | "Moderate" | "High" | "Very High";
    holdings: { name: string; percent: number }[];
    minSIP: number;
    minLumpsum: number;
    expenseRatio: number;
}

// --- Dummy Data ---
const recommendedFunds: MutualFund[] = [
    {
        id: "MF001",
        name: "Mirae Asset Large Cap Fund",
        category: "Large Cap",
        amc: "Mirae Asset",
        nav: 98.42,
        aum: "₹42,350 Cr",
        cagr1Y: 18.5,
        cagr3Y: 15.2,
        cagr5Y: 14.8,
        xirr: 16.3,
        rating: 5,
        riskLevel: "Moderate",
        holdings: [
            { name: "HDFC Bank", percent: 9.8 },
            { name: "ICICI Bank", percent: 8.2 },
            { name: "Reliance Ind.", percent: 7.5 },
            { name: "Infosys", percent: 6.1 },
            { name: "TCS", percent: 5.4 },
        ],
        minSIP: 1000,
        minLumpsum: 5000,
        expenseRatio: 0.52,
    },
    {
        id: "MF002",
        name: "Parag Parikh Flexi Cap Fund",
        category: "Flexi Cap",
        amc: "PPFAS",
        nav: 72.18,
        aum: "₹56,200 Cr",
        cagr1Y: 22.4,
        cagr3Y: 19.6,
        cagr5Y: 18.1,
        xirr: 20.2,
        rating: 5,
        riskLevel: "High",
        holdings: [
            { name: "Bajaj Holdings", percent: 7.2 },
            { name: "HDFC Bank", percent: 6.8 },
            { name: "ITC Ltd.", percent: 5.9 },
            { name: "Power Grid", percent: 5.1 },
            { name: "Coal India", percent: 4.8 },
        ],
        minSIP: 1000,
        minLumpsum: 1000,
        expenseRatio: 0.63,
    },
    {
        id: "MF003",
        name: "Quant Small Cap Fund",
        category: "Small Cap",
        amc: "Quant MF",
        nav: 214.56,
        aum: "₹18,900 Cr",
        cagr1Y: 32.8,
        cagr3Y: 28.4,
        cagr5Y: 26.2,
        xirr: 29.1,
        rating: 4,
        riskLevel: "Very High",
        holdings: [
            { name: "Reliance Ind.", percent: 8.4 },
            { name: "IREDA", percent: 5.6 },
            { name: "Jio Financial", percent: 4.9 },
            { name: "Bikaji Foods", percent: 4.2 },
            { name: "CDSL", percent: 3.8 },
        ],
        minSIP: 1000,
        minLumpsum: 5000,
        expenseRatio: 0.64,
    },
];

const topCAGRFunds: MutualFund[] = [
    {
        id: "MF004",
        name: "Nippon India Small Cap Fund",
        category: "Small Cap",
        amc: "Nippon India",
        nav: 152.30,
        aum: "₹46,800 Cr",
        cagr1Y: 28.6,
        cagr3Y: 30.2,
        cagr5Y: 28.9,
        xirr: 27.5,
        rating: 5,
        riskLevel: "Very High",
        holdings: [
            { name: "HDFC Bank", percent: 4.2 },
            { name: "Tube Invest.", percent: 3.1 },
            { name: "Kaynes Tech", percent: 2.8 },
            { name: "Apar Ind.", percent: 2.5 },
            { name: "Krishna Inst.", percent: 2.2 },
        ],
        minSIP: 500,
        minLumpsum: 5000,
        expenseRatio: 0.86,
    },
    {
        id: "MF005",
        name: "HDFC Mid-Cap Opportunities",
        category: "Mid Cap",
        amc: "HDFC MF",
        nav: 168.45,
        aum: "₹62,100 Cr",
        cagr1Y: 25.3,
        cagr3Y: 26.8,
        cagr5Y: 24.1,
        xirr: 25.6,
        rating: 5,
        riskLevel: "High",
        holdings: [
            { name: "Indian Hotels", percent: 4.5 },
            { name: "Max Healthcare", percent: 3.8 },
            { name: "Coforge", percent: 3.2 },
            { name: "AU SFB", percent: 2.9 },
            { name: "Persistent Sys", percent: 2.7 },
        ],
        minSIP: 500,
        minLumpsum: 5000,
        expenseRatio: 0.74,
    },
    {
        id: "MF006",
        name: "SBI Contra Fund",
        category: "Contra",
        amc: "SBI MF",
        nav: 312.80,
        aum: "₹28,400 Cr",
        cagr1Y: 21.7,
        cagr3Y: 27.1,
        cagr5Y: 25.3,
        xirr: 24.8,
        rating: 4,
        riskLevel: "High",
        holdings: [
            { name: "GAIL", percent: 5.8 },
            { name: "ONGC", percent: 4.9 },
            { name: "NHPC", percent: 4.2 },
            { name: "SBI", percent: 3.6 },
            { name: "L&T", percent: 3.1 },
        ],
        minSIP: 500,
        minLumpsum: 5000,
        expenseRatio: 0.69,
    },
    {
        id: "MF007",
        name: "Motilal Oswal Midcap Fund",
        category: "Mid Cap",
        amc: "Motilal Oswal",
        nav: 88.92,
        aum: "₹14,200 Cr",
        cagr1Y: 35.2,
        cagr3Y: 29.8,
        cagr5Y: 23.7,
        xirr: 28.4,
        rating: 4,
        riskLevel: "Very High",
        holdings: [
            { name: "Kalyan Jewellers", percent: 9.2 },
            { name: "Polycab India", percent: 8.1 },
            { name: "Persistent Sys", percent: 7.4 },
            { name: "Coforge", percent: 6.8 },
            { name: "Jio Financial", percent: 5.2 },
        ],
        minSIP: 500,
        minLumpsum: 500,
        expenseRatio: 0.57,
    },
];

const topXIRRFunds: MutualFund[] = [
    {
        id: "MF008",
        name: "Quant Flexi Cap Fund",
        category: "Flexi Cap",
        amc: "Quant MF",
        nav: 86.53,
        aum: "₹6,800 Cr",
        cagr1Y: 24.6,
        cagr3Y: 22.1,
        cagr5Y: 27.4,
        xirr: 31.2,
        rating: 4,
        riskLevel: "Very High",
        holdings: [
            { name: "Reliance Ind.", percent: 9.1 },
            { name: "Adani Power", percent: 6.2 },
            { name: "ITC Ltd.", percent: 5.8 },
            { name: "IREDA", percent: 4.8 },
            { name: "SBI", percent: 4.1 },
        ],
        minSIP: 1000,
        minLumpsum: 5000,
        expenseRatio: 0.58,
    },
    {
        id: "MF009",
        name: "Tata Digital India Fund",
        category: "Sectoral - IT",
        amc: "Tata MF",
        nav: 45.28,
        aum: "₹10,200 Cr",
        cagr1Y: 19.8,
        cagr3Y: 14.5,
        cagr5Y: 22.6,
        xirr: 28.9,
        rating: 4,
        riskLevel: "Very High",
        holdings: [
            { name: "Infosys", percent: 22.4 },
            { name: "TCS", percent: 18.6 },
            { name: "HCL Tech", percent: 10.2 },
            { name: "Wipro", percent: 7.1 },
            { name: "LTIMindtree", percent: 6.8 },
        ],
        minSIP: 500,
        minLumpsum: 5000,
        expenseRatio: 0.31,
    },
    {
        id: "MF010",
        name: "Canara Robeco Small Cap",
        category: "Small Cap",
        amc: "Canara Robeco",
        nav: 32.14,
        aum: "₹9,600 Cr",
        cagr1Y: 26.4,
        cagr3Y: 24.8,
        cagr5Y: 22.1,
        xirr: 27.6,
        rating: 4,
        riskLevel: "Very High",
        holdings: [
            { name: "BLS Intl", percent: 3.4 },
            { name: "Techno Electric", percent: 3.1 },
            { name: "Cyient DLM", percent: 2.8 },
            { name: "Karur Vysya Bank", percent: 2.5 },
            { name: "Global Health", percent: 2.2 },
        ],
        minSIP: 1000,
        minLumpsum: 5000,
        expenseRatio: 0.42,
    },
];

// --- Helpers ---
const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const riskColors: Record<string, string> = {
    Low: "text-emerald-600 bg-emerald-50",
    Moderate: "text-amber-600 bg-amber-50",
    High: "text-orange-600 bg-orange-50",
    "Very High": "text-red-600 bg-red-50",
};

const categoryColors: Record<string, string> = {
    "Large Cap": "bg-blue-500",
    "Flexi Cap": "bg-violet-500",
    "Small Cap": "bg-rose-500",
    "Mid Cap": "bg-teal-500",
    Contra: "bg-amber-500",
    "Sectoral - IT": "bg-cyan-500",
};

const RatingStars = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
            <Star
                key={i}
                className={`h-3 w-3 ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
            />
        ))}
    </div>
);

// --- Fund Card Component ---
const FundCard = ({ fund, accent }: { fund: MutualFund; accent?: string }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all duration-200 group">
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <div
                            className={`h-2 w-2 rounded-full shrink-0 ${categoryColors[fund.category] || "bg-slate-400"}`}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {fund.category}
                        </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground leading-tight truncate">{fund.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{fund.amc} &middot; NAV ₹{fmt(fund.nav)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                    <RatingStars rating={fund.rating} />
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskColors[fund.riskLevel]}`}>
                        {fund.riskLevel}
                    </span>
                </div>
            </div>

            {/* Returns row */}
            <div className="grid grid-cols-4 gap-2 py-2.5 border-t border-slate-50">
                <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">1Y CAGR</p>
                    <p className={`text-xs font-bold ${fund.cagr1Y >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {fund.cagr1Y >= 0 ? "+" : ""}{fund.cagr1Y}%
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">3Y CAGR</p>
                    <p className={`text-xs font-bold ${fund.cagr3Y >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {fund.cagr3Y >= 0 ? "+" : ""}{fund.cagr3Y}%
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">5Y CAGR</p>
                    <p className={`text-xs font-bold ${fund.cagr5Y >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {fund.cagr5Y >= 0 ? "+" : ""}{fund.cagr5Y}%
                    </p>
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">XIRR</p>
                    <p className={`text-xs font-bold ${fund.xirr >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {fund.xirr >= 0 ? "+" : ""}{fund.xirr}%
                    </p>
                </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between py-2 border-t border-slate-50 text-[11px] text-muted-foreground">
                <span>AUM: {fund.aum}</span>
                <span>Exp Ratio: {fund.expenseRatio}%</span>
                <span>Min SIP: ₹{fund.minSIP.toLocaleString("en-IN")}</span>
            </div>

            {/* Holdings toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline mt-1"
            >
                <PieChart className="h-3 w-3" />
                {expanded ? "Hide Holdings" : "View Top Holdings"}
                <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>

            {/* Holdings panel */}
            {expanded && (
                <div className="mt-2 bg-slate-50 rounded-lg p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {fund.holdings.map((h) => (
                        <div key={h.name} className="flex items-center justify-between">
                            <span className="text-xs text-foreground font-medium">{h.name}</span>
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${categoryColors[fund.category] || "bg-primary"}`}
                                        style={{ width: `${Math.min(h.percent * 4, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium w-10 text-right">
                                    {h.percent}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
                <button className="py-1.5 text-xs font-semibold rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors">
                    Start SIP
                </button>
                <button className="py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                    Invest Now
                </button>
            </div>
        </div>
    );
};

// --- Section Header ---
const SectionHeader = ({
    icon,
    title,
    subtitle,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) => (
    <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
        </div>
        <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
    </div>
);

// --- Page Component ---
const MutualFunds = () => {
    const [activeCategory, setActiveCategory] = useState("All");
    const categories = ["All", "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Sectoral", "ELSS"];

    return (
        <div className="p-6 h-full flex flex-col overflow-hidden">
            <div className="shrink-0 space-y-8 mb-8">
                {/* Overview Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 opacity-70" />
                            <span className="text-[11px] font-medium opacity-70">Total Invested</span>
                        </div>
                        <p className="text-2xl font-bold">₹12,50,000</p>
                        <p className="text-[11px] opacity-60 mt-1">Across 8 funds</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[11px] font-medium text-muted-foreground">Current Value</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">₹16,84,250</p>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 mt-1">
                            <ArrowUpRight className="h-3 w-3" /> +₹4,34,250
                        </span>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span className="text-[11px] font-medium text-muted-foreground">Overall XIRR</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">+18.6%</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Since inception</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span className="text-[11px] font-medium text-muted-foreground">Active SIPs</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">5</p>
                        <p className="text-[11px] text-muted-foreground mt-1">₹25,000/month</p>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${activeCategory === cat
                                ? "bg-foreground text-white border-foreground"
                                : "border-slate-200 text-muted-foreground hover:text-foreground hover:border-slate-300"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-8 pb-6">
                    {/* Recommended Funds */}
                    <section>
                        <SectionHeader
                            icon={<Sparkles className="h-4 w-4 text-primary" />}
                            title="Recommended for You"
                            subtitle="AI-powered picks based on your risk profile"
                        />
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            {recommendedFunds.map((fund) => (
                                <FundCard key={fund.id} fund={fund} />
                            ))}
                        </div>
                    </section>

                    {/* Top CAGR Funds */}
                    <section>
                        <SectionHeader
                            icon={<Award className="h-4 w-4 text-primary" />}
                            title="Top by 5Y CAGR"
                            subtitle="Highest compounded annual growth over 5 years"
                        />
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {topCAGRFunds.map((fund) => (
                                <FundCard key={fund.id} fund={fund} />
                            ))}
                        </div>
                    </section>

                    {/* Top XIRR Funds */}
                    <section>
                        <SectionHeader
                            icon={<Shield className="h-4 w-4 text-primary" />}
                            title="Top by XIRR"
                            subtitle="Best extended internal rate of return for SIP investors"
                        />
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            {topXIRRFunds.map((fund) => (
                                <FundCard key={fund.id} fund={fund} />
                            ))}
                        </div>
                    </section>
                </div>
            </ScrollArea>
        </div>
    );
};

export default MutualFunds;
