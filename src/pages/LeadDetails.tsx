import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, CheckSquare, Mail, MessageCircle, FileText, MessageSquare,
  ChevronRight, Home, IndianRupee, Video, Phone,
  Search, Filter, RefreshCw,
  ChevronLeft, Users,
} from 'lucide-react';
import { useLead, LeadItem } from '@/contexts/LeadContext';
import { useAuth } from '@/contexts/AuthContext';
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
  const { leadsData, isLoading: contextLoading, refreshLeadsData } = useLead();
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'form');

  const tabs: Tab[] = [
    { id: 'form', label: 'Lead Details', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'comment', label: 'Comments', icon: MessageSquare },
    { id: 'task', label: 'Tasks', icon: CheckSquare },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }
  ];

  // Map leadsData to a sorted list for navigation
  const allLeads = useMemo(() => {
    if (!leadsData) return [];
    return [...leadsData].sort((a, b) => new Date(b.creation).getTime() - new Date(a.creation).getTime());
  }, [leadsData]);

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
      case 'won': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'new': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'followup': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'not interested': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!lead && !contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Lead Not Found</h2>
        <p className="text-slate-500 mb-6">The requested lead could not be located in your list.</p>
        <Button onClick={() => navigate('/leads')} className="rounded-xl bg-purple-600 hover:bg-purple-700">
          Back to Leads
        </Button>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-300 bg-stone-200/50 overflow-hidden">
      <div className="space-y-6 flex-1 flex flex-col min-h-0">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <button onClick={() => navigate('/leads')} className="hover:text-purple-600 transition-colors flex items-center gap-1.5 focus:outline-none">
              <Home size={16} />
              CRM
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <button onClick={() => navigate('/leads')} className="hover:text-purple-600 transition-colors focus:outline-none">
              Leads
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-900 font-bold">{lead.name}</span>
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
              className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            >
              <ChevronLeft size={18} />
            </Button>
            <div className="px-3 py-1.5 bg-slate-100/50 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
              {currentLeadIndex + 1} / {allLeads.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextLead}
              disabled={currentLeadIndex >= allLeads.length - 1}
              className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs Layout */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 w-full">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {activeTab === 'form' && lead && (
                <LeadFormTab
                  lead={lead}
                  leadId={lead.name}
                  onLeadUpdate={(updated) => {
                    setLead(updated);
                    refreshLeadsData();
                  }}
                />
              )}
              {activeTab === 'activity' && <div className="p-8 text-center text-slate-400 italic">Timeline View Coming Soon...</div>}
              {activeTab === 'comment' && (
                <LeadCommentsTab
                  lead={lead}
                  onNoteAdded={() => refreshLeadsData()}
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
