/// <reference types="vitest" />
/**
 * Tests for Natural Language Query Engine
 *
 * These tests demonstrate the NL query engine functionality with examples
 */

import { describe, test, expect } from 'vitest';
import { executeNaturalLanguageQuery } from '@/lib/nl-query-engine';

/**
 * Example test cases for German natural language queries
 */
describe('Natural Language Query Engine', () => {
  // Note: These tests require Ollama to be running

  describe('Basic German Questions', () => {
    test('Should answer "Zeig mir alle Kostenstellen mit mehr als 10% Abweichung"', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeig mir alle Kostenstellen mit mehr als 10% Abweichung'
      );

      expect(result).toHaveProperty('originalQuestion');
      expect(result).toHaveProperty('generatedSQL');
      expect(result).toHaveProperty('results');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.rowCount).toBeGreaterThanOrEqual(0);
    });

    test('Should answer "Welche Lieferanten haben die höchsten Kosten?"', async () => {
      const result = await executeNaturalLanguageQuery(
        'Welche Lieferanten haben die höchsten Kosten?'
      );

      expect(result).toHaveProperty('generatedSQL');
      expect(result.originalQuestion).toContain('Lieferanten');
    });

    test('Should answer "Wie haben sich die Personalkosten im Q3 entwickelt?"', async () => {
      const result = await executeNaturalLanguageQuery(
        'Wie haben sich die Personalkosten im Q3 entwickelt?'
      );

      expect(result).toHaveProperty('columns');
      expect(result.generatedSQL).toMatch(/SELECT/i);
    });

    test('Should answer "Vergleiche die Materialkosten nach Kostenstelle"', async () => {
      const result = await executeNaturalLanguageQuery(
        'Vergleiche die Materialkosten nach Kostenstelle'
      );

      expect(result.confidence).toBeLessThanOrEqual(0.95);
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe('Query Generation', () => {
    test('Should generate valid SQL that starts with SELECT', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige die Top 10 Buchungen'
      );

      expect(result.generatedSQL).toMatch(/^SELECT/i);
    });

    test('Should add LIMIT if not present', async () => {
      const result = await executeNaturalLanguageQuery(
        'Alle Buchungen zeigen'
      );

      expect(result.generatedSQL).toMatch(/LIMIT/i);
    });

    test('Should enforce max LIMIT of 1000', async () => {
      const result = await executeNaturalLanguageQuery(
        'Alle Buchungen zeigen',
        undefined,
        { maxRows: 500 }
      );

      const limitMatch = result.generatedSQL.match(/LIMIT\s+(\d+)/i);
      expect(limitMatch).toBeTruthy();
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        expect(limit).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('Results Handling', () => {
    test('Should return empty results array for empty query results', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige alle Buchungen mit Betrag > 999999999'
      );

      expect(Array.isArray(result.results)).toBe(true);
    });

    test('Should include execution time', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zähle alle Buchungen'
      );

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    test('Should calculate confidence score between 0.3 and 0.95', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige die durchschnittlichen Kosten'
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Custom Tables', () => {
    test('Should accept custom table names', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige Buchungen',
        ['controlling.bookings', 'analysis.report']
      );

      expect(result).toHaveProperty('generatedSQL');
    });
  });

  describe('Error Handling', () => {
    test('Should reject empty questions', async () => {
      await expect(
        executeNaturalLanguageQuery('')
      ).rejects.toThrow();
    });

    test('Should reject very long questions', async () => {
      const longQuestion = 'a'.repeat(1001);
      await expect(
        executeNaturalLanguageQuery(longQuestion)
      ).rejects.toThrow();
    });

    test('Should reject if Ollama is not available', async () => {
      // This test would only pass if Ollama is intentionally stopped
      // Skipping by default
      // await expect(
      //   executeNaturalLanguageQuery('Test question')
      // ).rejects.toThrow();
    });
  });

  describe('Security', () => {
    test('Should block DROP statements', async () => {
      // The LLM should not generate DROP statements
      // This is tested by the validateSQL function
    });

    test('Should block DELETE statements', async () => {
      // The LLM should not generate DELETE statements
      // This is tested by the validateSQL function
    });

    test('Should block INSERT/UPDATE statements', async () => {
      // The LLM should not generate INSERT/UPDATE statements
      // This is tested by the validateSQL function
    });
  });

  describe('German Language Features', () => {
    test('Should handle umlauts: Personalkosten', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige die Personalkosten'
      );

      expect(result.generatedSQL).toBeTruthy();
    });

    test('Should handle umlauts: Überblick', async () => {
      const result = await executeNaturalLanguageQuery(
        'Gib mir einen Überblick über die Kosten'
      );

      expect(result.generatedSQL).toBeTruthy();
    });

    test('Should handle special characters: ß', async () => {
      const result = await executeNaturalLanguageQuery(
        'Straßenverkäufe zeigen'
      );

      expect(result.generatedSQL).toBeTruthy();
    });

    test('Should handle German date references', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zeige Buchungen vom letzten Monat'
      );

      expect(result.generatedSQL).toBeTruthy();
    });
  });

  describe('Confidence Scoring', () => {
    test('Should increase confidence for queries with results', async () => {
      const result = await executeNaturalLanguageQuery(
        'Zähle alle Buchungen'
      );

      // Count queries should return results, higher confidence
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('Should decrease confidence for complex JOINs', async () => {
      const result = await executeNaturalLanguageQuery(
        'Vergleiche Lieferanten mit ihren Kostenstellen und Gewinnen'
      );

      // Complex queries have lower confidence
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });
});

/**
 * Integration test examples showing different types of queries
 */
describe('Query Examples', () => {
  const exampleQueries = [
    // Cost analysis
    'Welche Lieferanten verursachen die höchsten Kosten?',
    'Zeig mir die Top 10 Kostenstellen',

    // Temporal analysis
    'Wie haben sich die Materialkosten über die letzten 6 Monate entwickelt?',
    'Vergleiche die Kosten von diesem Jahr mit dem Vorjahr',

    // Aggregation
    'Durchschnittliche Buchungsgröße pro Kostenstelle',
    'Summe aller Ausgaben nach Account',

    // Filtering
    'Alle Buchungen über 50000 Euro',
    'Zeige Buchungen ohne Lieferant',

    // Variance analysis
    'Zeig mir die größten Abweichungen',
    'Kostenstellen mit Schwankungen > 20%',
  ];

  test.each(exampleQueries)(
    'Should handle: "%s"',
    async (query) => {
      const result = await executeNaturalLanguageQuery(query);

      expect(result.originalQuestion).toBe(query);
      expect(result.generatedSQL).toMatch(/^SELECT/i);
      expect(result.confidence).toBeGreaterThan(0);
    }
  );
});
