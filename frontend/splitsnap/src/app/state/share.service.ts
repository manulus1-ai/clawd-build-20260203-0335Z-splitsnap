import { Injectable } from '@angular/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Receipt } from './models';

@Injectable({ providedIn: 'root' })
export class ShareService {
  encode(receipt: Partial<Receipt>) {
    const json = JSON.stringify(receipt);
    return compressToEncodedURIComponent(json);
  }

  decode(token: string): Partial<Receipt> | null {
    try {
      const json = decompressFromEncodedURIComponent(token);
      if (!json) return null;
      return JSON.parse(json) as Partial<Receipt>;
    } catch {
      return null;
    }
  }

  buildShareUrl(token: string, routeHash = '#/summary') {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?s=${token}${routeHash}`;
  }
}
