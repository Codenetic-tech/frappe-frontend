import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFilter } from '@/contexts/FilterContext';
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
import { DateRangePicker } from 'rsuite';
import 'rsuite/DateRangePicker/styles/index.css';
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
  const { user, logout, hierarchyData } = useAuth();
  const {
    selectedHierarchy,
    setSelectedHierarchy,
    dateRange,
    setDateRange
  } = useFilter();

  const userInitial = user?.user_code?.[0]?.toUpperCase() || "U";

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
    <div className="flex flex-1 items-center justify-between px-4 h-full bg-white border-b border-slate-200">
      <div className="flex items-center space-x-4 flex-1">
        {/* Desktop Sidebar Trigger */}
        <SidebarTrigger className="hidden lg:flex h-9 w-9 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200" />

        {/* Mobile Left Menu (Sheet) */}
        <div className="flex lg:hidden items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-purple-600 hover:bg-purple-50">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 border-r-0 shadow-2xl">
              <SheetHeader className="p-4 border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-auto">
                    <img src="/gopocket.png" alt="gopocket" className="h-full w-auto" />
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-col p-4 gap-6 overflow-y-auto max-h-[calc(100vh-80px)]">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch/Team Filter</p>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <VirtualizedTree
                      data={hierarchyData || []}
                      value={selectedHierarchy}
                      onChange={setSelectedHierarchy}
                      placeholder="Select Team/Branch"
                      className="w-full border-none shadow-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KYC Progress</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <KYCTracker />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applications</p>
                  <div className="grid grid-cols-1 gap-1">
                    <Button variant="ghost" onClick={() => { navigate("/kyc"); }} className="justify-start gap-4 h-12 text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition-all rounded-xl">
                      <Sparkle size={18} className="text-slate-400" />
                      <span className="font-semibold">CRM App</span>
                    </Button>
                    <Button variant="ghost" onClick={() => { navigate("/settings"); }} className="justify-start gap-4 h-12 text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition-all rounded-xl">
                      <Settings size={18} className="text-slate-400" />
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
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <VirtualizedTree
              data={hierarchyData || []}
              value={selectedHierarchy}
              onChange={setSelectedHierarchy}
              placeholder="Select Team/Branch"
              className="w-[300px] border-none shadow-none focus:ring-0"
            />
          </div>
        </div>

        {/* Icons Container */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 h-8">
          <button
            onClick={() => navigate("/settings")}
            className="relative p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 group"
          >
            <Sparkle size={18} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Settings
            </div>
          </button>

          <button className="relative p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 group">
            <AlarmClockCheckIcon size={18} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-[10px] text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Tasks
            </div>
          </button>

          <button className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 group">
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
        <Notification />
      </div>

      {/* User Dropdown (Common) */}
      <div className="flex items-center">

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-3 px-2 hover:bg-slate-50 h-10 border border-transparent hover:border-slate-100 rounded-xl transition-all">
              <Avatar className="h-8 w-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-slate-200">
                <AvatarFallback className="bg-slate-900 text-white text-[10px] font-bold">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-l font-bold text-slate-800 leading-tight">{user?.user_code || "User"}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-xl border-slate-200/60 p-1.5">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-lg gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
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
