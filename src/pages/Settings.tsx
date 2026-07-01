import { useState, useEffect, useRef, useContext } from "react";
import {
    Palette,
    Check,
    LogOut,
    User,
    Shield,
    Monitor,
    Bell,
    Wifi,
    Phone,
    Mail,
    Globe,
    Lock,
    Key,
    Sparkles,
    CheckCircle2,
    Eye,
    EyeOff,
    Laptop,
    Search,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { FrappeContext, useFrappeFileUpload, useFrappeUpdateDoc } from "frappe-react-sdk";

type SettingsTab = "profile";

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

// ── Utility helpers ──────────────────────────────────────────────────────────
const fmt = (v: any): string => {
    if (v === null || v === undefined || v === '') return '—';
    if (v === 1 || v === true) return 'Yes';
    if (v === 0 || v === false) return 'No';
    return String(v);
};

const fmtDate = (v: string | null | undefined): string => {
    if (!v) return '—';
    try {
        return new Date(v).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return v; }
};

// ── Reusable Display Badges ──────────────────────────────────────────────────
const TogglePill = ({ label, value }: { label: string; value: boolean }) => (
    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/45 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all duration-200">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mr-3">{label}</span>
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full tracking-wider flex-shrink-0 transition-colors ${value
            ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
            {value ? 'ON' : 'OFF'}
        </span>
    </div>
);

// ── Main Settings Component ──────────────────────────────────────────────────
const Settings = () => {
    const { logout, user, frappeUser } = useAuth();
    const [showSessions, setShowSessions] = useState(false);

    // File upload hook & references for Avatar
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const { upload } = useFrappeFileUpload();
    const { updateDoc } = useFrappeUpdateDoc();
    const [isUploading, setIsUploading] = useState(false);
    const [localUserImage, setLocalUserImage] = useState<string | null>(null);
    const frappeCtx = useContext(FrappeContext) as any;

    useEffect(() => {
        if (frappeUser?.user_image) {
            setLocalUserImage(frappeUser.user_image);
        }
    }, [frappeUser]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit.");
            return;
        }

        setIsUploading(true);
        try {
            const res = await upload(file, {
                isPrivate: false,
                doctype: "User",
                docname: localFrappeUser?.name || user?.email || user?.id || "",
                fieldname: "user_image"
            });
            
            if (res?.file_url) {
                // Update local state reactively to avoid full-browser reloading
                setLocalUserImage(res.file_url);

                // Explicitly update the User document's user_image field
                await updateDoc("User", localFrappeUser?.name || user?.email || user?.id || "", {
                    user_image: res.file_url
                });

                const db = frappeCtx?.db;
                if (db?.getDoc && (localFrappeUser?.name || user?.email || user?.id)) {
                    const doc = await db.getDoc('User', localFrappeUser?.name || user?.email || user?.id);
                    const fullDoc = doc?.data ?? doc;
                    setLocalFrappeUser(fullDoc);
                    sessionStorage.setItem('frappe_user', JSON.stringify(fullDoc));
                    window.dispatchEvent(new Event("frappe-user-updated"));
                }
            }
        } catch (err) {
            console.error("Avatar upload failed:", err);
            alert("Failed to upload profile picture. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const [selectedColor, setSelectedColor] = useState(() =>
        localStorage.getItem("theme-color-name") || colors[0].name
    );
    const [watchlistPosition, setWatchlistPosition] = useState<"left" | "right">(() =>
        (localStorage.getItem("watchlist-position") as "left" | "right") || "left"
    );
    const [isSidebarEnabled, setIsSidebarEnabled] = useState<boolean>(() =>
        localStorage.getItem("sidebar-enabled") !== "false"
    );
    const [isHeaderEnabled, setIsHeaderEnabled] = useState<boolean>(() =>
        localStorage.getItem("header-enabled") !== "false"
    );
    const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() =>
        localStorage.getItem("sidebar-expanded") === "true"
    );
    const [scrollWholePage, setScrollWholePage] = useState<boolean>(() =>
        localStorage.getItem("scroll-whole-page") === "true"
    );

    // Apply primary color accent dynamically
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

    useEffect(() => {
        localStorage.setItem("scroll-whole-page", scrollWholePage.toString());
        window.dispatchEvent(new Event("layout-changed"));
    }, [scrollWholePage]);

    const [localFrappeUser, setLocalFrappeUser] = useState<any | null>(frappeUser);

    useEffect(() => {
        if (frappeUser) {
            setLocalFrappeUser(frappeUser);
        }
    }, [frappeUser]);

    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;
        const maxRetries = 4;

        const fetchUserDoc = () => {
            const db = frappeCtx?.db;
            const targetUser = user?.email || user?.id;
            if (db?.getDoc && targetUser) {
                db.getDoc('User', targetUser)
                    .then((doc: any) => {
                        if (!isMounted) return;
                        const fullDoc = doc?.data ?? doc;
                        setLocalFrappeUser(fullDoc);
                        sessionStorage.setItem('frappe_user', JSON.stringify(fullDoc));
                        window.dispatchEvent(new Event("frappe-user-updated"));
                    })
                    .catch((err: any) => {
                        console.warn("Settings: failed to fetch user doc:", err);
                        if (isMounted && retryCount < maxRetries) {
                            retryCount++;
                            const delay = retryCount * 1500; // incremental backoff
                            setTimeout(fetchUserDoc, delay);
                        }
                    });
            } else {
                if (isMounted && retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(fetchUserDoc, 1000);
                }
            }
        };

        fetchUserDoc();

        return () => {
            isMounted = false;
        };
    }, [user, frappeCtx]);

    const fu = localFrappeUser;

    // Quick calculations for dynamic components
    const creationYear = fu?.creation ? new Date(fu.creation).getFullYear() : 2026;

    // Basic field verification for gauge
    const basicFields = [fu?.first_name, fu?.full_name, fu?.username, fu?.email, fu?.language, fu?.time_zone];
    const filledFieldsCount = basicFields.filter(Boolean).length;
    const completionPercent = Math.round((filledFieldsCount / 6) * 100);

    return (
        <div className="h-full bg-slate-50/50 dark:bg-slate-950/20">
            <ScrollArea className="h-full w-full">
                <div className="p-6 lg:p-8 mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-3 duration-500">

                    {/* ── Page Header ────────────────────────────────────────── */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                                <span>Portal</span>
                                <span className="text-slate-300 dark:text-slate-700">/</span>
                                <span className="text-primary font-bold">Profile & Preferences</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                                Good morning, {fu?.first_name || user?.firstName || 'User'}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                                Manage your identity parameters, security logs, and interface properties.
                            </p>
                        </div>
                    </div>

                    {!fu ? (
                        /* No data fallback */
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-16 shadow-sm text-center max-w-xl mx-auto mt-12">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <User className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-205">Synchronizing Identity Profile</h3>
                            <p className="text-xs text-slate-405 dark:text-slate-400 mt-1.5 leading-relaxed">
                                Retrieving user configurations from the directory services. If this remains unresolved, please sign out and re-authenticate.
                            </p>
                        </div>
                    ) : (
                        /* ── Bento Grid ───────────────────────────────────────── */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">

                            {/* Card 1: Portrait Profile Card (col-span-3) */}
                            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-5">
                                    {/* Avatar Portrait Style */}
                                    <input
                                        type="file"
                                        ref={avatarInputRef}
                                        onChange={handleAvatarUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <div 
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-emerald-500/20 via-primary/10 to-indigo-500/20 border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center cursor-pointer group/avatar"
                                    >
                                        {(localUserImage || fu.user_image) ? (
                                            <img
                                                src={localUserImage || fu.user_image}
                                                alt={fu.full_name}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-105"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="text-center space-y-1">
                                                <span className="text-5xl font-black bg-gradient-to-tr from-primary to-indigo-600 bg-clip-text text-transparent">
                                                    {(fu.full_name || fu.first_name || 'U')[0].toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {/* Upload Hover Overlay */}
                                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                                                <Sparkles className="h-5 w-5" />
                                            </div>
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Change Photo</span>
                                        </div>

                                        {/* Loading Indicator overlay */}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                                                <div className="h-7 w-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-wider">Uploading...</span>
                                            </div>
                                        )}

                                        {/* Status Badge overlay */}
                                        <div className="absolute top-4 left-4 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 dark:border-slate-800/60 z-10">
                                            <span className="text-[9px] font-black tracking-wider text-emerald-400 uppercase">
                                                {fu.enabled ? 'ACTIVE MEMBER' : 'DISABLED'}
                                            </span>
                                        </div>
                                        {/* Badge Experience overlay */}
                                        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 dark:bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 dark:border-slate-800/60 flex items-center justify-between z-10">
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider">Pulse Access</span>
                                            <span className="text-[9px] font-bold text-slate-300 dark:text-slate-400">Est. {creationYear}</span>
                                        </div>
                                    </div>

                                    {/* Name and Metadata */}
                                    <div className="px-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">{fu.full_name || '—'}</h2>
                                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider scale-90">
                                                {fu.desk_theme || 'Light'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold truncate flex items-center gap-1.5">
                                            <Mail className="h-3 w-3 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                                            {fu.email || fu.name || '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider & Bottom Area */}
                                <div className="mt-6 pt-4 border-t border-slate-100/80 dark:border-slate-800/80 space-y-5">
                                    {/* Quick Stats Layout matching reference */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="text-center py-2 px-1 bg-slate-50/60 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-base font-black text-primary">{fu.simultaneous_sessions ?? '—'}</p>
                                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Session Cap</p>
                                        </div>
                                        <div className="text-center py-2 px-1 bg-slate-50/60 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-base font-black text-slate-800 dark:text-slate-200">{fu.active_sessions?.length ?? 0}</p>
                                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Active</p>
                                        </div>
                                        <div className="text-center py-2 px-1 bg-slate-50/60 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-205 mt-0.5 uppercase">{fu.language?.slice(0, 3) || 'EN'}</p>
                                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Locale</p>
                                        </div>
                                    </div>

                                    {/* Quick action triggers */}
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => window.open(`mailto:${fu.email}`)}
                                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all bg-white dark:bg-slate-900"
                                        >
                                            <Phone className="h-3.5 w-3.5" />
                                            Support
                                        </button>
                                        <button
                                            onClick={logout}
                                            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/80 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-450 transition-all border border-rose-100/50 dark:border-rose-900/30"
                                            title="Sign Out"
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Interactive Session Activity Dot Chart (col-span-5) */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active session volume</span>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
                                                {fu.active_sessions?.length ?? 1} Session{fu.active_sessions?.length > 1 ? 's' : ''}
                                                <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Online
                                                </span>
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Mock dot grid chart matching reference "avg hours / weeks" */}
                                    <div className="p-5 bg-slate-50/60 dark:bg-slate-850/40 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 space-y-4">
                                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            <span>Session Activity Map</span>
                                            <span>100% telemetry</span>
                                        </div>
                                        <div className="grid grid-cols-12 gap-2">
                                            {Array.from({ length: 36 }).map((_, idx) => {
                                                const isActive = idx === 4 || idx === 11 || idx === 18 || idx === 19 || idx === 27 || idx === 30 || idx === 35;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`aspect-square rounded-full transition-all duration-300 ${isActive
                                                            ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)] scale-110"
                                                            : "bg-slate-200 dark:bg-slate-800"
                                                            }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-505">
                                            <span>1 Hour Ago</span>
                                            <span>Peak hours</span>
                                            <span>Just now</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Blue sidebar split card overlay matching reference */}
                                <div className="mt-6 bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-inner border dark:border-slate-850">
                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-[10px] font-black text-indigo-200 dark:text-indigo-400 uppercase tracking-widest">Platform Safety</p>
                                        <h4 className="text-lg font-black tracking-tight">Security Coverage</h4>
                                        <p className="text-[10px] text-slate-300 dark:text-slate-400 max-w-[200px]">Strict multi-session access policies are enforced active.</p>
                                    </div>

                                    <div className="flex items-center gap-4 bg-white/5 dark:bg-white/5 p-3 rounded-2xl border border-white/10 dark:border-slate-800 shrink-0">
                                        {/* Radial progress cap */}
                                        <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-white/10 dark:text-white/5" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                <path className="text-primary" strokeDasharray="25, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            </svg>
                                            <span className="absolute text-[10px] font-black text-white dark:text-slate-100">25%</span>
                                        </div>
                                        <div className="text-left leading-none">
                                            <p className="text-[10px] font-black text-slate-300 dark:text-slate-405 uppercase tracking-wider">CAP USED</p>
                                            <p className="text-xs font-black text-emerald-400 dark:text-emerald-500 mt-1">{fu.active_sessions?.length ?? 1} / {fu.simultaneous_sessions ?? 10}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Theme Preferences Card (col-span-4) */}
                            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-5">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Interface styles</span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                                            <Palette className="h-4.5 w-4.5 text-primary" /> Theme Customization
                                        </h3>
                                    </div>

                                    {/* Primary Color selection grid */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Primary Brand Accent</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {colors.map((color) => {
                                                const isSelected = selectedColor === color.name;
                                                return (
                                                    <button
                                                        key={color.name}
                                                        onClick={() => setSelectedColor(color.name)}
                                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-200 ${isSelected
                                                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                                                            : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700"
                                                            }`}
                                                        title={color.name}
                                                    >
                                                        <div className={`h-6 w-6 rounded-full ${color.value} shadow-inner flex items-center justify-center shrink-0`}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <span className="text-[7.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate max-w-full">
                                                            {color.name.split(" ")[0]}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Watchlist Layout switches */}
                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Watchlist Position</label>
                                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl w-fit">
                                            {(["left", "right"] as const).map(pos => (
                                                <button
                                                    key={pos}
                                                    onClick={() => setWatchlistPosition(pos)}
                                                    className={`px-5 py-1.5 rounded-xl text-[9px] font-black transition-all uppercase tracking-wider ${watchlistPosition === pos
                                                        ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 shadow-sm"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                                        }`}
                                                >
                                                    {pos} side
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Dark layout panel switches matching right bottom of reference */}
                                <div className="mt-5 bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-5 space-y-4 shadow-lg border dark:border-slate-850">
                                    <div className="flex items-center justify-between text-[9px] font-black text-indigo-300 dark:text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2">
                                        <span>System Overrides</span>
                                        <span>Local storage</span>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Toggle 1: Sidebar */}
                                        <div className="flex items-center justify-between">
                                            <div className="leading-tight">
                                                <p className="text-[10.5px] font-bold">App Sidebar</p>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500">Toggle primary sidebar panel.</p>
                                            </div>
                                            <button
                                                onClick={() => setIsSidebarEnabled(!isSidebarEnabled)}
                                                className={`relative w-11 h-6 transition-colors duration-200 rounded-full p-1 ${isSidebarEnabled ? "bg-primary" : "bg-white/10 dark:bg-slate-805"}`}
                                            >
                                                <div className={`h-4 w-4 bg-white rounded-full transition-transform duration-200 ${isSidebarEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                            </button>
                                        </div>

                                        {/* Toggle 2: Expanded Sidebar */}
                                        <div className="flex items-center justify-between">
                                            <div className="leading-tight">
                                                <p className="text-[10.5px] font-bold">Sidebar Expanded</p>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500">Start with sidebar open by default.</p>
                                            </div>
                                            <button
                                                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                                                className={`relative w-11 h-6 transition-colors duration-200 rounded-full p-1 ${isSidebarExpanded ? "bg-primary" : "bg-white/10 dark:bg-slate-805"}`}
                                            >
                                                <div className={`h-4 w-4 bg-white rounded-full transition-transform duration-200 ${isSidebarExpanded ? "translate-x-5" : "translate-x-0"}`} />
                                            </button>
                                        </div>

                                        {/* Toggle 3: Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="leading-tight">
                                                <p className="text-[10.5px] font-bold">Main Header</p>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500">Toggle header display.</p>
                                            </div>
                                            <button
                                                onClick={() => setIsHeaderEnabled(!isHeaderEnabled)}
                                                className={`relative w-11 h-6 transition-colors duration-200 rounded-full p-1 ${isHeaderEnabled ? "bg-primary" : "bg-white/10 dark:bg-slate-805"}`}
                                            >
                                                <div className={`h-4 w-4 bg-white rounded-full transition-transform duration-200 ${isHeaderEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                            </button>
                                        </div>

                                        {/* Toggle 4: Scroll Page */}
                                        <div className="flex items-center justify-between">
                                            <div className="leading-tight">
                                                <p className="text-[10.5px] font-bold">Whole Page Scroll</p>
                                                <p className="text-[8px] text-slate-400 dark:text-slate-500">Unlock screen overflow limits.</p>
                                            </div>
                                            <button
                                                onClick={() => setScrollWholePage(!scrollWholePage)}
                                                className={`relative w-11 h-6 transition-colors duration-200 rounded-full p-1 ${scrollWholePage ? "bg-primary" : "bg-white/10 dark:bg-slate-805"}`}
                                            >
                                                <div className={`h-4 w-4 bg-white rounded-full transition-transform duration-200 ${scrollWholePage ? "translate-x-5" : "translate-x-0"}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Security Details & Curved line SVG (col-span-6) */}
                            <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center">
                                            <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Security parameters</span>
                                            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 -mt-0.5">Access Credentials & Logs</h3>
                                        </div>
                                    </div>

                                    {/* Security Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Login</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={fmtDate(fu.last_login)}>{fmtDate(fu.last_login)}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Active</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={fmtDate(fu.last_active)}>{fmtDate(fu.last_active)}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Password Changed</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={fmt(fu.last_password_reset_date)}>{fmt(fu.last_password_reset_date)}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Authorized IP</span>
                                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate" title={fmt(fu.last_ip)}>{fmt(fu.last_ip)}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allowed After</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={fmt(fu.login_after)}>{fmt(fu.login_after)} (hr)</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 p-3 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Allowed Before</span>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={fmt(fu.login_before)}>{fmt(fu.login_before)} (hr)</span>
                                        </div>
                                    </div>

                                    {/* Security Toggles */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                        <TogglePill label="Logout All Sessions on Password Change" value={!!fu.logout_all_sessions} />
                                        <TogglePill label="Bypass Restrict IP Check if 2FA Enabled" value={!!fu.bypass_restrict_ip_check_if_2fa_enabled} />
                                    </div>
                                </div>

                                {/* Premium Curved Trend Graph matching reference "Average work time" */}
                                <div className="mt-6 p-4.5 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-3 relative overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Identity Trend</p>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">Session Longevity Curve</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-primary">+0.5%</span>
                                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mt-0.5">Active score</p>
                                        </div>
                                    </div>

                                    {/* SVG graph curve */}
                                    <div className="relative h-18 w-full mt-3">
                                        <svg className="w-full h-full" viewBox="0 0 400 70" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="gradient-line" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(var(--primary), 0.15)" />
                                                    <stop offset="100%" stopColor="rgba(var(--primary), 0.0)" />
                                                </linearGradient>
                                            </defs>
                                            {/* Fill area */}
                                            <path d="M 0 65 Q 40 25 80 50 T 160 30 T 240 55 T 320 20 T 400 40 L 400 70 L 0 70 Z" fill="url(#gradient-line)" />
                                            {/* Line */}
                                            <path d="M 0 65 Q 40 25 80 50 T 160 30 T 240 55 T 320 20 T 400 40" fill="none" stroke="rgb(var(--primary))" strokeWidth="2" strokeLinecap="round" />
                                            {/* Floating tooltip circle dot */}
                                            <circle cx="280" cy="31" r="4" fill="white" stroke="rgb(var(--primary))" strokeWidth="2" />
                                        </svg>
                                        {/* Floating tooltip label */}
                                        <div className="absolute top-0 left-[63%] transform -translate-x-1/2 bg-slate-950 dark:bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-sm border border-white/10 dark:border-slate-800">
                                            8 Hours active
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 5: Basic Info & Semi-circular progress gauge (col-span-3) */}
                            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center">
                                            <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Account parameters</span>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 -mt-0.5">Basic Information</h3>
                                        </div>
                                    </div>

                                    {/* Data Fields */}
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">First Name</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[60%] truncate" title={fmt(fu.first_name)}>{fmt(fu.first_name)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Full Name</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[60%] truncate" title={fmt(fu.full_name)}>{fmt(fu.full_name)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Username</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[60%] truncate" title={fmt(fu.username)}>{fmt(fu.username)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Language</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[60%] truncate" title={fmt(fu.language)}>{fmt(fu.language)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Time Zone</span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[60%] truncate" title={fmt(fu.time_zone)}>{fmt(fu.time_zone)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Semi-circular gauge matching reference "Track your team" */}
                                <div className="mt-5 p-4 bg-slate-50/60 dark:bg-slate-850/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center relative">
                                    <div className="text-center w-full mb-1">
                                        <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Metadata Integrity</p>
                                        <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200">Profile Completion</h4>
                                    </div>

                                    <div className="relative h-18 w-28 flex items-center justify-center overflow-hidden">
                                        <svg className="w-full h-full" viewBox="0 0 100 55">
                                            <defs>
                                                <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="rgb(var(--primary))" />
                                                    <stop offset="100%" stopColor="#22c55e" />
                                                </linearGradient>
                                            </defs>
                                            {/* Background arc */}
                                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" className="dark:stroke-slate-800" />
                                            {/* Active arc */}
                                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gauge-gradient)" strokeWidth="9" strokeLinecap="round" strokeDasharray="125" strokeDashoffset={125 - (125 * completionPercent) / 100} />
                                        </svg>
                                        <div className="absolute bottom-0 text-center leading-none">
                                            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{completionPercent}%</span>
                                            <p className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase mt-0.5">Calculated</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 6: Communication Preferences & Svg bar chart (col-span-3) */}
                            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="w-8 h-8 rounded-2xl bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center">
                                            <Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Communications</span>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 -mt-0.5">Preferences</h3>
                                        </div>
                                    </div>

                                    {/* Data Fields */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Mute Sounds</span>
                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${fu.mute_sounds ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{fu.mute_sounds ? 'MUTED' : 'OFF'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Thread Notify</span>
                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${fu.thread_notify ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{fu.thread_notify ? 'ACTIVE' : 'OFF'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Send Me Copy</span>
                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${fu.send_me_a_copy ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{fu.send_me_a_copy ? 'ON' : 'OFF'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-850/60">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Mentions Allowed</span>
                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${fu.allowed_in_mentions ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{fu.allowed_in_mentions ? 'ON' : 'OFF'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Welcome Email</span>
                                            <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${fu.send_welcome_email ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{fu.send_welcome_email ? 'SENT' : 'OFF'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SVG bar chart matching reference "Talent recruitment" */}
                                <div className="mt-5 p-4 bg-slate-50/60 dark:bg-slate-850/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                        <span>Alert frequency</span>
                                        <span>Channel levels</span>
                                    </div>
                                    <div className="flex items-end justify-between h-14 px-2">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-2.5 bg-primary rounded-full transition-all duration-500" style={{ height: "45px" }} />
                                            <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500">MAIL</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-2.5 bg-emerald-400 rounded-full transition-all duration-500" style={{ height: "20px" }} />
                                            <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500">PUSH</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-2.5 bg-primary/45 rounded-full transition-all duration-500" style={{ height: "32px" }} />
                                            <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500">WEB</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="w-2.5 bg-slate-300 dark:bg-slate-700 rounded-full transition-all duration-500" style={{ height: "8px" }} />
                                            <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500">HOOK</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 7: UI Feature Flags Board (col-span-12) */}
                            <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                                    <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center">
                                        <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">User interface parameters</span>
                                        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 -mt-0.5">UI Feature Flags</h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                                    {[
                                        { key: "search_bar", label: "Global Search Bar" },
                                        { key: "notifications", label: "In-App Alerts tray" },
                                        { key: "list_sidebar", label: "Directory Sidebar" },
                                        { key: "bulk_actions", label: "Bulk Row Operations" },
                                        { key: "view_switcher", label: "Grid View Switcher" },
                                        { key: "form_sidebar", label: "Form Layout Panel" },
                                        { key: "form_navigation_buttons", label: "Fast Form Nav Keys" },
                                        { key: "timeline", label: "Event Log Timeline" },
                                        { key: "dashboard", label: "Home Dashboard Layout" },
                                        { key: "show_absolute_datetime_in_timeline", label: "Absolute Timeline Date" }
                                    ].map(flag => {
                                        const val = !!fu[flag.key];
                                        return (
                                            <div
                                                key={flag.key}
                                                className="flex flex-col justify-between p-3.5 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 gap-4"
                                            >
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug">{flag.label}</span>
                                                <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/45 pt-2.5">
                                                    <span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-wider">STATUS</span>
                                                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full tracking-wide ${val
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {val ? 'ON' : 'OFF'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Additional fields */}
                                    <div className="flex flex-col justify-between p-3.5 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 gap-4">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug">Desk Client Theme</span>
                                        <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/45 pt-2.5">
                                            <span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-wider">THEME</span>
                                            <span className="text-[8.5px] font-black bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                {fu.desk_theme || 'LIGHT'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between p-3.5 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 gap-4">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-snug">Primary Code Editor</span>
                                        <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/45 pt-2.5">
                                            <span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-wider">EDITOR</span>
                                            <span className="text-[8.5px] font-black bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                {fu.code_editor_type || 'VSCODE'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 8: Active Session Details (col-span-12) */}
                            {fu.active_sessions?.length > 0 && (
                                <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300">
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center">
                                                <Wifi className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Active session matrix</span>
                                                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 -mt-0.5">Session Logs ({fu.active_sessions.length})</h3>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowSessions(v => !v)}
                                            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 uppercase tracking-wider transition-colors"
                                        >
                                            {showSessions
                                                ? <><ChevronUp className="h-3.5 w-3.5" />Hide list</>
                                                : <><ChevronDown className="h-3.5 w-3.5" />Show logs</>
                                            }
                                        </button>
                                    </div>

                                    {showSessions && (
                                        <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {fu.active_sessions.map((s: any, idx: number) => (
                                                    <div
                                                        key={s.name || idx}
                                                        className="p-5 bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 rounded-3xl space-y-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">
                                                                {s.id || (s.name?.slice(0, 15) + '…')}
                                                            </span>
                                                            <span className={`text-[8.5px] font-black px-2.5 py-1 rounded-full tracking-wider ${s.is_current
                                                                ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400'
                                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                                                }`}>
                                                                {s.is_current ? 'CURRENT SESSION' : 'LOGGED SESSION'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                                <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase">IP Address</span>
                                                                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 truncate">{fmt(s.ip_address)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                                <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase">Created at</span>
                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{fmtDate(s.session_created)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                                                <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase">Last updated</span>
                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{fmtDate(s.last_updated)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[7.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">User Agent Header</span>
                                                            <p className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 break-all leading-normal">
                                                                {s.user_agent || '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default Settings;
