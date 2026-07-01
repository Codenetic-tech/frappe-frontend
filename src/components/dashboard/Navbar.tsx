import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
import { useOrgTree } from '@/contexts/OrgTreeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  LogOut,
  Settings,
  Sparkle,
  TicketIcon,
  AlarmClockCheckIcon,
  Menu,
  Bell
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Notification from './Notification';
import { KYCTracker } from './KYCTracker';
import { toast } from '@/hooks/use-toast';
import { VirtualizedTree } from "@/components/ui/virtualized-tree";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, frappeUser } = useAuth();
  const { orgTreeData } = useOrgTree();
  const {
    selectedHierarchy,
    setSelectedHierarchy,
    dateRange,
    setDateRange
  } = useFilter();

  const [scrollWholePage, setScrollWholePage] = useState<boolean>(() => {
    return localStorage.getItem("scroll-whole-page") === "true";
  });

  const [localFrappeUser, setLocalFrappeUser] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('frappe_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLayoutChange = () => {
      setScrollWholePage(localStorage.getItem("scroll-whole-page") === "true");
    };
    window.addEventListener("layout-changed", handleLayoutChange);
    return () => {
      window.removeEventListener("layout-changed", handleLayoutChange);
    };
  }, []);

  useEffect(() => {
    const syncUser = () => {
      try {
        const saved = sessionStorage.getItem('frappe_user');
        if (saved) {
          setLocalFrappeUser(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error syncing frappe user in Navbar:", e);
      }
    };

    window.addEventListener("frappe-user-updated", syncUser);
    window.addEventListener("layout-changed", syncUser);
    return () => {
      window.removeEventListener("frappe-user-updated", syncUser);
      window.removeEventListener("layout-changed", syncUser);
    };
  }, []);

  const toggleScrollWholePage = () => {
    const nextVal = !scrollWholePage;
    setScrollWholePage(nextVal);
    localStorage.setItem("scroll-whole-page", nextVal.toString());
    window.dispatchEvent(new Event("layout-changed"));
  };

  const currentFrappeUser = localFrappeUser || frappeUser;
  const displayName = (currentFrappeUser?.username || "User").toUpperCase();
  const userInitial = (currentFrappeUser?.first_name?.[0] || currentFrappeUser?.full_name?.[0] || user?.user_code?.[0] || "U").toUpperCase();
  const userImage = currentFrappeUser?.user_image || null;

  const handleLogout = () => {
    logout();
  };

  // Handle date range change
  const handleDateChange = (value: [Date, Date] | null) => {
    if (value) {
      const [start, end] = value;
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      setDateRange({
        start: formatDate(start),
        end: formatDate(end)
      });
    } else {
      setDateRange({ start: null, end: null });
    }
  };

  const pickerValue = dateRange.start && dateRange.end
    ? [new Date(dateRange.start), new Date(dateRange.end)] as [Date, Date]
    : null;

  return (
    <div className="flex flex-1 items-center justify-between px-4 h-full bg-card text-card-foreground">
      <div className="flex items-center space-x-4 flex-1">
        {/* Desktop Sidebar Trigger */}
        <SidebarTrigger className="hidden lg:flex h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-200" />

        {/* Mobile Left Menu (Sheet) */}
        <div className="flex lg:hidden items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 border-r-0 shadow-2xl bg-white dark:bg-[#1a1a20]">
              <SheetHeader className="p-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-auto">
                    <img src="/gopocket.png" alt="gopocket" className="h-full w-auto" />
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-col p-4 gap-6 overflow-y-auto max-h-[calc(100vh-80px)]">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Branch/Team Filter</p>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <VirtualizedTree
                      data={orgTreeData || []}
                      value={selectedHierarchy}
                      onChange={setSelectedHierarchy}
                      placeholder="Select Team/Branch"
                      className="w-full border-none shadow-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">KYC Progress</p>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                    <KYCTracker />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Applications</p>
                  <div className="grid grid-cols-1 gap-1">
                    <Button variant="ghost" onClick={() => { navigate("/kyc"); }} className="justify-start gap-4 h-12 text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all rounded-xl">
                      <Sparkle size={18} className="text-slate-400 dark:text-slate-500" />
                      <span className="font-semibold">CRM App</span>
                    </Button>
                    <Button variant="ghost" onClick={() => { navigate("/settings"); }} className="justify-start gap-4 h-12 text-slate-700 dark:text-slate-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all rounded-xl">
                      <Settings size={18} className="text-slate-400 dark:text-slate-500" />
                      <span className="font-semibold">Settings</span>
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="h-6 flex items-center shrink-0">
          <img src="/gopocket.png" alt="gopocket" className="h-full w-auto" />
        </div>
      </div>

      {/* Desktop Navigation Group */}
      <div className="hidden lg:flex items-center space-x-4">
        {/* KYC Tracker */}
        <div className="relative">
          <KYCTracker />
        </div>

        {/* Hierarchy Filter */}
        <div className="flex items-center gap-2 pl-2">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <VirtualizedTree
              data={orgTreeData || []}
              value={selectedHierarchy}
              onChange={setSelectedHierarchy}
              placeholder="Select Team/Branch"
              className="w-[360px] border-none shadow-none focus:ring-0"
            />
          </div>
        </div>

        {/* Icons Container */}
        <div className="flex items-center gap-1.5 border-l border-border pl-4 h-8">
          {/* Page Scroll Switch */}
          <div className="flex items-center gap-2 px-2 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 rounded-lg h-9 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 select-none uppercase tracking-wider">Scroll</span>
            <button
              type="button"
              onClick={toggleScrollWholePage}
              className={`relative w-8 h-4 transition-colors rounded-full p-0.5 outline-none ${scrollWholePage ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-800"}`}
              title="Toggle Page Scroll"
            >
              <div className={`h-3 w-3 bg-white rounded-full transition-transform ${scrollWholePage ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all duration-200 group">
            <AlarmClockCheckIcon size={18} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Tasks
            </div>
          </button>

          <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200 group">
            <TicketIcon size={18} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Tickets
            </div>
          </button>

          <Notification />
        </div>
      </div>

      {/* Mobile Right Group (Simplified) */}
      <div className="flex lg:hidden items-center gap-2">
        {/* Page Scroll Switch */}
        <div className="flex items-center gap-2 px-2 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 rounded-lg h-9 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
          <button
            type="button"
            onClick={toggleScrollWholePage}
            className={`relative w-8 h-4 transition-colors rounded-full p-0.5 outline-none ${scrollWholePage ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-800"}`}
            title="Toggle Page Scroll"
          >
            <div className={`h-3 w-3 bg-white rounded-full transition-transform ${scrollWholePage ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
        <Notification />
      </div>

      {/* User Dropdown (Common) */}
      <div className="flex items-center">

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-3 px-2 hover:bg-accent h-10 border border-transparent hover:border-border rounded-xl transition-all">
              <Avatar className="h-8 w-8 rounded-lg border-2 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                {userImage && <AvatarImage src={userImage} className="object-cover" />}
                <AvatarFallback className="bg-slate-900 text-white text-[10px] font-bold">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-l font-bold text-slate-800 dark:text-slate-200 leading-tight">{displayName}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-xl border-slate-200/60 dark:border-slate-850 bg-white dark:bg-slate-900 p-1.5 text-slate-700 dark:text-slate-200">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg gap-2 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg gap-2 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-800">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Navbar;

function ChevronDown(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
