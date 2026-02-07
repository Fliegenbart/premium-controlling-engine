# Demo/Test Dateien (Premium Controlling Engine)

Diese Dateien sind bewusst klein gehalten und eignen sich zum Durchklicken aller Hauptfunktionen.

## Buchungsdaten (CSV)
- `buchungen_vorjahr.csv` + `buchungen_aktuell.csv`
  - Einfaches generisches CSV (Semikolon).
- `plan_2025.csv`
  - Aggregierter Plan (Konto, Kontobezeichnung, Planbetrag) fuer "Plan vs. Ist vs. Vorjahr" (Dreifachvergleich).
- `datev_buchungsstapel_vorjahr_2023.csv` + `datev_buchungsstapel_aktuell_2024.csv`
  - DATEV-aehnlicher Export mit Soll/Haben-Kennzeichen.
- `sap_fbl3n_vorjahr_2023.csv` + `sap_fbl3n_aktuell_2024.csv`
  - SAP FBL3N-aehnlicher Export (YYYYMMDD, Betrag in Hauswaehrung).

Tipp: In der App ist "Magic Upload" standardmaessig aktiv und erkennt Formate automatisch.

## Dokumente (PDF)
Unter `docs/` liegen Beispiel-PDFs fuer die Dokumentensuche (Upload unter "Dokumente").

Vorschlaege zum Testen (Fragen in der Dokumentensuche):
- "Wie hoch ist die Kaltmiete?" (Mietvertrag)
- "Welche Indexklausel gilt?" (Mietvertrag)
- "Wie hoch ist die Nachzahlung und wann ist sie faellig?" (Stadtwerke)
- "Wie hoch ist die Jahreslizenz und die Kuendigungsfrist?" (LIS Vertrag)
- "Welche Mindestabnahme ist vereinbart?" (Rahmenvertrag Klinikum)

Hinweis: Die Dokumente werden im Speicher gehalten (kein dauerhafter Storage). Bei Container-Neustart muessen sie neu hochgeladen werden.
