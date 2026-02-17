"""
Profile Nesting Algorithm Package

This package contains the refactored profile nesting algorithm,
organized into modular components for better maintainability and testability.
"""

from .models import (
    SlopeInfo,
    Part,
    CuttingPattern,
    ProfileNesting,
    NestingReport,
    RejectedPart
)

from .slope_detector import (
    detect_angle_convention,
    is_slope_significant,
    create_slope_info,
    handle_dual_slope_short_part,
    are_slopes_complementary,
    calculate_slope_match_score,
    format_slope_info
)

from .profile_utils import (
    extract_base_profile_name,
    is_valid_profile_name,
    normalize_profile_name,
    parse_profile_dimensions,
    group_profiles_by_base_name,
    format_profile_name_for_display
)

from .part_extractor import (
    extract_part_from_ifc_element,
    extract_length_and_slopes,
    extract_parts_from_ifc
)

from .part_sorter import (
    sort_parts_by_length,
    sort_parts_by_cut_category,
    sort_parts_by_assembly,
    categorize_parts_by_cuts,
    filter_parts_by_length,
    group_parts_by_profile,
    find_complementary_candidates,
    sort_parts_for_nesting,
    get_parts_statistics
)

from .pair_detector import (
    ComplementaryPair,
    ComplementaryChain,
    check_slope_match,
    find_complementary_pairs,
    find_complementary_chains,
    mark_parts_in_pairs,
    mark_parts_in_chains
)

from .bin_packer import (
    calculate_combined_length_with_kerf,
    fits_in_stock,
    find_best_stock_for_parts,
    pack_parts_first_fit_decreasing,
    pack_complementary_pair,
    optimize_patterns_by_consolidation,
    calculate_cut_positions
)

__all__ = [
    # Models
    'SlopeInfo',
    'Part',
    'CuttingPattern',
    'ProfileNesting',
    'NestingReport',
    'RejectedPart',
    # Slope detection
    'detect_angle_convention',
    'is_slope_significant',
    'create_slope_info',
    'handle_dual_slope_short_part',
    'are_slopes_complementary',
    'calculate_slope_match_score',
    'format_slope_info',
    # Profile utilities
    'extract_base_profile_name',
    'is_valid_profile_name',
    'normalize_profile_name',
    'parse_profile_dimensions',
    'group_profiles_by_base_name',
    'format_profile_name_for_display',
    # Part extraction
    'extract_part_from_ifc_element',
    'extract_length_and_slopes',
    'extract_parts_from_ifc',
    # Part sorting
    'sort_parts_by_length',
    'sort_parts_by_cut_category',
    'sort_parts_by_assembly',
    'categorize_parts_by_cuts',
    'filter_parts_by_length',
    'group_parts_by_profile',
    'find_complementary_candidates',
    'sort_parts_for_nesting',
    'get_parts_statistics',
    # Pair detection
    'ComplementaryPair',
    'ComplementaryChain',
    'check_slope_match',
    'find_complementary_pairs',
    'find_complementary_chains',
    'mark_parts_in_pairs',
    'mark_parts_in_chains',
    # Bin packing
    'calculate_combined_length_with_kerf',
    'fits_in_stock',
    'find_best_stock_for_parts',
    'pack_parts_first_fit_decreasing',
    'pack_complementary_pair',
    'optimize_patterns_by_consolidation',
    'calculate_cut_positions'
]

