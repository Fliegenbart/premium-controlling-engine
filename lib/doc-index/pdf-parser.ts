/**
 * PDF Parser with Structure Extraction
 * Extracts hierarchical structure from PDF documents
 */

import { DocNode, ExtractedNumber, ExtractedTable, IndexConfig } from './types';

// We'll use dynamic import for pdf-parse to handle server-side only
let pdfParse: any = null;

async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

const DEFAULT_CONFIG: IndexConfig = {
  max_pages_per_node: 10,
  max_tokens_per_node: 20000,
  extract_tables: true,
  extract_numbers: true,
  language: 'de',
};

/**
 * Parse PDF and extract hierarchical structure
 */
export async function parsePDF(
  buffer: Buffer,
  filename: string,
  config: Partial<IndexConfig> = {}
): Promise<DocNode> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const parse = await getPdfParse();
    const data = await parse(buffer, {
      // Get page-by-page text
      pagerender: renderPage,
    });

    const pages: PageContent[] = data.pages || [];
    const totalPages = data.numpages;

    // Build document tree
    const root = buildDocumentTree(pages, filename, totalPages, cfg);

    return root;
  } catch (error) {
    console.error('PDF parsing error:', error);
    // Return a minimal structure on error
    return {
      id: generateId(),
      type: 'document',
      title: filename,
      summary: 'Dokument konnte nicht vollständig geparst werden',
      page_start: 1,
      page_end: 1,
      children: [],
    };
  }
}

interface PageContent {
  pageNumber: number;
  text: string;
  lines: string[];
}

/**
 * Custom page renderer to get structured text
 */
function renderPage(pageData: any): Promise<string> {
  return pageData.getTextContent().then((textContent: any) => {
    let lastY: number | null = null;
    let text = '';

    for (const item of textContent.items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        text += '\n';
      }
      text += item.str;
      lastY = item.transform[5];
    }

    return text;
  });
}

/**
 * Build hierarchical document tree from pages
 */
function buildDocumentTree(
  pages: PageContent[],
  filename: string,
  totalPages: number,
  config: IndexConfig
): DocNode {
  const root: DocNode = {
    id: generateId(),
    type: 'document',
    title: extractDocumentTitle(pages) || filename.replace('.pdf', ''),
    page_start: 1,
    page_end: totalPages,
    children: [],
    metadata: {
      keywords: [],
      entities: [],
      numbers: [],
    },
  };

  // Try to find table of contents
  const toc = findTableOfContents(pages);

  if (toc.length > 0) {
    // Build tree from TOC
    root.children = buildFromTOC(toc, pages, config);
  } else {
    // Build tree from heading detection
    root.children = buildFromHeadings(pages, config);
  }

  // Extract numbers and entities from all content
  if (config.extract_numbers) {
    root.metadata!.numbers = extractAllNumbers(pages, config.language);
  }

  // Generate summary for root
  root.summary = generateNodeSummary(root, pages);

  return root;
}

interface TOCEntry {
  title: string;
  page: number;
  level: number;
}

/**
 * Find table of contents in first pages
 */
function findTableOfContents(pages: PageContent[]): TOCEntry[] {
  const tocEntries: TOCEntry[] = [];
  const tocPatterns = [
    /^(Inhaltsverzeichnis|Inhalt|Contents|Table of Contents)/im,
    /^\d+\.\s+.+\s+\d+$/,  // "1. Chapter Name 23"
  ];

  // Check first 5 pages for TOC
  for (let i = 0; i < Math.min(5, pages.length); i++) {
    const page = pages[i];
    if (!page?.text) continue;

    const lines = page.text.split('\n').filter(l => l.trim());

    for (const line of lines) {
      // Match TOC entry pattern: "1.2.3 Title ... 42" or "Title 42"
      const match = line.match(/^(\d+(?:\.\d+)*\.?\s+)?(.+?)\s*\.{2,}\s*(\d+)\s*$/);
      if (match) {
        const levelStr = match[1] || '';
        const level = levelStr.split('.').filter(s => s.trim()).length || 1;
        tocEntries.push({
          title: match[2].trim(),
          page: parseInt(match[3]),
          level,
        });
      }
    }
  }

  return tocEntries;
}

/**
 * Build tree from table of contents
 */
function buildFromTOC(
  toc: TOCEntry[],
  pages: PageContent[],
  config: IndexConfig
): DocNode[] {
  const nodes: DocNode[] = [];
  const stack: { node: DocNode; level: number }[] = [];

  for (let i = 0; i < toc.length; i++) {
    const entry = toc[i];
    const nextEntry = toc[i + 1];

    const node: DocNode = {
      id: generateId(),
      type: entry.level === 1 ? 'section' : 'subsection',
      title: entry.title,
      page_start: entry.page,
      page_end: nextEntry ? nextEntry.page - 1 : pages.length,
      children: [],
    };

    // Extract content for this section
    node.content = extractContentForPages(pages, node.page_start, node.page_end);
    node.summary = summarizeContent(node.content);

    // Find parent based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      nodes.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, level: entry.level });
  }

  return nodes;
}

/**
 * Build tree from heading detection (when no TOC available)
 */
