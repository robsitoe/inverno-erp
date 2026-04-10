import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'support',
    loadComponent: () => import('./pages/support/support.page').then(m => m.SupportPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'tracking',
        loadComponent: () => import('./pages/tracking/tracking.page').then(m => m.TrackingPage)
      },
      {
        path: 'order',
        loadComponent: () => import('./pages/reseller-order/reseller-order.page').then(m => m.ResellerOrderPage)
      },
      {
        path: 'delivery',
        loadComponent: () => import('./pages/driver-delivery/driver-delivery.page').then(m => m.DriverDeliveryPage)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage)
      },
      {
        path: 'history',
        loadComponent: () => import('./pages/history/history.page').then(m => m.HistoryPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'delivery-points',
    loadComponent: () => import('./pages/delivery-points/delivery-points.page').then(m => m.DeliveryPointsPage)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
