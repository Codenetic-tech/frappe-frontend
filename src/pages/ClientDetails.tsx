import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight, Home, ChevronLeft, Users, User,
  FileText, Briefcase, Wallet, CreditCard, LayoutDashboard,
  Calendar, Phone, MapPin, Building, Globe, CheckCircle2, RefreshCw
} from 'lucide-react';
import { useClients, ClientItem } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import ClientHoldingsTab from '@/components/CRM/ClientDetails/ClientHoldingsTab';
import ClientOrdersTab from '@/components/CRM/ClientDetails/ClientOrdersTab';
import ClientTradeReportTab from '@/components/CRM/ClientDetails/ClientTradeReportTab';
import ClientOrderReportTab from '@/components/CRM/ClientDetails/ClientOrderReportTab';
import ClientLedgerTab from '@/components/CRM/ClientDetails/ClientLedgerTab';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const ClientDetails: React.FC = () => {
  const { user } = useAuth();
  const { clientsData, isLoading: contextLoading } = useClients();
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [client, setClient] = useState<ClientItem | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const handleRefresh = () => {
    setRefreshKey(Date.now());
  };

  const tabs: Tab[] = [
    { id: 'info', label: 'Account Info', icon: User },
    { id: 'holdings', label: 'Holdings', icon: Briefcase },
    { id: 'orders', label: 'Orders', icon: LayoutDashboard },
    { id: 'ledger', label: 'Ledger', icon: Wallet },
    // { id: 'trade_report', label: 'Trade Report', icon: FileText },
    { id: 'order_report', label: 'Order Report', icon: FileText }
  ];

  // Map clientsData to a sorted list for navigation (using the same sorting as the table if possible, but default to client_code)
  const allClients = useMemo(() => {
    if (!clientsData) return [];
    return [...clientsData];
  }, [clientsData]);

  // Find current client index for navigation
  const currentClientIndex = useMemo(() => {
    return allClients.findIndex(c => c.client_code === clientId || c.name === clientId);
  }, [allClients, clientId]);

  useEffect(() => {
    if (clientId && allClients.length > 0) {
      const currentClient = allClients.find(c => c.client_code === clientId || c.name === clientId);
      if (currentClient) {
        setClient(currentClient);
      }
    }
  }, [clientId, allClients]);

  const goToPreviousClient = () => {
    if (currentClientIndex > 0) {
      const previousClient = allClients[currentClientIndex - 1];
      navigate(`/clients/${previousClient.client_code}`);
    }
  };

  const goToNextClient = () => {
    if (currentClientIndex < allClients.length - 1) {
      const nextClient = allClients[currentClientIndex + 1];
      navigate(`/clients/${nextClient.client_code}`);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CLOSED': return 'bg-red-100 text-red-700 border-red-200';
      case 'DORMANT': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!client && !contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Client Not Found</h2>
        <p className="text-slate-500 mb-6">The requested client could not be located in your current list.</p>
        <Button onClick={() => navigate('/clients')} className="rounded-xl bg-purple-600 hover:bg-purple-700">
          Back to Clients
        </Button>
      </div>
    );
  }

  if (!client) return null;

  const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={16} className="text-slate-400 group-hover:text-purple-500 transition-colors" />}
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value || '-'}</span>
    </div>
  );

  const ExchangeBadge = ({ label, status }: { label: string, status: string | undefined }) => {
    const isActive = status?.toUpperCase() === 'ACTIVE';
    return (
      <div className="flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[80px]">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <Badge className={cn(
          "text-[10px] font-bold px-2 py-0 h-5 border-none",
          isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
        )}>
          {status || 'N/A'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-stone-200/50">
      <div className="space-y-6 flex-1 flex flex-col min-h-0">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium font-sans">
            <button onClick={() => navigate('/clients')} className="hover:text-purple-600 transition-colors flex items-center gap-1.5 focus:outline-none">
              <Home size={16} />
              Backoffice
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <button onClick={() => navigate('/clients')} className="hover:text-purple-600 transition-colors focus:outline-none">
              Clients
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-900 font-bold">{client.client_code}</span>
            <div className={cn("ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusColor(client.activation_status))}>
              {client.activation_status}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousClient}
              disabled={currentClientIndex <= 0}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-3 py-1.5 bg-slate-100/50 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
              {currentClientIndex + 1} / {allClients.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextClient}
              disabled={currentClientIndex >= allClients.length - 1}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Header Summary Card */}
        {/* <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 shrink-0 bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 shadow-inner">
                <User size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.client_name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building size={14} className="text-slate-400" />
                    {client.branch}
                  </div>
                  <span className="text-slate-200">•</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone size={14} className="text-slate-400" />
                    {client.mobile_number}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ExchangeBadge label="NSE" status={client.nse} />
              <ExchangeBadge label="BSE" status={client.bse} />
              <ExchangeBadge label="MCX" status={client.mcx} />
              <ExchangeBadge label="NFO" status={client.nfo} />
            </div>
          </div>
        </div> */}

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 flex items-center justify-between">
          <div className="flex overflow-x-auto no-scrollbar flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap relative min-w-[140px] justify-center",
                    activeTab === tab.id
                      ? 'text-purple-600 bg-purple-50/50'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center px-4 border-l border-slate-100">
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="Refresh current tab"
            >
              <RefreshCw size={18} className={cn("transition-transform duration-500", refreshKey && "hover:rotate-180")} />
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
          <ScrollArea className="flex-1 w-full">
            <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={cn("max-w-4xl mx-auto space-y-8", activeTab !== 'info' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Details</h3>
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-1">
                        <InfoRow label="Client Code" value={client.client_code} icon={User} />
                        <InfoRow label="Account Opened" value={client.account_opened_date} icon={Calendar} />
                        <InfoRow label="Status" value={client.activation_status} icon={CheckCircle2} />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Organization & Hierarchy</h3>
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-1">
                        <InfoRow label="Branch" value={client.branch} icon={Building} />
                        <InfoRow label="Parent / Partner" value={client.parent1} icon={Globe} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-1">
                        <InfoRow label="Mobile Number" value={client.mobile_number} icon={Phone} />
                        <InfoRow label="Email Address" value="-" icon={FileText} />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Trading Summary</h3>
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-1">
                        <InfoRow label="Last Trade Date" value={client.last_trade_date} icon={Calendar} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cn("w-full", activeTab !== 'holdings' && "hidden")}>
                <ClientHoldingsTab clientCode={client.client_code} refreshKey={refreshKey} />
              </div>

              <div className={cn("w-full", activeTab !== 'orders' && "hidden")}>
                <ClientOrdersTab clientCode={client.client_code} refreshKey={refreshKey} />
              </div>

              <div className={cn("w-full", activeTab !== 'ledger' && "hidden")}>
                <ClientLedgerTab clientCode={client.client_code} refreshKey={refreshKey} />
              </div>

              <div className={cn("w-full", activeTab !== 'trade_report' && "hidden")}>
                <ClientTradeReportTab clientCode={client.client_code} refreshKey={refreshKey} />
              </div>

              <div className={cn("w-full", activeTab !== 'order_report' && "hidden")}>
                <ClientOrderReportTab clientCode={client.client_code} refreshKey={refreshKey} />
              </div>
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
