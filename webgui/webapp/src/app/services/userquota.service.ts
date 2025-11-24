import { Injectable } from '@angular/core';
import { API } from 'aws-amplify';
import { catchError, filter, from, map, Observable, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { NotebookRole } from '../pages/admin-page/components/enums';

@Injectable({
  providedIn: 'root',
})
export class UserQuotaService {
  constructor(private auth: AuthService) {}

  getUserQuota(id: string) {
    console.log('get user quota');
    return from(
      API.get(environment.api_endpoint_sbeacon.name, `dportal/quota/${id}`, {}),
    );
  }

  upsertUserQuota(id: string, costEstimation: number | null, usage: any) {
    console.log('upsert user quota');
    return from(
      API.post(environment.api_endpoint_sbeacon.name, 'dportal/quota', {
        body: {
          IdentityUser: id,
          CostEstimation: costEstimation,
          Usage: usage,
        },
      }),
    );
  }

  incrementUsageCount(id: string) {
    console.log('incrementUsageCount');
    return from(
      API.post(
        environment.api_endpoint_sbeacon.name,
        `dportal/quota/${id}/increment_usagecount`,
        {},
      ),
    );
  }

  getCurrentUsage(): Observable<{
    userSub: string;
    quotaQueryCount: number;
    quotaSize: number;
    usageCount: number;
    usageSize: number;
    costEstimation: number;
    notebookRole: string;
  }> {
    return this.auth.user.pipe(
      filter((u) => !!u),
      switchMap((u: any) => {
        const userSub = u.attributes.sub;
        return this.getUserQuota(userSub).pipe(
          catchError(() => of(null)),
          map(({ success, data }) => {
            // If the user does not have a quota, return default values
            // And prevent the error from being thrown
            if (!success) {
              return {
                userSub,
                quotaQueryCount: 0,
                usageCount: 0,
                quotaSize: 0,
                usageSize: 0,
                costEstimation: 0,
                notebookRole: NotebookRole.BASIC,
              };
            }

            return {
              userSub,
              quotaQueryCount: data?.Usage.quotaQueryCount,
              usageCount: data?.Usage.usageCount,
              quotaSize: data?.Usage.quotaSize,
              usageSize: data?.Usage.usageSize,
              notebookRole: data?.Usage.notebookRole,
              costEstimation: data?.CostEstimation,
            };
          }),
        );
      }),
    );
  }
}
