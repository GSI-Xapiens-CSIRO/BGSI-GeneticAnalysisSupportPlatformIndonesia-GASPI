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
  },
  {
    path: 'dportal',
    loadComponent: () =>
      import('./pages/dportal-page/dportal-page.component').then(
        (c) => c.DportalPageComponent,
      ),
    canActivate: [authGuard],
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
    path: 'query',
    loadComponent: () =>
      import('./pages/query-page/query-page.component').then(
        (c) => c.QueryPageComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'filters',
    loadComponent: () =>
      import('./pages/filters-page/filters-page.component').then(
        (c) => c.FiltersPageComponent,
      ),
    canActivate: [authGuard],
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
    canActivate: [adminGuard],
  },
];
