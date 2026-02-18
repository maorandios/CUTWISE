"""
Bin packing algorithm for profile nesting.

This module implements the core nesting algorithm that packs parts
into stock bars while minimizing waste.
"""

from typing import List, Tuple, Optional
from .models import Part, CuttingPattern, RejectedPart
from .pair_detector import ComplementaryPair


def calculate_combined_length_with_kerf(
    parts: List[Part],
    kerf: float = 3.0,
    shared_cut_savings: float = 0.0
) -> float:
    """
    Calculate total length needed for a list of parts including kerf.
    
    Physical reality:
    - We need a cut BEFORE the first part (to separate from stock)
    - We need cuts BETWEEN each part
    - We need a cut AFTER the last part (to separate from waste)
    
    For N parts, we need N cuts total (one after each part).
    The cut before the first part is handled by the trim parameter.
    
    Args:
        parts: List of Part objects
        kerf: Kerf width (cutting blade width) in mm
        shared_cut_savings: Length saved by shared cuts in mm
    
    Returns:
        Total length in millimeters
    """
    if not parts:
        return 0.0
    
    # Total length = sum of part lengths + kerf for each part (including last one)
    total_length = sum(p.length for p in parts)
    # N parts need N cuts (one after each part, including the last one before waste)
    kerf_length = kerf * len(parts)
    
    return total_length + kerf_length - shared_cut_savings


def fits_in_stock(
    parts: List[Part],
    stock_length: float,
    kerf: float = 3.0,
    shared_cut_savings: float = 0.0,
    tolerance: float = 0.1
) -> bool:
    """
    Check if parts fit in a stock bar.
    
    Args:
        parts: List of Part objects
        stock_length: Stock bar length in mm
        kerf: Kerf width in mm
        shared_cut_savings: Length saved by shared cuts in mm
        tolerance: Tolerance for floating point comparison in mm
    
    Returns:
        True if parts fit, False otherwise
    """
    required_length = calculate_combined_length_with_kerf(parts, kerf, shared_cut_savings)
    return required_length <= stock_length + tolerance


def find_best_stock_for_parts(
    parts: List[Part],
    stock_lengths: List[float],
    kerf: float = 3.0,
    shared_cut_savings: float = 0.0,
    prefer_larger: bool = True
) -> Optional[float]:
    """
    Find the best stock length that fits the given parts.
    
    STRATEGY: By default, prefer LARGER stocks to maximize utilization.
    Can be overridden with prefer_larger=False to minimize waste.
    
    Args:
        parts: List of Part objects
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
        shared_cut_savings: Length saved by shared cuts in mm
        prefer_larger: If True, prefer larger stocks (12m before 6m). If False, prefer smaller stocks.
    
    Returns:
        Best stock length, or None if parts don't fit in any stock
    """
    required_length = calculate_combined_length_with_kerf(parts, kerf, shared_cut_savings)
    
    # Sort based on preference
    if prefer_larger:
        # Check longer stocks first (12m before 6m) - maximizes utilization
        sorted_stocks = sorted(stock_lengths, reverse=True)
    else:
        # Check shorter stocks first (6m before 12m) - minimizes waste
        sorted_stocks = sorted(stock_lengths)
    
    for stock_length in sorted_stocks:
        if required_length <= stock_length:
            return stock_length
    
    return None


def optimize_stock_selection(
    patterns: List[CuttingPattern],
    stock_lengths: List[float],
    kerf: float = 3.0
) -> List[CuttingPattern]:
    """
    Optimize stock selection by downgrading patterns to smaller stock bars when possible.
    
    This is a post-processing step that checks if patterns can fit in smaller stock bars
    to reduce waste. For example, if parts fit in 6m but were initially placed in 12m,
    downgrade to 6m.
    
    Args:
        patterns: List of CuttingPattern objects
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
    
    Returns:
        Optimized list of CuttingPattern objects
    """
    optimized_patterns = []
    
    for pattern in patterns:
        # Calculate required length for this pattern
        required_length = calculate_combined_length_with_kerf(pattern.parts, kerf)
        
        # Find the smallest stock that fits (prefer_larger=False)
        best_stock = find_best_stock_for_parts(
            pattern.parts,
            stock_lengths,
            kerf,
            shared_cut_savings=0.0,
            prefer_larger=False  # Use smallest stock that fits
        )
        
        if best_stock and best_stock < pattern.stock_length:
            # Downgrade to smaller stock
            pattern.stock_length = best_stock
            pattern.waste = best_stock - required_length
            pattern.waste_percentage = (pattern.waste / best_stock) * 100.0
        
        optimized_patterns.append(pattern)
    
    return optimized_patterns


