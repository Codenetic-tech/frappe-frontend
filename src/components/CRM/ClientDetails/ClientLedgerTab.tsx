import React, { useState, useEffect, useCallback } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import {
  AlertCircle,
  Wallet,
  Search,
  ShieldX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';

interface ClientLedgerTabProps {
  clientCode: string;
  refreshKey?: number;
}

interface LedgerEntry {
  "Voucher Date": string | Record<string, any>;
  "Branch": string | Record<string, any>;
  "Entry Details": string;
  "Amount Debit": number | Record<string, any>;
  "Amount Credit": number | Record<string, any>;
  "Running Balance": number | Record<string, any>;
  "DrCr": string | Record<string, any>;
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ClientLedgerTab: React.FC<ClientLedgerTabProps> = ({ clientCode, refreshKey }) => {
  // Default range: last 1 month
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    return [from, to];
  });

  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const { call, loading, error: callError } = useFrappePostCall<{
    message: {
      status: 'success' | 'error';
      message?: string;
      data?: { table: LedgerEntry[] };
    };
  }>('gopocket.revenue.get_client_ledger');

  const fetchLedger = useCallback(async () => {
    setErrorMsg(null);
    setAccessDenied(false);

    try {
      const res = await call({
        client_code: clientCode,
        from: formatDate(dateRange[0]),
        to: formatDate(dateRange[1]),
      });

      const msg = res?.message;

      if (msg?.status === 'success') {
        setLedgerData(msg.data?.table ?? []);
      } else if (msg?.status === 'error') {
        const errText = msg.message ?? 'Failed to fetch ledger data.';
        if (errText.toLowerCase().includes('access denied') || errText.toLowerCase().includes('hierarchy')) {
          setAccessDenied(true);
        } else {
          setErrorMsg(errText);
        }
        setLedgerData([]);
      } else {
        setErrorMsg('Unexpected response from server.');
        setLedgerData([]);
      }
    } catch (err: any) {
      // useFrappePostCall throws on HTTP errors (403, 500, etc.)
      const httpStatus = err?.httpStatus ?? err?.status;
      if (httpStatus === 403 || err?.message?.toLowerCase().includes('forbidden') || err?.message?.toLowerCase().includes('access denied')) {
        setAccessDenied(true);
      } else {
        setErrorMsg(err?.message ?? 'An error occurred while fetching ledger.');
      }
      setLedgerData([]);
    }
  }, [clientCode, dateRange, call]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger, refreshKey]);

  const formatAmount = (val: any) => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '-';
  };

  const renderValue = (val: any) => {
    if (val && typeof val === 'object' && Object.keys(val).length === 0) return '-';
    if (val === undefined || val === null) return '-';
    return val;
  };

  const isError = !!callError || !!errorMsg;
  const displayError = errorMsg ?? callError?.message ?? 'Failed to load ledger data.';

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm">
            <Wallet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <DateRangePicker
                value={dateRange}
                onChange={(val) => val && setDateRange(val)}
                placeholder="Select Date Range"
                className="w-64"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 gap-2 font-semibold"
                onClick={fetchLedger}
                disabled={loading}
              >
                <Search size={16} />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-500 font-medium italic">Loading ledger records...</p>
        </div>
      ) : accessDenied ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px] text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
            <ShieldX size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            This client is not within your hierarchy. You don't have permission to view their ledger.
          </p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px] text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Failed to Load Ledger</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">{displayError}</p>
          <Button onClick={fetchLedger} variant="outline" className="mt-6 rounded-xl border-slate-200">
            Try Again
          </Button>
        </div>
      ) : ledgerData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px] text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <Wallet size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Ledger Records</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">No financial transactions found for the selected date range.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-4 py-3 text-left font-bold text-slate-600 text-[11px] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 text-[11px] uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Debit</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Credit</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-600 text-[11px] uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-600 text-[11px] uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledgerData.map((row, idx) => {
                  const isTotal = row["Entry Details"] === "Transaction Totals";
                  const isBalance = row["Entry Details"] === "Opening Balance" || row["Entry Details"] === "Closing Balance";

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "hover:bg-slate-50/30 transition-colors",
                        (isTotal || isBalance) && "bg-slate-50/50 font-bold"
                      )}
                    >
                      <td className="px-4 py-4 text-slate-500 font-mono text-sm whitespace-nowrap">
                        {renderValue(row["Voucher Date"])}
                      </td>
                      <td className="px-4 py-4">
                        <p className={cn(
                          "text-slate-900 text-sm leading-relaxed max-w-lg",
                          isBalance && "text-purple-700 font-bold"
                        )}>
                          {row["Entry Details"]}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-red-600">
                        {formatAmount(row["Amount Debit"])}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-emerald-600">
                        {formatAmount(row["Amount Credit"])}
                      </td>
                      <td className={cn(
                        "px-4 py-4 text-right font-mono text-sm",
                        isBalance ? "text-purple-700 font-bold" : "text-slate-900"
                      )}>
                        {formatAmount(row["Running Balance"])}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase",
                          row["DrCr"] === "Cr" ? "bg-emerald-50 text-emerald-700" :
                            row["DrCr"] === "Dr" ? "bg-red-50 text-red-700" : ""
                        )}>
                          {renderValue(row["DrCr"])}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientLedgerTab;
