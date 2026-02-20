"""
Report building utilities for nesting results.

This module provides functions to format and present nesting
results in various formats (JSON, text summary, etc.).
"""

from typing import Dict, Any, List
from .models import NestingReport, ProfileNesting, CuttingPattern, Part


def format_length(length_mm: float) -> str:
    """Format length in millimeters for display."""
    return f"{length_mm:.1f}mm"


def format_percentage(percentage: float) -> str:
    """Format percentage for display."""
    return f"{percentage:.1f}%"


def build_pattern_dict(pattern: CuttingPattern) -> Dict[str, Any]:
    """
    Build a dictionary representation of a cutting pattern.
    
    Args:
        pattern: CuttingPattern object
    
    Returns:
        Dictionary suitable for JSON serialization
    """
    # Build parts list with nested structure to match frontend expectations
    parts_list = []
    for part in pattern.parts:
        parts_list.append({
            "part": part.to_dict(),  # Nested part object
            "length": part.length,
            "slope_info": {
                "start_angle": part.start_slope.angle,
                "end_angle": part.end_slope.angle,
                "start_has_slope": bool(part.start_slope.has_slope),  # Convert to native Python bool
                "end_has_slope": bool(part.end_slope.has_slope),  # Convert to native Python bool
                "has_slope": bool(part.has_any_slope),  # Convert to native Python bool
                "complementary_pair": bool(part.complementary_pair)  # Convert to native Python bool
            }
        })
    
    return {
        "stock_length": pattern.stock_length,
        "parts": parts_list,  # Nested structure
        "waste": pattern.waste,
        "waste_percentage": pattern.waste_percentage,
        "cut_positions": pattern.cut_positions,
        "shared_cuts": pattern.shared_cuts,
        "num_parts": len(pattern.parts)
    }


def build_profile_dict(profile: ProfileNesting) -> Dict[str, Any]:
    """
    Build a dictionary representation of a profile nesting result.
    
    Args:
        profile: ProfileNesting object
    
    Returns:
        Dictionary suitable for JSON serialization
    """
    result = {
        "profile_name": profile.profile_name,
        "total_parts": profile.total_parts,
        "total_length": profile.total_length,
        "cutting_patterns": [build_pattern_dict(p) for p in profile.cutting_patterns],
        "stock_lengths_used": {int(k): v for k, v in profile.stock_lengths_used.items()},
        "total_waste": profile.total_waste,
        "total_waste_percentage": profile.total_waste_percentage,
        "rejected_parts": [p.to_dict() for p in profile.rejected_parts],
        "num_patterns": len(profile.cutting_patterns),
        "num_rejected": len(profile.rejected_parts)
    }
    
    # Include alternative waste percentage if available
    if profile.alternative_waste_percentage is not None:
        result["alternative_waste_percentage"] = float(profile.alternative_waste_percentage)
    
    return result


def build_report_dict(report: NestingReport) -> Dict[str, Any]:
    """
    Build a dictionary representation of a complete nesting report.
    
    Args:
        report: NestingReport object
    
    Returns:
        Dictionary suitable for JSON serialization
    """
    return {
        "filename": report.filename,
        "profiles": [build_profile_dict(p) for p in report.profiles],
        "kerf": report.kerf,
        "stock_lengths": report.stock_lengths,
        "summary": build_report_summary(report)
    }


def build_report_summary(report: NestingReport) -> Dict[str, Any]:
    """
    Build a summary of the nesting report.
    
    Args:
        report: NestingReport object
    
    Returns:
        Dictionary with summary statistics
    """
    total_profiles = len(report.profiles)
    total_parts = sum(p.total_parts for p in report.profiles)
    total_patterns = sum(len(p.cutting_patterns) for p in report.profiles)
    total_rejected = sum(len(p.rejected_parts) for p in report.profiles)
    total_waste = sum(p.total_waste for p in report.profiles)
    
    # Calculate total stock used
    total_stock_used = sum(
        sum(pattern.stock_length for pattern in profile.cutting_patterns)
        for profile in report.profiles
    )
    
    # Calculate average waste percentage
    avg_waste_percentage = (total_waste / total_stock_used * 100.0) if total_stock_used > 0 else 0.0
    
    # Count parts with slopes
    parts_with_slopes = 0
    complementary_pairs = 0
    
    for profile in report.profiles:
        for pattern in profile.cutting_patterns:
            for part in pattern.parts:
                if part.has_any_slope:
                    parts_with_slopes += 1
                if part.complementary_pair:
                    complementary_pairs += 1
    
    # Complementary pairs count (divide by 2 since each part in a pair is counted)
    complementary_pairs = complementary_pairs // 2
    
    return {
        "total_profiles": total_profiles,
        "total_parts": total_parts,
        "total_patterns": total_patterns,
        "total_rejected": total_rejected,
        "total_waste": total_waste,
        "total_stock_used": total_stock_used,
        "avg_waste_percentage": avg_waste_percentage,
        "parts_with_slopes": parts_with_slopes,
        "complementary_pairs": complementary_pairs
    }


