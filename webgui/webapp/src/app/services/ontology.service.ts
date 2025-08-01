import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class OntologyService {
  private baseURLOLS = 'https://www.ebi.ac.uk/ols4/api/ontologies';
  private baseURLOntoserver =
    'https://r4.ontoserver.csiro.au/fhir/CodeSystem/$lookup';

  constructor(private http: HttpClient) {}

  fetch_term_details(term: string) {
    const [ontology, code] = _.split(term, ':');

    return _.toUpper(ontology) === 'SNOMED'
      ? this.http.get(
          `${this.baseURLOntoserver}?system=http://snomed.info/sct&code=${code}`,
        )
      : this.http.get(`${this.baseURLOLS}/${ontology}/terms`, {
          params: { short_form: `${ontology}_${code}` },
        });
  }
}
