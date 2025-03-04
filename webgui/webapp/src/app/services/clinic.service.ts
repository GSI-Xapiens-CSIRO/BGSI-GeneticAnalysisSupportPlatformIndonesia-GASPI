import { query } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API, Auth } from 'aws-amplify';
import { from, map, Observable, of, Subject, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';

export type SelectedVariants = {
  [key: string]: any;
};

@Injectable({
  providedIn: 'root',
})
export class ClinicService {
  public selectedVariants: SelectedVariants = {};
  public annotionsChanged: Subject<void> = new Subject<void>();

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
    if (checked) {
      this.selectedVariants[this.hashRow(row)] = row;
    } else {
      delete this.selectedVariants[this.hashRow(row)];
    }
  }

  selected(row: any): boolean {
    return this.selectedVariants[this.hashRow(row)] !== undefined;
  }

  submitSvepJob(location: string, projectName: string) {
    return from(Auth.currentCredentials()).pipe(
      switchMap((credentials) => {
        const userId = credentials.identityId;
        console.log('ENV API NAME SVEP', environment.api_endpoint_svep.name);
        return from(
          API.post(environment.api_endpoint_svep.name, 'submit', {
            body: { location, projectName, userId },
          }),
        );
      }),
    );
  }

  getSvepResults(
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
      API.get(environment.api_endpoint_svep.name, 'results', {
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
}
