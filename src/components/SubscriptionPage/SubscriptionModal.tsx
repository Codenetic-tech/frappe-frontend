import React, { useState } from 'react';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    CreditCard,
    Loader2,
    Hash,
    User,
    MonitorPlay,
    IndianRupee,
    CalendarIcon,
    Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SubscriptionFormData {
    tool_name: string;
    amount: string;
    payment_reference_number: string;
    client_code: string;
    trading_view_id: string;
    payment_date: string;
}

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: SubscriptionFormData) => Promise<void>;
    loading: boolean;
}

const TOOL_OPTIONS = [
    { value: 'Option 10', label: 'Option 10' },
    { value: 'Option Bulls', label: 'Option Bulls' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    loading,
}) => {
    const [toolName, setToolName] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentRef, setPaymentRef] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [tradingViewId, setTradingViewId] = useState('');
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);

    const resetForm = () => {
        setToolName('');
        setAmount('');
        setPaymentRef('');
        setClientCode('');
        setTradingViewId('');
        setPaymentDate(undefined);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const isValid = toolName && amount && clientCode && paymentDate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        await onSubmit({
            tool_name: toolName,
            amount,
            payment_reference_number: paymentRef,
            client_code: clientCode,
            trading_view_id: tradingViewId,
            payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd HH:mm:ss') : '',
        });

        resetForm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-purple-600 to-violet-700 p-8">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                <CreditCard className="text-white w-5 h-5" />
                            </div>
                            <DialogTitle className="text-white text-2xl font-bold tracking-tight">
                                Create Subscription
                            </DialogTitle>
                        </div>
                        <p className="text-purple-100 text-sm font-medium opacity-90">
                            Fill in the details to create a new tool subscription.
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
                    <div className="space-y-5">
                        {/* Tool Name */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-purple-500" />
                                Tool Name <span className="text-red-500">*</span>
                            </Label>
                            <Select value={toolName} onValueChange={setToolName}>
                                <SelectTrigger className="border-slate-200 rounded-2xl h-12 shadow-sm focus:border-purple-300">
                                    <SelectValue placeholder="Select a tool..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                                    {TOOL_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount + Payment Reference */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-purple-500" />
                                    Amount <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 2000"
                                    className="border-slate-200 focus:ring-purple-500 rounded-2xl h-12 shadow-sm transition-all focus:border-purple-300"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment-ref" className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-purple-500" />
                                    Payment Reference
                                </Label>
                                <Input
                                    id="payment-ref"
                                    value={paymentRef}
                                    onChange={(e) => setPaymentRef(e.target.value)}
                                    placeholder="e.g. 123531897216"
                                    className="border-slate-200 focus:ring-purple-500 rounded-2xl h-12 shadow-sm transition-all focus:border-purple-300"
                                />
                            </div>
                        </div>

                        {/* Client Code + Trading View ID */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="client-code" className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    Client Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="client-code"
                                    value={clientCode}
                                    onChange={(e) => setClientCode(e.target.value)}
                                    placeholder="e.g. A189"
                                    className="border-slate-200 focus:ring-purple-500 rounded-2xl h-12 shadow-sm transition-all focus:border-purple-300"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tv-id" className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                    <MonitorPlay className="w-4 h-4 text-purple-500" />
                                    TradingView ID
                                </Label>
                                <Input
                                    id="tv-id"
                                    value={tradingViewId}
                                    onChange={(e) => setTradingViewId(e.target.value)}
                                    placeholder="e.g. kskeerthana06"
                                    className="border-slate-200 focus:ring-purple-500 rounded-2xl h-12 shadow-sm transition-all focus:border-purple-300"
                                />
                            </div>
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 font-bold text-sm ml-1 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-purple-500" />
                                Payment Date <span className="text-red-500">*</span>
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-medium rounded-2xl h-12 border-slate-200 shadow-sm",
                                            !paymentDate && "text-slate-400"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        {paymentDate ? (
                                            <span className="text-slate-900">{format(paymentDate, 'PPP')}</span>
                                        ) : (
                                            <span>Select payment date...</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={paymentDate}
                                        onSelect={setPaymentDate}
                                        initialFocus
                                        className="rounded-2xl"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-slate-100 gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClose}
                            className="rounded-2xl h-12 px-6 font-semibold text-slate-500 hover:bg-slate-50"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !isValid}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl h-12 px-8 font-bold shadow-lg shadow-purple-100 transition-all active:scale-95 min-w-[160px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Subscription'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
