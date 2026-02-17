"""
Profile name extraction and normalization utilities.

This module handles extracting profile names from IFC elements
and normalizing them for consistent nesting across element types.
"""

from typing import Optional
import re


# Common profile prefixes to recognize
PROFILE_PREFIXES = [
    'IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UPE', 'L', 'PL', 
    'RHS', 'CHS', 'SHS', 'W', 'C', 'T', 'HP', 'UC', 'UB'
]


def extract_base_profile_name(profile_key: str) -> str:
    """
    Extract base profile name, removing element_type prefix if present.
    
    This function normalizes profile names by removing type prefixes,
    allowing parts with the same profile but different types (beam/column/member)
    to be nested together.
    
    Examples:
        - "beam_IPE100" -> "IPE100"
        - "column_IPE100" -> "IPE100"
        - "IfcBeam_IPE100" -> "IPE100"
        - "IPE100" -> "IPE100"
    
    Args:
        profile_key: Profile name, possibly with element type prefix
    
    Returns:
        Base profile name without prefix
    """
    if not profile_key:
        return profile_key
    
    # Check for lowercase prefixes: "beam_", "column_", "member_"
    for prefix in ["beam_", "column_", "member_"]:
        if profile_key.startswith(prefix):
            return profile_key[len(prefix):]
    
    # Check for IFC type prefixes: "IfcBeam_", "IfcColumn_", "IfcMember_"
    for prefix in ["IfcBeam_", "IfcColumn_", "IfcMember_"]:
        if profile_key.startswith(prefix):
            return profile_key[len(prefix):]
    
    # No prefix found, return as-is
    return profile_key


def is_valid_profile_name(profile_name: str) -> bool:
    """
    Check if a string looks like a valid profile name.
    
    Valid profile names typically:
    - Start with letters
    - Contain numbers
    - Are relatively short (< 30 chars)
    - Match common profile prefixes
    
    Args:
        profile_name: String to validate
    
    Returns:
        True if it looks like a profile name, False otherwise
    """
    if not profile_name or len(profile_name) > 30:
        return False
    
    # Must start with a letter
    if not profile_name[0].isalpha():
        return False
    
    # Check for common profile prefixes
    upper_name = profile_name.upper()
    if any(upper_name.startswith(prefix) for prefix in PROFILE_PREFIXES):
        return True
    
    # Or if it's a short alphanumeric string (likely a profile name)
    if len(profile_name) <= 20 and profile_name[0].isalpha():
        # Should contain at least one number (most profiles do)
        if any(c.isdigit() for c in profile_name):
            return True
    
    return False


def normalize_profile_name(profile_name: str) -> str:
    """
    Normalize a profile name for consistent comparison.
    
    - Removes whitespace
    - Removes element type prefixes
    - Converts to uppercase
    
    Args:
        profile_name: Raw profile name
    
    Returns:
        Normalized profile name
    """
    if not profile_name:
        return ""
    
    # Remove whitespace
    normalized = profile_name.strip()
    
    # Remove element type prefix (before uppercasing, as prefixes are lowercase)
    normalized = extract_base_profile_name(normalized)
    
    # Convert to uppercase
    normalized = normalized.upper()
    
    return normalized


def parse_profile_dimensions(profile_name: str) -> Optional[dict]:
    """
    Parse dimensions from a profile name if possible.
    
    Examples:
        - "IPE200" -> {"series": "IPE", "height": 200}
        - "HEA300" -> {"series": "HEA", "height": 300}
        - "RHS100X50X5" -> {"series": "RHS", "width": 100, "height": 50, "thickness": 5}
    
    Args:
        profile_name: Profile name to parse
    
    Returns:
        Dictionary with parsed dimensions, or None if parsing fails
    """
    if not profile_name:
        return None
    
    upper_name = profile_name.upper().strip()
    
    # Try to match rectangular hollow sections (RHS, SHS) FIRST
    # Pattern: RHS100X50X5 or SHS100X100X5
    match = re.match(r'(RHS|SHS)(\d+)[Xx](\d+)[Xx](\d+)', upper_name)
    if match:
        series, dim1, dim2, thickness = match.groups()
        return {
            "series": series,
            "width": int(dim1),
            "height": int(dim2),
            "thickness": int(thickness)
        }
    
    # Try to match circular hollow sections (CHS)
    match = re.match(r'CHS(\d+)[Xx](\d+)', upper_name)
    if match:
        diameter, thickness = match.groups()
        return {
            "series": "CHS",
            "diameter": int(diameter),
            "thickness": int(thickness)
        }
    
    # Try to match I-profiles (IPE, HEA, HEB, etc.) - LAST as it's most generic
    match = re.match(r'([A-Z]+)(\d+)', upper_name)
    if match:
        series, height = match.groups()
        return {
            "series": series,
            "height": int(height)
        }
    
    return None


def group_profiles_by_base_name(profile_list: list[str]) -> dict[str, list[str]]:
    """
    Group profile names by their base name (without element type prefix).
    
    This is useful for merging parts with the same profile but different
    element types (beam/column/member) into a single nesting group.
    
    Args:
        profile_list: List of profile names (possibly with prefixes)
    
    Returns:
        Dictionary mapping base_name -> list of original names
    """
    grouped = {}
    
    for profile in profile_list:
        base_name = extract_base_profile_name(profile)
        if base_name not in grouped:
            grouped[base_name] = []
        grouped[base_name].append(profile)
    
    return grouped


def format_profile_name_for_display(profile_name: str) -> str:
    """
    Format a profile name for user-friendly display.
    
    - Normalizes the name
    - Adds spacing for readability if needed
    
    Args:
        profile_name: Raw profile name
    
    Returns:
        Formatted profile name
    """
    if not profile_name:
        return "Unknown Profile"
    
    # Normalize first
    normalized = normalize_profile_name(profile_name)
    
    # Try to add space between letters and numbers for readability
    # e.g., "IPE200" -> "IPE 200"
    match = re.match(r'([A-Z]+)(\d+.*)', normalized)
    if match:
        series, dimensions = match.groups()
        return f"{series} {dimensions}"
    
    return normalized

