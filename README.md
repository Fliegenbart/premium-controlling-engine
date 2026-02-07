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

## Security-Hinweise (Produktion)

- Demo-User sind in Produktion standardmäßig deaktiviert (`ENABLE_DEMO_USERS=false`).
- Für den ersten Admin-Account setze `ADMIN_BOOTSTRAP_EMAIL` und ein starkes `ADMIN_BOOTSTRAP_PASSWORD` (mind. 12 Zeichen).
- Die direkte SQL-API ist standardmäßig deaktiviert. Aktiviere sie nur bei Bedarf mit:
  - `QUERY_API_ENABLED=true`
  - `QUERY_API_TOKEN=<starker-token>`
- Dokumenten-Endpunkte können mit `DOCUMENT_ACCESS_TOKEN` geschützt werden.

## Staging/Dev Parallel Zu Prod (Hetzner, On-Demand)

Wenn die Prod-Instanz bereits genutzt wird, kannst du eine **separate Staging-Instanz** auf derselben Maschine starten (nur bei Bedarf).

- Staging läuft auf `127.0.0.1:3001` (Zugriff per SSH-Tunnel)
- Eigener Docker-Network/Container-Namen via `docker-compose.staging.yml`

Start (im Staging-Checkout):
```bash
./staging-up.sh
```

Tunnel von deinem Rechner:
```bash
ssh -L 3001:127.0.0.1:3001 root@<server-ip>
```

Stop:
```bash
./staging-down.sh
```

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
2. Modell laden: `ollama pull qwen2.5:14b`
3. Ollama starten: `ollama serve`

```typescript
// Beispiel für Ollama Integration
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'qwen2.5:14b',
    prompt: prompt,
  }),
});
```

## Lizenz

Open-Source Controlling-Tool für den deutschen Mittelstand.
