"""
High-level orchestrator for the profile nesting algorithm.

This module provides the main entry point for nesting operations,
coordinating all the individual components (extraction, sorting,
pair detection, bin packing) into a complete workflow.
"""

from typing import List, Dict, Optional, Callable
import logging

from .models import Part, ProfileNesting, NestingReport, CuttingPattern, RejectedPart
from .profile_utils import extract_base_profile_name, group_profiles_by_base_name
from .part_extractor import extract_parts_from_ifc
from .part_sorter import (
    sort_parts_for_nesting,
    group_parts_by_profile,
    get_parts_statistics
)
from .pair_detector import (
    find_complementary_pairs,
    find_complementary_chains,
    mark_parts_in_pairs,
    mark_parts_in_chains
)
from .bin_packer import (
    pack_parts_first_fit_decreasing,
    pack_complementary_pair,
    optimize_patterns_by_consolidation
)


logger = logging.getLogger(__name__)

# Stock bars have 10-50mm excess beyond nominal length for safety tolerance
# We account for 20mm average tolerance in calculations
STOCK_SAFETY_TOLERANCE_MM = 20.0


class NestingOrchestrator:
    """
    High-level orchestrator for profile nesting operations.
    
    This class coordinates the entire nesting workflow:
    1. Extract parts from IFC file
    2. Group and sort parts by profile
    3. Detect complementary pairs and chains
    4. Pack parts into stock bars
    5. Generate nesting report
    """
    
    def __init__(
        self,
        stock_lengths: List[float],
        kerf: float = 3.0,
        trim: float = 5.0,
        angle_tolerance: float = 5.0,
        min_angle: float = 1.0,
        stock_tolerance: float = 0.0,
        log_func: Optional[Callable] = None
    ):
        """
        Initialize the nesting orchestrator.
        
        Args:
            stock_lengths: Available stock lengths in mm (sorted ascending)
            kerf: Kerf width (cutting blade width) in mm
            trim: Trim amount in mm (material removed from stock bar ends)
            angle_tolerance: Maximum angle difference for complementary matching
            min_angle: Minimum angle to consider as slope (default: 1.0°)
            stock_tolerance: Safety tolerance in mm (stock bars have 10-50mm excess, default: 0.0 = disabled)
            log_func: Optional logging function
        """
        # Apply trim AND safety tolerance to stock lengths
        # Stock bars have 10-50mm excess beyond nominal length
        # If stock_tolerance is 0, no tolerance is applied (disabled)
        # Example: 6000mm nominal + 20mm tolerance - 5mm trim = 6015mm usable
        self.original_stock_lengths = sorted(stock_lengths)
        self.stock_tolerance = stock_tolerance
        self.stock_lengths = sorted([length - trim + stock_tolerance for length in stock_lengths])
        
        # Create mapping from usable length to original length
        self.usable_to_original_map = {
            (length - trim + stock_tolerance): length 
            for length in stock_lengths
        }
        
        self.kerf = kerf
        self.trim = trim
        self.angle_tolerance = angle_tolerance
        self.min_angle = min_angle
        self.log_func = log_func or logger.info
        
        self.max_stock_length = max(self.stock_lengths) if self.stock_lengths else float('inf')
    
    def nest_profile(
        self,
        parts: List[Part],
        profile_name: str,
        use_complementary_pairing: bool = True
    ) -> ProfileNesting:
        """
        Nest parts for a single profile type.
        
        Args:
            parts: List of Part objects for this profile
            profile_name: Profile name (e.g., "IPE200")
            use_complementary_pairing: Whether to use complementary slope pairing
        
        Returns:
            ProfileNesting object with results
        """
        self.log_func(f"[ORCHESTRATOR] Nesting {len(parts)} parts for profile {profile_name}")
        
        if not parts:
            return ProfileNesting(
                profile_name=profile_name,
                total_parts=0,
                total_length=0.0,
                cutting_patterns=[],
                stock_lengths_used={},
                total_waste=0.0,
                total_waste_percentage=0.0
            )
        
        # Calculate statistics
        stats = get_parts_statistics(parts)
        self.log_func(f"[ORCHESTRATOR] Profile statistics: {stats['total_parts']} parts, "
                     f"{stats['total_length']:.0f}mm total, "
                     f"{stats['parts_with_slopes']} with slopes")
        
        # Sort parts for optimal nesting
        sorted_parts = sort_parts_for_nesting(parts, strategy="hybrid")
        
        # Detect complementary pairs and chains if enabled
        complementary_pairs = []
        complementary_chains = []
        
        if use_complementary_pairing:
            # Find pairs
            complementary_pairs = find_complementary_pairs(
                sorted_parts,
                angle_tolerance=self.angle_tolerance,
                min_angle=self.min_angle,
                kerf=self.kerf,
                log_func=self.log_func
            )
            self.log_func(f"[ORCHESTRATOR] Found {len(complementary_pairs)} complementary pair(s)")
            
            # Find chains
            complementary_chains = find_complementary_chains(
                sorted_parts,
                self.angle_tolerance
            )
            self.log_func(f"[ORCHESTRATOR] Found {len(complementary_chains)} complementary chain(s)")
            
            # Mark parts in chains (for display purposes)
            mark_parts_in_chains(complementary_chains)
        
        # Pack complementary pairs first (if enabled)
        patterns: List[CuttingPattern] = []
        paired_part_ids = set()  # Use product IDs instead of Part objects
        
        if use_complementary_pairing and complementary_pairs:
            for pair in complementary_pairs:
                # Skip if parts already used
                if pair.part1.product_id in paired_part_ids or pair.part2.product_id in paired_part_ids:
                    continue
                
                # Try to pack the pair
                pattern = pack_complementary_pair(pair, self.stock_lengths, self.kerf)
                
                if pattern:
                    patterns.append(pattern)
                    paired_part_ids.add(pair.part1.product_id)
                    paired_part_ids.add(pair.part2.product_id)
                    self.log_func(f"[ORCHESTRATOR] Packed complementary pair: "
                                f"{pair.part1.reference} + {pair.part2.reference}, "
                                f"savings: {pair.shared_cut_savings:.1f}mm")
        
        # Pack remaining parts using FFD
        remaining_parts = [p for p in sorted_parts if p.product_id not in paired_part_ids]
        
        if remaining_parts:
            self.log_func(f"[ORCHESTRATOR] Packing {len(remaining_parts)} remaining parts using FFD")
            ffd_patterns, rejected = pack_parts_first_fit_decreasing(
                remaining_parts,
                self.stock_lengths,
                self.kerf,
                self.max_stock_length
            )
            patterns.extend(ffd_patterns)
        else:
            rejected = []
        
        # Optimize patterns by consolidation
        if len(patterns) > 1:
            self.log_func(f"[ORCHESTRATOR] Optimizing {len(patterns)} patterns")
            patterns = optimize_patterns_by_consolidation(patterns, self.kerf)
            self.log_func(f"[ORCHESTRATOR] Optimized to {len(patterns)} patterns")
        
        # Optimize part order within patterns (straight cuts at ends, sloped in middle)
        from .bin_packer import optimize_stock_selection, optimize_part_order_in_patterns
        patterns = optimize_part_order_in_patterns(patterns, self.kerf)
        self.log_func(f"[ORCHESTRATOR] Part order optimization complete")
        
        # Optimize stock selection (downgrade to smaller stocks when possible)
        usable_stock_lengths = [length - self.trim + self.stock_tolerance for length in self.original_stock_lengths]
        patterns = optimize_stock_selection(patterns, usable_stock_lengths, self.kerf)
        self.log_func(f"[ORCHESTRATOR] Stock optimization complete")
        
        # Map usable stock lengths back to original stock lengths for display
        for pattern in patterns:
            usable_length = pattern.stock_length
            # Find the closest original length (to handle floating point precision)
            original_length = min(
                self.original_stock_lengths,
                key=lambda x: abs((x - self.trim) - usable_length)
            )
            pattern.stock_length = original_length
        
        # Calculate totals
        total_parts = len(parts)
        total_length = sum(p.length for p in parts)
        total_waste = sum(p.waste for p in patterns)
        
        # Calculate stock usage
        stock_lengths_used: Dict[float, int] = {}
        for pattern in patterns:
            stock_lengths_used[pattern.stock_length] = stock_lengths_used.get(pattern.stock_length, 0) + 1
        
        # Calculate total stock used
        total_stock_used = sum(p.stock_length for p in patterns)
        total_waste_percentage = (total_waste / total_stock_used * 100.0) if total_stock_used > 0 else 0.0
        
        self.log_func(f"[ORCHESTRATOR] Nesting complete: {len(patterns)} patterns, "
                     f"{total_waste:.0f}mm waste ({total_waste_percentage:.1f}%)")
        
        return ProfileNesting(
            profile_name=profile_name,
            total_parts=total_parts,
            total_length=total_length,
            cutting_patterns=patterns,
            stock_lengths_used=stock_lengths_used,
            total_waste=total_waste,
            total_waste_percentage=total_waste_percentage,
            rejected_parts=rejected
        )
    
    def nest_from_ifc(
        self,
        ifc_file: any,
        filename: str,
        selected_profiles: List[str],
        extractor: Optional[any] = None,
        use_complementary_pairing: bool = True
    ) -> NestingReport:
        """
        Complete nesting workflow from IFC file.
        
        Args:
            ifc_file: Opened IFC file
            filename: IFC filename
            selected_profiles: List of profile names to nest
            extractor: Optional CutPieceExtractor for slope detection
            use_complementary_pairing: Whether to use complementary slope pairing
        
        Returns:
            Complete NestingReport
        """
        self.log_func(f"[ORCHESTRATOR] Starting nesting for {filename}")
        self.log_func(f"[ORCHESTRATOR] Selected profiles: {selected_profiles}")
        self.log_func(f"[ORCHESTRATOR] Stock lengths (nominal): {self.original_stock_lengths}")
        self.log_func(f"[ORCHESTRATOR] Stock lengths (usable after trim + tolerance): {self.stock_lengths}")
        self.log_func(f"[ORCHESTRATOR] Kerf: {self.kerf}mm")
        self.log_func(f"[ORCHESTRATOR] Trim: {self.trim}mm")
        if self.stock_tolerance > 0:
            self.log_func(f"[ORCHESTRATOR] Stock safety tolerance: +{self.stock_tolerance}mm (enabled)")
        else:
            self.log_func(f"[ORCHESTRATOR] Stock safety tolerance: disabled (0mm)")
        
        # Normalize profile names
        base_profile_names = [extract_base_profile_name(p) for p in selected_profiles]
        
        # Extract parts from IFC
        self.log_func(f"[ORCHESTRATOR] Extracting parts from IFC file")
        parts_by_profile = extract_parts_from_ifc(
            ifc_file,
            base_profile_names,
            extractor,
            self.log_func
        )
        
        # Nest each profile
        profile_nestings: List[ProfileNesting] = []
        
        for profile_name in base_profile_names:
            if profile_name not in parts_by_profile:
                self.log_func(f"[ORCHESTRATOR] No parts found for profile {profile_name}")
                continue
            
            parts = parts_by_profile[profile_name]
            
            profile_nesting = self.nest_profile(
                parts,
                profile_name,
                use_complementary_pairing
            )
            
            # Calculate alternative waste (manual approach without optimization)
            from .alternative_calculator import calculate_alternative_waste
            alt_result = calculate_alternative_waste(
                parts,
                profile_name,
                self.original_stock_lengths,
                self.kerf,
                self.trim,
                self.stock_tolerance
            )
            profile_nesting.alternative_waste_percentage = alt_result["waste_percentage"]
            
            profile_nestings.append(profile_nesting)
        
        # Create report
        report = NestingReport(
            filename=filename,
            profiles=profile_nestings,
            kerf=self.kerf,
            stock_lengths=self.original_stock_lengths  # Use original stock lengths for display
        )
        
        # Log summary
        total_patterns = sum(len(p.cutting_patterns) for p in profile_nestings)
        total_waste = sum(p.total_waste for p in profile_nestings)
        
        self.log_func(f"[ORCHESTRATOR] Nesting complete!")
        self.log_func(f"[ORCHESTRATOR] Summary: {len(profile_nestings)} profile(s), "
                     f"{total_patterns} pattern(s), {total_waste:.0f}mm total waste")
        
        return report
    
    def nest_parts_by_profile(
        self,
        parts_by_profile: Dict[str, List[Part]],
        use_complementary_pairing: bool = True
    ) -> List[ProfileNesting]:
        """
        Nest parts that are already grouped by profile.
        
        Args:
            parts_by_profile: Dictionary mapping profile_name -> list of parts
            use_complementary_pairing: Whether to use complementary slope pairing
        
        Returns:
            List of ProfileNesting objects
        """
        profile_nestings: List[ProfileNesting] = []
        
        for profile_name, parts in parts_by_profile.items():
            profile_nesting = self.nest_profile(
                parts,
                profile_name,
                use_complementary_pairing
            )
            profile_nestings.append(profile_nesting)
        
        return profile_nestings


