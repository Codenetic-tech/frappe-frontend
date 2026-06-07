import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFrappeGetDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import {
  ChevronRight, Home, ChevronLeft, User, FileText,
  Clock, AlertCircle, Info, RefreshCw, Loader2,
  Calendar, CheckCircle2, Globe, Building, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const ActivityLogDetails: React.FC = () => {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form editing state
  const [formStatus, setFormStatus] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const tabs: Tab[] = [
    { id: 'info', label: 'Log Information', icon: User },
    { id: 'trace', label: 'Message & Trace', icon: FileText }
  ];

  // Retrieve logs list from sessionStorage for navigation
  const allLogs = useMemo(() => {
    const stored = sessionStorage.getItem('activityLogsData');
    return stored ? JSON.parse(stored) : [];
  }, [logId]);

  // Find current index
  const currentLogIndex = useMemo(() => {
    return allLogs.findIndex((l: any) => l.name === logId);
  }, [allLogs, logId]);

  // Document details query
  const {
    data: docDetails,
    isLoading,
    error: docError,
    mutate: refetchDoc
  } = useFrappeGetDoc<any>('Activity Log', logId || undefined);

  // Update query hook
  const { updateDoc, loading: isSaving } = useFrappeUpdateDoc();

  // Populate form fields on data load
  useEffect(() => {
    if (docDetails) {
      setFormStatus(docDetails.status || '');
      setFormFullName(docDetails.full_name || '');
      setFormSubject(docDetails.subject || '');
      setFormMessage(docDetails.message || '');
    }
  }, [docDetails]);

  const goToPreviousLog = () => {
    if (currentLogIndex > 0) {
      navigate(`/activity-log/${allLogs[currentLogIndex - 1].name}`);
    }
  };

  const goToNextLog = () => {
    if (currentLogIndex < allLogs.length - 1) {
      navigate(`/activity-log/${allLogs[currentLogIndex + 1].name}`);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchDoc();
      toast({
        title: 'Refreshed',
        description: 'Activity log details have been updated.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logId) return;

    try {
      await updateDoc('Activity Log', logId, {
        status: formStatus,
        full_name: formFullName,
        subject: formSubject,
        message: formMessage,
      });
      toast({
        title: 'Document Updated',
        description: `Successfully updated activity log ${logId}.`,
      });
      refetchDoc();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'An error occurred while saving.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Failed':
      case 'Error':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Info': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={16} className="text-slate-400 group-hover:text-purple-500 transition-colors" />}
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value || '-'}</span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="text-sm">Fetching document details...</span>
      </div>
    );
  }

  if (docError || !docDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Log Not Found</h2>
        <p className="text-slate-500 mb-6">The requested activity log details could not be loaded.</p>
        <Button onClick={() => navigate('/activity-log')} className="rounded-xl bg-purple-600 hover:bg-purple-700">
          Back to Activity Logs
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-stone-200/50">
      <form onSubmit={handleSave} className="space-y-6 flex-1 flex flex-col min-h-0">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 px-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium font-sans">
            <button
              type="button"
              onClick={() => navigate('/activity-log')}
              className="hover:text-purple-600 transition-colors flex items-center gap-1.5 focus:outline-none"
            >
              <Home size={16} />
              Backoffice
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <button
              type="button"
              onClick={() => navigate('/activity-log')}
              className="hover:text-purple-600 transition-colors focus:outline-none"
            >
              Activity Log
            </button>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-900 font-bold">{logId}</span>
            <div className={cn("ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", getStatusColor(docDetails.status))}>
              {docDetails.status || 'N/A'}
            </div>
          </div>

          {allLogs.length > 0 && currentLogIndex !== -1 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToPreviousLog}
                disabled={currentLogIndex <= 0}
                className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              >
                <ChevronLeft size={18} />
              </Button>
              <div className="px-3 py-1.5 bg-slate-100/50 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
                {currentLogIndex + 1} / {allLogs.length}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToNextLog}
                disabled={currentLogIndex >= allLogs.length - 1}
                className="rounded-xl h-9 w-9 p-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 flex items-center justify-between">
          <div className="flex overflow-x-auto no-scrollbar flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap relative min-w-[160px] justify-center",
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
              type="button"
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
              title="Refresh details"
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={cn("transition-transform duration-500", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
          <ScrollArea className="flex-1 w-full">
            <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Tab 1: Log Information */}
              <div className={cn("max-w-4xl mx-auto space-y-8", activeTab !== 'info' && "hidden")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left column: Editable Fields */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Edit Log details</h3>
                      <div className="bg-slate-50/30 rounded-2xl p-6 border border-slate-100 space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="formFullName" className="text-slate-700 font-semibold text-xs">
                            User Full Name
                          </Label>
                          <Input
                            id="formFullName"
                            value={formFullName}
                            onChange={(e) => setFormFullName(e.target.value)}
                            placeholder="Enter user name"
                            className="border-slate-200 rounded-xl bg-white focus-visible:ring-purple-500 focus-visible:border-purple-300"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="formStatus" className="text-slate-700 font-semibold text-xs">
                            Status
                          </Label>
                          <Select value={formStatus} onValueChange={setFormStatus}>
                            <SelectTrigger id="formStatus" className="border-slate-200 rounded-xl bg-white">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                              <SelectItem value="Success">Success</SelectItem>
                              <SelectItem value="Failed">Failed</SelectItem>
                              <SelectItem value="Error">Error</SelectItem>
                              <SelectItem value="Warning">Warning</SelectItem>
                              <SelectItem value="Info">Info</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="formSubject" className="text-slate-700 font-semibold text-xs">
                            Subject
                          </Label>
                          <Input
                            id="formSubject"
                            value={formSubject}
                            onChange={(e) => setFormSubject(e.target.value)}
                            placeholder="Activity subject"
                            className="border-slate-200 rounded-xl bg-white focus-visible:ring-purple-500 focus-visible:border-purple-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column: Readonly Metadata */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Log Metadata</h3>
                      <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-1">
                        <InfoRow label="Log ID" value={docDetails.name} icon={Code} />
                        <InfoRow label="Operation Type" value={docDetails.operation} icon={Globe} />
                        <InfoRow label="Owner / Creator" value={docDetails.owner} icon={User} />
                        <InfoRow label="Created On" value={formatDateTime(docDetails.creation)} icon={Calendar} />
                        <InfoRow label="Modified On" value={formatDateTime(docDetails.modified)} icon={Clock} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab 2: Message & Trace */}
              <div className={cn("max-w-4xl mx-auto space-y-6", activeTab !== 'trace' && "hidden")}>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Message / Exception Trace</h3>
                  <div className="bg-slate-50/30 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <Textarea
                      id="formMessage"
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      placeholder="Detail log message contents..."
                      className="border-slate-200 rounded-xl min-h-[300px] font-mono text-xs bg-white focus-visible:ring-purple-500 focus-visible:border-purple-300"
                    />
                  </div>
                </div>
              </div>
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          {/* Sticky footer for saving changes */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/activity-log')}
              className="border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md font-bold px-6"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ActivityLogDetails;
