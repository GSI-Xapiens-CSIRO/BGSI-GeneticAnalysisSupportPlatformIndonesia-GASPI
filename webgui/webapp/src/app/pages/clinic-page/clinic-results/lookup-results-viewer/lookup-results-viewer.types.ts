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
  { field: 'PharmGKB ID', dataType: 'string' },
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
  { field: 'start', dataType: 'string' },
  { field: 'end', dataType: 'string' },
  { field: 'VCF ref', dataType: 'string' },
  { field: 'VCF alt', dataType: 'string' },
  { field: 'refChr', dataType: 'string' },
  { field: 'VCF pos', dataType: 'string' },
  { field: 'Qual', dataType: 'number' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'string' },
  { field: 'Genotype Quality', dataType: 'number' },
  { field: 'Mapping Quality', dataType: 'number' },
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
  { field: 'Max sift', dataType: 'number' },
];


export const LOOKUP_FILTER_FIELDS_RSIGNG: LookupFilterField[] = [
  { field: 'PharmGKB ID', dataType: 'string' },
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
  { field: 'Pediatric', dataType: 'string' },
  { field: 'chr', dataType: 'string' },
  { field: 'start', dataType: 'string' },
  { field: 'end', dataType: 'string' },
  { field: 'VCF ref', dataType: 'string' },
  { field: 'VCF alt', dataType: 'string' },
  { field: 'refChr', dataType: 'string' },
  { field: 'VCF pos', dataType: 'string' },
  { field: 'Qual', dataType: 'number' },
  { field: 'Filter', dataType: 'string' },
  { field: 'VCF Zygosity', dataType: 'string' },
  { field: 'Read Depth', dataType: 'string' },
  { field: 'Genotype Quality', dataType: 'number' },
  { field: 'Mapping Quality', dataType: 'number' },
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
  { field: 'Max sift', dataType: 'number' },
];
