import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, BarChart2, Briefcase, TrendingUp, Megaphone, Sparkles, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { label: "Leads", path: "/", icon: Home },
  { label: "kyc", path: "/kyc", icon: ClipboardList },
  { label: "Clients", path: "/clients", icon: BarChart2 },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Alerts", path: "/announcements", icon: Megaphone },
  { label: "Updates", path: "/updates", icon: Sparkles },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-2 py-2 flex items-center justify-around z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-200 active:scale-95",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
            <span className="text-[10px] font-medium leading-none truncate max-w-[60px]">
              {item.label}
            </span>
            {isActive && (
              <span className="absolute -bottom-2 h-1 w-8 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--primary),0.3)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
