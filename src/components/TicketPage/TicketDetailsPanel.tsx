import React, { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, Ticket as TicketIcon, X } from 'lucide-react';
import { useFrappeUpdateDoc, useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AssigneeCombobox, type AssignedToOption } from '@/components/TicketPage/AssigneeCombobox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { formatDurationShort, formatFullDateTime, getInitials, avatarColorClass } from '@/components/TicketPage/activityUtils';
import { cn } from '@/lib/utils';

interface TicketDetailsPanelProps {
  ticket: any;
  onTicketUpdate: (updatedTicket: any) => void;
}

// Defined outside the component so it keeps a stable identity across re-renders —
// declaring it inside the component body would remount every input on each
// keystroke (since editedTicket state changes trigger a re-render), dropping
// focus after a single character.
const RowField = ({
  label, value, editValue, onChange, type = 'text', placeholder, alwaysReadOnly = false,
}: {
  label: string;
  value: any;
  editValue: any;
  onChange: (val: any) => void;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  alwaysReadOnly?: boolean;
}) => {
  const currentValue = String(editValue ?? value ?? '');
  return (
    <Field className="gap-1">
      <FieldLabel className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </FieldLabel>
      {type === 'textarea' ? (
        <Textarea
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="resize-none text-sm"
          disabled={alwaysReadOnly}
        />
      ) : (
        <Input
          type={type}
          value={currentValue}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="h-9 text-sm"
          disabled={alwaysReadOnly}
        />
      )}
    </Field>
  );
};

