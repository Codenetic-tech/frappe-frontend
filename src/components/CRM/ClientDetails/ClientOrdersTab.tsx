import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ChevronRight, ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle2, XCircle, Filter, ChevronDown, Zap,
  Landmark, Hexagon, Monitor, Leaf, Building2, Globe, PackageOpen, AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ClientOrdersTabProps {
  clientCode: string;
  refreshKey?: number;
}

type OrderStatus = "executed" | "pending" | "cancelled";
type OrderSide = "buy" | "sell";

interface ApiOrder {
  name: string;
  norenordno?: string;
  tsym?: string;
  trantype?: string;
  prctyp?: string;
  qty?: string;
  prc?: string;
  status?: string;
  norentm?: string;
  exch_tm?: string;
  avgprc?: string;
}

interface ParsedOrder {
  id: string;
  stock: string;
  ticker: string;
  icon: string | React.ReactNode;
  side: OrderSide;
  type: string;
  qty: number;
  price: string;
  triggerPrice?: string;
  status: OrderStatus;
  statusText: string;
  time: string;
  date: string;
  avgprc: string;
}

const statusConfig: Record<OrderStatus, { icon: React.ReactNode; label: string; className: string }> = {
  executed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Executed", className: "bg-success text-success-foreground shadow-[0_0_8px_hsl(152,60%,38%,0.4)]" },
  pending: { icon: <Clock className="h-3.5 w-3.5 animate-pulse" />, label: "Pending", className: "bg-warning text-warning-foreground shadow-[0_0_8px_hsl(38,92%,55%,0.4)]" },
  cancelled: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Cancelled", className: "bg-destructive text-destructive-foreground shadow-[0_0_8px_hsl(0,72%,55%,0.3)]" },
};

const statusMap = (rawStatus: string): OrderStatus => {
  const status = rawStatus?.toUpperCase() || "";
  if (status.includes("COMPLETE") || status.includes("FILLED") || status.includes("EXECUTED")) return "executed";
  if (status.includes("PENDING") || status.includes("OPEN") || status.includes("TRIGGER")) return "pending";
  return "cancelled";
};

const enrichOrderIcon = (ticker: string) => {
  const upper = ticker.toUpperCase();
  if (upper.includes('NIFTY') || upper.includes('BANKNIFTY')) return "Monitor";
  if (upper.includes('RELIANCE')) return "Zap";
  if (upper.includes('HDFC') || upper.includes('SBI')) return "Landmark";
  if (upper.includes('TCS') || upper.includes('INFY')) return "Monitor";
  return "Hexagon";
};

