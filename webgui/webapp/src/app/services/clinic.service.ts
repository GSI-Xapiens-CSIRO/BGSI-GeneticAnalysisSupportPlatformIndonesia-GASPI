import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API, Auth } from 'aws-amplify';
import {
  BehaviorSubject,
  forkJoin,
  from,
  map,
  Observable,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { ulid } from 'ulid';
import { environment } from 'src/environments/environment';

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
    search?: string,
    job_status?: string,
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
            ...(search ? { search } : {}),
            ...(job_status !== 'all' ? { job_status } : {}),
          },
        },
      ),
    );
  }

  submitClinicJob(
    location: string,
    projectName: string,
    jobName: string,
    missingToRef: boolean,
  ) {
    const pathMap: Record<string, string[]> = {
      RSCM: ['submit'],
      RSSARDJITO: ['submit'],
      RSPON: ['pipeline_pharmcat/submit'],
      RSIGNG: ['pipeline_lookup/submit'],
      RSJPD: ['pipeline_pharmcat/submit', 'pipeline_lookup/submit'],
    };

    const paths = pathMap[environment.hub_name];

    return from(Auth.currentCredentials()).pipe(
      switchMap((credentials) => {
        const userId = credentials.identityId;
        const requestId = environment.hub_name === 'RSJPD' ? ulid() : null;
        const body = {
          location,
          projectName,
          userId,
          jobName,
          requestId,
          missingToRef,
        };

        const requests = paths.map((path: string) =>
          from(API.post(environment.api_endpoint_clinic.name, path, { body })),
        );

        return requests.length === 1 ? requests[0] : forkJoin(requests);
      }),
    );
  }

  generateQC(projectName: string, fileName: string, key: string) {
    return from(
      API.post(environment.api_endpoint_clinic.name, 'vcfstats', {
        body: { projectName, fileName, key },
      }),
    );
  }

  getQCNotes(projectName: string, fileName: string) {
    return from(
      API.get(environment.api_endpoint_clinic.name, 'qcnotes', {
        queryStringParameters: { projectName, fileName },
      }),
    );
  }

  updateQCNotes(projectName: string, fileName: string, notes: string) {
    return from(
      API.post(environment.api_endpoint_clinic.name, 'qcnotes', {
        queryStringParameters: { projectName, fileName },
        body: notes,
      }),
    );
  }

  getClinicResults(
    requestId: string,
    projectName: string,
    chromosome: string | null = null,
    page: number | null = null,
    position: number | null = null,
    pathPart: string | null = null,
  ): Observable<any> {
    const params = {
      ...(chromosome && { chromosome }),
      ...(page && { page }),
      ...(position && { position }),
    };

    const getPathForHub = (hubName: string, customPath: string | null) => {
      const defaultPaths: Record<string, string> = {
        RSCM: 'results',
        RSSARDJITO: 'results',
        RSPON: 'pipeline_pharmcat/results',
        RSIGNG: 'pipeline_lookup/results',
      };
      if (hubName === 'RSJPD' && customPath) {
        return customPath;
      }
      return defaultPaths[hubName] || 'results';
    };

    pathPart = getPathForHub(environment.hub_name, pathPart);
    return from(
      API.get(environment.api_endpoint_clinic.name, pathPart, {
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

  generateReport(project: string, jobId: string, args: any = {}) {
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}/report`,
        {
          body: {
            lab: environment.hub_name,
            ...args,
          },
        },
      ),
    );
  }

  deleteFailedJob(project: string, jobId: string) {
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/clinical-workflows/${jobId}`,
        {},
      ),
    );
  }
}
