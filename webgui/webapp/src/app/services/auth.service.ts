import { Injectable } from '@angular/core';
import { Auth, Hub, API } from 'aws-amplify';
import { BehaviorSubject } from 'rxjs';
import _ from 'lodash';
import { environment } from 'src/environments/environment';

import { PermissionService } from './permission.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public user = new BehaviorSubject<any | null>(null);
  public userGroups = new BehaviorSubject<Set<string>>(new Set([]));
  public promptReloadAndLogin = new BehaviorSubject<boolean>(false);
  private tempUser: any = null;

  constructor(private permissionService: PermissionService) {
    this.refresh();
    Hub.listen('auth', async ({ payload: { event, data } }) => {
      switch (event) {
        case 'tokenRefresh_failure':
          this.promptReloadAndLogin.next(true);
          break;
      }
    });
  }

  async signIn(username: string, password: string) {
    try {
      const user = await Auth.signIn(username, password);

      switch (user.challengeName) {
        case 'NEW_PASSWORD_REQUIRED':
          this.tempUser = user;
          return 'NEW_PASSWORD_REQUIRED';
        case 'SOFTWARE_TOKEN_MFA':
          this.tempUser = user;
          return 'SOFTWARE_TOKEN_MFA';
      }

      console.log('Logged in as ', user);
      await this.refresh();
      return true;
    } catch (error) {
      console.log('error signing in', error);
      return false;
    }
  }

  async getKeys() {
    const creds = await Auth.currentCredentials();
    return {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
      identityId: creds.identityId,
    };
  }

  async newPassword(newPassword: string) {
    await Auth.completeNewPassword(this.tempUser, newPassword);
    await this.refresh();
    return true;
  }

  async signInWithTOTP(totp: string) {
    try {
      await Auth.confirmSignIn(this.tempUser, totp, 'SOFTWARE_TOKEN_MFA');
      await this.refresh();
      return true;
    } catch (error) {
      console.log('error signing in', error);
      return false;
    }
  }

  async signOut() {
    await Auth.signOut();
    localStorage.removeItem('x-permissions-token');
    this.permissionService.clearPermissions();
    await this.refresh();
    window.location.href = '/login';
  }

  async refresh() {
    try {
      const creds = await Auth.currentCredentials();
      let user = await Auth.currentAuthenticatedUser();
      console.log('User', user);
      console.log('Identity', creds.identityId);

      if (user.attributes['custom:identity_id'] != creds.identityId) {
        console.log('Updating identity_id');
        await Auth.updateUserAttributes(user, {
          'custom:identity_id': creds.identityId,
        });
        user = await Auth.currentAuthenticatedUser();
      }

      this.userGroups.next(
        new Set(user.signInUserSession.idToken.payload['cognito:groups']),
      );
      this.user.next(user);

      // Fetch and store permissions token
      try {
        const response = await API.get(
          environment.api_endpoint_sbeacon.name,
          'admin/users/permissions',
          {},
        );
        if (response && response.token) {
          localStorage.setItem('x-permissions-token', response.token);
          this.permissionService.loadPermissions();
        }
      } catch (err) {
        console.error('Error fetching permissions token', err);
      }

      return true;
    } catch (error) {
      this.userGroups.next(new Set([]));
      this.user.next(null);
      return false;
    }
  }

  async forgotPassword(username: string) {
    return await Auth.forgotPassword(username);
  }

  async resetPassword(username: string, code: string, newPassword: string) {
    return await Auth.forgotPasswordSubmit(username, code, newPassword);
  }
}
