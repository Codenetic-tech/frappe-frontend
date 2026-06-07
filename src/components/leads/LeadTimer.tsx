import React from 'react';
import { Clock } from 'lucide-react';

export const LeadTimer: React.FC<{ validityDate?: string }> = ({ validityDate }) => {
    if (!validityDate) return null;

    const getRemainingDays = () => {
        const expirationDate = new Date(validityDate);
        const now = new Date();

        // Reset time to midnight for both dates for accurate day calculation
        const expDateMidnight = new Date(expirationDate.getFullYear(), expirationDate.getMonth(), expirationDate.getDate());
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diff = expDateMidnight.getTime() - nowMidnight.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: 'Expired', isExpired: true };
        if (days === 0) return { text: 'Expires today', isExpired: false };
        return { text: `${days} days remaining`, isExpired: false };
    };

    const { text, isExpired } = getRemainingDays();

    return (
        <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border w-fit whitespace-nowrap ${isExpired
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
            title={`Lead validity ends on ${validityDate}`}
        >
            <Clock size={12} className={isExpired ? "text-red-500" : "text-emerald-500"} />
            <span>{text}</span>
        </div>
    );
};
