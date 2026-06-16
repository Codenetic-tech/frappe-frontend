import React from 'react';
import { StatsRow } from '@/components/CRM/CrmDashboard/StatsRow';
import { HealthScore, AdrIncidents, AdrCoverage } from '@/components/CRM/CrmDashboard/LeftCards';
import { RiskFocus } from '@/components/CRM/CrmDashboard/RiskFocus';
import { Deprioritization, RoiCalculator } from '@/components/CRM/CrmDashboard/RightCards';
import { OpenResolved } from '@/components/CRM/CrmDashboard/OpenResolved';
import { TopVulnerabilities } from '@/components/CRM/CrmDashboard/TopVulnerabilities';

const ClientDashboard: React.FC = () => {
    return (
        <div className="h-full p-4 overflow-hidden flex flex-col gap-3">
            {/* Stats Row */}
            <StatsRow />

            {/* Dashboard Cards Grid */}
            <div className="flex-1 min-h-0 flex flex-col gap-3">

                {/* Top Row: ~59% height */}
                <div className="flex-[3.4] min-h-0 grid grid-cols-[21.5%_1fr_21.5%] gap-3">
                    {/* Left: HealthScore (tall) + AdrIncidents (short) */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <div className="flex-[1.8] min-h-0">
                            <HealthScore />
                        </div>
                        <div className="flex-1 min-h-0">
                            <AdrIncidents />
                        </div>
                    </div>

                    {/* Center: Risk Focus */}
                    <div className="min-h-0">
                        <RiskFocus />
                    </div>

                    {/* Right: Deprioritization (short) + ROI Calculator (tall) */}
                    <div className="flex flex-col gap-3 min-h-0">
                        <div className="flex-1 min-h-0">
                            <Deprioritization />
                        </div>
                        <div className="flex-[1.8] min-h-0">
                            <RoiCalculator />
                        </div>
                    </div>
                </div>

                {/* Bottom Row: ~41% height */}
                <div className="flex-[2.4] min-h-0 grid grid-cols-[21.5%_1fr_21.5%] gap-3">
                    {/* Left: ADR Coverage */}
                    <div className="min-h-0">
                        <AdrCoverage />
                    </div>

                    {/* Center: Top Vulnerabilities */}
                    <div className="min-h-0">
                        <TopVulnerabilities />
                    </div>

                    {/* Right: Open vs Resolved */}
                    <div className="min-h-0">
                        <OpenResolved />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ClientDashboard;
