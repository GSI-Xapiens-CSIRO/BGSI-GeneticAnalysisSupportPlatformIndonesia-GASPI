#!/usr/bin/env python3
"""
Test untuk CSV deidentification - medical record dengan prefix preservation
"""
import csv
import re

MASK = "XXXXXXXXXX"

INDIVIDUAL_MARKER_FIELDS = {
    "age", "sex", "gender", "nama", "name", "mrn", "no_mr"
}

METADATA_KEY_PII_PATTERNS = [
    r"(?i)^(nama|name)$",
    r"(?i)^(email|e-mail|e_mail)$",
]

MEDICAL_RECORD_PATTERNS = [
    r"(?i)^(mrn|medical_record_number)$",
    r"(?i)^(no_mr|nomor_mr)$",
]

NAME_PATTERN = re.compile(r"(?i)(name|nama)")

def mask_medical_record(value):
    """Mask medical record number while preserving prefix like RM-, MR-, MRN-"""
    if isinstance(value, str):
        match = re.match(r'^(RM-|MR-|MRN-)', value, re.IGNORECASE)
        if match:
            prefix = match.group(1)
            return f"{prefix}{MASK}"
    return MASK

def anonymise(text):
    """Simple anonymise for demo"""
    return text

# Read CSV
input_file = "test_csv_medical.csv"
output_file = "test_csv_medical_output.csv"

print("=" * 80)
print("TEST CSV MEDICAL RECORD DEIDENTIFICATION")
print("=" * 80)

with open(input_file, "r", newline="", encoding="utf-8") as infile:
    reader = csv.reader(infile)
    header = next(reader)

    # Check if individual data
    is_individual = any(
        col_name.casefold() in INDIVIDUAL_MARKER_FIELDS for col_name in header
    )

    print(f"\nIs Individual Data: {is_individual}")
    print(f"Header: {header}")

    # Mark PII columns
    pii_columns = set()
    medical_record_columns = set()

    for idx, col_name in enumerate(header):
        if any(re.match(pattern, col_name) for pattern in MEDICAL_RECORD_PATTERNS):
            pii_columns.add(idx)
            medical_record_columns.add(idx)
            print(f"  Column {idx} '{col_name}': MEDICAL RECORD (special masking)")
        elif any(re.match(pattern, col_name) for pattern in METADATA_KEY_PII_PATTERNS):
            pii_columns.add(idx)
            print(f"  Column {idx} '{col_name}': PII (full masking)")
        elif is_individual and NAME_PATTERN.search(col_name):
            pii_columns.add(idx)
            print(f"  Column {idx} '{col_name}': NAME (full masking)")
        else:
            print(f"  Column {idx} '{col_name}': NON-PII (preserved)")

    print("\n" + "=" * 80)
    print("[PROCESSING ROWS]")
    print("=" * 80)

    # Write output
    with open(output_file, "w", newline="", encoding="utf-8") as outfile:
        writer = csv.writer(outfile)
        writer.writerow(header)

        for row_num, row in enumerate(reader, 1):
            print(f"\nRow {row_num} BEFORE: {row}")

            masked_row = []
            for idx, value in enumerate(row):
                if idx in pii_columns:
                    if idx in medical_record_columns:
                        masked_value = mask_medical_record(value)
                        masked_row.append(masked_value)
                        print(f"  [{header[idx]}] '{value}' -> '{masked_value}' (prefix preserved)")
                    else:
                        masked_row.append(MASK)
                        print(f"  [{header[idx]}] '{value}' -> '{MASK}' (fully masked)")
                else:
                    masked_row.append(anonymise(value))

            print(f"Row {row_num} AFTER:  {masked_row}")
            writer.writerow(masked_row)

print("\n" + "=" * 80)
print(f"Output written to: {output_file}")
print("=" * 80)

# Show output file
print("\n[OUTPUT FILE CONTENT]")
with open(output_file, "r") as f:
    print(f.read())

print("=" * 80)
print("TEST SELESAI")
print("=" * 80)
