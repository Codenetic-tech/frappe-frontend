import EvaluationCard from "@/components/dashboard/EvaluationCard";
import AllocationGrid from "@/components/dashboard/AllocationGrid";
import { StatsRow, ScoreRow, BreakdownTable } from "@/components/dashboard/StatsAndBreakdown";
import { ScrollArea } from "@/components/ui/scroll-area";

const Index = () => {
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Dashboard title - serif italic like screenshot */}
        {/* <h2 className="text-[32px] font-serif italic text-muted-foreground mb-8 text-center pt-4">Dashboard</h2> */}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-10 max-w-[1400px] mx-auto">
          {/* Left Column - Evaluation */}
          <div className="space-y-0">
            <EvaluationCard />
            <StatsRow />
            <ScoreRow />
          </div>

          {/* Right Column - Allocation + Breakdown */}
          <div className="space-y-8">
            <AllocationGrid />
            <BreakdownTable />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default Index;
