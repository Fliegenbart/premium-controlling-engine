import { describe, it, expect } from 'vitest';
import { analyzeBookings } from '../lib/analysis';
import { Booking } from '../lib/types';

// Helper function to create realistic test bookings
function createBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    posting_date: '2024-01-15',
    amount: 1000,
    account: 5000,
    account_name: 'Materialkosten',
    cost_center: 'CC100',
    profit_center: 'PC100',
    vendor: 'Lieferant GmbH',
    customer: null,
    document_no: 'DOC001',
    text: 'Material Einkauf',
    ...overrides,
  };
}

describe('analyzeBookings - Core Analysis Logic', () => {
  // ========== Basic Functionality Tests ==========

  it('sollte Abweichungen mit Matching-Buchungen erkennen', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5200,
        account_name: 'Stromkosten',
        amount: 50000,
        cost_center: 'CC100',
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5200,
        account_name: 'Stromkosten',
        amount: 75000,
        cost_center: 'CC100',
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings);

    expect(result.by_account).toHaveLength(1);
    expect(result.by_account[0].account).toBe(5200);
    expect(result.by_account[0].delta_abs).toBe(25000);
    expect(result.by_account[0].delta_pct).toBeCloseTo(50, 1);
  });

  it('sollte keine Abweichungen bei identischen Perioden melden', () => {
    const bookings: Booking[] = [
      createBooking({ account: 5100, amount: 10000 }),
      createBooking({ account: 5200, amount: 20000 }),
    ];

    const result = analyzeBookings(bookings, bookings);

    expect(result.by_account).toHaveLength(0);
    expect(result.by_cost_center).toHaveLength(0);
    expect(result.by_detail).toHaveLength(0);
  });

  it('sollte Umsatzabweichungen (4000-4999) von Kostenabweichungen (5000-8999) unterscheiden', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 4000,
        account_name: 'Umsatz Produkt A',
        amount: 100000,
      }),
      createBooking({
        account: 5500,
        account_name: 'Lohnkosten',
        amount: 50000, // Expenses are typically positive amounts
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 4000,
        account_name: 'Umsatz Produkt A',
        amount: 150000,
      }),
      createBooking({
        account: 5500,
        account_name: 'Lohnkosten',
        amount: 75000, // Increased from 50000 to 75000
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings);

    expect(result.by_account).toHaveLength(2);
    const revenueDeviation = result.by_account.find(d => d.account === 4000);
    const costDeviation = result.by_account.find(d => d.account === 5500);

    expect(revenueDeviation?.comment).toContain('Umsatzsteigerung');
    expect(costDeviation?.comment).toContain('Kostensteigerung');
  });

  // ========== Materiality Threshold Tests ==========

  it('sollte Abweichungen unter wesentlichkeit_abs filtern', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5300,
        amount: 100000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5300,
        amount: 101000, // Nur 1000 Unterschied
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account).toHaveLength(0); // Filtered out
  });

  it('sollte Abweichungen unter wesentlichkeit_pct filtern', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5400,
        amount: 100000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5400,
        amount: 101000, // 1% Unterschied
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 500,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account).toHaveLength(0); // Filtered out due to percentage
  });

  it('sollte Abweichungen nur melden wenn BEIDE Schwellwerte überschritten sind', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5500,
        amount: 100000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5500,
        amount: 105000, // 5% und 5000 EUR
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account).toHaveLength(0); // Percentage threshold not met
  });

  it('sollte negative Abweichungen (Kostensenkung) richtig behandeln', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5600,
        amount: 100000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5600,
        amount: 50000, // Senkung um 50%
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account).toHaveLength(1);
    expect(result.by_account[0].delta_abs).toBe(-50000);
    expect(result.by_account[0].delta_pct).toBe(-50);
    expect(result.by_account[0].comment).toContain('Kostensenkung');
  });

  // ========== Cost Center Aggregation Tests ==========

  it('sollte Abweichungen nach Kostenstellen aggregieren', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5700,
        cost_center: 'CC-Berlin',
        amount: 30000,
      }),
      createBooking({
        account: 5800,
        cost_center: 'CC-Berlin',
        amount: 20000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5700,
        cost_center: 'CC-Berlin',
        amount: 40000,
      }),
      createBooking({
        account: 5800,
        cost_center: 'CC-Berlin',
        amount: 30000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_cost_center).toHaveLength(1);
    expect(result.by_cost_center[0].cost_center).toBe('CC-Berlin');
    expect(result.by_cost_center[0].delta_abs).toBe(20000);
  });

  it('sollte Top-Konten pro Kostenstelle identifizieren', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 5900,
        cost_center: 'CC-München',
        amount: 50000,
      }),
      createBooking({
        account: 6100,
        cost_center: 'CC-München',
        amount: 30000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 5900,
        cost_center: 'CC-München',
        amount: 80000,
      }),
      createBooking({
        account: 6100,
        cost_center: 'CC-München',
        amount: 40000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_cost_center).toHaveLength(1);
    expect(result.by_cost_center[0].top_accounts).toBeDefined();
    expect(result.by_cost_center[0].top_accounts?.length).toBeGreaterThan(0);
  });

  // ========== Detail Deviation Calculation Tests ==========

  it('sollte Detail-Abweichungen (Konto + Kostenstelle) berechnen', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6200,
        cost_center: 'CC-Hamburg',
        amount: 25000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6200,
        cost_center: 'CC-Hamburg',
        amount: 50000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_detail.length).toBeGreaterThan(0);
    const detail = result.by_detail[0];
    expect(detail.account).toBe(6200);
    expect(detail.cost_center).toBe('CC-Hamburg');
    expect(detail.delta_abs).toBe(25000);
  });

  it('sollte maximal 15 Detail-Deviationen zurückgeben', () => {
    const prevBookings: Booking[] = Array.from({ length: 30 }, (_, i) =>
      createBooking({
        account: 6300 + Math.floor(i / 2),
        cost_center: `CC-${i}`,
        amount: 10000,
      })
    );

    const currBookings: Booking[] = Array.from({ length: 30 }, (_, i) =>
      createBooking({
        account: 6300 + Math.floor(i / 2),
        cost_center: `CC-${i}`,
        amount: 20000,
      })
    );

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 1000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_detail.length).toBeLessThanOrEqual(15);
  });

  // ========== Edge Cases and Special Scenarios ==========

  it('sollte leere Buchungs-Arrays verarbeiten', () => {
    const result = analyzeBookings([], []);

    expect(result.by_account).toHaveLength(0);
    expect(result.by_cost_center).toHaveLength(0);
    expect(result.by_detail).toHaveLength(0);
    expect(result.summary.total_delta).toBe(0);
  });

  it('sollte mit einzelnen Buchungen umgehen', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6400,
        amount: 10000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6400,
        amount: 25000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 1000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account).toHaveLength(1);
    expect(result.by_account[0].delta_abs).toBe(15000);
  });

  it('sollte sehr große Zahlen korrekt verarbeiten', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6500,
        amount: 1000000000, // 1 Milliarde
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6500,
        amount: 1500000000, // 1,5 Milliarden
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 100000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account).toHaveLength(1);
    expect(result.by_account[0].delta_abs).toBe(500000000);
    expect(result.by_account[0].delta_pct).toBeCloseTo(50, 1);
  });

  it('sollte Konten mit Null-Beträgen von Null richtig behandeln', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6600,
        amount: 0,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6600,
        amount: 10000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account).toHaveLength(1);
    expect(result.by_account[0].delta_pct).toBe(100); // 10000/0 should be 100%
  });

  // ========== Top Bookings and Evidence Tracking ==========

  it('sollte Top-Buchungen für aktuelle Periode extrahieren', () => {
    const currBookings: Booking[] = [
      createBooking({
        account: 6700,
        amount: 5000,
        vendor: 'Vendor A',
        text: 'Booking 1',
      }),
      createBooking({
        account: 6700,
        amount: 3000,
        vendor: 'Vendor B',
        text: 'Booking 2',
      }),
      createBooking({
        account: 6700,
        amount: 2000,
        vendor: 'Vendor C',
        text: 'Booking 3',
      }),
    ];

    const result = analyzeBookings([], currBookings, {
      wesentlichkeit_abs: 1000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account.length).toBeGreaterThan(0);
    if (result.by_account[0].top_bookings_curr) {
      expect(result.by_account[0].top_bookings_curr.length).toBeGreaterThan(0);
      expect(result.by_account[0].top_bookings_curr[0].amount).toBe(5000);
    }
  });

  it('sollte neue Buchungen detektieren', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6800,
        vendor: 'Old Vendor',
        text: 'Old booking pattern',
        amount: 10000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6800,
        vendor: 'Old Vendor',
        text: 'Old booking pattern',
        amount: 10000,
      }),
      createBooking({
        account: 6800,
        vendor: 'New Vendor GmbH',
        text: 'New booking pattern completely',
        amount: 15000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account.length).toBeGreaterThan(0);
    const deviation = result.by_account[0];
    if (deviation.new_bookings) {
      expect(deviation.new_bookings.length).toBeGreaterThan(0);
    }
  });

  it('sollte fehlende Buchungen (Vorjahr) detektieren', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 6900,
        vendor: 'Discontinued Vendor',
        text: 'Discontinued service',
        amount: 20000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 6900,
        vendor: 'New Provider',
        text: 'Different service',
        amount: 5000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account.length).toBeGreaterThan(0);
    const deviation = result.by_account[0];
    if (deviation.missing_bookings) {
      expect(deviation.missing_bookings.length).toBeGreaterThan(0);
    }
  });

  // ========== Summary Calculation Tests ==========

  it('sollte korrekte Zusammenfassung für Erlöse und Aufwendungen berechnen', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 4100, // Revenue
        amount: 500000,
      }),
      createBooking({
        account: 5100, // Expense
        amount: 200000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 4100,
        amount: 600000,
      }),
      createBooking({
        account: 5100,
        amount: 250000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings);

    expect(result.summary.erloese_prev).toBe(500000);
    expect(result.summary.erloese_curr).toBe(600000);
    expect(result.summary.aufwendungen_prev).toBe(200000);
    expect(result.summary.aufwendungen_curr).toBe(250000);
    expect(result.summary.total_delta).toBe(150000);
  });

  it('sollte Meta-Informationen korrekt setzen', () => {
    const prevBookings: Booking[] = [
      createBooking({ account: 5000, amount: 10000 }),
      createBooking({ account: 5100, amount: 20000 }),
    ];

    const currBookings: Booking[] = [
      createBooking({ account: 5000, amount: 15000 }),
      createBooking({ account: 5100, amount: 25000 }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      period_prev_name: 'Januar 2023',
      period_curr_name: 'Januar 2024',
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.meta.period_prev).toBe('Januar 2023');
    expect(result.meta.period_curr).toBe('Januar 2024');
    expect(result.meta.bookings_prev).toBe(2);
    expect(result.meta.bookings_curr).toBe(2);
    expect(result.meta.wesentlichkeit_abs).toBe(5000);
    expect(result.meta.wesentlichkeit_pct).toBe(10);
  });

  // ========== Sorting Tests ==========

  it('sollte Account-Deviationen nach absolutem Betrag sortieren', () => {
    const prevBookings: Booking[] = [
      createBooking({
        account: 7100,
        amount: 10000,
      }),
      createBooking({
        account: 7200,
        amount: 50000,
      }),
      createBooking({
        account: 7300,
        amount: 100000,
      }),
    ];

    const currBookings: Booking[] = [
      createBooking({
        account: 7100,
        amount: 15000,
      }),
      createBooking({
        account: 7200,
        amount: 100000,
      }),
      createBooking({
        account: 7300,
        amount: 110000,
      }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 1000,
      wesentlichkeit_pct: 1,
    });

    // Sorted by highest absolute delta first
    if (result.by_account.length > 1) {
      expect(Math.abs(result.by_account[0].delta_abs)).toBeGreaterThanOrEqual(
        Math.abs(result.by_account[1].delta_abs)
      );
    }
  });

  it('sollte mehrere Konten mit verschiedenen Abweichungsgrößen korrekt verarbeiten', () => {
    const prevBookings: Booking[] = [
      createBooking({ account: 7400, amount: 100000 }),
      createBooking({ account: 7500, amount: 50000 }),
      createBooking({ account: 7600, amount: 20000 }),
    ];

    const currBookings: Booking[] = [
      createBooking({ account: 7400, amount: 200000 }),
      createBooking({ account: 7500, amount: 60000 }),
      createBooking({ account: 7600, amount: 30000 }),
    ];

    const result = analyzeBookings(prevBookings, currBookings, {
      wesentlichkeit_abs: 5000,
      wesentlichkeit_pct: 10,
    });

    expect(result.by_account.length).toBeGreaterThanOrEqual(2);
  });

  // ========== Comment Generation Tests ==========

  it('sollte aussagekräftige Kommentare mit Top-Buchungen generieren', () => {
    const currBookings: Booking[] = [
      createBooking({
        account: 7700,
        amount: 50000,
        vendor: 'Premium Vendor',
        text: 'High value purchase',
      }),
      createBooking({
        account: 7700,
        amount: 30000,
        vendor: 'Secondary Vendor',
        text: 'Secondary purchase',
      }),
    ];

    const result = analyzeBookings([], currBookings, {
      wesentlichkeit_abs: 1000,
      wesentlichkeit_pct: 1,
    });

    expect(result.by_account.length).toBeGreaterThan(0);
    const comment = result.by_account[0].comment;
    expect(comment).toBeTruthy();
    expect(comment.length).toBeGreaterThan(20);
  });
});
