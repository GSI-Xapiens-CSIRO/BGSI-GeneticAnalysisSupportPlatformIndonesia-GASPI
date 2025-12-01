#!/usr/bin/env python3
"""
Test script untuk memverifikasi deidentifikasi PII di VCF files
"""
import sys
sys.path.insert(0, 'sbeacon/lambda/deidentifyFiles')

from deidentification import (
    anonymise_header_line,
    remove_nested_angle_brackets,
    META_PII_SUBKEYS,
    MASK
)

# Test cases
test_lines = [
    '##INFO=<Name="John Doe",Email="john.doe@example.com",DOB="1980-01-01",Address="123 Fake St, Faketown, USA">',
    '##INFO=<nama="Budi Santoso",email="budi@example.com",tanggal_lahir="1985-05-15",alamat="Jl. Sudirman No. 123, Jakarta">',
    '##INFO=<ID=NS,Number=1,Type=Integer,Description="Number of Samples With Data">',
]

print("=" * 80)
print("TEST DEIDENTIFIKASI VCF PII FIELDS")
print("=" * 80)
print(f"\nMASK constant: {MASK}")
print(f"\nJumlah PII keywords dalam META_PII_SUBKEYS: {len(META_PII_SUBKEYS)}")
print(f"Contoh PII keywords: {list(META_PII_SUBKEYS)[:10]}...")
print("\n" + "=" * 80)

for i, line in enumerate(test_lines, 1):
    print(f"\n[Test {i}]")
    print(f"SEBELUM: {line}")

    processed = anonymise_header_line(remove_nested_angle_brackets(line))
    print(f"SESUDAH: {processed}")

    if processed != line:
        print("✅ PII DETECTED dan DI-MASK")
    else:
        print("ℹ️  No changes (tidak ada PII atau line standard)")
    print("-" * 80)

print("\n" + "=" * 80)
print("TEST SELESAI")
print("=" * 80)
