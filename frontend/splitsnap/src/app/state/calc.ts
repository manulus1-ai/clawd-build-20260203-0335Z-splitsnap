import { LineItem, Person, Receipt } from './models';

export function roundCurrency(value: number, mode: Receipt['roundingMode']) {
  const v = Math.max(0, value);
  if (mode === 'none') return round2(v);
  const step = mode === 'nearest-0.10' ? 0.1 : 0.05;
  return round2(Math.round(v / step) * step);
}

export function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export function splitItemShares(item: LineItem) {
  const n = item.assignedTo.length;
  if (!n) return [] as Array<{ personId: string; amount: number }>;
  if (item.splitEvenly) {
    const each = item.price / n;
    return item.assignedTo.map((personId) => ({ personId, amount: each }));
  }
  // If not splitEvenly, still equal for now (v2 could allow weights)
  const each = item.price / n;
  return item.assignedTo.map((personId) => ({ personId, amount: each }));
}

export function computeTotals(receipt: Receipt) {
  const baseTotals = new Map<string, number>();
  for (const p of receipt.people) baseTotals.set(p.id, 0);

  for (const item of receipt.items) {
    for (const share of splitItemShares(item)) {
      baseTotals.set(share.personId, (baseTotals.get(share.personId) ?? 0) + share.amount);
    }
  }

  const extras = round2((receipt.tax ?? 0) + (receipt.tip ?? 0));
  const subtotal = round2(receipt.items.reduce((s, it) => s + (it.price || 0), 0));
  const total = round2(subtotal + extras);

  // spread extras proportional to base totals
  const sumBase = Array.from(baseTotals.values()).reduce((a, b) => a + b, 0) || 1;
  const withExtras = new Map<string, number>();
  for (const [pid, base] of baseTotals.entries()) {
    withExtras.set(pid, base + (extras * base) / sumBase);
  }

  // rounding pass: round each person, then reconcile diff by nudging largest shares
  const rounded = new Map<string, number>();
  for (const [pid, amt] of withExtras.entries()) rounded.set(pid, roundCurrency(amt, receipt.roundingMode));

  let roundedSum = round2(Array.from(rounded.values()).reduce((a, b) => a + b, 0));
  const target = roundCurrency(total, receipt.roundingMode);
  let diff = round2(target - roundedSum);

  if (Math.abs(diff) >= 0.01) {
    // nudge in cents until diff is closed, prefer largest unrounded amounts
    const order = receipt.people
      .map((p) => ({
        id: p.id,
        frac: (withExtras.get(p.id) ?? 0) - (rounded.get(p.id) ?? 0),
        base: withExtras.get(p.id) ?? 0
      }))
      .sort((a, b) => b.base - a.base);

    const step = receipt.roundingMode === 'nearest-0.10' ? 0.1 : receipt.roundingMode === 'nearest-0.05' ? 0.05 : 0.01;

    while (Math.abs(diff) >= 0.001) {
      const dir = diff > 0 ? 1 : -1;
      const idx = dir > 0 ? 0 : order.length - 1;
      const pick = dir > 0 ? order[idx] : order[idx];
      const cur = rounded.get(pick.id) ?? 0;
      rounded.set(pick.id, round2(cur + dir * step));
      diff = round2(diff - dir * step);
      if (Math.abs(diff) < step) break;
    }
  }

  roundedSum = round2(Array.from(rounded.values()).reduce((a, b) => a + b, 0));

  return {
    subtotal,
    extras,
    total,
    perPerson: receipt.people.map((p) => ({
      person: p,
      base: round2(baseTotals.get(p.id) ?? 0),
      withExtras: round2(withExtras.get(p.id) ?? 0),
      rounded: round2(rounded.get(p.id) ?? 0)
    })),
    roundedTotal: target,
    roundingDelta: round2(target - roundedSum)
  };
}

export function formatMoney(amount: number, currency: Receipt['currency']) {
  const symbol = currency === 'CHF' ? 'CHF' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '';
  if (currency === 'CHF') return `${symbol} ${amount.toFixed(2)}`;
  if (currency === 'EUR') return `${symbol}${amount.toFixed(2)}`;
  if (currency === 'USD') return `${symbol}${amount.toFixed(2)}`;
  if (currency === 'GBP') return `${symbol}${amount.toFixed(2)}`;
  return amount.toFixed(2);
}

export function auditTrail(receipt: Receipt, personId: string) {
  const lines: Array<{ item: LineItem; share: number }> = [];
  for (const item of receipt.items) {
    if (!item.assignedTo.includes(personId)) continue;
    const shares = splitItemShares(item);
    const share = shares.find((s) => s.personId === personId)?.amount ?? 0;
    lines.push({ item, share: round2(share) });
  }
  return lines;
}

export function settlementSuggestions(receipt: Receipt) {
  const paidBy = receipt.paidBy || '';
  if (!paidBy) return [] as Array<{ from: Person; to: Person; amount: number }>;

  const totals = computeTotals(receipt);
  const payer = receipt.people.find((p) => p.id === paidBy);
  if (!payer) return [];

  const transfers: Array<{ from: Person; to: Person; amount: number }> = [];
  for (const row of totals.perPerson) {
    if (row.person.id === payer.id) continue;
    if (row.rounded <= 0) continue;
    transfers.push({ from: row.person, to: payer, amount: row.rounded });
  }
  return transfers;
}
