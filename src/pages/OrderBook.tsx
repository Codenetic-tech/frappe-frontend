import { ChevronRight, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle, Filter, ChevronDown, Zap, Landmark, Hexagon, Monitor, Leaf, Building2, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type OrderStatus = "executed" | "pending" | "cancelled";
type OrderSide = "buy" | "sell";

interface Order {
  id: string;
  stock: string;
  ticker: string;
  icon: string;
  side: OrderSide;
  type: string;
  qty: number;
  price: string;
  triggerPrice?: string;
  status: OrderStatus;
  time: string;
  date: string;
}

const orders: Order[] = [
  { id: "ORD001", stock: "Reliance", ticker: "RELIANCE", icon: "₹", side: "buy", type: "LIMIT", qty: 10, price: "₹2,485.30", status: "executed", time: "09:32:14", date: "2024-11-20" },
  { id: "ORD002", stock: "HDFC Bank", ticker: "HDFCBANK", icon: "Landmark", side: "buy", type: "MARKET", qty: 25, price: "₹1,642.50", status: "executed", time: "09:35:07", date: "2024-11-20" },
  { id: "ORD003", stock: "Infosys", ticker: "INFY", icon: "Hexagon", side: "sell", type: "LIMIT", qty: 15, price: "₹1,876.20", status: "pending", time: "10:12:45", date: "2024-11-20" },
  { id: "ORD004", stock: "TCS", ticker: "TCS", icon: "Monitor", side: "buy", type: "SL-LIMIT", qty: 5, price: "₹3,920.00", triggerPrice: "₹3,900.00", status: "pending", time: "10:45:30", date: "2024-11-20" },
  { id: "ORD005", stock: "ITC", ticker: "ITC", icon: "Leaf", side: "sell", type: "MARKET", qty: 100, price: "₹452.75", status: "cancelled", time: "11:02:18", date: "2024-11-20" },
  { id: "ORD006", stock: "Adani Power", ticker: "ADANIPOWER", icon: "Zap", side: "buy", type: "LIMIT", qty: 50, price: "₹432.10", status: "executed", time: "11:18:52", date: "2024-11-20" },
  { id: "ORD007", stock: "SBI", ticker: "SBIN", icon: "Building2", side: "buy", type: "MARKET", qty: 30, price: "₹628.40", status: "executed", time: "11:45:09", date: "2024-11-20" },
  { id: "ORD008", stock: "Wipro", ticker: "WIPRO", icon: "Globe", side: "sell", type: "SL-LIMIT", qty: 20, price: "₹462.30", triggerPrice: "₹460.00", status: "cancelled", time: "12:10:33", date: "2024-11-20" },
];

const statusConfig: Record<OrderStatus, { icon: React.ReactNode; label: string; className: string }> = {
  executed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Executed", className: "bg-success text-success-foreground shadow-[0_0_8px_hsl(152,60%,38%,0.4)]" },
  pending: { icon: <Clock className="h-3.5 w-3.5 animate-pulse" />, label: "Pending", className: "bg-warning text-warning-foreground shadow-[0_0_8px_hsl(38,92%,55%,0.4)]" },
  cancelled: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Cancelled", className: "bg-destructive text-destructive-foreground shadow-[0_0_8px_hsl(0,72%,55%,0.3)]" },
};

const OrderBook = () => {
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* <h2 className="text-[32px] font-serif italic text-muted-foreground mb-8 text-center pt-4">Order Book</h2> */}

        {/* Filters row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {(["All", "Executed", "Pending", "Cancelled"] as const).map((f, i) => (
              <button
                key={f}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${i === 0
                  ? "bg-foreground text-card border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
            <Filter className="h-3 w-3" /> Filter
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Orders table */}
        <div className="space-y-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2.5 font-medium">Stock</th>
                <th className="text-left py-2.5 font-medium">Side</th>
                <th className="text-left py-2.5 font-medium">Type</th>
                <th className="text-left py-2.5 font-medium">Qty</th>
                <th className="text-left py-2.5 font-medium">Price</th>
                <th className="text-left py-2.5 font-medium">Status</th>
                <th className="text-left py-2.5 font-medium">Time</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const sc = statusConfig[order.status];
                return (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white text-sm">
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
                        <div>
                          <p className="font-medium text-sm">{order.stock}</p>
                          <p className="text-[11px] text-muted-foreground">{order.ticker}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${order.side === "buy" ? "text-success" : "text-destructive"}`}>
                        {order.side === "buy" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{order.type}</span>
                    </td>
                    <td className="py-3.5 text-sm">{order.qty}</td>
                    <td className="py-3.5 text-sm font-medium">{order.price}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-full ${sc.className}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div>
                        <p className="text-xs text-muted-foreground">{order.time}</p>
                        <p className="text-[10px] text-muted-foreground/60">{order.date}</p>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
};

export default OrderBook;
