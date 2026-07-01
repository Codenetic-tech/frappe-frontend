import { ChevronDown } from "lucide-react";
import { useTickets } from "@/contexts/TicketContext";

export function TopVulnerabilities() {
  const { ticketsData, isLoading } = useTickets();

  const recentTickets = ticketsData ? ticketsData.slice(0, 5) : [];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/35 dark:border-red-500/50";
      case 'High':
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/35 dark:border-orange-500/50";
      case 'Medium':
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/35 dark:border-blue-500/50";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/35 dark:border-slate-500/50";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Open':
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20";
      case 'In Progress':
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20";
      case 'Resolved':
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20";
      default:
        return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 overflow-hidden select-none transition-colors">
      {/* Title block */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground">Recent support tickets</span>
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-bold">
          {recentTickets.length}
        </span>
      </div>
      
      {/* Table Headers */}
      <div className="grid grid-cols-[100px_90px_1fr_95px] gap-3 text-[10px] text-muted-foreground font-semibold pb-2 border-b border-border items-center">
        <div>
          <button className="flex items-center gap-1 bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded border border-border text-[9px] font-bold cursor-pointer transition-colors">
            Priority <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
        <div>Ticket ID</div>
        <div>Subject</div>
        <div className="text-right">Status</div>
      </div>
      
      {/* Table Content */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40">
        {isLoading ? (
          <div className="py-4 text-xs text-muted-foreground text-center">Loading tickets...</div>
        ) : recentTickets.length === 0 ? (
          <div className="py-4 text-xs text-muted-foreground text-center">No recent tickets</div>
        ) : (
          recentTickets.map((ticket) => {
            return (
              <div key={ticket.ticket_id} className="grid grid-cols-[100px_90px_1fr_95px] gap-3 items-center py-2.5 text-xs">
                {/* Priority Badge */}
                <div>
                  <span 
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(ticket.priority)}`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                
                {/* Ticket ID */}
                <div className="font-mono text-[10px] text-foreground font-semibold truncate">{ticket.ticket_id}</div>
                
                {/* Subject */}
                <div className="text-[10px] text-muted-foreground truncate max-w-full" title={ticket.subject}>
                  {ticket.subject}
                </div>
                
                {/* Status */}
                <div className="text-right pr-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getStatusStyle(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
