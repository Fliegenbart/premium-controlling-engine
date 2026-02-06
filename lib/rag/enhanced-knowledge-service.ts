/**
 * Enhanced Knowledge Service combining SKR03 knowledge with local vector-based RAG
 * Learns from controller feedback and stores historical analyses
 */

import {
  LocalVectorStore,
  VectorDocument,
  SearchResult,
} from "./vector-store";
import { KnowledgeService } from "./knowledge-service";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_RAG_PATH = path.join(process.cwd(), "data", "rag-store.json");

export interface ControllerFeedbackInput {
  account: number;
  originalComment: string;
  correctedComment: string;
  context?: string;
}

export interface HistoricalAnalysisInput {
  entity: string;
  period: string;
  accountDeviations: Array<{
    account: number;
    account_name: string;
    delta_abs: number;
    comment: string;
  }>;
}

export interface EnhancedContextParams {
  account: number;
  accountName: string;
  varianceAbs: number;
  variancePct: number;
  bookingTexts?: string[];
}

export class EnhancedKnowledgeService {
  private vectorStore: LocalVectorStore;
  private baseKnowledge: KnowledgeService;
  private ragPath: string;

  constructor(ragPath?: string) {
    this.vectorStore = new LocalVectorStore();
    this.baseKnowledge = new KnowledgeService();
    this.ragPath = ragPath || DEFAULT_RAG_PATH;

    // Try to load existing RAG store
    this._loadIfExists();
  }

  /**
   * Index the SKR03 knowledge base into the vector store
   */
  indexKnowledgeBase(): void {
    const documents: VectorDocument[] = [];

    // Iterate through all accounts in the knowledge base
    // Note: This is a bit of a workaround since we can't directly iterate
    // We'll create documents from typical account descriptions
    for (let accountNum = 4000; accountNum < 8000; accountNum += 100) {
      const knowledge = this.baseKnowledge.getAccountKnowledge(accountNum);
      if (!knowledge) continue;

      const docId = `skr03_${accountNum}`;

      // Build content from knowledge
      let content = `${knowledge.name} (${accountNum}). `;
      content += `Kategorie: ${knowledge.category}. `;
      content += `Typ: ${knowledge.type === "revenue" ? "Ertragskonto" : "Aufwandskonto"}. `;

      if (knowledge.typical_behavior) {
        content += `Typisches Verhalten: ${knowledge.typical_behavior}. `;
      }

      if (knowledge.seasonal_pattern) {
        content += `Saisonales Muster: ${knowledge.seasonal_pattern}. `;
      }

      if (knowledge.red_flags && knowledge.red_flags.length > 0) {
        content += `Bekannte Risiken: ${knowledge.red_flags.join(", ")}. `;
      }

      if (knowledge.keywords && knowledge.keywords.length > 0) {
        content += `Schlüsselwörter: ${knowledge.keywords.join(", ")}. `;
      }

      documents.push({
        id: docId,
        content,
        metadata: {
          accountNumber: accountNum,
          accountName: knowledge.name,
          category: knowledge.category,
          accountType: knowledge.type,
        },
        type: "knowledge_base",
        createdAt: new Date().toISOString(),
      });
    }

    if (documents.length > 0) {
      this.vectorStore.addDocuments(documents);
    }
  }

  /**
   * Store a controller's comment/correction as learning data
   */
  addControllerFeedback(params: ControllerFeedbackInput): void {
    const doc: VectorDocument = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: `Konto ${params.account}: Original: "${params.originalComment}" Korrigiert: "${params.correctedComment}" ${params.context ? `Kontext: ${params.context}` : ""}`,
      metadata: {
        account: params.account,
        originalComment: params.originalComment,
        correctedComment: params.correctedComment,
        context: params.context,
        feedbackType: "controller_correction",
      },
      type: "controller_feedback",
      createdAt: new Date().toISOString(),
    };

