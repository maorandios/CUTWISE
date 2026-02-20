"""
Data models for the profile nesting algorithm.

These models represent the core data structures used throughout
the nesting process, from individual parts to complete nesting reports.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from enum import Enum


class CutType(Enum):
    """Types of cuts on part ends."""
    STRAIGHT = "straight"
    SLOPED = "sloped"
    UNKNOWN = "unknown"


@dataclass
class SlopeInfo:
    """Information about a slope cut on one end of a part."""
    
    has_slope: bool
    """Whether this end has a slope cut (deviation > 1° from straight)."""
    
    angle: Optional[float] = None
    """Angle of the cut in degrees. Convention depends on source:
    - ABSOLUTE: 90° = straight, 0° or 180° = horizontal
    - DEVIATION: 0° = straight, positive/negative = deviation from straight
    """
    
    confidence: float = 0.0
    """Confidence score for the slope detection (0.0 to 1.0).
    Higher values indicate more reliable measurements.
    """
    
    deviation_from_straight: Optional[float] = None
    """Absolute deviation from straight cut in degrees.
    Always positive, regardless of angle convention.
    """
    
    @property
    def cut_type(self) -> CutType:
        """Determine the cut type based on slope information."""
        if self.has_slope:
            return CutType.SLOPED
        elif self.angle is not None:
            return CutType.STRAIGHT
        else:
            return CutType.UNKNOWN
    
    def is_complementary_to(self, other: 'SlopeInfo', tolerance: float = 5.0, min_angle: float = 1.0) -> bool:
        """
        Check if this slope is complementary to another slope.
        
        Two slopes are complementary if:
        1. Both have slopes
        2. Their angles match within tolerance
        3. Both angles exceed minimum threshold
        
        Args:
            other: Another SlopeInfo to compare with
            tolerance: Maximum angle difference in degrees (default: 5.0)
            min_angle: Minimum angle to consider as a slope (default: 1.0)
        
        Returns:
            True if slopes are complementary, False otherwise
        """
        if not self.has_slope or not other.has_slope:
            return False
        
        if self.angle is None or other.angle is None:
            return False
        
        angle_diff = abs(abs(self.angle) - abs(other.angle))
        return angle_diff < tolerance and abs(self.angle) > min_angle


@dataclass
class Part:
    """Represents a single part to be nested."""
    
    product_id: int
    """Unique identifier for this part (IFC product ID)."""
    
    length: float
    """Length of the part in millimeters."""
    
    profile_name: str
    """Profile type name (e.g., "IPE200", "HEA300")."""
    
    start_slope: SlopeInfo
    """Slope information for the start end of the part."""
    
    end_slope: SlopeInfo
    """Slope information for the end end of the part."""
    
    element_type: str = ""
    """IFC element type (e.g., "IfcBeam", "IfcColumn", "IfcMember")."""
    
    reference: str = ""
    """Part reference/name from IFC (e.g., "b27", "c2")."""
    
    assembly_mark: str = ""
    """Assembly mark for grouping related parts."""
    
    assembly_id: Optional[int] = None
    """Assembly ID for grouping related parts."""
    
    # Metadata for nesting algorithm
    complementary_pair: bool = False
    """Flag indicating this part is in a complementary pair/chain."""
    
    flipped: bool = False
    """Flag indicating this part was flipped during nesting."""
    
    # Original data for reference
    original_data: Dict[str, Any] = field(default_factory=dict)
    """Original data from IFC extraction (for debugging/reference)."""
    
    @property
    def has_any_slope(self) -> bool:
        """Check if this part has a slope on either end."""
        return self.start_slope.has_slope or self.end_slope.has_slope
    
    @property
    def has_both_slopes(self) -> bool:
        """Check if this part has slopes on both ends."""
        return self.start_slope.has_slope and self.end_slope.has_slope
    
    @property
    def has_straight_start(self) -> bool:
        """Check if start end is straight."""
        return not self.start_slope.has_slope
    
    @property
    def has_straight_end(self) -> bool:
        """Check if end end is straight."""
        return not self.end_slope.has_slope
    
    @property
    def is_straight_both_sides(self) -> bool:
        """Check if both ends are straight."""
        return self.has_straight_start and self.has_straight_end
    
    @property
    def cut_category(self) -> str:
        """
        Get the cut category for ordering priority.
        
        Returns:
            One of: "straight-both", "straight-start", "straight-end", "sloped-both"
        """
        if self.is_straight_both_sides:
            return "straight-both"
        elif self.has_straight_start and not self.has_straight_end:
            return "straight-start"
        elif not self.has_straight_start and self.has_straight_end:
            return "straight-end"
        else:
            return "sloped-both"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        # Convert original_data values to JSON-serializable types
        serializable_original_data = {}
        for key, value in self.original_data.items():
            # Skip element_name - we'll add it explicitly below
            if key == "element_name":
                continue
            # Convert numpy booleans and other special types to native Python types
            if hasattr(value, 'item'):  # numpy types have .item() method
                serializable_original_data[key] = value.item()
            elif isinstance(value, bool):
                serializable_original_data[key] = bool(value)
            elif value is None or isinstance(value, (str, int, float, list, dict)):
                serializable_original_data[key] = value
            else:
                # Skip non-serializable values
                continue
        
        return {
            "product_id": self.product_id,
            "length": self.length,
            "profile_name": self.profile_name,
            "element_type": self.element_type,
            "reference": self.reference,
            "element_name": self.original_data.get("element_name", ""),  # For frontend compatibility
            "assembly_mark": self.assembly_mark,
            "assembly_id": self.assembly_id,
            "start_has_slope": bool(self.start_slope.has_slope),
            "start_angle": self.start_slope.angle,
            "start_confidence": self.start_slope.confidence,
            "end_has_slope": bool(self.end_slope.has_slope),
            "end_angle": self.end_slope.angle,
            "end_confidence": self.end_slope.confidence,
            "complementary_pair": bool(self.complementary_pair),
            "flipped": bool(self.flipped),
            **serializable_original_data
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Part':
        """Create Part from dictionary (from IFC extraction)."""
        start_slope = SlopeInfo(
            has_slope=data.get("start_has_slope", False),
            angle=data.get("start_angle"),
            confidence=data.get("start_confidence", 0.0),
            deviation_from_straight=data.get("start_deviation")
        )
        
        end_slope = SlopeInfo(
            has_slope=data.get("end_has_slope", False),
            angle=data.get("end_angle"),
            confidence=data.get("end_confidence", 0.0),
            deviation_from_straight=data.get("end_deviation")
        )
        
        # Extract core fields
        core_fields = {
            "product_id", "length", "profile_name", "element_type",
            "reference", "assembly_mark", "assembly_id",
            "start_has_slope", "start_angle", "start_confidence",
            "end_has_slope", "end_angle", "end_confidence",
            "complementary_pair", "flipped"
        }
        
        # Store remaining fields in original_data
        original_data = {k: v for k, v in data.items() if k not in core_fields}
        
        return cls(
            product_id=data.get("product_id", 0),
            length=data.get("length", 0.0),
            profile_name=data.get("profile_name", ""),
            start_slope=start_slope,
            end_slope=end_slope,
            element_type=data.get("element_type", ""),
            reference=data.get("reference", ""),
            assembly_mark=data.get("assembly_mark", ""),
            assembly_id=data.get("assembly_id"),
            complementary_pair=data.get("complementary_pair", False),
            flipped=data.get("flipped", False),
            original_data=original_data
        )


@dataclass
class CuttingPattern:
    """Represents a single cutting pattern on one stock bar."""
    
    stock_length: float
    """Length of the stock bar in millimeters."""
    
    parts: List[Part]
    """List of parts placed on this stock bar, in order."""
    
    waste: float
    """Total waste for this pattern in millimeters."""
    
    waste_percentage: float
    """Waste as percentage of stock length."""
    
    cut_positions: List[float] = field(default_factory=list)
    """Positions of cuts along the stock bar."""
    
    shared_cuts: int = 0
    """Number of cuts shared between complementary parts."""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        # Match the old API structure where parts are wrapped with "part" key
        # This maintains compatibility with the frontend
        parts_list = []
        for part in self.parts:
            parts_list.append({
                "part": part.to_dict(),  # Nested part object for frontend compatibility
                "length": part.length,
                "slope_info": {
                    "start_angle": part.start_slope.angle,
                    "end_angle": part.end_slope.angle,
                    "start_has_slope": part.start_slope.has_slope,
                    "end_has_slope": part.end_slope.has_slope,
                    "has_slope": part.has_any_slope,
                    "complementary_pair": part.complementary_pair
                }
            })
        
        return {
            "stock_length": self.stock_length,
            "parts": parts_list,
            "waste": self.waste,
            "waste_percentage": self.waste_percentage,
            "cut_positions": self.cut_positions,
            "shared_cuts": self.shared_cuts
        }


@dataclass
class RejectedPart:
    """Represents a part that could not be nested."""
    
    product_id: int
    """Unique identifier for this part."""
    
    length: float
    """Length of the part in millimeters."""
    
    profile_name: str
    """Profile type name."""
    
    reason: str
    """Reason why this part was rejected (e.g., "exceeds maximum stock length")."""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "product_id": self.product_id,
            "length": self.length,
            "profile_name": self.profile_name,
            "reason": self.reason
        }


@dataclass
class ProfileNesting:
    """Nesting result for a single profile type."""
    
    profile_name: str
    """Profile type name (e.g., "IPE200")."""
    
    total_parts: int
    """Total number of parts for this profile."""
    
    total_length: float
    """Total length of all parts in millimeters."""
    
    cutting_patterns: List[CuttingPattern]
    """List of cutting patterns (one per stock bar used)."""
    
    stock_lengths_used: Dict[float, int]
    """Dictionary mapping stock length to quantity used."""
    
    total_waste: float
    """Total waste across all patterns in millimeters."""
    
    total_waste_percentage: float
    """Total waste as percentage of total stock used."""
    
    rejected_parts: List[RejectedPart] = field(default_factory=list)
    """Parts that could not be nested."""
    
    alternative_waste_percentage: Optional[float] = None
    """Alternative waste percentage (manual approach without optimization)."""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = {
            "profile_name": self.profile_name,
            "total_parts": self.total_parts,
            "total_length": self.total_length,
            "cutting_patterns": [pattern.to_dict() for pattern in self.cutting_patterns],
            "stock_lengths_used": {int(k): v for k, v in self.stock_lengths_used.items()},
            "total_waste": self.total_waste,
            "total_waste_percentage": self.total_waste_percentage,
            "rejected_parts": [part.to_dict() for part in self.rejected_parts]
        }
        if self.alternative_waste_percentage is not None:
            result["alternative_waste_percentage"] = float(self.alternative_waste_percentage)
        return result


@dataclass
class NestingReport:
    """Complete nesting report for all profiles."""
    
    filename: str
    """IFC filename."""
    
    profiles: List[ProfileNesting]
    """Nesting results for each profile type."""
    
    kerf: float = 3.0
    """Kerf width (cutting blade width) in millimeters."""
    
    stock_lengths: List[float] = field(default_factory=list)
    """Available stock lengths in millimeters."""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "filename": self.filename,
            "profiles": [profile.to_dict() for profile in self.profiles],
            "kerf": self.kerf,
            "stock_lengths": self.stock_lengths
        }

