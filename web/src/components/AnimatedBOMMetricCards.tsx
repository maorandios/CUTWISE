import { useCountUp } from '../hooks/useCountUp';

interface AnimatedBOMMetricCardsProps {
  totalProfiles: number;
  totalStockLengthM: number;
  totalStockWeightT: number;
  totalCutsQty: number;
  shouldAnimate?: boolean;
}

export const AnimatedBOMMetricCards = ({ 
  totalProfiles, 
  totalStockLengthM, 
  totalStockWeightT,
  totalCutsQty,
  shouldAnimate = true
}: AnimatedBOMMetricCardsProps) => {
  const animatedProfiles = useCountUp({ end: totalProfiles, duration: 1500, decimals: 0, shouldAnimate });
  const animatedStockLength = useCountUp({ end: totalStockLengthM, duration: 1500, decimals: 2, shouldAnimate });
  const animatedStockWeight = useCountUp({ end: totalStockWeightT, duration: 1500, decimals: 3, shouldAnimate });
  const animatedCuts = useCountUp({ end: totalCutsQty, duration: 1500, decimals: 0, shouldAnimate });

  return (
    <div className="bg-[#FAFAFA] py-8 mb-6 -mt-6" style={{ marginLeft: 'calc(-50vw + 50% + 24px)', marginRight: 'calc(-50vw + 50% + 24px)' }}>
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="grid grid-cols-4 divide-x divide-gray-200">
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/Profile qty.svg?v=2" alt="Profile" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedProfiles}</p>
            <p className="text-sm text-muted-foreground">Profile Types</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/length icon.svg?v=2" alt="Length" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedStockLength} <span className="text-xl">(m)</span></p>
            <p className="text-sm text-muted-foreground">Stockbar Length</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/tonnage icon.svg?v=2" alt="Tonnage" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedStockWeight} <span className="text-xl">(t)</span></p>
            <p className="text-sm text-muted-foreground">Stockbar Weight</p>
          </div>
          
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/qty of cuts.svg?v=2" alt="Cuts" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedCuts}</p>
            <p className="text-sm text-muted-foreground">Cuts Quantity</p>
          </div>
        </div>
      </div>
    </div>
  );
};
