import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface FaqItem {
  title: string;
  html: string; // keep as raw string, sanitizer will handle in component
}

export interface StepByItem {
  title: string;
  url: string;
  no?: number;
  image?: string;
}

export interface glossaryItem {
  table: string;
  sub: string;
  keyword: string;
  definition: string;
}

export const faqItemsData: FaqItem[] = [
  {
    title: 'What is the Clinical Workflow Result Table?',
    html: `
      <div class="flex flex-col gap-2">
        <div>
          <strong>Clinical Workflow Results</strong> are bioinformatics tertiary analysis results for 
          the executed VCF file, which annotate the variants with the information 
          from the relevant open-sourced or custom databases.
        </div>
      </div>
    `,
  },
  {
    title: 'What is the Global Filter Term?',
    html: `
       <div class="flex flex-col gap-2">
          <div class="flex justify-center items-center bg-gray-50 py-8">
            <img
              class="w-1/2"
              alt="result table"
              src="assets/images/faq/result-table.png"
            />
          </div>
          <div class="text-black font-normal">
            Enable query of a specific string of letters/words within the result
            table. Note that this feature queries the term globally, meaning
            that any term specified that matches somewhere within the results
            entries. Hence, Users might only see the closed variant cards unless
            each of the variant card is opened to manually check the presence of
            the specified term
          </div>
        </div>
    `,
  },
  {
    title: 'What is the Advanced Filter?',
    html: `
        <div class="flex flex-col gap-2">
          <div class="flex justify-center items-center bg-gray-50 py-8">
            <img
              class="w-1/2"
              alt="result table"
              src="assets/images/faq/advanced-filter.png"
            />
          </div>
          <div class="text-black font-normal">
            Enable query of a specific string of letters/words per available
            columns within the result table, and can be combined for sequential
            filtering purposes. This feature uses the "AND" logic, so when the
            parameters are added, only the specific entry(ies) with the
            parameters will be shown. To note, when the parameters were added
            sequentially, where one parameter is filtered first, then the second
            parameter will only filter the currently filtered/shown result in
            the UI. Hence, if combined parameters are to be used, the User is
            encouraged to enter the parameters first before clicking on the
            "Filter" button.
          </div>
        </div>
    `,
  },
];

export const stepData: StepByItem[] = [
  {
    no: 0,
    image: 'assets/images/faq/advanced-filter-thumbnail.png',
    title: 'How to Use the Advanced Filter?',
    url: 'faq/advanced-filter',
  },
  {
    no: 1,
    image: 'assets/images/faq/annotation-thumbnail.png',
    title: 'How to Add Custom Annotation?',
    url: 'faq/annotation',
  },
  {
    no: 2,
    image: 'assets/images/faq/generate-report-thumbnail.png',
    title: 'How to Generate Clinical Report?',
    url: 'faq/generate-report',
  },
];

// export const glossaryData = [
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'rsID',
//     definition:
//       'Unique and widely used accession identifier for the single-nucleotide polymorphism/variation/change from dbSNP.',
//   },
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'Consequence',
//     definition:
//       'Variant effect predictor (Consequence) from the Ensembl database and calculation algorithm.',
//   },
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'OMIM',
//     definition:
//       'Online Mendelian Inheritance in Man. Repository of Mendelian diseases with their relevant associated and published genes and variants. Currently fetching the OMIM ID only if the information is present within the executed VCF.',
//   },
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'Exon number',
//     definition: 'Exon number',
//   },
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'Transcript ID & Version',
//     definition:
//       'Unique identifier for the genomic transcript (mRNA) that underwent splicing processes.',
//   },
//   {
//     table: 'Diseases Diagnosis',
//     sub: 'Variants Information',
//     keyword: 'Transcript Support Level',
//     definition:
//       'Unique identifier for the genomic transcript (mRNA) that underwent splicing processes.',
//   },
// ];

