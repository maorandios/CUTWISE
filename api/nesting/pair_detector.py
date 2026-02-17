"""
Complementary pair and chain detection for slope-aware nesting.

This module identifies parts with complementary slopes that can be
nested together to share cuts and minimize waste.
"""

from typing import List, Tuple, Dict, Set, Optional
from dataclasses import dataclass
from .models import Part
from .slope_detector import are_slopes_complementary


@dataclass
class ComplementaryPair:
    """Represents a pair of parts with complementary slopes."""
    
    part1: Part
    part2: Part
    pairing_type: str  # 'start-end', 'end-start', 'start-start', 'end-end'
    angle_match_quality: float  # 0.0 to 1.0, higher is better
    shared_cut_savings: float  # Estimated length saved by sharing the cut (mm)
    
    @property
    def total_length(self) -> float:
        """Total length of both parts."""
        return self.part1.length + self.part2.length
    
    @property
    def combined_length_with_savings(self) -> float:
        """Combined length minus shared cut savings."""
        return self.total_length - self.shared_cut_savings


@dataclass
class ComplementaryChain:
    """Represents a chain of parts that can be nested together."""
    
    parts: List[Part]
    connection_types: List[str]  # Connection type between each pair
    total_shared_cuts: int
    
    @property
    def length(self) -> int:
        """Number of parts in the chain."""
        return len(self.parts)
    
    @property
    def total_length(self) -> float:
        """Total length of all parts in the chain."""
        return sum(p.length for p in self.parts)


def check_slope_match(
    angle1: Optional[float],
    angle2: Optional[float],
    angle_tolerance: float = 2.0,  # Reduced from 5.0 to prevent false matches
    min_angle: float = 1.0
) -> bool:
    """
    Check if two angles match (are complementary).
    
    Two angles are complementary if:
    1. Both are above minimum threshold
    2. Their absolute difference is within tight tolerance
    3. They use the same angle convention (ABSOLUTE vs DEVIATION)
    
    Args:
        angle1: First angle in degrees
        angle2: Second angle in degrees
        angle_tolerance: Maximum angle difference (default: 2.0°)
        min_angle: Minimum angle to consider as slope (default: 1.0°)
    
    Returns:
        True if angles match within tolerance
    """
    if angle1 is None or angle2 is None:
        return False
    
    # Both must be significant slopes
    if abs(angle1) < min_angle or abs(angle2) < min_angle:
        return False
    
    # Calculate angle difference
    angle_diff = abs(abs(angle1) - abs(angle2))
    
    if angle_diff >= angle_tolerance:
        return False
    
    # Check if both use same angle convention
    # This prevents matching a 30° ABSOLUTE angle with a 30° DEVIATION angle
    from .slope_detector import detect_angle_convention
    conv1, _ = detect_angle_convention(angle1)
    conv2, _ = detect_angle_convention(angle2)
    
    if conv1 != conv2:
        return False
    
    return True


def calculate_angle_match_quality(angle1: float, angle2: float) -> float:
    """
    Calculate match quality score for two angles (0.0 to 1.0).
    
    Args:
        angle1: First angle in degrees
        angle2: Second angle in degrees
    
    Returns:
        Match quality score (1.0 = perfect match, 0.0 = no match)
    """
    angle_diff = abs(abs(angle1) - abs(angle2))
    # Perfect match at 0° difference, linearly decrease to 0 at 45°
    quality = max(0.0, 1.0 - (angle_diff / 45.0))
    return quality


