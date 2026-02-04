# 🏦 Premium Controlling Engine

> Enterprise-grade variance analysis powered by DuckDB and local AI (Ollama)
> **100% offline capable - no API keys required**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![DuckDB](https://img.shields.io/badge/DuckDB-powered-yellow)
![AI](https://img.shields.io/badge/AI-Local%20(Ollama)-green)
![License](https://img.shields.io/badge/license-proprietary-red)

## 🎯 Features

### 100% Local Operation
- **No API keys needed** - runs completely offline
- **Ollama Integration** - local LLM with Qwen 2.5 (best for German)
- **Data stays on-premise** - perfect for sensitive financial data
- **Optional cloud mode** - add Anthropic API key for Claude if desired

### Data Layer (DuckDB + Parquet)
- **SQL-based Analytics**: Real database queries instead of in-memory JavaScript
- **Automatic Schema Inference**: Detects SAP FBL3N, FAGLL03, DATEV, and generic CSV
- **Data Profiling**: Null checks, duplicate detection, outlier analysis, sum verification
- **Parquet Export**: Persistent columnar storage with ZSTD compression

### AI Analysis (Local LLM)
- **"Beweis zuerst" Pattern**: Every statement backed by query results
- **Variance Decomposition**: Driver trees showing what caused the change
- **SKR03 Knowledge Base**: German accounting context for intelligent analysis
- **Red Flag Detection**: Automatic anomaly detection with severity levels

### Professional UI
- **Dark Mode Dashboard**: Modern, professional interface
- **SQL Console**: Direct DuckDB access for power users
- **Interactive Charts**: Recharts-powered visualizations
- **Evidence Trail**: Full transparency on AI reasoning

## 🚀 Quick Start

### Local Development

```bash
# 1. Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Pull the recommended model (one-time, ~8GB download)
ollama pull qwen2.5:14b

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# Open http://localhost:3000
```

### Production Deployment (Hetzner GEX44)

```bash
# 1. Copy files to server
scp -r . root@your-server:/opt/controlling-engine/

# 2. SSH into server
ssh root@your-server

# 3. Initial setup (run once)
cd /opt/controlling-engine
chmod +x deploy.sh
./deploy.sh setup

# 4. Deploy (automatically downloads Ollama + model)
./deploy.sh deploy

# That's it! No API keys needed.
# Open http://your-server:3000
```

### Recommended Local Models

| Model | RAM Required | Speed | Quality | Best For |
|-------|-------------|-------|---------|----------|
| `qwen2.5:7b` | 8GB | ⚡⚡⚡ | ★★★☆ | Quick analysis |
| `qwen2.5:14b` | 16GB | ⚡⚡ | ★★★★ | **Recommended** |
| `qwen2.5:32b` | 32GB | ⚡ | ★★★★★ | Deep analysis |
| `llama3.1:8b` | 8GB | ⚡⚡⚡ | ★★★☆ | Alternative |

To change model:
```bash
# Pull new model
ollama pull qwen2.5:32b

# Set in .env
OLLAMA_MODEL=qwen2.5:32b
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Upload    │  │  Variance   │  │     SQL     │  │  Agent  │ │
│  │    Zone     │  │   Charts    │  │   Console   │  │   Chat  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Routes                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ /api/upload │  │/api/analyze │  │ /api/query  │  │/api/agent│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    DuckDB     │   │   Knowledge   │   │   AI Agent    │
│    Engine     │   │     Base      │   │  (Claude)     │
│               │   │               │   │               │
│  • SQL Query  │   │  • SKR03      │   │  • Tools:     │
│  • Profiling  │   │  • Benchmarks │   │    - sql_query│
│  • Variance   │   │  • Red Flags  │   │    - variance │
│  • Export     │   │               │   │    - profile  │
└───────────────┘   └───────────────┘   └───────────────┘
        │
        ▼
┌───────────────┐
│   Parquet     │
│   Storage     │
│ (persistent)  │
└───────────────┘
```

## 🔧 API Reference

### POST /api/upload
Upload booking data (CSV, XLSX, SAP export)

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@buchungen_2024.xlsx" \
  -F "period=curr"
```

### POST /api/analyze
Run variance analysis

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"includeDrivers": true, "includeAI": false}'
```

### POST /api/query
Execute SQL query

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT account, SUM(amount) FROM controlling.bookings_curr GROUP BY account"}'
```

### POST /api/agent
Ask the AI agent

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"question": "Warum sind die Personalkosten gestiegen?", "apiKey": "sk-ant-..."}'
```

## 📁 Supported File Formats

| Format | Detection | Columns |
|--------|-----------|---------|
| SAP FBL3N | "Betrag in Hauswährung" | Account, Amount, Cost Center, Vendor |
| SAP FAGLL03 | "Sachkontobezeichnung" | Account, Amount, Profit Center |
| DATEV | "Umsatz (ohne Soll/Haben-Kz)" | Konto, Betrag, Kost1 |
| Generic CSV | Fallback | Auto-detected |

## 🎨 Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### SQL Console
![SQL Console](docs/screenshots/sql-console.png)

### AI Agent
![AI Agent](docs/screenshots/agent.png)

## 🔒 Security

- Non-root Docker user
- API key validation
- SQL injection prevention (no DROP/DELETE/TRUNCATE)
- Rate limiting ready
- Traefik SSL integration

## 📈 Performance

Tested on Hetzner GEX44 (AMD Ryzen, 64GB RAM):

| Operation | 10k Bookings | 100k Bookings | 1M Bookings |
|-----------|-------------|---------------|-------------|
| Upload | 0.3s | 2.1s | 18s |
| Variance Analysis | 0.1s | 0.8s | 6s |
| SQL Query | <50ms | <200ms | <2s |
| AI Analysis | ~3s | ~5s | ~10s |

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, TypeScript
- **Database**: DuckDB (in-process OLAP)
- **AI**: Anthropic Claude (tool-calling)
- **Storage**: Parquet (ZSTD compression)
- **Deployment**: Docker, Traefik

## 📝 License

Proprietary - Premium Gruppe

---

Built with ❤️ by Premium Controlling Team