def create_nesting_report(
    filename: str,
    ifc_file: any,
    selected_profiles: List[str],
    stock_lengths: List[float],
    kerf: float = 3.0,
    trim: float = 5.0,
    min_angle: float = 1.0,
    stock_tolerance: float = 0.0,
    extractor: Optional[any] = None,
    use_complementary_pairing: bool = True,
    log_func: Optional[Callable] = None
) -> NestingReport:
    """
    Convenience function to create a complete nesting report.
    
    This is the main entry point for the nesting algorithm.
    
    Args:
        filename: IFC filename
        ifc_file: Opened IFC file
        selected_profiles: List of profile names to nest
        stock_lengths: Available stock lengths in mm
        kerf: Kerf width in mm
        trim: Trim amount in mm (material removed from stock bar ends)
        min_angle: Minimum angle to consider as slope (default: 1.0°)
        stock_tolerance: Safety tolerance in mm (stock bars have 10-50mm excess, default: 0.0 = disabled)
        extractor: Optional CutPieceExtractor for slope detection
        use_complementary_pairing: Whether to use complementary slope pairing
        log_func: Optional logging function
    
    Returns:
        Complete NestingReport
    """
    orchestrator = NestingOrchestrator(
        stock_lengths=stock_lengths,
        kerf=kerf,
        trim=trim,
        min_angle=min_angle,
        stock_tolerance=stock_tolerance,
        log_func=log_func
    )
    
    return orchestrator.nest_from_ifc(
        ifc_file,
        filename,
        selected_profiles,
        extractor,
        use_complementary_pairing
    )

