#!/usr/bin/env python3
"""
Test untuk memverifikasi medical record number fields di-mask dengan benar
"""
import json
import tempfile
import os
import sys
import unittest.mock as mock

# Mock boto3 before importing deidentification
sys.modules['boto3'] = mock.MagicMock()

# Now we can import
sys.path.insert(0, 'sbeacon/lambda/deidentifyFiles')
from deidentification import process_json, MASK

# Test data
test_input = {
    "name": "John Doe",
    "age": 45,
    "sex": "Male",
    "mrn": "RM-2024-000123",
    "medical_record_number": "MRN-ABC12345",
    "no_rm": "RM-567890",
    "nomor_rm": "RM-999888",
    "nomor rm": "RM-777666",
    "rekam_medis": "RM-555444",
    "rekam medis": "RM-333222",
    "no_mr": "MR-10293847",
    "nomor_mr": "MR-56473829",
    "diagnosis": "Type 2 Diabetes"
}

print("=" * 80)
print("TEST MEDICAL RECORD NUMBER DEIDENTIFICATION")
print("=" * 80)
print(f"\nMASK constant: '{MASK}'")
print("\n" + "=" * 80)

# Create temp files
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f_in:
    input_file = f_in.name
    json.dump([test_input], f_in)

with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f_out:
    output_file = f_out.name

try:
    print("\n[INPUT JSON]")
    print(json.dumps(test_input, indent=2, ensure_ascii=False))

    # Process the file
    process_json(input_file, output_file)

    # Read result
    with open(output_file, 'r') as f:
        result_text = f.read()
        result = json.loads(result_text)

    print("\n" + "=" * 80)
    print("[OUTPUT JSON]")
    print(json.dumps(result[0] if isinstance(result, list) else result, indent=2, ensure_ascii=False))

    # Verify results
    print("\n" + "=" * 80)
    print("[VERIFICATION]")
    print("=" * 80)

    result_obj = result[0] if isinstance(result, list) else result

    # Medical record fields that should be masked
    medical_fields = [
        "mrn", "medical_record_number", "no_rm", "nomor_rm", "nomor rm",
        "rekam_medis", "rekam medis", "no_mr", "nomor_mr"
    ]

    for field in medical_fields:
        if field in test_input:
            if field in result_obj:
                if result_obj[field] == MASK:
                    print(f"✓ '{field}': MASKED correctly = '{MASK}'")
                else:
                    print(f"✗ '{field}': NOT MASKED = '{result_obj[field]}'")
            else:
                print(f"✗ '{field}': MISSING from output")

    # Check name is masked
    if "name" in result_obj:
        if result_obj["name"] == MASK:
            print(f"✓ 'name': MASKED correctly = '{MASK}'")
        else:
            print(f"✗ 'name': NOT MASKED = '{result_obj[field]}'")

    # Check non-PII fields preserved
    if "age" in result_obj and result_obj["age"] == 45:
        print(f"✓ 'age': Preserved (demographic field)")
    if "sex" in result_obj and result_obj["sex"] == "Male":
        print(f"✓ 'sex': Preserved (demographic field)")
    if "diagnosis" in result_obj and result_obj["diagnosis"] == "Type 2 Diabetes":
        print(f"✓ 'diagnosis': Preserved (non-PII)")

    print("\n" + "=" * 80)
    print("TEST SELESAI")
    print("=" * 80)

finally:
    # Cleanup
    if os.path.exists(input_file):
        os.unlink(input_file)
    if os.path.exists(output_file):
        os.unlink(output_file)
