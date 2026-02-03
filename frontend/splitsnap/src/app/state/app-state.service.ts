import { Injectable, computed, effect, signal } from '@angular/core';
import { AppState, LineItem, Person, Receipt } from './models';

const STORAGE_KEY = 'splitsnap.state.v1';

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const PERSON_COLORS = ['#22D3EE', '#8B5CF6', '#F97316', '#34D399', '#F472B6', '#EAB308', '#60A5FA'];

function defaultReceipt(): Receipt {
  return {
    currency: 'UNKNOWN',
    venue: '',
    items: [],
    people: [],
    tax: 0,
    tip: 0,
    roundingMode: 'nearest-0.05',
    paidBy: ''
  };
}

function defaultState(): AppState {
  return {
    v: 1,
    receipt: defaultReceipt(),
    lastUpdated: Date.now()
  };
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private _history = signal<AppState[]>([]);
  private _state = signal<AppState>(defaultState());

  state = computed(() => this._state());
  receipt = computed(() => this._state().receipt);
  historyCount = computed(() => this._history().length);

  constructor() {
    // local storage hydrate
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed?.v === 1) this._state.set(parsed);
      }
    } catch {
      // ignore
    }

    // autosave
    effect(() => {
      const s = this._state();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {
        // ignore
      }
    });
  }

  private push(next: AppState) {
    this._history.update((h) => [this._state(), ...h].slice(0, 50));
    this._state.set({ ...next, lastUpdated: Date.now() });
  }

  undo() {
    const h = this._history();
    if (!h.length) return;
    const [prev, ...rest] = h;
    this._history.set(rest);
    this._state.set(prev);
  }

  reset() {
    this._history.set([]);
    this._state.set(defaultState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  hydrateFromSharedState(shared: Partial<Receipt>) {
    const receipt: Receipt = {
      ...defaultReceipt(),
      ...shared,
      items: shared.items ?? [],
      people: shared.people ?? []
    };

    this.push({ ...this._state(), receipt });
  }

  setVenue(venue: string) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), venue } });
  }

  setCurrency(currency: Receipt['currency']) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), currency } });
  }

  setRoundingMode(roundingMode: Receipt['roundingMode']) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), roundingMode } });
  }

  setExtras(tax: number, tip: number) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), tax, tip } });
  }

  setPaidBy(personId: string) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), paidBy: personId } });
  }

  addPerson(name: string) {
    const people = this.receipt().people;
    const color = PERSON_COLORS[people.length % PERSON_COLORS.length];
    const person: Person = { id: uid('p'), name: name.trim() || `Person ${people.length + 1}`, color };
    this.push({ ...this._state(), receipt: { ...this.receipt(), people: [...people, person] } });
  }

  renamePerson(personId: string, name: string) {
    const people = this.receipt().people.map((p) => (p.id === personId ? { ...p, name: name.trim() || p.name } : p));
    this.push({ ...this._state(), receipt: { ...this.receipt(), people } });
  }

  removePerson(personId: string) {
    const people = this.receipt().people.filter((p) => p.id !== personId);
    const items = this.receipt().items.map((it) => ({ ...it, assignedTo: it.assignedTo.filter((id) => id !== personId) }));
    this.push({ ...this._state(), receipt: { ...this.receipt(), people, items } });
  }

  setItems(items: LineItem[]) {
    this.push({ ...this._state(), receipt: { ...this.receipt(), items } });
  }

  addItem(name: string, price: number) {
    const item: LineItem = {
      id: uid('i'),
      name: name.trim() || 'Item',
      price: Number.isFinite(price) ? price : 0,
      assignedTo: [],
      splitEvenly: true
    };
    this.push({ ...this._state(), receipt: { ...this.receipt(), items: [...this.receipt().items, item] } });
  }

  updateItem(itemId: string, patch: Partial<LineItem>) {
    const items = this.receipt().items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
    this.push({ ...this._state(), receipt: { ...this.receipt(), items } });
  }

  removeItem(itemId: string) {
    const items = this.receipt().items.filter((it) => it.id !== itemId);
    this.push({ ...this._state(), receipt: { ...this.receipt(), items } });
  }
}
