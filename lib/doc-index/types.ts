/**
 * Document Intelligence Types - PageIndex-Style RAG
 *
 * Implements hierarchical document tree navigation
 * instead of traditional vector embeddings
 */

// Document tree node structure
export interface DocNode {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'section' | 'subsection' | 'paragraph';
  level: number;
  page?: number;
  children: DocNode[];
  metadata?: Record<string, unknown>;
}

// Indexed document with tree structure
export interface IndexedDocument {
  id: string;
  filename: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  tree: DocNode;
  totalPages: number;
  totalSections: number;
  indexedAt: string;
  sizeBytes: number;
}

// Search result with navigation path
export interface SearchResult {
  documentId: string;
  documentTitle: string;
  node: DocNode;
  path: string[]; // breadcrumb path to this node
  relevanceScore: number;
  excerpt: string;
}

// Reference for evidence linking
export interface Reference {
  documentId: string;
  documentTitle: string;
  nodeId: string;
  nodeTitle: string;
  page?: number;
  excerpt: string;
  path: string[];
}

// Query result with reasoning trace
export interface QueryResult {
  answer: string;
  confidence: number;
  references: Reference[];
  reasoningTrace: ReasoningStep[];
}

// Reasoning step for transparency
export interface ReasoningStep {
  step: number;
  action: 'navigate' | 'read' | 'summarize' | 'answer';
  nodeId?: string;
  nodeTitle?: string;
  thought: string;
}
