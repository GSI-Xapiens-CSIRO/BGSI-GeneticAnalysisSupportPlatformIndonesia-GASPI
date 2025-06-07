import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AuthService } from './services/auth.service';
import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  RouterLinkActive,
  RouterLink,
  RouterOutlet,
  Router,
  NavigationStart,
  NavigationEnd,
  Event,
  NavigationError,
  NavigationCancel,
} from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { GlobalSpinnerComponent } from './components/global-spinner/global-spinner.component';
import { SpinnerService } from './services/spinner.service';
import { ProfileMenuComponent } from './components/profile-menu/profile-menu.component';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ListMenuComponent } from './components/list-menu/list-menu.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLinkActive,
    RouterLink,
    RouterOutlet,
    AsyncPipe,
    GlobalSpinnerComponent,
    ProfileMenuComponent,
    ListMenuComponent,
  ],
  providers: [SpinnerService],
})
export class AppComponent implements OnInit, OnDestroy {
  buildVersion: string = '';
  protected isCollapsed = false;
  private realodSubscription: Subscription | null = null;

  constructor(
    protected auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private el: ElementRef,
    private ss: SpinnerService,
    private dg: MatDialog,
  ) {
    this.router.events.subscribe((event: Event) => {
      switch (true) {
        case event instanceof NavigationStart: {
          this.ss.start();
          break;
        }
        case event instanceof NavigationEnd:
        case event instanceof NavigationError:
        case event instanceof NavigationCancel: {
          this.ss.end();
          break;
        }
      }
    });

    this.realodSubscription = this.auth.promptReloadAndLogin.subscribe(
      async (prompt) => {
        if (prompt) {
          const { ReloadAndLoginDialogComponent } = await import(
            './components/reload-and-login-dialog/reload-and-login-dialog.component'
          );

          this.dg.open(ReloadAndLoginDialogComponent);
        }
      },
    );
  }

  ngOnDestroy(): void {
    if (this.realodSubscription) {
      this.realodSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.isCollapsed = true;
    this.http.get('version.txt', { responseType: 'text' }).subscribe(
      // Use empty string in case of getting full redirected xml if missing
      version => this.buildVersion = version.length < 64 ? version : ''
    );
  }
  @HostListener('window:resize', ['event'])
  onResize() {
    this.isCollapsed = this.el.nativeElement.offsetWidth < 1200;
  }
}
