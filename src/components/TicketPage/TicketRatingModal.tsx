import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface TicketRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticketName: string;
    ticketSubject?: string;
    onSuccess?: () => void;
}

const RATING_PRESETS: Record<number, string> = {
    5: 'Exceptional support experience',
    4: 'Good support experience',
    3: 'Average support experience',
    2: 'Below average support experience',
    1: 'Poor support experience',
};

export const TicketRatingModal: React.FC<TicketRatingModalProps> = ({
    isOpen,
    onClose,
    ticketName,
    ticketSubject,
    onSuccess,
}) => {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [feedbackExtra, setFeedbackExtra] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHoverRating(null);
            setFeedbackExtra('');
            setErrorMsg(null);
        }
    }, [isOpen]);

    const handleStarClick = (num: number) => {
        setRating(num);
        setErrorMsg(null);
    };

    const handleSubmit = async () => {
        if (!ticketName) return;
        if (!rating || rating === 0) {
            setErrorMsg('You should rate this ticket');
            toast({
                variant: 'destructive',
                title: 'Rating Required',
                description: 'You should rate this ticket before submitting.',
            });
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${API_BASE_URL}/api/method/frappe.client.set_value`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    doctype: 'HD Ticket',
                    name: ticketName,
                    fieldname: {
                        status: 'Closed',
                        feedback: 'Exceptional support experience',
                        feedback_extra: feedbackExtra || '',
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: Failed to submit rating`);
            }

            const data = await response.json();
            if (data?.message) {
                toast({
                    variant: 'success',
                    title: 'Ticket Closed',
                    description: 'Thank you for your feedback! The ticket has been closed.',
                });
                onSuccess?.();
                onClose();
            } else {
                throw new Error('Failed to update ticket value.');
            }
        } catch (err: any) {
            console.error('Error closing ticket with rating:', err);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: err?.message || 'Failed to submit rating and close ticket.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeDisplayRating = hoverRating !== null ? hoverRating : rating;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
            <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xl p-6">
                <DialogHeader className="space-y-2 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 rounded-xl text-amber-500 shrink-0">
                            <Star className="w-5 h-5 fill-amber-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                Rate Your Support Experience
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                                Closing ticket <span className="font-semibold text-purple-600 dark:text-purple-400">{ticketName}</span>
                                {ticketSubject ? ` - ${ticketSubject}` : ''}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4 space-y-5">
                    {/* Star Selection */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 gap-3">
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((starNum) => {
                                const isFilled = starNum <= activeDisplayRating;
                                return (
                                    <button
                                        key={starNum}
                                        type="button"
                                        onClick={() => handleStarClick(starNum)}
                                        onMouseEnter={() => setHoverRating(starNum)}
                                        onMouseLeave={() => setHoverRating(null)}
                                        className="p-1 rounded-lg transition-transform hover:scale-115 focus:outline-none"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition-colors ${
                                                isFilled
                                                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                                    : 'text-slate-300 dark:text-slate-700'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${activeDisplayRating > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
                            {activeDisplayRating > 0 ? (RATING_PRESETS[activeDisplayRating] || '') : 'Click stars to rate'}
                        </span>
                        {errorMsg && (
                            <span className="text-xs font-bold text-red-500 dark:text-red-400 animate-in fade-in">
                                {errorMsg}
                            </span>
                        )}
                    </div>

                    {/* Extra Feedback text area */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                            Additional Details (Optional)
                        </label>
                        <Textarea
                            value={feedbackExtra}
                            onChange={(e) => setFeedbackExtra(e.target.value)}
                            placeholder="Share any additional comments or suggestions..."
                            rows={3}
                            className="resize-none text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 text-xs shadow-md shadow-purple-200 dark:shadow-none"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit & Close Ticket'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
