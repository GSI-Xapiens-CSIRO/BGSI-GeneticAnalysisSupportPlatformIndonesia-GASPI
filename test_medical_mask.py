#!/usr/bin/env python3
"""
Test untuk mask_medical_record function - preserve prefix
"""
import re

MASK = "XXXXXXXXXX"

def mask_medical_record(value):
    """Mask medical record number while preserving prefix like RM-, MR-, MRN-"""
    if isinstance(value, str):
        # Match patterns like RM-, MR-, MRN- at the start
        match = re.match(r'^(RM-|MR-|MRN-)', value, re.IGNORECASE)
        if match:
            prefix = match.group(1)
            return f"{prefix}{MASK}"
    return MASK

test_cases = [
    ("RM-2024-000123", "RM-XXXXXXXXXX"),
    ("rm-12345", "rm-XXXXXXXXXX"),
    ("MR-10293847", "MR-XXXXXXXXXX"),
    ("mr-56473829", "mr-XXXXXXXXXX"),
    ("MRN-ABC12345", "MRN-XXXXXXXXXX"),
    ("mrn-xyz789", "mrn-XXXXXXXXXX"),
    ("NoPrefix123", "XXXXXXXXXX"),  # No prefix, just mask completely
    ("123456789", "XXXXXXXXXX"),      # No prefix
]

print("=" * 80)
print("TEST MASK_MEDICAL_RECORD FUNCTION")
print("=" * 80)

for input_val, expected in test_cases:
    result = mask_medical_record(input_val)
    status = "[OK]" if result == expected else "[FAIL]"
    print(f"{status}: '{input_val}' -> '{result}' (expected: '{expected}')")

print("\n" + "=" * 80)
print("TEST SELESAI")
print("=" * 80)
