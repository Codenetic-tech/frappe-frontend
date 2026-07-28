// Shared types and helpers for HD Ticket pages/components

export interface HDTicket {
    name: string;
    subject: string;
    raised_by: string;
    status: string;
    priority: string;
    ticket_type: string;
    agent_group: string;
    creation: string;
    modified: string;
    description: string;
    // Legacy compatibility aliases (for detail views)
    [key: string]: any;
}

export const TICKET_DEPARTMENTS = [
    'RMS', 'IT', 'BANKING', 'DP', 'KYC',
    'DIGITAL MARKETING', 'AP', 'CUSTOMER SUPPORT',
    'OPERATIONS', 'COMPLIANCE'
];
