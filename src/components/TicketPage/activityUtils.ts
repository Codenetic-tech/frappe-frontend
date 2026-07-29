import { format, formatDistanceToNowStrict } from 'date-fns';

export const toJsDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr.replace(' ', 'T'));
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

export const getInitials = (value: string | null | undefined): string => {
    if (!value) return '?';
    const namePart = value.includes('@') ? value.split('@')[0] : value;
    const pieces = namePart.split(/[\s._-]+/).filter(Boolean);
    if (pieces.length === 0) return '?';
    return pieces.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
};

const AVATAR_COLORS = [
    'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
];

/** Deterministic background color for an avatar, keyed off a string (e.g. email). */
export const avatarColorClass = (value: string): string => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return (doc.body.textContent || '').trim();
    } catch {
        return html.replace(/<[^>]*>/g, '').trim();
    }
};

export const formatRelativeTime = (dateStr: string | null | undefined): string => {
    const d = toJsDate(dateStr);
    if (!d) return '';
    try {
        return `${formatDistanceToNowStrict(d)} ago`;
    } catch {
        return '';
    }
};

export const formatFullDateTime = (dateStr: string | null | undefined): string => {
    const d = toJsDate(dateStr);
    if (!d) return '-';
    try {
        return format(d, 'dd-MM-yyyy hh:mm a');
    } catch {
        return '-';
    }
};

/** Formats a Frappe Duration field (stored in seconds) as a short label like "4d 3h" or "0m". */
export const formatDurationShort = (totalSeconds: number | null | undefined): string => {
    if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) return '-';
    const abs = Math.abs(Math.round(totalSeconds));
    const days = Math.floor(abs / 86400);
    const hours = Math.floor((abs % 86400) / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
};

/** Seconds remaining until dueDateStr (negative if already overdue). */
export const secondsUntil = (dueDateStr: string | null | undefined): number | null => {
    const due = toJsDate(dueDateStr);
    if (!due) return null;
    return (due.getTime() - Date.now()) / 1000;
};

/**
 * Wraps trailing quoted-reply markup (moz-cite-prefix / gmail_quote / blockquote chains)
 * in a collapsed <details> so long email threads don't show the entire quoted history by default.
 */
export const collapseQuotedHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;

        let marker: Element | null = body.querySelector('.moz-cite-prefix, .gmail_quote');
        if (!marker) marker = body.querySelector('blockquote');
        if (!marker) return html;

        let topNode: Element = marker;
        while (topNode.parentElement && topNode.parentElement !== body) {
            topNode = topNode.parentElement;
        }

        const siblingsToWrap: Element[] = [];
        let cur: Element | null = topNode;
        while (cur) {
            const next: Element | null = cur.nextElementSibling;
            siblingsToWrap.push(cur);
            cur = next;
        }

        if (siblingsToWrap.length === 0) return html;

        const details = doc.createElement('details');
        details.className = 'quoted-toggle';
        const summary = doc.createElement('summary');
        summary.className = 'quoted-toggle-summary';
        summary.textContent = 'Show quoted text';
        details.appendChild(summary);
        siblingsToWrap.forEach((el) => details.appendChild(el));
        body.appendChild(details);

        return body.innerHTML;
    } catch {
        return html;
    }
};
