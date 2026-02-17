"""
Part sorting and categorization for nesting optimization.

This module handles sorting parts by various criteria to optimize
the nesting algorithm's performance and waste reduction.
"""

from typing import List, Dict, Callable
from .models import Part


def sort_parts_by_length(parts: List[Part], descending: bool = True) -> List[Part]:
    """
    Sort parts by length.
    
    Args:
        parts: List of Part objects
        descending: If True, sort longest first (default for nesting)
    
    Returns:
        Sorted list of parts
    """
    return sorted(parts, key=lambda p: p.length, reverse=descending)


def sort_parts_by_cut_category(parts: List[Part]) -> List[Part]:
    """
    Sort parts by cut category for optimal nesting.
    
    Priority order:
    1. straight-both (easiest to nest)
    2. straight-start (can be paired with straight-end)
    3. straight-end (can be paired with straight-start)
    4. sloped-both (hardest to nest, requires complementary matching)
    
    Within each category, parts are sorted by length (longest first).
    
    Args:
        parts: List of Part objects
    
    Returns:
        Sorted list of parts
    """
    # Define category priority
    category_priority = {
        "straight-both": 0,
        "straight-start": 1,
        "straight-end": 2,
        "sloped-both": 3
    }
    
    return sorted(
        parts,
        key=lambda p: (category_priority.get(p.cut_category, 99), -p.length)
    )


def sort_parts_by_assembly(parts: List[Part]) -> List[Part]:
    """
    Sort parts by assembly mark.
    
    This groups parts from the same assembly together, which can be
    useful for tracking and reporting.
    
    Args:
        parts: List of Part objects
    
    Returns:
        Sorted list of parts
    """
    return sorted(parts, key=lambda p: (p.assembly_mark or "ZZZ", -p.length))


def categorize_parts_by_cuts(parts: List[Part]) -> Dict[str, List[Part]]:
    """
    Categorize parts by their cut types.
    
    Returns a dictionary with categories:
    - "straight-both": Both ends straight
    - "straight-start": Start straight, end sloped
    - "straight-end": Start sloped, end straight
    - "sloped-both": Both ends sloped
    
    Args:
        parts: List of Part objects
    
    Returns:
        Dictionary mapping category -> list of parts
    """
    categorized = {
        "straight-both": [],
        "straight-start": [],
        "straight-end": [],
        "sloped-both": []
    }
    
    for part in parts:
        category = part.cut_category
        if category in categorized:
            categorized[category].append(part)
    
    return categorized


def filter_parts_by_length(
    parts: List[Part],
    min_length: float = 0.0,
    max_length: float = float('inf')
) -> List[Part]:
    """
    Filter parts by length range.
    
    Args:
        parts: List of Part objects
        min_length: Minimum length in millimeters (inclusive)
        max_length: Maximum length in millimeters (inclusive)
    
    Returns:
        Filtered list of parts
    """
    return [p for p in parts if min_length <= p.length <= max_length]


def group_parts_by_profile(parts: List[Part]) -> Dict[str, List[Part]]:
    """
    Group parts by profile name.
    
    Args:
        parts: List of Part objects
    
    Returns:
        Dictionary mapping profile_name -> list of parts
    """
    grouped = {}
    
    for part in parts:
        profile = part.profile_name
        if profile not in grouped:
            grouped[profile] = []
        grouped[profile].append(part)
    
    return grouped


def find_complementary_candidates(
    part: Part,
    candidate_pool: List[Part],
    angle_tolerance: float = 5.0
) -> List[Part]:
    """
    Find parts that could be complementary to the given part.
    
    A complementary part has:
    - At least one sloped end
    - Slope angle matching within tolerance
    - Not already marked as part of a complementary pair
    
    Args:
        part: Part to find complements for
        candidate_pool: Pool of parts to search
        angle_tolerance: Maximum angle difference for complementary match
    
    Returns:
        List of potential complementary parts, sorted by match quality
    """
    if not part.has_any_slope:
        return []
    
    candidates = []
    
    for candidate in candidate_pool:
        # Skip if already in a pair
        if candidate.complementary_pair:
            continue
        
        # Skip if same part
        if candidate.product_id == part.product_id:
            continue
        
        # Skip if no slopes
        if not candidate.has_any_slope:
            continue
        
        # Check if any slopes are complementary
        is_complementary = False
        
        # Check all combinations of slopes
        if part.start_slope.has_slope and candidate.start_slope.has_slope:
            if part.start_slope.is_complementary_to(candidate.start_slope, angle_tolerance):
                is_complementary = True
        
        if part.start_slope.has_slope and candidate.end_slope.has_slope:
            if part.start_slope.is_complementary_to(candidate.end_slope, angle_tolerance):
                is_complementary = True
        
        if part.end_slope.has_slope and candidate.start_slope.has_slope:
            if part.end_slope.is_complementary_to(candidate.start_slope, angle_tolerance):
                is_complementary = True
        
        if part.end_slope.has_slope and candidate.end_slope.has_slope:
            if part.end_slope.is_complementary_to(candidate.end_slope, angle_tolerance):
                is_complementary = True
        
        if is_complementary:
            candidates.append(candidate)
    
    # Sort by length (prefer similar lengths for better nesting)
    candidates.sort(key=lambda c: abs(c.length - part.length))
    
    return candidates


def sort_parts_for_nesting(
    parts: List[Part],
    strategy: str = "cut_category"
) -> List[Part]:
    """
    Sort parts using the specified nesting strategy.
    
    Available strategies:
    - "cut_category": Sort by cut type (straight-both first, sloped-both last)
    - "length": Sort by length (longest first)
    - "assembly": Sort by assembly mark
    - "hybrid": Combination of cut_category and length (default for nesting)
    
    Args:
        parts: List of Part objects
        strategy: Sorting strategy name
    
    Returns:
        Sorted list of parts
    """
    if strategy == "length":
        return sort_parts_by_length(parts)
    elif strategy == "assembly":
        return sort_parts_by_assembly(parts)
    elif strategy == "cut_category":
        return sort_parts_by_cut_category(parts)
    elif strategy == "hybrid":
        # Hybrid: First by cut category, then by length within category
        return sort_parts_by_cut_category(parts)
    else:
        # Default: hybrid
        return sort_parts_by_cut_category(parts)


def get_parts_statistics(parts: List[Part]) -> Dict[str, any]:
    """
    Calculate statistics for a list of parts.
    
    Args:
        parts: List of Part objects
    
    Returns:
        Dictionary with statistics
    """
    if not parts:
        return {
            "total_parts": 0,
            "total_length": 0.0,
            "avg_length": 0.0,
            "min_length": 0.0,
            "max_length": 0.0,
            "parts_with_slopes": 0,
            "parts_straight_both": 0,
            "parts_by_category": {}
        }
    
    total_length = sum(p.length for p in parts)
    parts_with_slopes = sum(1 for p in parts if p.has_any_slope)
    parts_straight_both = sum(1 for p in parts if p.is_straight_both_sides)
    
    # Count by category
    parts_by_category = {}
    for part in parts:
        category = part.cut_category
        parts_by_category[category] = parts_by_category.get(category, 0) + 1
    
    return {
        "total_parts": len(parts),
        "total_length": total_length,
        "avg_length": total_length / len(parts),
        "min_length": min(p.length for p in parts),
        "max_length": max(p.length for p in parts),
        "parts_with_slopes": parts_with_slopes,
        "parts_straight_both": parts_straight_both,
        "parts_by_category": parts_by_category
    }

