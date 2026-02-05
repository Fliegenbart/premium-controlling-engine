/**
 * Tree Reasoner: LLM-based navigation through document tree
 * Mimics how a human expert would navigate a document
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  DocNode,
  IndexedDocument,
  SearchResult,
  ReasoningStep,
  Reference,
  QueryConfig,
} from './types';

const DEFAULT_QUERY_CONFIG: QueryConfig = {
  max_reasoning_steps: 10,
  min_confidence: 0.6,
  include_reasoning_trace: true,
};

/**
 * Search through document using LLM reasoning
 */
export async function searchDocument(
  document: IndexedDocument,
  query: string,
  apiKey: string,
  config: Partial<QueryConfig> = {}
): Promise<SearchResult> {
  const cfg = { ...DEFAULT_QUERY_CONFIG, ...config };
  const client = new Anthropic({ apiKey });

  const reasoningTrace: ReasoningStep[] = [];
  const references: Reference[] = [];

  // Start at root
  let currentNode = document.tree;
  let step = 0;

  // Build initial context
  const treeOverview = buildTreeOverview(document.tree);

  // Step 1: Navigate to relevant section
  reasoningTrace.push({
    step: ++step,
    action: 'navigate',
    node_id: currentNode.id,
    node_title: currentNode.title,
    thought: `Starte Suche im Dokument "${document.title}". Frage: "${query}"`,
  });

  // Ask LLM to navigate
  const navigationResult = await navigateTree(
    client,
    query,
    currentNode,
    treeOverview,
    reasoningTrace.length
  );

  reasoningTrace.push(...navigationResult.steps);

  // Find the target node
  const targetNodeId = navigationResult.targetNodeId;
  const targetNode = findNodeById(document.tree, targetNodeId) || document.tree;

  // Step 2: Read relevant content
  reasoningTrace.push({
    step: ++step + navigationResult.steps.length,
    action: 'read',
    node_id: targetNode.id,
    node_title: targetNode.title,
    thought: `Lese Inhalt von "${targetNode.title}" (Seiten ${targetNode.page_start}-${targetNode.page_end})`,
  });

  // Get content from target node and siblings
  const relevantContent = gatherRelevantContent(targetNode, document);

  // Step 3: Generate answer
  const answer = await generateAnswer(
    client,
    query,
    relevantContent,
    targetNode,
    document.title
  );

  // Build references
  references.push({
    node_id: targetNode.id,
    title: targetNode.title,
    page: targetNode.page_start,
    section_path: getNodePath(document.tree, targetNode.id),
    excerpt: targetNode.summary || targetNode.content?.substring(0, 200) || '',
    relevance_score: 0.9,
  });

  // Add child references if relevant
  for (const child of targetNode.children.slice(0, 3)) {
    references.push({
      node_id: child.id,
      title: child.title,
      page: child.page_start,
      section_path: getNodePath(document.tree, child.id),
      excerpt: child.summary || '',
      relevance_score: 0.7,
    });
  }

  reasoningTrace.push({
    step: ++step + navigationResult.steps.length,
    action: 'conclude',
    thought: 'Antwort generiert basierend auf gefundenen Informationen',
    result: answer.substring(0, 100) + '...',
  });

  return {
    query,
    answer,
    reasoning_trace: reasoningTrace,
    references,
    confidence: navigationResult.confidence,
  };
}

/**
 * Build a text overview of the document tree
 */
function buildTreeOverview(node: DocNode, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  let overview = `${indent}- ${node.title} (S. ${node.page_start}-${node.page_end})`;

  if (node.summary && depth > 0) {
    overview += `\n${indent}  → ${node.summary.substring(0, 100)}...`;
  }

  for (const child of node.children) {
    overview += '\n' + buildTreeOverview(child, depth + 1);
  }

  return overview;
}

interface NavigationResult {
  targetNodeId: string;
  steps: ReasoningStep[];
  confidence: number;
}

/**
 * Use LLM to navigate the tree
 */
