/**
 * PDF Parser - Extracts hierarchical structure from PDFs
 *
 * Uses heuristics to detect headings, sections, and build document tree
 */

import pdfParse from 'pdf-parse';
import { DocNode, IndexedDocument } from './types';
import { v4 as uuidv4 } from 'uuid';

// Heading detection patterns
const HEADING_PATTERNS = [
  /^(\d+\.)+\s+(.+)$/m, // 1.2.3 Heading
  /^#{1,6}\s+(.+)$/m, // Markdown headings
  /^[A-Z][A-Z\s]{5,}$/m, // ALL CAPS headings
  /^(?:Kapitel|Abschnitt|Chapter|Section)\s+\d+/im, // Explicit chapter markers
];

// Simple UUID generator if uuid not available
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Parse PDF buffer into hierarchical document tree
 */
export async function parsePDF(
  buffer: Buffer,
  filename: string
): Promise<IndexedDocument> {
  const data = await pdfParse(buffer);

  const text = data.text;
  const numPages = data.numpages;

  // Split into potential sections based on common patterns
  const lines = text.split('\n').filter((l) => l.trim());

  // Build document tree
  const tree = buildDocumentTree(lines, filename);

  return {
    id: generateId(),
    filename,
    title: extractTitle(lines) || filename.replace(/\.pdf$/i, ''),
    type: 'pdf',
    tree,
    totalPages: numPages,
    totalSections: countNodes(tree),
    indexedAt: new Date().toISOString(),
    sizeBytes: buffer.length,
  };
}

/**
 * Extract document title from first meaningful lines
 */
function extractTitle(lines: string[]): string {
  // Look for a prominent title in first few lines
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    // Skip short lines and common metadata
    if (line.length > 10 && line.length < 100) {
      if (!line.match(/^(seite|page|datum|date|von|from|an|to)/i)) {
        return line;
      }
    }
  }
  return '';
}

/**
 * Build hierarchical document tree from lines
 */
function buildDocumentTree(lines: string[], filename: string): DocNode {
  const root: DocNode = {
    id: generateId(),
    title: filename,
    content: '',
    type: 'document',
    level: 0,
    children: [],
  };

  let currentSection: DocNode | null = null;
  let currentSubsection: DocNode | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length === 0) return;

    const content = currentParagraph.join('\n').trim();
    if (!content) return;

    const paragraphNode: DocNode = {
      id: generateId(),
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      type: 'paragraph',
      level: 3,
      children: [],
    };

    if (currentSubsection) {
      currentSubsection.children.push(paragraphNode);
    } else if (currentSection) {
      currentSection.children.push(paragraphNode);
    } else {
      root.children.push(paragraphNode);
    }

    currentParagraph = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Check if this is a heading
    const headingLevel = detectHeadingLevel(trimmed);

    if (headingLevel === 1) {
      // New section
      flushParagraph();
      currentSection = {
        id: generateId(),
        title: cleanHeading(trimmed),
        content: '',
        type: 'section',
        level: 1,
        children: [],
      };
      currentSubsection = null;
      root.children.push(currentSection);
    } else if (headingLevel === 2 && currentSection) {
      // New subsection
      flushParagraph();
      currentSubsection = {
        id: generateId(),
        title: cleanHeading(trimmed),
        content: '',
        type: 'subsection',
        level: 2,
        children: [],
      };
      currentSection.children.push(currentSubsection);
    } else {
      // Regular content
      currentParagraph.push(trimmed);
    }
  }

  flushParagraph();

  // Build aggregated content for each node
  aggregateContent(root);

  return root;
}

/**
 * Detect heading level from text patterns
 */
function detectHeadingLevel(text: string): number {
  // Numbered section (1. or 1.1)
  if (/^\d+\.\s+[A-Z]/.test(text)) return 1;
  if (/^\d+\.\d+\.?\s+/.test(text)) return 2;

  // ALL CAPS sections
  if (/^[A-ZÄÖÜ][A-ZÄÖÜ\s]{10,}$/.test(text) && text.length < 80) return 1;

  // German keywords
  if (/^(Zusammenfassung|Einleitung|Fazit|Anhang|Glossar)/i.test(text)) return 1;
  if (/^(Definition|Beispiel|Hinweis|Wichtig)/i.test(text)) return 2;

  return 0;
}

/**
 * Clean heading text
 */
function cleanHeading(text: string): string {
  return text
    .replace(/^[\d.]+\s*/, '') // Remove numbering
    .replace(/^#+\s*/, '') // Remove markdown
    .trim();
}

/**
 * Aggregate content from children into parent nodes
 */
function aggregateContent(node: DocNode): string {
  if (node.children.length === 0) {
    return node.content;
  }

  const childContent = node.children.map((c) => aggregateContent(c)).join('\n\n');

  node.content = childContent;
  return childContent;
}

/**
 * Count total nodes in tree
 */
function countNodes(node: DocNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/**
 * Find node by ID in tree
 */
export function findNodeById(tree: DocNode, id: string): DocNode | null {
  if (tree.id === id) return tree;

  for (const child of tree.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Get path to node (breadcrumb)
 */
export function getNodePath(tree: DocNode, targetId: string, path: string[] = []): string[] | null {
  if (tree.id === targetId) {
    return [...path, tree.title];
  }

  for (const child of tree.children) {
    const result = getNodePath(child, targetId, [...path, tree.title]);
    if (result) return result;
  }

  return null;
}

/**
 * Search document tree for text
 */
export function searchTree(tree: DocNode, query: string): DocNode[] {
  const results: DocNode[] = [];
  const queryLower = query.toLowerCase();

  const search = (node: DocNode) => {
    if (
      node.content.toLowerCase().includes(queryLower) ||
      node.title.toLowerCase().includes(queryLower)
    ) {
      results.push(node);
    }
    node.children.forEach(search);
  };

  search(tree);
  return results;
}
