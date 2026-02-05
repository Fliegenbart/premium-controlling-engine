import { AccountDeviation } from './types';

export interface AnomalyHint {
  hint: string;
  type: 'seasonal' | 'outlier' | 'trend_break' | 'unusual_single';
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Rule-based anomaly detection as fallback when no API key is available
 */
export function detectBasicAnomalies(deviation: AccountDeviation): AnomalyHint | null {
  const absPct = Math.abs(deviation.delta_pct);

  // Critical: Very high percentage change (>100%)
  if (absPct > 100) {
    return {
      hint: 'Extrem hohe Abweichung von über 100%',
      type: 'outlier',
      severity: 'critical',
    };
  }

  // Warning: High percentage change (>50%)
  if (absPct > 50) {
    return {
      hint: 'Ungewöhnlich hohe Abweichung von über 50%',
      type: 'outlier',
      severity: 'warning',
    };
  }

  // Check for single large booking dominating the change
  if (deviation.top_bookings && deviation.top_bookings.length > 0) {
    const topBooking = deviation.top_bookings[0];
    const contribution = Math.abs(topBooking.amount) / Math.abs(deviation.delta_abs);

    if (contribution > 0.8 && Math.abs(deviation.delta_abs) > 10000) {
      return {
        hint: 'Einzelbuchung dominiert (>80% der Abweichung)',
        type: 'unusual_single',
        severity: 'warning',
      };
    }

    if (contribution > 0.6 && Math.abs(deviation.delta_abs) > 5000) {
      return {
        hint: 'Große Einzelbuchung beeinflusst Ergebnis',
        type: 'unusual_single',
        severity: 'info',
      };
    }
  }

  // Info: New account (previous was 0 or very small)
  if (Math.abs(deviation.amount_prev) < 100 && Math.abs(deviation.amount_curr) > 5000) {
    return {
      hint: 'Neue Kostenposition - im Vorjahr nicht vorhanden',
      type: 'trend_break',
      severity: 'info',
    };
  }

  // Info: Account closed (current is 0 or very small)
  if (Math.abs(deviation.amount_curr) < 100 && Math.abs(deviation.amount_prev) > 5000) {
    return {
      hint: 'Kostenposition entfallen - in aktuellem Zeitraum nicht vorhanden',
      type: 'trend_break',
      severity: 'info',
    };
  }

  return null;
}

/**
 * Apply rule-based anomaly detection to all deviations
 */
export function enrichWithBasicAnomalies(
  deviations: AccountDeviation[]
): AccountDeviation[] {
  return deviations.map((dev) => {
    const anomaly = detectBasicAnomalies(dev);
    if (anomaly) {
      return {
        ...dev,
        anomalyHint: anomaly.hint,
        anomalyType: anomaly.type,
        anomalySeverity: anomaly.severity,
      };
    }
    return dev;
  });
}
