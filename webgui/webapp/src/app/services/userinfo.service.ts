import { Injectable } from '@angular/core';
import { API } from 'aws-amplify';
import { from } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserInfoService {
  constructor() {}

  getUserInfo(uid: string) {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/userinfo/${uid}`,
        {},
      ),
    );
  }

  storeUserInfo(uid: string, institutionType: string, institutionName: string) {
    return from(
      API.post(environment.api_endpoint_sbeacon.name, `dportal/userinfo`, {
        body: {
          uid,
          institutionType,
          institutionName,
        },
      }),
    );
  }
}
