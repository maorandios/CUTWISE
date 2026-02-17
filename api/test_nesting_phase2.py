"""
Test script for Phase 2 of nesting refactoring.

Tests:
- Profile name utilities
- Part sorting and categorization
- Statistics calculation
"""

import sys
import io

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from nesting import (
    # Models
    Part, SlopeInfo,
    # Profile utilities
    extract_base_profile_name,
    is_valid_profile_name,
    normalize_profile_name,
    parse_profile_dimensions,
    group_profiles_by_base_name,
    format_profile_name_for_display,
    # Part sorting
    sort_parts_by_length,
    sort_parts_by_cut_category,
    categorize_parts_by_cuts,
    filter_parts_by_length,
    find_complementary_candidates,
    get_parts_statistics
)


def test_profile_name_extraction():
    """Test profile name extraction and normalization."""
    print("\n=== Testing Profile Name Extraction ===")
    
    # Test base name extraction
    assert extract_base_profile_name("beam_IPE200") == "IPE200"
    assert extract_base_profile_name("column_HEA300") == "HEA300"
    assert extract_base_profile_name("IfcBeam_IPE200") == "IPE200"
    assert extract_base_profile_name("IPE200") == "IPE200"
    print("✓ Base name extraction works")
    
    # Test validation
    assert is_valid_profile_name("IPE200") == True
    assert is_valid_profile_name("HEA300") == True
    assert is_valid_profile_name("RHS100X50X5") == True
    assert is_valid_profile_name("") == False
    assert is_valid_profile_name("123") == False
    print("✓ Profile name validation works")
    
    # Test normalization
    assert normalize_profile_name("  ipe200  ") == "IPE200"
    assert normalize_profile_name("beam_HEA300") == "HEA300"
    print("✓ Profile name normalization works")
    
    # Test dimension parsing
    dims = parse_profile_dimensions("IPE200")
    assert dims["series"] == "IPE"
    assert dims["height"] == 200
    print(f"✓ Parsed IPE200: {dims}")
    
    dims = parse_profile_dimensions("RHS100X50X5")
    assert dims["series"] == "RHS"
    assert dims["width"] == 100
    assert dims["height"] == 50
    assert dims["thickness"] == 5
    print(f"✓ Parsed RHS100X50X5: {dims}")
    
    # Test grouping
    profiles = ["beam_IPE200", "column_IPE200", "member_HEA300", "IfcBeam_HEA300"]
    grouped = group_profiles_by_base_name(profiles)
    assert "IPE200" in grouped
    assert len(grouped["IPE200"]) == 2
    assert "HEA300" in grouped
    assert len(grouped["HEA300"]) == 2
    print(f"✓ Grouped profiles: {grouped}")
    
    # Test display formatting
    assert format_profile_name_for_display("IPE200") == "IPE 200"
    assert format_profile_name_for_display("beam_HEA300") == "HEA 300"
    print("✓ Display formatting works")
    
    print("✓ All profile name tests passed")


