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
    'get_parts_statistics'
]

