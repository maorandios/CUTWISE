import { useCountUp } from '../hooks/useCountUp';

interface AnimatedDashboardCardsProps {
  totalProjects: number;
  totalWeightT: number;
  totalWasteMeters: number;
  totalWasteTonnage: number;
  avgWastePercentage: number;
  shouldAnimate?: boolean;
}

export const AnimatedDashboardCards = ({
  totalProjects,
  totalWeightT,
  totalWasteMeters,
  totalWasteTonnage,
  avgWastePercentage,
  shouldAnimate = true
}: AnimatedDashboardCardsProps) => {
  const animatedProjects = useCountUp({ end: totalProjects, duration: 1500, decimals: 0, shouldAnimate });
  const animatedWeight = useCountUp({ end: totalWeightT, duration: 1500, decimals: 3, shouldAnimate });
  const animatedWasteM = useCountUp({ end: totalWasteMeters, duration: 1500, decimals: 1, shouldAnimate });
  const animatedWasteT = useCountUp({ end: totalWasteTonnage, duration: 1500, decimals: 3, shouldAnimate });
  const animatedAvgWaste = useCountUp({ end: avgWastePercentage, duration: 1500, decimals: 1, shouldAnimate });

  return (
    <div className="bg-[#FAFAFA] rounded-xl shadow-sm mb-8 border border-gray-100 overflow-hidden">
      <div className="grid grid-cols-5 divide-x divide-gray-200">
        {/* Projects Card */}
        <div className="flex flex-col items-center justify-center text-center py-9">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="#00817A" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {animatedProjects}
          </p>
          <p className="text-sm text-muted-foreground">
            Projects
          </p>
        </div>

        {/* Weight Card */}
        <div className="flex flex-col items-center justify-center text-center py-9">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="#00817A" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {animatedWeight} <span className="text-xl text-primary">(t)</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Weight
          </p>
        </div>

        {/* Waste (m) Card */}
        <div className="flex flex-col items-center justify-center text-center py-9">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <img src="/Icons/length icon.svg?v=2" alt="Length" className="h-8 w-8" />
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {animatedWasteM} <span className="text-xl text-primary">(m)</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Total Waste
          </p>
        </div>

        {/* Waste (t) Card */}
        <div className="flex flex-col items-center justify-center text-center py-9">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <img src="/Icons/tonnage icon.svg?v=2" alt="Tonnage" className="h-8 w-8" />
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {animatedWasteT} <span className="text-xl text-primary">(t)</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Waste Weight
          </p>
        </div>

        {/* Average Waste % Card */}
        <div className="flex flex-col items-center justify-center text-center py-9">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <img src="/Icons/precentage icon.svg?v=2" alt="Percentage" className="h-8 w-8" />
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {animatedAvgWaste} <span className="text-xl text-primary">(%)</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Average Waste
          </p>
        </div>
      </div>
    </div>
  );
};
