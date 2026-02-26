export type LookupColumnDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array';

export interface LookupFilterField {
  field: string;
  dataType: LookupColumnDataType;
}

export const LOOKUP_FILTER_FIELDS_RSJPD: LookupFilterField[] = [
  { field: 'PharmGKB ID', dataType: 'number' },
  { field: 'Level', dataType: 'string' },
  { field: 'Variant', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Alleles', dataType: 'string' },
  { field: 'REF/ALT', dataType: 'string' },
  { field: 'Reference Zygosity', dataType: 'string' },
  { field: 'Drugs', dataType: 'string' },
  { field: 'Phenotype Categories', dataType: 'string' },
  { field: 'Implication', dataType: 'string' },
  { field: 'Phenotype', dataType: 'string' },
  { field: 'chr', dataType: 'string' },
  { field: 'start', dataType: 'number' },
  { field: 'end', dataType: 'number' },
  { field: 'VCF ref', dataType: 'string' },
  { field: 'VCF alt', dataType: 'string' },
  { field: 'refChr', dataType: 'string' },
  { field: 'VCF pos', dataType: 'number' },
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

export const LOOKUP_FILTER_FIELDS_RSIGNG: LookupFilterField[] = [
  { field: 'PharmGKB ID', dataType: 'number' },
  { field: 'Level', dataType: 'string' },
  { field: 'Variant', dataType: 'string' },
  { field: 'Gene', dataType: 'string' },
  { field: 'Drugs', dataType: 'string' },
  { field: 'Alleles', dataType: 'string' },
  { field: 'Allele Function', dataType: 'string' },
  { field: 'Phenotype Categories', dataType: 'string' },
  { field: 'Phenotype', dataType: 'string' },
  { field: 'Implication', dataType: 'string' },
  { field: 'Recommendation', dataType: 'string' },
  { field: 'Pediatric', dataType: 'number' },
  { field: 'chr', dataType: 'string' },
  { field: 'start', dataType: 'number' },
  { field: 'end', dataType: 'number' },
  { field: 'VCF ref', dataType: 'string' },
  { field: 'VCF alt', dataType: 'string' },
  { field: 'refChr', dataType: 'string' },
  { field: 'VCF pos', dataType: 'number' },
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
