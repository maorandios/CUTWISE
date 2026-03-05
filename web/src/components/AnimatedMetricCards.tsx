import { useCountUp } from '../hooks/useCountUp';

interface AnimatedMetricCardsProps {
  avgWastePercent: number;
  totalWasteM: number;
  totalWasteTonnes: number;
  shouldAnimate?: boolean;
}

export const AnimatedMetricCards = ({ 
  avgWastePercent, 
  totalWasteM, 
  totalWasteTonnes,
  shouldAnimate = true
}: AnimatedMetricCardsProps) => {
  const animatedAvgWaste = useCountUp({ end: avgWastePercent, duration: 1500, decimals: 2, shouldAnimate });
  const animatedTotalWasteM = useCountUp({ end: totalWasteM, duration: 1500, decimals: 2, shouldAnimate });
  const animatedTotalWasteTonnes = useCountUp({ end: totalWasteTonnes, duration: 1500, decimals: 3, shouldAnimate });

  return (
    <div className="bg-[#FAFAFA] py-8 mb-6 -mt-6" style={{ marginLeft: 'calc(-50vw + 50% + 24px)', marginRight: 'calc(-50vw + 50% + 24px)' }}>
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="grid grid-cols-3 divide-x divide-gray-200">
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/precentage icon.svg?v=2" alt="Percentage" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedAvgWaste}%</p>
            <p className="text-sm text-muted-foreground">Average Waste</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/length icon.svg?v=2" alt="Length" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedTotalWasteM} <span className="text-xl">(m)</span></p>
            <p className="text-sm text-muted-foreground">Total Waste</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/tonnage icon.svg?v=2" alt="Tonnage" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedTotalWasteTonnes} <span className="text-xl">(t)</span></p>
            <p className="text-sm text-muted-foreground">Waste Weight</p>
          </div>
        </div>
      </div>
    </div>
  );
};
