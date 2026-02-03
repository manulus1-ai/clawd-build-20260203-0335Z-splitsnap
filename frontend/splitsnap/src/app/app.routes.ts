import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage)
  },
  {
    path: 'scan',
    loadComponent: () => import('./pages/scan.page').then((m) => m.ScanPage)
  },
  {
    path: 'assign',
    loadComponent: () => import('./pages/assign.page').then((m) => m.AssignPage)
  },
  {
    path: 'summary',
    loadComponent: () => import('./pages/summary.page').then((m) => m.SummaryPage)
  },
  { path: '**', redirectTo: '' }
];
