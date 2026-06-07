import React, { useState, useMemo } from 'react';
import { useLead, LeadItem } from '@/contexts/LeadContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, User, Clock, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LeadCommentsTabProps {
  lead: LeadItem;
  onNoteAdded?: () => void;
}

const LeadCommentsTab: React.FC<LeadCommentsTabProps> = ({ lead, onNoteAdded }) => {
  const { user } = useAuth();
  const { addLeadNote } = useLead();
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedNotes = useMemo(() => {
    if (!lead.notes) return [];
    return [...lead.notes].sort((a, b) =>
      new Date(b.commented_time).getTime() - new Date(a.commented_time).getTime()
    );
  }, [lead.notes]);

  const handleSubmit = async () => {
    if (!newNote.trim() || !user?.user_code) return;

    setIsSubmitting(true);
    try {
      const success = await addLeadNote(lead.name, newNote.trim(), user.user_code);
      if (success) {
        setNewNote('');
        toast({
          variant: "success",
          title: "Note Added",
          description: "New note has been successfully added.",
        });
        if (onNoteAdded) onNoteAdded();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add note. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T')); // Standardize for Date constructor
      return date.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-10">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 border-2 border-slate-100 hidden sm:flex">
            <AvatarFallback className="bg-purple-50 text-purple-600 font-bold">
              {user?.user_code ? getInitials(user.user_code) : <User size={18} />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a private note or comment..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px] rounded-xl border-slate-200 focus-visible:ring-purple-500 resize-none text-sm transition-all focus:border-purple-300"
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !newNote.trim()}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold px-6 shadow-md shadow-purple-200"
              >
                {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <MessageSquare size={16} className="text-purple-600" />
            Note Timeline
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
              {sortedNotes.length}
            </span>
          </h3>
        </div>

        {sortedNotes.length > 0 ? (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
            {sortedNotes.map((note, idx) => (
              <div key={idx} className="relative flex items-start gap-4 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                {/* Timeline Dot/Avatar */}
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ring-4 ring-slate-50 z-10 border border-slate-200 overflow-hidden shadow-sm">
                  <Avatar className="h-full w-full">
                    <AvatarFallback className="bg-slate-50 text-slate-400 text-[10px] font-bold">
                      {getInitials(note.commented_by)}
                    </AvatarFallback>
                  </Avatar>
                </span>

                {/* Content Card */}
                <div className="flex-1 space-y-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-purple-200/50 transition-all hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{note.commented_by}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-white font-medium bg-slate-700 px-2 py-1 rounded-lg">
                      <Clock size={12} />
                      {formatDateTime(note.commented_time)}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {note.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="mx-auto w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <MessageSquare size={24} className="text-slate-200" />
            </div>
            <p className="text-sm text-slate-400 font-medium italic">No comments or notes recorded for this lead.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadCommentsTab;
