'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  Trash2,
  MessageSquare,
  BookOpen,
  FileSearch,
  Sparkles,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface DocumentMeta {
  id: string;
  filename: string;
  title: string;
  total_pages: number;
  indexed_at: string;
  sections?: { title: string; pages: string }[];
}

interface DocNode {
  id: string;
  type: string;
  title: string;
  summary?: string;
  page_start: number;
  page_end: number;
  children: DocNode[];
}

interface Reference {
  title: string;
  page: number;
  section_path: string[];
  excerpt: string;
}

interface ReasoningStep {
  step: number;
  action: string;
  thought: string;
  result?: string;
}

interface QueryResult {
  query: string;
  answer: string;
  confidence: number;
  references: Reference[];
  reasoning_trace: ReasoningStep[];
}

interface DocumentsPanelProps {
  apiKey: string | null;
}

export function DocumentsPanel({ apiKey }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentMeta | null>(null);
  const [docTree, setDocTree] = useState<DocNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      // Reload documents list
      await loadDocuments();

      // Select the new document
      setSelectedDoc(data.document);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      handleUpload(file);
    }
  };

  const selectDocument = async (doc: DocumentMeta) => {
    setSelectedDoc(doc);
    setIsLoading(true);
    setQueryResult(null);

    try {
      const response = await fetch(`/api/documents/${doc.id}`);
      const data = await response.json();
      setDocTree(data.tree);
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      await loadDocuments();
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setDocTree(null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleQuery = async () => {
    if (!selectedDoc || !query.trim()) return;

    setIsQuerying(true);
    setQueryResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${selectedDoc.id}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Suche fehlgeschlagen');
      }

      setQueryResult(data);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          Dokumente (Intelligent Search)
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          PageIndex-Style Reasoning
        </div>
      </div>

      <div className="grid md:grid-cols-3 divide-x divide-white/10">
        {/* Left: Document List */}
        <div className="p-4 space-y-4">
          {/* Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
          >
            <label className="cursor-pointer block text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-sm text-gray-400">Indexiere...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-500" />
                  <span className="text-sm text-gray-400">PDF hochladen</span>
                </div>
              )}
            </label>
          </div>

          {/* Document List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Indexierte Dokumente</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Noch keine Dokumente
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => selectDocument(doc)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'bg-purple-500/20 border border-purple-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.total_pages} Seiten • {doc.filename}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Middle: Document Structure */}
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Dokumentstruktur</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : docTree ? (
            <div className="space-y-1">
              <TreeNode node={docTree} depth={0} />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Dokument auswählen</p>
            </div>
          )}
        </div>

        {/* Right: Query Interface */}
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Intelligente Suche</h3>

          {/* Query Input */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                placeholder="Frage zum Dokument stellen..."
                disabled={!selectedDoc || isQuerying}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                onClick={handleQuery}
                disabled={!selectedDoc || !query.trim() || isQuerying}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                {isQuerying ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Example Questions */}
            {selectedDoc && !queryResult && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Beispielfragen:</p>
                {[
                  'Was sind die wichtigsten Kennzahlen?',
                  'Wie hat sich der Umsatz entwickelt?',
                  'Was steht im Lagebericht zu Risiken?',
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(q)}
                    className="block w-full text-left text-xs text-purple-400 hover:text-purple-300 py-1"
                  >
                    → {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Query Result */}
          {queryResult && (
            <div className="space-y-4">
              {/* Answer */}
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Antwort</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    queryResult.confidence > 0.8
                      ? 'bg-green-500/20 text-green-400'
                      : queryResult.confidence > 0.6
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {(queryResult.confidence * 100).toFixed(0)}% Konfidenz
                  </span>
                </div>
                <p className="text-white text-sm whitespace-pre-wrap">
                  {queryResult.answer}
                </p>
              </div>

              {/* References */}
              {queryResult.references.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-400">Referenzen</h4>
                  {queryResult.references.map((ref, i) => (
                    <div
                      key={i}
                      className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-white font-medium">
                          {ref.title}
                        </span>
                        <span className="text-xs text-purple-400">
                          Seite {ref.page}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {ref.section_path.join(' → ')}
                      </p>
                      {ref.excerpt && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          "{ref.excerpt.substring(0, 150)}..."
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reasoning Trace Toggle */}
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                {showReasoning ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Reasoning-Schritte anzeigen
              </button>

              {showReasoning && queryResult.reasoning_trace && (
                <div className="space-y-2 pl-3 border-l-2 border-purple-500/30">
                  {queryResult.reasoning_trace.map((step, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-purple-400">Schritt {step.step}:</span>
                      <span className="text-gray-400 ml-2">{step.thought}</span>
                      {step.result && (
                        <span className="text-gray-500 block ml-4">→ {step.result}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tree Node Component
function TreeNode({ node, depth }: { node: DocNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-center gap-1 py-1 px-2 rounded hover:bg-white/5 ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )
        ) : (
          <span className="w-3" />
        )}
        <span className="text-xs text-gray-400 mr-2">
          S.{node.page_start}
        </span>
        <span className={`text-sm ${depth === 0 ? 'text-white font-medium' : 'text-gray-300'}`}>
          {node.title}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={child.id || i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
