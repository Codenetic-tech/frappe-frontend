import { AlertTriangle, Landmark, Hexagon, Leaf, Monitor, Zap, Building2, Globe } from "lucide-react";

const AllocationGrid = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Allocation</h3>

      {/* Grid matching the screenshot layout exactly */}
      <div className="grid grid-cols-[1fr_1fr_1fr] grid-rows-[auto_auto_auto_auto] gap-2">

        {/* Row 1-2: Reliance (tall left), HDFC Bank (top right spanning 2 cols) */}
        <div className="row-span-2 bg-primary rounded-2xl p-4 flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="h-10 w-10 bg-black rounded-lg flex items-center justify-center text-white text-lg font-bold">₹</div>
            <p className="font-semibold mt-3 text-sm">Reliance <span className="text-xs font-normal text-foreground/60">RELIANCE</span></p>
          </div>
          <div className="mt-auto">
            <span className="text-lg font-bold">0.264</span>{" "}
            <span className="text-sm text-foreground/60">19.62%</span>
          </div>
        </div>

        {/* HDFC Bank - wide card */}
        <div className="col-span-2 border border-border rounded-2xl p-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">HDFC Bank <span className="text-xs font-normal text-muted-foreground">HDFCBANK</span></span>
          </div>
          <div className="mt-3">
            <span className="font-bold">21,390</span>{" "}
            <span className="text-sm text-muted-foreground">16.10%</span>
          </div>
        </div>

        {/* Infosys & ITC side by side */}
        <div className="border border-border rounded-2xl p-3 bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center text-white">
              <Hexagon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold">Infosys <span className="font-normal text-muted-foreground">INFY</span></span>
          </div>
          <p className="text-sm mt-2"><span className="font-bold">44,351</span> <span className="text-muted-foreground text-xs">11.66%</span></p>
        </div>
        <div className="border border-border rounded-2xl p-3 bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center text-white">
              <Leaf className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold">ITC <span className="font-normal text-muted-foreground">ITC</span></span>
          </div>
          <p className="text-sm mt-2"><span className="font-bold">1,096</span> <span className="text-muted-foreground text-xs">11.24%</span></p>
        </div>

        {/* Row 3-4: TCS (tall left), 3 small cards right */}
        <div className="row-span-2 bg-primary rounded-2xl p-4 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="h-10 w-10 bg-black rounded-lg flex items-center justify-center text-white">
              <Monitor className="h-5 w-5" />
            </div>
            <p className="font-semibold mt-3 text-sm">TCS <span className="text-xs font-normal text-foreground/60">TCS</span></p>
          </div>
          <div className="mt-auto">
            <span className="text-lg font-bold">3.05</span>{" "}
            <span className="text-sm text-foreground/60">12.28%</span>
          </div>
        </div>

        {/* 3 small cards - Adani Power, SBI, Wipro */}
        <div className="border border-border rounded-2xl p-3 bg-card relative">
          <AlertTriangle className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-destructive" />
          <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center text-white mb-1">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold">Adani Power</p>
          <p className="text-[10px] text-muted-foreground">ADANIPOWER</p>
          <p className="text-xs mt-1.5"><span className="font-bold">21,017</span> <span className="text-muted-foreground">10.97%</span></p>
        </div>
        <div className="border border-border rounded-2xl p-3 bg-card relative">
          <AlertTriangle className="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-destructive" />
          <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center text-white mb-1">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold">SBI</p>
          <p className="text-[10px] text-muted-foreground">SBIN</p>
          <p className="text-xs mt-1.5"><span className="font-bold">104,080</span> <span className="text-muted-foreground">9.61%</span></p>
        </div>

        {/* Wipro spanning under the two small */}
        <div className="col-span-2 border border-border rounded-2xl p-3 bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-black rounded-lg flex items-center justify-center text-white">
              <Globe className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold">Wipro</p>
              <p className="text-[10px] text-muted-foreground">WIPRO</p>
            </div>
          </div>
          <p className="text-xs"><span className="font-bold">304</span> <span className="text-muted-foreground">8.52%</span></p>
        </div>
      </div>
    </div>
  );
};

export default AllocationGrid;
