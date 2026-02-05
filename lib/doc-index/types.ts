/**
 * Document Index Types
 * Hierarchical tree structure for vectorless RAG
 */

// A node in the document tree
export interface DocNode {
  id: string;
  type: 'document' | 'section' | 'subsection' | 'paragraph' | 'table' | 'list';
  title: string;
  summary?: string;
  content?: string;
  page_start: number;
  page_end: number;
  children: DocNode[];
  metadata?: {
    keywords?: string[];
    entities?: string[];  // Named entities (companies, accounts, etc.)
    numbers?: ExtractedNumber[];
    tables?: ExtractedTable[];
  };
}

// Extracted numbers with context
export interface ExtractedNumber {
  value: number;
  unit?: string;
  context: string;  // e.g., "Umsatz", "Personalkosten"
  page: number;
}

// Extracted tables
export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  page: number;
  caption?: string;
}

// The complete indexed document
export interface IndexedDocument {
  id: string;
  filename: string;
  title: string;
  description?: string;
  total_pages: number;
  indexed_at: string;
  tree: DocNode;
  // Flat lookup for quick access
  node_index: Map<string, DocNode>;
  // Page to nodes mapping
  page_index: Map<number, string[]>;
}

// Search result with reasoning trace
export interface SearchResult {
  query: string;
  answer: string;
  reasoning_trace: ReasoningStep[];
  references: Reference[];
  confidence: number;
}

// A step in the reasoning process
export interface ReasoningStep {
  step: number;
  action: 'navigate' | 'read' | 'compare' | 'conclude';
  node_id?: string;
  node_title?: string;
  thought: string;
  result?: string;
}

// A reference to a specific location in the document
export interface Reference {
  node_id: string;
  title: string;
  page: number;
  section_path: string[];  // e.g., ["Lagebericht", "Personal", "Entwicklung"]
  excerpt: string;
  relevance_score: number;
}

// Configuration for indexing
export interface IndexConfig {
  max_pages_per_node: number;
  max_tokens_per_node: number;
  extract_tables: boolean;
  extract_numbers: boolean;
  language: 'de' | 'en';
}

// Query configuration
export interface QueryConfig {
  max_reasoning_steps: number;
  min_confidence: number;
  include_reasoning_trace: boolean;
}

// Document metadata for listing
export interface DocumentMeta {
  id: string;
  filename: string;
  title: string;
  total_pages: number;
  indexed_at: string;
  size_bytes: number;
}
