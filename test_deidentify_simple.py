#!/usr/bin/env python3
"""
Simple test untuk memverifikasi logic PII masking
"""
import re

MASK = "XXXXXXXXXX"

META_PII_SUBKEYS = {
    # English
    "name", "Name", "NAME",
    "email", "Email", "EMAIL",
    "dob", "DOB", "Dob",
    "address", "Address", "ADDRESS",
    # Indonesian
    "nama", "Nama", "NAMA",
    "tanggal_lahir", "Tanggal_Lahir", "TANGGAL_LAHIR",
    "alamat", "Alamat", "ALAMAT",
}

def get_structured_meta_values(value):
    """Parse structured meta line like <key1=val1,key2=val2>"""
    if not (value.startswith("<") and value.endswith(">")):
        raise ValueError(f"Invalid format: {value}")

    values = {}
    current_key = []
    current_value = []
    extending = current_key
    in_quotes = False

    for c in value[1:]:
        if c == '"':
            in_quotes = not in_quotes
            extending.append(c)
        elif in_quotes:
            extending.append(c)
        elif c in ",>":
            values["".join(current_key)] = "".join(current_value)
            current_key.clear()
            current_value.clear()
            extending = current_key
        elif c == "=":
            extending = current_value
        else:
            extending.append(c)

    return values

def mask_pii_in_info_line(line):
    """Mask PII in ##INFO=<...> lines"""
    if not line.startswith("##INFO=<"):
        return line

    key, value = line[2:].split("=", 1)
    subkey_values = get_structured_meta_values(value)

    # Check each subkey for PII
    for subkey, subvalue in list(subkey_values.items()):
        # Skip standard VCF fields
        if subkey in {"ID", "Number", "Type", "Description"}:
            continue

        # Check if subkey name is PII field
        if subkey in META_PII_SUBKEYS:
            print(f"  [MASK] Found PII field: '{subkey}' = '{subvalue}' -> masking")
            # Preserve quotes if present
            if isinstance(subvalue, str) and subvalue.startswith('"') and subvalue.endswith('"'):
                subkey_values[subkey] = f'"{MASK}"'
            else:
                subkey_values[subkey] = MASK

    # Reconstruct line
    new_value = "<" + ",".join(f"{k}={v}" for k, v in subkey_values.items()) + ">"
    return f"##{key}={new_value}"

# Test cases
print("=" * 80)
print("TEST DEIDENTIFIKASI VCF PII FIELDS")
print("=" * 80)
print(f"\nMASK constant: '{MASK}'")
print(f"PII keywords: {META_PII_SUBKEYS}")
print("\n" + "=" * 80)

test_cases = [
    ('##INFO=<Name="John Doe",Email="john.doe@example.com",DOB="1980-01-01",Address="123 Fake St, Faketown, USA">',
     'English PII fields'),
    ('##INFO=<nama="Budi Santoso",email="budi@example.com",tanggal_lahir="1985-05-15",alamat="Jl. Sudirman No. 123, Jakarta">',
     'Indonesian PII fields'),
    ('##INFO=<ID=NS,Number=1,Type=Integer,Description="Number of Samples With Data">',
     'Standard INFO line (no PII)'),
]

for i, (line, description) in enumerate(test_cases, 1):
    print(f"\n[Test {i}] {description}")
    print(f"BEFORE: {line}")

    result = mask_pii_in_info_line(line)
    print(f"AFTER:  {result}")

    if result != line:
        print("[SUCCESS] PII DETECTED dan DI-MASK!")
    else:
        print("[INFO] No PII detected (line unchanged)")
    print("-" * 80)

print("\n" + "=" * 80)
print("TEST SELESAI")
print("=" * 80)