def optimize_part_order_in_patterns(
    patterns: List[CuttingPattern],
    kerf: float = 3.0
) -> List[CuttingPattern]:
    """
    Optimize the order of parts within each pattern to minimize waste.
    
    Strategy:
    1. Place straight-cut parts at the START and END of the bar (minimize waste)
    2. Place sloped-cut parts in the MIDDLE (where they can share cuts)
    
    This reduces waste at the bar ends where we can't share cuts.
    
    Args:
        patterns: List of CuttingPattern objects
        kerf: Kerf width in mm
    
    Returns:
        Patterns with optimized part order
    """
    optimized_patterns = []
    
    for pattern in patterns:
        if len(pattern.parts) <= 1:
            # No need to reorder single part
            optimized_patterns.append(pattern)
            continue
        
        # Categorize parts by cut type
        straight_both = []
        straight_start = []
        straight_end = []
        sloped_both = []
        
        for part in pattern.parts:
            if not part.start_slope.has_slope and not part.end_slope.has_slope:
                straight_both.append(part)
            elif not part.start_slope.has_slope and part.end_slope.has_slope:
                straight_start.append(part)
            elif part.start_slope.has_slope and not part.end_slope.has_slope:
                straight_end.append(part)
            else:
                sloped_both.append(part)
        
        # Sort each category by length (longest first) for easier reading and cutting
        straight_both.sort(key=lambda p: p.length, reverse=True)
        straight_start.sort(key=lambda p: p.length, reverse=True)
        straight_end.sort(key=lambda p: p.length, reverse=True)
        sloped_both.sort(key=lambda p: p.length, reverse=True)
        
        # Optimal ordering strategy:
        # 1. Start with straight-end parts (straight cut at bar start)
        # 2. Then sloped-both parts (in the middle)
        # 3. Then straight-start parts (straight cut at bar end)
        # 4. Finally straight-both parts (can go anywhere, prefer ends)
        # Within each group: longest to shortest for convenience
        
        reordered_parts = []
        
        # Start: Prefer straight-end (straight cut at beginning)
        if straight_end:
            reordered_parts.extend(straight_end)
        elif straight_both:
            reordered_parts.append(straight_both.pop(0))
        
        # Middle: Place sloped-both parts (longest first)
        reordered_parts.extend(sloped_both)
        
        # Add remaining straight-start parts (longest first)
        reordered_parts.extend(straight_start)
        
        # End: Add remaining straight-both parts (longest first)
        reordered_parts.extend(straight_both)
        
        # Update pattern with reordered parts
        pattern.parts = reordered_parts
        
        # Recalculate waste (order doesn't change length, but good practice)
        used_length = calculate_combined_length_with_kerf(pattern.parts, kerf)
        pattern.waste = pattern.stock_length - used_length
        pattern.waste_percentage = (pattern.waste / pattern.stock_length) * 100.0
        
        optimized_patterns.append(pattern)
    
    return optimized_patterns


def pack_parts_first_fit_decreasing(
    parts: List[Part],
    stock_lengths: List[float],
    kerf: float = 3.0,
    max_stock_length: Optional[float] = None
) -> Tuple[List[CuttingPattern], List[RejectedPart]]:
    """
    Pack parts using First Fit Decreasing (FFD) algorithm.
    
    This is a simple bin packing heuristic:
    1. Sort parts by length (longest first)
    2. For each part, try to fit it in an existing pattern (prefer larger stocks)
    3. If it doesn't fit, create a new pattern
    4. OPTIMIZE: Downgrade patterns to smaller stocks when possible
    
    Args:
        parts: List of Part objects (will be sorted internally)
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
        max_stock_length: Maximum allowed stock length (reject parts longer than this)
    
    Returns:
        Tuple of (cutting_patterns, rejected_parts)
    """
    if max_stock_length is None:
        max_stock_length = max(stock_lengths) if stock_lengths else float('inf')
    
    # Sort parts by length (longest first)
    sorted_parts = sorted(parts, key=lambda p: p.length, reverse=True)
    
    patterns: List[CuttingPattern] = []
    rejected: List[RejectedPart] = []
    
    for part in sorted_parts:
        # Check if part is too long for any stock
        if part.length > max_stock_length:
            rejected.append(RejectedPart(
                product_id=part.product_id,
                length=part.length,
                profile_name=part.profile_name,
                reason=f"Part length ({part.length:.0f}mm) exceeds maximum stock length ({max_stock_length:.0f}mm)"
            ))
            continue
        
        # Try to fit in existing patterns
        placed = False
        for pattern in patterns:
            # Calculate current pattern length
            current_length = calculate_combined_length_with_kerf(pattern.parts, kerf)
            
            # Check if part fits in this pattern
            new_length = current_length + part.length + kerf
            if new_length <= pattern.stock_length:
                pattern.parts.append(part)
                placed = True
                break
        
        # If not placed, create new pattern
        if not placed:
            # Find best stock for this part (prefer larger stocks initially)
            best_stock = find_best_stock_for_parts(
                [part],
                stock_lengths,
                kerf,
                prefer_larger=True  # Prefer 12m to maximize utilization
            )
            
            if best_stock is None:
                rejected.append(RejectedPart(
                    product_id=part.product_id,
                    length=part.length,
                    profile_name=part.profile_name,
                    reason=f"Part length ({part.length:.0f}mm) exceeds all available stock lengths"
                ))
                continue
            
            # Create new pattern
            pattern = CuttingPattern(
                stock_length=best_stock,
                parts=[part],
                waste=0.0,  # Will be calculated later
                waste_percentage=0.0  # Will be calculated later
            )
            patterns.append(pattern)
    
    # OPTIMIZATION: Downgrade patterns to smaller stocks when possible
    patterns = optimize_stock_selection(patterns, stock_lengths, kerf)
    
    # Calculate waste for each pattern (in case not done in optimization)
    for pattern in patterns:
        used_length = calculate_combined_length_with_kerf(pattern.parts, kerf)
        pattern.waste = pattern.stock_length - used_length
        pattern.waste_percentage = (pattern.waste / pattern.stock_length) * 100.0
    
    return patterns, rejected


