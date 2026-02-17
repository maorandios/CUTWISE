"""
Slope detection and matching logic for profile nesting.

This module handles:
- Detecting slope cuts from IFC geometry
- Calculating deviation from straight cuts
- Matching complementary slopes
- Identifying dual-slope parts
"""

from typing import Optional, Tuple
from .models import SlopeInfo


# Thresholds for slope detection
SLOPE_DEVIATION_THRESHOLD = 1.0  # Minimum deviation from straight (degrees)
SLOPE_CONFIDENCE_THRESHOLD = 0.3  # Minimum confidence for slope detection
SHORT_PART_LENGTH_THRESHOLD = 500.0  # mm - threshold for short part special handling
LARGE_ANGLE_THRESHOLD = 15.0  # Minimum angle for dual-slope detection
SIMILAR_ANGLE_TOLERANCE = 2.0  # Maximum difference for "similar" angles

# Thresholds for complementary matching
COMPLEMENTARY_ANGLE_TOLERANCE = 5.0  # Maximum angle difference for complementary match
COMPLEMENTARY_MIN_ANGLE = 1.0  # Minimum angle to consider as slope


def detect_angle_convention(angle: float) -> Tuple[str, float]:
    """
    Detect the angle convention and calculate deviation from straight.
    
    Two conventions are supported:
    - ABSOLUTE: 90° = straight, 0°/180° = horizontal
    - DEVIATION: 0° = straight, positive/negative = deviation
    
    Args:
        angle: Angle in degrees
    
    Returns:
        Tuple of (convention, deviation_from_straight)
    """
    abs_angle = abs(angle)
    
    if 60 <= abs_angle <= 120:
        # ABSOLUTE convention: 90° = straight
        deviation = abs(angle - 90.0)
        return "ABSOLUTE", deviation
    else:
        # DEVIATION convention: 0° = straight
        deviation = abs_angle
        return "DEVIATION", deviation


def is_slope_significant(
    angle: float,
    confidence: float,
    deviation_threshold: float = SLOPE_DEVIATION_THRESHOLD,
    confidence_threshold: float = SLOPE_CONFIDENCE_THRESHOLD
) -> Tuple[bool, float]:
    """
    Determine if a cut angle represents a significant slope.
    
    A slope is significant if:
    1. Deviation from straight exceeds threshold (default: 1°)
    2. Confidence score exceeds threshold (default: 0.3)
    
    Args:
        angle: Cut angle in degrees
        confidence: Confidence score (0.0 to 1.0)
        deviation_threshold: Minimum deviation to consider as slope
        confidence_threshold: Minimum confidence to trust measurement
    
    Returns:
        Tuple of (has_slope, deviation_from_straight)
    """
    _, deviation = detect_angle_convention(angle)
    has_slope = deviation > deviation_threshold and confidence > confidence_threshold
    return has_slope, deviation


def create_slope_info(
    angle: Optional[float],
    confidence: float = 0.0,
    deviation_threshold: float = SLOPE_DEVIATION_THRESHOLD,
    confidence_threshold: float = SLOPE_CONFIDENCE_THRESHOLD
) -> SlopeInfo:
    """
    Create a SlopeInfo object from angle and confidence data.
    
    Args:
        angle: Cut angle in degrees (None if no cut data)
        confidence: Confidence score (0.0 to 1.0)
        deviation_threshold: Minimum deviation to consider as slope
        confidence_threshold: Minimum confidence to trust measurement
    
    Returns:
        SlopeInfo object with detected slope information
    """
    if angle is None:
        return SlopeInfo(has_slope=False, angle=None, confidence=0.0)
    
    has_slope, deviation = is_slope_significant(
        angle, confidence, deviation_threshold, confidence_threshold
    )
    
    return SlopeInfo(
        has_slope=has_slope,
        angle=angle,
        confidence=confidence,
        deviation_from_straight=deviation
    )


