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
    'format_slope_info'
]

