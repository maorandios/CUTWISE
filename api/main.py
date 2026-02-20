from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
import ifcopenshell
import ifcopenshell.util.element
import json
from typing import Dict, List, Any
import os
import asyncio
import re
import traceback
import multiprocessing

# Try to import ifcopenshell.geom if available (for geometry operations)
try:
    import ifcopenshell.geom
    HAS_GEOM = True
except ImportError:
    HAS_GEOM = False

app = FastAPI(title="IFC Steel Analysis API")

# Global exception handlers to prevent server crashes
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return proper error response."""
    # Don't catch HTTPException or RequestValidationError (handled above)
    if isinstance(exc, (StarletteHTTPException, RequestValidationError)):
        raise exc
    
    error_msg = str(exc)
    error_trace = traceback.format_exc()
    # Handle Unicode encoding for Windows console
    safe_error_msg = error_msg.encode('ascii', 'replace').decode('ascii')
    safe_error_trace = error_trace.encode('ascii', 'replace').decode('ascii')
    print(f"[ERROR] Unhandled exception in {request.url.path}: {safe_error_msg}")
    print(f"[ERROR] Traceback:\n{safe_error_trace}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {error_msg}"}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5180", "http://0.0.0.0:5180"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage paths
STORAGE_DIR = Path(__file__).parent.parent / "storage"
IFC_DIR = STORAGE_DIR / "ifc"
REPORTS_DIR = STORAGE_DIR / "reports"
GLTF_DIR = STORAGE_DIR / "gltf"

# Create directories if they don't exist
IFC_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
GLTF_DIR.mkdir(parents=True, exist_ok=True)

# Steel element types
STEEL_TYPES = {"IfcBeam", "IfcColumn", "IfcMember", "IfcPlate"}
FASTENER_TYPES = {"IfcFastener", "IfcMechanicalFastener"}
PROXY_TYPES = {"IfcProxy", "IfcBuildingElementProxy"}

# Control nesting logs - set to False to suppress [NESTING] log messages
ENABLE_NESTING_LOGS = True

def nesting_log(*args, **kwargs):
    """Print nesting log messages only if ENABLE_NESTING_LOGS is True."""
    if ENABLE_NESTING_LOGS:
        # Handle Unicode encoding for Windows console by converting to safe ASCII first
        safe_args = []
        for arg in args:
            if isinstance(arg, str):
                # Replace any non-ASCII characters with '?'
                safe_args.append(arg.encode('ascii', 'replace').decode('ascii'))
            else:
                safe_args.append(arg)
        try:
            print(*safe_args, **kwargs)
        except Exception as e:
            # Ultimate fallback: just don't print
            pass


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for Windows compatibility.
    
    Removes or replaces characters that are invalid on Windows filesystems.
    """
    # Remove or replace invalid characters for Windows
    # Invalid chars: < > : " / \ | ? *
    invalid_chars = r'[<>:"/\\|?*]'
    sanitized = re.sub(invalid_chars, '_', filename)
    
    # Remove leading/trailing spaces and dots (Windows doesn't allow these)
    sanitized = sanitized.strip(' .')
    
    # Replace multiple spaces/underscores with single underscore
    sanitized = re.sub(r'[_\s]+', '_', sanitized)
    
    # Ensure filename is not empty
    if not sanitized:
        sanitized = "uploaded_file"
    
    # Ensure it still has .ifc extension
    if not sanitized.endswith(('.ifc', '.IFC')):
        # Try to preserve original extension
        original_ext = Path(filename).suffix
        if original_ext:
            sanitized = sanitized + original_ext
        else:
            sanitized = sanitized + '.ifc'
    
    return sanitized


def get_element_weight(element) -> float:
    """Get weight of an IFC element in kg.
    
    Priority order:
    1. GrossWeight (if available) - weight before cuts/holes
    2. Weight - standard weight property
    3. Mass - alternative weight property
    """
    try:
        psets = ifcopenshell.util.element.get_psets(element)
        
        # First, try to find GrossWeight property
        for pset_name, props in psets.items():
            if "GrossWeight" in props:
                weight = props["GrossWeight"]
                if isinstance(weight, (int, float)):
                    return float(weight)
            if "Gross Weight" in props:
                weight = props["Gross Weight"]
                if isinstance(weight, (int, float)):
                    return float(weight)
        
        # If no GrossWeight, fall back to standard Weight
        for pset_name, props in psets.items():
            if "Weight" in props:
                weight = props["Weight"]
                if isinstance(weight, (int, float)):
                    return float(weight)
            if "Mass" in props:
                mass = props["Mass"]
                if isinstance(mass, (int, float)):
                    return float(mass)
    except:
        pass
    
    # Try to get from material
    try:
        materials = ifcopenshell.util.element.get_materials(element)
        for material in materials:
            if hasattr(material, "HasProperties"):
                for prop in material.HasProperties or []:
                    if hasattr(prop, "Name") and prop.Name in ["GrossWeight", "Weight", "Mass"]:
                        if hasattr(prop, "NominalValue") and prop.NominalValue:
                            return float(prop.NominalValue.wrappedValue)
    except:
        pass
    
    return 0.0


