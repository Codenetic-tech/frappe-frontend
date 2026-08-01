import React, { useState } from 'react';
import {
  Save,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useFrappeUpdateDoc } from 'frappe-react-sdk';
import { LeadItem } from '@/pages/Leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { LeadTimer } from './LeadTimer';
import { toast } from '@/hooks/use-toast';

interface LeadFormTabProps {
  lead: LeadItem;
  leadId: string;
  onLeadUpdate: (updatedLead: LeadItem) => void;
}

// CRM Lead Status is a dynamic Link field; these are the values observed in
// production activity logs (New -> Followup -> RNR -> Call Back -> Won / Not Interested / Switch off).
const statusOptions = ['Followup', 'RNR', 'Call Back', 'Won', 'Not Interested', 'Switch off'];
const noOfEmployeesOptions = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const slaStatusOptions = ['First Response Due', 'Rolling Response Due', 'Failed', 'Fulfilled'];

// Defined outside LeadFormTab so it keeps a stable component identity across
// re-renders — declaring it inside the component body would remount every
// input on each keystroke (since editedLead state changes trigger a re-render),
// dropping focus after a single character.
const RowField = ({
  label, value, editValue, onChange, type = 'text', placeholder, options, alwaysReadOnly = false, required = false,
}: {
  label: string;
  value: any;
  editValue: any;
  onChange: (val: any) => void;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  options?: string[];
  alwaysReadOnly?: boolean;
  required?: boolean;
}) => {
  const currentValue = String(editValue ?? value ?? '');
  const isDisabled = alwaysReadOnly;
  return (
    <Field className="gap-1">
      <FieldLabel className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </FieldLabel>
      {options ? (
        <Select value={currentValue} onValueChange={onChange} disabled={isDisabled}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={placeholder || 'Not specified'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === 'textarea' ? (
        <Textarea
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="resize-none text-sm"
          disabled={isDisabled}
        />
      ) : (
        <Input
          type={type}
          value={currentValue}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
          disabled={isDisabled}
        />
      )}
    </Field>
  );
};

const LeadFormTab: React.FC<LeadFormTabProps> = ({ lead, leadId, onLeadUpdate }) => {
  const { updateDoc, loading: updating } = useFrappeUpdateDoc();
  const [editedLead, setEditedLead] = useState<Partial<LeadItem>>({});

  const updateLead = async () => {
    if (!leadId || updating || Object.keys(editedLead).length === 0) return;
    try {
      const updatedDoc = await updateDoc('CRM Lead', leadId, editedLead);
      onLeadUpdate({ ...lead, ...updatedDoc } as LeadItem);
      setEditedLead({});
      toast({ variant: 'success', title: 'Lead Updated', description: 'Changes have been saved successfully.' });
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: error?.message || 'Could not update lead details.' });
    }
  };

  const handleFieldChange = (field: keyof LeadItem, value: any) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{lead.lead_name}</h2>
              {lead.industry && (
                <Badge variant="outline" className="mt-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-700 font-bold text-[9px] uppercase tracking-wider">
                  {lead.industry}
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={updateLead} disabled={updating} size="sm" className="shrink-0 h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider text-[11px]">
            {updating ? <RefreshCw className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {updating ? 'Saving' : 'Save'}
          </Button>
        </div>

        {lead.validity_date && <LeadTimer validityDate={lead.validity_date} />}
      </div>

      {/* Scrollable field sections — mirrors the CRM Lead DocType's own tabs */}
      <ScrollArea className="flex-1 min-h-0">
        <form className="p-4" onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="gap-4">
            {/* Person tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Person</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Salutation" value={lead.salutation} editValue={editedLead.salutation} onChange={(val) => handleFieldChange('salutation', val)} />
                <RowField label="First Name" value={lead.first_name} editValue={editedLead.first_name} onChange={(val) => handleFieldChange('first_name', val)} required />
                <RowField label="Middle Name" value={lead.middle_name} editValue={editedLead.middle_name} onChange={(val) => handleFieldChange('middle_name', val)} />
                <RowField label="Last Name" value={lead.last_name} editValue={editedLead.last_name} onChange={(val) => handleFieldChange('last_name', val)} />
                <RowField label="Full Name" value={lead.lead_name} editValue={editedLead.lead_name} onChange={(val) => handleFieldChange('lead_name', val)} />
                <RowField label="Gender" value={lead.gender} editValue={editedLead.gender} onChange={(val) => handleFieldChange('gender', val)} />
                <RowField label="Email" value={lead.email} editValue={editedLead.email} onChange={(val) => handleFieldChange('email', val)} />
                <RowField label="Mobile No." value={lead.mobile_no} editValue={editedLead.mobile_no} onChange={(val) => handleFieldChange('mobile_no', val)} />
                <RowField label="Phone" value={lead.phone} editValue={editedLead.phone} onChange={(val) => handleFieldChange('phone', val)} />
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Details tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Details</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Organization" value={lead.organization} editValue={editedLead.organization} onChange={(val) => handleFieldChange('organization', val)} />
                <RowField label="Website" value={lead.website} editValue={editedLead.website} onChange={(val) => handleFieldChange('website', val)} />
                <RowField label="Territory" value={lead.territory} editValue={editedLead.territory} onChange={(val) => handleFieldChange('territory', val)} />
                <RowField label="Industry" value={lead.industry} editValue={editedLead.industry} onChange={(val) => handleFieldChange('industry', val)} />
                <RowField label="Job Title" value={lead.job_title} editValue={editedLead.job_title} onChange={(val) => handleFieldChange('job_title', val)} />
                <RowField label="Source" value={lead.source} editValue={editedLead.source} onChange={(val) => handleFieldChange('source', val)} />
                <RowField label="Lead Owner" value={lead.lead_owner} editValue={editedLead.lead_owner} onChange={(val) => handleFieldChange('lead_owner', val)} />
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Others tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Others</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Status" value={lead.status} editValue={editedLead.status} onChange={(val) => handleFieldChange('status', val)} options={statusOptions} required />
                <RowField label="No. of Employees" value={lead.no_of_employees} editValue={editedLead.no_of_employees} onChange={(val) => handleFieldChange('no_of_employees', val)} options={noOfEmployeesOptions} />
                <RowField label="Annual Revenue" value={lead.annual_revenue} editValue={editedLead.annual_revenue} onChange={(val) => handleFieldChange('annual_revenue', val)} type="number" />
                <Field orientation="horizontal">
                  <Checkbox
                    checked={!!(editedLead.converted ?? lead.converted)}
                    onCheckedChange={(checked) => handleFieldChange('converted', checked ? 1 : 0)}
                  />
                  <FieldLabel className="font-normal text-xs text-slate-600 dark:text-slate-300">Converted</FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Products tab (table itself not shown here — summary totals only) */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Products</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Total" value={lead.total} editValue={editedLead.total} onChange={(val) => handleFieldChange('total', val)} type="number" alwaysReadOnly />
                <RowField label="Net Total" value={lead.net_total} editValue={editedLead.net_total} onChange={(val) => handleFieldChange('net_total', val)} type="number" alwaysReadOnly />
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* SLA tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">SLA</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="SLA" value={lead.sla} editValue={editedLead.sla} onChange={(val) => handleFieldChange('sla', val)} />
                <RowField label="SLA Creation" value={lead.sla_creation} editValue={editedLead.sla_creation} onChange={(val) => handleFieldChange('sla_creation', val)} alwaysReadOnly />
                <RowField label="SLA Status" value={lead.sla_status} editValue={editedLead.sla_status} onChange={(val) => handleFieldChange('sla_status', val)} options={slaStatusOptions} alwaysReadOnly />
                <RowField label="Communication Status" value={lead.communication_status} editValue={editedLead.communication_status} onChange={(val) => handleFieldChange('communication_status', val)} />

                <FieldSet className="gap-2">
                  <FieldLegend variant="label" className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Response Details
                  </FieldLegend>
                  <FieldGroup className="gap-2">
                    <RowField label="Response By" value={lead.response_by} editValue={editedLead.response_by} onChange={(val) => handleFieldChange('response_by', val)} alwaysReadOnly />
                    <RowField label="First Response Time" value={lead.first_response_time} editValue={editedLead.first_response_time} onChange={(val) => handleFieldChange('first_response_time', val)} alwaysReadOnly />
                    <RowField label="First Responded On" value={lead.first_responded_on} editValue={editedLead.first_responded_on} onChange={(val) => handleFieldChange('first_responded_on', val)} alwaysReadOnly />
                    <RowField label="Last Response Time" value={lead.last_response_time} editValue={editedLead.last_response_time} onChange={(val) => handleFieldChange('last_response_time', val)} alwaysReadOnly />
                    <RowField label="Last Responded On" value={lead.last_responded_on} editValue={editedLead.last_responded_on} onChange={(val) => handleFieldChange('last_responded_on', val)} alwaysReadOnly />
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Syncing tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Syncing</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Facebook Lead ID" value={lead.facebook_lead_id} editValue={editedLead.facebook_lead_id} onChange={(val) => handleFieldChange('facebook_lead_id', val)} />
                <RowField label="Facebook Form ID" value={lead.facebook_form_id} editValue={editedLead.facebook_form_id} onChange={(val) => handleFieldChange('facebook_form_id', val)} />
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Lost Details tab */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Lost Details</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Lost Reason" value={lead.lost_reason} editValue={editedLead.lost_reason} onChange={(val) => handleFieldChange('lost_reason', val)} />
                <RowField label="Lost Notes" value={lead.lost_notes} editValue={editedLead.lost_notes} onChange={(val) => handleFieldChange('lost_notes', val)} type="textarea" placeholder="Describe why this lead was lost..." />
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </form>
      </ScrollArea>
    </div>
  );
};

export default LeadFormTab;
