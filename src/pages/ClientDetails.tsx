import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight, Home, ChevronLeft, Users, User,
  FileText, Briefcase, Wallet, CreditCard, LayoutDashboard,
  Calendar, Phone, MapPin, Building, Globe, CheckCircle2, RefreshCw,
  Mail, ShieldAlert, Activity, UserCheck, Coins, Map, Heart, FileCheck2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { ClientItem } from './Clients';
import ClientHoldingsTab from '@/components/CRM/ClientDetails/ClientHoldingsTab';
import ClientOrdersTab from '@/components/CRM/ClientDetails/ClientOrdersTab';
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
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Retrieve client details from Gopocket Client doctype
  const {
    data: clientData,
    isLoading: isClientLoading,
    error: clientError,
    mutate: refetchClient
  } = useFrappeGetDoc<any>('Gopocket Client', clientId || undefined);

  // Map clientData to any to allow newly added backend fields
  const client = clientData as any;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchClient();
      setRefreshKey(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  };

  const tabs: Tab[] = [
    { id: 'info', label: 'Account Info', icon: User },
    { id: 'holdings', label: 'Holdings', icon: Briefcase },
    { id: 'orders', label: 'Orders', icon: LayoutDashboard },
    { id: 'ledger', label: 'Ledger', icon: Wallet },
    // { id: 'trade_report', label: 'Trade Report', icon: FileText },
    { id: 'order_report', label: 'Order Report', icon: FileText }
  ];

  // Retrieve clients list from sessionStorage for navigation
  const allClients = useMemo(() => {
    const stored = sessionStorage.getItem('clientsData');
    return stored ? JSON.parse(stored) : [];
  }, [clientId]);

  // Find current client index for navigation
  const currentClientIndex = useMemo(() => {
    return allClients.findIndex((c: any) => c.client_code === clientId || c.name === clientId);
  }, [allClients, clientId]);

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
      case 'ACTIVE': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/55';
      case 'CLOSED': return 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/55';
      case 'DORMANT': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/55';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700';
    }
  };

  if (isClientLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[60vh] text-slate-400 dark:text-slate-500 gap-2">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
        <span className="text-sm">Fetching client details...</span>
      </div>
    );
  }

  if (clientError || (!client && !isClientLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Client Not Found</h2>
        <p className="text-slate-505 dark:text-slate-400 mb-6">
          {clientError ? (clientError.message || 'An error occurred while loading client details.') : 'The requested client could not be located.'}
        </p>
        <Button onClick={() => navigate('/clients')} className="rounded-xl bg-purple-600 hover:bg-purple-700">
          Back to Clients
        </Button>
      </div>
    );
  }

  if (!client) return null;

  const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-850 last:border-0 group">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={15} className="text-slate-400 dark:text-slate-550 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />}
        <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-150">{value || '-'}</span>
    </div>
  );

  const AddressRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
    <div className="flex flex-col py-1.5 border-b border-slate-50 dark:border-slate-850 last:border-0 group gap-1">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={15} className="text-slate-400 dark:text-slate-550 group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />}
        <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 leading-normal pl-6">{value || '-'}</span>
    </div>
  );

  const SegmentCard = ({ label, status }: { label: string, status: string | undefined }) => {
    const s = status?.toUpperCase() || 'INACTIVE';
    const isAct = s === 'ACTIVE';
    const isDor = s === 'DORMANT';
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100/70 dark:border-slate-800/80 text-center hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <Badge className={cn(
          "text-[10px] font-extrabold px-2.5 py-0.5 h-5 border-none rounded-full",
          isAct ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50" :
          isDor ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50" :
          "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}>
          {status || 'INACTIVE'}
        </Badge>
      </div>
    );
  };

  const ExchangeBadge = ({ label, status }: { label: string, status: string | undefined }) => {
    const isActive = status?.toUpperCase() === 'ACTIVE';
    return (
      <div className="flex flex-col items-center gap-1 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 min-w-[80px]">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <Badge className={cn(
          "text-[10px] font-bold px-2 py-0 h-5 border-none",
          isActive ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-450"
        )}>
          {status || 'N/A'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-stone-200/50 dark:bg-slate-950/50">
      <div className="space-y-6 flex-1 flex flex-col min-h-0 p-4">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium font-sans">
            <button onClick={() => navigate('/clients')} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 focus:outline-none bg-transparent">
              <Home size={16} />
              Backoffice
            </button>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
            <button onClick={() => navigate('/clients')} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors focus:outline-none bg-transparent">
              Clients
            </button>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
            <span className="text-slate-900 dark:text-slate-100 font-bold">{client.client_code}</span>
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
              className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-3 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800">
              {currentClientIndex + 1} / {allClients.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextClient}
              disabled={currentClientIndex >= allClients.length - 1}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0 flex items-center justify-between">
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
                      ? 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-500" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center px-4 border-l border-slate-100 dark:border-slate-800">
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-450 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all bg-transparent"
              title="Refresh current tab"
            >
              <RefreshCw size={18} className={cn("transition-transform duration-500", refreshKey && "hover:rotate-180")} />
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
          <ScrollArea className="flex-1 w-full">
            <div className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={cn("w-full space-y-4", activeTab !== 'info' && "hidden")}>
                {/* Segment Status Cards */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Segment Status</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    <SegmentCard label="NSE" status={client.nse} />
                    <SegmentCard label="BSE" status={client.bse} />
                    <SegmentCard label="MCX" status={client.mcx} />
                    <SegmentCard label="NFO" status={client.nfo} />
                    <SegmentCard label="BFO" status={client.bfo} />
                    <SegmentCard label="NCD" status={client.ncd} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-4">
                    {/* Personal Information Card */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Personal Information</h3>
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-3 border border-slate-100/70 dark:border-slate-800 space-y-0.5">
                        <InfoRow label="Client Name" value={client.client_name} icon={User} />
                        <InfoRow label="Gender" value={client.gender === 'M' ? 'Male' : client.gender === 'F' ? 'Female' : client.gender || '-'} icon={Users} />
                        <InfoRow label="Date of Birth" value={client.dob} icon={Calendar} />
                        <InfoRow label="Marital Status" value={client.marital_status} icon={Heart} />
                        <InfoRow label="PAN Number" value={client.pan_number} icon={CreditCard} />
                        <InfoRow label="Occupation" value={client.occupation} icon={Briefcase} />
                        <InfoRow label="Annual Income" value={client.annual_income} icon={Coins} />
                      </div>
                    </div>

                    {/* Organization & Hierarchy Card */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Organization & Hierarchy</h3>
                      <div className="bg-slate-50/50 dark:bg-slate-955/20 rounded-xl p-3 border border-slate-100/70 dark:border-slate-800 space-y-0.5">
                        <InfoRow label="Branch" value={client.branch} icon={Building} />
                        <InfoRow label="Parent Code" value={client.parent1} icon={Globe} />
                        <InfoRow label="Parent Type" value={client.parent_type} icon={Users} />
                      </div>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-4">
                    {/* Account Details Card */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Account Details</h3>
                      <div className="bg-slate-50/50 dark:bg-slate-955/20 rounded-xl p-3 border border-slate-100/70 dark:border-slate-800 space-y-0.5">
                        <InfoRow label="Client Code" value={client.client_code} icon={User} />
                        <InfoRow label="BO Code" value={client.bo_code} icon={FileText} />
                        <InfoRow label="Account Opened" value={client.account_opened_date} icon={Calendar} />
                        <InfoRow label="Customer Type" value={client.customer_type} icon={UserCheck} />
                        <InfoRow label="Authorize Type" value={client.authorize_type} icon={FileCheck2} />
                      </div>
                    </div>

                    {/* Trading & Compliance Card */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Trading & Compliance</h3>
                      <div className="bg-slate-50/50 dark:bg-slate-955/20 rounded-xl p-3 border border-slate-100/70 dark:border-slate-800 space-y-0.5">
                        <InfoRow label="Status" value={client.activation_status} icon={CheckCircle2} />
                        <InfoRow label="Trade Done" value={client.trade_done} icon={Activity} />
                        <InfoRow label="Traded Days" value={client.traded_days !== undefined && client.traded_days !== null ? String(client.traded_days) : undefined} icon={Calendar} />
                        <InfoRow label="First Trade Date" value={client.first_trade_day} icon={Calendar} />
                        <InfoRow label="Last Trade Date" value={client.last_traded_day} icon={Calendar} />
                        <InfoRow label="SEBI Action" value={client.sebi_action !== undefined && client.sebi_action !== null ? String(client.sebi_action) : undefined} icon={ShieldAlert} />
                      </div>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="space-y-4">
                    {/* Contact Information Card */}
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Contact Information</h3>
                      <div className="bg-slate-50/50 dark:bg-slate-955/20 rounded-xl p-3 border border-slate-100/70 dark:border-slate-800 space-y-0.5">
                        <InfoRow label="Mobile Number" value={client.mobile_number} icon={Phone} />
                        <InfoRow label="Email Address" value={client.email_id} icon={Mail} />
                        <InfoRow label="State" value={client.state} icon={MapPin} />
                        <InfoRow label="PIN Code" value={client.pin} icon={MapPin} />
                        <AddressRow label="Address" value={client.address} icon={Map} />
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
