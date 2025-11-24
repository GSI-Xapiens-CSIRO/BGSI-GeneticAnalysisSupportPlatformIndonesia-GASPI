import { Component } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-help-text',
  standalone: true,
  imports: [MatExpansionModule],
  templateUrl: './help-text.component.html',
  styleUrl: './help-text.component.scss',
})
export class HelpTextComponent {
  columnDefsPanelOpenState = false;
  consequenceExplanationPanelOpenState = false;
}
