import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowRight, User, Mail, CreditCard, Building, CheckCircle, Package, Database, FileText, Send, Smartphone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { parse } from 'date-fns';

import { KycStageHistory } from '@/contexts/KycContext';

interface KycTimelineProps {
    applicationId: string;
    applicationStatus?: string | null;
    historyData?: KycStageHistory[];
}

interface TimelineEntry {
    stage: string;
    status: string;
    rejectionReason: string;
    timestamp: string;
}

const ALL_STAGES = [
    "MOBILE OTP",
    "EMAIL OTP",
    "PASSWORD SETUP",
    "KRA DOB",
    "PAN NAME",
    "PAN CONFIRM",
    "AADHAR",
    "PROFILE",
    "BANK ENTRY",
    "SEGMENT SELECTION",
    "PAYMENT",
    "NOMINEE",
    "INCOME PROOF",
    "SIGNATURE",
    "IPV",
    "PDF DOWNLOAD",
    "END PAGE",
    "ACCOUNT OPENED"
];

const KycTimeline: React.FC<KycTimelineProps> = ({ applicationId, applicationStatus, historyData }) => {

    if (!historyData || historyData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 opacity-50">
                <Clock className="w-12 h-12 mb-4" />
                <p>No timeline data available for this application.</p>
            </div>
        );
    }

    const timeline: TimelineEntry[] = [...ALL_STAGES].reverse().map(stageName => {
        let apiData = historyData.find((d) => d.kyc_stage === stageName);

        // Handle interchangeable income proof names
        if (!apiData && stageName === "INCOME PROOF") {
            apiData = historyData.find((d) => d.kyc_stage === "CANCELLED_CHEQUE_OR_STATEMENT");
        }

        // Handle account opened / application status
        if (stageName === "ACCOUNT OPENED") {
            let accountApiData = apiData || historyData.find((d) => {
                const name = d.kyc_stage;
                return name === "APPLICATION STATUS" ||
                    name === "APPLICATION" ||
                    ["IN PROGRESS", "PENDING FOR APPROVAL", "REJECTED", "APPROVED", "ACCOUNT OPENED"].includes(name?.toUpperCase())
            });

            const hasEndPage = historyData.some((d) => d.kyc_stage === "END PAGE");

            let finalStatus = "PENDING";

            if (hasEndPage && applicationStatus) {
                finalStatus = applicationStatus.toUpperCase();
            } else if (accountApiData) {
                const accountName = accountApiData.kyc_stage;
                if (["IN PROGRESS", "PENDING FOR APPROVAL", "REJECTED", "APPROVED", "ACCOUNT OPENED"].includes(accountName?.toUpperCase())) {
                    finalStatus = accountName.toUpperCase();
                } else {
                    finalStatus = (accountApiData.stage_status || accountName).toUpperCase();
                }
            }

            if (finalStatus && finalStatus !== "PENDING") {
                return {
                    stage: "APPLICATION STATUS",
                    status: finalStatus,
                    rejectionReason: accountApiData?.rejection_reason || "",
                    timestamp: accountApiData?.updated_on || ""
                };
            }

            return {
                stage: "APPLICATION STATUS",
                status: "PENDING",
                rejectionReason: "",
                timestamp: ""
            };
        }

        if (apiData) {
            return {
                stage: stageName,
                status: apiData.stage_status || "",
                rejectionReason: apiData.rejection_reason || "",
                timestamp: apiData.updated_on || ""
            };
        }

        return {
            stage: stageName,
            status: "PENDING",
            rejectionReason: "",
            timestamp: ""
        };
    });

    return (
        <ScrollArea className="h-full pr-4">
            <div className="relative space-y-8 pb-12">
                {/* Continuous Line */}
                <div className="absolute left-[26px] top-4 bottom-12 w-0.5 bg-slate-100" />

                <AnimatePresence mode="popLayout">
                    {timeline.map((entry, index) => {
                        const timestampStr = entry.timestamp || '';
                        const dateParams = timestampStr.split(' ');
                        const date = dateParams[0] || '';
                        const time = dateParams[1] || '';

                        const isCompleted = ['APPROVED', 'COMPLETED', 'ACCOUNT OPENED'].includes(entry.status?.toUpperCase());
                        const isRejected = entry.status?.toUpperCase() === 'REJECTED';
                        const isPending = entry.status === 'PENDING' || !entry.status;
                        const isAccountOpened = entry.stage === 'ACCOUNT OPENED' || entry.stage === 'APPLICATION STATUS';

                        return (
                            <motion.div
                                key={`${entry.stage}-${index}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={cn(
                                    "relative pl-14 group transition-all",
                                    !isCompleted && !isRejected && !isAccountOpened && "opacity-40 grayscale-[0.5]"
                                )}
                            >
                                {/* Dot */}
                                <div className={cn(
                                    "absolute left-[15px] top-0 w-6 h-6 rounded-full border-2 border-white ring-4 flex items-center justify-center z-10 shadow-sm transition-all",
                                    isCompleted
                                        ? "bg-green-500 ring-green-50 shadow-green-100"
                                        : isRejected
                                            ? "bg-red-500 ring-red-50 shadow-red-100"
                                            : "bg-slate-200 ring-slate-50 shadow-none",
                                    (index === 0 && (isCompleted || isRejected)) && (isCompleted ? "scale-110 ring-green-100" : "scale-110 ring-red-100")
                                )}>
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-white stroke-[3px]" />
                                    ) : isRejected ? (
                                        <AlertCircle className="w-4 h-4 text-white stroke-[3px]" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {isCompleted || isRejected ? (
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-[12px] font-black font-mono", isRejected ? "text-red-600" : "text-slate-900")}>
                                                    {time || timestampStr}
                                                </span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className={cn("text-[11px] font-bold", isRejected ? "text-red-400" : "text-slate-500")}>
                                                    {date}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] mr-20 font-bold text-slate-300 italic uppercase">
                                                {!isPending ? (entry.stage === 'APPLICATION STATUS' ? entry.stage : entry.status) : 'PENDING'}
                                            </span>
                                        )}

                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "py-0 text-[10px] px-2 h-5 rounded-full font-bold uppercase tracking-tight transition-colors",
                                                isCompleted
                                                    ? "bg-green-100 text-green-700 border-green-200"
                                                    : isRejected
                                                        ? "bg-red-100 text-red-700 border-red-200"
                                                        : !isPending
                                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                                            : "bg-slate-50 text-slate-400 border-slate-200"
                                            )}
                                        >
                                            {entry.stage === 'APPLICATION STATUS' && entry.status !== 'PENDING' ? entry.status : entry.stage}
                                        </Badge>
                                    </div>

                                    {/* Rejection Reason */}
                                    {isRejected && entry.rejectionReason && (
                                        <div className="text-xs text-red-600 font-medium mt-1">
                                            {entry.rejectionReason}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ScrollArea>
    );
};

export default KycTimeline;
