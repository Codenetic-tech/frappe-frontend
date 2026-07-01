import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, CheckSquare, Mail, MessageCircle, FileText, MessageSquare,
  ChevronRight, Home, IndianRupee, Video, Phone,
  Search, Filter, RefreshCw,
  ChevronLeft, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { LeadItem } from './Leads';
import LeadFormTab from '@/components/CRM/LeadDetails/LeadFormTab';
import LeadCommentsTab from '@/components/CRM/LeadDetails/LeadCommentsTab';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Stubs for future full implementation
const LeadTasksTab = () => <div className="p-8 text-center text-slate-500 italic">Tasks feature coming soon...</div>;
const WhatsAppTab = () => <div className="p-8 text-center text-slate-500 italic">WhatsApp integration coming soon...</div>;

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const LeadDetails: React.FC = () => {
  const { user } = useAuth();
  const { leadId } = useParams<{ leadId: string }>();

  const {
    data: leadData,
    isLoading: isLeadLoading,
    error: leadError,
    mutate: refetchLead
  } = useFrappeGetDoc<any>('CRM Lead', leadId || undefined);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'form');

  useEffect(() => {
    if (leadData) {
      setLead(leadData);
    }
  }, [leadData]);

  const tabs: Tab[] = [
    { id: 'form', label: 'Lead Details', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'comment', label: 'Comments', icon: MessageSquare },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
  ];

  // Retrieve leads list from sessionStorage for navigation
  const allLeads = useMemo(() => {
    const stored = sessionStorage.getItem('leadsData');
    return stored ? JSON.parse(stored) : [];
  }, [leadId]);

  // Find current lead index for navigation
  const currentLeadIndex = useMemo(() => {
    return allLeads.findIndex(l => l.name === leadId);
  }, [allLeads, leadId]);

  useEffect(() => {
    if (leadId && allLeads.length > 0) {
      const currentLead = allLeads.find(l => l.name === leadId);
      if (currentLead) {
        setLead(currentLead);
      }
    }
  }, [leadId, allLeads]);

  const goToPreviousLead = () => {
    if (currentLeadIndex > 0) {
      const previousLead = allLeads[currentLeadIndex - 1];
      navigate(`/leads/${previousLead.name}`);
    }
  };

  const goToNextLead = () => {
    if (currentLeadIndex < allLeads.length - 1) {
      const nextLead = allLeads[currentLeadIndex + 1];
      navigate(`/leads/${nextLead.name}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'won': return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900';
      case 'new': return 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900';
      case 'followup': return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      case 'not interested': return 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    }
  };

  if (!lead && !isLeadLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 text-foreground bg-card">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Lead Not Found</h2>
        <p className="text-slate-500 dark:text-slate-450 mb-6">The requested lead could not be located in your list.</p>
        <Button onClick={() => navigate('/leads')} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
          Back to Leads
        </Button>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-300 bg-stone-200/50 dark:bg-slate-950/50 overflow-hidden">
      <div className="space-y-6 flex-1 flex flex-col min-h-0 p-4">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <button onClick={() => navigate('/leads')} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1.5 focus:outline-none">
              <Home size={16} />
              CRM
            </button>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
            <button onClick={() => navigate('/leads')} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors focus:outline-none">
              Leads
            </button>
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
            <span className="text-slate-900 dark:text-slate-100 font-bold">{lead.name}</span>
            <div className={cn("ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusColor(lead.status))}>
              {lead.status}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousLead}
              disabled={currentLeadIndex <= 0}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-3 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              {currentLeadIndex + 1} / {allLeads.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextLead}
              disabled={currentLeadIndex >= allLeads.length - 1}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs Layout */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
          <div className="flex flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-950/30'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                    }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 w-full">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeTab === 'form' && lead && (
                <LeadFormTab
                  lead={lead}
                  leadId={lead.name}
                  onLeadUpdate={(updated) => {
                    setLead(updated);
                    refetchLead();
                  }}
                />
              )}
              {activeTab === 'activity' && <div className="p-8 text-center text-slate-400 italic">Timeline View Coming Soon...</div>}
              {activeTab === 'comment' && (
                <LeadCommentsTab
                  lead={lead}
                  onNoteAdded={() => refetchLead()}
                />
              )}
              {activeTab === 'task' && <LeadTasksTab />}
              {activeTab === 'whatsapp' && <WhatsAppTab />}
              {activeTab === 'email' && <div className="p-8 text-center text-slate-400 italic">Email Communication Log Coming Soon...</div>}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;
