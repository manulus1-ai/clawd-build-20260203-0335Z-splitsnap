import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStateService } from './state/app-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private state = inject(AppStateService);

  vm = computed(() => ({
    title: 'SplitSnap',
    hasReceipt: this.state.receipt().items.length > 0,
    hasPeople: this.state.receipt().people.length > 0
  }));

  undo() {
    this.state.undo();
  }

  reset() {
    this.state.reset();
  }
}
