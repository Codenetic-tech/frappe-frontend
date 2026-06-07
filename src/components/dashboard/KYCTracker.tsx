import React, { useState } from 'react';
import { Search, X, CheckCircle2, XCircle, Calendar, Building2, User, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect } from 'react';

interface KYCData {
  status: string;
  reason: string;
  // For successful response (Existing Account)
  clientCode?: string;
  BranchCode?: string;
  ReferedBy?: string;
  Commence?: string;
  mcx_CO?: string;
  nse_CM?: string;
  nse_FO?: string;
  nse_CD?: string;
  bse_CM?: string;
  bse_FO?: string;
  TradeDone?: string;
  // For In-Progress or Not Found
  Application?: string;
  Created?: string;
  Stage?: string;
  Branch?: string;
}

export const KYCTracker: React.FC = () => {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (code: string) => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a client code",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to base64
      const base64ClientCode = btoa(code.trim());

      // Call API
      const response = await fetch(`https://api2.gopocket.in/CRM/KYCTracker/${base64ClientCode}/`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: KYCData = await response.json();

      if (data.status === 'SUCCESS') {
        setKycData(data);
        setIsDialogOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "KYC Error",
          description: data.reason || 'Failed to fetch KYC data',
        });
      }
    } catch (err: any) {
      console.error('KYC Tracker Error:', err);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Server returned an error (500) or connection failed. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSearch = () => {
    performSearch(searchValue);
  };

  // Listen for custom events to trigger search from other components
  useEffect(() => {
    const handleTriggerSearch = (event: any) => {
      const clientCode = event.detail?.clientCode;
      if (clientCode) {
        setSearchValue(clientCode);
        performSearch(clientCode);
      }
    };

    window.addEventListener('trigger-kyc-search', handleTriggerSearch);
    return () => window.removeEventListener('trigger-kyc-search', handleTriggerSearch);
  }, [performSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusBadge = (value: string | undefined) => {
    if (!value) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
          N/A
        </span>
      );
    }

    const isActive = value === 'ACTIVE' || value === 'TRUE';
    const isDate = value.includes('-');

    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} />
          {value}
        </span>
      );
    } else if (isDate) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          <Calendar size={12} />
          {value}
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {value}
        </span>
      );
    }
  };

  return (
    <>
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            type="text"
            placeholder="KYC Tracker..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-[260px] pr-10 h-10 text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              <Search className="h-4 w-4 text-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg z-50">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* KYC Data Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              KYC Tracker Details
            </DialogTitle>
            <DialogDescription>
              Review the account status and segment details for this client.
            </DialogDescription>
          </DialogHeader>

          {kycData && (
            <div className="mt-4">
              {/* State 1: Account Already Active (Has Client Code) */}
              {kycData.clientCode ? (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 font-medium">Client Code</p>
                      <p className="text-lg font-bold text-gray-900">{kycData.clientCode}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 font-medium">Status</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-600" size={20} />
                        <p className="text-lg font-bold text-emerald-600">{kycData.status}</p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 size={16} />
                        <p className="text-xs font-medium">Branch Code</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.BranchCode}</p>
                    </div>
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={16} />
                        <p className="text-xs font-medium">Referred By</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.ReferedBy}</p>
                    </div>
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} />
                        <p className="text-xs font-medium">A/C Open Date</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.Commence}</p>
                    </div>
                  </div>

                  {/* Trading Status */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Trading Segments</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">MCX Commodity</span>
                        {getStatusBadge(kycData.mcx_CO)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">NSE Cash</span>
                        {getStatusBadge(kycData.nse_CM)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">NSE F&O</span>
                        {getStatusBadge(kycData.nse_FO)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">NSE Currency</span>
                        {getStatusBadge(kycData.nse_CD)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">BSE Cash</span>
                        {getStatusBadge(kycData.bse_CM)}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-gray-700">BSE F&O</span>
                        {getStatusBadge(kycData.bse_FO)}
                      </div>
                    </div>
                  </div>

                  {/* Trade Status */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Trade Done</span>
                      {getStatusBadge(kycData.TradeDone)}
                    </div>
                  </div>
                </div>
              ) : kycData.Application && kycData.Application !== 'NOT-FOUND' ? (
                <div className="space-y-6">
                  {/* State 2: KYC In-Progress (Has Application ID) - Identical structure to Active Account */}
                  {/* Header Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 font-medium">Application ID</p>
                      <p className="text-lg font-bold text-gray-900">#{kycData.Application}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 font-medium">Status</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-blue-600" size={20} />
                        <p className="text-lg font-bold text-blue-600">{kycData.status}</p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Details Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 size={16} />
                        <p className="text-xs font-medium">Branch</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.Branch || 'N/A'}</p>
                    </div>
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={16} />
                        <p className="text-xs font-medium">Referred By</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.ReferedBy || 'N/A'}</p>
                    </div>
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} />
                        <p className="text-xs font-medium">Created Date</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{kycData.Created || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Prominent Stage Display (Similar to Trade Done bar) */}
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Current KYC Stage</span>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-gray-900 tracking-tight">{kycData.Stage}</span>
                        <div className="bg-blue-600 text-white p-1.5 rounded-full">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center italic">
                    Application is currently being processed by the KYC team.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* State 3: Application NOT-FOUND */}
                  <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                    <XCircle className="mx-auto h-12 w-12 text-red-600 mb-2" />
                    <h3 className="text-lg font-bold text-gray-900">Application Not Found</h3>
                    <p className="text-sm text-gray-500">No active application was found for this code.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
