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
  { field: 'Qual', dataType: 'string' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'string' },
  { field: 'Genotype Quality', dataType: 'string' },
  { field: 'Mapping Quality', dataType: 'string' },
  { field: 'Quality by Depth', dataType: 'string' },
  { field: 'AF (Afr)', dataType: 'string' },
  { field: 'AF (Eas)', dataType: 'string' },
  { field: 'AF (Fin)', dataType: 'string' },
  { field: 'AF (Nfe)', dataType: 'string' },
  { field: 'AF (Sas)', dataType: 'string' },
  { field: 'AF (Amr)', dataType: 'string' },
  { field: 'AF', dataType: 'string' },
  { field: 'AC', dataType: 'string' },
  { field: 'AN', dataType: 'string' },
  { field: 'Max sift', dataType: 'string' },
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
  { field: 'Qual', dataType: 'string' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'string' },
  { field: 'Genotype Quality', dataType: 'string' },
  { field: 'Mapping Quality', dataType: 'string' },
  { field: 'Quality by Depth', dataType: 'string' },
  { field: 'AF (Afr)', dataType: 'string' },
  { field: 'AF (Eas)', dataType: 'string' },
  { field: 'AF (Fin)', dataType: 'string' },
  { field: 'AF (Nfe)', dataType: 'string' },
  { field: 'AF (Sas)', dataType: 'string' },
  { field: 'AF (Amr)', dataType: 'string' },
  { field: 'AF', dataType: 'string' },
  { field: 'AC', dataType: 'string' },
  { field: 'AN', dataType: 'string' },
  { field: 'Max sift', dataType: 'string' },
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
