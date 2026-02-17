"""
Test script for Phase 1 of nesting refactoring.

Tests:
- Data models (Part, SlopeInfo, etc.)
- Slope detection logic
- Complementary matching
"""

import sys
import io

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from nesting import (
    SlopeInfo, Part, CuttingPattern, ProfileNesting, NestingReport,
    detect_angle_convention, is_slope_significant, create_slope_info,
    handle_dual_slope_short_part, are_slopes_complementary,
    calculate_slope_match_score, format_slope_info
)


def test_angle_convention_detection():
    """Test angle convention detection."""
    print("\n=== Testing Angle Convention Detection ===")
    
    # Test ABSOLUTE convention (90° = straight)
    convention, deviation = detect_angle_convention(90.0)
    assert convention == "ABSOLUTE", f"Expected ABSOLUTE, got {convention}"
    assert abs(deviation - 0.0) < 0.01, f"Expected 0°, got {deviation}"
    print(f"✓ 90° -> {convention}, deviation={deviation:.2f}°")
    
    convention, deviation = detect_angle_convention(85.0)
    assert convention == "ABSOLUTE", f"Expected ABSOLUTE, got {convention}"
    assert abs(deviation - 5.0) < 0.01, f"Expected 5°, got {deviation}"
    print(f"✓ 85° -> {convention}, deviation={deviation:.2f}°")
    
    # Test DEVIATION convention (0° = straight)
    convention, deviation = detect_angle_convention(0.0)
    assert convention == "DEVIATION", f"Expected DEVIATION, got {convention}"
    assert abs(deviation - 0.0) < 0.01, f"Expected 0°, got {deviation}"
    print(f"✓ 0° -> {convention}, deviation={deviation:.2f}°")
    
    convention, deviation = detect_angle_convention(3.0)
    assert convention == "DEVIATION", f"Expected DEVIATION, got {convention}"
    assert abs(deviation - 3.0) < 0.01, f"Expected 3°, got {deviation}"
    print(f"✓ 3° -> {convention}, deviation={deviation:.2f}°")
    
    print("✓ All angle convention tests passed")


def test_slope_significance():
    """Test slope significance detection."""
    print("\n=== Testing Slope Significance ===")
    
    # Significant slope: 5° deviation, high confidence
    has_slope, deviation = is_slope_significant(85.0, 0.8)
    assert has_slope, "Expected slope to be significant"
    assert abs(deviation - 5.0) < 0.01
    print(f"✓ 85° @ 0.8 confidence -> has_slope={has_slope}, deviation={deviation:.2f}°")
    
    # Not significant: small deviation
    has_slope, deviation = is_slope_significant(90.5, 0.8)
    assert not has_slope, "Expected slope to be insignificant (small deviation)"
    print(f"✓ 90.5° @ 0.8 confidence -> has_slope={has_slope}, deviation={deviation:.2f}°")
    
    # Not significant: low confidence
    has_slope, deviation = is_slope_significant(85.0, 0.2)
    assert not has_slope, "Expected slope to be insignificant (low confidence)"
    print(f"✓ 85° @ 0.2 confidence -> has_slope={has_slope}, deviation={deviation:.2f}°")
    
    print("✓ All slope significance tests passed")


def test_slope_info_creation():
    """Test SlopeInfo object creation."""
    print("\n=== Testing SlopeInfo Creation ===")
    
    # Create slope with significant angle
    slope = create_slope_info(85.0, 0.8)
    assert slope.has_slope, "Expected has_slope=True"
    assert slope.angle == 85.0
    assert slope.confidence == 0.8
    assert abs(slope.deviation_from_straight - 5.0) < 0.01
    print(f"✓ Created slope: {format_slope_info(slope)}")
    
    # Create slope with insignificant angle
    slope = create_slope_info(90.5, 0.8)
    assert not slope.has_slope, "Expected has_slope=False"
    print(f"✓ Created straight cut: {format_slope_info(slope)}")
    
    # Create slope with no data
    slope = create_slope_info(None, 0.0)
    assert not slope.has_slope
    assert slope.angle is None
    print(f"✓ Created no-data slope: {format_slope_info(slope)}")
    
    print("✓ All SlopeInfo creation tests passed")