def test_part_sorting():
    """Test part sorting functions."""
    print("\n=== Testing Part Sorting ===")
    
    # Create test parts with different cut types
    parts = [
        Part(1, 2500.0, "IPE200", 
             SlopeInfo(True, 85.0, 0.8, 5.0), 
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b1"),  # straight-end
        Part(2, 3000.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b2"),  # straight-both
        Part(3, 1500.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(True, 87.0, 0.8, 3.0),
             "IfcBeam", "b3"),  # straight-start
        Part(4, 2000.0, "IPE200",
             SlopeInfo(True, 85.0, 0.8, 5.0),
             SlopeInfo(True, 87.0, 0.8, 3.0),
             "IfcBeam", "b4"),  # sloped-both
    ]
    
    # Test length sorting
    sorted_by_length = sort_parts_by_length(parts)
    assert sorted_by_length[0].length == 3000.0  # Longest first
    assert sorted_by_length[-1].length == 1500.0  # Shortest last
    print(f"✓ Length sorting: {[p.length for p in sorted_by_length]}")
    
    # Test cut category sorting
    sorted_by_category = sort_parts_by_cut_category(parts)
    categories = [p.cut_category for p in sorted_by_category]
    print(f"✓ Category sorting: {categories}")
    
    # Verify order: straight-both first, sloped-both last
    assert sorted_by_category[0].cut_category == "straight-both"
    assert sorted_by_category[-1].cut_category == "sloped-both"
    
    # Test categorization
    categorized = categorize_parts_by_cuts(parts)
    assert len(categorized["straight-both"]) == 1
    assert len(categorized["straight-start"]) == 1
    assert len(categorized["straight-end"]) == 1
    assert len(categorized["sloped-both"]) == 1
    print(f"✓ Categorization: {[(k, len(v)) for k, v in categorized.items()]}")
    
    # Test filtering
    filtered = filter_parts_by_length(parts, min_length=2000.0, max_length=2500.0)
    assert len(filtered) == 2
    print(f"✓ Filtered (2000-2500mm): {len(filtered)} parts")
    
    print("✓ All part sorting tests passed")


def test_complementary_finding():
    """Test finding complementary parts."""
    print("\n=== Testing Complementary Finding ===")
    
    # Create parts with complementary slopes
    part1 = Part(1, 2500.0, "IPE200",
                 SlopeInfo(True, 85.0, 0.8, 5.0),  # 5° slope
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b1")
    
    part2 = Part(2, 2400.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(True, 87.0, 0.8, 3.0),  # 3° slope (complementary to part1)
                 "IfcBeam", "b2")
    
    part3 = Part(3, 2000.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(True, 70.0, 0.8, 20.0),  # 20° slope (not complementary)
                 "IfcBeam", "b3")
    
    candidate_pool = [part2, part3]
    
    # Find complements for part1
    complements = find_complementary_candidates(part1, candidate_pool)
    
    assert len(complements) >= 1, "Expected to find at least one complement"
    assert part2 in complements, "part2 should be complementary to part1"
    print(f"✓ Found {len(complements)} complementary part(s) for part1")
    
    # Verify sorting by length similarity
    if len(complements) > 1:
        # Complements should be sorted by length similarity
        for i in range(len(complements) - 1):
            diff1 = abs(complements[i].length - part1.length)
            diff2 = abs(complements[i+1].length - part1.length)
            assert diff1 <= diff2, "Complements should be sorted by length similarity"
    
    print("✓ All complementary finding tests passed")


def test_statistics():
    """Test statistics calculation."""
    print("\n=== Testing Statistics Calculation ===")
    
    # Create test parts
    parts = [
        Part(1, 2500.0, "IPE200",
             SlopeInfo(True, 85.0, 0.8, 5.0),
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b1"),
        Part(2, 3000.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b2"),
        Part(3, 1500.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(True, 87.0, 0.8, 3.0),
             "IfcBeam", "b3"),
    ]
    
    stats = get_parts_statistics(parts)
    
    assert stats["total_parts"] == 3
    assert stats["total_length"] == 7000.0
    assert abs(stats["avg_length"] - 2333.33) < 1.0
    assert stats["min_length"] == 1500.0
    assert stats["max_length"] == 3000.0
    assert stats["parts_with_slopes"] == 2
    assert stats["parts_straight_both"] == 1
    
    print(f"✓ Statistics calculated:")
    print(f"  - Total parts: {stats['total_parts']}")
    print(f"  - Total length: {stats['total_length']}mm")
    print(f"  - Avg length: {stats['avg_length']:.1f}mm")
    print(f"  - Parts with slopes: {stats['parts_with_slopes']}")
    print(f"  - Parts by category: {stats['parts_by_category']}")
    
    # Test empty list
    empty_stats = get_parts_statistics([])
    assert empty_stats["total_parts"] == 0
    print("✓ Empty list statistics work")
    
    print("✓ All statistics tests passed")


def test_part_properties():
    """Test Part model properties."""
    print("\n=== Testing Part Properties ===")
    
    # Create part with one slope
    part = Part(1, 2500.0, "IPE200",
                SlopeInfo(True, 85.0, 0.8, 5.0),
                SlopeInfo(False, 90.0, 0.9, 0.5),
                "IfcBeam", "b1")
    
    assert part.has_any_slope == True
    assert part.has_both_slopes == False
    assert part.has_straight_start == False
    assert part.has_straight_end == True
    assert part.is_straight_both_sides == False
    assert part.cut_category == "straight-end"
    print(f"✓ Part with one slope: category={part.cut_category}")
    
    # Create part with both slopes
    part2 = Part(2, 2000.0, "IPE200",
                 SlopeInfo(True, 85.0, 0.8, 5.0),
                 SlopeInfo(True, 87.0, 0.8, 3.0),
                 "IfcBeam", "b2")
    
    assert part2.has_any_slope == True
    assert part2.has_both_slopes == True
    assert part2.is_straight_both_sides == False
    assert part2.cut_category == "sloped-both"
    print(f"✓ Part with both slopes: category={part2.cut_category}")
    
    # Create straight part
    part3 = Part(3, 3000.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b3")
    
    assert part3.has_any_slope == False
    assert part3.is_straight_both_sides == True
    assert part3.cut_category == "straight-both"
    print(f"✓ Straight part: category={part3.cut_category}")
    
    print("✓ All part property tests passed")


def run_all_tests():
    """Run all Phase 2 tests."""
    print("=" * 60)
    print("NESTING REFACTORING - PHASE 2 TESTS")
    print("=" * 60)
    
    try:
        test_profile_name_extraction()
        test_part_sorting()
        test_complementary_finding()
        test_statistics()
        test_part_properties()
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())

