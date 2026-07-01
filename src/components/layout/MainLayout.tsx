import React, { useState, useEffect } from "react";
import Navbar from "../dashboard/Navbar";
import Watchlist from "./Watchlist";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TemplateCustomizer } from "./TemplateCustomizer";

import { AppSidebar } from "./AppSidebar";
import BottomNav from "./BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
    const { isInitialLoading } = useAuth();
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
        const stored = localStorage.getItem("sidebar-expanded");
        return stored === "true"; // Defaults to false if not "true"
    });

    const [scrollWholePage, setScrollWholePage] = useState<boolean>(() => {
        return localStorage.getItem("scroll-whole-page") === "true";
    });

    // Listen for changes in localStorage (from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const newPosition = (localStorage.getItem("watchlist-position") as "left" | "right") || "left";
            setWatchlistPosition(newPosition);

            const sidebarEnabled = localStorage.getItem("sidebar-enabled") !== "false";
            setIsSidebarEnabled(sidebarEnabled);

            const headerEnabled = localStorage.getItem("header-enabled") !== "false";
            setIsHeaderEnabled(headerEnabled);

            const sidebarExpanded = localStorage.getItem("sidebar-expanded") === "true";
            setIsSidebarExpanded(sidebarExpanded);

            const scrollPreference = localStorage.getItem("scroll-whole-page") === "true";
            setScrollWholePage(scrollPreference);
        };

        window.addEventListener("storage", handleStorageChange);
        // Custom event for same-tab updates
        window.addEventListener("layout-changed", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("layout-changed", handleStorageChange);
        };
    }, []);

    const handleSidebarOpenChange = (open: boolean) => {
        setIsSidebarExpanded(open);
        localStorage.setItem("sidebar-expanded", open.toString());
        // Dispatch event for other potential listener components
        window.dispatchEvent(new CustomEvent("layout-changed"));
    };

    return (
        <SidebarProvider open={isSidebarExpanded} onOpenChange={handleSidebarOpenChange}>
            <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
                {/* Full Height Sidebar */}
                {isSidebarEnabled && <AppSidebar />}

                <SidebarInset className="flex flex-col flex-1 overflow-hidden h-full bg-background">
                    {/* Top Header inside main area */}
                    {isHeaderEnabled && (
                        <header className="bg-card text-card-foreground border-b border-border shrink-0 h-16 flex items-center">
                            <Navbar />
                        </header>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
                        <div className={`flex flex-1 overflow-hidden gap-4 ${watchlistPosition === "right" ? "flex-row-reverse" : "flex-row"}`}>
                            {/* Watchlist (30%) - Hidden on small screens */}
                            {/* <aside className="hidden lg:block w-[30%] min-w-[280px] max-w-[400px] h-full bg-white rounded-xl shadow-sm overflow-hidden">
                                <Watchlist />
                            </aside> */}

                            {/* Dashboard Content (70% - expands to fill) */}
                            <main className="flex-1 h-full bg-card text-card-foreground border border-border/30 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                {scrollWholePage ? (
                                    <ScrollArea className="flex-1 h-full w-full">
                                        {children}
                                    </ScrollArea>
                                ) : (
                                    children
                                )}
                            </main>
                        </div>
                    </div>

                    {/* Bottom Navigation (Mobile Only) */}
                    <BottomNav />
                </SidebarInset>
            </div>
            <TemplateCustomizer />
        </SidebarProvider>
    );
};

export default MainLayout;
