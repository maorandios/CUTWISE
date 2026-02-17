"""
Test script for Phase 4 of nesting refactoring.

Tests:
- Nesting orchestrator
- Report building
- End-to-end integration
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
    # Orchestrator
    NestingOrchestrator,
    # Report builder
    build_report_dict,
    build_report_summary,
    format_report_text_summary,
    export_to_json
)


def test_orchestrator_initialization():
    """Test orchestrator initialization."""
    print("\n=== Testing Orchestrator Initialization ===")
    
    stock_lengths = [6000.0, 9000.0, 12000.0]
    orchestrator = NestingOrchestrator(
        stock_lengths=stock_lengths,
        kerf=3.0,
        angle_tolerance=5.0
    )
    
    assert orchestrator.stock_lengths == stock_lengths
    assert orchestrator.kerf == 3.0
    assert orchestrator.angle_tolerance == 5.0
    assert orchestrator.max_stock_length == 12000.0
    
    print(f"✓ Orchestrator initialized:")
    print(f"  - Stock lengths: {orchestrator.stock_lengths}")
    print(f"  - Kerf: {orchestrator.kerf}mm")
    print(f"  - Max stock: {orchestrator.max_stock_length}mm")
    
    print("✓ All orchestrator initialization tests passed")


def test_single_profile_nesting():
    """Test nesting a single profile."""
    print("\n=== Testing Single Profile Nesting ===")
    
    # Create test parts
    parts = [
        Part(1, 3000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
        Part(2, 2500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),
        Part(3, 2000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b3"),
        Part(4, 1500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b4"),
    ]
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    # Nest the profile
    result = orchestrator.nest_profile(parts, "IPE200", use_complementary_pairing=False)
    
    assert result.profile_name == "IPE200"
    assert result.total_parts == 4
    assert len(result.cutting_patterns) > 0
    assert result.total_length == 9000.0  # Sum of all part lengths
    
    print(f"✓ Nesting result:")
    print(f"  - Profile: {result.profile_name}")
    print(f"  - Total parts: {result.total_parts}")
    print(f"  - Patterns: {len(result.cutting_patterns)}")
    print(f"  - Total waste: {result.total_waste:.0f}mm ({result.total_waste_percentage:.1f}%)")
    
    # Check patterns
    for i, pattern in enumerate(result.cutting_patterns, 1):
        print(f"  - Pattern {i}: {len(pattern.parts)} parts, {pattern.waste:.0f}mm waste")
    
    print("✓ All single profile nesting tests passed")


def test_complementary_pairing_nesting():
    """Test nesting with complementary pairing."""
    print("\n=== Testing Complementary Pairing Nesting ===")
    
    # Create parts with complementary slopes
    parts = [
        Part(1, 2500.0, "IPE200",
             SlopeInfo(True, 85.0, 0.8, 5.0),
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b1"),
        Part(2, 2400.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(True, 87.0, 0.8, 3.0),
             "IfcBeam", "b2"),
        Part(3, 2000.0, "IPE200",
             SlopeInfo(False, 90.0, 0.9, 0.5),
             SlopeInfo(False, 90.0, 0.9, 0.5),
             "IfcBeam", "b3"),
    ]
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    # Nest with complementary pairing enabled
    result = orchestrator.nest_profile(parts, "IPE200", use_complementary_pairing=True)
    
    assert result.profile_name == "IPE200"
    assert result.total_parts == 3
    
    # Check if any patterns have shared cuts (indicating complementary pairing)
    has_shared_cuts = any(p.shared_cuts > 0 for p in result.cutting_patterns)
    
    print(f"✓ Nesting with complementary pairing:")
    print(f"  - Total parts: {result.total_parts}")
    print(f"  - Patterns: {len(result.cutting_patterns)}")
    print(f"  - Shared cuts found: {has_shared_cuts}")
    
    for i, pattern in enumerate(result.cutting_patterns, 1):
        if pattern.shared_cuts > 0:
            print(f"  - Pattern {i}: {pattern.shared_cuts} shared cut(s)")
    
    print("✓ All complementary pairing nesting tests passed")


def test_multiple_profiles_nesting():
    """Test nesting multiple profiles."""
    print("\n=== Testing Multiple Profiles Nesting ===")
    
    # Create parts for different profiles
    parts_by_profile = {
        "IPE200": [
            Part(1, 3000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
            Part(2, 2500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),
        ],
        "HEA300": [
            Part(3, 4000.0, "HEA300", SlopeInfo(False), SlopeInfo(False), "IfcColumn", "c1"),
            Part(4, 3500.0, "HEA300", SlopeInfo(False), SlopeInfo(False), "IfcColumn", "c2"),
        ]
    }
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    # Nest all profiles
    results = orchestrator.nest_parts_by_profile(parts_by_profile)
    
    assert len(results) == 2
    
    print(f"✓ Nested {len(results)} profiles:")
    
    for result in results:
        print(f"  - {result.profile_name}: {result.total_parts} parts, "
              f"{len(result.cutting_patterns)} patterns")
    
    print("✓ All multiple profiles nesting tests passed")


def test_report_building():
    """Test report building functions."""
    print("\n=== Testing Report Building ===")
    
    # Create a simple nesting result
    parts = [
        Part(1, 3000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
        Part(2, 2500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),
    ]
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    profile_result = orchestrator.nest_profile(parts, "IPE200")
    
    # Create a mock report
    from nesting import NestingReport
    report = NestingReport(
        filename="test.ifc",
        profiles=[profile_result],
        kerf=3.0,
        stock_lengths=[6000.0, 12000.0]
    )
    
    # Test report dict building
    report_dict = build_report_dict(report)
    assert "filename" in report_dict
    assert "profiles" in report_dict
    assert "summary" in report_dict
    print("✓ Report dictionary built successfully")
    
    # Test summary building
    summary = build_report_summary(report)
    assert "total_profiles" in summary
    assert "total_parts" in summary
    assert "total_patterns" in summary
    assert summary["total_profiles"] == 1
    assert summary["total_parts"] == 2
    print(f"✓ Summary built: {summary['total_parts']} parts, {summary['total_patterns']} patterns")
    
    # Test text summary
    text_summary = format_report_text_summary(report)
    assert "NESTING REPORT" in text_summary
    assert "test.ifc" in text_summary
    assert "IPE200" in text_summary
    print("✓ Text summary generated")
    
    # Test JSON export
    json_data = export_to_json(report)
    assert isinstance(json_data, dict)
    assert "filename" in json_data
    print("✓ JSON export successful")
    
    print("✓ All report building tests passed")


def test_rejection_handling():
    """Test handling of rejected parts."""
    print("\n=== Testing Rejection Handling ===")
    
    # Create parts, including one that's too long
    parts = [
        Part(1, 2000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
        Part(2, 15000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),  # Too long
        Part(3, 1500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b3"),
    ]
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    result = orchestrator.nest_profile(parts, "IPE200")
    
    assert len(result.rejected_parts) == 1
    assert result.rejected_parts[0].product_id == 2
    
    print(f"✓ Rejection handling:")
    print(f"  - Rejected parts: {len(result.rejected_parts)}")
    print(f"  - Reason: {result.rejected_parts[0].reason}")
    
    # Check that other parts were nested
    total_nested = sum(len(p.parts) for p in result.cutting_patterns)
    assert total_nested == 2
    print(f"  - Successfully nested: {total_nested} parts")
    
    print("✓ All rejection handling tests passed")


def test_empty_profile():
    """Test handling of empty profile."""
    print("\n=== Testing Empty Profile Handling ===")
    
    orchestrator = NestingOrchestrator(
        stock_lengths=[6000.0, 12000.0],
        kerf=3.0
    )
    
    result = orchestrator.nest_profile([], "IPE200")
    
    assert result.profile_name == "IPE200"
    assert result.total_parts == 0
    assert len(result.cutting_patterns) == 0
    assert result.total_waste == 0.0
    
    print("✓ Empty profile handled correctly")
    print("✓ All empty profile tests passed")


def run_all_tests():
    """Run all Phase 4 tests."""
    print("=" * 60)
    print("NESTING REFACTORING - PHASE 4 TESTS")
    print("=" * 60)
    
    try:
        test_orchestrator_initialization()
        test_single_profile_nesting()
        test_complementary_pairing_nesting()
        test_multiple_profiles_nesting()
        test_report_building()
        test_rejection_handling()
        test_empty_profile()
        
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

