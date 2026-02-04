'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  Book,
  MessageSquare,
  Link2,
  Trash2,
  Brain,
} from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  title: string;
  totalPages: number;
  totalSections: number;
  indexedAt: string;
  sizeBytes: number;
}

interface Reference {
  documentId: string;
  documentTitle: string;
  nodeTitle: string;
  excerpt: string;
  path: string[];
  page?: number;
}

interface QueryResult {
  answer: string;
  confidence: number;
  references: Reference[];
}

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [question, setQuestion] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [expandedRefs, setExpandedRefs] = useState<number[]>([]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await loadDocuments();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Upload fehlgeschlagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!question.trim()) return;

    setIsQuerying(true);
    setQueryResult(null);

    try {
      const response = await fetch('/api/documents/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, useOllama: true }),
      });

      const data = await response.json();
      if (data.success) {
        setQueryResult({
          answer: data.answer,
          confidence: data.confidence,
          references: data.references,
        });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Anfrage fehlgeschlagen');
    } finally {
      setIsQuerying(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Book className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Document Intelligence</h2>
            <p className="text-gray-500 text-sm">PageIndex-Style RAG · Hierarchische Navigation</p>
          </div>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="hidden"
          />
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            PDF hochladen
          </div>
        </label>
      </div>

      {/* Document List */}
      <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Indexierte Dokumente ({documents.length})
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Noch keine Dokumente indexiert. Laden Sie ein PDF hoch.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-white font-medium">{doc.title}</p>
                    <p className="text-gray-500 text-xs">
                      {doc.totalPages} Seiten · {doc.totalSections} Abschnitte ·{' '}
                      {formatSize(doc.sizeBytes)}
                    </p>
                  </div>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(doc.indexedAt).toLocaleDateString('de-DE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Interface */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-500/30 p-6">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Dokumente befragen
          <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
            Lokal (Ollama)
          </span>
        </h3>

        <div className="flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="Stellen Sie eine Frage zu Ihren Dokumenten..."
            className="flex-1 px-4 py-3 bg-black/30 text-white rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying || !question.trim() || documents.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            {isQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            Fragen
          </button>
        </div>

        {documents.length === 0 && (
          <p className="text-yellow-400/70 text-sm mt-2">
            Bitte laden Sie zuerst ein Dokument hoch.
          </p>
        )}
      </div>

      {/* Query Result */}
      {queryResult && (
        <div className="space-y-4">
          {/* Confidence Badge */}
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                queryResult.confidence > 0.7
                  ? 'bg-green-500/20 text-green-400'
                  : queryResult.confidence > 0.4
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              Konfidenz: {(queryResult.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-gray-500 text-sm">
              {queryResult.references.length} Quellen gefunden
            </span>
          </div>

          {/* Answer */}
          <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
              {queryResult.answer}
            </p>
          </div>

          {/* References */}
          {queryResult.references.length > 0 && (
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-400" />
                Quellen (Evidence Links)
              </h4>
              <div className="space-y-2">
                {queryResult.references.map((ref, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() =>
                        setExpandedRefs(
                          expandedRefs.includes(i)
                            ? expandedRefs.filter((x) => x !== i)
                            : [...expandedRefs, i]
                        )
                      }
                    >
                      {expandedRefs.includes(i) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-blue-400 font-medium">{ref.documentTitle}</span>
                      <span className="text-gray-500">›</span>
                      <span className="text-gray-300">{ref.nodeTitle}</span>
                      {ref.page && (
                        <span className="text-gray-500 text-xs ml-auto">Seite {ref.page}</span>
                      )}
                    </div>

                    {expandedRefs.includes(i) && (
                      <div className="mt-2 pl-6">
                        <p className="text-gray-400 text-sm">{ref.excerpt}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          Pfad: {ref.path.join(' › ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
