import { useState, useEffect } from "react";
import {
    User,
    Settings as SettingsIcon,
    Bell,
    Palette,
    MessageSquare,
    Star,
    ShieldCheck,
    CreditCard,
    Check,
    ChevronRight,
    UserCircle,
    Mail,
    Phone,
    Lock,
    LogOut,
    Sliders,
    Fingerprint,
    MapPin,
    Calendar,
    Briefcase
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type SettingsTab = "profile" | "trading" | "orders" | "theme" | "feedback";

const colors = [
    { name: "Purple (Default)", value: "bg-purple-600", hsl: "270 91% 65%" },
    { name: "Teal", value: "bg-[#00f2c3]", hsl: "170 100% 45%" },
    { name: "Default Blue", value: "bg-blue-600", hsl: "221.2 83.2% 53.3%" },
    { name: "Emerald", value: "bg-emerald-600", hsl: "142.1 76.2% 36.3%" },
    { name: "Indigo", value: "bg-indigo-600", hsl: "238.7 77.1% 47.7%" },
    { name: "Rose", value: "bg-rose-600", hsl: "346.8 77.2% 49.8%" },
    { name: "Amber", value: "bg-amber-600", hsl: "37.7 92.1% 50.2%" },
    { name: "Deep Purple", value: "bg-[#a26ffc]", hsl: "262 96% 71%" },
];

const Settings = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [selectedColor, setSelectedColor] = useState(() => {
        return localStorage.getItem("theme-color-name") || colors[0].name;
    });

    const [watchlistPosition, setWatchlistPosition] = useState<"left" | "right">(() => {
        return (localStorage.getItem("watchlist-position") as "left" | "right") || "left";
    });

    const [isSidebarEnabled, setIsSidebarEnabled] = useState<boolean>(() => {
        return localStorage.getItem("sidebar-enabled") !== "false";
    });

    const [isHeaderEnabled, setIsHeaderEnabled] = useState<boolean>(() => {
        return localStorage.getItem("header-enabled") !== "false";
    });

    const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
        return localStorage.getItem("sidebar-expanded") === "true";
    });

    useEffect(() => {
        const color = colors.find(c => c.name === selectedColor);
        if (color) {
            document.documentElement.style.setProperty("--primary", color.hsl);
            localStorage.setItem("theme-color-name", color.name);
            localStorage.setItem("theme-color-hsl", color.hsl);
        }
    }, [selectedColor]);

    useEffect(() => {
        localStorage.setItem("watchlist-position", watchlistPosition);
        window.dispatchEvent(new Event("layout-changed"));
    }, [watchlistPosition]);

    useEffect(() => {
        localStorage.setItem("sidebar-enabled", isSidebarEnabled.toString());
        window.dispatchEvent(new Event("layout-changed"));
    }, [isSidebarEnabled]);

    useEffect(() => {
        localStorage.setItem("header-enabled", isHeaderEnabled.toString());
        window.dispatchEvent(new Event("layout-changed"));
    }, [isHeaderEnabled]);

    useEffect(() => {
        localStorage.setItem("sidebar-expanded", isSidebarExpanded.toString());
        window.dispatchEvent(new Event("layout-changed"));
    }, [isSidebarExpanded]);

    const sidebarItems: { id: SettingsTab; label: string; icon: any }[] = [
        { id: "profile", label: "Profile", icon: User },
        // { id: "trading", label: "Trade Settings", icon: Sliders },
        // { id: "orders", label: "Order Settings", icon: SettingsIcon },
        // { id: "theme", label: "Theme & Colors", icon: Palette },
        // { id: "feedback", label: "Feedback", icon: MessageSquare },
    ];

    return (
        <div className="flex h-full bg-slate-50">
            {/* Settings Sidebar */}
            <aside className="w-64 border-r border-slate-100 bg-white/50 p-4 space-y-1">
                <h2 className="text-sm font-semibold text-slate-400 px-3 mb-4 uppercase tracking-wider">Settings</h2>
                {sidebarItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                ))}

                <div className="pt-8 mt-8 border-t border-slate-100">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Settings Content */}
            <ScrollArea className="flex-1 p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {sidebarItems.find(i => i.id === activeTab)?.label}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your account and platform preferences.</p>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === "profile" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* Referral Link Section */}
                            <section className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 shadow-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-110 transition-transform duration-500">
                                    <Star className="h-24 w-24" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Star className="h-4 w-4 text-primary fill-primary" />
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Referral Program</h4>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 flex items-center justify-between group/link">
                                            <span className="truncate">https://signup.gopocket.in/?refer={user?.user_code || "XXXXXX"}</span>
                                            <button
                                                onClick={() => {
                                                    const link = `https://signup.gopocket.in/?refer=${user?.user_code || ""}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast({
                                                        variant: "success",
                                                        title: "Link Copied!",
                                                        description: "Referral link copied to clipboard.",
                                                    });
                                                }}
                                                className="ml-4 p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                                                title="Copy Link"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                                    <h4 className="font-semibold text-sm border-b pb-2">Personal Details</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <Mail className="h-3 w-3" /> Email Address
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900">
                                                {user?.mail_id || "N/A"}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" /> Phone Number
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900">
                                                {user?.mobile || "N/A"}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <Fingerprint className="h-3 w-3" /> PAN Number
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono tracking-wider">
                                                {user?.pan_no || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                                    <h4 className="font-semibold text-sm border-b pb-2">Account Info</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <Briefcase className="h-3 w-3" /> User Type
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900">
                                                {user?.type || "N/A"}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3" /> Branch / Region
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900">
                                                {user?.branch || "N/A"}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" /> Activation Date
                                            </label>
                                            <div className="w-full bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm text-slate-900">
                                                {user?.active_date || "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "theme" && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="font-bold mb-6">Interface Customization</h3>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 block mb-4">Primary Brand Color</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {colors.map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() => setSelectedColor(color.name)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedColor === color.name
                                                    ? "border-primary bg-primary/5"
                                                    : "border-slate-50 bg-white hover:border-slate-200"
                                                    }`}
                                            >
                                                <div className={`h-8 w-8 rounded-full ${color.value}`} />
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-slate-900">{color.name}</p>
                                                    <p className="text-[10px] text-slate-400 capitalize">{color.name.toLowerCase().replace("default", "")}</p>
                                                </div>
                                                {selectedColor === color.name && (
                                                    <Check className="h-4 w-4 text-primary ml-auto" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <label className="text-sm font-medium text-slate-600 block mb-4">Watchlist Position</label>
                                    <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-xl w-fit">
                                        <button
                                            onClick={() => setWatchlistPosition("left")}
                                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${watchlistPosition === "left"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            LEFT SIDE
                                        </button>
                                        <button
                                            onClick={() => setWatchlistPosition("right")}
                                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${watchlistPosition === "right"
                                                ? "bg-white text-slate-900 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            RIGHT SIDE
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-3">Choose where the watchlist sidebar should appear.</p>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <label className="text-sm font-medium text-slate-600 block mb-4">Application Sidebar</label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                                        <div>
                                            <p className="text-sm font-bold">Enable Modern Sidebar</p>
                                            <p className="text-[10px] text-slate-400">Toggle the primary navigation sidebar on the left/right of the screen.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsSidebarEnabled(!isSidebarEnabled)}
                                            className={`relative w-11 h-6 transition-colors rounded-full p-1 ${isSidebarEnabled ? "bg-primary" : "bg-slate-200"}`}
                                        >
                                            <div className={`h-4 w-4 bg-white rounded-full transition-transform ${isSidebarEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold">Default Sidebar State</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold ${!isSidebarExpanded ? "text-primary" : "text-slate-400"}`}>COLLAPSED</span>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className={`text-[10px] font-bold ${isSidebarExpanded ? "text-primary" : "text-slate-400"}`}>EXPANDED</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                                            className={`relative w-11 h-6 transition-colors rounded-full p-1 ${isSidebarExpanded ? "bg-primary" : "bg-slate-200"}`}
                                        >
                                            <div className={`h-4 w-4 bg-white rounded-full transition-transform ${isSidebarExpanded ? "translate-x-5" : "translate-x-0"}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <label className="text-sm font-medium text-slate-600 block mb-4">Application Header</label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold">Show Main Header</p>
                                            <p className="text-[10px] text-slate-400">Toggle the visibility of the top navigation bar.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsHeaderEnabled(!isHeaderEnabled)}
                                            className={`relative w-11 h-6 transition-colors rounded-full p-1 ${isHeaderEnabled ? "bg-primary" : "bg-slate-200"}`}
                                        >
                                            <div className={`h-4 w-4 bg-white rounded-full transition-transform ${isHeaderEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <label className="text-sm font-medium text-slate-600 block mb-4">Layout Spacing</label>
                                    <div className="flex items-center gap-4">
                                        {["Compact", "Comfortable", "Spacious"].map((spacing) => (
                                            <button
                                                key={spacing}
                                                className={`px-6 py-2 rounded-full border text-xs font-bold transition-all ${spacing === "Comfortable"
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                                                    }`}
                                            >
                                                {spacing}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 mt-8 flex items-center justify-between">
                                <p className="text-xs text-slate-500 max-w-[70%]">Changes to the primary color will be applied across the entire dashboard interface.</p>
                                <button className="px-5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-lg shadow-primary/20">
                                    SAVE THEME
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "trading" && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="max-w-[80%]">
                                    <h4 className="text-sm font-bold">Chart Integration</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Choose your preferred charting engine for technical analysis.</p>
                                </div>
                                <select className="bg-slate-50 border-0 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-primary">
                                    <option>TradingView</option>
                                    <option>ChartIQ</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold">Trading Preferences</h4>
                                {[
                                    { label: "Default Position Value", sub: "Set the initial amount for buy orders", value: "₹50,000" },
                                    { label: "Default Segment", sub: "Primary exchange segment for execution", value: "NSE Cash" },
                                    { label: "Price Slicing", sub: "Auto-split large quantity orders", value: "Disabled" }
                                ].map((pref) => (
                                    <div key={pref.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-colors group cursor-pointer">
                                        <div>
                                            <p className="text-sm font-semibold">{pref.label}</p>
                                            <p className="text-[10px] text-slate-400">{pref.sub}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-primary">{pref.value}</span>
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "orders" && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold">One-Click Execution</p>
                                        <p className="text-xs text-slate-500">Execute orders immediately without confirmation dialog</p>
                                    </div>
                                    <div className="relative w-11 h-6 bg-slate-200 rounded-full cursor-pointer p-1">
                                        <div className="h-4 w-4 bg-white rounded-full transition-transform" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold">Auto Square-off</p>
                                        <p className="text-xs text-slate-500">Automatically exit intraday positions 15m before market close</p>
                                    </div>
                                    <div className="relative w-11 h-6 bg-primary rounded-full cursor-pointer p-1">
                                        <div className="h-4 w-4 bg-white rounded-full translate-x-5 transition-transform" />
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Notification Alerts</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {["Order Executed", "Price Alert", "Market Snap", "System Update"].map(item => (
                                            <div key={item} className="flex items-center gap-3">
                                                <div className="w-4 h-4 rounded border border-slate-300 bg-white flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "feedback" && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="text-center mb-8">
                                <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Star className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold">How are we doing?</h3>
                                <p className="text-xs text-slate-500">Your feedback helps us build the best trading experience.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">Topic</label>
                                    <select className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none">
                                        <option>UI/UX Design</option>
                                        <option>Performance & Speed</option>
                                        <option>New Feature Request</option>
                                        <option>Bug Report</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">Message</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Tell us what's on your mind..."
                                        className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                    ></textarea>
                                </div>
                                <button className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
                                    SUBMIT FEEDBACK
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default Settings;
