export type PharmcatColumnDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array';

export interface PharmcatFilterField {
  field: string;
  dataType: PharmcatColumnDataType;
}

export const PHARMGKB_FILTER_FIELDS_RSJPD_VARIANTS: PharmcatFilterField[] = [
  { field: 'Organisation', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Position', dataType: 'number' },
  { field: 'RSID', dataType: 'string' },
  { field: 'Call', dataType: 'string' },
  { field: 'Alleles', dataType: 'array' },
  { field: 'Related Diplotypes', dataType: 'string' },
  { field: 'Qual', dataType: 'number' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'number' },
  { field: 'Genotype Quality', dataType: 'number' },
  { field: 'Mapping Quality', dataType: 'number' },
  { field: 'Quality by Depth', dataType: 'number' },
  { field: 'AF (Afr)', dataType: 'number' },
  { field: 'AF (Eas)', dataType: 'number' },
  { field: 'AF (Fin)', dataType: 'number' },
  { field: 'AF (Nfe)', dataType: 'number' },
  { field: 'AF (Sas)', dataType: 'number' },
  { field: 'AF (Amr)', dataType: 'number' },
  { field: 'AF', dataType: 'number' },
  { field: 'AC', dataType: 'number' },
  { field: 'AN', dataType: 'number' },
  { field: 'Max sift', dataType: 'number' },
];

export const PHARMGKB_FILTER_FIELDS_RSJPD_DIPLOTYPES: PharmcatFilterField[] = [
  { field: 'Organisation', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Drug', dataType: 'string' },
  { field: 'Alleles', dataType: 'array' },
  { field: 'Phenotypes', dataType: 'array' },
  { field: 'Variants', dataType: 'array' },
  { field: 'Related Variants', dataType: 'array' },
  { field: 'PubMed IDs', dataType: 'array' },
  { field: 'Implications', dataType: 'array' },
  { field: 'Recommendation', dataType: 'string' },
  { field: 'Classification', dataType: 'string' },
  { field: 'Population', dataType: 'string' },
  { field: 'Dosing Information', dataType: 'boolean' },
  { field: 'Alternate Drug Available', dataType: 'boolean' },
  { field: 'Other Prescribing Guidance', dataType: 'boolean' },
];

export const PHARMGKB_FILTER_FIELDS_RSPON_VARIANTS: PharmcatFilterField[] = [
  { field: 'Organisation', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Position', dataType: 'number' },
  { field: 'RSID', dataType: 'string' },
  { field: 'Call', dataType: 'string' },
  { field: 'Alleles', dataType: 'array' },
  { field: 'Related Diplotypes', dataType: 'string' },
  { field: 'Qual', dataType: 'number' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'number' },
  { field: 'Genotype Quality', dataType: 'number' },
  { field: 'Mapping Quality', dataType: 'number' },
  { field: 'Quality by Depth', dataType: 'number' },
  { field: 'AF (Afr)', dataType: 'number' },
  { field: 'AF (Eas)', dataType: 'number' },
  { field: 'AF (Fin)', dataType: 'number' },
  { field: 'AF (Nfe)', dataType: 'number' },
  { field: 'AF (Sas)', dataType: 'number' },
  { field: 'AF (Amr)', dataType: 'number' },
  { field: 'AF', dataType: 'number' },
  { field: 'AC', dataType: 'number' },
  { field: 'AN', dataType: 'number' },
  { field: 'Max sift', dataType: 'number' },
];

export const PHARMGKB_FILTER_FIELDS_RSPON_DIPLOTYPES: PharmcatFilterField[] = [
  { field: 'Organisation', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Drug', dataType: 'string' },
  { field: 'Alleles', dataType: 'array' },
  { field: 'Phenotypes', dataType: 'array' },
  { field: 'Variants', dataType: 'array' },
  { field: 'Related Variants', dataType: 'array' },
  { field: 'PubMed IDs', dataType: 'array' },
  { field: 'Implications', dataType: 'array' },
  { field: 'Recommendation', dataType: 'string' },
  { field: 'Classification', dataType: 'string' },
  { field: 'Population', dataType: 'string' },
  { field: 'Dosing Information', dataType: 'boolean' },
  { field: 'Alternate Drug Available', dataType: 'boolean' },
  { field: 'Other Prescribing Guidance', dataType: 'boolean' },
];
