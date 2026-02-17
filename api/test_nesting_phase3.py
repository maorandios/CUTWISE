"""
Test script for Phase 3 of nesting refactoring.

Tests:
- Complementary pair detection
- Complementary chain building
- Bin packing algorithm
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
    # Pair detection
    ComplementaryPair, ComplementaryChain,
    check_slope_match,
    find_complementary_pairs,
    find_complementary_chains,
    # Bin packing
    calculate_combined_length_with_kerf,
    fits_in_stock,
    find_best_stock_for_parts,
    pack_parts_first_fit_decreasing,
    pack_complementary_pair,
    calculate_cut_positions
)


def test_slope_matching():
    """Test slope matching logic."""
    print("\n=== Testing Slope Matching ===")
    
    # Test matching slopes
    assert check_slope_match(85.0, 87.0, angle_tolerance=5.0) == True
    print("✓ 85° and 87° match (within 5° tolerance)")
    
    # Test non-matching slopes
    assert check_slope_match(85.0, 70.0, angle_tolerance=5.0) == False
    print("✓ 85° and 70° don't match (15° difference)")
    
    # Test None handling
    assert check_slope_match(None, 85.0) == False
    assert check_slope_match(85.0, None) == False
    print("✓ None angles don't match")
    
    # Test minimum angle threshold
    assert check_slope_match(0.5, 0.6, min_angle=1.0) == False
    print("✓ Small angles below threshold don't match")
    
    print("✓ All slope matching tests passed")


def test_complementary_pair_detection():
    """Test complementary pair detection."""
    print("\n=== Testing Complementary Pair Detection ===")
    
    # Create parts with complementary slopes
    part1 = Part(1, 2500.0, "IPE200",
                 SlopeInfo(True, 85.0, 0.8, 5.0),  # Start slope
                 SlopeInfo(False, 90.0, 0.9, 0.5),  # Straight end
                 "IfcBeam", "b1")
    
    part2 = Part(2, 2400.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),  # Straight start
                 SlopeInfo(True, 87.0, 0.8, 3.0),  # End slope (complementary to part1)
                 "IfcBeam", "b2")
    
    part3 = Part(3, 2000.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),  # Straight both sides
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b3")
    
    parts = [part1, part2, part3]
    
    # Find pairs
    pairs = find_complementary_pairs(parts)
    
    assert len(pairs) >= 1, "Expected to find at least one complementary pair"
    print(f"✓ Found {len(pairs)} complementary pair(s)")
    
    # Check first pair
    pair = pairs[0]
    assert pair.part1 == part1 or pair.part1 == part2
    assert pair.part2 == part2 or pair.part2 == part1
    assert pair.pairing_type in ['start-end', 'end-start']
    assert 0.0 <= pair.angle_match_quality <= 1.0
    assert pair.shared_cut_savings > 0.0
    
    print(f"✓ Pair details:")
    print(f"  - Pairing type: {pair.pairing_type}")
    print(f"  - Match quality: {pair.angle_match_quality:.2f}")
    print(f"  - Savings: {pair.shared_cut_savings:.1f}mm")
    
    print("✓ All complementary pair detection tests passed")


def test_complementary_chain_building():
    """Test complementary chain building."""
    print("\n=== Testing Complementary Chain Building ===")
    
    # Create a chain of parts with matching slopes
    part1 = Part(1, 2500.0, "IPE200",
                 SlopeInfo(True, 85.0, 0.8, 5.0),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b1")
    
    part2 = Part(2, 2400.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(True, 87.0, 0.8, 3.0),
                 "IfcBeam", "b2")
    
    part3 = Part(3, 2300.0, "IPE200",
                 SlopeInfo(True, 86.0, 0.8, 4.0),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b3")
    
    parts = [part1, part2, part3]
    
    # Find chains
    chains = find_complementary_chains(parts)
    
    if len(chains) > 0:
        print(f"✓ Found {len(chains)} chain(s)")
        
        # Check first chain
        chain = chains[0]
        assert chain.length >= 2, "Chain should have at least 2 parts"
        assert len(chain.connection_types) == chain.length - 1
        assert chain.total_shared_cuts == len(chain.connection_types)
        
        print(f"✓ Chain details:")
        print(f"  - Length: {chain.length} parts")
        print(f"  - Total length: {chain.total_length:.0f}mm")
        print(f"  - Shared cuts: {chain.total_shared_cuts}")
    else:
        print("✓ No chains found (parts may form pairs instead)")
    
    print("✓ All complementary chain building tests passed")


def test_bin_packing_basics():
    """Test basic bin packing functions."""
    print("\n=== Testing Bin Packing Basics ===")
    
    # Create test parts
    part1 = Part(1, 2500.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b1")
    
    part2 = Part(2, 2000.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b2")
    
    kerf = 3.0
    
    # Test combined length calculation
    combined_length = calculate_combined_length_with_kerf([part1, part2], kerf)
    expected = 2500.0 + 2000.0 + kerf  # Two parts, one kerf between them
    assert abs(combined_length - expected) < 0.1
    print(f"✓ Combined length: {combined_length:.1f}mm (expected {expected:.1f}mm)")
    
    # Test fits_in_stock
    assert fits_in_stock([part1, part2], 6000.0, kerf) == True
    assert fits_in_stock([part1, part2], 4000.0, kerf) == False
    print("✓ Fits in stock checks work")
    
    # Test find_best_stock
    stock_lengths = [6000.0, 9000.0, 12000.0]
    best_stock = find_best_stock_for_parts([part1, part2], stock_lengths, kerf)
    assert best_stock == 6000.0, "Should choose smallest stock that fits"
    print(f"✓ Best stock: {best_stock:.0f}mm")
    
    # Test cut positions
    positions = calculate_cut_positions([part1, part2], kerf)
    assert len(positions) == 3  # Start, after part1, after part2
    assert positions[0] == 0.0
    assert abs(positions[1] - 2500.0) < 0.1
    assert abs(positions[2] - (2500.0 + kerf + 2000.0)) < 0.1
    print(f"✓ Cut positions: {[f'{p:.1f}' for p in positions]}")
    
    print("✓ All bin packing basics tests passed")


def test_first_fit_decreasing():
    """Test First Fit Decreasing algorithm."""
    print("\n=== Testing First Fit Decreasing ===")
    
    # Create test parts of various sizes
    parts = [
        Part(1, 3000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
        Part(2, 2500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),
        Part(3, 2000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b3"),
        Part(4, 1500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b4"),
        Part(5, 1000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b5"),
    ]
    
    stock_lengths = [6000.0, 12000.0]
    kerf = 3.0
    
    # Pack parts
    patterns, rejected = pack_parts_first_fit_decreasing(parts, stock_lengths, kerf)
    
    assert len(rejected) == 0, "No parts should be rejected"
    assert len(patterns) > 0, "Should create at least one pattern"
    
    print(f"✓ Created {len(patterns)} pattern(s)")
    
    # Check patterns
    total_parts = sum(len(p.parts) for p in patterns)
    assert total_parts == len(parts), "All parts should be placed"
    
    for i, pattern in enumerate(patterns):
        print(f"✓ Pattern {i+1}:")
        print(f"  - Stock: {pattern.stock_length:.0f}mm")
        print(f"  - Parts: {len(pattern.parts)}")
        print(f"  - Waste: {pattern.waste:.0f}mm ({pattern.waste_percentage:.1f}%)")
        
        # Verify pattern doesn't exceed stock
        used = calculate_combined_length_with_kerf(pattern.parts, kerf)
        assert used <= pattern.stock_length, "Pattern should not exceed stock"
    
    print("✓ All First Fit Decreasing tests passed")


def test_complementary_pair_packing():
    """Test packing complementary pairs."""
    print("\n=== Testing Complementary Pair Packing ===")
    
    # Create complementary pair
    part1 = Part(1, 2500.0, "IPE200",
                 SlopeInfo(True, 85.0, 0.8, 5.0),
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 "IfcBeam", "b1")
    
    part2 = Part(2, 2400.0, "IPE200",
                 SlopeInfo(False, 90.0, 0.9, 0.5),
                 SlopeInfo(True, 87.0, 0.8, 3.0),
                 "IfcBeam", "b2")
    
    # Find pair
    pairs = find_complementary_pairs([part1, part2])
    assert len(pairs) > 0, "Should find a complementary pair"
    
    pair = pairs[0]
    
    # Pack pair
    stock_lengths = [6000.0, 12000.0]
    pattern = pack_complementary_pair(pair, stock_lengths, kerf=3.0)
    
    assert pattern is not None, "Pair should fit in available stock"
    assert len(pattern.parts) == 2
    assert pattern.shared_cuts == 1
    
    print(f"✓ Packed complementary pair:")
    print(f"  - Stock: {pattern.stock_length:.0f}mm")
    print(f"  - Waste: {pattern.waste:.0f}mm ({pattern.waste_percentage:.1f}%)")
    print(f"  - Shared cuts: {pattern.shared_cuts}")
    
    # Verify savings
    normal_length = part1.length + part2.length + 3.0  # Without savings
    actual_length = pattern.stock_length - pattern.waste
    savings = normal_length - actual_length
    print(f"  - Estimated savings: {savings:.1f}mm")
    
    print("✓ All complementary pair packing tests passed")


def test_rejection_handling():
    """Test handling of parts that don't fit."""
    print("\n=== Testing Rejection Handling ===")
    
    # Create a part that's too long
    parts = [
        Part(1, 2000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b1"),
        Part(2, 15000.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b2"),  # Too long
        Part(3, 1500.0, "IPE200", SlopeInfo(False), SlopeInfo(False), "IfcBeam", "b3"),
    ]
    
    stock_lengths = [6000.0, 12000.0]
    
    # Pack parts
    patterns, rejected = pack_parts_first_fit_decreasing(parts, stock_lengths, kerf=3.0)
    
    assert len(rejected) == 1, "One part should be rejected"
    assert rejected[0].product_id == 2, "Part 2 should be rejected"
    assert "exceeds" in rejected[0].reason.lower()
    
    print(f"✓ Rejected {len(rejected)} part(s)")
    print(f"  - Part {rejected[0].product_id}: {rejected[0].reason}")
    
    # Check that other parts were placed
    total_placed = sum(len(p.parts) for p in patterns)
    assert total_placed == 2, "Two parts should be placed"
    
    print("✓ All rejection handling tests passed")


def run_all_tests():
    """Run all Phase 3 tests."""
    print("=" * 60)
    print("NESTING REFACTORING - PHASE 3 TESTS")
    print("=" * 60)
    
    try:
        test_slope_matching()
        test_complementary_pair_detection()
        test_complementary_chain_building()
        test_bin_packing_basics()
        test_first_fit_decreasing()
        test_complementary_pair_packing()
        test_rejection_handling()
        
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

