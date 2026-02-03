import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../state/app-state.service';
import { LineItem } from '../state/models';
import { OcrService } from '../ocr/ocr.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="grid">
    <div class="panel">
      <h1>Scan</h1>
      <p class="muted">Choose a receipt photo. OCR runs locally in your browser.</p>

      <div class="uploader">
        <input type="file" accept="image/*" capture="environment" (change)="onFile($event)" />
        <button class="btn" (click)="demo()" title="Load demo items">Load demo</button>
      </div>

      <div class="status" *ngIf="busy()">Reading receipt…</div>
      <div class="status ok" *ngIf="lastRun() && !busy()">Parsed {{ lastRun()!.itemsCount }} items. Review below.</div>

      <div class="card">
        <div class="row">
          <label>Venue (optional)</label>
          <input [value]="receipt().venue" (input)="setVenue($any($event.target).value)" placeholder="Restaurant / bar" />
        </div>
        <div class="row">
          <label>Currency</label>
          <select [value]="receipt().currency" (change)="setCurrency($any($event.target).value)">
            <option value="UNKNOWN">Unknown</option>
            <option value="CHF">CHF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      <div class="card">
        <h2>Items</h2>
        <p class="muted">Tap to fix anything questionable. Undo is always available.</p>

        <div class="item" *ngFor="let it of receipt().items">
          <input class="name" [value]="it.name" (input)="update(it.id,{name:$any($event.target).value})" />
          <input class="price" type="number" step="0.01" inputmode="decimal" [value]="it.price" (input)="update(it.id,{price:parseNum($any($event.target).value)})" />
          <button class="x" (click)="remove(it.id)" title="Remove">×</button>
        </div>

        <div class="add">
          <input #newName placeholder="New item" />
          <input #newPrice type="number" step="0.01" inputmode="decimal" placeholder="0.00" />
          <button class="btn" (click)="add(newName.value, newPrice.value); newName.value=''; newPrice.value=''">Add</button>
        </div>

        <div class="cta">
          <a class="big" routerLink="/assign" [class.disabled]="receipt().items.length===0">Next: Assign</a>
          <a class="ghost" routerLink="/">Back</a>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>Tips</h2>
      <ul class="tips">
        <li>Restaurant lighting is brutal — this UI is built for low-light contrast.</li>
        <li>If OCR misses a line, add it manually. It's usually faster than fighting it.</li>
        <li>Totals/Tax lines are ignored on purpose. Add tax/tip later in Summary.</li>
      </ul>

      <div class="card subtle" *ngIf="lastRawText()">
        <h2>OCR text (debug)</h2>
        <pre>{{ lastRawText() }}</pre>
      </div>
    </div>
  </section>
  `,
  styles: [`
    .grid{display:grid; grid-template-columns: 1.6fr 1fr; gap:14px; align-items:start;}
    @media (max-width: 920px){.grid{grid-template-columns:1fr;}}
    h1{margin: 4px 0 0; font-size: 28px;}
    .muted{color: rgba(246,247,251,0.68); margin: 6px 0 0;}
    .panel{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.03);}
    .uploader{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top: 10px;}
    input[type=file]{max-width: 100%;}
    .btn{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800;}
    .btn:hover{background: rgba(255,255,255,0.10);}
    .status{margin-top:10px; padding:10px; border-radius: 12px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04);}
    .status.ok{border-color: rgba(34,211,238,0.35);}
    .card{margin-top: 12px; border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.03);}
    .card.subtle{background: rgba(255,255,255,0.02);}
    .row{display:grid; gap:6px; margin: 10px 0;}
    label{font-size: 12px; color: rgba(246,247,251,0.72);}
    input, select{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(7,7,10,0.55); color:#f6f7fb;}
    h2{margin: 0 0 6px; font-size: 14px;}
    .item{display:grid; grid-template-columns: 1fr 120px 40px; gap:8px; align-items:center; margin-top: 8px;}
    .item .name{font-weight:700;}
    .item .price{text-align:right; font-variant-numeric: tabular-nums;}
    .x{width:40px; height:40px; border-radius: 12px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color:#ffd7d7; font-size: 20px;}
    .add{display:grid; grid-template-columns: 1fr 120px auto; gap:8px; align-items:center; margin-top: 12px;}
    .cta{display:flex; gap:10px; margin-top: 12px; flex-wrap:wrap;}
    a.big{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; background: linear-gradient(135deg,#22D3EE 0%, #8B5CF6 100%); color:#06060a; font-weight:900; text-decoration:none;}
    a.ghost{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800; text-decoration:none;}
    a.disabled{opacity:0.45; pointer-events:none;}
    ul.tips{margin: 8px 0 0 18px; color: rgba(246,247,251,0.75);} 
    pre{white-space: pre-wrap; word-break: break-word; font-size: 12px; color: rgba(246,247,251,0.68);}
  `]
})
export class ScanPage {
  private state = inject(AppStateService);
  private ocr = inject(OcrService);

  receipt = this.state.receipt;

  busy = signal(false);
  lastRawText = signal<string>('');
  lastRun = signal<{ itemsCount: number } | null>(null);

  setVenue(v: string) {
    this.state.setVenue(v);
  }
  setCurrency(c: any) {
    this.state.setCurrency(c);
  }

  parseNum(v: string) {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  update(itemId: string, patch: Partial<LineItem>) {
    this.state.updateItem(itemId, patch);
  }

  remove(itemId: string) {
    this.state.removeItem(itemId);
  }

  add(name: string, price: string) {
    this.state.addItem(name, this.parseNum(price));
  }

  async onFile(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.busy.set(true);
    this.lastRun.set(null);

    try {
      const res = await this.ocr.recognize(file);
      this.lastRawText.set(res.text);
      if (res.currency) this.state.setCurrency(res.currency);

      const items = res.items.map((it) => ({
        id: `i_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
        name: it.name,
        price: it.price,
        assignedTo: [],
        splitEvenly: true
      }));

      this.state.setItems(items);
      this.lastRun.set({ itemsCount: items.length });
    } catch (e: any) {
      this.lastRawText.set(String(e?.message || e));
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  demo() {
    const items = [
      { name: 'Burger', price: 18.5 },
      { name: 'Fries', price: 6.0 },
      { name: 'Soda', price: 4.5 },
      { name: 'Beer', price: 7.0 }
    ].map((it) => ({
      id: `i_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
      name: it.name,
      price: it.price,
      assignedTo: [],
      splitEvenly: true
    }));

    this.state.setCurrency('CHF');
    this.state.setItems(items);
    this.lastRun.set({ itemsCount: items.length });
  }
}