def estimate_shared_cut_savings(
    part1: Part,
    part2: Part,
    pairing_type: str,
    kerf: float = 3.0
) -> float:
    """
    Estimate the length saved by sharing a cut between two parts.
    
    When two parts with complementary slopes are nested together,
    they can share a single angled cut, saving material.
    
    Args:
        part1: First part
        part2: Second part
        pairing_type: Type of pairing ('start-end', 'end-start', etc.)
        kerf: Kerf width (cutting blade width) in mm
    
    Returns:
        Estimated savings in millimeters
    """
    # Get the relevant angles based on pairing type
    if pairing_type == "start-end":
        angle1 = part1.start_slope.angle
        angle2 = part2.end_slope.angle
    elif pairing_type == "end-start":
        angle1 = part1.end_slope.angle
        angle2 = part2.start_slope.angle
    elif pairing_type == "start-start":
        angle1 = part1.start_slope.angle
        angle2 = part2.start_slope.angle
    elif pairing_type == "end-end":
        angle1 = part1.end_slope.angle
        angle2 = part2.end_slope.angle
    else:
        return 0.0
    
    if angle1 is None or angle2 is None:
        return 0.0
    
    # Calculate average angle
    avg_angle = (abs(angle1) + abs(angle2)) / 2.0
    
    # For angled cuts, the savings is approximately:
    # kerf + (profile_height * tan(angle))
    # We don't have profile height here, so use a conservative estimate
    # based on the angle: steeper angles = more savings
    
    # Base savings: one kerf width
    base_savings = kerf
    
    # Additional savings from angled cut (rough estimate)
    # At 45°, assume ~10mm additional savings for typical profiles
    # Scale linearly with angle
    angle_factor = avg_angle / 90.0  # Normalize to 0-1
    additional_savings = angle_factor * 10.0
    
    total_savings = base_savings + additional_savings
    
    # Cap at reasonable maximum (one kerf + 15mm)
    return min(total_savings, kerf + 15.0)


