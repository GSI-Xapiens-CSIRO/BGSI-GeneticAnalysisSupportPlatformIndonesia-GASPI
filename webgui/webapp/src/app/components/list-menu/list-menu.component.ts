import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'list-menu',
  standalone: true,
  imports: [AsyncPipe, RouterLinkActive, RouterLink],
  templateUrl: './list-menu.component.html',
  styleUrl: './list-menu.component.scss',
})
export class ListMenuComponent {
  constructor(protected auth: AuthService) {}
}