    this.vectorStore.addDocument(doc);
  }

  /**
   * Store a completed analysis for future reference
   */
  addHistoricalAnalysis(params: HistoricalAnalysisInput): void {
    const deviationSummary = params.accountDeviations
      .map(
        (d) =>
          `Konto ${d.account} (${d.account_name}): Abweichung ${d.delta_abs.toFixed(2)}, Kommentar: ${d.comment}`
      )
      .join("; ");

    const doc: VectorDocument = {
      id: `historical_${params.entity}_${params.period}_${Date.now()}`,
      content: `Analyse für ${params.entity} Periode ${params.period}. ${deviationSummary}`,
      metadata: {
        entity: params.entity,
        period: params.period,
        deviationCount: params.accountDeviations.length,
        topAccounts: params.accountDeviations
          .slice(0, 3)
          .map((d) => d.account),
      },
      type: "historical_analysis",
      createdAt: new Date().toISOString(),
    };

    this.vectorStore.addDocument(doc);
  }

  /**
   * Build enhanced context combining SKR03 knowledge with vector search results
   */
  buildEnhancedContext(params: EnhancedContextParams): string {
    // Get base knowledge context
    const baseContext = this.baseKnowledge.buildPromptContext(
      params.account,
      params.variancePct
    );

    // Search for similar historical analyses and feedback
    const searchQuery = `${params.accountName} Abweichung ${params.variancePct.toFixed(1)}% ${params.bookingTexts ? params.bookingTexts.join(" ") : ""}`;

    const results = this.vectorStore.search(searchQuery, {
      limit: 3,
      minScore: 0.1,
    });

    // Build enhanced context string
    let enhancedContext = baseContext;

    if (results.length > 0) {
      enhancedContext += "\n## Ähnliche historische Fälle und Lernbeispiele:\n";

      results.forEach((result, index) => {
        enhancedContext += `\n### Beispiel ${index + 1} (Ähnlichkeit: ${(result.score * 100).toFixed(1)}%)\n`;
        enhancedContext += `- Typ: ${result.document.type}\n`;
        enhancedContext += `- Inhalt: ${result.document.content.substring(0, 200)}...\n`;

        if (result.document.type === "controller_feedback") {
          const meta = result.document.metadata as any;
          if (meta.correctedComment) {
            enhancedContext += `- Korrektur: ${meta.correctedComment}\n`;
          }
        }

        if (result.document.type === "historical_analysis") {
          const meta = result.document.metadata as any;
          enhancedContext += `- Periode: ${meta.period}, Entity: ${meta.entity}\n`;
        }
      });
    }

    return enhancedContext;
  }

  /**
   * Search the RAG store directly
   */
  search(query: string, options?: { limit?: number; minScore?: number }) {
    return this.vectorStore.search(query, options);
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      totalDocuments: this.vectorStore.size(),
      knowledgeBaseDocuments: this._countByType("knowledge_base"),
      controllerFeedbackDocuments: this._countByType("controller_feedback"),
      historicalAnalysisDocuments: this._countByType("historical_analysis"),
    };
  }

  /**
   * Persist the vector store to disk
   */
  save(filePath?: string): void {
    const savePath = filePath || this.ragPath;

    // Ensure directory exists
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const json = this.vectorStore.export();
    fs.writeFileSync(savePath, json, "utf-8");
  }

  /**
   * Load the vector store from disk
   */
  load(filePath?: string): void {
    const loadPath = filePath || this.ragPath;

    if (!fs.existsSync(loadPath)) {
      return;
    }

    try {
      const json = fs.readFileSync(loadPath, "utf-8");
      this.vectorStore.import(json);
    } catch (error) {
      console.error(
        `Failed to load RAG store from ${loadPath}:`,
        (error as Error).message
      );
    }
  }

  /**
   * Export vector store as JSON string
   */
  exportAsJson(): string {
    return this.vectorStore.export();
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.vectorStore.clear();
  }

  // ===== Private Methods =====

  /**
   * Load RAG store if it exists
   */
  private _loadIfExists(): void {
    if (fs.existsSync(this.ragPath)) {
      try {
        const json = fs.readFileSync(this.ragPath, "utf-8");
        this.vectorStore.import(json);
      } catch (error) {
        console.warn(
          `Failed to load existing RAG store: ${(error as Error).message}`
        );
      }
    }
  }

  /**
   * Count documents by type
   */
  private _countByType(
    type: "knowledge_base" | "controller_feedback" | "historical_analysis"
  ): number {
    const results = this.vectorStore.search("", { limit: 10000, minScore: 0 });
    return results.filter((r) => r.document.type === type).length;
  }
}

// Singleton instance
let enhancedKnowledgeInstance: EnhancedKnowledgeService | null = null;

export function getEnhancedKnowledgeService(
  ragPath?: string
): EnhancedKnowledgeService {
  if (!enhancedKnowledgeInstance) {
    enhancedKnowledgeInstance = new EnhancedKnowledgeService(ragPath);
  }
  return enhancedKnowledgeInstance;
}
