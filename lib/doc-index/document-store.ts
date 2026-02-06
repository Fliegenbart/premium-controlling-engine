/**
 * Document Store: In-memory storage for indexed documents
 * For production, this could be backed by a database
 */

import { DocNode, IndexedDocument, DocumentMeta } from './types';
import { parsePDF } from './pdf-parser';

// In-memory store (in production, use database)
const documents = new Map<string, IndexedDocument>();

const DEFAULT_MAX_DOCS = 20;
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const MAX_DOCUMENTS = getNumberEnv('DOCUMENT_MAX_COUNT', DEFAULT_MAX_DOCS);
const DOCUMENT_TTL_MS = getNumberEnv('DOCUMENT_TTL_MS', DEFAULT_TTL_MS);

function getNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Index a new document from PDF buffer
 */
export async function indexDocument(
  buffer: Buffer,
  filename: string
): Promise<IndexedDocument> {
  const id = generateDocumentId();
  const now = new Date().toISOString();

  // Parse PDF into tree structure
  const tree = await parsePDF(buffer, filename);

  // Build indexes
  const nodeIndex = new Map<string, DocNode>();
  const pageIndex = new Map<number, string[]>();

  buildIndexes(tree, nodeIndex, pageIndex);

  const doc: IndexedDocument = {
    id,
    filename,
    title: tree.title,
    description: tree.summary,
    total_pages: tree.page_end,
    indexed_at: now,
    last_accessed_at: now,
    tree,
    node_index: nodeIndex,
    page_index: pageIndex,
  };

  documents.set(id, doc);
  pruneExpired();
  evictIfNeeded();

  return doc;
}

/**
 * Get document by ID
 */
export function getDocument(id: string): IndexedDocument | null {
  pruneExpired();
  const doc = documents.get(id);
  if (!doc) return null;
  if (isExpired(doc)) {
    documents.delete(id);
    return null;
  }
  touchDocument(doc);
  return doc;
}

/**
 * List all documents (metadata only)
 */
export function listDocuments(): DocumentMeta[] {
  pruneExpired();
  return Array.from(documents.values()).map(doc => ({
    id: doc.id,
    filename: doc.filename,
    title: doc.title,
    total_pages: doc.total_pages,
    indexed_at: doc.indexed_at,
    size_bytes: estimateDocumentSize(doc),
  }));
}

/**
 * Delete a document
 */
export function deleteDocument(id: string): boolean {
  return documents.delete(id);
}

/**
 * Get document tree structure (without full content)
 */
export function getDocumentTree(id: string): DocNode | null {
  const doc = getDocument(id);
  if (!doc) return null;

  // Return tree without full content (for UI display)
  return stripContent(doc.tree);
}

/**
 * Get specific node by ID
 */
export function getNode(documentId: string, nodeId: string): DocNode | null {
  const doc = getDocument(documentId);
  if (!doc) return null;

  return doc.node_index.get(nodeId) || null;
}

/**
 * Get nodes for a specific page
 */
export function getNodesForPage(documentId: string, page: number): DocNode[] {
  const doc = getDocument(documentId);
  if (!doc) return [];

  const nodeIds = doc.page_index.get(page) || [];
  return nodeIds.map(id => doc.node_index.get(id)).filter(Boolean) as DocNode[];
}

/**
 * Search across all documents (quick keyword search)
 */
