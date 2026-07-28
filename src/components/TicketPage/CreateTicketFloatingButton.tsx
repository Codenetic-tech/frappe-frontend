import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface CreateTicketFloatingButtonProps {
    onClick: () => void;
    className?: string;
}

export const CreateTicketFloatingButton: React.FC<CreateTicketFloatingButtonProps> = ({
    onClick,
    className
}) => {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <div className={cn("fixed bottom-8 right-8 z-50", className)}>
                        <Button
                            type="button"
                            onClick={onClick}
                            aria-label="Create Ticket"
                            className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-2xl flex items-center justify-center p-0 transition-all active:scale-90 hover:rotate-90"
                        >
                            <Plus className="w-8 h-8" />
                        </Button>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-slate-900 text-white font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl">
                    Create Ticket
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default CreateTicketFloatingButton;
