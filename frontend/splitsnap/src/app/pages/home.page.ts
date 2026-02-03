import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStateService } from '../state/app-state.service';
import { ShareService } from '../state/share.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="hero">
    <h1>Split the bill without the drama.</h1>
    <p class="sub">Scan a receipt, fix anything questionable, assign items, then share a link everyone trusts.</p>

    <div class="cta">
      <a class="big" routerLink="/scan">Start: Scan receipt</a>
      <a class="ghost" routerLink="/assign">Skip scan: manual items</a>
    </div>

    <div class="card">
      <h2>How it works</h2>
      <ol>
        <li><b>Scan</b> (on-device OCR)</li>
        <li><b>Quick fix</b> names/prices</li>
        <li><b>Assign</b> items to people (split evenly)</li>
        <li><b>Summary</b> shows totals + audit trail</li>
      </ol>
      <p class="small">Tip: hit <b>Undo</b> any time. Everything is reversible.</p>
    </div>

    <div class="card" *ngIf="hasData()">
      <h2>Resume</h2>
      <p class="small">You already have a receipt in progress.</p>
      <div class="cta">
        <a class="ghost" routerLink="/scan">Back to scan</a>
        <a class="big" routerLink="/summary">Go to summary</a>
      </div>
    </div>

    <div class="card subtle">
      <h2>Privacy</h2>
      <p class="small">SplitSnap runs locally in your browser. Sharing generates a link containing compressed data — no server required.</p>
    </div>
  </section>
  `,
  styles: [`
    .hero{display:grid; gap:14px; padding: 10px 0 30px;}
    h1{font-size: 42px; line-height:1.08; margin: 10px 0 0; letter-spacing:-0.6px;}
    .sub{font-size: 16px; color: rgba(246,247,251,0.78); max-width: 60ch;}
    .cta{display:flex; gap:12px; flex-wrap:wrap; margin-top: 6px;}
    a.big{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; background: linear-gradient(135deg,#22D3EE 0%, #8B5CF6 100%); color:#06060a; font-weight:900; text-decoration:none;}
    a.ghost{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800; text-decoration:none;}
    .card{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.04);}
    .card.subtle{background: rgba(255,255,255,0.03);}
    h2{font-size: 16px; margin: 0 0 6px;}
    ol{margin: 10px 0 0 18px; padding:0; color: rgba(246,247,251,0.80);}
    li{margin: 6px 0;}
    .small{color: rgba(246,247,251,0.65); margin: 6px 0 0;}
    @media (max-width: 520px){
      h1{font-size: 34px;}
    }
  `]
})
export class HomePage {
  private router = inject(Router);
  private state = inject(AppStateService);
  private share = inject(ShareService);

  hasData = computed(() => this.state.receipt().items.length > 0 || this.state.receipt().people.length > 0);

  constructor() {
    // import shared state from ?s=... then drop user into summary
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (s) {
      const decoded = this.share.decode(s);
      if (decoded) {
        this.state.hydrateFromSharedState(decoded);
        // keep URL clean-ish; preserve hash route
        params.delete('s');
        const newQs = params.toString();
        const newUrl = `${window.location.pathname}${newQs ? `?${newQs}` : ''}${window.location.hash || '#/summary'}`;
        window.history.replaceState({}, '', newUrl);
        this.router.navigateByUrl('/summary');
      }
    }
  }
}