def test_complementary_matching():
    """Test complementary slope matching."""
    print("\n=== Testing Complementary Matching ===")
    
    # Create two complementary slopes
    slope1 = create_slope_info(85.0, 0.8)  # 5° deviation
    slope2 = create_slope_info(87.0, 0.7)  # 3° deviation
    
    is_complementary = are_slopes_complementary(slope1, slope2)
    assert is_complementary, "Expected slopes to be complementary"
    print(f"✓ 85° and 87° are complementary")
    
    # Test match score
    score = calculate_slope_match_score(slope1, slope2)
    assert score > 0.5, f"Expected high match score, got {score}"
    print(f"✓ Match score: {score:.2f}")
    
    # Create non-complementary slopes (too different)
    slope3 = create_slope_info(70.0, 0.8)  # 20° deviation
    is_complementary = are_slopes_complementary(slope1, slope3)
    assert not is_complementary, "Expected slopes to NOT be complementary"
    print(f"✓ 85° and 70° are NOT complementary")
    
    score = calculate_slope_match_score(slope1, slope3)
    # Score should be lower than the complementary pair
    score_complementary = calculate_slope_match_score(slope1, slope2)
    assert score < score_complementary, f"Expected lower match score than complementary pair"
    print(f"✓ Match score: {score:.2f} (lower than complementary: {score_complementary:.2f})")
    
    print("✓ All complementary matching tests passed")


def test_dual_slope_short_part():
    """Test dual-slope short part handling."""
    print("\n=== Testing Dual-Slope Short Part ===")
    
    # Create short part with similar low-confidence angles
    start = SlopeInfo(has_slope=False, angle=70.0, confidence=0.2, deviation_from_straight=20.0)
    end = SlopeInfo(has_slope=False, angle=72.0, confidence=0.2, deviation_from_straight=18.0)
    
    updated_start, updated_end = handle_dual_slope_short_part(start, end, 300.0)
    
    # One should be marked as slope (the one with larger deviation)
    assert updated_start.has_slope or updated_end.has_slope, "Expected one end to have slope"
    assert not (updated_start.has_slope and updated_end.has_slope), "Expected only one end to have slope"
    
    if updated_start.has_slope:
        print(f"✓ Short part: START marked as slope (20° > 18°)")
    else:
        print(f"✓ Short part: END marked as slope")
    
    # Test with long part (no special handling)
    updated_start2, updated_end2 = handle_dual_slope_short_part(start, end, 1000.0)
    assert not updated_start2.has_slope and not updated_end2.has_slope
    print(f"✓ Long part: No special handling applied")
    
    print("✓ All dual-slope short part tests passed")


def test_part_model():
    """Test Part data model."""
    print("\n=== Testing Part Model ===")
    
    # Create a part with slopes
    start_slope = create_slope_info(85.0, 0.8)
    end_slope = create_slope_info(90.0, 0.9)
    
    part = Part(
        product_id=12345,
        length=2500.0,
        profile_name="IPE200",
        start_slope=start_slope,
        end_slope=end_slope,
        element_type="IfcBeam",
        reference="b27",
        assembly_mark="A1"
    )
    
    assert part.has_any_slope, "Expected part to have slope"
    assert not part.has_both_slopes, "Expected part to have only one slope"
    assert not part.is_straight_both_sides, "Expected part to have at least one slope"
    assert part.cut_category == "straight-end", f"Expected 'straight-end', got {part.cut_category}"
    
    print(f"✓ Created part: {part.reference} ({part.profile_name}), length={part.length}mm")
    print(f"  - has_any_slope: {part.has_any_slope}")
    print(f"  - cut_category: {part.cut_category}")
    
    # Test to_dict and from_dict
    part_dict = part.to_dict()
    assert part_dict["product_id"] == 12345
    assert part_dict["profile_name"] == "IPE200"
    print(f"✓ Part serialization works")
    
    part_restored = Part.from_dict(part_dict)
    assert part_restored.product_id == part.product_id
    assert part_restored.length == part.length
    assert part_restored.start_slope.has_slope == part.start_slope.has_slope
    print(f"✓ Part deserialization works")
    
    print("✓ All Part model tests passed")


