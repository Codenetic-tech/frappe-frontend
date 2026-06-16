import { ChevronDown } from "lucide-react";

const rows = [
  { score: 100, cve: "CVE-2021-44228", lib: "org.apache.logging.log4j:log4j-core@2.14.1", n: 1 },
  { score: 93, cve: "CVE-2024-50379", lib: "org.apache.tomcat...-embed-core@9.0.37", n: 1 },
  { score: 93, cve: "CVE-2023-41419", lib: "gevent@21.8.0", n: 1 },
  { score: 90, cve: "CVE-2021-45046", lib: "org.apache.logging.log4j:log4j-core@2.14.1", n: 1 },
  { score: 73, cve: "CVE-2023-43804", lib: "urllib3@1.25.9", n: 1 },
];

export function TopVulnerabilities() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col min-h-0 overflow-hidden select-none transition-colors">
      {/* Title block */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-muted-foreground">Top vulnerabilities to fix</span>
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-bold">10</span>
      </div>
      
      {/* Table Headers */}
      <div className="grid grid-cols-[100px_110px_1fr_60px] gap-3 text-[10px] text-muted-foreground font-semibold pb-2 border-b border-border items-center">
        <div>
          <button className="flex items-center gap-1 bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-1 rounded border border-border text-[9px] font-bold cursor-pointer transition-colors">
            Raven Score <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
        <div>CVE</div>
        <div>Library@Version</div>
        <div className="text-right">No. Images</div>
      </div>
      
      {/* Table Content */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40">
        {rows.map((r, i) => {
          const isHigh = r.score >= 90;
          return (
            <div key={i} className="grid grid-cols-[100px_110px_1fr_60px] gap-3 items-center py-2.5 text-xs">
              {/* Badge Column */}
              <div>
                <span 
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isHigh 
                      ? "bg-[#ef4444]/10 text-[#fca5a5] border-[#ef4444]/35" 
                      : "bg-[#f59e0b]/10 text-[#fde047] border-[#f59e0b]/35"
                  }`}
                >
                  {/* Raven Icon */}
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                    <path d="M12 2C11.5 3.5 10 5.5 7.5 7 5 8.5 2 9.5 2 10.5c0 1 2.5 1.5 4.5 1.5 1.5 0 3-.5 4-1 .5 1.5.5 3 .5 4.5 0 2-.5 3.5-1.5 4.5-.5.5 0 1 .5 1 1.5 0 3-2 3.5-4.5.5 2.5 2 4.5 3.5 4.5.5 0 1-.5.5-1-1-1-1.5-2.5-1.5-4.5 0-1.5 0-3 .5-4.5 1 .5 2.5 1 4 1 2 0 4.5-.5 4.5-1.5 0-1-3-2-5.5-3.5-2.5-1.5-4-3.5-4.5-5z" />
                  </svg>
                  {r.score}
                </span>
              </div>
              
              {/* CVE Column */}
              <div className="font-mono text-[10px] text-foreground font-semibold">{r.cve}</div>
              
              {/* Library Column */}
              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-full">
                {r.lib}
              </div>
              
              {/* No. Images Column */}
              <div className="text-muted-foreground text-[10px] font-semibold text-right pr-2">{r.n}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