def find_complementary_pairs(
    parts: List[Part],
    angle_tolerance: float = 5.0,
    min_angle: float = 1.0,
    kerf: float = 3.0,
    log_func=None
) -> List[ComplementaryPair]:
    """
    Find all complementary pairs in a list of parts.
    
    Args:
        parts: List of Part objects
        angle_tolerance: Maximum angle difference for complementary match
        min_angle: Minimum angle to consider as slope
        kerf: Kerf width for savings calculation
        log_func: Optional logging function
    
    Returns:
        List of ComplementaryPair objects, sorted by match quality
    """
    pairs = []
    
    if log_func:
        log_func(f"[PAIR_DETECTOR] Finding complementary pairs among {len(parts)} parts")
        log_func(f"[PAIR_DETECTOR] Angle tolerance: {angle_tolerance}°, Min angle: {min_angle}°")
    
    for i, part1 in enumerate(parts):
        # Skip if part1 has no slopes
        if not part1.has_any_slope:
            continue
        
        # Skip if already in a pair
        if part1.complementary_pair:
            continue
        
        for j in range(i + 1, len(parts)):
            part2 = parts[j]
            
            # Skip if part2 has no slopes
            if not part2.has_any_slope:
                continue
            
            # Skip if already in a pair
            if part2.complementary_pair:
                continue
            
            # Check all possible pairing combinations
            pairings = []
            
            # start-end: part1 start matches part2 end
            if part1.start_slope.has_slope and part2.end_slope.has_slope:
                match_result = check_slope_match(part1.start_slope.angle, part2.end_slope.angle, 
                                    angle_tolerance, min_angle)
                if log_func:
                    log_func(f"[PAIR_DETECTOR]   Checking part {part1.product_id} start ({part1.start_slope.angle:.2f}°) "
                            f"vs part {part2.product_id} end ({part2.end_slope.angle:.2f}°): {match_result}")
                if match_result:
                    quality = calculate_angle_match_quality(
                        part1.start_slope.angle, part2.end_slope.angle
                    )
                    savings = estimate_shared_cut_savings(part1, part2, "start-end", kerf)
                    pairings.append(("start-end", quality, savings))
            
            # end-start: part1 end matches part2 start
            if part1.end_slope.has_slope and part2.start_slope.has_slope:
                match_result = check_slope_match(part1.end_slope.angle, part2.start_slope.angle,
                                    angle_tolerance, min_angle)
                if log_func:
                    log_func(f"[PAIR_DETECTOR]   Checking part {part1.product_id} end ({part1.end_slope.angle:.2f}°) "
                            f"vs part {part2.product_id} start ({part2.start_slope.angle:.2f}°): {match_result}")
                if match_result:
                    quality = calculate_angle_match_quality(
                        part1.end_slope.angle, part2.start_slope.angle
                    )
                    savings = estimate_shared_cut_savings(part1, part2, "end-start", kerf)
                    pairings.append(("end-start", quality, savings))
            
            # start-start: both start slopes match (one part flipped)
            if part1.start_slope.has_slope and part2.start_slope.has_slope:
                match_result = check_slope_match(part1.start_slope.angle, part2.start_slope.angle,
                                    angle_tolerance, min_angle)
                if log_func:
                    log_func(f"[PAIR_DETECTOR]   Checking part {part1.product_id} start ({part1.start_slope.angle:.2f}°) "
                            f"vs part {part2.product_id} start ({part2.start_slope.angle:.2f}°): {match_result}")
                if match_result:
                    quality = calculate_angle_match_quality(
                        part1.start_slope.angle, part2.start_slope.angle
                    )
                    savings = estimate_shared_cut_savings(part1, part2, "start-start", kerf)
                    pairings.append(("start-start", quality, savings))
            
            # end-end: both end slopes match (one part flipped)
            if part1.end_slope.has_slope and part2.end_slope.has_slope:
                match_result = check_slope_match(part1.end_slope.angle, part2.end_slope.angle,
                                    angle_tolerance, min_angle)
                if log_func:
                    log_func(f"[PAIR_DETECTOR]   Checking part {part1.product_id} end ({part1.end_slope.angle:.2f}°) "
                            f"vs part {part2.product_id} end ({part2.end_slope.angle:.2f}°): {match_result}")
                if match_result:
                    quality = calculate_angle_match_quality(
                        part1.end_slope.angle, part2.end_slope.angle
                    )
                    savings = estimate_shared_cut_savings(part1, part2, "end-end", kerf)
                    pairings.append(("end-end", quality, savings))
            
            # If any pairing found, use the best one
            if pairings:
                # Sort by quality, then by savings
                pairings.sort(key=lambda x: (x[1], x[2]), reverse=True)
                best_pairing_type, best_quality, best_savings = pairings[0]
                
                if log_func:
                    log_func(f"[PAIR_DETECTOR]   ✓ MATCHED: part {part1.product_id} + part {part2.product_id} "
                            f"({best_pairing_type}, quality={best_quality:.3f}, savings={best_savings:.1f}mm)")
                
                pair = ComplementaryPair(
                    part1=part1,
                    part2=part2,
                    pairing_type=best_pairing_type,
                    angle_match_quality=best_quality,
                    shared_cut_savings=best_savings
                )
                pairs.append(pair)
    
    # Sort pairs by match quality
    pairs.sort(key=lambda p: p.angle_match_quality, reverse=True)
    
    if log_func:
        log_func(f"[PAIR_DETECTOR] Found {len(pairs)} complementary pairs total")
    
    return pairs