def test_cutting_pattern_model():
    """Test CuttingPattern data model."""
    print("\n=== Testing CuttingPattern Model ===")
    
    # Create parts
    start_slope1 = create_slope_info(85.0, 0.8)
    end_slope1 = create_slope_info(90.0, 0.9)
    part1 = Part(1, 2500.0, "IPE200", start_slope1, end_slope1, "IfcBeam", "b1")
    
    start_slope2 = create_slope_info(90.0, 0.9)
    end_slope2 = create_slope_info(87.0, 0.8)
    part2 = Part(2, 2000.0, "IPE200", start_slope2, end_slope2, "IfcBeam", "b2")
    
    # Create cutting pattern
    pattern = CuttingPattern(
        stock_length=12000.0,
        parts=[part1, part2],
        waste=7497.0,  # 12000 - 2500 - 2000 - 3 (kerf)
        waste_percentage=62.5,
        cut_positions=[0, 2500, 4503],
        shared_cuts=1
    )
    
    assert len(pattern.parts) == 2
    assert pattern.stock_length == 12000.0
    assert pattern.shared_cuts == 1
    print(f"✓ Created cutting pattern: {len(pattern.parts)} parts, waste={pattern.waste:.0f}mm ({pattern.waste_percentage:.1f}%)")
    
    # Test serialization
    pattern_dict = pattern.to_dict()
    assert "parts" in pattern_dict
    assert len(pattern_dict["parts"]) == 2
    print(f"✓ CuttingPattern serialization works")
    
    print("✓ All CuttingPattern model tests passed")


def test_nesting_report_model():
    """Test complete nesting report model."""
    print("\n=== Testing NestingReport Model ===")
    
    # Create a simple profile nesting
    start_slope = create_slope_info(85.0, 0.8)
    end_slope = create_slope_info(90.0, 0.9)
    part = Part(1, 2500.0, "IPE200", start_slope, end_slope, "IfcBeam", "b1")
    
    pattern = CuttingPattern(
        stock_length=12000.0,
        parts=[part],
        waste=9497.0,
        waste_percentage=79.1,
        cut_positions=[0, 2500],
        shared_cuts=0
    )
    
    profile_nesting = ProfileNesting(
        profile_name="IPE200",
        total_parts=1,
        total_length=2500.0,
        cutting_patterns=[pattern],
        stock_lengths_used={12000.0: 1},
        total_waste=9497.0,
        total_waste_percentage=79.1
    )
    
    # Create report
    report = NestingReport(
        filename="test.ifc",
        profiles=[profile_nesting],
        kerf=3.0,
        stock_lengths=[12000.0, 6000.0]
    )
    
    assert report.filename == "test.ifc"
    assert len(report.profiles) == 1
    assert report.kerf == 3.0
    print(f"✓ Created nesting report for {report.filename}")
    print(f"  - {len(report.profiles)} profile(s)")
    print(f"  - kerf: {report.kerf}mm")
    
    # Test serialization
    report_dict = report.to_dict()
    assert "filename" in report_dict
    assert "profiles" in report_dict
    assert len(report_dict["profiles"]) == 1
    print(f"✓ NestingReport serialization works")
    
    print("✓ All NestingReport model tests passed")


def run_all_tests():
    """Run all Phase 1 tests."""
    print("=" * 60)
    print("NESTING REFACTORING - PHASE 1 TESTS")
    print("=" * 60)
    
    try:
        test_angle_convention_detection()
        test_slope_significance()
        test_slope_info_creation()
        test_complementary_matching()
        test_dual_slope_short_part()
        test_part_model()
        test_cutting_pattern_model()
        test_nesting_report_model()
        
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

