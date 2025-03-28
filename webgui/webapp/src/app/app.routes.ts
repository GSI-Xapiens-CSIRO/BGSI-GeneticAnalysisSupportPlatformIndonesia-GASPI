import { Routes } from '@angular/router';
import { unauthGuard } from './guards/unauth.guard';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/about-page/about-page.component').then(
        (c) => c.AboutPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dportal',
    loadComponent: () =>
      import('./pages/portal-page/portal-page.component').then(
        (c) => c.PortalPageComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'portal',
      },
      {
        path: 'portal',
        loadComponent: () =>
          import(
            './pages/portal-page/dportal-page/dportal-page.component'
          ).then((c) => c.DportalPageComponent),
      },
      {
        path: 'sbeacon-query',
        loadComponent: () =>
          import('./pages/portal-page/query-page/query-page.component').then(
            (c) => c.QueryPageComponent,
          ),
      },
      {
        path: 'sbeacon-filter',
        loadComponent: () =>
          import(
            './pages/portal-page/filters-page/filters-page.component'
          ).then((c) => c.FiltersPageComponent),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login-page/login-page.component').then(
        (c) => c.LoginPageComponent,
      ),
    canActivate: [unauthGuard],
  },
  {
    path: 'clinic',
    loadComponent: () =>
      import('./pages/clinic-page/clinic-page.component').then(
        (c) => c.ClinicPageComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'svep-submit',
      },
      {
        path: 'svep-submit',
        loadComponent: () =>
          import('./pages/clinic-page/svep-submit/svep-submit.component').then(
            (c) => c.SvepSubmitComponent,
          ),
      },
      {
        path: 'svep-results',
        loadComponent: () =>
          import(
            './pages/clinic-page/svep-results/svep-results.component'
          ).then((c) => c.SvepResultsComponent),
      },
      {
        path: 'svep-igv',
        loadComponent: () =>
          import('./pages/clinic-page/svep-igv/svep-igv.component').then(
            (c) => c.SvepIGVComponent,
          ),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-page/admin-page.component').then(
        (c) => c.AdminPageComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then(
        (c) => c.ProfilePageComponent,
      ),
    canActivate: [authGuard],
  },
];
