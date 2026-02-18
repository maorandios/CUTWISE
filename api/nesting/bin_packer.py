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
    
    Args:
        parts: List of Part objects
        kerf: Kerf width (cutting blade width) in mm
        shared_cut_savings: Length saved by shared cuts in mm
    
    Returns:
        Total length in millimeters
    """
    if not parts:
        return 0.0
    
    # Total length = sum of part lengths + kerf between each part - shared savings
    total_length = sum(p.length for p in parts)
    kerf_length = kerf * (len(parts) - 1)  # Kerf between parts, not at ends
    
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
    shared_cut_savings: float = 0.0
) -> Optional[float]:
    """
    Find the best stock length that fits the given parts.
    
    STRATEGY: Prefer longer stocks first (12m before 6m) to maximize utilization.
    This matches the original algorithm behavior before refactoring.
    
    Args:
        parts: List of Part objects
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
        shared_cut_savings: Length saved by shared cuts in mm
    
    Returns:
        Best stock length, or None if parts don't fit in any stock
    """
    required_length = calculate_combined_length_with_kerf(parts, kerf, shared_cut_savings)
    
    # CHANGED: Check longer stocks first (12m before 6m)
    # This prefers filling longer bars first to minimize number of bars and cuts
    for stock_length in sorted(stock_lengths, reverse=True):
        if required_length <= stock_length:
            return stock_length
    
    return None


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
    2. For each part, try to fit it in an existing pattern
    3. If it doesn't fit, create a new pattern
    
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
            # Find best stock for this part
            best_stock = find_best_stock_for_parts([part], stock_lengths, kerf)
            
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
    
    # Calculate waste for each pattern
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

