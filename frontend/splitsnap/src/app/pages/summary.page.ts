import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../state/app-state.service';
import { ShareService } from '../state/share.service';
import { auditTrail, computeTotals, formatMoney, settlementSuggestions } from '../state/calc';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="wrap">
    <header class="hdr">
      <div>
        <h1>Summary</h1>
        <p class="muted">Big numbers, clear math, full audit trail.</p>
      </div>
      <div class="cta">
        <a class="ghost" routerLink="/assign">Back</a>
      </div>
    </header>

    <div class="grid">
      <div class="panel">
        <h2>Totals</h2>

        <div class="totals">
          <div class="kv"><span>Subtotal</span><b>{{ money(vm().subtotal) }}</b></div>
          <div class="kv"><span>Extras (tax+tip)</span><b>{{ money(vm().extras) }}</b></div>
          <div class="kv big"><span>Receipt total</span><b>{{ money(vm().total) }}</b></div>
        </div>

        <div class="card">
          <div class="row">
            <label>Tax</label>
            <input type="number" step="0.01" inputmode="decimal" [value]="receipt().tax" (input)="setTax(parseNum($any($event.target).value))" />
          </div>
          <div class="row">
            <label>Tip</label>
            <input type="number" step="0.01" inputmode="decimal" [value]="receipt().tip" (input)="setTip(parseNum($any($event.target).value))" />
          </div>
          <div class="row">
            <label>Rounding</label>
            <select [value]="receipt().roundingMode" (change)="setRounding($any($event.target).value)">
              <option value="nearest-0.05">Nearest 0.05</option>
              <option value="nearest-0.10">Nearest 0.10</option>
              <option value="none">None</option>
            </select>
          </div>

          <div class="row" *ngIf="receipt().people.length">
            <label>Paid by (optional)</label>
            <select [value]="receipt().paidBy || ''" (change)="setPaidBy($any($event.target).value)">
              <option value="">— Not set —</option>
              <option *ngFor="let p of receipt().people" [value]="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div class="settle" *ngIf="transfers().length">
            <div class="settleTitle">Settlement suggestions</div>
            <div class="settleRow" *ngFor="let t of transfers()">
              <span><b>{{ t.from.name }}</b> → <b>{{ t.to.name }}</b></span>
              <b>{{ money(t.amount) }}</b>
            </div>
          </div>
        </div>

        <div class="card share">
          <h3>Share</h3>
          <p class="muted">Send a link so everyone sees their amount + the item trail.</p>
          <div class="shareRow">
            <button class="btn" (click)="makeShare()">Generate link</button>
            <button class="btn" [class.disabled]="!shareUrl()" (click)="copyShare()">Copy</button>
            <button class="btn" (click)="downloadJson()">Download JSON</button>
            <label class="btn file">
              Import JSON
              <input type="file" accept="application/json" (change)="importJson($event)" />
            </label>
          </div>
          <input class="shareInput" [value]="shareUrl()" readonly placeholder="(generate a link)" />
          <div class="small" *ngIf="copied()">Copied.</div>
        </div>
      </div>

      <div class="panel">
        <h2>Who owes what</h2>
        <div class="person" *ngFor="let row of vm().perPerson">
          <div class="personTop" (click)="toggle(row.person.id)">
            <div class="left">
              <div class="dot" [style.background]="row.person.color"></div>
              <div>
                <div class="pname">{{ row.person.name }}</div>
                <div class="sub">Base {{ money(row.base) }} · With extras {{ money(row.withExtras) }}</div>
              </div>
            </div>
            <div class="right">
              <div class="bigNum">{{ money(row.rounded) }}</div>
              <div class="chev">{{ open().has(row.person.id) ? 'Hide' : 'Audit' }}</div>
            </div>
          </div>

          <div class="audit" *ngIf="open().has(row.person.id)">
            <div class="auditRow" *ngFor="let a of trail(row.person.id)">
              <span>{{ a.item.name }}</span>
              <b>{{ money(a.share) }}</b>
            </div>
            <div class="auditRow dim" *ngIf="trail(row.person.id).length===0">
              <span>No assigned items</span><b>{{ money(0) }}</b>
            </div>
          </div>
        </div>

        <div class="card subtle" *ngIf="vm().perPerson.length===0">
          <p class="muted">No people yet. Go back to Assign.</p>
          <a class="ghost" routerLink="/assign">Assign people</a>
        </div>
      </div>
    </div>
  </section>
  `,
  styles: [`
    .wrap{display:grid; gap:12px;}
    .hdr{display:flex; justify-content:space-between; gap:12px; align-items:flex-end; flex-wrap:wrap;}
    h1{margin: 2px 0 0; font-size: 28px;}
    .muted{color: rgba(246,247,251,0.68); margin: 6px 0 0;}
    .cta{display:flex; gap:10px; flex-wrap:wrap;}
    a.ghost{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800; text-decoration:none;}

    .grid{display:grid; grid-template-columns: 1fr 1.2fr; gap:14px; align-items:start;}
    @media (max-width: 980px){.grid{grid-template-columns:1fr;}}
    .panel{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.03);}

    h2{margin:0 0 10px; font-size: 14px;}
    h3{margin:0 0 6px; font-size: 14px;}

    .totals{display:grid; gap:8px;}
    .kv{display:flex; justify-content:space-between; gap:10px; border:1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 10px 12px; background: rgba(255,255,255,0.03);} 
    .kv span{color: rgba(246,247,251,0.70);} 
    .kv b{font-variant-numeric: tabular-nums;}
    .kv.big b{font-size: 22px;}

    .card{margin-top: 12px; border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.03);}
    .card.subtle{background: rgba(255,255,255,0.02);} 

    .row{display:grid; gap:6px; margin: 10px 0;}
    label{font-size: 12px; color: rgba(246,247,251,0.72);} 
    input, select{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(7,7,10,0.55); color:#f6f7fb;}

    .shareRow{display:flex; gap:8px; flex-wrap:wrap; margin-top: 8px;}
    .btn{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800; cursor:pointer;}
    .btn.disabled{opacity:0.45; pointer-events:none;}
    .btn.file{position:relative; overflow:hidden; display:inline-flex; align-items:center;}
    .btn.file input{position:absolute; inset:0; opacity:0; cursor:pointer;}
    .shareInput{width:100%; margin-top: 8px; font-variant-numeric: tabular-nums;}
    .small{font-size: 12px; color: rgba(246,247,251,0.70); margin-top: 6px;}

    .settle{margin-top: 10px; border-top:1px solid rgba(255,255,255,0.08); padding-top: 10px;}
    .settleTitle{font-size: 12px; color: rgba(246,247,251,0.70); margin-bottom: 6px; font-weight:800;}
    .settleRow{display:flex; justify-content:space-between; gap:10px; font-size: 13px; color: rgba(246,247,251,0.85);} 

    .person{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.03); margin-top: 10px;}
    .personTop{display:flex; justify-content:space-between; gap:12px; cursor:pointer;}
    .left{display:flex; gap:10px; align-items:center;}
    .dot{width:12px; height:12px; border-radius: 99px;}
    .pname{font-weight:900; font-size: 16px;}
    .sub{font-size: 12px; color: rgba(246,247,251,0.65);} 
    .right{text-align:right;}
    .bigNum{font-size: 28px; font-weight: 900; letter-spacing: -0.6px; font-variant-numeric: tabular-nums;}
    .chev{font-size: 12px; color: rgba(246,247,251,0.65);} 

    .audit{margin-top: 10px; border-top:1px solid rgba(255,255,255,0.08); padding-top: 10px; display:grid; gap:6px;}
    .auditRow{display:flex; justify-content:space-between; gap:10px; font-size: 13px; color: rgba(246,247,251,0.85);} 
    .auditRow b{font-variant-numeric: tabular-nums;}
    .auditRow.dim{color: rgba(246,247,251,0.55);} 
  `]
})
export class SummaryPage {
  private state = inject(AppStateService);
  private share = inject(ShareService);

  receipt = this.state.receipt;

  open = signal(new Set<string>());
  shareUrl = signal<string>('');
  copied = signal(false);

  vm = computed(() => computeTotals(this.receipt()));
  transfers = computed(() => settlementSuggestions(this.receipt()));

  money(amount: number) {
    return formatMoney(amount, this.receipt().currency);
  }

  parseNum(v: string) {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  setTax(tax: number) {
    this.state.setExtras(tax, this.receipt().tip ?? 0);
  }

  setTip(tip: number) {
    this.state.setExtras(this.receipt().tax ?? 0, tip);
  }

  setRounding(mode: any) {
    this.state.setRoundingMode(mode);
  }

  setPaidBy(personId: string) {
    this.state.setPaidBy(personId);
  }

  toggle(personId: string) {
    this.open.update((s) => {
      const next = new Set(s);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }

  trail(personId: string) {
    return auditTrail(this.receipt(), personId);
  }

  makeShare() {
    const receipt = this.receipt();
    const token = this.share.encode({
      currency: receipt.currency,
      venue: receipt.venue,
      items: receipt.items,
      people: receipt.people,
      tax: receipt.tax,
      tip: receipt.tip,
      roundingMode: receipt.roundingMode,
      paidBy: receipt.paidBy
    });

    this.shareUrl.set(this.share.buildShareUrl(token, '#/summary'));
    this.copied.set(false);
  }

  async copyShare() {
    if (!this.shareUrl()) return;
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1200);
    } catch {
      // ignore
    }
  }

  downloadJson() {
    const receipt = this.receipt();
    const payload = {
      receipt,
      exportedAt: new Date().toISOString(),
      app: 'SplitSnap'
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitsnap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJson(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const receipt = (parsed?.receipt ?? parsed) as any;
      if (receipt?.items && receipt?.people) {
        this.state.hydrateFromSharedState(receipt);
      }
    } catch {
      // ignore
    } finally {
      input.value = '';
    }
  }
}