export function searchAllDocuments(query: string): {
  documentId: string;
  documentTitle: string;
  node: DocNode;
  score: number;
}[] {
  pruneExpired();

  const results: {
    documentId: string;
    documentTitle: string;
    node: DocNode;
    score: number;
  }[] = [];

  const queryTerms = query.toLowerCase().split(/\s+/);

  for (const [docId, doc] of documents) {
    if (isExpired(doc)) {
      documents.delete(docId);
      continue;
    }
    const docResults = searchInTree(doc.tree, queryTerms);
    for (const { node, score } of docResults) {
      touchDocument(doc);
      results.push({
        documentId: docId,
        documentTitle: doc.title,
        node,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

// Helper functions

function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildIndexes(
  node: DocNode,
  nodeIndex: Map<string, DocNode>,
  pageIndex: Map<number, string[]>
): void {
  // Add to node index
  nodeIndex.set(node.id, node);

  // Add to page index
  for (let page = node.page_start; page <= node.page_end; page++) {
    const existing = pageIndex.get(page) || [];
    existing.push(node.id);
    pageIndex.set(page, existing);
  }

  // Recurse to children
  for (const child of node.children) {
    buildIndexes(child, nodeIndex, pageIndex);
  }
}

function stripContent(node: DocNode): DocNode {
  return {
    ...node,
    content: undefined, // Remove full content
    children: node.children.map(stripContent),
  };
}

function estimateDocumentSize(doc: IndexedDocument): number {
  // Rough estimate based on tree structure
  let size = 0;

  function countNode(node: DocNode) {
    size += (node.content?.length || 0) + (node.summary?.length || 0) + 200;
    for (const child of node.children) {
      countNode(child);
    }
  }

  countNode(doc.tree);
  return size;
}

function searchInTree(
  node: DocNode,
  queryTerms: string[]
): { node: DocNode; score: number }[] {
  const results: { node: DocNode; score: number }[] = [];

  function scoreNode(n: DocNode): number {
    let score = 0;
    const titleLower = n.title.toLowerCase();
    const contentLower = (n.content || '').toLowerCase();
    const summaryLower = (n.summary || '').toLowerCase();

    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 3;
      if (summaryLower.includes(term)) score += 2;
      if (contentLower.includes(term)) score += 1;
    }

    return score;
  }

  function traverse(n: DocNode) {
    const score = scoreNode(n);
    if (score > 0) {
      results.push({ node: n, score });
    }
    for (const child of n.children) {
      traverse(child);
    }
  }

  traverse(node);
  return results;
}

/**
 * Export store state (for persistence)
 */
export function exportStore(): string {
  const data: Record<string, any> = {};

  for (const [id, doc] of documents) {
    data[id] = {
      ...doc,
      node_index: Array.from(doc.node_index.entries()),
      page_index: Array.from(doc.page_index.entries()),
    };
  }

  return JSON.stringify(data);
}

function touchDocument(doc: IndexedDocument): void {
  doc.last_accessed_at = new Date().toISOString();
}

function isExpired(doc: IndexedDocument): boolean {
  if (DOCUMENT_TTL_MS <= 0) return false;
  const last = doc.last_accessed_at || doc.indexed_at;
  const ts = Date.parse(last);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > DOCUMENT_TTL_MS;
}

function pruneExpired(): void {
  if (DOCUMENT_TTL_MS <= 0) return;
  for (const [id, doc] of documents.entries()) {
    if (isExpired(doc)) {
      documents.delete(id);
    }
  }
}

function evictIfNeeded(): void {
  if (MAX_DOCUMENTS <= 0) return;
  if (documents.size <= MAX_DOCUMENTS) return;

  const entries = Array.from(documents.entries());
  entries.sort((a, b) => {
    const aTime = Date.parse(a[1].last_accessed_at || a[1].indexed_at);
    const bTime = Date.parse(b[1].last_accessed_at || b[1].indexed_at);
    return (aTime || 0) - (bTime || 0);
  });

  while (documents.size > MAX_DOCUMENTS && entries.length > 0) {
    const [id] = entries.shift()!;
    documents.delete(id);
  }
}

/**
 * Import store state (for persistence)
 */
export function importStore(json: string): void {
  const data = JSON.parse(json);

  for (const [id, doc] of Object.entries(data) as [string, any][]) {
    documents.set(id, {
      ...doc,
      node_index: new Map(doc.node_index),
      page_index: new Map(doc.page_index),
    });
  }
}
