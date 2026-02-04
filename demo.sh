#!/bin/bash
# Premium Controlling Engine - Quick Demo
# 100% Local - No API keys needed!

set -e

echo "🚀 Premium Controlling Engine - Quick Demo"
echo "==========================================="
echo "   100% Lokal - Kein API-Key nötig!"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ required, found $(node -v)"
    exit 1
fi

echo "✓ Node.js $(node -v) found"

# Check Ollama
if command -v ollama &> /dev/null; then
    echo "✓ Ollama found"
    
    # Check if model is available
    if ollama list 2>/dev/null | grep -q "qwen2.5"; then
        echo "✓ Qwen 2.5 model found"
    else
        echo ""
        echo "📥 Downloading recommended model (qwen2.5:14b)..."
        echo "   This may take a few minutes (~8GB)..."
        ollama pull qwen2.5:14b
    fi
    
    # Start Ollama if not running
    if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
        echo ""
        echo "🔄 Starting Ollama..."
        ollama serve &>/dev/null &
        sleep 3
    fi
    echo "✓ Ollama running on localhost:11434"
else
    echo ""
    echo "⚠️  Ollama not found!"
    echo "   Install with: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "   Then run: ollama pull qwen2.5:14b"
    echo ""
    echo "   The app will still work, but AI features need Ollama."
    echo ""
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🔧 Starting development server..."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                                                                "
echo "  🌐 Open http://localhost:3000 in your browser                "
echo "                                                                "
echo "  📁 Demo data available in ./demo-data/                       "
echo "     • buchungen_vorjahr.csv  (Vorjahr)                        "
echo "     • buchungen_aktuell.csv  (Aktuelles Jahr)                 "
echo "                                                                "
echo "  🎯 Quick Guide:                                               "
echo "     1. Upload 'buchungen_vorjahr.csv' as Vorjahr              "
echo "     2. Upload 'buchungen_aktuell.csv' as Aktuell              "
echo "     3. Click 'Varianz-Analyse starten'                        "
echo "     4. Try SQL Console with custom queries                    "
echo "     5. Ask the AI Agent (runs locally with Ollama!)           "
echo "                                                                "
echo "  🤖 AI Mode: LOKAL (Ollama) - Kein API-Key nötig!             "
echo "                                                                "
echo "════════════════════════════════════════════════════════════════"
echo ""

npm run dev
