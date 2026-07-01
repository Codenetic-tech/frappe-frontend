import React, { useState } from 'react';
import {
  Save,
  RefreshCw,
  Edit3,
  X,
  User,
  MapPin,
  Building,
  Globe,
  BadgeInfo,
  FileText,
  Users,
  TrendingUp,
  Tag,
  Target,
  BarChart3,
  Briefcase,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Phone,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { LeadItem } from '@/pages/Leads';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LeadTimer } from './LeadTimer';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadFormTabProps {
  lead: LeadItem;
  leadId: string;
  onLeadUpdate: (updatedLead: LeadItem) => void;
}

const indianLanguages = ['Tamil', 'Hindi', 'English', 'Telugu', 'Kannada', 'Malayalam'];
const statusOptions = [
  { value: 'New', label: 'New' },
  { value: 'Followup', label: 'Followup' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Call Back', label: 'Call Back' },
  { value: 'Switch off', label: 'Switch off' },
  { value: 'RNR', label: 'RNR' },
];
const professionOptions = ['Business', 'Student', 'Professional', 'Trader', 'Investor', 'Housewife', 'Retired', 'Other'];
const experienceOptions = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
const mediumOptions = ['Phone Call', 'WhatsApp', 'Email', 'SMS', 'In-Person', 'Video Call'];
const dematAccountOptions = ['0_to_25', '26_to_50', '51_to_100', '100_plus'];

const LeadFormTab: React.FC<LeadFormTabProps> = ({ lead, leadId, onLeadUpdate }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Partial<LeadItem>>({});
  const [updating, setUpdating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ trading: true, additional: false });

  const updateLead = async () => {
    if (!leadId || updating) return;
    setUpdating(true);
    try {
      const response = await fetch('https://n8n.gopocket.in/webhook/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Update Lead',
          employeeId: user?.user_code,
          email: user?.email,
          leadid: leadId,
          ...editedLead
        })
      });

      if (!response.ok) throw new Error(`Failed to update lead: ${response.status}`);

      const updatedLead = { ...lead, ...editedLead };
      onLeadUpdate(updatedLead as LeadItem);
      setIsEditing(false);
      setEditedLead({});
      toast({ variant: 'success', title: 'Lead Updated', description: 'Changes have been saved successfully.' });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update lead details.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) setEditedLead({});
    else setEditedLead(lead || {});
    setIsEditing(!isEditing);
  };

  const handleFieldChange = (field: keyof LeadItem, value: any) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: 'trading' | 'additional') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const CompactField = ({ icon: Icon, label, value, editValue, onChange, type = 'text', placeholder, options, span = 1, disabled = false }: any) => (
    <div className={cn("space-y-1.5", span === 2 ? "md:col-span-2" : "")}>
      <Label className="text-[11px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      {isEditing ? (
        options ? (
          <Select value={String(editValue ?? value ?? '')} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
              {options.map((opt: any) => (
                <SelectItem key={opt.value || opt} value={opt.value || opt} className="rounded-lg">
                  {opt.label || opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : type === 'textarea' ? (
          <Textarea
            value={String(editValue ?? value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={placeholder}
            className="resize-none rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            disabled={disabled}
          />
        ) : (
          <Input
            type={type}
            value={String(editValue ?? value ?? '')}
            onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={placeholder}
            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            disabled={disabled}
          />
        )
      ) : (
        <div className="px-4 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-sm font-semibold text-slate-700 dark:text-slate-350 min-h-[42px] flex items-center shadow-sm">
          {value || <span className="text-slate-400 dark:text-slate-500 font-medium italic">Not specified</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-8 ">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-950/40 rounded-2xl shadow-sm text-purple-600 dark:text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{lead.lead_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase tracking-wider">{lead.industry}</Badge>
              {lead.validity_date && <LeadTimer validityDate={lead.validity_date} />}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={updateLead} disabled={updating} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white h-10 px-6 font-bold uppercase tracking-wider shadow-md shadow-purple-100/10">
                {updating ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <Save size={16} className="mr-2" />}
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleEditToggle} className="rounded-xl h-10 px-6 font-bold uppercase tracking-wider border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-250 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X size={16} className="mr-2" /> Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEditToggle} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white h-10 px-6 font-bold uppercase tracking-wider shadow-md shadow-purple-100/10">
              <Edit3 size={16} className="mr-2" /> Edit Details
            </Button>
          )}
        </div>
      </div>

      <Separator className="bg-slate-100 dark:bg-slate-800" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              General Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CompactField icon={Globe} label="Language" value={lead.language} editValue={editedLead.language} onChange={(val: string) => handleFieldChange("language", val)} options={indianLanguages} />
              <CompactField icon={Tag} label="Status" value={lead.status} editValue={editedLead.status} onChange={(val: string) => handleFieldChange("status", val)} options={statusOptions} disabled={['won', 'Client'].includes(lead.status)} />
              <CompactField icon={Briefcase} label="Profession" value={lead.whats_your_profession} editValue={editedLead.whats_your_profession} onChange={(val: string) => handleFieldChange("whats_your_profession", val)} options={professionOptions} />
              <CompactField label="Gender" value={lead.gender} editValue={editedLead.gender} onChange={(val: string) => handleFieldChange("gender", val)} options={['Male', 'Female', 'Other']} />
              <CompactField icon={MapPin} label="City" value={lead.city} editValue={editedLead.city} onChange={(val: string) => handleFieldChange("city", val)} />
              <CompactField icon={MapPin} label="State" value={lead.state} editValue={editedLead.state} onChange={(val: string) => handleFieldChange("state", val)} />
              <CompactField icon={BadgeInfo} label="UCC No." value={lead.ucc} editValue={editedLead.ucc} onChange={(val: string) => handleFieldChange("ucc", val)} />
              <CompactField icon={FileText} label="PAN No." value={lead.pannumber} editValue={editedLead.pannumber} onChange={(val: string) => handleFieldChange("pannumber", val)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Source & Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <CompactField label="Form ID" value={lead.form_id} editValue={editedLead.form_id} onChange={(val: string) => handleFieldChange("form_id", val)} />
              <CompactField icon={Target} label="Campaign" value={lead.campaign} editValue={editedLead.campaign} onChange={(val: string) => handleFieldChange("campaign", val)} />
              <CompactField icon={Building} label="Branch" value={lead.branch_code} editValue={editedLead.branch_code} onChange={(val: string) => handleFieldChange("branch_code", val)} />
              <CompactField icon={Users} label="Referral" value={lead.referredby} editValue={editedLead.referredby} onChange={(val: string) => handleFieldChange("referredby", val)} />
              <CompactField icon={BarChart3} label="Experience" value={lead.what_is_your_experience_level_in_trading} editValue={editedLead.what_is_your_experience_level_in_trading} onChange={(val: string) => handleFieldChange("what_is_your_experience_level_in_trading", val)} options={experienceOptions} />
              <CompactField icon={Smartphone} label="Preferred Medium" value={lead.what_is_your_preferred_medium_to_get_services_details} editValue={editedLead.what_is_your_preferred_medium_to_get_services_details} onChange={(val: string) => handleFieldChange("what_is_your_preferred_medium_to_get_services_details", val)} options={mediumOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4 cursor-pointer" onClick={() => toggleSection('trading')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Trading Profiling
            </CardTitle>
            {expandedSections.trading ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          </div>
        </CardHeader>
        {expandedSections.trading && (
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <CompactField label="Demat Target" value={lead.how_many_demat_account_can_you_open_in_a_month?.replace(/_/g, ' ')} editValue={editedLead.how_many_demat_account_can_you_open_in_a_month} onChange={(val: string) => handleFieldChange("how_many_demat_account_can_you_open_in_a_month", val)} options={dematAccountOptions} />
              <CompactField label="Revenue Target" value={lead.how_much_revenue_are_you_targeting_in_a_month ? `₹${lead.how_much_revenue_are_you_targeting_in_a_month}` : ''} editValue={editedLead.how_much_revenue_are_you_targeting_in_a_month} onChange={(val: string) => handleFieldChange("how_much_revenue_are_you_targeting_in_a_month", val)} />
              <CompactField label="Employees" value={lead.no_of_employees} editValue={editedLead.no_of_employees} onChange={(val: number) => handleFieldChange("no_of_employees", val)} type="number" />
              <CompactField label="Trade Done" value={lead.tradedone} editValue={editedLead.tradedone} onChange={(val: string) => handleFieldChange("tradedone", val)} />
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 block">Segement Access</Label>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { key: 'nse_cm', label: 'NSE CM' },
                  { key: 'nse_cd', label: 'NSE CD' },
                  { key: 'bse_fo', label: 'BSE FO' },
                  { key: 'mcx_co', label: 'MCX CO' },
                  { key: 'nse_fo', label: 'NSE FO' },
                  { key: 'bse_cm', label: 'BSE CM' }
                ].map((seg) => (
                  <Badge key={seg.key} variant={lead[seg.key as keyof LeadItem] ? "default" : "outline"} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all", lead[seg.key as keyof LeadItem] ? "bg-purple-600 border-purple-600 text-white shadow-sm" : "border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900")}>
                    {seg.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 pb-4 cursor-pointer" onClick={() => toggleSection('additional')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-450 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              Additional Details
            </CardTitle>
            {expandedSections.additional ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
          </div>
        </CardHeader>
        {expandedSections.additional && (
          <CardContent className="p-6 space-y-6">
            <CompactField label="Other Brokers" value={lead.other_brokers} editValue={editedLead.other_brokers} onChange={(val: string) => handleFieldChange("other_brokers", val)} placeholder="List other brokers..." />
            <CompactField icon={MessageSquare} label="Notes & Issues" value={lead.issue} editValue={editedLead.issue} onChange={(val: string) => handleFieldChange("issue", val)} type="textarea" placeholder="Describe issues or add internal notes..." />
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default LeadFormTab;
