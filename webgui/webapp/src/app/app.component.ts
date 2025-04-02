import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AuthService } from './services/auth.service';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { AsyncPipe } from '@angular/common';
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('collapse', [
      state(
        'open',
        style({
          height: '*',
          opacity: 1,
          visibility: 'visible',
        }),
      ),
      state(
        'closed',
        style({
          height: '0',
          opacity: 0,
          visibility: 'hidden',
        }),
      ),
      transition('open => closed', [animate('0.1s ease-out')]),
      transition('closed => open', [animate('0.1s ease-in')]),
    ]),
  ],
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
  ],
  providers: [SpinnerService],
})
export class AppComponent implements OnInit, OnDestroy {
  protected isCollapsed = false;
  private realodSubscription: Subscription | null = null;

  constructor(
    protected auth: AuthService,
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
    this.isCollapsed = this.el.nativeElement.offsetWidth < 1200;
  }

  @HostListener('window:resize', ['event'])
  onResize() {
    this.isCollapsed = this.el.nativeElement.offsetWidth < 1200;
  }
}