def build_part_connection_graph(
    parts: List[Part],
    angle_tolerance: float = 5.0,
    min_angle: float = 1.0
) -> Dict[int, List[Tuple[int, str]]]:
    """
    Build a graph of which parts can connect to which.
    
    Args:
        parts: List of Part objects
        angle_tolerance: Maximum angle difference for complementary match
        min_angle: Minimum angle to consider as slope
    
    Returns:
        Dictionary mapping part_index -> list of (connected_part_index, connection_type)
    """
    connections = {i: [] for i in range(len(parts))}
    
    for i in range(len(parts)):
        part_i = parts[i]
        
        for j in range(i + 1, len(parts)):
            part_j = parts[j]
            
            # Check all possible connection types
            if part_i.start_slope.has_slope and part_j.start_slope.has_slope:
                if check_slope_match(part_i.start_slope.angle, part_j.start_slope.angle,
                                    angle_tolerance, min_angle):
                    connections[i].append((j, 'start-start'))
                    connections[j].append((i, 'start-start'))
            
            if part_i.start_slope.has_slope and part_j.end_slope.has_slope:
                if check_slope_match(part_i.start_slope.angle, part_j.end_slope.angle,
                                    angle_tolerance, min_angle):
                    connections[i].append((j, 'start-end'))
                    connections[j].append((i, 'end-start'))
            
            if part_i.end_slope.has_slope and part_j.start_slope.has_slope:
                if check_slope_match(part_i.end_slope.angle, part_j.start_slope.angle,
                                    angle_tolerance, min_angle):
                    connections[i].append((j, 'end-start'))
                    connections[j].append((i, 'start-end'))
            
            if part_i.end_slope.has_slope and part_j.end_slope.has_slope:
                if check_slope_match(part_i.end_slope.angle, part_j.end_slope.angle,
                                    angle_tolerance, min_angle):
                    connections[i].append((j, 'end-end'))
                    connections[j].append((i, 'end-end'))
    
    return connections


def find_complementary_chains(
    parts: List[Part],
    angle_tolerance: float = 5.0,
    min_angle: float = 1.0
) -> List[ComplementaryChain]:
    """
    Find chains of parts that can be nested together.
    
    A chain is a sequence of parts where each consecutive pair has
    complementary slopes.
    
    Args:
        parts: List of Part objects
        angle_tolerance: Maximum angle difference for complementary match
        min_angle: Minimum angle to consider as slope
    
    Returns:
        List of ComplementaryChain objects, sorted by length (longest first)
    """
    # Build connection graph
    connections = build_part_connection_graph(parts, angle_tolerance, min_angle)
    
    # Find chains using greedy approach
    used_in_chains: Set[int] = set()
    all_chains: List[ComplementaryChain] = []
    
    # Priority: start with parts that have only 1 connection (likely chain ends)
    start_candidates = sorted(range(len(parts)), key=lambda x: len(connections[x]))
    
    for start_idx in start_candidates:
        if start_idx in used_in_chains:
            continue
        if len(connections[start_idx]) == 0:
            continue
        
        # Build chain starting from this part
        chain_indices = [start_idx]
        chain_connections = []
        used_in_chains.add(start_idx)
        
        # Extend chain as long as possible
        while True:
            current_idx = chain_indices[-1]
            # Find next part to add (not already in chain)
            next_candidates = [
                (idx, conn_type) for idx, conn_type in connections[current_idx]
                if idx not in used_in_chains
            ]
            
            if not next_candidates:
                break
            
            # Pick the first available connection
            next_idx, conn_type = next_candidates[0]
            chain_indices.append(next_idx)
            chain_connections.append(conn_type)
            used_in_chains.add(next_idx)
        
        # Only keep chains with 2+ parts
        if len(chain_indices) >= 2:
            chain_parts = [parts[idx] for idx in chain_indices]
            chain = ComplementaryChain(
                parts=chain_parts,
                connection_types=chain_connections,
                total_shared_cuts=len(chain_connections)
            )
            all_chains.append(chain)
    
    # Sort by chain length (longest first)
    all_chains.sort(key=lambda c: c.length, reverse=True)
    
    return all_chains


def mark_parts_in_pairs(pairs: List[ComplementaryPair]) -> None:
    """
    Mark parts as being in complementary pairs.
    
    This modifies the Part objects in-place.
    
    Args:
        pairs: List of ComplementaryPair objects
    """
    for pair in pairs:
        pair.part1.complementary_pair = True
        pair.part2.complementary_pair = True


def mark_parts_in_chains(chains: List[ComplementaryChain]) -> None:
    """
    Mark parts as being in complementary chains.
    
    This modifies the Part objects in-place.
    
    Args:
        chains: List of ComplementaryChain objects
    """
    for chain in chains:
        for part in chain.parts:
            part.complementary_pair = True

