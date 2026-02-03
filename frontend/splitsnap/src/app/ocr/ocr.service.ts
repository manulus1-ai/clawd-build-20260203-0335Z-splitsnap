import { Injectable } from '@angular/core';
import Tesseract from 'tesseract.js';

export interface ParsedItem {
  name: string;
  price: number;
}

function normalizeLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,'\-–—/:()]/g, '')
    .trim();
}

function guessCurrency(text: string) {
  const t = text.toUpperCase();
  if (t.includes('CHF') || t.includes('FR.')) return 'CHF' as const;
  if (t.includes('EUR') || t.includes('€')) return 'EUR' as const;
  if (t.includes('USD') || t.includes('$')) return 'USD' as const;
  if (t.includes('GBP') || t.includes('£')) return 'GBP' as const;
  return 'UNKNOWN' as const;
}

function parsePriceToken(token: string) {
  // supports 12.50, 12,50, 1'234.50
  const cleaned = token.replace(/'/g, '').replace(/,/g, '.');
  const m = cleaned.match(/(\d+\.?\d{0,2})$/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  async recognize(image: File | Blob) {
    const result = await Tesseract.recognize(image, 'eng', {
      logger: () => {
        // caller can show its own progress; keeping quiet avoids noise
      }
    });

    const text = result.data.text || '';
    const currency = guessCurrency(text);

    const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);

    const items: ParsedItem[] = [];

    // heuristic: lines that end with a price and have some name
    for (const line of lines) {
      const parts = line.split(' ');
      if (parts.length < 2) continue;

      const last = parts[parts.length - 1];
      const price = parsePriceToken(last);
      if (price == null) continue;

      const name = parts.slice(0, -1).join(' ').trim();
      if (!name) continue;

      // ignore common totals
      const upper = name.toUpperCase();
      if (/(TOTAL|SUMME|SUBTOTAL|MWST|TAX|TIP|GRATUITY|CHANGE)/.test(upper)) continue;

      // avoid tiny noise prices
      if (price <= 0) continue;

      items.push({ name, price });
    }

    // de-dupe very similar sequential items
    const deduped: ParsedItem[] = [];
    for (const it of items) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.name.toLowerCase() === it.name.toLowerCase() && Math.abs(prev.price - it.price) < 0.01) continue;
      deduped.push(it);
    }

    return { text, currency, items: deduped };
  }
}
