import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../state/app-state.service';
import { LineItem } from '../state/models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="wrap">
    <header class="hdr">
      <div>
        <h1>Assign</h1>
        <p class="muted">Tap names to assign each item. Enable "Split evenly" for shared items.</p>
      </div>
      <div class="cta">
        <a class="ghost" routerLink="/scan">Back</a>
        <a class="big" routerLink="/summary" [class.disabled]="receipt().people.length===0">Next: Summary</a>
      </div>
    </header>

    <div class="grid">
      <div class="panel">
        <h2>People</h2>
        <div class="add">
          <input #pname placeholder="Add person" (keydown.enter)="addPerson(pname.value); pname.value=''" />
          <button class="btn" (click)="addPerson(pname.value); pname.value=''">Add</button>
        </div>

        <div class="people" *ngIf="receipt().people.length; else noPeople">
          <div class="person" *ngFor="let p of receipt().people" [style.border-color]="p.color">
            <div class="dot" [style.background]="p.color"></div>
            <input class="pname" [value]="p.name" (input)="rename(p.id, $any($event.target).value)" />
            <button class="x" (click)="removePerson(p.id)" title="Remove">×</button>
          </div>
        </div>
        <ng-template #noPeople>
          <p class="muted">Add at least one person to start assigning.</p>
        </ng-template>

        <div class="card subtle" *ngIf="receipt().items.length===0">
          <p class="muted">No items yet. Go back to Scan or add items manually.</p>
          <a class="ghost" routerLink="/scan">Go to scan</a>
        </div>
      </div>

      <div class="panel">
        <h2>Items</h2>
        <div class="item" *ngFor="let it of receipt().items">
          <div class="head">
            <div class="name">{{ it.name }}</div>
            <div class="price">{{ it.price.toFixed(2) }}</div>
          </div>

          <div class="chips">
            <button
              class="chip"
              *ngFor="let p of receipt().people"
              [class.on]="it.assignedTo.includes(p.id)"
              [style.border-color]="p.color"
              [style.box-shadow]="it.assignedTo.includes(p.id) ? '0 0 0 3px ' + p.color + '33 inset' : ''"
              (click)="toggleAssign(it, p.id)">
              <span class="dot" [style.background]="p.color"></span>
              {{ p.name }}
            </button>
          </div>

          <div class="controls">
            <label class="check">
              <input type="checkbox" [checked]="it.splitEvenly" (change)="setSplitEvenly(it, $any($event.target).checked)" />
              Split evenly
            </label>
            <span class="hint" *ngIf="it.assignedTo.length===0">Unassigned</span>
            <span class="hint" *ngIf="it.assignedTo.length===1">Assigned to 1 person</span>
            <span class="hint" *ngIf="it.assignedTo.length>1">Split across {{ it.assignedTo.length }}</span>
          </div>
        </div>

        <div class="card subtle" *ngIf="receipt().items.length">
          <h3>Trust check</h3>
          <p class="muted">Every total in Summary is backed by an item-by-item audit trail.</p>
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
    a.big{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; background: linear-gradient(135deg,#22D3EE 0%, #8B5CF6 100%); color:#06060a; font-weight:900; text-decoration:none;}
    a.ghost{display:inline-flex; align-items:center; justify-content:center; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800; text-decoration:none;}
    a.disabled{opacity:0.45; pointer-events:none;}

    .grid{display:grid; grid-template-columns: 1fr 1.4fr; gap:14px; align-items:start;}
    @media (max-width: 980px){.grid{grid-template-columns:1fr;}}
    .panel{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.03);}

    h2{margin:0 0 10px; font-size: 14px;}
    h3{margin:0 0 6px; font-size: 14px;}

    .add{display:flex; gap:8px; align-items:center; margin-bottom: 10px; flex-wrap:wrap;}
    input{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(7,7,10,0.55); color:#f6f7fb;}
    .btn{padding:10px 12px; border-radius: 12px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#f6f7fb; font-weight:800;}

    .people{display:grid; gap:8px;}
    .person{display:grid; grid-template-columns: 18px 1fr 40px; gap:10px; align-items:center; border:1px solid rgba(255,255,255,0.10); border-radius: 14px; padding:10px; background: rgba(255,255,255,0.03);}
    .person .dot{width:10px; height:10px; border-radius: 99px;}
    .pname{font-weight:800;}
    .x{width:40px; height:40px; border-radius: 12px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color:#ffd7d7; font-size: 20px;}

    .item{border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.03); margin-top: 10px;}
    .head{display:flex; justify-content:space-between; gap:10px; align-items:baseline;}
    .name{font-weight:900; font-size: 16px;}
    .price{font-variant-numeric: tabular-nums; color: rgba(246,247,251,0.85);}

    .chips{display:flex; gap:8px; flex-wrap:wrap; margin-top: 10px;}
    .chip{display:inline-flex; gap:8px; align-items:center; padding: 9px 10px; border-radius: 999px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color:#f6f7fb; font-weight:800;}
    .chip.on{background: rgba(34,211,238,0.10);}
    .chip .dot{width:10px; height:10px; border-radius: 99px;}

    .controls{display:flex; justify-content:space-between; gap:10px; align-items:center; margin-top: 10px; flex-wrap:wrap;}
    .check{display:flex; gap:8px; align-items:center; color: rgba(246,247,251,0.85); font-weight:700;}
    .hint{color: rgba(246,247,251,0.65); font-size: 12px;}

    .card{margin-top: 12px; border:1px solid rgba(255,255,255,0.10); border-radius: 16px; padding: 12px; background: rgba(255,255,255,0.03);}
    .card.subtle{background: rgba(255,255,255,0.02);}
  `]
})
export class AssignPage {
  private state = inject(AppStateService);
  receipt = this.state.receipt;

  addPerson(name: string) {
    if (!name.trim()) return;
    this.state.addPerson(name);
  }

  rename(id: string, name: string) {
    this.state.renamePerson(id, name);
  }

  removePerson(id: string) {
    this.state.removePerson(id);
  }

  toggleAssign(item: LineItem, personId: string) {
    const set = new Set(item.assignedTo);
    if (set.has(personId)) set.delete(personId);
    else set.add(personId);
    this.state.updateItem(item.id, { assignedTo: Array.from(set) });
  }

  setSplitEvenly(item: LineItem, v: boolean) {
    this.state.updateItem(item.id, { splitEvenly: v });
  }
}
