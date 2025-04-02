import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API, Auth } from 'aws-amplify';
import {
  BehaviorSubject,
  from,
  map,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { environment } from 'src/environments/environment';
// TODO import from ENV
const LAB = 'RSCM';

export type SelectedVariants = Map<string, string[]>;

@Injectable({
  providedIn: 'root',
})
export class ClinicService {
  public selectedVariants: BehaviorSubject<Map<string, any>> =
    new BehaviorSubject(new Map());
  public annotionsChanged: Subject<void> = new Subject<void>();
  public savedVariantsChanged: Subject<void> = new Subject<void>();

  constructor(private http: HttpClient) {}

  hashRow(row: { [key: string]: string }): string {
    let hash = '';
    // TODO compress more
    for (let key of Object.keys(row)) {
      hash += `${key}:${row[key]}`;
    }
    return hash;
  }

  selection(row: any, checked: boolean): void {
    const rowHash = this.hashRow(row);
    const currentMap = this.selectedVariants.getValue();
    if (checked) {
      currentMap.set(rowHash, row);
    } else {
      currentMap.delete(rowHash);
    }
    this.selectedVariants.next(currentMap);
  }

  getMyJobsID(
    limit?: number,
    last_evaluated_key?: string | null,
    project?: string,
  ) {
    console.log('get list jobs id');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows`,
        {
          queryStringParameters: {
            ...(limit !== undefined && limit !== null ? { limit } : {}),
            ...(last_evaluated_key ? { last_evaluated_key } : {}),
          },
        },
      ),
    );
  }

  submitClinicJob(location: string, projectName: string) {
    return from(Auth.currentCredentials()).pipe(
      switchMap((credentials) => {
        const userId = credentials.identityId;
        return from(
          API.post(environment.api_endpoint_clinic.name, 'submit', {
            body: { location, projectName, userId },
          }),
        );
      }),
    );
  }

  getClinicResults(
    requestId: string,
    projectName: string,
    chromosome: string | null = null,
    page: number | null = null,
    position: number | null = null,
  ): Observable<any> {
    const params = {
      ...(chromosome && { chromosome }),
      ...(page && { page }),
      ...(position && { position }),
    };

    return from(
      API.get(environment.api_endpoint_clinic.name, 'results', {
        queryStringParameters: {
          request_id: requestId,
          project_name: projectName,
          ...params,
        },
      }),
    ).pipe(
      switchMap((res: any) => {
        if (res.url) {
          return this.http
            .get(res.url, { responseType: 'text' })
            .pipe(map((res) => ({ pages: [], content: res, page: 1 })));
        } else {
          return of(res);
        }
      }),
    );
  }

  saveAnnotations(
    project: string,
    jobId: string,
    annotation: string,
    variants: any[],
  ) {
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/annotations`,
        {
          body: { annotation, variants },
        },
      ),
    );
  }

  getAnnotations(
    project: string,
    jobId: string,
    limit: number = 5,
    last_evaluated_key: any = null,
  ) {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/annotations`,
        {
          queryStringParameters: {
            limit,
            last_evaluated_key: last_evaluated_key,
          },
        },
      ),
    );
  }

  deleteAnnotation(project: string, jobId: string, annotationName: string) {
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/annotations/${annotationName}`,
        {},
      ),
    );
  }

  saveVariants(
    project: string,
    jobId: string,
    comment: string,
    variants: any[],
  ) {
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/variants`,
        {
          body: { comment, variants },
        },
      ),
    );
  }

  getSavedVariants(
    project: string,
    jobId: string,
    limit: number = 5,
    last_evaluated_key: any = null,
  ) {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/variants`,
        {
          queryStringParameters: {
            limit,
            last_evaluated_key: last_evaluated_key,
          },
        },
      ),
    );
  }

  deleteSavedVariants(
    project: string,
    jobId: string,
    savedVariantCollectionName: string,
  ) {
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/variants/${savedVariantCollectionName}`,
        {},
      ),
    );
  }

  generateReport(project: string, jobId: string) {
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/report`,
        {
          body: {
            lab: LAB,
          },
        },
      ),
    );
  }
}
