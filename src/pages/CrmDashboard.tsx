import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCrmDashboard } from '@/contexts/CrmDashboardContext';
import IndiaMap from 'react-svgmap-india';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  UserCheck,
  UserX,
  MapPin,
  RefreshCw,
  TrendingUp,
  Search,
  Map,
  Info
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Backend state shortcodes mapping to standard ISO/react-svgmap-india state IDs
const BACKEND_TO_MAP_CODE: Record<string, string> = {
  "ANDA": "AN",
  "AP": "AP",
  "ARUN": "AR",
  "ASSM": "AS",
  "BIHR": "BR",
  "CHAN": "CH",
  "CHHT": "CT",
  "DADI": "DN",
  "DANH": "DD",
  "DLHI": "DL",
  "GOA": "GA",
  "GUJR": "GJ",
  "HARN": "HR",
  "HP": "HP",
  "J&K": "JK",
  "JHAR": "JH",
  "KNTK": "KA",
  "KRLA": "KL",
  "LKSH": "LD",
  "MAHA": "MH",
  "MEGH": "ML",
  "MNPR": "MN",
  "MP": "MP",
  "NAGA": "NL",
  "ORSA": "OR",
  "POND": "PY",
  "PUNJ": "PB",
  "RAJS": "RJ",
  "SIKM": "SK",
  "TN": "TN",
  "TRIP": "TR",
  "TS": "TG",
  "UP": "UP",
  "UTNC": "UT",
  "WB": "WB",
  "MIZO": "MZ",
  "MANI": "MN"
};

const MAP_TO_FULL_NAME: Record<string, string> = {
  'AN': 'Andaman and Nicobar Islands',
  'AP': 'Andhra Pradesh',
  'AR': 'Arunachal Pradesh',
  'AS': 'Assam',
  'BR': 'Bihar',
  'CH': 'Chandigarh',
  'CT': 'Chhattisgarh',
  'DD': 'Dadra and Nagar Haveli',
  'DL': 'Delhi',
  'DN': 'Daman and Diu',
  'GA': 'Goa',
  'GJ': 'Gujarat',
  'HP': 'Himachal Pradesh',
  'HR': 'Haryana',
  'JH': 'Jharkhand',
  'JK': 'Jammu and Kashmir',
  'KA': 'Karnataka',
  'KL': 'Kerala',
  'LA': 'Ladakh',
  'LD': 'Lakshadweep',
  'MH': 'Maharashtra',
  'ML': 'Meghalaya',
  'MN': 'Manipur',
  'MP': 'Madhya Pradesh',
  'MZ': 'Mizoram',
  'NL': 'Nagaland',
  'OR': 'Odisha',
  'PB': 'Punjab',
  'PY': 'Puducherry',
  'RJ': 'Rajasthan',
  'SK': 'Sikkim',
  'TG': 'Telangana',
  'TN': 'Tamil Nadu',
  'TR': 'Tripura',
  'UP': 'Uttar Pradesh',
  'UT': 'Uttarakhand',
  'WB': 'West Bengal'
};


