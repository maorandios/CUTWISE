"""
Simple alternative waste calculator.
Shows users what their waste would be without optimization.
ONLY uses part lengths - no geometry, no slopes, no pairing.
"""

from typing import List, Dict


def calculate_alternative_waste(
    parts: List,  # Just needs .length attribute
    profile_name: str,
    stock_lengths: List[float],
    kerf: float = 3.0,
    trim: float = 5.0,
    stock_tolerance: float = 0.0
) -> Dict:
    """
    Calculate waste using typical manual approach.
    ONLY uses part.length - no geometry analysis.
    
    Manual approach:
    1. Cut all parts > 6000mm first (one per 12m bar)
    2. Fill remaining space with parts < 6000mm (longest first)
    3. Include kerf, trim, and tolerance for fair comparison
    
    Args:
        parts: List of parts (only .length is used)
        profile_name: Profile name for logging
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
        trim: Trim amount in mm
        stock_tolerance: Stock tolerance in mm
    
    Returns:
        Dict with: bars_used, total_waste, waste_percentage
    """
    try:
        print(f"[ALT] Calculating alternative waste for {profile_name}: {len(parts)} parts")
        
        if not parts:
            return {"bars_used": 0, "total_waste": 0.0, "waste_percentage": 0.0}
        
        # Get stock lengths
        sorted_stocks = sorted(stock_lengths, reverse=True)
        largest_stock = sorted_stocks[0]  # 12000mm
        smallest_stock = sorted_stocks[-1] if len(sorted_stocks) > 1 else largest_stock
        
        # Apply trim and tolerance
        largest_usable = largest_stock - trim + stock_tolerance
        
        # Extract just the lengths and sort
        part_lengths = [p.length for p in parts]
        large_lengths = [L for L in part_lengths if L > smallest_stock]
        small_lengths = [L for L in part_lengths if L <= smallest_stock]
        
        large_lengths.sort(reverse=True)
        small_lengths.sort(reverse=True)
        
        bars = []
        
        # STEP 1: Place large parts (one per bar)
        for large_length in large_lengths:
            bar_used = large_length + kerf
            
            # Fill with small parts
            i = 0
            while i < len(small_lengths):
                if bar_used + small_lengths[i] + kerf <= largest_usable:
                    bar_used += small_lengths[i] + kerf
                    small_lengths.pop(i)
                else:
                    i += 1
            
            bars.append(largest_usable - bar_used)  # Store waste
        
        # STEP 2: Fill remaining small parts
        while small_lengths:
            bar_used = 0.0
            
            i = 0
            while i < len(small_lengths):
                if bar_used + small_lengths[i] + kerf <= largest_usable:
                    bar_used += small_lengths[i] + kerf
                    small_lengths.pop(i)
                else:
                    i += 1
            
            if bar_used == 0:
                small_lengths.pop(0)  # Skip part that doesn't fit
                continue
            
            bars.append(largest_usable - bar_used)  # Store waste
        
        # Calculate totals
        total_bars = len(bars)
        total_stock = total_bars * largest_stock
        total_waste = sum(bars)
        waste_percentage = (total_waste / total_stock * 100.0) if total_stock > 0 else 0.0
        
        print(f"[ALT] {profile_name}: {total_bars} bars, {total_waste:.0f}mm waste ({waste_percentage:.2f}%)")
        
        return {
            "bars_used": total_bars,
            "total_waste": total_waste,
            "waste_percentage": waste_percentage
        }
        
    except Exception as e:
        print(f"[ALT] ERROR calculating alternative waste for {profile_name}: {e}")
        import traceback
        traceback.print_exc()
        return {"bars_used": 0, "total_waste": 0.0, "waste_percentage": 0.0}

