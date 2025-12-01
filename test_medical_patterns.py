#!/usr/bin/env python3
"""
Test sederhana untuk pattern matching medical record numbers
"""
import re

METADATA_KEY_PII_PATTERNS = [
    # Medical record numbers
    r"(?i)^(mrn|medical_record_number|medical record number)$",
    r"(?i)^(no_rm|no rm|nomor_rm|nomor rm|nomer_rm|nomer rm)$",
    r"(?i)^(rekam_medis|rekam medis)$",
    r"(?i)^(no_mr|no mr|nomor_mr|nomor mr|nomer_mr|nomer mr)$",
]

test_fields = [
    "mrn",
    "MRN",
    "medical_record_number",
    "medical record number",
    "no_rm",
    "no rm",
    "nomor_rm",
    "nomor rm",
    "nomer_rm",
    "nomer rm",
    "rekam_medis",
    "rekam medis",
    "no_mr",
    "no mr",
    "nomor_mr",
    "nomor mr",
    "nomer_mr",
    "nomer mr",
]

print("=" * 80)
print("TEST MEDICAL RECORD PATTERN MATCHING")
print("=" * 80)

for field in test_fields:
    matched = any(re.match(pattern, field) for pattern in METADATA_KEY_PII_PATTERNS)
    status = "[MATCH]" if matched else "[NO MATCH]"
    print(f"{status}: '{field}'")

print("\n" + "=" * 80)
print("TEST SELESAI")
print("=" * 80)