export default function CrmDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading: loading, isRefreshing: refreshing, lastUpdated, fetchData } = useCrmDashboard();

  // Route protection category check: only visible to HO, ZONE, REGION, BRANCH, null, or empty string categories
  useEffect(() => {
    const branchCategories = ["HO", "ZONE", "REGION", "BRANCH", null, ""];
    if (user && !branchCategories.includes(user.category as any)) {
      navigate('/leads');
    }
  }, [user, navigate]);

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Set default selected state when data first arrives
  useEffect(() => {
    if (!data?.state_distribution?.length || selectedState) return;
    const hasTN = data.state_distribution.some(item => BACKEND_TO_MAP_CODE[item.label] === 'TN' || item.label === 'TN');
    if (hasTN) {
      setSelectedState('TN');
    } else {
      const sorted = [...data.state_distribution].sort((a, b) => b.count - a.count);
      setSelectedState(BACKEND_TO_MAP_CODE[sorted[0].label] || sorted[0].label);
    }
  }, [data]);

  // Transform backend state codes to standard map codes
  const mappedStates = useMemo(() => {
    if (!data?.state_distribution) return [];
    return data.state_distribution.map(item => {
      const mapId = BACKEND_TO_MAP_CODE[item.label] || item.label;
      const name = MAP_TO_FULL_NAME[mapId] || item.label;
      return {
        raw: item.label,
        mapId,
        name,
        count: item.count
      };
    }).sort((a, b) => b.count - a.count);
  }, [data]);

  // Calculate choropleth heat colors for SVG paths based on client densities
  const stateColorStyles = useMemo(() => {
    if (mappedStates.length === 0) return '';
    const maxVal = Math.max(...mappedStates.map(s => s.count));
    const minVal = Math.min(...mappedStates.map(s => s.count));

    return mappedStates.map(state => {
      // Normalization scale (log scale is nicer for high distributions like TN)
      const ratio = maxVal > minVal
        ? Math.log(state.count + 1) / Math.log(maxVal + 1)
        : 0.5;

      // Clean emerald green scale with HSL values
      // Low: light soft slate/grey, High: deep emerald/mint
      const lightness = 95 - (ratio * 55); // 95% down to 40% lightness
      const saturation = 10 + (ratio * 75); // 10% up to 85% saturation

      const fillVal = `hsl(142, ${saturation.toFixed(0)}%, ${lightness.toFixed(0)}%)`;
      const hoverFill = `hsl(142, 85%, 45%)`; // Glowing vibrant hover green

      return `
        .svgmap svg path#${state.mapId} {
          fill: ${fillVal} !important;
          transition: fill 0.2s ease-in-out, filter 0.2s ease-in-out;
        }
        .svgmap svg path#${state.mapId}:hover {
          fill: ${hoverFill} !important;
          filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.4));
          cursor: pointer;
        }
      `;
    }).join('\n');
  }, [mappedStates]);

  // Derived core statistics for top stats row
  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, closedOrDormant: 0, topStateName: '', topStateCount: 0 };

    const activeItem = data.activation_status_distribution?.find(i => i.label === 'ACTIVE');
    const closedItem = data.activation_status_distribution?.find(i => i.label === 'CLOSED');
    const dormantItem = data.activation_status_distribution?.find(i => i.label === 'DORMANT');

    const active = activeItem?.count || 0;
    const closedOrDormant = (closedItem?.count || 0) + (dormantItem?.count || 0);

    const topStateRaw = mappedStates[0];

    return {
      total: data.total_clients,
      active,
      closedOrDormant,
      topStateName: topStateRaw ? topStateRaw.name : 'N/A',
      topStateCount: topStateRaw ? topStateRaw.count : 0
    };
  }, [data, mappedStates]);

  // Selected state info block
  const selectedStateInfo = useMemo(() => {
    if (!selectedState || mappedStates.length === 0) return null;
    const index = mappedStates.findIndex(s => s.mapId === selectedState);
    if (index === -1) return null;

    const stateObj = mappedStates[index];
    const percentage = ((stateObj.count / (data?.total_clients || 1)) * 100).toFixed(2);

    return {
      ...stateObj,
      rank: index + 1,
      percentage
    };
  }, [selectedState, mappedStates, data]);

  // Filtered states ranking list search
  const filteredStatesList = useMemo(() => {
    if (!searchQuery) return mappedStates;
    return mappedStates.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mapId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mappedStates, searchQuery]);

  // Recharts custom tooltips for modern looks
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border px-3 py-2 rounded-xl shadow-lg text-xs font-sans">
          <p className="font-semibold text-foreground mb-1">{label}</p>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Clients: {payload[0].value.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border px-3 py-2 rounded-xl shadow-lg text-xs font-sans">
          <p className="font-semibold text-foreground mb-1">{payload[0].name}</p>
          <div className="flex items-center gap-1.5 font-medium" style={{ color: payload[0].payload.fill }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
            <span>Clients: {payload[0].value.toLocaleString()} ({payload[0].payload.percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <ScrollArea className="h-full w-full">
        <div className="space-y-6 p-6 min-h-[85vh]">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-60 rounded-lg" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>

          {/* Stats Summary Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border border-border">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Map & List Skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-border">
              <CardContent className="h-[450px] flex items-center justify-center">
                <Skeleton className="h-[380px] w-[380px] rounded-full" />
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="pt-6 h-[450px] space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    );
  }

  // Define gradients and colors
  const STATUS_COLORS = ['#10b981', '#ef4444', '#f59e0b']; // emerald-500, red-500, amber-500
  const GENDER_COLORS = ['#3b82f6', '#ec4899', '#6b7280']; // blue-500, pink-500, grey-500

  return (
    <ScrollArea className="h-full flex flex-col overflow-hidden bg-stone-200/50">
      {/* Dynamic style injection for choropleth map boundaries */}
      <style>{stateColorStyles}</style>

      <div className="space-y-6 pr-6">
        {/* Top Header Row */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Client Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Realtime client distributions, demographics, and active metrics. Updated at <span className="font-semibold">{lastUpdated}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="border-border hover:bg-accent/40 rounded-xl transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Stats Summary Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Clients */}
          <Card className="border border-border/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Clients</p>
                  <h3 className="text-2xl font-bold mt-2 text-foreground tracking-tight">
                    {stats.total.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> Live overall base
                  </p>
                </div>
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Clients */}
          <Card className="border border-border/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Clients</p>
                  <h3 className="text-2xl font-bold mt-2 text-foreground tracking-tight">
                    {stats.active.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-blue-600 font-medium mt-1">
                    {((stats.active / stats.total) * 100).toFixed(1)}% of total clients
                  </p>
                </div>
                <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Closed/Dormant Clients */}
          <Card className="border border-border/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dormant & Closed</p>
                  <h3 className="text-2xl font-bold mt-2 text-foreground tracking-tight">
                    {stats.closedOrDormant.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-amber-600 font-medium mt-1">
                    {((stats.closedOrDormant / stats.total) * 100).toFixed(1)}% inactive base
                  </p>
                </div>
                <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <UserX className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Concentration State */}
          <Card className="border border-border/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top State</p>
                  <h3 className="text-xl font-bold mt-2 text-foreground tracking-tight truncate max-w-[170px]">
                    {stats.topStateName}
                  </h3>
                  <p className="text-[10px] text-teal-600 font-medium mt-1">
                    {stats.topStateCount.toLocaleString()} clients concentrated
                  </p>
                </div>
                <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Interactive India Map & Top States Ranking list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* India Map Card */}
          <Card className="lg:col-span-2 border border-border shadow-sm flex flex-col justify-between overflow-hidden">
            <CardHeader className="border-b border-border bg-accent/10 py-4 px-6 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Map className="h-5 w-5 text-emerald-600" /> Client Concentration (Interactive India Map)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Hover to scale density. Click any state boundary to view granular client base rankings.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-center min-h-[460px] bg-gradient-to-b from-card to-background relative">
              <div className="w-[430px] h-[430px] flex items-center justify-center transform scale-100 hover:scale-[1.02] transition-transform duration-300">
                <IndiaMap
                  onClick={(val) => setSelectedState(val)}
                  size="100%"
                  mapColor="#f1f5f9"
                  strokeColor="#94a3b8"
                  strokeWidth="0.8"
                  hoverColor="transparent" // CSS variables handle hover scale elegantly
                />
              </div>
              {/* Map Legend */}
              <div className="absolute bottom-4 left-6 bg-popover/80 backdrop-blur-sm border border-border p-2.5 rounded-lg text-[10px] space-y-1 text-muted-foreground shadow-sm">
                <p className="font-bold mb-1 text-foreground">Density Key (Emeralds)</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-950/20 border border-emerald-900/10" />
                  <span>Low (&lt; 100)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-400" />
                  <span>Medium (100 - 5,000)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-800" />
                  <span>High (&gt; 5,000)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* States Selection & Rank Panel */}
          <div className="flex flex-col gap-6">
            {/* Selected State Details Card */}
            {selectedStateInfo && (
              <Card className="border border-border shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5 overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200/50 uppercase tracking-wider">
                        Selected State Code: {selectedStateInfo.mapId}
                      </span>
                      <h3 className="text-xl font-bold text-foreground tracking-tight mt-1">
                        {selectedStateInfo.name}
                      </h3>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 bg-emerald-50 w-11 h-11 rounded-full flex items-center justify-center shadow-sm">
                      #{selectedStateInfo.rank}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <div className="bg-popover border border-border p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Clients Count</p>
                      <p className="text-lg font-bold text-foreground mt-1">
                        {selectedStateInfo.count.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-popover border border-border p-3 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Ratio</p>
                      <p className="text-lg font-bold text-foreground mt-1">
                        {selectedStateInfo.percentage}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* States Search & Progress List */}
            <Card className="border border-border shadow-sm flex flex-col flex-1 overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search state/shortcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-popover/40 border-border rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[350px]">
                {filteredStatesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Info className="h-6 w-6 mb-2 text-muted-foreground/60" />
                    <p className="text-xs">No states match your search criteria.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredStatesList.map((state) => {
                      const pct = ((state.count / stats.total) * 100).toFixed(2);
                      const isSelected = selectedState === state.mapId;
                      return (
                        <button
                          key={state.mapId}
                          onClick={() => setSelectedState(state.mapId)}
                          className={`w-full text-left px-5 py-3 hover:bg-accent/40 flex justify-between items-center transition-colors ${isSelected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : ''
                            }`}
                        >
                          <div className="space-y-1 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">{state.name}</span>
                              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                {state.mapId}
                              </span>
                            </div>
                            {/* Percentage progress bar */}
                            <div className="w-40 bg-muted h-1 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(parseFloat(pct) * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-foreground">{state.count.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{pct}%</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 2: Activation Status (PieChart) & Annual Income Distribution (BarChart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activation Status PieChart */}
          <Card className="border border-border shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border bg-accent/10 py-4 px-6">
              <CardTitle className="text-base font-bold text-foreground">Activation Status Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Dynamic clients active vs dormant segments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-around gap-6 min-h-[300px]">
              {/* Pie Container */}
              <div className="w-[200px] h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.activation_status_distribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="80%" // Spec requirement
                      outerRadius="100%" // Spec requirement
                      cornerRadius="50%" // Spec requirement
                      paddingAngle={5} // Spec requirement
                    >
                      {data?.activation_status_distribution?.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Inner Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[28px] font-black text-foreground leading-none tracking-tight">
                    {((stats.active / stats.total) * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">
                    Active Ratio
                  </span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="space-y-3.5 flex-1 max-w-[220px]">
                {data?.activation_status_distribution?.map((item, index) => {
                  const percent = ((item.count / stats.total) * 100).toFixed(1);
                  return (
                    <div key={item.label} className="flex justify-between items-center text-xs border-b border-border pb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                        />
                        <span className="font-bold text-foreground">{item.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground">{item.count.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-1">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Annual Income Distribution BarChart */}
          <Card className="border border-border shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border bg-accent/10 py-4 px-6">
              <CardTitle className="text-base font-bold text-foreground">Annual Income Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Categorized annual earnings demographics.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data?.annual_income_distribution}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 60, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v > 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                  <Bar
                    dataKey="count"
                    fill="url(#incomeGrad)"
                    radius={[0, 8, 8, 0]} // Spec rounded look
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Age Demographics (AreaChart) & Gender Demographics (Pie/DonutChart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Age Demographics AreaChart */}
          <Card className="border border-border shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border bg-accent/10 py-4 px-6">
              <CardTitle className="text-base font-bold text-foreground">Age Demographics</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Clientage distribution curves.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 min-h-[300px]">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={data?.age_distribution}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ageGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gender Demographics Donut Chart */}
          <Card className="border border-border shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-border bg-accent/10 py-4 px-6">
              <CardTitle className="text-base font-bold text-foreground">Gender Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Demographic gender allocations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-around gap-6 min-h-[300px]">
              <div className="w-[180px] h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.gender_distribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="65%"
                      outerRadius="90%"
                    >
                      {data?.gender_distribution?.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend info */}
              <div className="space-y-4 flex-1 max-w-[200px]">
                {data?.gender_distribution?.map((item, index) => {
                  const percent = ((item.count / stats.total) * 100).toFixed(1);
                  // Map shortcode labels to human readable names
                  const genderName = item.label === 'M' ? 'Male' : item.label === 'F' ? 'Female' : 'Not Specified';
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] }}
                          />
                          <span className="font-bold text-foreground">{genderName}</span>
                        </div>
                        <span className="font-semibold text-foreground">{item.count.toLocaleString()} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
