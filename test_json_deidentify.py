#!/usr/bin/env python3
"""
Test untuk JSON deidentification - memastikan PII fields tetap ada tapi di-mask
"""
import json
import tempfile
import os

# Mock the imports that require boto3
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
    "nama": "Budi Santoso",
    "fullname": "John Doe Smith",
    "umur": 45,
    "jenis_kelamin": "Laki-laki",
    "email": "john@example.com",
    "nomor_telepon": "081234567890",
    "address": "123 Main St",
    "alamat": "Jl. Sudirman No. 123",
    "riwayat_medis": ["Diabetes", "Hipertensi"],
    "data_non_pii": "This should remain"
}

print("=" * 80)
print("TEST JSON DEIDENTIFICATION - KEEP PII KEYS WITH MASKED VALUES")
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

    # Check that PII name fields are present and masked
    pii_name_fields = ["name", "nama", "fullname"]
    for field in pii_name_fields:
        if field in test_input:
            if field in result_obj:
                if result_obj[field] == MASK:
                    print(f"✓ '{field}': PRESENT and MASKED = '{MASK}'")
                else:
                    print(f"✗ '{field}': PRESENT but NOT MASKED = '{result_obj[field]}'")
            else:
                print(f"✗ '{field}': MISSING (should be present with MASK)")

    # Check other PII fields
    other_pii = ["email", "nomor_telepon", "address", "alamat"]
    for field in other_pii:
        if field in test_input:
            if field in result_obj:
                if result_obj[field] == MASK:
                    print(f"✓ '{field}': PRESENT and MASKED = '{MASK}'")
                else:
                    print(f"? '{field}': PRESENT = '{result_obj[field]}'")
            else:
                print(f"? '{field}': REMOVED")

    # Check non-PII fields
    if "umur" in result_obj and result_obj["umur"] == 45:
        print(f"✓ 'umur': Preserved (non-PII numeric)")
    if "jenis_kelamin" in result_obj:
        print(f"✓ 'jenis_kelamin': Preserved")
    if "data_non_pii" in result_obj and result_obj["data_non_pii"] == "This should remain":
        print(f"✓ 'data_non_pii': Preserved (non-PII string)")

    print("\n" + "=" * 80)
    print("TEST SELESAI")
    print("=" * 80)

finally:
    # Cleanup
    if os.path.exists(input_file):
        os.unlink(input_file)
    if os.path.exists(output_file):
        os.unlink(output_file)