function buildFromHeadings(pages: PageContent[], config: IndexConfig): DocNode[] {
  const nodes: DocNode[] = [];
  let currentSection: DocNode | null = null;

  // Heading patterns (German financial documents)
  const headingPatterns = [
    /^(\d+\.?\s+)?([A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s]{3,50})$/,  // Capitalized headings
    /^(Lagebericht|Bilanz|GuV|Gewinn|Verlust|Anhang|Eigenkapital|Verbindlichkeiten)/i,
    /^(\d+\.\d*\s+.{5,50})$/,  // Numbered sections
  ];

  for (let pageNum = 0; pageNum < pages.length; pageNum++) {
    const page = pages[pageNum];
    if (!page?.text) continue;

    const lines = page.text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;

      // Check if this looks like a heading
      const isHeading = headingPatterns.some(p => p.test(trimmed)) &&
        trimmed.length < 80 &&
        !trimmed.includes('€') &&
        !trimmed.match(/^\d+[.,]\d+/);

      if (isHeading) {
        // Save current section
        if (currentSection) {
          currentSection.page_end = pageNum;
          currentSection.content = extractContentForPages(
            pages,
            currentSection.page_start,
            currentSection.page_end
          );
          currentSection.summary = summarizeContent(currentSection.content);
          nodes.push(currentSection);
        }

        // Start new section
        currentSection = {
          id: generateId(),
          type: 'section',
          title: cleanHeadingText(trimmed),
          page_start: pageNum + 1,
          page_end: pages.length,
          children: [],
        };
      }
    }
  }

  // Add last section
  if (currentSection) {
    currentSection.content = extractContentForPages(
      pages,
      currentSection.page_start,
      currentSection.page_end
    );
    currentSection.summary = summarizeContent(currentSection.content);
    nodes.push(currentSection);
  }

  // If no sections found, create one big section
  if (nodes.length === 0) {
    nodes.push({
      id: generateId(),
      type: 'section',
      title: 'Inhalt',
      page_start: 1,
      page_end: pages.length,
      content: pages.map(p => p?.text || '').join('\n\n'),
      children: [],
    });
  }

  return nodes;
}

/**
 * Extract content for a page range
 */
function extractContentForPages(
  pages: PageContent[],
  startPage: number,
  endPage: number
): string {
  const content: string[] = [];

  for (let i = startPage - 1; i < Math.min(endPage, pages.length); i++) {
    if (pages[i]?.text) {
      content.push(pages[i].text);
    }
  }

  return content.join('\n\n');
}

/**
 * Extract document title from first page
 */
function extractDocumentTitle(pages: PageContent[]): string | null {
  if (!pages[0]?.text) return null;

  const lines = pages[0].text.split('\n').filter(l => l.trim());

  // Look for title-like text in first 10 lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    // Title is usually short and capitalized
    if (line.length > 5 && line.length < 100 && /[A-ZÄÖÜ]/.test(line[0])) {
      // Skip common non-title patterns
      if (!line.match(/^(Seite|Page|\d+|www\.|http)/i)) {
        return line;
      }
    }
  }

  return null;
}

/**
 * Extract all numbers with context
 */
function extractAllNumbers(pages: PageContent[], language: string): ExtractedNumber[] {
  const numbers: ExtractedNumber[] = [];
  const numberPattern = language === 'de'
    ? /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(€|EUR|Mio\.?|Tsd\.?|%)?/g
    : /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(\$|USD|M|K|%)?/g;

  for (let pageNum = 0; pageNum < pages.length; pageNum++) {
    const page = pages[pageNum];
    if (!page?.text) continue;

    const lines = page.text.split('\n');

    for (const line of lines) {
      let match;
      while ((match = numberPattern.exec(line)) !== null) {
        const valueStr = match[1].replace(/\./g, '').replace(',', '.');
        const value = parseFloat(valueStr);

        if (!isNaN(value) && value > 0) {
          // Get context (surrounding text)
          const contextStart = Math.max(0, match.index - 30);
          const contextEnd = Math.min(line.length, match.index + match[0].length + 30);
          const context = line.substring(contextStart, contextEnd).trim();

          numbers.push({
            value,
            unit: match[2] || undefined,
            context,
            page: pageNum + 1,
          });
        }
      }
    }
  }

  return numbers;
}

/**
 * Summarize content (first 200 chars + key facts)
 */
function summarizeContent(content: string | undefined): string {
  if (!content) return '';

  // Get first meaningful paragraph
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
  if (paragraphs.length === 0) return content.substring(0, 200) + '...';

  return paragraphs[0].substring(0, 300) + (paragraphs[0].length > 300 ? '...' : '');
}

/**
 * Generate summary for a node
 */
function generateNodeSummary(node: DocNode, pages: PageContent[]): string {
  const childTitles = node.children.map(c => c.title).join(', ');
  return `${node.title} (Seiten ${node.page_start}-${node.page_end}). Enthält: ${childTitles || 'Inhalt'}`;
}

/**
 * Clean heading text
 */
function cleanHeadingText(text: string): string {
  return text
    .replace(/^\d+\.?\s*/, '')  // Remove leading numbers
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse PDF from base64 string
 */
export async function parsePDFFromBase64(
  base64: string,
  filename: string,
  config: Partial<IndexConfig> = {}
): Promise<DocNode> {
  const buffer = Buffer.from(base64, 'base64');
  return parsePDF(buffer, filename, config);
}
