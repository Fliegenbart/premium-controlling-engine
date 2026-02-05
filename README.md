# Controlling Abweichungsanalyse

Automatische Analyse und Kommentierung von Buchungsdaten für das Controlling.

## Features

- 📊 **CSV-Upload**: Vorjahr und aktuelles Jahr hochladen
- 🔍 **Automatische Analyse**: Wesentliche Abweichungen identifizieren
- 💬 **KI-Kommentierung** (optional): Mit Claude API intelligente Kommentare generieren
- 📄 **Word-Export**: Professioneller Report als .docx
- 🔒 **Datenschutz**: Alle Daten werden lokal im Browser verarbeitet

## Schnellstart

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Dann öffne [http://localhost:3000](http://localhost:3000).

## Deployment auf Vercel

1. Repository auf GitHub pushen
2. Auf [vercel.com](https://vercel.com) einloggen
3. "New Project" → GitHub Repository auswählen
4. Deploy klicken

## CSV-Format

Die CSV-Dateien müssen folgende Spalten enthalten:

| Spalte | Beschreibung |
|--------|--------------|
| `posting_date` | Buchungsdatum (YYYY-MM-DD) |
| `amount` | Betrag (positiv = Erlöse, negativ = Kosten) |
| `account` | Kontonummer |
| `account_name` | Kontobezeichnung |
| `cost_center` | Kostenstelle |
| `profit_center` | Profit Center |
| `vendor` | Lieferant (optional) |
| `customer` | Kunde (optional) |
| `document_no` | Belegnummer |
| `text` | Buchungstext |

## KI-Kommentierung

Ohne API Key werden regelbasierte Kommentare generiert. Für intelligentere Kommentare:

1. [Anthropic API Key](https://console.anthropic.com/) erstellen
2. In den Einstellungen eingeben (wird nicht gespeichert)

## On-Premise Deployment

Für den Betrieb ohne externe APIs:

1. [Ollama](https://ollama.ai) installieren
2. Modell laden: `ollama pull llama3.2`
3. API Route anpassen (siehe `/app/api/analyze/route.ts`)

```typescript
// Beispiel für Ollama Integration
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama3.2',
    prompt: prompt,
  }),
});
```

## Lizenz

Internes Tool für Ganzimmun / Premium Gruppe.