async function navigateTree(
  client: Anthropic,
  query: string,
  rootNode: DocNode,
  treeOverview: string,
  startStep: number
): Promise<NavigationResult> {
  const prompt = `Du bist ein Experte für die Navigation in Dokumenten.

DOKUMENTSTRUKTUR:
${treeOverview}

FRAGE DES NUTZERS:
${query}

AUFGABE:
1. Analysiere die Dokumentstruktur
2. Identifiziere den relevantesten Abschnitt für diese Frage
3. Erkläre deine Navigation Schritt für Schritt

Antworte im folgenden JSON-Format:
{
  "reasoning": [
    {"thought": "Erste Überlegung zur Frage...", "action": "Schaue mir die Hauptabschnitte an"},
    {"thought": "Dieser Abschnitt scheint relevant...", "action": "Navigiere zu [Abschnitt]"}
  ],
  "target_section": "Exakter Titel des Zielabschnitts",
  "confidence": 0.85,
  "explanation": "Kurze Begründung warum dieser Abschnitt relevant ist"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        targetNodeId: rootNode.id,
        steps: [],
        confidence: 0.5,
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    // Convert reasoning to steps
    const steps: ReasoningStep[] = result.reasoning?.map((r: any, i: number) => ({
      step: startStep + i + 1,
      action: 'navigate' as const,
      thought: r.thought,
      result: r.action,
    })) || [];

    // Find the target node by title
    const targetNode = findNodeByTitle(rootNode, result.target_section);

    return {
      targetNodeId: targetNode?.id || rootNode.id,
      steps,
      confidence: result.confidence || 0.7,
    };
  } catch (error) {
    console.error('Navigation error:', error);
    return {
      targetNodeId: rootNode.id,
      steps: [],
      confidence: 0.5,
    };
  }
}

/**
 * Gather relevant content from node and context
 */
function gatherRelevantContent(node: DocNode, document: IndexedDocument): string {
  const parts: string[] = [];

  // Add node's own content
  if (node.content) {
    parts.push(`## ${node.title}\n${node.content}`);
  }

  // Add children's content (summarized)
  for (const child of node.children) {
    if (child.content) {
      parts.push(`### ${child.title}\n${child.content.substring(0, 1000)}...`);
    } else if (child.summary) {
      parts.push(`### ${child.title}\n${child.summary}`);
    }
  }

  // Limit total content
  const combined = parts.join('\n\n');
  if (combined.length > 15000) {
    return combined.substring(0, 15000) + '\n\n[... weitere Inhalte gekürzt ...]';
  }

  return combined;
}

/**
 * Generate answer using LLM
 */
async function generateAnswer(
  client: Anthropic,
  query: string,
  content: string,
  node: DocNode,
  documentTitle: string
): Promise<string> {
  const prompt = `Du bist ein Finanz- und Controlling-Experte. Beantworte die folgende Frage basierend auf dem Dokumentinhalt.

DOKUMENT: ${documentTitle}
ABSCHNITT: ${node.title} (Seiten ${node.page_start}-${node.page_end})

INHALT:
${content}

FRAGE: ${query}

WICHTIG:
- Antworte präzise und faktenbasiert
- Zitiere konkrete Zahlen und Fakten aus dem Dokument
- Gib immer die Seitenzahl an, wenn du etwas zitierst
- Wenn die Information nicht im Dokument steht, sage das klar

Deine Antwort:`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : 'Keine Antwort generiert.';
  } catch (error) {
    console.error('Answer generation error:', error);
    return 'Fehler bei der Antwortgenerierung.';
  }
}

/**
 * Find node by ID in tree
 */
function findNodeById(node: DocNode, id: string): DocNode | null {
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find node by title (fuzzy match)
 */
function findNodeByTitle(node: DocNode, title: string): DocNode | null {
  const normalizedTitle = title.toLowerCase().trim();

  if (node.title.toLowerCase().includes(normalizedTitle) ||
      normalizedTitle.includes(node.title.toLowerCase())) {
    return node;
  }

  for (const child of node.children) {
    const found = findNodeByTitle(child, title);
    if (found) return found;
  }

  return null;
}

/**
 * Get path from root to node
 */
function getNodePath(root: DocNode, targetId: string, path: string[] = []): string[] {
  if (root.id === targetId) {
    return [...path, root.title];
  }

  for (const child of root.children) {
    const found = getNodePath(child, targetId, [...path, root.title]);
    if (found.length > path.length + 1) {
      return found;
    }
  }

  return path;
}

/**
 * Quick search without full reasoning (for autocomplete, etc.)
 */
export function quickSearch(
  document: IndexedDocument,
  query: string
): { node: DocNode; score: number }[] {
  const results: { node: DocNode; score: number }[] = [];
  const queryTerms = query.toLowerCase().split(/\s+/);

  function scoreNode(node: DocNode): number {
    let score = 0;
    const titleLower = node.title.toLowerCase();
    const contentLower = (node.content || '').toLowerCase();
    const summaryLower = (node.summary || '').toLowerCase();

    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 3;
      if (summaryLower.includes(term)) score += 2;
      if (contentLower.includes(term)) score += 1;
    }

    return score;
  }

  function traverse(node: DocNode) {
    const score = scoreNode(node);
    if (score > 0) {
      results.push({ node, score });
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(document.tree);

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