const ClientOrdersTab: React.FC<ClientOrdersTabProps> = ({ clientCode, refreshKey }) => {
  const { token, logout } = useAuth();
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);

      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${API_BASE_URL}/api/method/rms.clientdetails.orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token
          },
          body: JSON.stringify({ client_code: clientCode }),
          mode: 'cors',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.message?.status === 'error' && errorData.message?.message === 'Token has been revoked or does not match') {
            logout();
            return;
          }
          throw new Error('Failed to fetch Orders');
        }

        const data = await response.json();

        if (data.message?.status === 'Ok' && Array.isArray(data.message?.data)) {
          const orderData = data.message.data[0]?.orders || [];

          const parsed: ParsedOrder[] = orderData.map((o: ApiOrder) => {
            const tickerFull = o.tsym || o.name || "UNKNOWN";
            const tickerParts = tickerFull.match(/[A-Za-z]+/) || [];
            const stock = tickerParts[0] || tickerFull.split('-')[0] || "STOCK";

            const side: OrderSide = o.trantype?.toUpperCase() === 'B' ? "buy" : "sell";
            const type = o.prctyp || "MARGIN";
            const qty = parseInt(o.qty || "0", 10);
            const priceVal = parseFloat(o.prc || "0");
            const price = `₹${priceVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const avgPriceVal = parseFloat(o.avgprc || "0");
            const avgprc = `₹${avgPriceVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const statusRaw = o.status || "UNKNOWN";
            const statusType = statusMap(statusRaw);

            const dateTime = o.norentm || o.exch_tm || "";
            const [dateStr, timeStr] = dateTime.split(' ');

            return {
              id: o.norenordno || o.name,
              stock,
              ticker: tickerFull,
              icon: enrichOrderIcon(tickerFull),
              side,
              type,
              qty,
              price,
              avgprc,
              status: statusType,
              statusText: statusRaw,
              time: timeStr || "-",
              date: dateStr || "-"
            };
          });

          if (isMounted) {
            setOrders(parsed);
            setIsLoading(false);
          }
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An error occurred while fetching orders.');
          setIsLoading(false);
        }
      }
    };

    fetchOrders();

    return () => { isMounted = false; };
  }, [clientCode, token, logout, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full animate-in fade-in h-[500px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full animate-in fade-in h-[500px]">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <p className="text-slate-500 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full animate-in fade-in h-[500px]">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <PackageOpen size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Active Orders</h3>
        <p className="text-slate-500 text-sm">We couldn't find any recent orders for {clientCode}.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Filters row */}
      <div className="flex items-center justify-between mb-5 shrink-0 px-2 mt-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {(["All", "Executed", "Pending", "Cancelled"] as const).map((f, i) => (
            <button
              key={f}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors whitespace-nowrap ${i === 0
                ? "bg-foreground text-card border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors shrink-0">
          <Filter className="h-3 w-3" /> Filter
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Orders table */}
      <div className="flex-1 w-full overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2.5 px-2 font-medium">Stock</th>
              <th className="text-left py-2.5 px-2 font-medium">Side</th>
              <th className="text-left py-2.5 px-2 font-medium">Type</th>
              <th className="text-left py-2.5 px-2 font-medium">Qty</th>
              <th className="text-left py-2.5 px-2 font-medium">Price</th>
              <th className="text-left py-2.5 px-2 font-medium">Status</th>
              <th className="text-left py-2.5 px-2 font-medium">Time</th>
              <th className="py-2.5 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const sc = statusConfig[order.status];
              return (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white text-sm shrink-0">
                        {order.icon === "₹" ? order.icon :
                          order.icon === "Landmark" ? <Landmark className="h-4 w-4" /> :
                            order.icon === "Monitor" ? <Monitor className="h-4 w-4" /> :
                              order.icon === "Hexagon" ? <Hexagon className="h-4 w-4" /> :
                                order.icon === "Leaf" ? <Leaf className="h-4 w-4" /> :
                                  order.icon === "Zap" ? <Zap className="h-4 w-4" /> :
                                    order.icon === "Building2" ? <Building2 className="h-4 w-4" /> :
                                      <Globe className="h-4 w-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.stock}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{order.ticker}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${order.side === "buy" ? "text-success" : "text-destructive"}`}>
                      {order.side === "buy" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {order.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{order.type}</span>
                  </td>
                  <td className="py-3.5 px-2 text-sm">{order.qty}</td>
                  <td className="py-3.5 px-2 text-sm font-medium">{order.avgprc}</td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2 w-max">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                        order.status === 'executed' ? "bg-green-100 text-green-700" :
                          order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                            order.status === 'cancelled' ? "bg-red-100 text-red-700" :
                              "bg-slate-100 text-slate-700"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse",
                          order.status === 'executed' ? "bg-green-500" :
                            order.status === 'pending' ? "bg-amber-500" :
                              order.status === 'cancelled' ? "bg-red-500" :
                                "bg-slate-500"
                        )} />
                        {order.statusText || sc.label}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-2">
                    <div className="whitespace-nowrap">
                      <p className="text-xs text-muted-foreground">{order.time}</p>
                      <p className="text-[10px] text-muted-foreground/60">{order.date}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientOrdersTab;
