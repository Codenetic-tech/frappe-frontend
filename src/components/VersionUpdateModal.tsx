import React from "react";
import { RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VersionUpdateModalProps {
  isOpen: boolean;
  onRefresh?: () => void;
}

export const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  isOpen,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Force hard reload by appending a query parameter or using location reload
      window.location.href = window.location.origin + window.location.pathname + "?t=" + Date.now();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 text-center transform transition-all scale-100">
        {/* Glow Header Accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Icon Container */}
        <div className="relative mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full border-2 border-white dark:border-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Modal Text */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          New Version Available
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          A new version of the application has been deployed. Please click below to reload and access the latest features and improvements.
        </p>

        {/* Action Button */}
        <Button
          onClick={handleRefresh}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer"
        >
          <RefreshCw className="w-5 h-5 animate-spin-slow" />
          Update Now
        </Button>
      </div>
    </div>
  );
};

export default VersionUpdateModal;
