import { Injectable } from '@angular/core';
import { API, Auth } from 'aws-amplify';
import { from, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DportalService {
  constructor() {}

  // data portal admin user file actions
  adminGetUserFolders() {
    console.log('get user folders');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        'dportal/admin/folders',
        {},
      ),
    );
  }

  adminDeleteUserFolder(folder: string) {
    console.log('delete user folder');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/folders/${folder}`,
        {},
      ),
    );
  }

  // data portal admin cli uploads actions
  adminGetUploaders(project: string) {
    console.log('get project uploaders');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/upload`,
        {},
      ),
    );
  }

  adminAddUploader(project: string, email: string, args: any) {
    console.log('add project uploader');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/users/${email}/upload`,
        {
          body: args,
        },
      ),
    );
  }

  adminRemoveUploader(project: string, email: string, uploadId: string) {
    console.log('remove project uploader');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/users/${email}/upload/${uploadId}`,
        {},
      ),
    );
  }

  // data portal admin project actions
  adminCreateProject(name: string, description: string) {
    console.log('create project');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        'dportal/admin/projects',
        {
          body: { name, description },
        },
      ),
    );
  }

  adminUpdateProject(name: string, description: string, files: string[]) {
    console.log('update project');
    return from(
      API.put(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${name}`,
        {
          body: { description, files },
        },
      ),
    );
  }

  getAdminProjects(
    limit: number = 10,
    last_evaluated_key: string | null = null,
    search?: string,
  ) {
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'dportal/admin/projects', {
        queryStringParameters: {
          limit: limit,
          last_evaluated_key: last_evaluated_key,
          search,
        },
      }),
    );
  }

  getMyProjectsPagination(
    limit: number = 10,
    last_evaluated_key: string | null = null,
  ) {
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'dportal/my-projects', {
        queryStringParameters: {
          limit: limit,
          last_evaluated_key: last_evaluated_key,
        },
      }),
    );
  }

  deleteAdminProject(project: string) {
    console.log('delete project');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}`,
        {},
      ),
    );
  }

  clearAdminProjectErrors(project: string) {
    console.log('clear project errors');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/errors`,
        {},
      ),
    );
  }

  // data portal admin notebook actions
  getAdminNotebooks(
    limit: number = 3,
    last_evaluated_index: number = 0,
    search?: string,
  ) {
    console.log('get admin notebooks');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        'dportal/admin/notebooks',
        {
          queryStringParameters: {
            limit: limit,
            last_evaluated_index: last_evaluated_index,
            search,
          },
        },
      ),
    );
  }

  stopAdminNotebook(name: string) {
    console.log('stop admin notebook');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/notebooks/${name}/stop`,
        {},
      ),
    );
  }

  deleteAdminNotebook(name: string) {
    console.log('stop admin notebook');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/notebooks/${name}/delete`,
        {},
      ),
    );
  }

  getAdminNotebookStatus(name: string) {
    console.log('get admin notebook status');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/notebooks/${name}`,
        {},
      ),
    );
  }

  // project admin users actions
  adminGetProjectUsers(project: string) {
    console.log('get project users');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/users`,
        {},
      ),
    );
  }

  adminSearchUsers(search: string) {
    console.log('search users', search);
    return from(
      API.get(environment.api_endpoint_sbeacon.name, `dportal/admin/users`, {
        queryStringParameters: { search },
      }),
    );
  }

  adminAddUserToProject(project: string, emails: string[]) {
    console.log('add user to project');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/users`,
        {
          body: { emails },
        },
      ),
    );
  }

  adminRemoveUserFromProject(project: string, email: string) {
    console.log('remove user from project');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/projects/${project}/users/${email}`,
        {},
      ),
    );
  }

  // data portal admin sbeacon actions
  adminIngestToBeacon(
    name: string,
    datasetId: string,
    s3Payload: string | { [key: string]: string },
    vcfLocations: string[],
  ): Observable<{ success: boolean; message: string }> {
    console.log('ingest to sbeacon');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `/dportal/admin/projects/${name}/ingest/${datasetId}`,
        {
          body: { s3Payload, vcfLocations },
        },
      ),
    );
  }

  adminUnIngestFromBeacon(
    name: string,
    datasetId: string,
  ): Observable<{ success: boolean; message: string }> {
    console.log('uningest from sbeacon');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `/dportal/admin/projects/${name}/ingest/${datasetId}`,
        {},
      ),
    );
  }

  adminIndexBeacon(): Observable<{ success: boolean; message: string }> {
    console.log('ingest to sbeacon');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/admin/sbeacon/index`,
        {
          body: {},
        },
      ),
    );
  }

  // data portal user actions
  getMySavedQueries() {
    console.log('get my saved queries');
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'dportal/queries', {}),
    );
  }

  saveMyQuery(name: string, description: string, query: any) {
    console.log('save my query');
    return from(
      API.post(environment.api_endpoint_sbeacon.name, 'dportal/queries', {
        body: { name, description, query },
      }),
    );
  }

  deleteMyQuery(name: string) {
    console.log('delete my query');
    return from(
      API.del(
        environment.api_endpoint_sbeacon.name,
        `dportal/queries/${name}`,
        {},
      ),
    );
  }

  getMyProjects(limit?: number, last_evaluated_key?: string | null) {
    console.log('get my projects');
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'dportal/projects', {
        queryStringParameters: {
          ...(limit !== undefined && limit !== null ? { limit } : {}), // Include limit only if not null/undefined
          ...(last_evaluated_key ? { last_evaluated_key } : {}), // Include last_evaluated_key only if it's truthy
        },
      }),
    );
  }

  getMyProjectFile(project: string, prefix: string) {
    console.log('get my project file');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/projects/${project}/file`,
        {
          queryStringParameters: { prefix },
        },
      ),
    );
  }

  createMyNotebookInstance(
    instanceName: string,
    instanceType: string,
    volumeSize: number,
  ) {
    console.log('create my notebook');

    return from(
      Auth.currentCredentials().then((credentials) => {
        const identityId = credentials.identityId;
        return API.post(
          environment.api_endpoint_sbeacon.name,
          'dportal/notebooks',
          {
            body: { instanceName, instanceType, volumeSize, identityId },
          },
        );
      }),
    );
  }

  getMyNotebooks() {
    console.log('get my notebooks');
    return from(
      API.get(environment.api_endpoint_sbeacon.name, 'dportal/notebooks', {}),
    );
  }

  getMyNotebookStatus(name: string) {
    console.log('get my notebook status');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}`,
        {},
      ),
    );
  }

  stopMyNotebook(name: string) {
    console.log('stop my notebook');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}/stop`,
        {},
      ),
    );
  }

  startMyNotebook(name: string) {
    console.log('start my notebook');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}/start`,
        {},
      ),
    );
  }

  deleteMyNotebook(name: string) {
    console.log('delete my notebook');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}/delete`,
        {},
      ),
    );
  }

  updateMyNotebook(name: string, instanceType: string, volumeSize: number) {
    console.log('update my notebook');
    return from(
      API.put(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}`,
        {
          body: { instanceType, volumeSize },
        },
      ),
    );
  }

  getMyNotebookUrl(name: string) {
    console.log('get my notebook url');
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/notebooks/${name}/url`,
        {},
      ),
    );
  }

  generateCohort(payload: any) {
    console.log('generate cohort');
    return from(
      API.post(environment.api_endpoint_sbeacon.name, 'dportal/cohort', {
        body: payload,
      }),
    );
  }
}