def handle_dual_slope_short_part(
    start_slope: SlopeInfo,
    end_slope: SlopeInfo,
    length_mm: float,
    short_threshold: float = SHORT_PART_LENGTH_THRESHOLD,
    large_angle_threshold: float = LARGE_ANGLE_THRESHOLD,
    similar_tolerance: float = SIMILAR_ANGLE_TOLERANCE
) -> Tuple[SlopeInfo, SlopeInfo]:
    """
    Handle special case for short parts with similar angles on both ends.
    
    Short parts with low-confidence angles on both ends often indicate
    potential complementary pairing. This function applies heuristics to
    determine which end(s) should be treated as slopes.
    
    Logic:
    1. Both ends must have large angles (> 15°)
    2. Both must have low confidence (< 0.5)
    3. Part must be short (< 500mm)
    4. If angles are very similar (< 2° difference), use only the larger one
    5. Otherwise, use the larger angle as the slope
    
    Args:
        start_slope: SlopeInfo for start end
        end_slope: SlopeInfo for end end
        length_mm: Part length in millimeters
        short_threshold: Maximum length for "short" parts
        large_angle_threshold: Minimum angle to consider as "large"
        similar_tolerance: Maximum difference for "similar" angles
    
    Returns:
        Tuple of (updated_start_slope, updated_end_slope)
    """
    # Check if special handling applies
    if (start_slope.has_slope or end_slope.has_slope or
        start_slope.confidence >= 0.5 or end_slope.confidence >= 0.5 or
        length_mm >= short_threshold or
        start_slope.deviation_from_straight is None or end_slope.deviation_from_straight is None or
        start_slope.deviation_from_straight <= large_angle_threshold or
        end_slope.deviation_from_straight <= large_angle_threshold):
        # No special handling needed
        return start_slope, end_slope
    
    start_dev = start_slope.deviation_from_straight
    end_dev = end_slope.deviation_from_straight
    angle_diff = abs(start_dev - end_dev)
    
    # Create updated slope info objects
    updated_start = SlopeInfo(
        has_slope=start_slope.has_slope,
        angle=start_slope.angle,
        confidence=start_slope.confidence,
        deviation_from_straight=start_dev
    )
    
    updated_end = SlopeInfo(
        has_slope=end_slope.has_slope,
        angle=end_slope.angle,
        confidence=end_slope.confidence,
        deviation_from_straight=end_dev
    )
    
    if angle_diff < similar_tolerance:
        # Very similar angles - use only the larger one
        if start_dev > end_dev:
            updated_start.has_slope = True
        else:
            updated_end.has_slope = True
    elif start_dev > end_dev:
        # Start has larger angle
        updated_start.has_slope = True
    else:
        # End has larger angle
        updated_end.has_slope = True
    
    return updated_start, updated_end


def are_slopes_complementary(
    slope1: SlopeInfo,
    slope2: SlopeInfo,
    angle_tolerance: float = COMPLEMENTARY_ANGLE_TOLERANCE,
    min_angle: float = COMPLEMENTARY_MIN_ANGLE
) -> bool:
    """
    Check if two slopes are complementary (can be nested together).
    
    Two slopes are complementary if:
    1. Both have slopes
    2. Their angles match within tolerance
    3. Both angles exceed minimum threshold
    
    This is a convenience wrapper around SlopeInfo.is_complementary_to().
    
    Args:
        slope1: First SlopeInfo
        slope2: Second SlopeInfo
        angle_tolerance: Maximum angle difference (default: 5.0°)
        min_angle: Minimum angle to consider (default: 1.0°)
    
    Returns:
        True if slopes are complementary, False otherwise
    """
    return slope1.is_complementary_to(slope2, angle_tolerance, min_angle)


def calculate_slope_match_score(slope1: SlopeInfo, slope2: SlopeInfo) -> float:
    """
    Calculate a match score for two slopes (0.0 to 1.0).
    
    Higher scores indicate better matches. Score is based on:
    - Angle similarity (closer angles = higher score)
    - Confidence (higher confidence = higher score)
    
    Args:
        slope1: First SlopeInfo
        slope2: Second SlopeInfo
    
    Returns:
        Match score from 0.0 (no match) to 1.0 (perfect match)
    """
    if not slope1.has_slope or not slope2.has_slope:
        return 0.0
    
    if slope1.angle is None or slope2.angle is None:
        return 0.0
    
    # Calculate angle similarity (0.0 to 1.0)
    angle_diff = abs(abs(slope1.angle) - abs(slope2.angle))
    angle_score = max(0.0, 1.0 - (angle_diff / 45.0))  # 45° = 0 score
    
    # Calculate confidence score (average of both confidences)
    confidence_score = (slope1.confidence + slope2.confidence) / 2.0
    
    # Weighted combination (angle is more important)
    match_score = (angle_score * 0.7) + (confidence_score * 0.3)
    
    return match_score


def format_slope_info(slope: SlopeInfo, end_name: str = "") -> str:
    """
    Format slope information for logging/debugging.
    
    Args:
        slope: SlopeInfo to format
        end_name: Optional name for this end (e.g., "START", "END")
    
    Returns:
        Formatted string describing the slope
    """
    prefix = f"{end_name} " if end_name else ""
    
    if slope.angle is None:
        return f"{prefix}No cut data"
    
    convention, _ = detect_angle_convention(slope.angle)
    
    return (
        f"{prefix}angle={slope.angle:.2f}° ({convention}), "
        f"deviation={slope.deviation_from_straight:.2f}°, "
        f"confidence={slope.confidence:.2f}, "
        f"has_slope={slope.has_slope}"
    )