const TicketDetailsPanel: React.FC<TicketDetailsPanelProps> = ({ ticket, onTicketUpdate }) => {
  const { updateDoc, loading: updating } = useFrappeUpdateDoc();
  const [editedTicket, setEditedTicket] = useState<Record<string, any>>({});

  const [assignees, setAssignees] = useState<string[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pendingRemoveEmail, setPendingRemoveEmail] = useState<string | null>(null);
  const { call: getTicketAssignees } = useFrappePostCall<{ message: string }>(
    'helpdesk.helpdesk.doctype.hd_ticket.api.get_ticket_assignees'
  );
  const { call: assignToAdd } = useFrappePostCall('frappe.desk.form.assign_to.add');
  const { call: removeAssignment } = useFrappePostCall('helpdesk.api.doc.remove_assignments');
  const { call: insertActivity } = useFrappePostCall('frappe.client.insert');
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const refreshAssignees = useCallback(() => {
    if (!ticket?.name) return;
    setLoadingAssignees(true);
    getTicketAssignees({ ticket: ticket.name })
      .then((res) => {
        try {
          const parsed = res?.message ? JSON.parse(res.message) : [];
          setAssignees(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
        } catch {
          setAssignees([]);
        }
      })
      .catch(() => setAssignees([]))
      .finally(() => setLoadingAssignees(false));
  }, [ticket?.name, getTicketAssignees]);

  useEffect(() => {
    refreshAssignees();
  }, [refreshAssignees]);

  const handleAssignMore = async (option: AssignedToOption) => {
    if (!ticket?.name) return;
    setIsAssigning(true);
    try {
      await assignToAdd({
        doctype: 'HD Ticket',
        name: ticket.name,
        assign_to: [option.user],
      });

      try {
        await insertActivity({
          doc: {
            doctype: 'HD Ticket Activity',
            ticket: ticket.name,
            action: `assigned ${option.user}`,
          },
        });
      } catch (activityErr) {
        console.error('Failed to log assignment activity:', activityErr);
      }

      toast({ variant: 'success', title: 'Assigned', description: `${option.user} added to this ticket.` });
      refreshAssignees();
      onTicketUpdate(ticket);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Assign Failed', description: err?.message || 'Could not assign user.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (email: string) => {
    if (!ticket?.name) return;
    setRemovingEmail(email);
    try {
      await removeAssignment({
        doctype: 'HD Ticket',
        name: ticket.name,
        assignees: [email],
      });

      try {
        await insertActivity({
          doc: {
            doctype: 'HD Ticket Activity',
            ticket: ticket.name,
            action: `unassigned ${email}`,
          },
        });
      } catch (activityErr) {
        console.error('Failed to log unassignment activity:', activityErr);
      }

      toast({ variant: 'success', title: 'Unassigned', description: `${email} removed from this ticket.` });
      refreshAssignees();
      onTicketUpdate(ticket);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Remove Failed', description: err?.message || 'Could not remove assignee.' });
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedTicket((prev) => ({ ...prev, [field]: value }));
  };

  const updateTicket = async () => {
    if (!ticket?.name || updating || Object.keys(editedTicket).length === 0) return;
    try {
      const updatedDoc = await updateDoc('HD Ticket', ticket.name, editedTicket);
      onTicketUpdate({ ...ticket, ...updatedDoc });
      setEditedTicket({});
      toast({ variant: 'success', title: 'Ticket Updated', description: 'Changes have been saved successfully.' });
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: error?.message || 'Could not update ticket details.' });
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 shrink-0">
              <TicketIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{ticket.name}</h2>
              {ticket.priority && (
                <Badge variant="outline" className="shrink-0 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-700 font-bold text-[9px] uppercase tracking-wider">
                  {ticket.priority}
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={updateTicket} disabled={updating} size="sm" className="shrink-0 h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase tracking-wider text-[11px]">
            {updating ? <RefreshCw className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {updating ? 'Saving' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Scrollable field sections */}
      <ScrollArea className="flex-1 min-h-0">
        <form className="p-4" onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="gap-4">
            {/* Ticket */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Ticket</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Subject" value={ticket.subject} editValue={editedTicket.subject} onChange={(val) => handleFieldChange('subject', val)} />
                <RowField label="Raised By" value={ticket.raised_by} editValue={editedTicket.raised_by} onChange={(val) => handleFieldChange('raised_by', val)} />
                <RowField label="Priority" value={ticket.priority} editValue={editedTicket.priority} onChange={(val) => handleFieldChange('priority', val)} />
                <Field className="gap-1">
                  <FieldLabel className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Assigned To
                  </FieldLabel>
                  {loadingAssignees ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Loading...
                    </div>
                  ) : assignees.length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                  ) : (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {assignees.map((email) => (
                        <div key={email} className="relative group/avatar">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-900 shadow-sm cursor-default">
                                <AvatarFallback className={cn("text-[10px] font-bold text-white", avatarColorClass(email))}>
                                  {getInitials(email)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px]">
                              {email}
                            </TooltipContent>
                          </Tooltip>
                          <button
                            type="button"
                            onClick={() => setPendingRemoveEmail(email)}
                            disabled={removingEmail === email}
                            title={`Remove ${email}`}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity disabled:opacity-50 shadow"
                          >
                            {removingEmail === email ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <X className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <AssigneeCombobox
                    value={null}
                    onChange={handleAssignMore}
                    disabled={isAssigning}
                    placeholder={isAssigning ? 'Assigning...' : 'Add assignee...'}
                    triggerClassName="w-full h-9 text-sm mt-1"
                  />
                </Field>
                <RowField label="Ticket Type" value={ticket.ticket_type} editValue={editedTicket.ticket_type} onChange={(val) => handleFieldChange('ticket_type', val)} />
                <RowField label="Team" value={ticket.agent_group} editValue={editedTicket.agent_group} onChange={(val) => handleFieldChange('agent_group', val)} />
                <Field orientation="horizontal">
                  <Checkbox
                    checked={!!(editedTicket.via_customer_portal ?? ticket.via_customer_portal)}
                    onCheckedChange={(checked) => handleFieldChange('via_customer_portal', checked ? 1 : 0)}
                  />
                  <FieldLabel className="font-normal text-xs text-slate-600 dark:text-slate-300">Via Customer Portal</FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* SLA — backend-computed, not editable */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">SLA</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Agreement Status" value={ticket.agreement_status} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="Response By" value={formatFullDateTime(ticket.response_by)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="First Responded On" value={formatFullDateTime(ticket.first_responded_on)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="First Response Time" value={formatDurationShort(ticket.first_response_time)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="First Response Failed By" value={formatDurationShort(ticket.first_response_failed_by)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="Resolution By" value={formatFullDateTime(ticket.resolution_by)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="Resolution Time" value={formatDurationShort(ticket.resolution_time)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="Resolution Failed By" value={formatDurationShort(ticket.resolution_failed_by)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
              </FieldGroup>
            </FieldSet>

            <FieldSeparator />

            {/* Timestamps */}
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Timestamps</FieldLegend>
              <FieldGroup className="gap-2">
                <RowField label="Created" value={formatFullDateTime(ticket.creation)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
                <RowField label="Last Updated" value={formatFullDateTime(ticket.modified)} editValue={undefined} onChange={() => {}} alwaysReadOnly />
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </form>
      </ScrollArea>

      <AlertDialog open={!!pendingRemoveEmail} onOpenChange={(open) => !open && setPendingRemoveEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignee?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveEmail} will be unassigned from this ticket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveEmail) handleRemoveAssignment(pendingRemoveEmail);
                setPendingRemoveEmail(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TicketDetailsPanel;