def pack_complementary_pair(
    pair: ComplementaryPair,
    stock_lengths: List[float],
    kerf: float = 3.0
) -> Optional[CuttingPattern]:
    """
    Pack a complementary pair into a single pattern.
    
    Args:
        pair: ComplementaryPair object
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
    
    Returns:
        CuttingPattern if pair fits, None otherwise
    """
    # Find best stock for the pair
    best_stock = find_best_stock_for_parts(
        [pair.part1, pair.part2],
        stock_lengths,
        kerf,
        pair.shared_cut_savings
    )
    
    if best_stock is None:
        return None
    
    # Create pattern
    combined_length = calculate_combined_length_with_kerf(
        [pair.part1, pair.part2],
        kerf,
        pair.shared_cut_savings
    )
    
    waste = best_stock - combined_length
    waste_percentage = (waste / best_stock) * 100.0
    
    pattern = CuttingPattern(
        stock_length=best_stock,
        parts=[pair.part1, pair.part2],
        waste=waste,
        waste_percentage=waste_percentage,
        shared_cuts=1
    )
    
    return pattern


def optimize_patterns_by_consolidation(
    patterns: List[CuttingPattern],
    kerf: float = 3.0
) -> List[CuttingPattern]:
    """
    Optimize patterns by consolidating parts from multiple patterns.
    
    This attempts to reduce the number of patterns by moving parts
    from one pattern to another when they fit.
    
    Args:
        patterns: List of CuttingPattern objects
        kerf: Kerf width in mm
    
    Returns:
        Optimized list of CuttingPattern objects
    """
    if len(patterns) <= 1:
        return patterns
    
    # Sort patterns by waste (most waste first)
    sorted_patterns = sorted(patterns, key=lambda p: p.waste, reverse=True)
    
    optimized = []
    
    for pattern in sorted_patterns:
        # Try to move parts from this pattern to existing optimized patterns
        remaining_parts = list(pattern.parts)
        
        for part in pattern.parts:
            for opt_pattern in optimized:
                # Check if part fits in optimized pattern
                current_length = calculate_combined_length_with_kerf(opt_pattern.parts, kerf)
                new_length = current_length + part.length + kerf
                
                if new_length <= opt_pattern.stock_length:
                    opt_pattern.parts.append(part)
                    remaining_parts.remove(part)
                    break
        
        # If parts remain, create a new pattern
        if remaining_parts:
            new_pattern = CuttingPattern(
                stock_length=pattern.stock_length,
                parts=remaining_parts,
                waste=0.0,
                waste_percentage=0.0
            )
            optimized.append(new_pattern)
    
    # Recalculate waste
    for pattern in optimized:
        used_length = calculate_combined_length_with_kerf(pattern.parts, kerf)
        pattern.waste = pattern.stock_length - used_length
        pattern.waste_percentage = (pattern.waste / pattern.stock_length) * 100.0
    
    return optimized


def calculate_cut_positions(
    parts: List[Part],
    kerf: float = 3.0
) -> List[float]:
    """
    Calculate cut positions along a stock bar.
    
    Args:
        parts: List of Part objects in order
        kerf: Kerf width in mm
    
    Returns:
        List of cut positions in millimeters
    """
    positions = [0.0]  # Start at 0
    current_position = 0.0
    
    for part in parts:
        current_position += part.length
        positions.append(current_position)
        current_position += kerf  # Add kerf for next cut
    
    return positions

