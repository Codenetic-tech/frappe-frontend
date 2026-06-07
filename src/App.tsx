import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { KycProvider } from "@/contexts/KycContext";
import { ClientProvider } from "@/contexts/ClientContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { LeadProvider } from "@/contexts/LeadContext";
import { AnnouncementProvider } from "@/contexts/AnnouncementContext";
import { OrgTreeProvider } from "@/contexts/OrgTreeContext";
import Index from "./pages/Index";
import OrderBook from "./pages/OrderBook";
import PositionBook from "./pages/PositionBook";
import Holdings from "./pages/Holdings";
import Clients from "./pages/Clients";
import MutualFunds from "./pages/MutualFunds";
import Settings from "./pages/Settings";
import StrategyBuilder from "./pages/StrategyBuilder";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Kyc from "./pages/Kyc";
import Leads from "./pages/Leads";
import LeadDetails from "./pages/LeadDetails";
import ActivityLog from "./pages/ActivityLog";
import ActivityLogDetails from "./pages/ActivityLogDetails";
import ClientDetails from "./pages/ClientDetails";
import Announcements from "./pages/Announcements";
import Updates from "./pages/Updates";
import TasksKanbanPage from "./pages/TasksKanbanPage";
import CrmDashboard from "./pages/CrmDashboard";
import Tickets from "./pages/Tickets";
import TicketDetails from "./pages/TicketDetails";
import Subscription from "./pages/Subscription";
import Revenue from "./pages/Revenue";
import { TicketProvider } from "@/contexts/TicketContext";
import { RevenueProvider } from "@/contexts/RevenueContext";
import { CrmDashboardProvider } from "@/contexts/CrmDashboardContext";
import MainLayout from "./components/layout/MainLayout";
import { Sparkles } from "lucide-react";
import { TaskProvider } from "@/contexts/TaskContext";
import { FrappeProvider } from "frappe-react-sdk";

const queryClient = new QueryClient();

// Coming Soon component for new routes
const ComingSoon = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon...</h2>
      <p className="text-gray-600 max-w-md">
        This page is under development and will be available soon...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const TICKETING_DEPARTMENTS = [
  'RMS',
  'IT',
  'BANKING',
  'DP',
  'KYC',
  'DIGITAL MARKETING',
  'AP',
  'CUSTOMER SUPPORT',
  'OPERATIONS',
  'COMPLIANCE'
];

const HomeRedirect = () => {
  const { user } = useAuth();

  if (user?.department && TICKETING_DEPARTMENTS.includes(user.department.toUpperCase())) {
    return <Navigate to="/ticketing" replace />;
  }

  return <Navigate to="/leads" replace />;
};

const AppContent = () => {
  useEffect(() => {
    const savedHsl = localStorage.getItem("theme-color-hsl");
    if (savedHsl) {
      document.documentElement.style.setProperty("--primary", savedHsl);
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orderbook"
        element={
          <ProtectedRoute>
            <OrderBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/positions"
        element={
          <ProtectedRoute>
            <PositionBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/holdings"
        element={
          <ProtectedRoute>
            <Holdings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mutualfunds"
        element={
          <ProtectedRoute>
            <MutualFunds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticketing"
        element={
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ticketing/:ticketId"
        element={
          <ProtectedRoute>
            <TicketDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/strategy-builder"
        element={
          <ProtectedRoute>
            <StrategyBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <Kyc />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId"
        element={
          <ProtectedRoute>
            <ClientDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm-dashboard"
        element={
          <ProtectedRoute>
            <CrmDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-log"
        element={
          <ProtectedRoute>
            <ActivityLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-log/:logId"
        element={
          <ProtectedRoute>
            <ActivityLogDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads/:leadId"
        element={
          <ProtectedRoute>
            <LeadDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/updates"
        element={
          <ProtectedRoute>
            <Updates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksKanbanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />
      <Route
        path="/revenue"
        element={
          <ProtectedRoute>
            <Revenue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hrms"
        element={
          <ProtectedRoute>
            <ComingSoon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/task"
        element={<Navigate to="/tasks" replace />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <FrappeProvider url='' socketPort='8081' swrConfig={{ revalidateOnFocus: false, }}>
        <AuthProvider>
          <OrgTreeProvider>
            <FilterProvider>
              <TooltipProvider>
                <LeadProvider>
                  <KycProvider>
                    <ClientProvider>
                      <RevenueProvider>
                        <CrmDashboardProvider>
                          <AnnouncementProvider>
                            <TicketProvider>
                              <TaskProvider>
                                <Toaster />
                                <Sonner />
                                <BrowserRouter>
                                  <AppContent />
                                </BrowserRouter>
                              </TaskProvider>
                            </TicketProvider>
                          </AnnouncementProvider>
                        </CrmDashboardProvider>
                      </RevenueProvider>
                    </ClientProvider>
                  </KycProvider>
                </LeadProvider>
              </TooltipProvider>
            </FilterProvider>
          </OrgTreeProvider>
        </AuthProvider>
      </FrappeProvider>
    </QueryClientProvider>
  );
};

export default App;
