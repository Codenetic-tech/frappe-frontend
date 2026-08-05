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

// CRM Lead Status options
const statusOptions = ['Followup', 'RNR', 'Call Back', 'Won', 'Not Interested', 'Switch off'];

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

  const isStatusClient = String(lead?.status ?? '').trim().toLowerCase() === 'client';
  const currentStatusOptions = isStatusClient && lead.status && !statusOptions.includes(lead.status)
    ? [lead.status, ...statusOptions]
    : statusOptions;

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
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{lead.lead_name || lead.first_name}</h2>
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

      {/* Scrollable field sections */}
      <ScrollArea className="flex-1 min-h-0">
        <form className="p-4" onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="gap-4">
            <RowField
              label="First Name"
              value={lead.first_name}
              editValue={editedLead.first_name}
              onChange={(val) => handleFieldChange('first_name', val)}
              required
            />
            <RowField
              label="Email"
              value={lead.email}
              editValue={editedLead.email}
              onChange={(val) => handleFieldChange('email', val)}
            />
            <RowField
              label="Mobile No."
              value={lead.mobile_no}
              editValue={editedLead.mobile_no}
              onChange={(val) => handleFieldChange('mobile_no', val)}
            />
            <RowField
              label="Source"
              value={lead.source}
              editValue={editedLead.source}
              onChange={(val) => handleFieldChange('source', val)}
              alwaysReadOnly
            />
            <RowField
              label="Status"
              value={lead.status}
              editValue={editedLead.status}
              onChange={(val) => handleFieldChange('status', val)}
              options={currentStatusOptions}
              alwaysReadOnly={isStatusClient}
              required
            />
            <RowField
              label="Facebook Lead ID"
              value={lead.facebook_lead_id}
              editValue={editedLead.facebook_lead_id}
              onChange={(val) => handleFieldChange('facebook_lead_id', val)}
              alwaysReadOnly
            />
            <RowField
              label="Facebook Form ID"
              value={lead.facebook_form_id}
              editValue={editedLead.facebook_form_id}
              onChange={(val) => handleFieldChange('facebook_form_id', val)}
              alwaysReadOnly
            />

            <FieldSeparator />

            {/* Lost Details */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Lost Details</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField
                  label="Lost Reason"
                  value={lead.lost_reason}
                  editValue={editedLead.lost_reason}
                  onChange={(val) => handleFieldChange('lost_reason', val)}
                />
                <RowField
                  label="Lost Notes"
                  value={lead.lost_notes}
                  editValue={editedLead.lost_notes}
                  onChange={(val) => handleFieldChange('lost_notes', val)}
                  type="textarea"
                  placeholder="Describe why this lead was lost..."
                />
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </form>
      </ScrollArea>
    </div>
  );
};

export default LeadFormTab;

