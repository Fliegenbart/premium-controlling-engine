/**
 * Document Store - In-memory storage for indexed documents
 *
 * Provides CRUD operations and search capabilities
 */

import { IndexedDocument, DocNode, SearchResult } from './types';
import { searchTree, getNodePath, findNodeById } from './pdf-parser';

// In-memory document store (singleton)
const documents: Map<string, IndexedDocument> = new Map();

/**
 * Add document to store
 */
export function addDocument(doc: IndexedDocument): void {
  documents.set(doc.id, doc);
}

/**
 * Get document by ID
 */
export function getDocument(id: string): IndexedDocument | null {
  return documents.get(id) || null;
}

/**
 * Get all documents
 */
export function getAllDocuments(): IndexedDocument[] {
  return Array.from(documents.values());
}

/**
 * Delete document
 */
export function deleteDocument(id: string): boolean {
  return documents.delete(id);
}

/**
 * Clear all documents
 */
export function clearDocuments(): void {
  documents.clear();
}

/**
 * Search across all documents
 */
export function searchDocuments(query: string, limit: number = 10): SearchResult[] {
  const results: SearchResult[] = [];

  for (const doc of Array.from(documents.values())) {
    const nodes = searchTree(doc.tree, query);

    for (const node of nodes) {
      const path = getNodePath(doc.tree, node.id) || [];
      const excerpt = extractExcerpt(node.content, query, 200);

      // Simple relevance scoring based on occurrence density
      const queryLower = query.toLowerCase();
      const contentLower = node.content.toLowerCase();
      const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
      const relevanceScore = occurrences / Math.max(node.content.length / 100, 1);

      results.push({
        documentId: doc.id,
        documentTitle: doc.title,
        node,
        path,
        relevanceScore,
        excerpt,
      });
    }
  }

  // Sort by relevance and limit
  return results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Navigate to specific node in document
 */
export function getNode(documentId: string, nodeId: string): DocNode | null {
  const doc = documents.get(documentId);
  if (!doc) return null;

  return findNodeById(doc.tree, nodeId);
}

/**
 * Get document tree structure (for UI navigation)
 */
export function getDocumentTree(documentId: string): DocNode | null {
  const doc = documents.get(documentId);
  return doc?.tree || null;
}

/**
 * Extract excerpt with query highlighted context
 */
function extractExcerpt(content: string, query: string, maxLength: number): string {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();

  const index = contentLower.indexOf(queryLower);
  if (index === -1) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Get context around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + maxLength - 50);

  let excerpt = content.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';

  return excerpt;
}

/**
 * Get document statistics
 */
export function getStats(): {
  totalDocuments: number;
  totalSections: number;
  totalSizeBytes: number;
} {
  let totalSections = 0;
  let totalSizeBytes = 0;

  for (const doc of Array.from(documents.values())) {
    totalSections += doc.totalSections;
    totalSizeBytes += doc.sizeBytes;
  }

  return {
    totalDocuments: documents.size,
    totalSections,
    totalSizeBytes,
  };
}