export const glossaryData: glossaryItem[] = [
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'rsID',
    definition:
      'Unique and widely used accession identifier for the single-nucleotide polymorphism/variation/change from dbSNP.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Consequence',
    definition:
      'Variant effect predictor (Consequence) from the Ensembl database and calculation algorithm.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'OMIM',
    definition:
      'Online Mendelian Inheritance in Man. Repository of Mendelian diseases with their relevant associated and published genes and variants. Currently fetching the OMIM ID only if the information is present within the executed VCF.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Exon number',
    definition:
      'Exon number in the related transcript, in which the variant was found.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Transcript ID & Version',
    definition:
      'Unique identifier for the genomic transcript (mRNA) that underwent splicing processes.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Transcript Support Level',
    definition:
      "The level of support that a certain transcript is indeed expressed in the organisms. The lower the level, the higher the transcript's reliability, and vice versa. For how Ensembl calculate this, please find this documentation link: https://asia.ensembl.org/info/genome/genebuild/transcript_quality_tags.html#tsl.",
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Transcript Biotype',
    definition:
      "The Ensembl classification of the transcript's biological function (e.g., protein coding, regulatory variants, nonsense-mediated decay, etc.).",
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Feature',
    definition:
      'The feature of the genomic segment in which a variant was found, e.g., regulatory region, motif region, transcript.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Classification',
    definition:
      'The classification of the found variant as fetched from the ClinVar database. For more information, please find this link: https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/#clinsig_scv.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Variants Information',
    keyword: 'Rank',
    definition:
      'The calculated rank of consequence significance, as calculated by Ensembl. For how Ensembl calculate this, please find this documentation link: https://asia.ensembl.org/info/genome/variation/prediction/predicted_data.html.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Region',
    definition:
      'Position in which the variant is found within the genomic context: Chromosomal number and the genomic location.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Gene ID',
    definition:
      "Ensembl's unique identifier for the found gene, which acts as an external link that could direct the User to the gene page (Ensembl browser).",
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'ALT/REF',
    definition:
      'The base changes from its reference form (REF) to the alternative form (ALT).',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Strand',
    definition:
      'Showing in which of the forward or reverse strands the found variant is located.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Codon change',
    definition:
      'The base changes within the context of its position at the codon level.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Amino Acid change',
    definition: 'The amino acid changes implicated by the found variant.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'GT',
    definition:
      'Displays the zygosity/genotype/allele forms present in the sequenced sample for the found variant. 0 indicates the reference allele form, while 1 indicates the alternate allele form.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Qual',
    definition:
      'Displays the probability of the found variant being incorrectly called. Value of 10 represents the probability of 1 out of 10 bases incorrectly called, value 20 represents the probability of 1 out of 100 bases incorrectly called, and so on.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Sequence Information',
    keyword: 'Filter',
    definition:
      'The filter is an indicator for each found variant of whether or not it passes the quality thresholds.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'gnomAD',
    definition:
      'Genome Aggregation Database (gnomAD) is a prominent repository of global variant frequency commonly used in the variant curation process. For more information about gnomAD, please find the documentation here: https://gnomad.broadinstitute.org/about.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: '1KG+HGDP',
    definition:
      '1000 Genomes Project (1kG) and the Human Genome Diversity Project (HGDP), another datasets that aggregate the found genomic information in which frequency information could be extracted.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'AF',
    definition:
      'Global allele frequency – accounting for all entries for that position in the gnomAD dataset, calculated by dividing AC and AN.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'AC',
    definition:
      'Global allele count – the number of the found minor allele/variant for that position in the gnomAD dataset.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'AN',
    definition:
      'Global allele number – the number of the sequenced position (whether it is the REF/ALT), for that position in the gnomAD dataset.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'AFR',
    definition:
      'Allele frequency found within the specific population group - African.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'EAS',
    definition:
      'Allele frequency found within the specific population group - East Asians.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'FIN',
    definition:
      'Allele frequency found within the specific population group - Finnish.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'NFE',
    definition:
      'Allele frequency found within the specific population group - Non-Finnish European.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'SAS',
    definition:
      'Allele frequency found within the specific population group - South Asian.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'AMR',
    definition:
      'Allele frequency found within the specific population group - admixed American.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Allele Frequency',
    keyword: 'KHV',
    definition:
      'Allele frequency found within the specific population group - Kinh in Ho Chi Minh City, Vietnam.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Resources',
    keyword: 'ClinVar',
    definition:
      'Repository of genetic variants and their clinical significance as reported by entities globally.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Resources',
    keyword: 'Review Status',
    definition:
      "The variant's review status as stated by ClinVar. For more information, please find: https://www.ncbi.nlm.nih.gov/clinvar/docs/review_status/.",
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Resources',
    keyword: 'Last Evaluated',
    definition:
      "Information about the variant's latest evaluation done by submitter(s). For more information, please find: https://www.ncbi.nlm.nih.gov/clinvar/docs/variation_report/.",
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Resources',
    keyword: 'Accession',
    definition:
      'Unique identifier for a variant-condition combination/pairing. For more information, please find: https://www.ncbi.nlm.nih.gov/clinvar/docs/identifiers/#rcv.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Resources',
    keyword: 'Variation ID',
    definition:
      'Unique identifier for variant(s) that are classified by submitters. For more information, please find: https://www.ncbi.nlm.nih.gov/clinvar/docs/identifiers/#rcv.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Constraint',
    keyword: 'Missense Z score',
    definition:
      'A computationally calculated score of how intolerant a gene would be with a missense variant present. The threshold used is 3.09, with values below 3.09 showing that the gene is tolerant of such variants, and vice versa.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Constraint',
    keyword: 'Missense o/e',
    definition:
      'A ratio of the number of observed missense variants within the gene vs the expected number of missense variants found within the gene. The confidence interval of the oe is presented in brackets following the oe values.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Constraint',
    keyword: 'pLI',
    definition:
      'A computationally calculated score of how intolerant a gene would be with a Loss of Function (LoF) variant present. The range is 0 to 1, in which inclination toward the latter is calculated to be intolerant of such a variant or damaging.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Constraint',
    keyword: 'pLOF o/e',
    definition:
      'A ratio of the number of observed LoF variants within the gene vs the expected number of LoF variants found within the gene. The confidence interval of the oe is presented in brackets following the oe values.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Computational Predictions',
    keyword: 'SIFT (max)',
    definition:
      'Sorting Intolerant from Tolerant (SIFT) is a computational prediction tool for protein function relating to the observed/found variants, which were integrated to help build evidence/confidence for the found variant.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Publication Media',
    keyword: 'PubMed ID',
    definition:
      'Consists of a list of PubMed IDs related to the variant found, which acts as an external link that could direct the User to the PubMed page.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Result Card Header',
    keyword: 'Gene Name',
    definition: 'The symbol name of the gene.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Result Card Header',
    keyword: 'HGVS',
    definition:
      'The nomenclature-based variant naming and identifier. This is currently fetched regardless of the associated transcript in the result table – the HGVS nomenclature fetched follows the MANE select transcript.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Result Card Header',
    keyword: 'Condition',
    definition:
      'The submitted clinical manifestation associated with the found variant. Fetched from the submissions in the ClinVar database.',
  },
  {
    table: 'Diseases Diagnosis',
    sub: 'Result Card Header',
    keyword: 'ClinSign',
    definition:
      'The submitted and curated clinical significance of the found variant. Fetched from the ClinVar database.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Variants (rsID)',
    definition:
      'The single-nucleotide polymorphism (SNP) as uniquely identified by the rs accession number from dbSNP.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Phenotype',
    definition: 'The associated phenotype related to the found diplotypes.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Implications',
    definition:
      "The curated implications present in the PGx working group's guideline for the found diplotypes.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Recommendation',
    definition:
      "The recommendation present in the PGx working group's guideline for the found diplotypes.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Dosing Info',
    definition:
      "Information about the PharmCat's summary for the prescribing modification. TRUE/FALSE value refers to whether any of the three available summaries is the prescribing modification or not, respectively.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Alternate Drug Available',
    definition: 'Other Prescribing Guidance',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Diplotypes Table',
    definition:
      "A table displaying the summary of the found diplotypes and the related clinical recommendations as outlined by the PGx working group's guideline for a certain drug.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Variants Table',
    definition:
      'A table displaying the found variants and the related variant information coming from the VCF executed and gnomAD for its frequencies.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Organisation',
    definition:
      'Information about the guideline sources of the clinical recommendation outlined (e.g., CPIC).',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Gene',
    definition: 'Information about the gene name for the found rsID.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Position',
    definition:
      "Information about the rsID/SNP's location in the genome context.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Call',
    definition:
      'Information about the found alleles following the zigosity in the VCF. For example, if GT 1/1 and REF/ALT is T>C, then the Call field will be CC.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Alleles',
    definition: "Information about the found variant's related star alleles.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Related diplotypes',
    definition:
      "Link/button to filter the 'Diplotype Table' to show only the related diplotypes/star alleles for the selected rsID/SNP.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Related variants',
    definition:
      "Link/button to filter the 'Variants Table' to show only the related rsID/SNP for the selected diplotype.",
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Zygosity',
    definition:
      'Displays the zygosity/genotype/allele forms present in the sequenced sample for the found variant. 0 indicates the reference allele form, while 1 indicates the alternate allele form.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'AF',
    definition:
      'Global allele frequency – accounting for all entries for that position in the gnomAD dataset, calculated by dividing AC and AN.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'AC',
    definition:
      'Global allele count – the number of the found minor allele/variant for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'AN',
    definition:
      'Global allele number – the number of the sequenced position (whether it is the REF/ALT), for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'AFR',
    definition:
      'Allele frequency found within the specific population group - African.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'EAS',
    definition:
      'Allele frequency found within the specific population group - East Asians.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'FIN',
    definition:
      'Allele frequency found within the specific population group - Finnish.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'NFE',
    definition:
      'Allele frequency found within the specific population group - Non-Finnish European.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'SAS',
    definition:
      'Allele frequency found within the specific population group - South Asian.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'AMR',
    definition:
      'Allele frequency found within the specific population group - admixed American.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Max sift',
    definition:
      'Sorting Intolerant from Tolerant (SIFT) is a computational prediction tool for protein function relating to the observed/found variants, which was integrated to help build evidence/confidence for the found variant.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Publication Media',
    definition:
      'Consists of a list of PubMed IDs related to the variant found, which acts as an external link that could direct the User to the PubMed page.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Warnings',
    definition:
      'Warning messages are generated by PharmCat in the case where inconclusive findings are found, e.g., rsID/SNP that make up a star allele are not completely sequenced/present in the VCF and could not be completely ruled out.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Drugs*',
    definition: 'The drug(s) found to be associated with the found diplotypes.',
  },
  {
    table: 'Pharmacogenomics_PharmCat',
    sub: '',
    keyword: 'Diplotypes*',
    definition:
      'A combination of star alleles assigned from the found variants.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'No',
    definition: "Hub's internal identifier of the entries in the CSV database.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'PharmGKB ID',
    definition:
      'The PharmGKB unique ID to access the found variant and the associated pharmacogenomics information in the PharmGKB database.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Level',
    definition:
      "The level of evidence based on PharmGKB's calculation framework. For more information, please find here: https://www.clinpgx.org/page/clinAnnLevels.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Variants (rsID)',
    definition:
      'The single-nucleotide polymorphism (SNP) as uniquely identified by the rs accession number from dbSNP.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'PMIDs',
    definition:
      'Consists of a list of PubMed IDs related to the variant found, which acts as an external link that could direct the User to the PubMed page.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Gene',
    definition:
      'Information about the gene name in which the found rsID is located.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Drugs',
    definition:
      'The drug(s) found to be associated with the found diplotype/variant.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Alleles',
    definition: "Information about the variant's allele forms.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Allele Function',
    definition:
      'Clinical function of the found alleles as labelled in the PharmGKB following the PGx working group guideline(s).',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Phenotype Categories',
    definition:
      'Phenotype categories as labelled by the PharmGKB following the scoring framework that PharmGKB possesses. For more information, please find the link: https://www.clinpgx.org/page/varAnnScoring.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Phenotype',
    definition:
      'The associated phenotype related to the found diplotype/variant.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Implications',
    definition:
      'The implications of the found diplotype/variant as fetched from the PharmGKB database.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Recommendation',
    definition: 'Prescribing recommendation for the found variant/diplotype.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Pediatric',
    definition:
      'Label for whether the found variant and its pharmacogenomics information are relevant in pediatrics. For more information, please find: https://www.clinpgx.org/page/PedsIntro.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'chr',
    definition:
      "The matched rsID's or variant's positions within the genomic context, which are fetched directly from the CSV database in place.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'start',
    definition:
      "The matched rsID's or variant's start position within the genomic context.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'end',
    definition:
      "The matched rsID's or variant's end position within the genomic context.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'refChr',
    definition:
      "The matched rsID's or variant's position within the genomic context, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'VCF pos',
    definition: "The matched rsID's or variant's position in the VCF file.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'VCF ref',
    definition:
      "The matched rsID's or variant's reference allele, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'VCF alt',
    definition:
      "The matched rsID's or variant's alternative allele, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'AF',
    definition:
      'Global allele frequency – accounting for all entries for that position in the gnomAD dataset, calculated by dividing AC and AN.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'AC',
    definition:
      'Global allele count – the number of the found minor allele/variant for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'AN',
    definition:
      'Global allele number – the number of the sequenced position (whether it is the REF/ALT), for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'AFR',
    definition:
      'Allele frequency found within the specific population group - African.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'EAS',
    definition:
      'Allele frequency found within the specific population group - East Asians.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'FIN',
    definition:
      'Allele frequency found within the specific population group - Finnish.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'NFE',
    definition:
      'Allele frequency found within the specific population group - Non-Finnish European.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'SAS',
    definition:
      'Allele frequency found within the specific population group - South Asian.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'AMR',
    definition:
      'Allele frequency found within the specific population group - admixed American.',
  },
  {
    table: 'Pharmacogenomics_Lookup_IGNG',
    sub: '',
    keyword: 'Max sift',
    definition:
      'Sorting Intolerant from Tolerant (SIFT) is a computational prediction tool for protein function relating to the observed/found variants, which was integrated to help build evidence/confidence for the found variant.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'PharmGKB ID',
    definition:
      'The PharmGKB unique ID to access the found variant and the associated pharmacogenomics information in the PharmGKB database.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Level',
    definition:
      "The level of evidence based on PharmGKB's calculation framework. For more information, please find here: https://www.clinpgx.org/page/clinAnnLevels.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Variants (rsID)',
    definition:
      'The single-nucleotide polymorphism (SNP) as uniquely identified by the rs accession number from dbSNP.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'PMIDs',
    definition:
      'Consists of a list of PubMed IDs related to the variant found, which acts as an external link that could direct the User to the PubMed page.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Gene',
    definition:
      'Information about the gene name in which the found rsID is located.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Alleles',
    definition: "Information about the variant's allele forms.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'REF/ALT',
    definition:
      'The base changes from its reference form (REF) to the alternative form (ALT) for the found variant/rsID.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Zygosity',
    definition:
      'Displays the zygosity/genotype/allele forms present in the sequenced sample for the found variant. 0 indicates the reference allele form, while 1 indicates the alternate allele form.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Drugs',
    definition:
      'The drug(s) found to be associated with the found diplotype/variant.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Phenotype Categories',
    definition:
      'Phenotype categories as labelled by the PharmGKB following the scoring framework that PharmGKB possesses. For more information, please find the link: https://www.clinpgx.org/page/varAnnScoring.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Implications',
    definition:
      'The implications of the found diplotype/variant as fetched from the PharmGKB database.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Phenotype',
    definition:
      'The associated phenotype related to the found diplotype/variant.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'chr',
    definition:
      "The matched rsID's or variant's positions within the genomic context, which are fetched directly from the CSV database in place.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'start',
    definition:
      "The matched rsID's or variant's start position within the genomic context.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'end',
    definition:
      "The matched rsID's or variant's end position within the genomic context.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'refChr',
    definition:
      "The matched rsID's or variant's position within the genomic context, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'VCF pos',
    definition: "The matched rsID's or variant's position in the VCF file.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'VCF ref',
    definition:
      "The matched rsID's or variant's reference allele, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'VCF alt',
    definition:
      "The matched rsID's or variant's alternative allele, which are fetched from the executed VCF.",
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'AF',
    definition:
      'Global allele frequency – accounting for all entries for that position in the gnomAD dataset, calculated by dividing AC and AN.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'AC',
    definition:
      'Global allele count – the number of the found minor allele/variant for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'AN',
    definition:
      'Global allele number – the number of the sequenced position (whether it is the REF/ALT), for that position in the gnomAD dataset.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'AFR',
    definition:
      'Allele frequency found within the specific population group - African.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'EAS',
    definition:
      'Allele frequency found within the specific population group - East Asians.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'FIN',
    definition:
      'Allele frequency found within the specific population group - Finnish.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'NFE',
    definition:
      'Allele frequency found within the specific population group - Non-Finnish European.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'SAS',
    definition:
      'Allele frequency found within the specific population group - South Asian.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'AMR',
    definition:
      'Allele frequency found within the specific population group - admixed American.',
  },
  {
    table: 'Pharmacogenomics_Lookup_RSJPD',
    sub: '',
    keyword: 'Max sift',
    definition:
      'Sorting Intolerant from Tolerant (SIFT) is a computational prediction tool for protein function relating to the observed/found variants, which was integrated to help build evidence/confidence for the found variant.',
  },
];