def format_report_text_summary(report: NestingReport) -> str:
    """
    Format a text summary of the nesting report.
    
    Args:
        report: NestingReport object
    
    Returns:
        Formatted text summary
    """
    summary = build_report_summary(report)
    
    lines = [
        "=" * 60,
        f"NESTING REPORT: {report.filename}",
        "=" * 60,
        "",
        "SUMMARY:",
        f"  Profiles: {summary['total_profiles']}",
        f"  Total parts: {summary['total_parts']}",
        f"  Cutting patterns: {summary['total_patterns']}",
        f"  Rejected parts: {summary['total_rejected']}",
        "",
        "MATERIAL USAGE:",
        f"  Total stock used: {format_length(summary['total_stock_used'])}",
        f"  Total waste: {format_length(summary['total_waste'])} ({format_percentage(summary['avg_waste_percentage'])})",
        "",
        "SLOPE OPTIMIZATION:",
        f"  Parts with slopes: {summary['parts_with_slopes']}",
        f"  Complementary pairs: {summary['complementary_pairs']}",
        "",
        "STOCK LENGTHS AVAILABLE:",
        f"  {', '.join(format_length(s) for s in report.stock_lengths)}",
        "",
        "KERF: {format_length(report.kerf)}",
        "",
        "=" * 60,
        "PROFILE DETAILS:",
        "=" * 60,
    ]
    
    for profile in report.profiles:
        lines.extend([
            "",
            f"Profile: {profile.profile_name}",
            f"  Parts: {profile.total_parts}",
            f"  Patterns: {len(profile.cutting_patterns)}",
            f"  Waste: {format_length(profile.total_waste)} ({format_percentage(profile.total_waste_percentage)})",
        ])
        
        if profile.rejected_parts:
            lines.append(f"  Rejected: {len(profile.rejected_parts)} parts")
        
        # Stock usage breakdown
        if profile.stock_lengths_used:
            lines.append("  Stock usage:")
            for stock_length, count in sorted(profile.stock_lengths_used.items()):
                lines.append(f"    {format_length(stock_length)}: {count} bar(s)")
    
    lines.append("")
    lines.append("=" * 60)
    
    return "\n".join(lines)


def format_pattern_text_summary(pattern: CuttingPattern, pattern_num: int = 1) -> str:
    """
    Format a text summary of a single cutting pattern.
    
    Args:
        pattern: CuttingPattern object
        pattern_num: Pattern number for display
    
    Returns:
        Formatted text summary
    """
    lines = [
        f"Pattern #{pattern_num}:",
        f"  Stock: {format_length(pattern.stock_length)}",
        f"  Parts: {len(pattern.parts)}",
        f"  Waste: {format_length(pattern.waste)} ({format_percentage(pattern.waste_percentage)})",
    ]
    
    if pattern.shared_cuts > 0:
        lines.append(f"  Shared cuts: {pattern.shared_cuts}")
    
    lines.append("  Parts:")
    for i, part in enumerate(pattern.parts, 1):
        slope_info = ""
        if part.has_any_slope:
            slope_info = " [SLOPE]"
        if part.complementary_pair:
            slope_info += " [PAIR]"
        
        lines.append(f"    {i}. {part.reference}: {format_length(part.length)}{slope_info}")
    
    return "\n".join(lines)


def calculate_material_savings(report: NestingReport) -> Dict[str, float]:
    """
    Calculate material savings from complementary pairing.
    
    Args:
        report: NestingReport object
    
    Returns:
        Dictionary with savings statistics
    """
    total_shared_cuts = 0
    estimated_savings = 0.0
    
    for profile in report.profiles:
        for pattern in profile.cutting_patterns:
            if pattern.shared_cuts > 0:
                total_shared_cuts += pattern.shared_cuts
                # Estimate savings: kerf + ~10mm per shared cut
                estimated_savings += pattern.shared_cuts * (report.kerf + 10.0)
    
    return {
        "total_shared_cuts": total_shared_cuts,
        "estimated_savings_mm": estimated_savings,
        "estimated_savings_percentage": 0.0  # Would need more context to calculate
    }


def export_to_json(report: NestingReport) -> Dict[str, Any]:
    """
    Export nesting report to JSON-serializable dictionary.
    
    This is the main export function for API responses.
    
    Args:
        report: NestingReport object
    
    Returns:
        Complete dictionary ready for JSON serialization
    """
    return build_report_dict(report)

