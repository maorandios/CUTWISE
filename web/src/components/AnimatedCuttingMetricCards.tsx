import { useCountUp } from '../hooks/useCountUp';

interface AnimatedCuttingMetricCardsProps {
  stockToleranceEnabled: boolean;
  stockToleranceValue: number;
  trimValue: number;
  kerfValue: number;
  totalCutsQty: number;
  shouldAnimate?: boolean;
}

export const AnimatedCuttingMetricCards = ({ 
  stockToleranceEnabled,
  stockToleranceValue,
  trimValue,
  kerfValue,
  totalCutsQty,
  shouldAnimate = true
}: AnimatedCuttingMetricCardsProps) => {
  const animatedTolerance = useCountUp({ end: stockToleranceValue, duration: 1500, decimals: 0, shouldAnimate });
  const animatedTrim = useCountUp({ end: trimValue, duration: 1500, decimals: 0, shouldAnimate });
  const animatedKerf = useCountUp({ end: kerfValue, duration: 1500, decimals: 0, shouldAnimate });
  const animatedCuts = useCountUp({ end: totalCutsQty, duration: 1500, decimals: 0, shouldAnimate });

  return (
    <div className="bg-[#FAFAFA] py-8 -mt-6" style={{ marginLeft: 'calc(-50vw + 50% + 24px)', marginRight: 'calc(-50vw + 50% + 24px)' }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-4 divide-x divide-gray-200">
          {/* Tolerance Card */}
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/ToleranceForCard.svg" alt="Tolerance" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">
              {stockToleranceEnabled ? <>{animatedTolerance} <span className="text-xl text-primary">(mm)</span></> : 'OFF'}
            </p>
            <p className="text-sm text-muted-foreground">Stockbar Tolerance</p>
          </div>
          
          {/* Trim Card */}
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/TrimForCard.svg" alt="Trim" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedTrim} <span className="text-xl text-primary">(mm)</span></p>
            <p className="text-sm text-muted-foreground">Manual Trim</p>
          </div>
          
          {/* Kerf Card */}
          <div className="flex flex-col items-center justify-center text-center py-9">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <img src="/Icons/KerfforCard.svg" alt="Kerf" className="h-8 w-8" />
            </div>
            <p className="text-3xl font-bold text-primary mb-2">{animatedKerf} <span className="text-xl text-primary">(mm)</span></p>
            <p className="text-sm text-muted-foreground">Saw Kerf</p>
          </div>
          
          {/* Cuts Quantity Card */}
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
