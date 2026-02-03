export type Currency = 'CHF' | 'EUR' | 'USD' | 'GBP' | 'UNKNOWN';

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface LineItem {
  id: string;
  name: string;
  price: number; // in major units (e.g. 12.50)
  assignedTo: string[]; // person ids
  splitEvenly: boolean; // if true, split price evenly across assignedTo
}

export interface Receipt {
  currency: Currency;
  venue?: string;
  items: LineItem[];
  people: Person[];
  tax?: number;
  tip?: number;
  roundingMode: 'nearest-0.05' | 'nearest-0.10' | 'none';
  /** Optional: who actually paid the receipt (for settlement suggestions) */
  paidBy?: string;
}

export interface AppState {
  v: 1;
  receipt: Receipt;
  lastUpdated: number;
}