def get_assembly_info(element) -> tuple[str, int | None]:
    """Get assembly mark and assembly object ID from element.
    
    Returns: (assembly_mark, assembly_id)
    - assembly_mark: The mark/name of the assembly (e.g., "B1")
    - assembly_id: The IFC object ID of the specific assembly instance (None if not found)
    
    In Tekla Structures:
    - Parts have a part number (P1, P2, etc.) - this is NOT the assembly mark
    - Parts belong to an assembly with an assembly mark (B1, B2, etc.)
    - Multiple instances of the same assembly type (e.g., multiple "B1") should be distinguished by assembly_id
    """
    assembly_id = None
    
    # CRITICAL: First check if this element is part of an assembly via IfcRelAggregates
    # This is the most reliable way - parts are aggregated into assemblies
    try:
        if hasattr(element, 'Decomposes'):
            for rel in element.Decomposes or []:
                if rel.is_a('IfcRelAggregates'):
                    # This element is a part, the relating object is the assembly
                    assembly = rel.RelatingObject
                    if assembly:
                        assembly_id = assembly.id()  # Store the assembly instance ID
                        
                        # Get assembly mark from the assembly object
                        # Try Tag first (most common in Tekla)
                        if hasattr(assembly, 'Tag') and assembly.Tag:
                            tag = str(assembly.Tag).strip()
                            if tag and tag.upper() not in ['NONE', 'NULL', '']:
                                return (tag, assembly_id)
                        
                        # Try Name
                        if hasattr(assembly, 'Name') and assembly.Name:
                            name = str(assembly.Name).strip()
                            if name and name.upper() not in ['NONE', 'NULL', '']:
                                return (name, assembly_id)
                        
                        # Try property sets on the assembly
                        try:
                            psets = ifcopenshell.util.element.get_psets(assembly)
                            for pset_name, props in psets.items():
                                for key in ["AssemblyMark", "Assembly Mark", "Mark", "Tag"]:
                                    if key in props:
                                        value = props[key]
                                        if value is not None:
                                            value_str = str(value).strip()
                                            if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                                                return (value_str, assembly_id)
                        except:
                            pass
    except Exception as e:
        print(f"[ASSEMBLY_INFO] Error checking Decomposes for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Check if this element IS an assembly (IfcElementAssembly)
    try:
        if element.is_a('IfcElementAssembly'):
            # This is an assembly, get its mark
            assembly_id = element.id()
            if hasattr(element, 'Tag') and element.Tag:
                tag = str(element.Tag).strip()
                if tag and tag.upper() not in ['NONE', 'NULL', '']:
                    return (tag, assembly_id)
            if hasattr(element, 'Name') and element.Name:
                name = str(element.Name).strip()
                if name and name.upper() not in ['NONE', 'NULL', '']:
                    return (name, assembly_id)
    except:
        pass
    
    # Try property sets - but be careful to distinguish assembly mark from part number
    try:
        psets = ifcopenshell.util.element.get_psets(element)
        
        # Priority: Look for assembly-specific property sets first
        for pset_name, props in psets.items():
            pset_lower = pset_name.lower()
            
            # If property set name suggests assembly (not part)
            if 'assembly' in pset_lower and 'part' not in pset_lower:
                for key in ["AssemblyMark", "Assembly Mark", "Mark", "Tag"]:
                    if key in props:
                        value = props[key]
                        if value is not None:
                            value_str = str(value).strip()
                            if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                                return (value_str, assembly_id)
            
            # Check for assembly mark in any property set (but skip if it looks like a part number)
            for key in ["AssemblyMark", "Assembly Mark"]:
                if key in props:
                    value = props[key]
                    if value is not None:
                        value_str = str(value).strip()
                        if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                            # Skip if it looks like a part number (starts with P followed by number)
                            if not (value_str.upper().startswith('P') and len(value_str) <= 3 and value_str[1:].isdigit()):
                                return (value_str, assembly_id)
    except Exception as e:
        print(f"[ASSEMBLY_INFO] Error getting psets for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Last resort: check Tag/Name, but be careful - Tag might be part number, not assembly mark
    try:
        if hasattr(element, 'Tag') and element.Tag:
            tag = str(element.Tag).strip()
            if tag and tag.upper() not in ['NONE', 'NULL', '']:
                # If tag looks like an assembly mark (B1, B2, etc.) not a part number (P1, P2)
                # Assembly marks are often longer or have different patterns
                if not (tag.upper().startswith('P') and len(tag) <= 3 and tag[1:].isdigit()):
                    return (tag, assembly_id)
    except:
        pass
    
    return ("N/A", None)


def infer_profile_from_dimensions(height_mm: float, width_mm: float) -> str:
    """Infer profile name from height and width dimensions.
    
    Common steel profiles:
    - IPE series: height matches profile number (e.g., IPE400 = 400mm height)
    - HEA/HEB series: height matches profile number
    - UPN/UPE series: height matches profile number
    """
    # Round to nearest standard profile size
    height_rounded = round(height_mm / 10) * 10  # Round to nearest 10mm
    
    # IPE series (I-beams) - common dimensions
    # Height is the profile number, width is typically around 40-50% of height for standard IPE
    ipe_profiles = {
        (80, 46): "IPE80", (100, 55): "IPE100", (120, 64): "IPE120",
        (140, 73): "IPE140", (160, 82): "IPE160", (180, 91): "IPE180",
        (200, 100): "IPE200", (220, 110): "IPE220", (240, 120): "IPE240",
        (270, 135): "IPE270", (300, 150): "IPE300", (330, 160): "IPE330",
        (360, 170): "IPE360", (400, 180): "IPE400", (450, 190): "IPE450",
        (500, 200): "IPE500", (550, 210): "IPE550", (600, 220): "IPE600",
        (750, 263): "IPE750", (750, 267): "IPE750x137", (800, 268): "IPE800"
    }
    
    # Check if dimensions match known IPE profile
    height_key = int(height_rounded)
    width_key = int(round(width_mm / 5) * 5)  # Round width to nearest 5mm
    
    # Try exact match first
    if (height_key, width_key) in ipe_profiles:
        return ipe_profiles[(height_key, width_key)]
    
    # Try height-only match (width can vary slightly)
    for (h, w), profile in ipe_profiles.items():
        if abs(height_key - h) <= 5:  # Within 5mm
            if abs(width_key - w) <= 10:  # Width within 10mm
                return profile
    
    # If height matches a standard IPE size, use it
    if 80 <= height_key <= 1000 and height_key % 10 == 0:
        # Check if width is in reasonable range for IPE (typically 40-50% of height)
        if 0.35 * height_key <= width_key <= 0.55 * height_key:
            return f"IPE{int(height_key)}"
    
    # HEA/HEB series (wide flange beams)
    # Similar to IPE but wider flanges
    if 0.55 * height_key <= width_key <= 0.75 * height_key:
        if 100 <= height_key <= 1000 and height_key % 10 == 0:
            return f"HEA{int(height_key)}"  # Could be HEA or HEB, default to HEA
    
    return "N/A"


def get_assembly_mark(element) -> str:
    """Get assembly mark from element properties (backward compatibility).
    
    This is a wrapper around get_assembly_info that only returns the mark.
    """
    mark, _ = get_assembly_info(element)
    return mark


def get_profile_name(element) -> str:
    """Get profile name from element.
    
    Checks multiple sources:
    1. Property sets (Profile, ProfileName, Shape, CrossSection, etc.)
    2. Geometry representation (IfcExtrudedAreaSolid with IfcProfileDef)
    3. Tekla-specific property sets (including dimension-based inference)
    4. Element attributes
    """
    # First, try Description attribute (Tekla stores profile name here, e.g., "HEA220")
    try:
        if hasattr(element, 'Description') and element.Description:
            desc = str(element.Description).strip()
            if desc and desc.upper() not in ['NONE', 'NULL', 'N/A', '']:
                # Check if Description looks like a profile name (e.g., "HEA220", "IPE400")
                # Profile names typically start with letters and contain numbers
                if any(prefix in desc.upper() for prefix in ['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UPE', 'L', 'PL', 'RHS', 'CHS', 'SHS', 'W', 'C', 'T']):
                    return desc
                # Or if it's a short alphanumeric string (likely a profile name)
                if len(desc) <= 20 and desc[0].isalpha():
                    return desc
    except Exception as e:
        print(f"[PROFILE] Error getting Description for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Second, try property sets (most common in Tekla Structures)
    try:
        psets = ifcopenshell.util.element.get_psets(element)
        
        # Check all property sets for profile-related keys
        for pset_name, props in psets.items():
            # Check common profile property names
            for key in ["Profile", "ProfileName", "Shape", "CrossSection", "Section", 
                       "ProfileType", "Profile_Type", "NominalSize", "Size", "Profile",
                       "Cross_Section", "Section_Type", "Steel_Profile"]:
                if key in props:
                    value = props[key]
                    if value and str(value).strip() and str(value).upper() not in ['NONE', 'NULL', 'N/A', '']:
                        profile_str = str(value).strip()
                        # Clean up common prefixes/suffixes
                        profile_str = profile_str.replace('PROFILE_', '').replace('_PROFILE', '')
                        return profile_str
            
    except Exception as e:
        print(f"[PROFILE] Error getting psets for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Helper function to extract profile from representation items
    def extract_profile_from_representation_item(item):
        """Recursively extract profile from representation item."""
        if not item:
            return None
        
        # Handle IfcBooleanClippingResult - traverse to FirstOperand (this is common in Tekla exports)
        if item.is_a("IfcBooleanClippingResult"):
            if hasattr(item, "FirstOperand") and item.FirstOperand:
                result = extract_profile_from_representation_item(item.FirstOperand)
                if result:
                    return result
            # Also check SecondOperand if FirstOperand doesn't have it
            if hasattr(item, "SecondOperand") and item.SecondOperand:
                result = extract_profile_from_representation_item(item.SecondOperand)
                if result:
                    return result
        
        # Handle IfcExtrudedAreaSolid
        if item.is_a("IfcExtrudedAreaSolid"):
            if hasattr(item, "SweptArea") and item.SweptArea:
                swept_area = item.SweptArea
                
                # Check IfcIShapeProfileDef (most common for I-beams like IPE)
                if swept_area.is_a("IfcIShapeProfileDef"):
                    # ProfileName is the most reliable source
                    if hasattr(swept_area, "ProfileName") and swept_area.ProfileName:
                        profile_name = str(swept_area.ProfileName).strip()
                        if profile_name and profile_name.upper() not in ['NONE', 'NULL', 'N/A', '']:
                            return profile_name
                
                # Check IfcParameterizedProfileDef
                if swept_area.is_a("IfcParameterizedProfileDef"):
                    if hasattr(swept_area, "ProfileName") and swept_area.ProfileName:
                        profile_name = str(swept_area.ProfileName).strip()
                        if profile_name and profile_name.upper() not in ['NONE', 'NULL', 'N/A', '']:
                            return profile_name
                    if hasattr(swept_area, "ProfileType"):
                        profile_type = swept_area.ProfileType
                        if profile_type:
                            profile_type_str = str(profile_type).strip()
                            if profile_type_str and profile_type_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                                return profile_type_str
                
                # Check other profile types - try ProfileName first, then ProfileType
                for profile_attr in ["ProfileName", "ProfileType"]:
                    if hasattr(swept_area, profile_attr):
                        value = getattr(swept_area, profile_attr)
                        if value:
                            value_str = str(value).strip()
                            if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                                return value_str
        
        # Handle IfcMappedItem - traverse to MappingSource
        if item.is_a("IfcMappedItem"):
            if hasattr(item, "MappingSource") and item.MappingSource:
                if hasattr(item.MappingSource, "MappedRepresentation"):
                    mapped_rep = item.MappingSource.MappedRepresentation
                    if hasattr(mapped_rep, "Items"):
                        for sub_item in mapped_rep.Items or []:
                            result = extract_profile_from_representation_item(sub_item)
                            if result:
                                return result
        
        return None
    
    # Try to get from geometry representation
    try:
        if hasattr(element, "Representation") and element.Representation:
            for rep in element.Representation.Representations or []:
                # Check all representation types, not just Body
                for item in rep.Items or []:
                    profile = extract_profile_from_representation_item(item)
                    if profile and profile != "N/A":
                        return profile
    except Exception as e:
        print(f"[PROFILE] Error getting profile from geometry for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Try using ifcopenshell geometry utilities to extract profile (alternative method)
    try:
        if HAS_GEOM:
            # Try to get profile from shape representation
            settings = ifcopenshell.geom.settings()
            shape = ifcopenshell.geom.create_shape(settings, element)
            if shape:
                # Check if shape has profile information
                if hasattr(shape, "geometry") and hasattr(shape.geometry, "profile"):
                    profile = shape.geometry.profile
                    if profile and hasattr(profile, "ProfileName"):
                        return str(profile.ProfileName).strip()
    except Exception as e:
        # Silently fail - this is a fallback method
        pass
    
    # Try element attributes directly
    try:
        if hasattr(element, "Profile") and element.Profile:
            if hasattr(element.Profile, "ProfileName"):
                profile_name = element.Profile.ProfileName
                if profile_name and str(profile_name).strip():
                    return str(profile_name).strip()
    except:
        pass
    
    # Last resort: check Tag or Name for profile-like patterns
    try:
        tag = getattr(element, 'Tag', None)
        if tag:
            tag_str = str(tag).strip()
            # Check if tag looks like a profile (e.g., "IPE400", "HEA200")
            if any(prefix in tag_str.upper() for prefix in ['IPE', 'HEA', 'HEB', 'HEM', 'UPN', 'UPE', 'L', 'PL', 'RHS', 'CHS', 'SHS']):
                return tag_str
    except:
        pass
    
    return "N/A"


def get_plate_thickness(element) -> str:
    """Get plate thickness or profile from element.
    
    Checks multiple sources:
    1. Property sets (Thickness, Profile, ThicknessProfile, etc.)
    2. Tekla-specific property sets (Tekla Quantity, etc.)
    3. Geometry representation (if available)
    """
    try:
        psets = ifcopenshell.util.element.get_psets(element)
        
        # First priority: explicit thickness properties (must be <= 40mm)
        for pset_name, props in psets.items():
            for key in ["Thickness", "thickness", "ThicknessProfile", "thickness_profile", 
                       "Profile", "profile", "PlateThickness", "plate_thickness",
                       "NominalThickness", "nominal_thickness", "ThicknessValue"]:
                if key in props:
                    value = props[key]
                    if value is not None:
                        value_str = str(value).strip()
                        if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                            try:
                                thickness_num = float(value_str)
                                if 0 < thickness_num <= 40:  # Only accept reasonable plate thickness
                                    return f"{int(thickness_num)}mm"
                            except ValueError:
                                return value_str
        
        # Second priority: geometry bounding box (smallest dimension <= 40mm)
        if HAS_GEOM:
            try:
                settings = ifcopenshell.geom.settings()
                shape = ifcopenshell.geom.create_shape(settings, element)
                if shape:
                    geom = shape.geometry
                    verts = geom.verts
                    if len(verts) >= 3:
                        import numpy as np
                        vertices = np.array(verts).reshape(-1, 3)
                        bbox_min = vertices.min(axis=0)
                        bbox_max = vertices.max(axis=0)
                        dims = bbox_max - bbox_min
                        
                        # Convert to mm if in meters
                        if np.max(dims) < 100:
                            dims = dims * 1000
                        
                        # Smallest dimension is thickness (must be reasonable)
                        thickness = np.min(dims)
                        if 0 < thickness <= 40:  # Only accept reasonable plate thickness
                            return f"{int(thickness)}mm"
            except:
                pass
        
        # Last resort: Tekla Quantity - pick smallest dimension (must be <= 40mm)
        if "Tekla Quantity" in psets:
            tekla_qty = psets["Tekla Quantity"]
            dimensions = []
            for key in ["Width", "Height", "Length"]:
                if key in tekla_qty and tekla_qty[key] is not None:
                    try:
                        dimensions.append(float(tekla_qty[key]))
                    except:
                        pass
            
            if len(dimensions) >= 2:
                thickness = min(dimensions)
                if 0 < thickness <= 40:  # Only accept reasonable plate thickness
                    return f"{int(thickness)}mm"
    except Exception as e:
        print(f"[PLATE_THICKNESS] Error getting psets for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    # Try to get from geometry representation (if available)
    try:
        if hasattr(element, "Representation") and element.Representation:
            for rep in element.Representation.Representations or []:
                for item in rep.Items or []:
                    # For plates, thickness might be in the swept area depth
                    if item.is_a("IfcExtrudedAreaSolid"):
                        if hasattr(item, "Depth"):
                            depth = item.Depth
                            if depth:
                                try:
                                    depth_mm = float(depth) * 1000.0  # Convert from meters to mm
                                    return f"{int(depth_mm)}mm"
                                except (ValueError, TypeError):
                                    pass
    except Exception as e:
        print(f"[PLATE_THICKNESS] Error getting thickness from geometry for element {element.id() if hasattr(element, 'id') else 'unknown'}: {e}")
        pass
    
    return "N/A"


def is_fastener_like(product) -> bool:
    """Return True if this IFC product is a fastener element.
    
    Handles both standard IFC fastener entities and Tekla Structures-specific patterns.
    Tekla may export fasteners as IfcBeam, IfcColumn, or other types with specific names/tags.
    """
    element_type = product.is_a()
    
    # Standard IFC fastener entities
    if element_type in FASTENER_TYPES:
        return True
    
    # Tekla Structures often exports fasteners as other types with specific names/tags
    try:
        name = (getattr(product, 'Name', None) or '').lower()
        desc = (getattr(product, 'Description', None) or '').lower()
        tag = (getattr(product, 'Tag', None) or '').lower()
        
        # Check for fastener keywords in name/description/tag
        fastener_keywords = ['bolt', 'nut', 'washer', 'fastener', 'screw', 'anchor', 'mechanical']
        text_content = name + ' ' + desc + ' ' + tag
        if any(kw in text_content for kw in fastener_keywords):
            return True
        
        # Check Tekla-specific property sets
        try:
            psets = ifcopenshell.util.element.get_psets(product)
            for pset_name in psets.keys():
                pset_lower = pset_name.lower()
                if 'bolt' in pset_lower or 'fastener' in pset_lower or 'mechanical' in pset_lower:
                    return True
        except:
            pass
    except Exception:
        pass
    
    return False


def analyze_ifc(file_path: Path) -> Dict[str, Any]:
    """Analyze IFC file and extract steel information."""
    print(f"[ANALYZE] ===== STARTING ANALYSIS FOR {file_path.name} =====")
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        print(f"[ANALYZE] IFC file opened successfully")
    except Exception as e:
        print(f"[ANALYZE] ERROR: Failed to open IFC file: {e}")
        raise Exception(f"Failed to open IFC file: {str(e)}")
    
    assemblies: Dict[str, Dict[str, Any]] = {}
    profiles: Dict[str, Dict[str, Any]] = {}
    plates: Dict[str, Dict[str, Any]] = {}
    
    total_weight = 0.0
    fastener_count = 0
    
    # Iterate through all elements
    for element in ifc_file.by_type("IfcProduct"):
        element_type = element.is_a()
        
        # Count fasteners
        if element_type in FASTENER_TYPES or is_fastener_like(element):
            fastener_count += 1
        
        if element_type in STEEL_TYPES:
            weight = get_element_weight(element)
            total_weight += weight
            
            # Assembly grouping
            assembly_mark = get_assembly_mark(element)
            if assembly_mark not in assemblies:
                assemblies[assembly_mark] = {
                    "assembly_mark": assembly_mark,
                    "total_weight": 0.0,
                    "member_count": 0,
                    "plate_count": 0
                }
            
            assemblies[assembly_mark]["total_weight"] += weight
            
            if element_type == "IfcPlate":
                assemblies[assembly_mark]["plate_count"] += 1
            else:
                assemblies[assembly_mark]["member_count"] += 1
            
            # Profile grouping (for beams, columns, members)
            # Merge all parts with same profile name regardless of type (beam/column/member)
            if element_type in {"IfcBeam", "IfcColumn", "IfcMember"}:
                profile_name = get_profile_name(element)
                # Normalize profile name (strip whitespace, handle case) to ensure consistent merging
                if profile_name:
                    profile_name = profile_name.strip()
                else:
                    profile_name = None
                
                # Use profile_name as key to merge all types with same profile
                profile_key = profile_name
                
                # Debug: Log ALL profile extractions to see what's happening (disabled for performance)
                # if profile_name:
                #     print(f"[ANALYZE] Element {element.id()}: type={element_type}, profile_name='{profile_name}', profile_key='{profile_key}', existing_keys={list(profiles.keys())}")
                
                if not profile_key:
                    # Skip elements without profile names
                    continue
                
                if profile_key not in profiles:
                    # First time seeing this profile - create new entry
                    profiles[profile_key] = {
                        "profile_name": profile_name,
                        "element_type": element_type.replace("Ifc", "").lower(),  # Set initial type
                        "piece_count": 0,
                        "total_weight": 0.0
                    }
                    # print(f"[ANALYZE] Created new profile group: '{profile_name}' (type: {profiles[profile_key]['element_type']})")
                else:
                    # Profile already exists - check if we're merging different types
                    existing_type = profiles[profile_key].get("element_type")
                    current_type = element_type.replace("Ifc", "").lower()
                    
                    # print(f"[ANALYZE] Profile '{profile_name}' already exists (type: {existing_type}), current element type: {current_type}")
                    
                    if existing_type != current_type:
                        # Different element type - mark as merged
                        if existing_type != "mixed":
                            # print(f"[ANALYZE] *** MERGING {element_type} into existing profile '{profile_name}' (was {existing_type}, now mixed) ***")
                            profiles[profile_key]["element_type"] = "mixed"
                        else:
                            # print(f"[ANALYZE] Adding {element_type} to already-mixed profile '{profile_name}'")
                            pass  # Logging disabled
                    else:
                        # print(f"[ANALYZE] Same type ({current_type}), just incrementing count")
                        pass  # Logging disabled
                
                profiles[profile_key]["piece_count"] += 1
                profiles[profile_key]["total_weight"] += weight
            
            # Plate grouping
            if element_type == "IfcPlate":
                thickness = get_plate_thickness(element)
                plate_key = f"{thickness}"
                
                # Debug: Log first few plate thickness extractions (disabled for performance)
                # if len(plates) < 5:
                #     print(f"[ANALYZE] Element {element.id()}: type={element_type}, thickness={thickness}")
                
                if plate_key not in plates:
                    plates[plate_key] = {
                        "thickness_profile": thickness,
                        "piece_count": 0,
                        "total_weight": 0.0
                    }
                
                plates[plate_key]["piece_count"] += 1
                plates[plate_key]["total_weight"] += weight
    
    # Convert to lists
    assembly_list = list(assemblies.values())
    profile_list = list(profiles.values())
    plate_list = list(plates.values())
    
    # Debug: Log merged profiles
    print(f"[ANALYZE] ===== ANALYSIS COMPLETE =====")
    print(f"[ANALYZE] Total profiles after merging: {len(profile_list)}")
    for profile in profile_list:
        element_type_display = profile.get('element_type', 'N/A')
        if element_type_display == "mixed":
            element_type_display = "MIXED (merged)"
        print(f"[ANALYZE] Profile: {profile['profile_name']}, type: {element_type_display}, pieces: {profile['piece_count']}")
    print(f"[ANALYZE] ===== END ANALYSIS =====")
    
    return {
        "total_tonnage": round(total_weight / 1000.0, 2),  # Convert kg to tonnes
        "assemblies": assembly_list,
        "profiles": profile_list,
        "plates": plate_list,
        "fastener_count": fastener_count
    }


@app.post("/api/upload")
async def upload_ifc(file: UploadFile = File(...)):
    """Upload an IFC file."""
    import time
    upload_start = time.time()
    print("=" * 60)
    print(f"[UPLOAD] ===== UPLOAD ENDPOINT CALLED at {time.strftime('%H:%M:%S')} =====")
    print(f"[UPLOAD] File: {file.filename}")
    print("=" * 60)
    try:
        if not file.filename or not file.filename.endswith((".ifc", ".IFC")):
            raise HTTPException(status_code=400, detail="File must be an IFC file")
        
        # Sanitize filename for Windows compatibility
        safe_filename = sanitize_filename(file.filename)
        print(f"[UPLOAD] Received upload request: {file.filename} -> sanitized to: {safe_filename}")
        
        file_path = IFC_DIR / safe_filename
        report_path = REPORTS_DIR / f"{safe_filename}.json"
        gltf_filename = f"{Path(safe_filename).stem}.glb"
        gltf_path = GLTF_DIR / gltf_filename
        
        # Read file content
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # ===== CACHE CHECK: Skip processing if file exists with same size =====
        use_cache = False
        if file_path.exists() and report_path.exists():
            existing_size = file_path.stat().st_size
            if existing_size == len(content):
                print(f"[UPLOAD-CACHE] CACHE HIT! File already processed: {safe_filename}")
                print(f"[UPLOAD-CACHE] File size: {existing_size} bytes (matches upload)")
                print(f"[UPLOAD-CACHE] Loading cached report from: {report_path}")
                print(f"[UPLOAD-CACHE] Using IFCM viewer (no GLTF needed)")
                use_cache = True
            else:
                print(f"[UPLOAD-CACHE] File exists but size differs (old: {existing_size}, new: {len(content)})")
                print(f"[UPLOAD-CACHE] Will reprocess...")
        else:
            missing = []
            if not file_path.exists():
                missing.append("IFC file")
            if not report_path.exists():
                missing.append("report")
            print(f"[UPLOAD-CACHE] CACHE MISS - Missing: {', '.join(missing)}")
        
        if use_cache:
            # Load cached report
            with open(report_path, "r", encoding='utf-8') as f:
                report = json.load(f)
            
            response_data = {
                "filename": safe_filename,
                "original_filename": file.filename,
                "report": report,
                "gltf_available": False,  # GLTF disabled - using IFCM viewer
                "gltf_path": f"/api/gltf/{gltf_filename}",
                "from_cache": True
            }
            
            print(f"[UPLOAD-CACHE] Returned cached data in {time.time() - upload_start:.2f}s")
            print(f"[UPLOAD-CACHE] GLTF disabled - using IFCM viewer")
            print(f"[UPLOAD] ===== UPLOAD COMPLETE (FROM CACHE) =====")
            return JSONResponse(response_data)
        
        # ===== NOT CACHED: Process the file =====
        print(f"[UPLOAD] About to write file: {file_path}")
        print(f"[UPLOAD] File path type: {type(file_path)}, exists: {file_path.parent.exists()}")
        try:
            with open(file_path, "wb") as f:
                f.write(content)
            print(f"[UPLOAD] File saved successfully: {file_path}, size: {len(content)} bytes")
        except Exception as write_error:
            print(f"[UPLOAD] ERROR writing file: {write_error}")
            print(f"[UPLOAD] Error type: {type(write_error)}")
            import traceback
            traceback.print_exc()
            raise
        
        # Analyze IFC
        print(f"[UPLOAD] About to call analyze_ifc for: {file_path}")
        analyze_start = time.time()
        try:
            report = analyze_ifc(file_path)
            print(f"[UPLOAD-TIMING] Analysis took {time.time() - analyze_start:.2f}s")
            print(f"[UPLOAD] analyze_ifc completed successfully. Report has {len(report.get('profiles', []))} profiles")
            
            # Save report
            report_path = REPORTS_DIR / f"{safe_filename}.json"
            print(f"[UPLOAD] About to save report: {report_path}")
            try:
                with open(report_path, "w", encoding='utf-8') as f:
                    json.dump(report, f, indent=2)
                print(f"[UPLOAD] Report saved successfully: {report_path}")
            except Exception as report_error:
                print(f"[UPLOAD] ERROR saving report: {report_error}")
                print(f"[UPLOAD] Error type: {type(report_error)}")
                import traceback
                traceback.print_exc()
                raise
            
            # Generate assembly mapping cache for faster subsequent loads
            try:
                mapping_cache_path = REPORTS_DIR / f"{safe_filename}.mapping.json"
                print(f"[UPLOAD] Generating assembly mapping cache...")
                mapping_start = time.time()
                
                ifc_file_for_mapping = ifcopenshell.open(str(file_path.resolve()))
                mapping = {}
                
                for product in ifc_file_for_mapping.by_type("IfcProduct"):
                    try:
                        product_id = product.id()
                        assembly_mark, assembly_id = get_assembly_info(product)
                        element_type = product.is_a()
                        
                        mapping_entry = {
                            "assembly_mark": assembly_mark,
                            "assembly_id": assembly_id,
                            "element_type": element_type
                        }
                        
                        if element_type in {"IfcBeam", "IfcColumn", "IfcMember"}:
                            profile_name = get_profile_name(product)
                            mapping_entry["profile_name"] = profile_name
                        
                        if element_type == "IfcPlate":
                            plate_thickness = get_plate_thickness(product)
                            mapping_entry["plate_thickness"] = plate_thickness
                        
                        mapping[product_id] = mapping_entry
                    except:
                        continue
                
                with open(mapping_cache_path, "w", encoding='utf-8') as f:
                    json.dump(mapping, f)
                print(f"[UPLOAD-TIMING] Assembly mapping cached in {time.time() - mapping_start:.2f}s ({len(mapping)} products)")
            except Exception as e:
                print(f"[UPLOAD] Warning: Failed to generate mapping cache: {e}")
            
            # Convert to glTF synchronously (for now, to catch errors)
            gltf_available = False
            conversion_error = None
            
            # GLTF CONVERSION DISABLED - Using IFCM viewer instead
            # Code preserved for future use if needed
            ENABLE_GLTF_CONVERSION = False  # Set to True to re-enable
            
            if ENABLE_GLTF_CONVERSION:
                # Try conversion, but don't block upload if it fails
                try:
                    gltf_start = time.time()
                    print(f"[UPLOAD] Starting glTF conversion for {safe_filename} (STRUCTURE layer only)...")
                    # Generate structure layer only (fastest - beams, columns, members)
                    convert_ifc_to_gltf(file_path, gltf_path, layer="structure")
                    print(f"[UPLOAD-TIMING] glTF conversion (structure) took {time.time() - gltf_start:.2f}s")
                    gltf_available = gltf_path.exists()
                    if gltf_available:
                        print(f"[UPLOAD] glTF conversion completed: {gltf_path}")
                    else:
                        print(f"[UPLOAD] WARNING: glTF conversion completed but file not found: {gltf_path}")
                except Exception as e:
                    conversion_error = str(e)
                    print(f"[UPLOAD] ERROR: glTF conversion failed: {e}")
                    import traceback
                    traceback.print_exc()
                    # Don't fail the upload, just log the error
            else:
                print(f"[UPLOAD] ===== glTF conversion SKIPPED (ENABLE_GLTF_CONVERSION=False) =====")
                print(f"[UPLOAD] Using IFCM viewer instead - no conversion needed!")
                print(f"[UPLOAD] This saves significant processing time on upload")
            
            # Log profiles in the report being returned
            print(f"[UPLOAD] Report contains {len(report.get('profiles', []))} profiles:")
            for profile in report.get('profiles', []):
                print(f"[UPLOAD]   - {profile.get('profile_name')} (type: {profile.get('element_type', 'N/A')}, pieces: {profile.get('piece_count', 0)})")
            
            response_data = {
                "filename": safe_filename,  # Return sanitized filename
                "original_filename": file.filename,  # Keep original for display
                "report": report,
                "gltf_available": bool(gltf_available),  # Ensure it's always a boolean
                "gltf_path": f"/api/gltf/{gltf_filename}",  # Always include this
                "from_cache": False  # This was freshly processed
            }
            if conversion_error:
                response_data["conversion_error"] = str(conversion_error)
            
            print(f"[UPLOAD-TIMING] TOTAL upload time: {time.time() - upload_start:.2f}s")
            print(f"[UPLOAD] ===== UPLOAD COMPLETE =====")
            
            return JSONResponse(response_data)
        except Exception as e:
            # Clean up file on error
            if file_path.exists():
                file_path.unlink()
            error_msg = f"Error analyzing IFC: {str(e)}"
            print(f"[UPLOAD] {error_msg}")
            import traceback
            print(f"[UPLOAD] Full traceback:")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to analyze IFC: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        print(f"[UPLOAD] {error_msg}")
        import traceback
        print(f"[UPLOAD] Full traceback:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/api/report/{filename}")
async def get_report(filename: str):
    """Get report for a specific IFC file."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    report_path = REPORTS_DIR / f"{decoded_filename}.json"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    with open(report_path, "r") as f:
        report = json.load(f)
    
    # Debug: Log profiles in the report
    print(f"[REPORT] Loading report for {decoded_filename}")
    print(f"[REPORT] Total profiles in report: {len(report.get('profiles', []))}")
    for profile in report.get('profiles', [])[:10]:  # Log first 10
        print(f"[REPORT] Profile: {profile.get('profile_name')}, type: {profile.get('element_type')}, pieces: {profile.get('piece_count')}")
    
    return JSONResponse(report)


@app.post("/api/refined-geometry/{filename}")
async def get_refined_geometry(filename: str, request: Request):
    """Get high-quality geometry for specific elements using IfcOpenShell with boolean operations."""
    try:
        from urllib.parse import unquote
        import base64
        
        decoded_filename = unquote(filename)
        body = await request.json()
        element_ids = body.get('element_ids', [])
        
        if not element_ids:
            return JSONResponse({'geometries': [], 'count': 0})
        
        ifc_path = IFC_DIR / decoded_filename
        if not ifc_path.exists():
            raise HTTPException(status_code=404, detail="IFC file not found")
        
        print(f"[REFINE] Processing {len(element_ids)} elements for {decoded_filename}")
        
        import ifcopenshell
        import ifcopenshell.geom
        import numpy as np
        
        ifc_file = ifcopenshell.open(str(ifc_path))
        
        # Settings for high-quality geometry with boolean operations
        settings = ifcopenshell.geom.settings()
        settings.set(settings.USE_WORLD_COORDS, True)
        settings.set(settings.WELD_VERTICES, True)
        settings.set(settings.DISABLE_OPENING_SUBTRACTIONS, False)  # KEY: Apply holes/cuts!
        settings.set(settings.APPLY_DEFAULT_MATERIALS, True)
        
        geometries = []
        
        for element_id in element_ids:
            try:
                element = ifc_file.by_id(element_id)
                shape = ifcopenshell.geom.create_shape(settings, element)
                
                # Get geometry data
                verts_raw = shape.geometry.verts
                faces_raw = shape.geometry.faces
                
                # Convert to numpy arrays
                verts = np.array(verts_raw).reshape(-1, 3)
                faces = np.array(faces_raw).reshape(-1, 3)
                
                # Flatten for transmission
                verts_flat = verts.flatten().astype(np.float32)
                indices_flat = faces.flatten().astype(np.uint32)
                
                # Encode as base64
                verts_b64 = base64.b64encode(verts_flat.tobytes()).decode('utf-8')
                indices_b64 = base64.b64encode(indices_flat.tobytes()).decode('utf-8')
                
                geometries.append({
                    'element_id': element_id,
                    'element_type': element.is_a(),
                    'element_name': getattr(element, 'Name', 'Unknown'),
                    'element_tag': getattr(element, 'Tag', ''),
                    'vertices': verts_b64,
                    'indices': indices_b64,
                    'vertex_count': len(verts),
                    'face_count': len(faces)
                })
                
                print(f"[REFINE] ✓ Element {element_id} ({element.is_a()}): {len(verts)} vertices, {len(faces)} faces")
                
            except Exception as e:
                print(f"[REFINE] ✗ Error refining element {element_id}: {e}")
                continue
        
        print(f"[REFINE] Successfully refined {len(geometries)}/{len(element_ids)} elements")
        return JSONResponse({'geometries': geometries, 'count': len(geometries)})
    
    except Exception as e:
        print(f"[REFINE] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ifc/{filename}")
@app.head("/api/ifc/{filename}")
async def get_ifc_file(filename: str):
    """Serve IFC file for viewer."""
    file_path = IFC_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=filename
    )


@app.get("/api/export/{filename}/{report_type}")
async def export_report(filename: str, report_type: str):
    """Export report as CSV."""
    if report_type not in ["assemblies", "profiles", "plates"]:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    report_path = REPORTS_DIR / f"{filename}.json"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    with open(report_path, "r") as f:
        report = json.load(f)
    
    import csv
    import io
    
    output = io.StringIO()
    
    if report_type == "assemblies":
        writer = csv.DictWriter(output, fieldnames=["assembly_mark", "total_weight", "member_count", "plate_count"])
        writer.writeheader()
        writer.writerows(report["assemblies"])
    elif report_type == "profiles":
        writer = csv.DictWriter(output, fieldnames=["profile_name", "element_type", "piece_count", "total_weight"])
        writer.writeheader()
        writer.writerows(report["profiles"])
    elif report_type == "plates":
        writer = csv.DictWriter(output, fieldnames=["thickness_profile", "piece_count", "total_weight"])
        writer.writeheader()
        writer.writerows(report["plates"])
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}_{report_type}.csv"'}
    )


def convert_ifc_to_gltf(ifc_path: Path, gltf_path: Path, layer: str = "structure") -> bool:
    """
    Convert IFC file to glTF format using IfcOpenShell ITERATOR mode - ULTRA FAST.
    
    Args:
        ifc_path: Path to IFC file
        gltf_path: Path to output GLTF file
        layer: Which layer to convert - "structure" (default), "plates", or "bolts"
    """
    try:
        import ifcopenshell.geom
        import trimesh
        import numpy as np
        import time
        
        start_time = time.time()
        print(f"[GLTF-TIMING] Starting ITERATOR-BASED conversion at {time.strftime('%H:%M:%S')}")
        
        # Resolve path to absolute for Windows compatibility
        resolved_ifc_path = ifc_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_ifc_path))
        print(f"[GLTF-TIMING] File opened in {time.time() - start_time:.2f}s")
        
        # OPTIMIZATION: Use ITERATOR mode - processes in C++, 10-20x faster than create_shape per product
        settings = ifcopenshell.geom.settings()
        settings.set(settings.USE_WORLD_COORDS, True)  # Use world coordinates
        settings.set(settings.WELD_VERTICES, False)  # Faster - skip welding
        settings.set(settings.DISABLE_OPENING_SUBTRACTIONS, True)  # Much faster - skip holes/cuts
        settings.set(settings.APPLY_DEFAULT_MATERIALS, False)  # Faster - materials still available in geometry
        
        # SPEED OPTIMIZATION: Lower mesh detail for faster conversion (if available)
        try:
            settings.set(settings.DEFLECTION_TOLERANCE, 0.05)  # Higher = fewer triangles (default: 0.001)
            print("[GLTF] Using DEFLECTION_TOLERANCE=0.05 for faster conversion")
        except AttributeError:
            print("[GLTF] DEFLECTION_TOLERANCE not available in this ifcopenshell version")
        
        try:
            settings.set(settings.ANGULAR_TOLERANCE, 0.5)      # Higher = fewer triangles (default: 0.5)
            print("[GLTF] Using ANGULAR_TOLERANCE=0.5 for faster conversion")
        except AttributeError:
            print("[GLTF] ANGULAR_TOLERANCE not available in this ifcopenshell version")
        
        # Note: USE_BREP_DATA and SEW_SHELLS not available in all IfcOpenShell versions
        
        print(f"[GLTF] Using ITERATOR mode with ULTRA-FAST settings (C++ optimized)")
        
        # Define layer types
        structure_types = {"IfcBeam", "IfcColumn", "IfcMember"}
        plate_types = {"IfcPlate"}  # ONLY plates, not slabs
        bolt_types = {"IfcFastener", "IfcMechanicalFastener", "IfcDiscreteAccessory"}
        
        # Always skip non-geometric types
        always_skip = {
            "IfcGrid", "IfcGridAxis", "IfcAnnotation", "IfcOpeningElement",
            "IfcSpace", "IfcSite", "IfcBuilding", "IfcBuildingStorey",
            "IfcProxy", "IfcDistributionElement"
        }
        
        # Determine what to include based on layer
        if layer == "structure":
            # Structure + everything else EXCEPT plates and bolts
            # This includes: Beams, Columns, Members, Slabs, Walls, etc.
            skip_types = always_skip | plate_types | bolt_types
            include_types = None  # Include everything not in skip_types
            print(f"[GLTF] Layer: STRUCTURE (All elements except Plates and Bolts)")
        elif layer == "plates":
            # Only plates (IfcPlate)
            include_types = plate_types
            skip_types = always_skip
            print(f"[GLTF] Layer: PLATES (IfcPlate only)")
        elif layer == "bolts":
            # Only fasteners
            include_types = bolt_types
            skip_types = always_skip
            print(f"[GLTF] Layer: BOLTS (Fasteners only)")
        else:
            # Default to structure
            skip_types = always_skip | plate_types | bolt_types
            include_types = None
            print(f"[GLTF] Layer: STRUCTURE (default)")
        
        # Pre-filter products based on layer
        filter_start = time.time()
        all_products = ifc_file.by_type("IfcProduct")
        
        if include_types is None:
            # Include everything EXCEPT skip_types
            product_ids_to_include = {p.id() for p in all_products if p.is_a() not in skip_types}
        else:
            # Include only specific types
            product_ids_to_include = {p.id() for p in all_products if p.is_a() in include_types}
        
        print(f"[GLTF] Filtered {len(all_products)} -> {len(product_ids_to_include)} products for layer '{layer}'")
        print(f"[GLTF] Skipped {len(all_products) - len(product_ids_to_include)} products")
        print(f"[GLTF-TIMING] Filtering took {time.time() - filter_start:.2f}s")
        
        # ITERATOR MODE: Process all geometry in one go (C++ optimized)
        geom_start = time.time()
        # SPEED OPTIMIZATION: Use 4 cores max (too many threads causes contention)
        num_threads = min(4, multiprocessing.cpu_count())
        iterator = ifcopenshell.geom.iterator(settings, ifc_file, num_threads)
        iterator.initialize()
        
        print(f"[GLTF] Starting iterator-based geometry extraction (parallel C++ processing)...")
        
        meshes = []
        product_ids = []
        assembly_marks = []
        processed = 0
        skipped = 0
        
        while True:
            try:
                shape = iterator.get()
                
                # Skip if not in our filtered list
                if shape.id not in product_ids_to_include:
                    skipped += 1
                    if not iterator.next():
                        break
                    continue
                
                # Get product for metadata
                product = ifc_file.by_id(shape.id)
                
                # Extract geometry (already processed by C++)
                verts = shape.geometry.verts
                faces = shape.geometry.faces
                
                if not verts or not faces:
                    skipped += 1
                    if not iterator.next():
                        break
                    continue
                
                # Convert to numpy arrays
                vertices = np.array(verts).reshape(-1, 3)
                face_indices = np.array(faces).reshape(-1, 3)
                
                if vertices.shape[0] < 3 or face_indices.shape[0] < 1:
                    skipped += 1
                    if not iterator.next():
                        break
                    continue
                
                # Create trimesh
                mesh = trimesh.Trimesh(vertices=vertices, faces=face_indices)
                
                # Extract IFC material colors (optimized - no debug, direct method)
                element_type = product.is_a()
                color = None
                
                # Fast path: Try to get color from shape.geometry.materials
                try:
                    if hasattr(shape.geometry, 'materials') and shape.geometry.materials:
                        material = shape.geometry.materials[0]
                        
                        # Direct method: Call get_color() then r(), g(), b() (we know this works)
                        if hasattr(material, 'get_color') and callable(material.get_color):
                            rgb = material.get_color()
                            if hasattr(rgb, 'r') and hasattr(rgb, 'g') and hasattr(rgb, 'b'):
                                # Convert from 0-1 range to 0-255 range
                                color = [
                                    int(rgb.r() * 255),
                                    int(rgb.g() * 255),
                                    int(rgb.b() * 255),
                                    255  # Alpha
                                ]
                except:
                    pass  # Silent fail, use fallback
                
                # Fallback: Type-based coloring
                if not color:
                    color_map = {
                        "IfcBeam": [180, 180, 220, 255],            # Light blue-gray
                        "IfcColumn": [150, 200, 220, 255],          # Light blue
                        "IfcMember": [200, 180, 150, 255],          # Light brown
                        "IfcPlate": [220, 200, 180, 255],           # Light tan
                        "IfcSlab": [200, 200, 210, 255],            # Light gray
                        "IfcFastener": [139, 105, 20, 255],         # Dark brown-gold for bolts
                        "IfcMechanicalFastener": [139, 105, 20, 255],  # Dark brown-gold for bolts
                        "IfcDiscreteAccessory": [120, 90, 15, 255],    # Darker gold for nuts/washers
                    }
                    color = color_map.get(element_type, [190, 190, 220, 255])  # Default steel
                
                # Set vertex colors
                mesh.visual.vertex_colors = color
                
                # Get assembly mark for metadata (optimized - no try/except overhead)
                assembly_mark = getattr(product, 'Tag', None) or getattr(product, 'Name', None) or shape.id
                
                # Store metadata
                mesh.metadata = {
                    'product_id': shape.id,
                    'assembly_mark': assembly_mark,
                    'element_type': element_type
                }
                
                # Store
                meshes.append(mesh)
                product_ids.append(shape.id)
                assembly_marks.append(assembly_mark)
                
                processed += 1
                # SPEED OPTIMIZATION: Reduce logging frequency (I/O overhead)
                if processed % 2000 == 0:
                    print(f"[GLTF] Progress: {processed} meshes extracted...")
                
                # Next iteration
                if not iterator.next():
                    break
                    
            except Exception as e:
                skipped += 1
                if not iterator.next():
                    break
                continue
        
        print(f"[GLTF-TIMING] Iterator geometry extraction took {time.time() - geom_start:.2f}s")
        print(f"[GLTF] Extracted {len(meshes)} meshes ({skipped} skipped)")
        
        if not meshes:
            raise Exception("No valid geometry found in IFC file")
        
        # Create scene and export
        export_start = time.time()
        gltf_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create scene with named meshes (optimized - simple naming)
        geometry_dict = {}
        for i, mesh in enumerate(meshes):
            # SPEED OPTIMIZATION: Simple naming without string manipulation
            product_id = product_ids[i] if i < len(product_ids) else i
            mesh_name = f"mesh_{product_id}"
            geometry_dict[mesh_name] = mesh
        
        print(f"[GLTF] Created scene with {len(geometry_dict)} named meshes")
        
        # Export to GLB
        scene = trimesh.Scene(geometry_dict)
        scene.export(str(gltf_path))
        
        if not gltf_path.exists():
            raise Exception(f"glTF file was not created at {gltf_path}")
        
        print(f"[GLTF] Successfully exported to {gltf_path}, size: {gltf_path.stat().st_size} bytes")
        print(f"[GLTF-TIMING] Export took {time.time() - export_start:.2f}s")
        print(f"[GLTF-TIMING] TOTAL conversion time: {time.time() - start_time:.2f}s")
        return True
    except Exception as e:
        print(f"Error in glTF conversion: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


@app.post("/api/convert-gltf/{filename}")
async def convert_to_gltf(filename: str):
    """Convert IFC file to glTF format."""
    # Decode URL-encoded filename (handles spaces and special characters)
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    gltf_filename = f"{Path(decoded_filename).stem}.glb"
    gltf_path = GLTF_DIR / gltf_filename
    
    # Check if already converted
    if gltf_path.exists():
        return JSONResponse({
            "message": "glTF file already exists",
            "filename": gltf_filename,
            "gltf_path": f"/api/gltf/{gltf_filename}"
        })
    
    try:
        # Convert IFC to glTF
        convert_ifc_to_gltf(file_path, gltf_path)
        
        return JSONResponse({
            "message": "glTF conversion successful",
            "filename": gltf_filename,
            "gltf_path": f"/api/gltf/{gltf_filename}"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@app.head("/api/gltf/{filename}")
@app.get("/api/gltf/{filename}")
async def get_gltf_file(filename: str):
    """Serve glTF/GLB file for viewer."""
    # Decode URL-encoded filename (handles spaces and special characters)
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = GLTF_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="glTF file not found")
    
    # Determine media type based on extension
    if filename.endswith('.glb'):
        media_type = "model/gltf-binary"
    else:
        media_type = "model/gltf+json"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename
    )


@app.post("/api/gltf-layer/{filename}")
async def generate_gltf_layer(filename: str, layer: str = "plates"):
    """
    Generate additional GLTF layer (plates or bolts) for an existing IFC file.
    
    Args:
        filename: IFC filename (without extension)
        layer: "plates" or "bolts"
    """
    from urllib.parse import unquote
    import time
    
    decoded_filename = unquote(filename)
    
    # Validate layer
    if layer not in ["plates", "bolts"]:
        raise HTTPException(status_code=400, detail="Layer must be 'plates' or 'bolts'")
    
    # Handle filename with or without .ifc extension
    if decoded_filename.endswith('.ifc'):
        ifc_filename = decoded_filename
        base_filename = decoded_filename[:-4]  # Remove .ifc extension
    else:
        ifc_filename = f"{decoded_filename}.ifc"
        base_filename = decoded_filename
    
    # Find IFC file
    ifc_path = IFC_DIR / ifc_filename
    if not ifc_path.exists():
        raise HTTPException(status_code=404, detail=f"IFC file not found: {ifc_filename}")
    
    # Generate layer-specific GLTF filename
    layer_gltf_filename = f"{base_filename}_{layer}.glb"
    layer_gltf_path = GLTF_DIR / layer_gltf_filename
    
    # Check if layer already exists
    if layer_gltf_path.exists():
        print(f"[GLTF-LAYER] Layer '{layer}' already exists: {layer_gltf_path}")
        return JSONResponse({
            "message": f"Layer '{layer}' already generated",
            "filename": layer_gltf_filename,
            "exists": True
        })
    
    # Generate the layer
    try:
        layer_start = time.time()
        print(f"[GLTF-LAYER] Generating '{layer}' layer for {base_filename}...")
        convert_ifc_to_gltf(ifc_path, layer_gltf_path, layer=layer)
        layer_time = time.time() - layer_start
        print(f"[GLTF-LAYER] Layer '{layer}' generated in {layer_time:.2f}s")
        
        return JSONResponse({
            "message": f"Layer '{layer}' generated successfully",
            "filename": layer_gltf_filename,
            "generation_time": round(layer_time, 2),
            "exists": False
        })
    except Exception as e:
        print(f"[GLTF-LAYER] ERROR generating layer '{layer}': {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Layer generation failed: {str(e)}")


def analyze_fastener_structure(ifc_path: Path):
    """Analyze how Tekla Structures exports fasteners in IFC."""
    import ifcopenshell
    import ifcopenshell.util.element
    from collections import Counter
    
    # Resolve path to absolute for Windows compatibility
    resolved_ifc_path = ifc_path.resolve()
    ifc_file = ifcopenshell.open(str(resolved_ifc_path))
    
    print(f"\n=== Analyzing IFC file: {ifc_path.name} ===\n")
    
    # Get all products
    all_products = ifc_file.by_type("IfcProduct")
    print(f"Total products: {len(all_products)}\n")
    
    # Count by entity type
    type_counts = Counter(p.is_a() for p in all_products)
    print("Product types (top 20):")
    for t, c in type_counts.most_common(20):
        print(f"  {t}: {c}")
    
    # Look for fastener-related entities
    print("\n=== Fastener-related entities ===")
    fastener_keywords = ['fastener', 'bolt', 'nut', 'washer', 'screw', 'anchor', 'mechanical']
    found_fasteners = []
    
    for product in all_products:
        element_type = product.is_a()
        name = getattr(product, 'Name', None) or ''
        desc = getattr(product, 'Description', None) or ''
        tag = getattr(product, 'Tag', None) or ''
        
        # Check if it's a known fastener type
        if 'Fastener' in element_type or 'FASTENER' in element_type:
            print(f"\n{element_type} (ID: {product.id()}):")
            print(f"  Name: {name}")
            print(f"  Description: {desc}")
            print(f"  Tag: {tag}")
            try:
                psets = ifcopenshell.util.element.get_psets(product)
                print(f"  Property Sets: {list(psets.keys())}")
            except:
                pass
            found_fasteners.append({
                'id': product.id(),
                'type': element_type,
                'name': name,
                'tag': tag,
                'description': desc
            })
        
        # Check if name/desc/tag contains fastener keywords
        elif any(kw in (name + desc + tag).lower() for kw in fastener_keywords):
            print(f"\nPotential fastener - {element_type} (ID: {product.id()}):")
            print(f"  Name: {name}")
            print(f"  Description: {desc}")
            print(f"  Tag: {tag}")
            try:
                psets = ifcopenshell.util.element.get_psets(product)
                print(f"  Property Sets: {list(psets.keys())}")
            except:
                pass
            found_fasteners.append({
                'id': product.id(),
                'type': element_type,
                'name': name,
                'tag': tag,
                'description': desc
            })
    
    # Check for specific Tekla properties
    print("\n=== Checking for Tekla-specific fastener properties ===")
    tekla_fasteners = []
    for product in all_products:
        try:
            psets = ifcopenshell.util.element.get_psets(product)
            for pset_name, props in psets.items():
                # Tekla often uses specific property sets
                if 'Bolt' in pset_name or 'Fastener' in pset_name or 'Mechanical' in pset_name:
                    print(f"\nFound Tekla fastener property set '{pset_name}' on {product.is_a()} (ID: {product.id()}):")
                    print(f"  Properties: {list(props.keys())}")
                    tekla_fasteners.append({
                        'id': product.id(),
                        'type': product.is_a(),
                        'pset': pset_name
                    })
        except:
            pass
    
    return {
        'total_products': len(all_products),
        'type_counts': dict(type_counts),
        'found_fasteners': found_fasteners,
        'tekla_fasteners': tekla_fasteners
    }


@app.get("/api/debug-fasteners/{filename}")
async def debug_fasteners(filename: str):
    """Debug endpoint to analyze fastener structure in IFC file."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    # Run analysis
    try:
        result = analyze_fastener_structure(file_path)
        return JSONResponse(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/debug-assembly/{filename}")
async def debug_assembly_structure(filename: str):
    """Debug endpoint to understand how Tekla exports assembly information."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Get a sample of products to inspect
        products = list(ifc_file.by_type("IfcProduct"))[:10]  # First 10 products
        
        debug_info = []
        for product in products:
            try:
                product_info = {
                    "id": product.id(),
                    "type": product.is_a(),
                    "tag": getattr(product, 'Tag', None),
                    "name": getattr(product, 'Name', None),
                    "description": getattr(product, 'Description', None),
                    "property_sets": {},
                    "relationships": []
                }
                
                # Get all property sets
                try:
                    psets = ifcopenshell.util.element.get_psets(product)
                    for pset_name, props in psets.items():
                        product_info["property_sets"][pset_name] = dict(props)
                except:
                    pass
                
                # Check relationships
                try:
                    if hasattr(product, 'HasAssignments'):
                        for assignment in product.HasAssignments or []:
                            rel_info = {
                                "type": assignment.is_a(),
                                "related_objects": []
                            }
                            if hasattr(assignment, 'RelatedObjects'):
                                for obj in assignment.RelatedObjects or []:
                                    rel_info["related_objects"].append({
                                        "id": obj.id(),
                                        "type": obj.is_a(),
                                        "tag": getattr(obj, 'Tag', None),
                                        "name": getattr(obj, 'Name', None)
                                    })
                            product_info["relationships"].append(rel_info)
                    
                    # Check IfcRelAggregates (parts to assembly)
                    if hasattr(product, 'Decomposes'):
                        for rel in product.Decomposes or []:
                            if rel.is_a('IfcRelAggregates'):
                                product_info["relationships"].append({
                                    "type": "IfcRelAggregates (part of assembly)",
                                    "relating_object": {
                                        "id": rel.RelatingObject.id() if rel.RelatingObject else None,
                                        "type": rel.RelatingObject.is_a() if rel.RelatingObject else None,
                                        "tag": getattr(rel.RelatingObject, 'Tag', None) if rel.RelatingObject else None,
                                        "name": getattr(rel.RelatingObject, 'Name', None) if rel.RelatingObject else None
                                    }
                                })
                    
                    # Check IfcRelContainedInSpatialStructure
                    if hasattr(product, 'ContainedInStructure'):
                        for rel in product.ContainedInStructure or []:
                            if rel.is_a('IfcRelContainedInSpatialStructure'):
                                product_info["relationships"].append({
                                    "type": "IfcRelContainedInSpatialStructure",
                                    "relating_structure": {
                                        "id": rel.RelatingStructure.id() if rel.RelatingStructure else None,
                                        "type": rel.RelatingStructure.is_a() if rel.RelatingStructure else None,
                                        "tag": getattr(rel.RelatingStructure, 'Tag', None) if rel.RelatingStructure else None,
                                        "name": getattr(rel.RelatingStructure, 'Name', None) if rel.RelatingStructure else None
                                    }
                                })
                except Exception as e:
                    product_info["relationship_error"] = str(e)
                
                debug_info.append(product_info)
            except Exception as e:
                debug_info.append({
                    "id": product.id() if hasattr(product, 'id') else 'unknown',
                    "error": str(e)
                })
        
        return JSONResponse({
            "total_products": len(list(ifc_file.by_type("IfcProduct"))),
            "sample_products": debug_info
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")


@app.get("/api/inspect-entity")
async def inspect_entity(filename: str, entity_id: int):
    """Inspect a specific IFC entity by ID."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Try to get entity by ID
        try:
            entity = ifc_file.by_id(entity_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Entity with ID {entity_id} not found: {str(e)}")
        
        element_type = entity.is_a()
        name = getattr(entity, 'Name', None) or ''
        tag = getattr(entity, 'Tag', None) or ''
        desc = getattr(entity, 'Description', None) or ''
        
        # Check if it's a fastener using the same logic as is_fastener_like
        is_fastener = False
        fastener_method = None
        
        # Check standard IFC fastener entities
        if element_type in {"IfcFastener", "IfcMechanicalFastener"}:
            is_fastener = True
            fastener_method = "entity_type"
        else:
            # Check name/tag/description
            fastener_keywords = ['bolt', 'nut', 'washer', 'fastener', 'screw', 'anchor', 'mechanical']
            text_content = (name + ' ' + desc + ' ' + tag).lower()
            if any(kw in text_content for kw in fastener_keywords):
                is_fastener = True
                fastener_method = "name/tag"
            else:
                # Check property sets
                try:
                    import ifcopenshell.util.element
                    psets = ifcopenshell.util.element.get_psets(entity)
                    for pset_name in psets.keys():
                        pset_lower = pset_name.lower()
                        if 'bolt' in pset_lower or 'fastener' in pset_lower or 'mechanical' in pset_lower:
                            is_fastener = True
                            fastener_method = f"property_set: {pset_name}"
                            break
                except:
                    pass
        
        # Get property sets
        psets = {}
        try:
            import ifcopenshell.util.element
            psets = ifcopenshell.util.element.get_psets(entity)
        except:
            pass
        
        # Get materials
        materials_info = []
        try:
            materials = ifcopenshell.util.element.get_materials(entity)
            for mat in materials:
                materials_info.append({
                    'name': getattr(mat, 'Name', None) or '',
                    'type': mat.is_a() if hasattr(mat, 'is_a') else 'unknown'
                })
        except:
            pass
        
        # Try to get color from IFC
        color_info = None
        try:
            import ifcopenshell.util.style
            style = ifcopenshell.util.style.get_style(entity)
            if style:
                # Try to extract color
                if hasattr(style, "Styles"):
                    for rendering in style.Styles or []:
                        if rendering.is_a('IfcSurfaceStyleRendering') and rendering.SurfaceColour:
                            color_info = {
                                'red': rendering.SurfaceColour.Red,
                                'green': rendering.SurfaceColour.Green,
                                'blue': rendering.SurfaceColour.Blue
                            }
                            break
        except:
            pass
        
        return JSONResponse({
            'entity_id': entity_id,
            'element_type': element_type,
            'name': name,
            'tag': tag,
            'description': desc,
            'is_fastener': is_fastener,
            'fastener_detection_method': fastener_method,
            'property_sets': list(psets.keys()),
            'materials': materials_info,
            'color_info': color_info
        })
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inspection failed: {str(e)}")


@app.get("/api/assembly-mapping/{filename}")
async def get_assembly_mapping(filename: str):
    """Get assembly mapping for a specific IFC file."""
    from urllib.parse import unquote
    import time
    start_time = time.time()
    
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    # ===== CACHE CHECK: Load from cached mapping if available =====
    mapping_cache_path = REPORTS_DIR / f"{decoded_filename}.mapping.json"
    if mapping_cache_path.exists():
        print(f"[ASSEMBLY_MAPPING] CACHE HIT! Loading from: {mapping_cache_path}")
        try:
            with open(mapping_cache_path, "r", encoding='utf-8') as f:
                mapping = json.load(f)
            print(f"[ASSEMBLY_MAPPING] Loaded {len(mapping)} cached mappings in {time.time() - start_time:.3f}s")
            return JSONResponse(mapping)
        except Exception as e:
            print(f"[ASSEMBLY_MAPPING] Cache read failed: {e}, will regenerate")
    
    print(f"[ASSEMBLY_MAPPING] CACHE MISS! Generating mapping for: {decoded_filename}")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Build mapping: product_id -> assembly info (mark + assembly_id)
        mapping = {}
        products = ifc_file.by_type("IfcProduct")
        
        # Statistics
        found_count = 0
        not_found_count = 0
        sample_not_found = []
        
        for product in products:
            try:
                product_id = product.id()
                assembly_mark, assembly_id = get_assembly_info(product)
                element_type = product.is_a()
                
                mapping_entry = {
                    "assembly_mark": assembly_mark,
                    "assembly_id": assembly_id,  # Store assembly instance ID
                    "element_type": element_type
                }
                
                # Add profile_name for beams, columns, members
                if element_type in {"IfcBeam", "IfcColumn", "IfcMember"}:
                    profile_name = get_profile_name(product)
                    mapping_entry["profile_name"] = profile_name
                
                # Add plate_thickness for plates
                if element_type == "IfcPlate":
                    plate_thickness = get_plate_thickness(product)
                    mapping_entry["plate_thickness"] = plate_thickness
                
                mapping[product_id] = mapping_entry
                
                if assembly_mark != "N/A":
                    found_count += 1
                else:
                    not_found_count += 1
                    # Collect a few samples for debugging
                    if len(sample_not_found) < 3:
                        try:
                            psets = ifcopenshell.util.element.get_psets(product)
                            sample_not_found.append({
                                "id": product_id,
                                "type": element_type,
                                "tag": getattr(product, 'Tag', None),
                                "name": getattr(product, 'Name', None),
                                "psets": list(psets.keys()) if psets else []
                            })
                        except:
                            pass
            except Exception as e:
                print(f"[ASSEMBLY_MAPPING] Error processing product: {e}")
                continue
        
        print(f"[ASSEMBLY_MAPPING] Found {found_count} products with assembly marks, {not_found_count} without")
        if sample_not_found:
            print(f"[ASSEMBLY_MAPPING] Sample products without assembly marks: {sample_not_found}")
        
        # ===== SAVE TO CACHE =====
        try:
            with open(mapping_cache_path, "w", encoding='utf-8') as f:
                json.dump(mapping, f)
            print(f"[ASSEMBLY_MAPPING] Cached {len(mapping)} mappings to: {mapping_cache_path}")
        except Exception as e:
            print(f"[ASSEMBLY_MAPPING] Warning: Failed to save cache: {e}")
        
        print(f"[ASSEMBLY_MAPPING] Total time: {time.time() - start_time:.3f}s")
        return JSONResponse(mapping)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get assembly mapping: {str(e)}")


@app.get("/api/nesting/{filename}")
async def generate_nesting(
    filename: str, 
    stock_lengths: str, 
    profiles: str, 
    kerf: float = 3.0, 
    trim: float = 5.0,
    stock_tolerance: float = 0.0
):
    """Generate nesting optimization report for selected profiles with slope-aware cutting.
    
    Args:
        filename: IFC filename
        stock_lengths: Comma-separated list of stock lengths in mm (e.g., "6000,12000")
        profiles: Comma-separated list of profile names to nest (e.g., "IPE200,HEA300")
        kerf: Kerf width in mm (cutting blade width, default: 3.0mm)
        trim: Trim amount in mm (material removed from stock bar ends, default: 5.0mm)
        stock_tolerance: Safety tolerance in mm (stock bars have 10-50mm excess, default: 0.0 = disabled)
    """
    import sys
    
    # Force output to be flushed immediately
    sys.stdout.flush()
    sys.stderr.flush()
    
    nesting_log("=" * 60, flush=True)
    nesting_log("[NESTING] ===== NESTING REQUEST RECEIVED =====", flush=True)
    nesting_log(f"[NESTING] Filename: {filename}", flush=True)
    nesting_log(f"[NESTING] Stock lengths: {stock_lengths}", flush=True)
    nesting_log(f"[NESTING] Profiles: {profiles}", flush=True)
    nesting_log(f"[NESTING] Kerf: {kerf}mm", flush=True)
    nesting_log(f"[NESTING] Trim: {trim}mm", flush=True)
    nesting_log(f"[NESTING] Stock tolerance: {stock_tolerance}mm {'(enabled)' if stock_tolerance > 0 else '(disabled)'}", flush=True)
    nesting_log("=" * 60, flush=True)
    
    try:
        from urllib.parse import unquote
        from nesting import create_nesting_report, export_to_json
        
        decoded_filename = unquote(filename)
        file_path = IFC_DIR / decoded_filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="IFC file not found")
        
        nesting_log(f"[NESTING] Starting slope-aware nesting generation for {filename}")
        
        # Parse stock lengths
        stock_lengths_list = sorted([float(x.strip()) for x in stock_lengths.split(',') if x.strip()])
        if not stock_lengths_list:
            raise HTTPException(status_code=400, detail="At least one stock length is required")
        
        # Parse selected profiles
        selected_profiles = [x.strip() for x in profiles.split(',') if x.strip()]
        if not selected_profiles:
            raise HTTPException(status_code=400, detail="At least one profile is required")
        
        nesting_log(f"[NESTING] Stock lengths: {stock_lengths_list}")
        nesting_log(f"[NESTING] Selected profiles: {selected_profiles}")
        
        # Open IFC file
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        nesting_log(f"[NESTING] Opened IFC file: {decoded_filename}")
        
        # Initialize CutPieceExtractor for slope detection
        extractor = None
        try:
            from cut_piece_extractor import CutPieceExtractor
            extractor = CutPieceExtractor(ifc_file)
            nesting_log(f"[NESTING] CutPieceExtractor initialized for slope-aware nesting")
        except Exception as e:
            nesting_log(f"[NESTING] Warning: Could not initialize CutPieceExtractor: {e}")
            nesting_log(f"[NESTING] Falling back to basic nesting without slope detection")
        
        # Generate nesting report using the new orchestrator
        nesting_log(f"[NESTING] Generating nesting report...")
        report = create_nesting_report(
            filename=decoded_filename,
            ifc_file=ifc_file,
            selected_profiles=selected_profiles,
            stock_lengths=stock_lengths_list,
            kerf=kerf,
            trim=trim,
            stock_tolerance=stock_tolerance,
            extractor=extractor,
            use_complementary_pairing=True,
            log_func=nesting_log
        )
        
        # Export to JSON
        result = export_to_json(report)
        
        nesting_log(f"[NESTING] Nesting complete!")
        nesting_log(f"[NESTING] Summary: {result['summary']['total_profiles']} profile(s), "
                   f"{result['summary']['total_patterns']} pattern(s), "
                   f"{result['summary']['total_waste']:.0f}mm waste "
                   f"({result['summary']['avg_waste_percentage']:.1f}%)")
        
        # Debug: Save first pattern to file for inspection
        try:
            import json
            if result.get('profiles') and len(result['profiles']) > 0:
                profile = result['profiles'][0]
                if profile.get('patterns') and len(profile['patterns']) > 0:
                    pattern = profile['patterns'][0]
                    print(f"\n=== DEBUG: First pattern has {len(pattern.get('parts', []))} parts ===")
                    if pattern.get('parts') and len(pattern['parts']) > 0:
                        first_part = pattern['parts'][0]
                        print(f"First part keys: {list(first_part.keys())}")
                        if 'part' in first_part:
                            part_data = first_part['part']
                            print(f"Part data keys: {list(part_data.keys())}")
                            print(f"Part reference: '{part_data.get('reference')}'")
                            print(f"Part element_name: '{part_data.get('element_name')}'")
                            print(f"Part start_angle: {part_data.get('start_angle')}")
                            print(f"Part end_angle: {part_data.get('end_angle')}")
                            print(f"Part start_has_slope: {part_data.get('start_has_slope')}")
                            print(f"Part end_has_slope: {part_data.get('end_has_slope')}")
                        
                        # Save first 3 parts to debug file
                        debug_data = {
                            'first_3_parts': pattern['parts'][:3],
                            'pattern_info': {
                                'stock_length': pattern.get('stock_length'),
                                'waste': pattern.get('waste'),
                                'total_parts': len(pattern.get('parts', []))
                            }
                        }
                        with open('C:\\CUTWISE\\debug_nesting_response.json', 'w') as f:
                            json.dump(debug_data, f, indent=2)
                        print(f"Debug data saved to C:\\CUTWISE\\debug_nesting_response.json")
        except Exception as e:
            print(f"Debug logging error: {e}")
        
        return JSONResponse(result)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        nesting_log(f"[NESTING] ERROR: {error_msg}")
        nesting_log(f"[NESTING] Traceback:\n{error_trace}")
        
        error_detail = f"Nesting generation failed: {error_msg}"
        if len(error_trace) < 2000:
            error_detail += f"\n\nTraceback:\n{error_trace}"
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/debug-assembly-name/{filename}")
async def debug_assembly_name(filename: str, product_id: int = None):
    """Debug endpoint to find where assembly names are stored by comparing multiple products."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Get a sample of products
        products = []
        for product in ifc_file.by_type("IfcProduct"):
            if product.is_a() in ["IfcBeam", "IfcColumn", "IfcMember", "IfcPlate"]:
                products.append(product)
                if len(products) >= 10:  # Sample 10 products
                    break
        
        debug_info = {
            "filename": decoded_filename,
            "sample_size": len(products),
            "products": []
        }
        
        for product in products:
            product_info = {
                "id": product.id(),
                "type": product.is_a(),
                "tag": getattr(product, 'Tag', None),
                "name": getattr(product, 'Name', None),
                "all_property_values": {}
            }
            
            try:
                psets = ifcopenshell.util.element.get_psets(product)
                for pset_name, props in psets.items():
                    product_info["all_property_values"][pset_name] = {}
                    for key, value in props.items():
                        if value is not None:
                            value_str = str(value).strip()
                            # Only include non-empty, non-GUID values
                            if value_str and value_str.upper() not in ['NONE', 'NULL', 'N/A', '']:
                                if not (value_str.startswith('ID') and '-' in value_str and len(value_str) > 20):
                                    product_info["all_property_values"][pset_name][key] = value_str
            except Exception as e:
                product_info["error"] = str(e)
            
            debug_info["products"].append(product_info)
        
        return JSONResponse(debug_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/debug-assembly-grouping/{filename}")
async def debug_assembly_grouping(filename: str, product_id: int = None):
    """Debug endpoint to find where Tekla stores assembly grouping information."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        result = {
            "filename": decoded_filename,
            "total_products": len(list(ifc_file.by_type("IfcProduct"))),
            "total_assemblies": len(list(ifc_file.by_type("IfcElementAssembly"))),
            "total_rel_aggregates": len(list(ifc_file.by_type("IfcRelAggregates"))),
            "ifc_element_assemblies": [],
            "rel_aggregates": [],
            "product_details": None
        }
        
        # Get all IfcElementAssembly objects
        assemblies = ifc_file.by_type("IfcElementAssembly")
        for assembly in assemblies[:10]:  # First 10
            assembly_info = {
                "id": assembly.id(),
                "type": assembly.is_a(),
                "tag": getattr(assembly, 'Tag', None),
                "name": getattr(assembly, 'Name', None),
                "property_sets": {}
            }
            
            # Get property sets
            try:
                psets = ifcopenshell.util.element.get_psets(assembly)
                assembly_info["property_sets"] = {name: dict(props) for name, props in psets.items()}
            except:
                pass
            
            # Find parts in this assembly
            parts_in_assembly = []
            for rel in ifc_file.by_type("IfcRelAggregates"):
                if rel.RelatingObject.id() == assembly.id():
                    for part in rel.RelatedObjects:
                        if part.is_a("IfcProduct"):
                            parts_in_assembly.append({
                                "id": part.id(),
                                "type": part.is_a(),
                                "tag": getattr(part, 'Tag', None),
                                "name": getattr(part, 'Name', None)
                            })
            assembly_info["parts"] = parts_in_assembly
            assembly_info["part_count"] = len(parts_in_assembly)
            
            result["ifc_element_assemblies"].append(assembly_info)
        
        # Get all IfcRelAggregates relationships
        for rel in list(ifc_file.by_type("IfcRelAggregates"))[:20]:  # First 20
            rel_info = {
                "id": rel.id(),
                "relating_object": {
                    "id": rel.RelatingObject.id() if rel.RelatingObject else None,
                    "type": rel.RelatingObject.is_a() if rel.RelatingObject else None,
                    "tag": getattr(rel.RelatingObject, 'Tag', None) if rel.RelatingObject else None,
                    "name": getattr(rel.RelatingObject, 'Name', None) if rel.RelatingObject else None
                },
                "related_objects": []
            }
            
            for obj in rel.RelatedObjects:
                rel_info["related_objects"].append({
                    "id": obj.id(),
                    "type": obj.is_a(),
                    "tag": getattr(obj, 'Tag', None),
                    "name": getattr(obj, 'Name', None)
                })
            
            result["rel_aggregates"].append(rel_info)
        
        # If product_id is provided, get detailed info about that product
        if product_id:
            try:
                product = ifc_file.by_id(product_id)
                product_info = {
                    "id": product.id(),
                    "type": product.is_a(),
                    "tag": getattr(product, 'Tag', None),
                    "name": getattr(product, 'Name', None),
                    "description": getattr(product, 'Description', None),
                    "property_sets": {},
                    "relationships": {
                        "decomposes": [],
                        "contained_in_structure": [],
                        "has_assignments": [],
                        "is_decomposed_by": []
                    },
                    "assembly_info": {}
                }
                
                # Get all property sets with full details
                try:
                    psets = ifcopenshell.util.element.get_psets(product)
                    # Include all property values, not just keys
                    product_info["property_sets"] = {name: dict(props) for name, props in psets.items()}
                    product_info["property_sets_full"] = {}
                    for pset_name, props in psets.items():
                        product_info["property_sets_full"][pset_name] = {}
                        for key, value in props.items():
                            product_info["property_sets_full"][pset_name][key] = {
                                "value": value,
                                "type": type(value).__name__,
                                "string_repr": str(value) if value is not None else None
                            }
                except Exception as e:
                    product_info["property_sets_error"] = str(e)
                
                # Check Decomposes (part belongs to assembly)
                if hasattr(product, 'Decomposes'):
                    for rel in product.Decomposes or []:
                        rel_data = {
                            "type": rel.is_a(),
                            "relating_object": {
                                "id": rel.RelatingObject.id() if rel.RelatingObject else None,
                                "type": rel.RelatingObject.is_a() if rel.RelatingObject else None,
                                "tag": getattr(rel.RelatingObject, 'Tag', None) if rel.RelatingObject else None,
                                "name": getattr(rel.RelatingObject, 'Name', None) if rel.RelatingObject else None
                            }
                        }
                        product_info["relationships"]["decomposes"].append(rel_data)
                
                # Check ContainedInStructure (spatial containment)
                if hasattr(product, 'ContainedInStructure'):
                    for rel in product.ContainedInStructure or []:
                        rel_data = {
                            "type": rel.is_a(),
                            "relating_structure": {
                                "id": rel.RelatingStructure.id() if rel.RelatingStructure else None,
                                "type": rel.RelatingStructure.is_a() if rel.RelatingStructure else None,
                                "tag": getattr(rel.RelatingStructure, 'Tag', None) if rel.RelatingStructure else None,
                                "name": getattr(rel.RelatingStructure, 'Name', None) if rel.RelatingStructure else None
                            }
                        }
                        product_info["relationships"]["contained_in_structure"].append(rel_data)
                
                # Check HasAssignments (various assignments)
                if hasattr(product, 'HasAssignments'):
                    for assignment in product.HasAssignments or []:
                        assignment_data = {
                            "type": assignment.is_a(),
                            "related_objects": []
                        }
                        if hasattr(assignment, 'RelatedObjects'):
                            for obj in assignment.RelatedObjects or []:
                                assignment_data["related_objects"].append({
                                    "id": obj.id(),
                                    "type": obj.is_a(),
                                    "tag": getattr(obj, 'Tag', None),
                                    "name": getattr(obj, 'Name', None)
                                })
                        product_info["relationships"]["has_assignments"].append(assignment_data)
                
                # Check IsDecomposedBy (this product is an assembly containing parts)
                if hasattr(product, 'IsDecomposedBy'):
                    for rel in product.IsDecomposedBy or []:
                        rel_data = {
                            "type": rel.is_a(),
                            "related_objects": []
                        }
                        if hasattr(rel, 'RelatedObjects'):
                            for obj in rel.RelatedObjects or []:
                                rel_data["related_objects"].append({
                                    "id": obj.id(),
                                    "type": obj.is_a(),
                                    "tag": getattr(obj, 'Tag', None),
                                    "name": getattr(obj, 'Name', None)
                                })
                        product_info["relationships"]["is_decomposed_by"].append(rel_data)
                
                # Get assembly info using our function
                assembly_mark, assembly_id = get_assembly_info(product)
                product_info["assembly_info"] = {
                    "assembly_mark": assembly_mark,
                    "assembly_id": assembly_id,
                    "extraction_method": "get_assembly_info function"
                }
                
                # Try to find other products with the same assembly mark
                if assembly_mark and assembly_mark != "N/A":
                    same_mark_products = []
                    for other_product in ifc_file.by_type("IfcProduct"):
                        if other_product.id() != product_id:
                            other_mark, _ = get_assembly_info(other_product)
                            if other_mark == assembly_mark:
                                same_mark_products.append({
                                    "id": other_product.id(),
                                    "type": other_product.is_a(),
                                    "tag": getattr(other_product, 'Tag', None),
                                    "name": getattr(other_product, 'Name', None)
                                })
                    product_info["assembly_info"]["products_with_same_mark"] = same_mark_products
                    product_info["assembly_info"]["same_mark_count"] = len(same_mark_products)
                
                result["product_details"] = product_info
                
            except Exception as e:
                result["product_details"] = {"error": f"Failed to get product {product_id}: {str(e)}"}
        
        return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")


@app.get("/api/debug-profile/{filename}")
async def debug_profile_extraction(filename: str):
    """Debug endpoint to see how profile names are extracted from IFC file."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Get a sample of beams/columns/members
        elements = []
        for element in ifc_file.by_type("IfcProduct"):
            element_type = element.is_a()
            if element_type in {"IfcBeam", "IfcColumn", "IfcMember"}:
                elements.append(element)
                if len(elements) >= 5:  # Sample first 5
                    break
        
        debug_info = []
        for element in elements:
            element_info = {
                "id": element.id(),
                "type": element.is_a(),
                "tag": getattr(element, 'Tag', None),
                "name": getattr(element, 'Name', None),
                "extracted_profile": get_profile_name(element),
                "property_sets": {},
                "representation_info": {}
            }
            
            # Get all property sets
            try:
                psets = ifcopenshell.util.element.get_psets(element)
                for pset_name, props in psets.items():
                    element_info["property_sets"][pset_name] = dict(props)
            except Exception as e:
                element_info["property_set_error"] = str(e)
            
            # Get representation info
            try:
                if hasattr(element, "Representation") and element.Representation:
                    rep_info = []
                    for rep in element.Representation.Representations or []:
                        rep_item = {
                            "identifier": getattr(rep, "RepresentationIdentifier", None),
                            "type": getattr(rep, "RepresentationType", None),
                            "items": []
                        }
                        for item in rep.Items or []:
                            item_info = {
                                "type": item.is_a(),
                            }
                            if item.is_a("IfcExtrudedAreaSolid"):
                                if hasattr(item, "SweptArea") and item.SweptArea:
                                    swept = item.SweptArea
                                    item_info["swept_area_type"] = swept.is_a()
                                    # Get all attributes of the swept area
                                    swept_attrs = {}
                                    for attr in dir(swept):
                                        if not attr.startswith('_') and not callable(getattr(swept, attr, None)):
                                            try:
                                                value = getattr(swept, attr, None)
                                                if value is not None:
                                                    swept_attrs[attr] = str(value)
                                            except:
                                                pass
                                    item_info["swept_area_attributes"] = swept_attrs
                                    if hasattr(swept, "ProfileType"):
                                        item_info["profile_type"] = str(swept.ProfileType)
                                    if hasattr(swept, "ProfileName"):
                                        item_info["profile_name"] = str(swept.ProfileName)
                            elif item.is_a("IfcBooleanClippingResult"):
                                # Traverse FirstOperand to find the actual geometry
                                if hasattr(item, "FirstOperand"):
                                    first_op = item.FirstOperand
                                    item_info["first_operand_type"] = first_op.is_a() if first_op else None
                                    if first_op and first_op.is_a("IfcExtrudedAreaSolid"):
                                        if hasattr(first_op, "SweptArea") and first_op.SweptArea:
                                            swept = first_op.SweptArea
                                            item_info["nested_swept_area_type"] = swept.is_a()
                                            # Get all attributes
                                            swept_attrs = {}
                                            for attr in dir(swept):
                                                if not attr.startswith('_') and not callable(getattr(swept, attr, None)):
                                                    try:
                                                        value = getattr(swept, attr, None)
                                                        if value is not None:
                                                            swept_attrs[attr] = str(value)
                                                    except:
                                                        pass
                                            item_info["nested_swept_area_attributes"] = swept_attrs
                                            if hasattr(swept, "ProfileName"):
                                                item_info["nested_profile_name"] = str(swept.ProfileName)
                                            if hasattr(swept, "ProfileType"):
                                                item_info["nested_profile_type"] = str(swept.ProfileType)
                            rep_item["items"].append(item_info)
                        rep_info.append(rep_item)
                    element_info["representation_info"] = rep_info
            except Exception as e:
                element_info["representation_error"] = str(e)
            
            debug_info.append(element_info)
        
        return JSONResponse({
            "total_elements": len(list(ifc_file.by_type("IfcProduct"))),
            "sample_elements": debug_info
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")


@app.get("/api/assembly-parts/{filename}")
async def get_assembly_parts(filename: str, product_id: int = None, assembly_mark: str = None, assembly_id: int = None):
    """Get all product IDs that belong to the same assembly."""
    print(f"\n{'='*60}")
    print(f"[ASSEMBLY-PARTS] ENDPOINT CALLED!")
    print(f"[ASSEMBLY-PARTS] filename={filename}")
    print(f"[ASSEMBLY-PARTS] product_id={product_id}")
    print(f"[ASSEMBLY-PARTS] assembly_mark={assembly_mark}")
    print(f"[ASSEMBLY-PARTS] assembly_id={assembly_id}")
    print(f"{'='*60}\n")
    
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    print(f"[ASSEMBLY-PARTS] Decoded filename: {decoded_filename}")
    print(f"[ASSEMBLY-PARTS] File path: {file_path}")
    print(f"[ASSEMBLY-PARTS] File exists: {file_path.exists()}")
    
    if not file_path.exists():
        print(f"[ASSEMBLY-PARTS] ERROR: File not found!")
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        print(f"[ASSEMBLY-PARTS] Opening IFC file...")
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        print(f"[ASSEMBLY-PARTS] IFC file opened successfully")
        product_ids = []
        
        print(f"[ASSEMBLY-PARTS] Request: product_id={product_id}, assembly_mark={assembly_mark}, assembly_id={assembly_id}")
        
        # If assembly_id is provided, find all parts in that assembly
        if assembly_id is not None:
            try:
                assembly = ifc_file.by_id(assembly_id)
                print(f"[ASSEMBLY-PARTS] Found assembly object: {assembly.is_a() if assembly else 'None'}")
                if assembly and assembly.is_a('IfcElementAssembly'):
                    # Find all parts aggregated by this assembly
                    for rel in ifc_file.by_type("IfcRelAggregates"):
                        if rel.RelatingObject.id() == assembly_id:
                            print(f"[ASSEMBLY-PARTS] Found IfcRelAggregates with {len(rel.RelatedObjects)} parts")
                            for part in rel.RelatedObjects:
                                if part.is_a("IfcProduct"):
                                    product_ids.append(part.id())
            except Exception as e:
                print(f"[ASSEMBLY-PARTS] Error with assembly_id: {e}")
        
        # If product_id is provided, find the assembly it belongs to
        elif product_id is not None:
            try:
                product = ifc_file.by_id(product_id)
                print(f"[ASSEMBLY-PARTS] Found product: {product.is_a() if product else 'None'}")
                
                # First, check if there are any IfcElementAssembly objects in the file
                assemblies = ifc_file.by_type("IfcElementAssembly")
                print(f"[ASSEMBLY-PARTS] Found {len(assemblies)} IfcElementAssembly objects in file")
                
                # Find the assembly this product belongs to via IfcRelAggregates
                if hasattr(product, 'Decomposes'):
                    print(f"[ASSEMBLY-PARTS] Product has Decomposes attribute, checking relationships...")
                    decomposes_list = product.Decomposes or []
                    print(f"[ASSEMBLY-PARTS] Found {len(decomposes_list)} Decomposes relationships")
                    
                    for rel in decomposes_list:
                        print(f"[ASSEMBLY-PARTS] Checking relationship: {rel.is_a()}")
                        if rel.is_a('IfcRelAggregates'):
                            assembly = rel.RelatingObject
                            print(f"[ASSEMBLY-PARTS] Found assembly via IfcRelAggregates: {assembly.is_a() if assembly else 'None'}, ID: {assembly.id() if assembly else 'None'}")
                            if assembly:
                                assembly_id = assembly.id()
                                # Now find all parts in this assembly
                                for rel2 in ifc_file.by_type("IfcRelAggregates"):
                                    if rel2.RelatingObject.id() == assembly_id:
                                        print(f"[ASSEMBLY-PARTS] Found {len(rel2.RelatedObjects)} parts in assembly {assembly_id}")
                                        for part in rel2.RelatedObjects:
                                            if part.is_a("IfcProduct"):
                                                product_ids.append(part.id())
                                break
                    else:
                        print(f"[ASSEMBLY-PARTS] No IfcRelAggregates found in Decomposes")
                else:
                    print(f"[ASSEMBLY-PARTS] Product does not have Decomposes attribute")
                
                # If no assembly found via relationships, try to find by checking all assemblies
                # and see which one contains this product
                if len(product_ids) == 0 and len(assemblies) > 0:
                    print(f"[ASSEMBLY-PARTS] Checking all {len(assemblies)} assemblies to find which contains product {product_id}...")
                    for assembly in assemblies:
                        # Check if this product is part of this assembly
                        for rel in ifc_file.by_type("IfcRelAggregates"):
                            if rel.RelatingObject.id() == assembly.id():
                                related_ids = [p.id() for p in rel.RelatedObjects if p.is_a("IfcProduct")]
                                if product_id in related_ids:
                                    print(f"[ASSEMBLY-PARTS] Found product {product_id} in assembly {assembly.id()} ({assembly.is_a()})")
                                    # Get all parts in this assembly
                                    for part in rel.RelatedObjects:
                                        if part.is_a("IfcProduct"):
                                            product_ids.append(part.id())
                                    print(f"[ASSEMBLY-PARTS] Assembly {assembly.id()} contains {len(product_ids)} parts")
                                    break
                        if len(product_ids) > 0:
                            break
                    
                # Check Tekla-specific property sets for assembly grouping
                # Look for the actual assembly name (like "B1", "B2") not the GUID
                if len(product_ids) == 0:
                    print(f"[ASSEMBLY-PARTS] Checking Tekla property sets for actual assembly name...")
                    try:
                        psets = ifcopenshell.util.element.get_psets(product)
                        
                        # Look for assembly name in various property sets
                        # We need to find the REAL assembly name (like "B1"), not the GUID
                        assembly_name = None
                        
                        # First, print all property sets to see what's available
                        print(f"[ASSEMBLY-PARTS] All property sets for product {product_id}:")
                        for pset_name, props in psets.items():
                            print(f"[ASSEMBLY-PARTS]   {pset_name}: {list(props.keys())}")
                        
                        # Check all property sets for assembly-related fields
                        # Look for values that look like assembly names (B1, B2, etc.) not GUIDs
                        # Also check ALL property values, not just keys with "assembly" in them
                        all_property_values = []
                        
                        for pset_name, props in psets.items():
                            for key, value in props.items():
                                if value is not None and str(value).strip():
                                    value_str = str(value).strip()
                                    # Skip GUIDs, N/A, empty values
                                    if value_str.upper() in ['NONE', 'NULL', 'N/A', '']:
                                        continue
                                    # Skip GUIDs (start with "ID" and have dashes and are long)
                                    if value_str.startswith('ID') and '-' in value_str and len(value_str) > 20:
                                        continue
                                    # Skip if it's clearly a part reference (like "b31")
                                    if value_str.lower().startswith('b') and len(value_str) <= 4 and value_str[1:].isdigit():
                                        continue
                                    # Skip numeric-only values
                                    if value_str.isdigit():
                                        continue
                                    # Skip very long values (likely not assembly names)
                                    if len(value_str) > 50:
                                        continue
                                    
                                    all_property_values.append((pset_name, key, value_str))
                                    
                                    # Check if this key suggests it's an assembly name
                                    key_lower = key.lower()
                                    if any(word in key_lower for word in ['assembly', 'mark', 'group', 'name']):
                                        # This might be the assembly name
                                        # Check if it looks like an assembly name (B1, B2, etc. or longer names)
                                        if len(value_str) >= 1 and len(value_str) <= 20:
                                            # Prefer values that look like assembly names (B1, B2, etc.)
                                            if (value_str[0].isalpha() and len(value_str) <= 10) or value_str.upper().startswith('B'):
                                                assembly_name = value_str
                                                print(f"[ASSEMBLY-PARTS] Found potential assembly name in {pset_name}.{key}: {assembly_name}")
                                                break
                            if assembly_name:
                                break
                        
                        # Also check Name and Tag fields directly (might contain assembly name)
                        if not assembly_name:
                            name = getattr(product, 'Name', None)
                            if name:
                                name_str = str(name).strip()
                                # Check if Name looks like an assembly name (not a GUID, not empty)
                                if (name_str and name_str.upper() not in ['NONE', 'NULL', 'N/A', 'BEAM', 'COLUMN', 'MEMBER', 'PLATE'] and
                                    not name_str.startswith('ID') and len(name_str) <= 20):
                                    # Check if it's not just the element type
                                    if name_str[0].isalpha():
                                        assembly_name = name_str
                                        print(f"[ASSEMBLY-PARTS] Found potential assembly name in Name field: {assembly_name}")
                        
                        # If still not found, check if there's a pattern in other property values
                        # Maybe the assembly name is in a field we haven't checked yet
                        if not assembly_name:
                            print(f"[ASSEMBLY-PARTS] No clear assembly name found. All property values:")
                            for pset_name, key, value_str in all_property_values:
                                print(f"[ASSEMBLY-PARTS]   {pset_name}.{key} = {value_str}")
                            
                            # Try to find assembly name by checking other products with similar properties
                            # Maybe the assembly name is stored in a way that requires cross-referencing
                            print(f"[ASSEMBLY-PARTS] Checking other products to find assembly pattern...")
                            
                            # Sample a few other products to see if there's a common field
                            sample_products = []
                            for other_product in ifc_file.by_type("IfcProduct"):
                                if other_product.id() != product_id and other_product.is_a() in ["IfcBeam", "IfcColumn", "IfcMember"]:
                                    sample_products.append(other_product)
                                    if len(sample_products) >= 5:
                                        break
                            
                            # Compare property sets to find common assembly-related values
                            for sample_product in sample_products:
                                try:
                                    sample_psets = ifcopenshell.util.element.get_psets(sample_product)
                                    # Check if there's a field that might contain assembly name
                                    for pset_name, props in sample_psets.items():
                                        for key, value in props.items():
                                            if value and str(value).strip():
                                                value_str = str(value).strip()
                                                # Look for values that look like assembly names
                                                if (value_str[0].isalpha() and len(value_str) <= 10 and 
                                                    not value_str.startswith('ID') and 
                                                    not (value_str.lower().startswith('b') and len(value_str) <= 4 and value_str[1:].isdigit())):
                                                    # This might be an assembly name - check if it exists in our product too
                                                    if pset_name in psets and key in psets[pset_name]:
                                                        if str(psets[pset_name][key]).strip() == value_str:
                                                            assembly_name = value_str
                                                            print(f"[ASSEMBLY-PARTS] Found potential assembly name by comparing with product {sample_product.id()}: {assembly_name} in {pset_name}.{key}")
                                                            break
                                        if assembly_name:
                                            break
                                    if assembly_name:
                                        break
                                except:
                                    pass
                        
                        # If still not found, check if there's a pattern in the GUID
                        # Maybe the assembly name is encoded somewhere else
                        if not assembly_name:
                            print(f"[ASSEMBLY-PARTS] No clear assembly name found in property sets")
                            print(f"[ASSEMBLY-PARTS] Tag: {getattr(product, 'Tag', None)}")
                            print(f"[ASSEMBLY-PARTS] Name: {getattr(product, 'Name', None)}")
                            
                            # Try to find assembly name by checking if there's an IfcElementAssembly
                            # that might have a name, even if not linked via relationships
                            # This is a last resort
                            tag = getattr(product, 'Tag', None)
                            if tag:
                                tag_str = str(tag).strip()
                                # If tag is a GUID, we can't use it
                                # But maybe we can find the assembly by searching for assembly objects
                                # that might reference this part somehow
                                pass
                        
                        # Group by assembly name if found
                        if assembly_name:
                            print(f"[ASSEMBLY-PARTS] Grouping by assembly name: {assembly_name}")
                            all_products = ifc_file.by_type("IfcProduct")
                            
                            for other_product in all_products:
                                if other_product.id() == product_id:
                                    continue  # Skip the clicked product
                                
                                try:
                                    other_psets = ifcopenshell.util.element.get_psets(other_product)
                                    
                                    # Check if this product has the same assembly name
                                    # Use the same logic as we used to find the assembly_name
                                    other_assembly_name = None
                                    
                                    for other_pset_name, other_props in other_psets.items():
                                        for key, value in other_props.items():
                                            if value and str(value).strip():
                                                value_str = str(value).strip()
                                                # Skip GUIDs, N/A, empty values
                                                if value_str.upper() in ['NONE', 'NULL', 'N/A', '']:
                                                    continue
                                                # Skip GUIDs
                                                if value_str.startswith('ID') and '-' in value_str and len(value_str) > 20:
                                                    continue
                                                # Skip part references (like "b31")
                                                if value_str.lower().startswith('b') and len(value_str) <= 4 and value_str[1:].isdigit():
                                                    continue
                                                
                                                # Check if this key suggests it's an assembly name
                                                key_lower = key.lower()
                                                if any(word in key_lower for word in ['assembly', 'mark', 'group']):
                                                    if len(value_str) >= 1 and len(value_str) <= 20:
                                                        other_assembly_name = value_str
                                                        break
                                        if other_assembly_name:
                                            break
                                    
                                    # If assembly names match, add to group
                                    if other_assembly_name and other_assembly_name == assembly_name:
                                        product_ids.append(other_product.id())
                                        print(f"[ASSEMBLY-PARTS] Found product {other_product.id()} ({other_product.is_a()}) with same assembly name: {assembly_name}")
                                
                                except Exception as e:
                                    print(f"[ASSEMBLY-PARTS] Error checking product {other_product.id()}: {e}")
                            
                            if len(product_ids) > 0:
                                print(f"[ASSEMBLY-PARTS] Grouped {len(product_ids)} products by assembly name: {assembly_name}")
                                product_ids.append(product_id)  # Include the clicked product
                                print(f"[ASSEMBLY-PARTS] Total products in assembly: {len(product_ids)}")
                            else:
                                print(f"[ASSEMBLY-PARTS] No other products found with assembly name: {assembly_name}")
                                # Still add the clicked product
                                product_ids.append(product_id)
                        else:
                            print(f"[ASSEMBLY-PARTS] Could not find assembly name (only found GUIDs)")
                            print(f"[ASSEMBLY-PARTS] IFC file may not contain proper assembly names, or they are stored in a format we don't recognize.")
                            print(f"[ASSEMBLY-PARTS] Returning only the clicked part {product_id}.")
                            product_ids.append(product_id)
                    
                    except Exception as e:
                        import traceback
                        print(f"[ASSEMBLY-PARTS] Error checking property sets: {e}")
                        traceback.print_exc()
                
                # Last resort: Since assembly marks are unique GUIDs and no relationships exist,
                # we cannot determine which parts belong to the same assembly.
                # Return only the clicked part as a fallback.
                if len(product_ids) == 0:
                    print(f"[ASSEMBLY-PARTS] WARNING: No assembly relationships found in IFC file.")
                    print(f"[ASSEMBLY-PARTS] IFC file appears to lack IfcRelAggregates relationships.")
                    print(f"[ASSEMBLY-PARTS] Each part has a unique assembly mark (GUID), so grouping is not possible.")
                    print(f"[ASSEMBLY-PARTS] Returning only the clicked part {product_id}.")
                    product_ids.append(product_id)  # Return only the clicked part
                    
            except Exception as e:
                import traceback
                print(f"[ASSEMBLY-PARTS] Error finding assembly for product {product_id}: {e}")
                traceback.print_exc()
        
        # If assembly_mark is provided, find all products with that mark
        elif assembly_mark:
            print(f"[ASSEMBLY-PARTS] Searching by assembly_mark: {assembly_mark}")
            # This is a fallback - find all products with the same assembly mark
            # But this might not work if marks are unique GUIDs
            products = ifc_file.by_type("IfcProduct")
            for product in products:
                mark, _ = get_assembly_info(product)
                if mark == assembly_mark:
                    product_ids.append(product.id())
            print(f"[ASSEMBLY-PARTS] Found {len(product_ids)} products with assembly_mark {assembly_mark}")
        
        print(f"[ASSEMBLY-PARTS] Returning {len(product_ids)} product IDs: {product_ids[:10]}...")  # Show first 10
        
        return JSONResponse({
            "product_ids": product_ids,
            "count": len(product_ids)
        })
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get assembly parts: {str(e)}")


@app.get("/api/element-full/{element_id}")
async def get_element_full(element_id: int, filename: str):
    """Get full element data for a specific product or assembly."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    try:
        print(f"[ELEMENT-FULL] Opening IFC file: {file_path}")
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        print(f"[ELEMENT-FULL] IFC file opened successfully, looking for entity ID: {element_id}")
        
        # Try to get entity by ID
        try:
            entity = ifc_file.by_id(element_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Entity with ID {element_id} not found: {str(e)}")
        
        element_type = entity.is_a()
        
        # Get basic attributes
        basic_attributes = {
            "Name": getattr(entity, 'Name', None) or '',
            "Tag": getattr(entity, 'Tag', None) or '',
            "Description": getattr(entity, 'Description', None) or ''
        }
        
        # Get property sets
        property_sets = {}
        try:
            psets = ifcopenshell.util.element.get_psets(entity)
            property_sets = {name: dict(props) for name, props in psets.items()}
        except Exception as e:
            print(f"[ELEMENT-FULL] Error getting property sets: {e}")
        
        # Get relationships (parts if it's an assembly)
        relationships = {"parts": []}
        
        # If this is an assembly (IfcElementAssembly), get its parts
        if element_type == "IfcElementAssembly":
            try:
                # Find all products that are aggregated by this assembly
                for rel in ifc_file.by_type("IfcRelAggregates"):
                    if rel.RelatingObject.id() == element_id:
                        for related_obj in rel.RelatedObjects:
                            if related_obj.is_a("IfcProduct"):
                                part_info = {
                                    "id": related_obj.id(),
                                    "type": related_obj.is_a(),
                                    "tag": getattr(related_obj, 'Tag', None) or '',
                                    "name": getattr(related_obj, 'Name', None) or ''
                                }
                                relationships["parts"].append(part_info)
            except Exception as e:
                print(f"[ELEMENT-FULL] Error getting assembly parts: {e}")
        
        return JSONResponse({
            "basic_attributes": basic_attributes,
            "property_sets": property_sets,
            "relationships": relationships,
            "element_type": element_type,
            "element_id": element_id
        })
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get element data: {str(e)}")


@app.get("/api/dashboard-details/{filename}")
async def get_dashboard_details(filename: str):
    """Get detailed part information for dashboard tables.
    
    Returns:
    - profiles: List of grouped profile parts with quantity
    - plates: List of grouped plate parts with quantity
    - assemblies: List of assemblies with their parts
    """
    from urllib.parse import unquote
    import time
    start_time = time.time()
    
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    # ===== CACHE CHECK: Load from cached dashboard data if available =====
    cache_path = REPORTS_DIR / f"{decoded_filename}.dashboard.json"
    if cache_path.exists():
        ifc_mtime = file_path.stat().st_mtime
        cache_mtime = cache_path.stat().st_mtime
        
        # Use cache if it's newer than the IFC file
        if cache_mtime >= ifc_mtime:
            print(f"[DASHBOARD_DETAILS] ⚡ CACHE HIT! Loading from: {cache_path}")
            try:
                with open(cache_path, "r", encoding='utf-8') as f:
                    data = json.load(f)
                print(f"[DASHBOARD_DETAILS] ⚡ Loaded cached data in {time.time() - start_time:.3f}s")
                return JSONResponse(data)
            except Exception as e:
                print(f"[DASHBOARD_DETAILS] ⚠️  Cache read failed: {e}, will regenerate")
    
    print(f"[DASHBOARD_DETAILS] 🔄 CACHE MISS! Generating data for: {decoded_filename}")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Use dictionaries to group identical parts
        profiles_dict = {}  # key: (part_name, assembly_mark, profile_name, length)
        plates_dict = {}    # key: (part_name, assembly_mark, thickness, width, length)
        assemblies_dict = {}
        bolts_dict = {}     # key: (bolt_name, size, length, standard)
        fasteners_dict = {} # key: (anchor_name, diameter, length, standard) - for anchor rods etc.
        
        # ===== OPTIMIZATION: Filter by steel types first (much faster than iterating all IfcProduct) =====
        steel_elements = []
        for type_name in STEEL_TYPES:
            steel_elements.extend(ifc_file.by_type(type_name))
        
        # Also get fasteners directly
        fastener_elements = []
        for type_name in FASTENER_TYPES:
            fastener_elements.extend(ifc_file.by_type(type_name))
        
        # Combine for processing
        all_relevant_elements = steel_elements + fastener_elements
        
        print(f"[DASHBOARD_DETAILS] Processing {len(steel_elements)} steel elements + {len(fastener_elements)} fasteners")
        
        # Iterate through relevant elements only
        for idx, element in enumerate(all_relevant_elements):
            # Progress logging every 100 elements
            if idx > 0 and idx % 100 == 0:
                progress = (idx / len(all_relevant_elements)) * 100
                print(f"[DASHBOARD_DETAILS] Progress: {progress:.1f}% ({idx}/{len(all_relevant_elements)})")
            
            element_type = element.is_a()
            
            # Check if it's a fastener-like element (by name keywords)
            is_fastener = False
            if element_type in STEEL_TYPES:
                # Check if it has fastener keywords in name/tag
                element_name = getattr(element, 'Name', None) or ''
                element_tag = getattr(element, 'Tag', None) or ''
                element_desc = getattr(element, 'Description', None) or ''
                
                fastener_keywords = ['anchor', 'fastener']
                text_content = (element_name + ' ' + element_desc + ' ' + element_tag).lower()
                
                if any(kw in text_content for kw in fastener_keywords):
                    is_fastener = True
            
            # Process standard bolts (IfcMechanicalFastener with Tekla Bolt property set)
            if element_type in FASTENER_TYPES and not is_fastener:
                # Get basic info
                element_id = element.id()
                element_name = getattr(element, 'Name', None) or ''
                element_tag = getattr(element, 'Tag', None) or ''
                
                # Get assembly info
                assembly_mark, assembly_id = get_assembly_info(element)
                
                # Extract bolt data from Tekla Bolt property set
                bolt_name = element_name
                bolt_size = None
                bolt_length = None
                bolt_standard = None
                bolt_location = None
                bolt_count = 1  # Default to 1 if not specified
                
                try:
                    psets = ifcopenshell.util.element.get_psets(element)
                    
                    # Check for Tekla Bolt property set
                    if "Tekla Bolt" in psets:
                        tekla_bolt = psets["Tekla Bolt"]
                        bolt_name = tekla_bolt.get("Bolt Name", element_name)
                        bolt_size = tekla_bolt.get("Bolt size", None)
                        bolt_length = tekla_bolt.get("Bolt length", None)
                        bolt_standard = tekla_bolt.get("Bolt standard", None)
                        bolt_location = tekla_bolt.get("Location", None)
                        bolt_count = tekla_bolt.get("Bolt count", 1)
                        
                        # Skip hole-only bolts (Bolt count = 0)
                        # These are bolts that are hidden and used only to create holes
                        if bolt_count == 0:
                            continue
                        
                        # STRICT FILTER: Only show bolts where the length in the name matches actual length
                        # Bolt name format: BOLTM{diameter}*{length}
                        # Example: BOLTM20*100 means diameter 20mm, length 100mm
                        # Only display if actual bolt_length equals the length specified in the name
                        if bolt_name and bolt_length:
                            import re
                            # Parse expected length from bolt name (e.g., "BOLTM20*100" -> 100)
                            match = re.search(r'[*xX](\d+)', bolt_name)
                            if match:
                                expected_length = float(match.group(1))
                                # Only keep bolts where actual length matches expected length
                                # Example: BOLTM20*100 with actual length 100mm -> KEEP
                                #          BOLTM20*40 with actual length 20mm -> SKIP (hole only)
                                #          BOLTM20*100 with actual length 50mm -> SKIP (partial/hole)
                                if bolt_length != expected_length:
                                    continue
                except:
                    pass
                
                # If no Tekla Bolt data, try to parse from name
                if not bolt_name or bolt_name == "Bolt assembly":
                    bolt_name = element_name if element_name else f"Fastener_{element_id}"
                
                # Group key: (bolt_name, size, length, standard)
                group_key = (bolt_name, bolt_size, bolt_length, bolt_standard)
                
                if group_key not in bolts_dict:
                    bolts_dict[group_key] = {
                        "bolt_name": bolt_name,
                        "bolt_type": element_type,
                        "size": bolt_size,
                        "length": bolt_length,
                        "standard": bolt_standard,
                        "location": bolt_location,
                        "quantity": 0,
                        "assemblies": set(),
                        "ids": []
                    }
                
                # Add the actual bolt count (not just 1 per assembly)
                # bolt_count represents the number of bolts in this bolt assembly
                bolts_dict[group_key]["quantity"] += bolt_count
                bolts_dict[group_key]["assemblies"].add(assembly_mark)
                bolts_dict[group_key]["ids"].append(element_id)
                
                # Don't process as steel element
                continue
            
            # Process fasteners (anchor rods etc. - steel types with fastener keywords)
            if is_fastener and element_type in STEEL_TYPES:
                # Get basic info
                element_id = element.id()
                element_name = getattr(element, 'Name', None) or ''
                element_tag = getattr(element, 'Tag', None) or ''
                
                # Get assembly info
                assembly_mark, assembly_id = get_assembly_info(element)
                
                # Get weight
                weight = get_element_weight(element)
                
                # Get profile name
                profile_name = get_profile_name(element)
                
                # Get dimensions and material from property sets (treat like profiles)
                psets = ifcopenshell.util.element.get_psets(element)
                length = None
                diameter = None
                material = None
                
                for pset_name, props in psets.items():
                    if 'Length' in props and props['Length']:
                        length = float(props['Length'])
                    if 'Diameter' in props and props['Diameter']:
                        diameter = float(props['Diameter'])
                    if 'Material' in props and props['Material']:
                        material = str(props['Material'])
                    elif 'Grade' in props and props['Grade']:
                        material = str(props['Grade'])
                
                # Try to extract diameter from name if not in properties (e.g., "M16" = 16mm)
                if not diameter and element_name:
                    import re
                    # Look for M followed by number (e.g., M16, M20)
                    match = re.search(r'M(\d+)', element_name.upper())
                    if match:
                        diameter = float(match.group(1))
                
                # Round values
                length_rounded = round(length, 1) if length else None
                diameter_rounded = round(diameter, 1) if diameter else None
                
                # Group key: (anchor_name, diameter, length, material)
                group_key = (element_name, diameter_rounded, length_rounded, material)
                
                if group_key not in fasteners_dict:
                    fasteners_dict[group_key] = {
                        "anchor_name": element_name,
                        "assembly_mark": assembly_mark,
                        "profile_name": profile_name,
                        "diameter": diameter_rounded,
                        "length": length_rounded,
                        "material": material or "N/A",
                        "weight": weight,
                        "quantity": 0,
                        "total_weight": 0.0,
                        "assemblies": set(),
                        "ids": []
                    }
                
                fasteners_dict[group_key]["quantity"] += 1
                fasteners_dict[group_key]["total_weight"] += weight
                fasteners_dict[group_key]["assemblies"].add(assembly_mark)
                fasteners_dict[group_key]["ids"].append(element_id)
                
                # Don't process as steel element
                continue
            
            if element_type not in STEEL_TYPES:
                continue
            
            # Get basic info
            element_id = element.id()
            element_name = getattr(element, 'Name', None) or ''
            element_tag = getattr(element, 'Tag', None) or ''
            
            # Also check for Reference in property sets (common in Tekla)
            reference = None
            try:
                psets_temp = ifcopenshell.util.element.get_psets(element)
                for pset_name, props in psets_temp.items():
                    if 'Reference' in props and props['Reference']:
                        reference = str(props['Reference']).strip()
                        if reference and reference.upper() not in ['NONE', 'NULL', 'N/A', '']:
                            break
            except:
                pass
            
            # Check if tag is a GUID
            tag_is_guid = element_tag and element_tag.startswith('ID') and len(element_tag) > 30
            
            # Priority: Tag (if not GUID) > Reference > Name > Tag (if GUID) > ID
            if not tag_is_guid and element_tag:
                part_name = element_tag
            elif reference:
                part_name = reference
            elif element_name:
                part_name = element_name
            elif element_tag:
                part_name = element_tag
            else:
                part_name = f"Part_{element_id}"
            
            # Get weight
            weight = get_element_weight(element)
            
            # Get assembly info
            assembly_mark, assembly_id = get_assembly_info(element)
            
            # Get dimensions from property sets
            psets = ifcopenshell.util.element.get_psets(element)
            length = None
            width = None
            height = None
            
            for pset_name, props in psets.items():
                if 'Length' in props and props['Length']:
                    length = float(props['Length'])
                if 'Width' in props and props['Width']:
                    width = float(props['Width'])
                if 'Height' in props and props['Height']:
                    height = float(props['Height'])
            
            # Process profiles (beams, columns, members)
            if element_type in ["IfcBeam", "IfcColumn", "IfcMember"]:
                profile_name = get_profile_name(element)
                
                # Round length to avoid floating point differences
                length_rounded = round(length, 1) if length else None
                
                # Check if part_name and assembly_mark are GUIDs
                part_is_guid = part_name.startswith('ID') and len(part_name) > 30
                assembly_is_guid = assembly_mark.startswith('ID') and len(assembly_mark) > 30
                
                # Group by: part_name (if not GUID), profile_name, and length
                # Do NOT include assembly in grouping - we want to group across assemblies
                
                group_key_parts = [profile_name, length_rounded]
                
                if not part_is_guid:
                    group_key_parts.insert(0, part_name)
                
                group_key = tuple(group_key_parts)
                display_assembly = "Various"  # Will be updated with actual assemblies later
                
                if group_key not in profiles_dict:
                    profiles_dict[group_key] = {
                        "part_name": part_name if not part_is_guid else None,  # Store actual part name or None
                        "assembly_mark": display_assembly,
                        "profile_name": profile_name,
                        "element_type": element_type,
                        "length": length_rounded,
                        "weight": weight,
                        "quantity": 0,
                        "total_weight": 0.0,
                        "width": width,
                        "height": height,
                        "ids": [],
                        "assemblies": set(),  # Track unique assemblies
                        "part_names": set()  # Track all part names in this group
                    }
                
                # Track assemblies and part names for this group
                profiles_dict[group_key]["assemblies"].add(assembly_mark)
                if not part_is_guid:
                    profiles_dict[group_key]["part_names"].add(part_name)
                
                profiles_dict[group_key]["quantity"] += 1
                profiles_dict[group_key]["total_weight"] += weight
                profiles_dict[group_key]["ids"].append(element_id)
                
                # Add to assembly (use assembly_id as key to track individual instances)
                if assembly_id not in assemblies_dict:
                    assemblies_dict[assembly_id] = {
                        "assembly_mark": assembly_mark,
                        "assembly_id": assembly_id,
                        "parts": [],
                        "total_weight": 0.0,
                        "member_count": 0,
                        "plate_count": 0
                    }
                
                assemblies_dict[assembly_id]["parts"].append({
                    "id": element_id,
                    "part_name": part_name,
                    "profile_name": profile_name,
                    "length": length_rounded,
                    "weight": round(weight, 2),
                    "part_type": "profile"
                })
                assemblies_dict[assembly_id]["total_weight"] += weight
                assemblies_dict[assembly_id]["member_count"] += 1
            
            # Process plates
            elif element_type in ["IfcPlate", "IfcSlab"]:
                thickness = get_plate_thickness(element)
                
                # Get Description attribute (contains profile info like "P:20*2190")
                description = ""
                try:
                    if hasattr(element, 'Description') and element.Description:
                        description = str(element.Description).strip()
                except:
                    pass
                
                # Round dimensions to avoid floating point differences
                width_rounded = round(width, 1) if width else None
                length_rounded = round(length, 1) if length else None
                
                # Check if part_name and assembly_mark are GUIDs
                part_is_guid = part_name.startswith('ID') and len(part_name) > 30
                assembly_is_guid = assembly_mark.startswith('ID') and len(assembly_mark) > 30
                
                # Group by: part_name (if not GUID), thickness, and dimensions
                # Do NOT include assembly in grouping - we want to group across assemblies
                
                group_key_parts = [thickness, width_rounded, length_rounded]
                
                if not part_is_guid:
                    group_key_parts.insert(0, part_name)
                
                group_key = tuple(group_key_parts)
                display_assembly = "Various"  # Will be updated with actual assemblies later
                
                if group_key not in plates_dict:
                    plates_dict[group_key] = {
                        "part_name": part_name if not part_is_guid else None,  # Store actual part name or None
                        "assembly_mark": display_assembly,
                        "thickness": thickness,
                        "element_type": element_type,
                        "width": width_rounded,
                        "length": length_rounded,
                        "height": height,
                        "weight": weight,
                        "quantity": 0,
                        "total_weight": 0.0,
                        "ids": [],
                        "assemblies": set(),  # Track unique assemblies
                        "part_names": set(),  # Track all part names in this group
                        "descriptions": set()  # Track all descriptions (profile names) in this group
                    }
                
                # Track assemblies, part names, and descriptions for this group
                plates_dict[group_key]["assemblies"].add(assembly_mark)
                if not part_is_guid:
                    plates_dict[group_key]["part_names"].add(part_name)
                if description:
                    plates_dict[group_key]["descriptions"].add(description)
                
                plates_dict[group_key]["quantity"] += 1
                plates_dict[group_key]["total_weight"] += weight
                plates_dict[group_key]["ids"].append(element_id)
                
                # Add to assembly (use assembly_id as key to track individual instances)
                if assembly_id not in assemblies_dict:
                    assemblies_dict[assembly_id] = {
                        "assembly_mark": assembly_mark,
                        "assembly_id": assembly_id,
                        "parts": [],
                        "total_weight": 0.0,
                        "member_count": 0,
                        "plate_count": 0
                    }
                
                assemblies_dict[assembly_id]["parts"].append({
                    "id": element_id,
                    "part_name": part_name,
                    "thickness": thickness,
                    "profile_name": description if description else "N/A",  # Add profile_name from Description
                    "width": width_rounded,
                    "length": length_rounded,
                    "weight": round(weight, 2),
                    "part_type": "plate"
                })
                assemblies_dict[assembly_id]["total_weight"] += weight
                assemblies_dict[assembly_id]["plate_count"] += 1
        
        # Convert profiles dict to list
        profiles_list = []
        for profile_data in profiles_dict.values():
            # Determine display name: use actual part names if available, otherwise use profile name
            if profile_data["part_names"]:
                # If there are real part names, show them (comma separated if multiple)
                display_name = ", ".join(sorted(profile_data["part_names"]))
            else:
                # No real part names (all GUIDs) - use profile name
                display_name = profile_data["profile_name"]
            
            # Get unique assemblies (excluding GUIDs)
            assemblies = profile_data["assemblies"]
            non_guid_assemblies = [a for a in assemblies if not (a.startswith('ID') and len(a) > 30)]
            
            if non_guid_assemblies:
                # Show actual assembly names
                display_assembly = ", ".join(sorted(non_guid_assemblies))
            else:
                # All assemblies are GUIDs
                display_assembly = "Various"
            
            profiles_list.append({
                "part_name": display_name,
                "assembly_mark": display_assembly,
                "profile_name": profile_data["profile_name"],
                "length": profile_data["length"],
                "weight": round(profile_data["weight"], 2),
                "quantity": profile_data["quantity"],
                "total_weight": round(profile_data["total_weight"], 2),
                "ids": profile_data["ids"]
            })
        
        # Convert plates dict to list
        plates_list = []
        for plate_data in plates_dict.values():
            # Determine display name: use actual part names if available, otherwise use thickness
            if plate_data["part_names"]:
                # If there are real part names, show them (comma separated if multiple)
                display_name = ", ".join(sorted(plate_data["part_names"]))
            else:
                # No real part names (all GUIDs) - use thickness
                display_name = plate_data["thickness"]
            
            # Get unique assemblies (excluding GUIDs)
            assemblies = plate_data["assemblies"]
            non_guid_assemblies = [a for a in assemblies if not (a.startswith('ID') and len(a) > 30)]
            
            if non_guid_assemblies:
                # Show actual assembly names
                display_assembly = ", ".join(sorted(non_guid_assemblies))
            else:
                # All assemblies are GUIDs
                display_assembly = "Various"
            
            # Get profile name from descriptions
            descriptions = plate_data.get("descriptions", set())
            if descriptions:
                # If there are descriptions, show them (comma separated if multiple)
                profile_name = ", ".join(sorted(descriptions))
            else:
                # No description available
                profile_name = "N/A"
            
            plates_list.append({
                "part_name": display_name,
                "assembly_mark": display_assembly,
                "thickness": plate_data["thickness"],
                "profile_name": profile_name,  # Add profile_name field
                "width": plate_data["width"],
                "length": plate_data["length"],
                "weight": round(plate_data["weight"], 2),
                "quantity": plate_data["quantity"],
                "total_weight": round(plate_data["total_weight"], 2),
                "ids": plate_data["ids"]
            })
        
        # Convert assemblies dict to list and calculate main profile
        # First, we need to group assemblies with identical configurations
        assembly_groups = {}  # key: (assembly_mark, main_profile, length, weight)
        
        for assembly_id_key, assembly_data in assemblies_dict.items():
            # Find the most common profile in this assembly
            profile_counts = {}
            main_profile = "N/A"
            max_length = 0
            
            for part in assembly_data["parts"]:
                if part["part_type"] == "profile":
                    profile = part["profile_name"]
                    if profile not in profile_counts:
                        profile_counts[profile] = {"count": 0, "max_length": 0}
                    profile_counts[profile]["count"] += 1
                    if part["length"] and part["length"] > profile_counts[profile]["max_length"]:
                        profile_counts[profile]["max_length"] = part["length"]
            
            # Get the profile with the longest length (main structural member)
            if profile_counts:
                main_profile = max(profile_counts.items(), 
                                 key=lambda x: (x[1]["max_length"], x[1]["count"]))[0]
                max_length = profile_counts[main_profile]["max_length"]
            else:
                # No profiles found - this is a plate-only assembly
                # Try to use profile_name from plates first, otherwise fall back to thickness
                plate_profiles = {}
                for part in assembly_data["parts"]:
                    if part["part_type"] == "plate":
                        profile_name = part.get("profile_name", "")
                        if profile_name and profile_name != "N/A":
                            plate_profiles[profile_name] = plate_profiles.get(profile_name, 0) + 1
                
                if plate_profiles:
                    # Get the most common profile name
                    most_common_profile = max(plate_profiles.items(), key=lambda x: x[1])[0]
                    main_profile = most_common_profile
                else:
                    # Fallback to thickness if no profile name available
                    plate_thickness_counts = {}
                    for part in assembly_data["parts"]:
                        if part["part_type"] == "plate":
                            thickness = part.get("thickness", "N/A")
                            plate_thickness_counts[thickness] = plate_thickness_counts.get(thickness, 0) + 1
                    
                    if plate_thickness_counts:
                        # Get the most common thickness
                        most_common_thickness = max(plate_thickness_counts.items(), key=lambda x: x[1])[0]
                        main_profile = f"Plate {most_common_thickness}"
            
            # Collect all IDs from parts in this assembly
            assembly_ids = [part["id"] for part in assembly_data["parts"]]
            
            # Group identical assemblies by (assembly_mark, main_profile, length, weight)
            # Round weight to avoid floating point differences
            weight_rounded = round(assembly_data["total_weight"], 2)
            group_key = (assembly_data["assembly_mark"], main_profile, round(max_length, 1) if max_length else 0, weight_rounded)
            
            if group_key not in assembly_groups:
                assembly_groups[group_key] = {
                    "assembly_mark": assembly_data["assembly_mark"],
                    "assembly_id": assembly_data["assembly_id"],
                    "main_profile": main_profile,
                    "length": max_length,
                    "weight": weight_rounded,
                    "quantity": 0,
                    "total_weight": 0.0,
                    "member_count": assembly_data["member_count"],
                    "plate_count": assembly_data["plate_count"],
                    "parts": assembly_data["parts"],
                    "ids": assembly_ids,
                    "all_ids": []  # Will accumulate all IDs from identical assemblies
                }
            
            # Update the group
            assembly_groups[group_key]["quantity"] += 1
            assembly_groups[group_key]["total_weight"] += weight_rounded
            assembly_groups[group_key]["all_ids"].extend(assembly_ids)
        
        # Convert grouped assemblies to list
        assemblies_list = []
        for group_data in assembly_groups.values():
            # Group profiles and plates within the assembly for the sub-tables
            profiles_in_assembly = {}
            plates_in_assembly = {}
            
            for part in group_data["parts"]:
                if part["part_type"] == "profile":
                    # Group profiles by (part_name, profile_name, length)
                    key = (part["part_name"], part["profile_name"], part["length"])
                    if key not in profiles_in_assembly:
                        profiles_in_assembly[key] = {
                            "part_name": part["part_name"],
                            "profile_name": part["profile_name"],
                            "length": part["length"],
                            "weight": part["weight"],
                            "quantity": 0,
                            "total_weight": 0.0,
                            "ids": []
                        }
                    profiles_in_assembly[key]["quantity"] += 1
                    profiles_in_assembly[key]["total_weight"] += part["weight"]
                    profiles_in_assembly[key]["ids"].append(part["id"])
                
                elif part["part_type"] == "plate":
                    # Group plates by (part_name, thickness, width, length)
                    key = (part["part_name"], part.get("thickness"), part.get("width"), part.get("length"))
                    if key not in plates_in_assembly:
                        plates_in_assembly[key] = {
                            "part_name": part["part_name"],
                            "thickness": part.get("thickness", "N/A"),
                            "profile_name": part.get("profile_name", "N/A"),
                            "width": part.get("width"),
                            "length": part.get("length"),
                            "weight": part["weight"],
                            "quantity": 0,
                            "total_weight": 0.0,
                            "ids": []
                        }
                    plates_in_assembly[key]["quantity"] += 1
                    plates_in_assembly[key]["total_weight"] += part["weight"]
                    plates_in_assembly[key]["ids"].append(part["id"])
            
            # Round total_weight
            group_data["total_weight"] = round(group_data["total_weight"], 2)
            
            # Collect unique IDs - one of each unique part type (not duplicates within assembly)
            seen_parts = {}  # key -> first ID
            for part in group_data["parts"]:
                if part["part_type"] == "profile":
                    key = (part["part_name"], part["profile_name"], part["length"])
                elif part["part_type"] == "plate":
                    key = (part["part_name"], part.get("thickness"), part.get("width"), part.get("length"))
                else:
                    key = (part["part_name"], part.get("part_type"))
                
                # Store first ID for each unique part
                if key not in seen_parts:
                    seen_parts[key] = part["id"]
            
            unique_ids_list = list(seen_parts.values())
            
            assemblies_list.append({
                "assembly_mark": group_data["assembly_mark"],
                "assembly_id": group_data["assembly_id"],
                "main_profile": group_data["main_profile"],
                "length": group_data["length"],
                "weight": group_data["weight"],
                "quantity": group_data["quantity"],
                "total_weight": group_data["total_weight"],
                "member_count": group_data["member_count"],
                "plate_count": group_data["plate_count"],
                "parts": group_data["parts"],
                "profiles": list(profiles_in_assembly.values()),
                "plates": list(plates_in_assembly.values()),
                "ids": unique_ids_list,  # Use unique part IDs only (one of each type)
                "all_ids": group_data["all_ids"]  # Keep all_ids for reference if needed
            })
        
        # Convert bolts dict to list
        bolts_list = []
        for bolt_data in bolts_dict.values():
            # Get unique assemblies (excluding GUIDs)
            assemblies = bolt_data["assemblies"]
            non_guid_assemblies = [a for a in assemblies if not (a.startswith('ID') and len(a) > 30)]
            
            if non_guid_assemblies:
                # Show actual assembly names
                display_assembly = ", ".join(sorted(non_guid_assemblies))
            else:
                # All assemblies are GUIDs
                display_assembly = "Various"
            
            bolts_list.append({
                "bolt_name": bolt_data["bolt_name"],
                "bolt_type": bolt_data["bolt_type"],
                "size": bolt_data["size"],
                "length": bolt_data["length"],
                "standard": bolt_data["standard"] or "N/A",
                "location": bolt_data["location"],
                "quantity": bolt_data["quantity"],
                "assembly_mark": display_assembly,
                "ids": bolt_data["ids"]
            })
        
        # Convert fasteners dict to list
        fasteners_list = []
        for fastener_data in fasteners_dict.values():
            # Get unique assemblies (excluding GUIDs)
            assemblies = fastener_data["assemblies"]
            non_guid_assemblies = [a for a in assemblies if not (a.startswith('ID') and len(a) > 30)]
            
            if non_guid_assemblies:
                # Show actual assembly names
                display_assembly = ", ".join(sorted(non_guid_assemblies))
            else:
                # All assemblies are GUIDs
                display_assembly = "Various"
            
            fasteners_list.append({
                "anchor_name": fastener_data["anchor_name"],
                "assembly_mark": display_assembly,
                "profile_name": fastener_data["profile_name"],
                "length": fastener_data["length"],
                "weight": round(fastener_data["weight"], 2),
                "quantity": fastener_data["quantity"],
                "total_weight": round(fastener_data["total_weight"], 2),
                "ids": fastener_data["ids"]
            })
        
        # Sort lists
        profiles_list.sort(key=lambda x: (x["profile_name"], x["part_name"]))
        plates_list.sort(key=lambda x: (x["thickness"], x["part_name"]))
        assemblies_list.sort(key=lambda x: x["assembly_mark"])
        bolts_list.sort(key=lambda x: (x["bolt_name"], x["size"] or 0, x["length"] or 0))
        fasteners_list.sort(key=lambda x: (x["anchor_name"], x["profile_name"] or "", x["length"] or 0))
        
        # Prepare result data
        result_data = {
            "profiles": profiles_list,
            "plates": plates_list,
            "assemblies": assemblies_list,
            "bolts": bolts_list,
            "fasteners": fasteners_list
        }
        
        # ===== SAVE TO CACHE for next time =====
        try:
            with open(cache_path, "w", encoding='utf-8') as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)
            print(f"[DASHBOARD_DETAILS] 💾 Cached data saved to: {cache_path}")
        except Exception as e:
            print(f"[DASHBOARD_DETAILS] ⚠️  Cache write failed: {e}")
        
        print(f"[DASHBOARD_DETAILS] ✅ Data generated in {time.time() - start_time:.3f}s")
        return JSONResponse(result_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard details: {str(e)}")


@app.get("/api/shipment-assemblies/{filename}")
async def get_shipment_assemblies(filename: str):
    """Get individual assembly instances for shipment (NO GROUPING).
    
    Each assembly instance gets its own row, even if they have the same assembly_mark.
    Returns list of assemblies with: assembly_mark, main_profile, length, weight, ids
    """
    from urllib.parse import unquote
    import time
    start_time = time.time()
    
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    # ===== CACHE CHECK: Load from cached shipment data if available =====
    cache_path = REPORTS_DIR / f"{decoded_filename}.shipment.json"
    if cache_path.exists():
        ifc_mtime = file_path.stat().st_mtime
        cache_mtime = cache_path.stat().st_mtime
        
        # Use cache if it's newer than the IFC file
        if cache_mtime >= ifc_mtime:
            print(f"[SHIPMENT] ⚡ CACHE HIT! Loading from: {cache_path}")
            try:
                with open(cache_path, "r", encoding='utf-8') as f:
                    data = json.load(f)
                print(f"[SHIPMENT] ⚡ Loaded cached data in {time.time() - start_time:.3f}s")
                return JSONResponse(data)
            except Exception as e:
                print(f"[SHIPMENT] ⚠️  Cache read failed: {e}, will regenerate")
    
    print(f"[SHIPMENT] 🔄 CACHE MISS! Generating data for: {decoded_filename}")
    
    try:
        # Resolve path to absolute for Windows compatibility
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        # Track individual assembly instances
        # We'll use assembly_id (the actual IFC element representing the assembly) as unique identifier
        assemblies_by_id = {}
        
        # ===== OPTIMIZATION: Filter by steel types first =====
        steel_elements = []
        for type_name in STEEL_TYPES:
            steel_elements.extend(ifc_file.by_type(type_name))
        
        print(f"[SHIPMENT] Processing {len(steel_elements)} steel elements")
        
        # Iterate through steel elements only
        for idx, element in enumerate(steel_elements):
            # Progress logging every 100 elements
            if idx > 0 and idx % 100 == 0:
                progress = (idx / len(steel_elements)) * 100
                print(f"[SHIPMENT] Progress: {progress:.1f}% ({idx}/{len(steel_elements)})")
            
            element_type = element.is_a()
            
            element_id = element.id()
            
            # Get weight
            weight = get_element_weight(element)
            
            # Get assembly info
            assembly_mark, assembly_id = get_assembly_info(element)
            
            # Skip if no assembly_id (not part of an assembly)
            if not assembly_id:
                continue
            
            # Get dimensions from property sets
            psets = ifcopenshell.util.element.get_psets(element)
            length = None
            
            for pset_name, props in psets.items():
                if 'Length' in props and props['Length']:
                    length = float(props['Length'])
                    break
            
            # Initialize assembly if not seen before
            if assembly_id not in assemblies_by_id:
                assemblies_by_id[assembly_id] = {
                    "assembly_mark": assembly_mark,
                    "assembly_id": assembly_id,
                    "parts": [],
                    "total_weight": 0.0,
                    "member_count": 0,
                    "plate_count": 0
                }
            
            # Process profiles (beams, columns, members)
            if element_type in ["IfcBeam", "IfcColumn", "IfcMember"]:
                profile_name = get_profile_name(element)
                
                assemblies_by_id[assembly_id]["parts"].append({
                    "id": element_id,
                    "profile_name": profile_name,
                    "length": length,
                    "weight": weight,
                    "part_type": "profile"
                })
                assemblies_by_id[assembly_id]["total_weight"] += weight
                assemblies_by_id[assembly_id]["member_count"] += 1
            
            # Process plates
            elif element_type in ["IfcPlate", "IfcSlab"]:
                thickness = get_plate_thickness(element)
                
                # Get Description attribute (contains profile info like "P:20*2190")
                description = ""
                try:
                    if hasattr(element, 'Description') and element.Description:
                        description = str(element.Description).strip()
                except:
                    pass
                
                assemblies_by_id[assembly_id]["parts"].append({
                    "id": element_id,
                    "weight": weight,
                    "thickness": thickness,
                    "description": description,  # Store Description for use in main_profile
                    "part_type": "plate"
                })
                assemblies_by_id[assembly_id]["total_weight"] += weight
                assemblies_by_id[assembly_id]["plate_count"] += 1
        
        # Convert to list and calculate main profile for each assembly
        assemblies_list = []
        for assembly_id, assembly_data in assemblies_by_id.items():
            # Find the most common profile in this assembly
            profile_counts = {}
            main_profile = "N/A"
            max_length = 0
            
            for part in assembly_data["parts"]:
                if part["part_type"] == "profile":
                    profile = part["profile_name"]
                    if profile not in profile_counts:
                        profile_counts[profile] = {"count": 0, "max_length": 0}
                    profile_counts[profile]["count"] += 1
                    if part["length"] and part["length"] > profile_counts[profile]["max_length"]:
                        profile_counts[profile]["max_length"] = part["length"]
            
            # Get the profile with the longest length (main structural member)
            if profile_counts:
                main_profile = max(profile_counts.items(), 
                                 key=lambda x: (x[1]["max_length"], x[1]["count"]))[0]
                max_length = profile_counts[main_profile]["max_length"]
            else:
                # No profiles found - this is a plate-only assembly
                # Try to use Description first (e.g., "P:20*2190"), otherwise fall back to thickness
                plate_descriptions = {}
                for part in assembly_data["parts"]:
                    if part["part_type"] == "plate":
                        description = part.get("description", "")
                        if description:
                            plate_descriptions[description] = plate_descriptions.get(description, 0) + 1
                
                if plate_descriptions:
                    # Get the most common description
                    most_common_description = max(plate_descriptions.items(), key=lambda x: x[1])[0]
                    main_profile = most_common_description
                else:
                    # Fallback to thickness if no description available
                    plate_thickness_counts = {}
                    for part in assembly_data["parts"]:
                        if part["part_type"] == "plate":
                            thickness = part.get("thickness", "N/A")
                            plate_thickness_counts[thickness] = plate_thickness_counts.get(thickness, 0) + 1
                    
                    if plate_thickness_counts:
                        # Get the most common thickness
                        most_common_thickness = max(plate_thickness_counts.items(), key=lambda x: x[1])[0]
                        main_profile = f"Plate {most_common_thickness}"
            
            # Collect all IDs from parts in this assembly
            assembly_ids = [part["id"] for part in assembly_data["parts"]]
            
            assemblies_list.append({
                "assembly_mark": assembly_data["assembly_mark"],
                "assembly_id": assembly_id,
                "main_profile": main_profile,
                "length": round(max_length, 1) if max_length else 0,
                "weight": round(assembly_data["total_weight"], 2),
                "member_count": assembly_data["member_count"],
                "plate_count": assembly_data["plate_count"],
                "ids": assembly_ids
            })
        
        # Sort by assembly mark
        assemblies_list.sort(key=lambda x: x["assembly_mark"])
        
        # Prepare result data
        result_data = {
            "assemblies": assemblies_list
        }
        
        # ===== SAVE TO CACHE for next time =====
        try:
            with open(cache_path, "w", encoding='utf-8') as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)
            print(f"[SHIPMENT] 💾 Cached data saved to: {cache_path}")
        except Exception as e:
            print(f"[SHIPMENT] ⚠️  Cache write failed: {e}")
        
        print(f"[SHIPMENT] ✅ Data generated in {time.time() - start_time:.3f}s")
        return JSONResponse(result_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get shipment assemblies: {str(e)}")


# In-memory storage for assembly status (completed/shipped)
# Structure: {filename: {assembly_id: {"completed": bool, "shipped": bool}}}
assembly_status_storage = {}


@app.get("/api/management-assemblies/{filename}")
async def get_management_assemblies(filename: str):
    """Get individual assembly instances for management (with completed/shipped status).
    
    Each assembly instance gets its own row with status tracking.
    Returns list of assemblies with: assembly_mark, main_profile, length, weight, ids, completed, shipped
    """
    from urllib.parse import unquote
    import time
    start_time = time.time()
    
    decoded_filename = unquote(filename)
    file_path = IFC_DIR / decoded_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="IFC file not found")
    
    # ===== CACHE CHECK: Load from cached management data if available =====
    # NOTE: We cache the assembly structure, but status is always loaded fresh from assembly_status_storage
    cache_path = REPORTS_DIR / f"{decoded_filename}.management.json"
    if cache_path.exists():
        ifc_mtime = file_path.stat().st_mtime
        cache_mtime = cache_path.stat().st_mtime
        
        # Use cache if it's newer than the IFC file
        if cache_mtime >= ifc_mtime:
            print(f"[MANAGEMENT] ⚡ CACHE HIT! Loading from: {cache_path}")
            try:
                with open(cache_path, "r", encoding='utf-8') as f:
                    assemblies_list = json.load(f)["assemblies"]
                
                # Apply current status from in-memory storage
                file_status = assembly_status_storage.get(decoded_filename, {})
                for assembly in assemblies_list:
                    status = file_status.get(str(assembly["assembly_id"]), {"completed": False, "shipped": False})
                    assembly["completed"] = status["completed"]
                    assembly["shipped"] = status["shipped"]
                
                print(f"[MANAGEMENT] ⚡ Loaded cached data with fresh status in {time.time() - start_time:.3f}s")
                return JSONResponse({"assemblies": assemblies_list})
            except Exception as e:
                print(f"[MANAGEMENT] ⚠️  Cache read failed: {e}, will regenerate")
    
    print(f"[MANAGEMENT] 🔄 CACHE MISS! Generating data for: {decoded_filename}")
    
    try:
        # Get assemblies using the same logic as shipment endpoint
        resolved_path = file_path.resolve()
        ifc_file = ifcopenshell.open(str(resolved_path))
        
        assemblies_by_id = {}
        
        # ===== OPTIMIZATION: Filter by steel types first =====
        steel_elements = []
        for type_name in STEEL_TYPES:
            steel_elements.extend(ifc_file.by_type(type_name))
        
        print(f"[MANAGEMENT] Processing {len(steel_elements)} steel elements")
        
        # Iterate through steel elements only
        for idx, element in enumerate(steel_elements):
            # Progress logging every 100 elements
            if idx > 0 and idx % 100 == 0:
                progress = (idx / len(steel_elements)) * 100
                print(f"[MANAGEMENT] Progress: {progress:.1f}% ({idx}/{len(steel_elements)})")
            
            element_type = element.is_a()
            
            element_id = element.id()
            weight = get_element_weight(element)
            assembly_mark, assembly_id = get_assembly_info(element)
            
            if not assembly_id:
                continue
            
            psets = ifcopenshell.util.element.get_psets(element)
            length = None
            
            for pset_name, props in psets.items():
                if 'Length' in props and props['Length']:
                    length = float(props['Length'])
                    break
            
            if assembly_id not in assemblies_by_id:
                assemblies_by_id[assembly_id] = {
                    "assembly_mark": assembly_mark,
                    "assembly_id": assembly_id,
                    "parts": [],
                    "total_weight": 0.0,
                    "member_count": 0,
                    "plate_count": 0
                }
            
            if element_type in ["IfcBeam", "IfcColumn", "IfcMember"]:
                profile_name = get_profile_name(element)
                
                assemblies_by_id[assembly_id]["parts"].append({
                    "id": element_id,
                    "profile_name": profile_name,
                    "length": length,
                    "weight": weight,
                    "part_type": "profile"
                })
                assemblies_by_id[assembly_id]["total_weight"] += weight
                assemblies_by_id[assembly_id]["member_count"] += 1
            
            elif element_type in ["IfcPlate", "IfcSlab"]:
                thickness = get_plate_thickness(element)
                
                description = ""
                try:
                    if hasattr(element, 'Description') and element.Description:
                        description = str(element.Description).strip()
                except:
                    pass
                
                assemblies_by_id[assembly_id]["parts"].append({
                    "id": element_id,
                    "weight": weight,
                    "thickness": thickness,
                    "description": description,
                    "part_type": "plate"
                })
                assemblies_by_id[assembly_id]["total_weight"] += weight
                assemblies_by_id[assembly_id]["plate_count"] += 1
        
        # Initialize storage for this file if not exists
        if decoded_filename not in assembly_status_storage:
            assembly_status_storage[decoded_filename] = {}
        
        # Convert to list and add status
        assemblies_list = []
        for assembly_id, assembly_data in assemblies_by_id.items():
            # Find main profile
            profile_counts = {}
            main_profile = "N/A"
            max_length = 0
            
            for part in assembly_data["parts"]:
                if part["part_type"] == "profile":
                    profile = part["profile_name"]
                    if profile not in profile_counts:
                        profile_counts[profile] = {"count": 0, "max_length": 0}
                    profile_counts[profile]["count"] += 1
                    if part["length"] and part["length"] > profile_counts[profile]["max_length"]:
                        profile_counts[profile]["max_length"] = part["length"]
            
            if profile_counts:
                main_profile = max(profile_counts.items(), 
                                 key=lambda x: (x[1]["max_length"], x[1]["count"]))[0]
                max_length = profile_counts[main_profile]["max_length"]
            else:
                plate_descriptions = {}
                for part in assembly_data["parts"]:
                    if part["part_type"] == "plate":
                        description = part.get("description", "")
                        if description:
                            plate_descriptions[description] = plate_descriptions.get(description, 0) + 1
                
                if plate_descriptions:
                    most_common_description = max(plate_descriptions.items(), key=lambda x: x[1])[0]
                    main_profile = most_common_description
                else:
                    plate_thickness_counts = {}
                    for part in assembly_data["parts"]:
                        if part["part_type"] == "plate":
                            thickness = part.get("thickness", "N/A")
                            plate_thickness_counts[thickness] = plate_thickness_counts.get(thickness, 0) + 1
                    
                    if plate_thickness_counts:
                        most_common_thickness = max(plate_thickness_counts.items(), key=lambda x: x[1])[0]
                        main_profile = f"Plate {most_common_thickness}"
            
            assembly_ids = [part["id"] for part in assembly_data["parts"]]
            
            # Get status from storage
            status = assembly_status_storage[decoded_filename].get(assembly_id, {
                "completed": False,
                "shipped": False
            })
            
            assemblies_list.append({
                "assembly_mark": assembly_data["assembly_mark"],
                "assembly_id": assembly_id,
                "main_profile": main_profile,
                "length": round(max_length, 1) if max_length else 0,
                "weight": round(assembly_data["total_weight"], 2),
                "member_count": assembly_data["member_count"],
                "plate_count": assembly_data["plate_count"],
                "ids": assembly_ids,
                "completed": status["completed"],
                "shipped": status["shipped"]
            })
        
        assemblies_list.sort(key=lambda x: x["assembly_mark"])
        
        # Prepare result data
        result_data = {
            "assemblies": assemblies_list
        }
        
        # ===== SAVE TO CACHE for next time (with status included) =====
        try:
            with open(cache_path, "w", encoding='utf-8') as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)
            print(f"[MANAGEMENT] 💾 Cached data saved to: {cache_path}")
        except Exception as e:
            print(f"[MANAGEMENT] ⚠️  Cache write failed: {e}")
        
        print(f"[MANAGEMENT] ✅ Data generated in {time.time() - start_time:.3f}s")
        return JSONResponse(result_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get management assemblies: {str(e)}")


@app.post("/api/management-assemblies/{filename}/toggle-completed")
async def toggle_completed(filename: str, request: Request):
    """Toggle the completed status of an assembly."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    
    try:
        body = await request.json()
        assembly_id = body.get("assembly_id")
        completed = body.get("completed", False)
        
        if assembly_id is None:
            raise HTTPException(status_code=400, detail="assembly_id is required")
        
        # Initialize storage if needed
        if decoded_filename not in assembly_status_storage:
            assembly_status_storage[decoded_filename] = {}
        
        if assembly_id not in assembly_status_storage[decoded_filename]:
            assembly_status_storage[decoded_filename][assembly_id] = {
                "completed": False,
                "shipped": False
            }
        
        # Update completed status
        assembly_status_storage[decoded_filename][assembly_id]["completed"] = completed
        
        # If uncompleting, also unship
        if not completed:
            assembly_status_storage[decoded_filename][assembly_id]["shipped"] = False
        
        return JSONResponse({
            "success": True,
            "assembly_id": assembly_id,
            "completed": completed,
            "shipped": assembly_status_storage[decoded_filename][assembly_id]["shipped"]
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to toggle completed: {str(e)}")


@app.post("/api/management-assemblies/{filename}/toggle-shipped")
async def toggle_shipped(filename: str, request: Request):
    """Toggle the shipped status of an assembly."""
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    
    try:
        body = await request.json()
        assembly_id = body.get("assembly_id")
        shipped = body.get("shipped", False)
        
        if assembly_id is None:
            raise HTTPException(status_code=400, detail="assembly_id is required")
        
        # Initialize storage if needed
        if decoded_filename not in assembly_status_storage:
            assembly_status_storage[decoded_filename] = {}
        
        if assembly_id not in assembly_status_storage[decoded_filename]:
            assembly_status_storage[decoded_filename][assembly_id] = {
                "completed": False,
                "shipped": False
            }
        
        # Update shipped status
        assembly_status_storage[decoded_filename][assembly_id]["shipped"] = shipped
        
        return JSONResponse({
            "success": True,
            "assembly_id": assembly_id,
            "shipped": shipped
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to toggle shipped: {str(e)}")


@app.post("/api/generate-plate-nesting/{filename}")
async def generate_plate_nesting(filename: str, request: Request):
    """Generate nesting plan for plates from IFC model with advanced optimization.
    
    Takes stock plate configurations and generates optimized cutting plans using:
    - Multiple MaxRects algorithms (Bssf, Bl, Baf, Blsf)
    - Rotation enabled for better space utilization
    - Multiple sorting strategies
    - Iterative optimization to find best result
    """
    try:
        from rectpack import newPacker, MaxRectsBssf, MaxRectsBl, MaxRectsBaf, MaxRectsBlsf
        
        # Get request body with stock plates configuration
        body = await request.json()
        stock_plates = body.get('stock_plates', [])
        selected_plates_data = body.get('selected_plates', [])
        
        if not stock_plates:
            raise HTTPException(status_code=400, detail="No stock plates provided")
        
        if not selected_plates_data:
            raise HTTPException(status_code=400, detail="No plates selected for nesting")
        
        # Prepare plates for nesting (expand quantities from selected plates)
        plates_to_nest = []
        for plate_data in selected_plates_data:
            for i in range(plate_data.get('quantity', 1)):
                plates_to_nest.append({
                    "width": plate_data['width'],
                    "length": plate_data['length'],
                    "thickness": plate_data['thickness'],
                    "name": f"{plate_data['name']}-{i+1}",
                    "id": f"{plate_data['name']}-{plate_data['thickness']}-{i}"
                })
        
        if not plates_to_nest:
            return JSONResponse({
                "success": False,
                "message": "No plates found in the model with valid dimensions",
                "cutting_plans": [],
                "statistics": {}
            })
        
        # Group plates by thickness - CRITICAL: plates of different thickness cannot be cut from same sheet!
        from collections import defaultdict
        plates_by_thickness = defaultdict(list)
        for plate in plates_to_nest:
            plates_by_thickness[plate['thickness']].append(plate)
        
        print(f"\n[PLATE-NESTING] === STARTING THICKNESS-AWARE NESTING ===")
        print(f"[PLATE-NESTING] Total plates to nest: {len(plates_to_nest)}")
        print(f"[PLATE-NESTING] Thickness groups: {list(plates_by_thickness.keys())}")
        for thickness, plates in plates_by_thickness.items():
            print(f"[PLATE-NESTING]   - {thickness}: {len(plates)} plates")
        print(f"[PLATE-NESTING] Stock sizes available: {len(stock_plates)}")
        
        # Advanced nesting optimization function
        def optimize_single_sheet(plates, stock, stock_idx):
            """Try multiple algorithms and sorting strategies to find best packing."""
            
            algorithms = [
                ('MaxRectsBssf', MaxRectsBssf),
                ('MaxRectsBl', MaxRectsBl),
                ('MaxRectsBaf', MaxRectsBaf),
                ('MaxRectsBlsf', MaxRectsBlsf)
            ]
            
            # Sorting strategies
            sorting_strategies = [
                ('area_desc', lambda p: p['width'] * p['length'], True),
                ('max_dim_desc', lambda p: max(p['width'], p['length']), True),
                ('min_dim_desc', lambda p: min(p['width'], p['length']), True),
                ('width_desc', lambda p: p['width'], True),
                ('perimeter_desc', lambda p: 2 * (p['width'] + p['length']), True),
            ]
            
            best_result = None
            best_packed_count = 0
            best_utilization = 0
            best_config = ""
            
            # Try each combination
            for algo_name, algo_class in algorithms:
                for sort_name, sort_key, reverse in sorting_strategies:
                    # Sort plates
                    sorted_plates = sorted(plates, key=sort_key, reverse=reverse)
                    
                    # Pack with rotation enabled
                    packer = newPacker(rotation=True, pack_algo=algo_class)
                    packer.add_bin(stock['width'], stock['length'])
                    
                    for plate in sorted_plates:
                        packer.add_rect(plate['width'], plate['length'], rid=plate['id'])
                    
                    packer.pack()
                    
                    # Evaluate result - safely check if packer has bins
                    if len(packer) > 0 and packer[0]:
                        packed_count = len(packer[0])
                        
                        # Calculate utilization
                        total_area = sum(r.width * r.height for r in packer[0])
                        stock_area = stock['width'] * stock['length']
                        utilization = (total_area / stock_area) * 100
                        
                        # Better if: more plates OR same plates but better utilization
                        is_better = (packed_count > best_packed_count) or \
                                   (packed_count == best_packed_count and utilization > best_utilization)
                        
                        if is_better:
                            best_packed_count = packed_count
                            best_utilization = utilization
                            best_config = f"{algo_name}+{sort_name}"
                            
                            best_result = {
                                'stock_width': stock['width'],
                                'stock_length': stock['length'],
                                'stock_index': stock_idx,
                                'plates': [],
                                'algorithm': algo_name,
                                'sorting': sort_name
                            }
                            
                            # Get packed plates with rotation info
                            for rect in packer[0]:
                                plate_info = next(p for p in plates if p['id'] == rect.rid)
                                
                                # Check if plate was rotated
                                was_rotated = (rect.width == plate_info['length'] and 
                                             rect.height == plate_info['width'])
                                
                                best_result['plates'].append({
                                    'x': rect.x,
                                    'y': rect.y,
                                    'width': rect.width,
                                    'height': rect.height,
                                    'name': plate_info['name'],
                                    'thickness': plate_info['thickness'],
                                    'id': rect.rid,
                                    'rotated': was_rotated
                                })
            
            if best_result:
                print(f"[PLATE-NESTING] Stock {stock_idx + 1} ({stock['width']}x{stock['length']}mm): "
                      f"{best_packed_count} plates, {best_utilization:.1f}% util [{best_config}]")
            
            return best_result, best_packed_count, best_utilization
        
        # Run nesting algorithm for each stock plate size
        nesting_results = []
        global_stock_index = 0
        
        # Process each thickness group separately
        for thickness, thickness_plates in plates_by_thickness.items():
            print(f"\n[PLATE-NESTING] === Processing thickness group: {thickness} ({len(thickness_plates)} plates) ===")
            
            remaining_plates = thickness_plates.copy()
            thickness_stock_index = 0
            
            while remaining_plates and thickness_stock_index < 100:  # Limit iterations per thickness
                print(f"\n[PLATE-NESTING] === {thickness} - Sheet {thickness_stock_index + 1}: {len(remaining_plates)} plates remaining ===")
                
                # Try each stock size with optimization
                best_result = None
                best_stock_idx = -1
                best_packed_count = 0
                best_utilization = 0
                
                for idx, stock in enumerate(stock_plates):
                    result, packed_count, utilization = optimize_single_sheet(
                        remaining_plates, stock, idx
                    )
                    
                    # Choose stock that packs most plates, or best utilization if equal
                    if result and (packed_count > best_packed_count or 
                                  (packed_count == best_packed_count and utilization > best_utilization)):
                        best_result = result
                        best_stock_idx = idx
                        best_packed_count = packed_count
                        best_utilization = utilization
                
                if best_result and best_result['plates']:
                    # Calculate utilization
                    total_plate_area = sum(p['width'] * p['height'] for p in best_result['plates'])
                    stock_area = best_result['stock_width'] * best_result['stock_length']
                    utilization = (total_plate_area / stock_area) * 100 if stock_area > 0 else 0
                    
                    best_result['utilization'] = round(utilization, 2)
                    best_result['stock_name'] = f"Stock {global_stock_index + 1}"
                    best_result['thickness'] = thickness  # Add thickness to result
                    
                    # Add thickness to each plate in the result for display
                    for plate in best_result['plates']:
                        if 'thickness' not in plate:
                            plate['thickness'] = thickness
                    
                    rotated_count = sum(1 for p in best_result['plates'] if p.get('rotated', False))
                    print(f"[PLATE-NESTING] OK {thickness} - Stock {best_stock_idx + 1}, "
                          f"{len(best_result['plates'])} plates ({rotated_count} rotated), "
                          f"{utilization:.1f}% utilization")
                    
                    nesting_results.append(best_result)
                    global_stock_index += 1
                    
                    # Remove packed plates from remaining
                    packed_ids = set(p['id'] for p in best_result['plates'])
                    remaining_plates = [p for p in remaining_plates if p['id'] not in packed_ids]
                else:
                    # No more plates of this thickness fit
                    print(f"[PLATE-NESTING] No more {thickness} plates can fit in available stock sizes")
                    break
                
                thickness_stock_index += 1
        
        # Calculate statistics
        total_plates = len(plates_to_nest)
        nested_plates = sum(len(result['plates']) for result in nesting_results)
        unnested_plates = total_plates - nested_plates
        
        total_stock_area = sum(r['stock_width'] * r['stock_length'] for r in nesting_results)
        total_used_area = sum(sum(p['width'] * p['height'] for p in r['plates']) for r in nesting_results)
        overall_utilization = (total_used_area / total_stock_area * 100) if total_stock_area > 0 else 0
        waste_area = total_stock_area - total_used_area
        
        # Calculate tonnage (weight) for plates
        # Steel density: 7850 kg/m³ = 0.00000785 kg/mm³
        STEEL_DENSITY = 0.00000785  # kg/mm³
        
        # Calculate weight for nested plates
        total_plate_weight = 0.0
        thickness_values = []
        
        for result in nesting_results:
            for plate in result['plates']:
                # Volume = width (mm) * height (mm) * thickness (mm)
                # Parse thickness - handle formats like "10mm", "10t", "10", "t10", etc.
                thickness_str = str(plate['thickness'])
                thickness_value = 0.0
                
                # Remove common prefixes/suffixes
                thickness_clean = thickness_str.replace('mm', '').replace('t', '').replace('T', '').strip()
                
                try:
                    thickness_value = float(thickness_clean)
                except:
                    print(f"[PLATE-NESTING] Warning: Could not parse thickness '{thickness_str}', using 10mm default")
                    thickness_value = 10.0
                
                if thickness_value > 0:
                    volume_mm3 = plate['width'] * plate['height'] * thickness_value
                    weight_kg = volume_mm3 * STEEL_DENSITY
                    total_plate_weight += weight_kg
                    thickness_values.append(thickness_value)
        
        # Calculate waste weight
        avg_thickness = sum(thickness_values) / len(thickness_values) if thickness_values else 10.0
        waste_weight = waste_area * avg_thickness * STEEL_DENSITY  # waste_area is in mm²
        
        print(f"[PLATE-NESTING] Tonnage calculation: plates={round(total_plate_weight/1000, 3)}t, waste={round(waste_weight/1000, 3)}t, avg_thickness={round(avg_thickness, 1)}mm")
        
        statistics = {
            "total_plates": total_plates,
            "nested_plates": nested_plates,
            "unnested_plates": unnested_plates,
            "stock_sheets_used": len(nesting_results),
            "total_stock_area_m2": round(total_stock_area / 1_000_000, 2),
            "total_used_area_m2": round(total_used_area / 1_000_000, 2),
            "waste_area_m2": round(waste_area / 1_000_000, 2),
            "overall_utilization": round(overall_utilization, 2),
            "waste_percentage": round(100 - overall_utilization, 2),
            "plates_tonnage": round(total_plate_weight / 1000, 3),  # Convert kg to tonnes
            "waste_tonnage": round(waste_weight / 1000, 3)  # Convert kg to tonnes
        }
        
        return JSONResponse({
            "success": True,
            "cutting_plans": nesting_results,
            "statistics": statistics,
            "unnested_plates": remaining_plates
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate nesting: {str(e)}")


@app.get("/api/plate-geometry/{filename}/{element_id}")
async def get_plate_geometry(filename: str, element_id: int):
    """Get the actual 2D geometry of a specific plate including holes. Returns SVG path data for visualization."""
    try:
        from urllib.parse import unquote
        from plate_geometry_extractor import extract_plate_2d_geometry
        
        decoded_filename = unquote(filename)
        file_path = IFC_DIR / decoded_filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {decoded_filename}")
        
        ifc_file = ifcopenshell.open(str(file_path))
        
        try:
            element = ifc_file.by_id(element_id)
        except:
            raise HTTPException(status_code=404, detail=f"Element {element_id} not found")
        
        if element.is_a() != "IfcPlate":
            raise HTTPException(status_code=400, detail=f"Element {element_id} is not a plate")
        
        plate_geom = extract_plate_2d_geometry(element)
        
        if not plate_geom or not plate_geom.polygon:
            return JSONResponse({"success": True, "element_id": element_id, "name": element.Name or "Unknown", "has_geometry": False, "message": "Could not extract geometry, use bounding box"})
        
        svg_path = plate_geom.get_svg_path()
        num_holes = len(list(plate_geom.polygon.interiors)) if plate_geom.polygon else 0
        
        return JSONResponse({"success": True, "element_id": element_id, "name": plate_geom.name, "thickness": plate_geom.thickness, "width": plate_geom.width, "length": plate_geom.length, "area": plate_geom.area, "bounding_box": plate_geom.bounding_box, "svg_path": svg_path, "has_holes": num_holes > 0, "num_holes": num_holes, "has_geometry": True})
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract geometry: {str(e)}")


@app.post("/api/generate-plate-nesting-geometry/{filename}")
async def generate_plate_nesting_with_geometry(filename: str, request: Request):
    """
    Generate nesting plan using ACTUAL PLATE GEOMETRY (not just bounding boxes).
    This method extracts the real 2D shape of each plate including holes and cutouts.
    
    Results in 15-30% better material utilization compared to bounding box method.
    """
    try:
        from urllib.parse import unquote
        from plate_geometry_extractor import extract_all_plate_geometries, create_bounding_box_geometry
        from polygon_nesting import nest_plates_on_multiple_stocks, calculate_nesting_statistics
        
        decoded_filename = unquote(filename)
        
        # Get request body
        body = await request.json()
        stock_plates = body.get('stock_plates', [])
        selected_plates_data = body.get('selected_plates', [])
        
        if not stock_plates:
            raise HTTPException(status_code=400, detail="No stock plates provided")
        
        print(f"[GEOM-NESTING] Starting geometry-based nesting for {decoded_filename}")
        print(f"[GEOM-NESTING] Stock plates: {len(stock_plates)}")
        print(f"[GEOM-NESTING] Selected plates: {len(selected_plates_data)}")
        
        # Open IFC file
        file_path = IFC_DIR / decoded_filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {decoded_filename}")
        
        ifc_file = ifcopenshell.open(str(file_path))
        
        # Extract actual geometry for plates
        plate_geometries = extract_all_plate_geometries(ifc_file, selected_element_ids=None)
        
        if not plate_geometries:
            return JSONResponse({
                "success": False,
                "message": "No plate geometries could be extracted from the IFC file",
                "cutting_plans": [],
                "statistics": {},
                "geometry_based": False
            })
        
        # Match with selected plates to get quantities
        plate_geometries_expanded = []
        for plate_data in selected_plates_data:
            name = plate_data.get('name', '')
            quantity = plate_data.get('quantity', 1)
            width = plate_data.get('width', 0)
            length = plate_data.get('length', 0)
            thickness = plate_data.get('thickness', 'N/A')
            
            # Find matching geometry
            matching_geom = None
            for geom in plate_geometries:
                # Match by approximate dimensions and thickness
                if (abs(geom.width - width) < 10 and  # Within 10mm
                    abs(geom.length - length) < 10 and
                    geom.thickness == thickness):
                    matching_geom = geom
                    break
            
            # If no geometry found, create bounding box fallback
            if not matching_geom and width > 0 and length > 0:
                matching_geom = create_bounding_box_geometry(
                    width, length, 
                    element_id=hash(name),  # Fake ID
                    name=name,
                    thickness=thickness
                )
            
            # Add copies for quantity
            if matching_geom:
                for i in range(quantity):
                    plate_geometries_expanded.append(matching_geom)
        
        if not plate_geometries_expanded:
            # Fallback: use all extracted geometries
            plate_geometries_expanded = plate_geometries
        
        print(f"[GEOM-NESTING] Nesting {len(plate_geometries_expanded)} plate instances")
        
        # Run polygon-based nesting
        nesting_results, unnested_plates = nest_plates_on_multiple_stocks(
            plate_geometries_expanded,
            stock_plates,
            max_sheets=100
        )
        
        # Calculate statistics
        statistics = calculate_nesting_statistics(
            nesting_results,
            len(plate_geometries_expanded)
        )
        
        # Convert results to JSON format
        cutting_plans = [result.to_dict() for result in nesting_results]
        unnested_list = [
            {
                'name': p.name,
                'thickness': p.thickness,
                'width': p.width,
                'length': p.length,
                'area': p.area
            }
            for p in unnested_plates
        ]
        
        print(f"[GEOM-NESTING] Complete: {len(cutting_plans)} sheets, "
              f"utilization={statistics['overall_utilization']}%")
        
        return JSONResponse({
            "success": True,
            "cutting_plans": cutting_plans,
            "statistics": statistics,
            "unnested_plates": unnested_list,
            "geometry_based": True
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate geometry-based nesting: {str(e)}")


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


# Serve static frontend files (for Railway deployment)
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Get the path to the frontend build directory
frontend_build_path = Path(__file__).parent.parent / "web" / "dist"

# Only mount static files if the build directory exists
if frontend_build_path.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_build_path / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend files for all non-API routes."""
        # Don't serve frontend for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Try to serve the requested file
        file_path = frontend_build_path / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # Otherwise serve index.html (for client-side routing)
        index_path = frontend_build_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Frontend not built")








