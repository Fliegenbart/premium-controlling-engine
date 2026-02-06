import { describe, it, expect } from 'vitest';
import {
  bookingSchema,
  bookingsArraySchema,
  analyzeBookingsSchema,
  chatRequestSchema,
  summaryRequestSchema,
  anomalyRequestSchema,
  generateCommentSchema,
  documentQuerySchema,
  documentsSearchSchema,
  rootCauseRequestSchema,
  rootCauseBatchRequestSchema,
} from '../lib/validation';

describe('validation - Daten-Validierung', () => {
  // ========== Booking Schema Tests ==========

  describe('bookingSchema', () => {
    it('sollte gültige Buchung akzeptieren', () => {
      const validBooking = {
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200,
        account_name: 'Materialkosten',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: 'Lieferant GmbH',
        customer: null,
        document_no: 'DOC001',
        text: 'Materialeinkauf',
      };

      const result = bookingSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });

    it('sollte Buchung mit numerischem Datum als String coercen', () => {
      const booking = {
        posting_date: 20240115,
        amount: 1000,
        account: 5200,
        account_name: 'Materialkosten',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: 'Lieferant GmbH',
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(typeof result.data?.posting_date).toBe('string');
    });

    it('sollte String-Betrag zu Number coercen', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: '5000.50',
        account: 5200,
        account_name: 'Materialkosten',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: null,
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(typeof result.data?.amount).toBe('number');
    });

    it('sollte Konto-String zu Number coercen', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 1000,
        account: '5200',
        account_name: 'Materialkosten',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: null,
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(typeof result.data?.account).toBe('number');
    });

    it('sollte null Vendor und Customer akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200,
        account_name: 'Test',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: null,
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
    });

    it('sollte Buchung mit Defaults akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200,
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(result.data?.account_name).toBe('');
      expect(result.data?.cost_center).toBe('');
      expect(result.data?.vendor).toBeNull();
    });

    it('sollte fehlende posting_date mit coerce handhaben', () => {
      const booking = {
        amount: 1000,
        account: 5200,
        account_name: 'Test',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: null,
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
        // posting_date is missing
      };

      const result = bookingSchema.safeParse(booking);
      // coerce string() will use undefined coercion
      expect(result.success).toBe(true);
      expect(result.data?.posting_date).toBeDefined();
    });

    it('sollte leere posting_date ablehnen', () => {
      const booking = {
        posting_date: '',
        amount: 1000,
        account: 5200,
        account_name: 'Test',
        cost_center: 'CC100',
        profit_center: 'PC100',
        vendor: null,
        customer: null,
        document_no: 'DOC001',
        text: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(false);
    });

    it('sollte fehlende amount ablehnen', () => {
      const booking = {
        posting_date: '2024-01-15',
        account: 5200,
        account_name: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(false);
    });

    it('sollte negative Beträge akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: -5000,
        account: 5200,
        account_name: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(-5000);
    });

    it('sollte sehr große Beträge akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 999999999999,
        account: 5200,
        account_name: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
    });

    it('sollte Dezimalzahlen für Betrag akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 1234.56,
        account: 5200,
        account_name: 'Test',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(1234.56);
    });

    it('sollte optionale entity akzeptieren', () => {
      const booking = {
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200,
        account_name: 'Test',
        entity: 'Entity A',
      };

      const result = bookingSchema.safeParse(booking);
      expect(result.success).toBe(true);
      expect(result.data?.entity).toBe('Entity A');
    });
  });

  // ========== Bookings Array Schema Tests ==========

  describe('bookingsArraySchema', () => {
    it('sollte Array mit einer Buchung akzeptieren', () => {
      const bookings = [
        {
          posting_date: '2024-01-15',
          amount: 1000,
          account: 5200,
          account_name: 'Test',
        },
      ];

      const result = bookingsArraySchema.safeParse(bookings);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('sollte Array mit vielen Buchungen akzeptieren', () => {
      const bookings = Array.from({ length: 1000 }, (_, i) => ({
        posting_date: '2024-01-15',
        amount: 1000 + i,
        account: 5200,
        account_name: 'Test',
      }));

      const result = bookingsArraySchema.safeParse(bookings);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
    });

    it('sollte leeres Array ablehnen', () => {
      const result = bookingsArraySchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('sollte Array mit 200000 Elementen akzeptieren', () => {
      const bookings = Array.from({ length: 200000 }, (_, i) => ({
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200 + (i % 100),
      }));

      const result = bookingsArraySchema.safeParse(bookings);
      expect(result.success).toBe(true);
    });

    it('sollte Array mit >200000 Elementen ablehnen', () => {
      const bookings = Array.from({ length: 200001 }, (_, i) => ({
        posting_date: '2024-01-15',
        amount: 1000,
        account: 5200 + (i % 100),
      }));

      const result = bookingsArraySchema.safeParse(bookings);
      expect(result.success).toBe(false);
    });
  });

  // ========== Analyze Bookings Schema Tests ==========

  describe('analyzeBookingsSchema', () => {
    it('sollte valides Analyse-Request akzeptieren', () => {
      const request = {
        prevBookings: [
          {
            posting_date: '2023-01-15',
            amount: 1000,
            account: 5200,
          },
        ],
        currBookings: [
          {
            posting_date: '2024-01-15',
            amount: 1500,
            account: 5200,
          },
        ],
      };

      const result = analyzeBookingsSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte fehlende prevBookings ablehnen', () => {
      const request = {
        currBookings: [
          {
            posting_date: '2024-01-15',
            amount: 1500,
            account: 5200,
          },
        ],
      };

      const result = analyzeBookingsSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte leeres currBookings-Array ablehnen', () => {
      const request = {
        prevBookings: [
          {
            posting_date: '2023-01-15',
            amount: 1000,
            account: 5200,
          },
        ],
        currBookings: [],
      };

      const result = analyzeBookingsSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  // ========== Chat Request Schema Tests ==========

  describe('chatRequestSchema', () => {
    it('sollte gültiges Chat-Request akzeptieren', () => {
      const request = {
        message: 'Warum sind die Kosten gestiegen?',
        context: { account: 5200 },
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte leere message ablehnen', () => {
      const request = {
        message: '',
        context: {},
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte fehlende message ablehnen', () => {
      const request = {
        context: {},
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte message mit 2000 Zeichen akzeptieren', () => {
      const message = 'a'.repeat(2000);
      const request = {
        message,
        context: {},
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte message mit >2000 Zeichen ablehnen', () => {
      const message = 'a'.repeat(2001);
      const request = {
        message,
        context: {},
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte optionale history akzeptieren', () => {
      const request = {
        message: 'Test',
        context: {},
        history: [
          {
            role: 'user' as const,
            content: 'Frage 1',
          },
          {
            role: 'assistant' as const,
            content: 'Antwort 1',
          },
        ],
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte history mit maximal 20 Einträgen akzeptieren', () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Eintrag ${i}`,
      }));

      const request = {
        message: 'Test',
        context: {},
        history,
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte history mit >20 Einträgen ablehnen', () => {
      const history = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `Eintrag ${i}`,
      }));

      const request = {
        message: 'Test',
        context: {},
        history,
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte ungültige role ablehnen', () => {
      const request = {
        message: 'Test',
        context: {},
        history: [
          {
            role: 'admin',
            content: 'Test',
          },
        ],
      };

      const result = chatRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  // ========== Summary Request Schema Tests ==========

  describe('summaryRequestSchema', () => {
    it('sollte gültiges Summary-Request akzeptieren', () => {
      const request = {
        analysisResult: { by_account: [] },
      };

      const result = summaryRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte optionale entityName akzeptieren', () => {
      const request = {
        analysisResult: {},
        entityName: 'Filiale Berlin',
      };

      const result = summaryRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte entityName mit maximal 200 Zeichen akzeptieren', () => {
      const request = {
        analysisResult: {},
        entityName: 'a'.repeat(200),
      };

      const result = summaryRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte entityName mit >200 Zeichen ablehnen', () => {
      const request = {
        analysisResult: {},
        entityName: 'a'.repeat(201),
      };

      const result = summaryRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  // ========== Anomaly Request Schema Tests ==========

  describe('anomalyRequestSchema', () => {
    it('sollte gültiges Anomalien-Request mit Deviationen akzeptieren', () => {
      const request = {
        deviations: [
          { account: 5200, delta_pct: 150 },
        ],
      };

      const result = anomalyRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte leeres deviations-Array ablehnen', () => {
      const request = {
        deviations: [],
      };

      const result = anomalyRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte optionale context akzeptieren', () => {
      const request = {
        deviations: [{ account: 5200 }],
        context: { period: '2024-01' },
      };

      const result = anomalyRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  // ========== Generate Comment Schema Tests ==========

  describe('generateCommentSchema', () => {
    it('sollte gültiges Comment-Request akzeptieren', () => {
      const request = {
        deviation: {
          account: 5200,
          delta_abs: 50000,
          delta_pct: 50,
        },
      };

      const result = generateCommentSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte fehlende deviation mit unknown akzeptieren', () => {
      const request = {};

      const result = generateCommentSchema.safeParse(request);
      // z.unknown() accepts anything including missing values
      expect(result.success).toBe(true);
    });
  });

  // ========== Document Query Schema Tests ==========

  describe('documentQuerySchema', () => {
    it('sollte gültiges Document-Query akzeptieren', () => {
      const request = {
        query: 'Welche Rechnungen gibt es für Mai?',
      };

      const result = documentQuerySchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte leere query ablehnen', () => {
      const request = {
        query: '',
      };

      const result = documentQuerySchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte optionales quick-Flag akzeptieren', () => {
      const request = {
        query: 'Test',
        quick: true,
      };

      const result = documentQuerySchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  // ========== Documents Search Schema Tests ==========

  describe('documentsSearchSchema', () => {
    it('sollte gültiges Search-Request akzeptieren', () => {
      const request = {
        question: 'Gibt es Rechnungen für den Partner XYZ?',
      };

      const result = documentsSearchSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte optionales limit akzeptieren', () => {
      const request = {
        question: 'Test',
        limit: 10,
      };

      const result = documentsSearchSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte limit von maximal 50 akzeptieren', () => {
      const request = {
        question: 'Test',
        limit: 50,
      };

      const result = documentsSearchSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte limit >50 ablehnen', () => {
      const request = {
        question: 'Test',
        limit: 51,
      };

      const result = documentsSearchSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte String-Limit zu Number coercen', () => {
      const request = {
        question: 'Test',
        limit: '20',
      };

      const result = documentsSearchSchema.safeParse(request);
      expect(result.success).toBe(true);
      expect(typeof result.data?.limit).toBe('number');
    });
  });

  // ========== Root Cause Request Schema Tests ==========

  describe('rootCauseRequestSchema', () => {
    it('sollte gültiges Root-Cause-Request akzeptieren', () => {
      const request = {
        account: 5200,
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte optionales includeLLMNarrative akzeptieren', () => {
      const request = {
        account: 5200,
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
        includeLLMNarrative: true,
      };

      const result = rootCauseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte negative account ablehnen', () => {
      const request = {
        account: -5200,
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  // ========== Root Cause Batch Request Schema Tests ==========

  describe('rootCauseBatchRequestSchema', () => {
    it('sollte gültiges Batch-Root-Cause-Request akzeptieren', () => {
      const request = {
        accounts: [5200, 5300, 5400],
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseBatchRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte maximal 50 Konten akzeptieren', () => {
      const accounts = Array.from({ length: 50 }, (_, i) => 5200 + i);
      const request = {
        accounts,
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseBatchRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('sollte >50 Konten ablehnen', () => {
      const accounts = Array.from({ length: 51 }, (_, i) => 5200 + i);
      const request = {
        accounts,
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseBatchRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte leeres accounts-Array ablehnen', () => {
      const request = {
        accounts: [],
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseBatchRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('sollte String-Konten zu Numbers coercen', () => {
      const request = {
        accounts: ['5200', '5300', '5400'],
        prevBookings: [{ posting_date: '2023-01-15', amount: 1000, account: 5200 }],
        currBookings: [{ posting_date: '2024-01-15', amount: 1500, account: 5200 }],
      };

      const result = rootCauseBatchRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      expect(result.data?.accounts[0]).toBe(5200);
    });
  });
});
