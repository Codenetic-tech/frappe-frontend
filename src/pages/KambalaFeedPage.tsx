import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { PriceBoard } from "@/components/PriceBoard";

const KambalaFeedPage: React.FC = () => {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Kambala Index Live Feed
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Real-time streaming feeds and tick updates from Kambala broker namespace.
          </p>
        </div>

        <PriceBoard />
      </div>
    </ScrollArea>
  );
};

export default KambalaFeedPage;
