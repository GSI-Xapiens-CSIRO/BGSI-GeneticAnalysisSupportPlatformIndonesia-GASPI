export const CONFIGS: { [key: string]: any } = {
  RSPON: {
    cols: ['Alleles', 'Phenotypes'],
  },
  RSCM: {
    cols: ['Gene Name', 'Variant Name', 'gt', 'clinSig', 'conditions'],
  },
  RSSARJITO: {
    cols: [
      'Variant Name',
      'gt',
      'clinSig',
      'conditions',
      'SIFT (max)',
      'Allele Frequency (Global)',
      'Gene Name',
      'Transcript ID & Version',
      'Amino Acid Change',
    ],
  },
};
