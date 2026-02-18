"""
IFC part extraction for nesting.

This module handles extracting parts from IFC files, including:
- Length extraction from geometry and properties
- Slope detection using CutPieceExtractor
- Assembly mark extraction
- Metadata collection
"""

from typing import Optional, List, Dict, Any, Tuple
import logging

from .models import Part, SlopeInfo
from .slope_detector import create_slope_info, handle_dual_slope_short_part


logger = logging.getLogger(__name__)


def extract_part_from_ifc_element(
    element: Any,
    extractor: Optional[Any] = None,
    profile_name: str = "",
    log_func: Optional[callable] = None
) -> Optional[Part]:
    """
    Extract a Part object from an IFC element.
    
    This function:
    1. Extracts length from cut piece or properties
    2. Detects slopes using CutPieceExtractor
    3. Extracts assembly mark and metadata
    4. Creates a Part object with all information
    
    Args:
        element: IFC element (IfcBeam, IfcColumn, IfcMember)
        extractor: Optional CutPieceExtractor for slope detection
        profile_name: Profile name (if already extracted)
        log_func: Optional logging function
    
    Returns:
        Part object, or None if extraction fails
    """
    if log_func is None:
        log_func = logger.info
    
    try:
        product_id = element.id()
        element_type = element.is_a()
        
        # Extract length and slopes
        length_mm, start_slope, end_slope = extract_length_and_slopes(
            element, extractor, log_func
        )
        
        if length_mm <= 0:
            log_func(f"[PART_EXTRACTOR] Skipping element {product_id}: invalid length {length_mm}")
            return None
        
        # Handle dual-slope short parts
        start_slope, end_slope = handle_dual_slope_short_part(
            start_slope, end_slope, length_mm
        )
        
        # Extract metadata
        reference = extract_reference(element)
        assembly_mark, assembly_id = extract_assembly_info(element)
        
        # Extract element name separately (from Name attribute)
        # This matches the old API behavior where reference and element_name were separate
        element_name = getattr(element, 'Name', None)
        if element_name:
            element_name = str(element_name).strip()
        else:
            element_name = ''
        
        # Log extraction for debugging
        log_func(f"[PART_EXTRACTOR] Element {product_id}: reference='{reference}', element_name='{element_name}', type={element_type}")
        
        # Create Part object
        part = Part(
            product_id=product_id,
            length=length_mm,
            profile_name=profile_name,
            start_slope=start_slope,
            end_slope=end_slope,
            element_type=element_type,
            reference=reference or '',  # Keep empty if not found (don't use fallback)
            assembly_mark=assembly_mark or "N/A",
            assembly_id=assembly_id,
            original_data={
                "ifc_id": product_id,
                "ifc_type": element_type,
                "element_name": element_name  # Store for frontend compatibility
            }
        )
        
        return part
        
    except Exception as e:
        log_func(f"[PART_EXTRACTOR] Error extracting part from element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        import traceback
        traceback.print_exc()
        return None


def extract_length_and_slopes(
    element: Any,
    extractor: Optional[Any],
    log_func: callable
) -> Tuple[float, SlopeInfo, SlopeInfo]:
    """
    Extract length and slope information from an IFC element.
    
    Tries multiple methods:
    1. CutPieceExtractor (if available) - most accurate, includes slopes
    2. Property sets (Length, NominalLength, etc.)
    3. Geometry bounding box
    4. Weight-based estimation (last resort)
    
    Args:
        element: IFC element
        extractor: Optional CutPieceExtractor
        log_func: Logging function
    
    Returns:
        Tuple of (length_mm, start_slope, end_slope)
    """
    length_mm = 0.0
    start_slope = SlopeInfo(has_slope=False)
    end_slope = SlopeInfo(has_slope=False)
    
    # Try CutPieceExtractor first (most accurate)
    if extractor:
        try:
            cut_piece = extractor.extract_cut_piece(element)
            if cut_piece:
                length_mm = cut_piece.length
                
                # Extract start slope
                if cut_piece.end_cuts.get("start"):
                    start_cut = cut_piece.end_cuts["start"]
                    start_slope = create_slope_info(
                        start_cut.angle_deg,
                        start_cut.confidence
                    )
                
                # Extract end slope
                if cut_piece.end_cuts.get("end"):
                    end_cut = cut_piece.end_cuts["end"]
                    end_slope = create_slope_info(
                        end_cut.angle_deg,
                        end_cut.confidence
                    )
                
                log_func(f"[PART_EXTRACTOR] CutPiece: length={length_mm:.1f}mm, "
                        f"start_slope={start_slope.has_slope}, end_slope={end_slope.has_slope}")
                return length_mm, start_slope, end_slope
        except Exception as e:
            log_func(f"[PART_EXTRACTOR] CutPieceExtractor failed: {e}")
    
    # Fallback: Try property sets
    if length_mm <= 0:
        length_mm = extract_length_from_properties(element, log_func)
    
    # Fallback: Try geometry
    if length_mm <= 0:
        length_mm = extract_length_from_geometry(element, log_func)
    
    # Last resort: Estimate from weight
    if length_mm <= 0:
        length_mm = estimate_length_from_weight(element, log_func)
    
    return length_mm, start_slope, end_slope


def extract_length_from_properties(element: Any, log_func: callable) -> float:
    """
    Extract length from IFC property sets.
    
    Checks for: Length, length, L, l, NominalLength, LengthValue
    
    Args:
        element: IFC element
        log_func: Logging function
    
    Returns:
        Length in millimeters, or 0.0 if not found
    """
    try:
        import ifcopenshell.util.element
        psets = ifcopenshell.util.element.get_psets(element)
        
        for pset_name, props in psets.items():
            for key in ["Length", "length", "L", "l", "NominalLength", "LengthValue"]:
                if key in props:
                    length_val = props[key]
                    if isinstance(length_val, (int, float)):
                        # Check if it's already in mm (if > 100, assume mm, else assume m)
                        if length_val > 100:
                            return float(length_val)
                        else:
                            return float(length_val) * 1000.0  # Convert m to mm
        
    except Exception as e:
        log_func(f"[PART_EXTRACTOR] Error extracting length from properties: {e}")
    
    return 0.0


def extract_length_from_geometry(element: Any, log_func: callable) -> float:
    """
    Extract length from IFC geometry bounding box.
    
    Args:
        element: IFC element
        log_func: Logging function
    
    Returns:
        Length in millimeters, or 0.0 if extraction fails
    """
    try:
        import ifcopenshell.geom
        import numpy as np
        
        settings = ifcopenshell.geom.settings()
        settings.set(settings.USE_WORLD_COORDS, True)
        shape = ifcopenshell.geom.create_shape(settings, element)
        
        if shape and shape.geometry:
            verts = shape.geometry.verts
            if len(verts) >= 3:
                vertices = np.array(verts).reshape(-1, 3)
                bbox_min = vertices.min(axis=0)
                bbox_max = vertices.max(axis=0)
                dimensions = bbox_max - bbox_min
                # For linear elements, the length is typically the largest dimension
                length_m = float(np.max(dimensions))
                return length_m * 1000.0  # Convert to mm
    
    except ImportError:
        log_func("[PART_EXTRACTOR] NumPy not available, skipping geometry-based length")
    except Exception as e:
        log_func(f"[PART_EXTRACTOR] Error extracting length from geometry: {e}")
    
    return 0.0


def estimate_length_from_weight(element: Any, log_func: callable) -> float:
    """
    Estimate length from element weight (last resort).
    
    Uses rough estimate: 75 kg/m for steel profiles
    
    Args:
        element: IFC element
        log_func: Logging function
    
    Returns:
        Estimated length in millimeters, or 1000.0 (1m) as default
    """
    try:
        # Try to get weight from properties
        import ifcopenshell.util.element
        psets = ifcopenshell.util.element.get_psets(element)
        
        for pset_name, props in psets.items():
            for key in ["Weight", "weight", "Mass", "mass", "NetWeight"]:
                if key in props:
                    weight = props[key]
                    if isinstance(weight, (int, float)) and weight > 0:
                        # Use 75 kg/m as average for steel profiles
                        length_m = weight / 75.0
                        log_func(f"[PART_EXTRACTOR] Estimated length from weight: {weight}kg -> {length_m:.2f}m")
                        return length_m * 1000.0
    
    except Exception as e:
        log_func(f"[PART_EXTRACTOR] Error estimating length from weight: {e}")
    
    # Default fallback
    return 1000.0


def extract_reference(element: Any) -> Optional[str]:
    """
    Extract reference from IFC element.
    
    Checks ONLY: Reference property, Tag attribute (NOT Name - that's element_name)
    
    Args:
        element: IFC element
    
    Returns:
        Reference string, or None if not found
    """
    # Try Reference from property sets
    try:
        import ifcopenshell.util.element
        psets = ifcopenshell.util.element.get_psets(element)
        
        for pset_name, props in psets.items():
            if 'Reference' in props:
                ref_value = props['Reference']
                if ref_value and str(ref_value).strip() and str(ref_value).upper() not in ['NONE', 'NULL', 'N/A', '']:
                    return str(ref_value).strip()
    except:
        pass
    
    # Try Tag attribute
    if hasattr(element, 'Tag') and element.Tag:
        tag = str(element.Tag).strip()
        if tag and tag.upper() not in ['NONE', 'NULL', 'N/A', '']:
            return tag
    
    # Don't fall back to Name - that's handled separately as element_name
    return None


def extract_assembly_info(element: Any) -> Tuple[Optional[str], Optional[int]]:
    """
    Extract assembly mark and assembly ID from IFC element.
    
    Returns: (assembly_mark, assembly_id)
    - assembly_mark: The mark/name of the assembly (e.g., "B1")
    - assembly_id: The IFC object ID of the specific assembly instance (None if not found)
    
    Args:
        element: IFC element
    
    Returns:
        Tuple of (assembly_mark, assembly_id)
    """
    assembly_mark = None
    assembly_id = None
    
    # Check if element is part of an assembly via IfcRelAggregates
    try:
        if hasattr(element, 'Decomposes'):
            for rel in element.Decomposes or []:
                if rel.is_a('IfcRelAggregates'):
                    assembly = rel.RelatingObject
                    if assembly:
                        assembly_id = assembly.id()
                        
                        # Get assembly mark from Tag
                        if hasattr(assembly, 'Tag') and assembly.Tag:
                            tag = str(assembly.Tag).strip()
                            if tag and tag.upper() not in ['NONE', 'NULL', '']:
                                assembly_mark = tag
                                return assembly_mark, assembly_id
                        
                        # Try Name
                        if hasattr(assembly, 'Name') and assembly.Name:
                            name = str(assembly.Name).strip()
                            if name and name.upper() not in ['NONE', 'NULL', '']:
                                assembly_mark = name
                                return assembly_mark, assembly_id
    except:
        pass
    
    # Fallback: Check property sets for AssemblyMark
    try:
        import ifcopenshell.util.element
        psets = ifcopenshell.util.element.get_psets(element)
        
        for pset_name, props in psets.items():
            for key in ['AssemblyMark', 'Assembly', 'Mark', 'PartMark']:
                if key in props:
                    mark = props[key]
                    if mark and str(mark).strip() and str(mark).upper() not in ['NONE', 'NULL', 'N/A', '']:
                        assembly_mark = str(mark).strip()
                        return assembly_mark, assembly_id
    except:
        pass
    
    return assembly_mark, assembly_id


def extract_parts_from_ifc(
    ifc_file: Any,
    selected_profiles: List[str],
    extractor: Optional[Any] = None,
    log_func: Optional[callable] = None
) -> Dict[str, List[Part]]:
    """
    Extract all parts from an IFC file for selected profiles.
    
    Args:
        ifc_file: Opened IFC file
        selected_profiles: List of profile names to extract
        extractor: Optional CutPieceExtractor for slope detection
        log_func: Optional logging function
    
    Returns:
        Dictionary mapping profile_name -> list of Part objects
    """
    if log_func is None:
        log_func = logger.info
    
    from .profile_utils import extract_base_profile_name
    
    # Import get_profile_name from main.py (temporary - will be refactored later)
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(__file__))
        from main import get_profile_name
    except:
        log_func("[PART_EXTRACTOR] Warning: Could not import get_profile_name, using fallback")
        def get_profile_name(element):
            if hasattr(element, 'Description') and element.Description:
                return str(element.Description).strip()
            return "Unknown"
    
    parts_by_profile: Dict[str, List[Part]] = {}
    
    for element in ifc_file.by_type("IfcProduct"):
        element_type = element.is_a()
        
        # Only process steel elements
        if element_type not in {"IfcBeam", "IfcColumn", "IfcMember"}:
            continue
        
        # Get and normalize profile name
        profile_name_from_element = get_profile_name(element)
        base_profile_name = extract_base_profile_name(profile_name_from_element)
        
        # Skip if not in selected profiles
        if base_profile_name not in selected_profiles:
            continue
        
        # Extract part
        part = extract_part_from_ifc_element(
            element,
            extractor,
            base_profile_name,
            log_func
        )
        
        if part:
            if base_profile_name not in parts_by_profile:
                parts_by_profile[base_profile_name] = []
            parts_by_profile[base_profile_name].append(part)
    
    # Log summary
    for profile_name, parts in parts_by_profile.items():
        log_func(f"[PART_EXTRACTOR] Extracted {len(parts)} parts for profile {profile_name}")
    
    return parts_by_profile

