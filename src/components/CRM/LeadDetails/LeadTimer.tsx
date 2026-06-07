import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LeadTimer: React.FC<{ validityDate: string }> = ({ validityDate }) => {
  if (!validityDate) return null;

  const date = new Date(validityDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  let colorClass = "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (days < 2) colorClass = "bg-red-50 text-red-600 border-red-100";
  else if (days < 5) colorClass = "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1", colorClass)}>
      <Clock size={10} />
      {days > 0 ? `${days}d remaining` : hours > 0 ? `${hours}h remaining` : "Expired"}
    </div>
  );
};
