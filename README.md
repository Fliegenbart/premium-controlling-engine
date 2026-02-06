# Controlling Abweichungsanalyse

Automatische Analyse und Kommentierung von Buchungsdaten für das Controlling.

## Features

- 📊 **CSV-Upload**: Vorjahr und aktuelles Jahr hochladen
- 🔍 **Automatische Analyse**: Wesentliche Abweichungen identifizieren
- 💬 **KI-Kommentierung**: Lokale Kommentare via Ollama
- 📄 **Word-Export**: Professioneller Report als .docx
- 🔒 **Datenschutz**: Alle Daten bleiben lokal (On-Premise)

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

## KI-Kommentierung (Lokal)

Für lokale KI‑Kommentare:

1. [Ollama](https://ollama.ai) installieren
2. Modell laden: `ollama pull llama3.1`
3. Ollama starten: `ollama serve`

```typescript
// Beispiel für Ollama Integration
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama3.1:8b',
    prompt: prompt,
  }),
});
```

## Lizenz

Internes Tool für Ganzimmun / Premium Gruppe.
