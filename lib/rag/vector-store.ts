/**
 * Local Vector Store with TF-IDF similarity search
 * No external vector database required - works entirely in-memory
 */

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  type:
    | "analysis_comment"
    | "controller_feedback"
    | "knowledge_base"
    | "historical_analysis"
    | "business_context";
  createdAt: string;
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
}

interface TokenFrequency {
  [token: string]: number;
}

interface DocumentVectors {
  [docId: string]: {
    tokens: Set<string>;
    frequencies: TokenFrequency;
    magnitude: number;
  };
}

/**
 * Comprehensive list of German stop words to filter out during tokenization
 */
const GERMAN_STOP_WORDS = new Set([
  // Articles
  "der",
  "die",
  "das",
  "den",
  "dem",
  "des",
  "ein",
  "eine",
  "einen",
  "einem",
  "eines",
  "einer",
  "einer",
  "einen",
  // Pronouns
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "sie",
  "ihn",
  "ihm",
  "ihr",
  "ihnen",
  "mich",
  "mir",
  "dich",
  "dir",
  "euch",
  "uns",
  "dich",
  "sich",
  "mein",
  "dein",
  "sein",
  "unser",
  "euer",
  "meiner",
  "deiner",
  "seiner",
  "unserer",
  "eurer",
  // Conjunctions
  "und",
  "oder",
  "aber",
  "doch",
  "sondern",
  "daher",
  "deshalb",
  "weil",
  "obwohl",
  "bevor",
  "nachdem",
  "während",
  "falls",
  "wenn",
  "da",
  // Prepositions
  "in",
  "auf",
  "an",
  "von",
  "zu",
  "mit",
  "für",
  "gegen",
  "vor",
  "nach",
  "über",
  "unter",
  "zwischen",
  "ohne",
  "durch",
  "aus",
  "bei",
  "seit",
  "während",
  "ab",
  "bis",
  "gegenüber",
  "neben",
  "außer",
  // Verbs (common)
  "ist",
  "sind",
  "war",
  "waren",
  "sein",
  "wird",
  "werde",
  "werdet",
  "habe",
  "hat",
  "habt",
  "hatte",
  "hatten",
  "haben",
  "können",
  "kann",
  "konnte",
  "konnten",
  "darf",
  "durfte",
  "durften",
  "müssen",
  "muss",
  "musste",
  "mussten",
  "soll",
  "sollte",
  "sollen",
  "wollen",
  "will",
  "wollte",
  "wollten",
  "lassen",
  "lässt",
  "ließ",
  "ließen",
  // Other common words
  "es",
  "dem",
  "das",
  "was",
  "wer",
  "wen",
  "wem",
  "wie",
  "wo",
  "wann",
  "warum",
  "all",
  "alle",
  "allem",
  "allen",
  "aller",
  "alles",
  "als",
  "also",
  "alt",
  "andere",
  "anderem",
  "anderen",
  "anderer",
  "anderes",
  "anderm",
  "andern",
  "anderr",
  "anderem",
  "anderen",
  "anderer",
  "anderes",
  "mehr",
  "mehrere",
  "mehrerer",
  "mehreres",
  "meisten",
  "meisten",
  "meister",
  "meistes",
  "viel",
  "viele",
  "vielem",
  "vielen",
  "vieler",
  "vieles",
  "nie",
  "niemals",
  "no",
  "noch",
  "nun",
  "nur",
  "so",
  "solch",
  "solche",
  "solchem",
  "solchen",
  "solcher",
  "solches",
  "sondern",
  "sonst",
  "sonstwo",
  "sonstwo",
  "sonstwo",
]);

export class LocalVectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private documentVectors: DocumentVectors = {};
  private vocabulary: Set<string> = new Set();
  private idfCache: Map<string, number> = new Map();
  private vectorsDirty = false;

  /**
   * Add a single document to the store
   */
  addDocument(doc: VectorDocument): void {
    this.documents.set(doc.id, doc);
    this.vectorsDirty = true;
  }

  /**
   * Add multiple documents to the store
   */
  addDocuments(docs: VectorDocument[]): void {
    docs.forEach((doc) => {
      this.documents.set(doc.id, doc);
    });
    this.vectorsDirty = true;
  }

  /**
   * Search documents by text similarity using TF-IDF cosine similarity
   */
  search(
    query: string,
    options?: { limit?: number; minScore?: number; type?: string }
  ): SearchResult[] {
    const limit = options?.limit ?? 5;
    const minScore = options?.minScore ?? 0;
    const typeFilter = options?.type;

    // Rebuild vectors if needed
    if (this.vectorsDirty) {
      this._rebuildVectors();
    }

    if (this.documents.size === 0) {
      return [];
    }

    // Tokenize query
    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Calculate query vector
    const queryVector = this._calculateTFIDFVector(queryTokens);

    // Calculate similarity scores
    const scores: Array<{ docId: string; score: number }> = [];

    for (const [docId, docData] of Object.entries(this.documentVectors)) {
      const document = this.documents.get(docId);
      if (!document) continue;

      // Apply type filter if specified
      if (typeFilter && document.type !== typeFilter) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = this._cosineSimilarity(queryVector, docData);
      if (similarity >= minScore) {
        scores.push({ docId, score: similarity });
      }
    }

    // Sort by score descending and limit results
    const results = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ docId, score }) => ({
        document: this.documents.get(docId)!,
        score,
      }));

    return results;
  }

  /**
   * Get the number of documents in the store
   */
  size(): number {
    return this.documents.size;
  }

  /**
   * Clear all documents and vectors
   */
  clear(): void {
    this.documents.clear();
    this.documentVectors = {};
    this.vocabulary.clear();
    this.idfCache.clear();
    this.vectorsDirty = false;
  }

  /**
   * Export the vector store to JSON for persistence
   */
  export(): string {
    const data = {
      documents: Array.from(this.documents.values()),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import documents from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data.documents)) {
        throw new Error("Invalid import format: documents must be an array");
      }

      this.clear();
      this.addDocuments(data.documents);
    } catch (error) {
      throw new Error(
        `Failed to import vector store: ${(error as Error).message}`
      );
    }
  }

  // ===== Private Methods =====

  /**
   * Tokenize text: lowercase, split on non-alphanumeric, remove stop words
   */
  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-zäöüß0-9]+/)
      .filter((token) => token.length > 0 && !GERMAN_STOP_WORDS.has(token));
  }

  /**
   * Rebuild document vectors (called when documents change)
   */
  private _rebuildVectors(): void {
    this.vocabulary.clear();
    this.idfCache.clear();
    this.documentVectors = {};

    // Build vocabulary
    for (const doc of this.documents.values()) {
      const tokens = this._tokenize(doc.content);
      tokens.forEach((token) => this.vocabulary.add(token));
    }

    // Calculate TF for each document
    for (const [docId, doc] of this.documents) {
      const tokens = this._tokenize(doc.content);
      const frequencies: TokenFrequency = {};

      // Calculate term frequencies
      tokens.forEach((token) => {
        frequencies[token] = (frequencies[token] || 0) + 1;
      });

      // Store document vector info
      this.documentVectors[docId] = {
        tokens: new Set(tokens),
        frequencies,
        magnitude: 0, // Will be set after IDF calculation
      };
    }

    // Calculate IDF for all terms
    const totalDocs = this.documents.size;
    for (const term of this.vocabulary) {
      let docsWithTerm = 0;
      for (const docData of Object.values(this.documentVectors)) {
        if (docData.tokens.has(term)) {
          docsWithTerm++;
        }
      }
      const idf = Math.log((totalDocs + 1) / (docsWithTerm + 1));
      this.idfCache.set(term, idf);
    }

    // Calculate document magnitudes
    for (const docData of Object.values(this.documentVectors)) {
      let magnitude = 0;
      for (const [term, freq] of Object.entries(docData.frequencies)) {
        const idf = this.idfCache.get(term) || 0;
        const tfidf = freq * idf;
        magnitude += tfidf * tfidf;
      }
      docData.magnitude = Math.sqrt(magnitude);
    }

    this.vectorsDirty = false;
  }

  /**
   * Calculate TF-IDF vector for query terms
   */
  private _calculateTFIDFVector(tokens: string[]): Record<string, number> {
    const vector: Record<string, number> = {};

    // Count term frequencies in query
    const frequencies: TokenFrequency = {};
    tokens.forEach((token) => {
      frequencies[token] = (frequencies[token] || 0) + 1;
    });

    // Calculate TF-IDF for each term
    for (const [term, freq] of Object.entries(frequencies)) {
      const idf = this.idfCache.get(term) || 0;
      vector[term] = freq * idf;
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between query vector and document vector
   */
  private _cosineSimilarity(
    queryVector: Record<string, number>,
    docData: (typeof this.documentVectors)[string]
  ): number {
    let dotProduct = 0;

    // Calculate dot product
    for (const [term, queryScore] of Object.entries(queryVector)) {
      const freq = docData.frequencies[term] || 0;
      if (freq > 0) {
        const idf = this.idfCache.get(term) || 0;
        const docScore = freq * idf;
        dotProduct += queryScore * docScore;
      }
    }

    // Calculate magnitudes
    let queryMagnitude = 0;
    for (const score of Object.values(queryVector)) {
      queryMagnitude += score * score;
    }
    queryMagnitude = Math.sqrt(queryMagnitude);

    const docMagnitude = docData.magnitude;

    // Cosine similarity
    if (queryMagnitude === 0 || docMagnitude === 0) {
      return 0;
    }

    return dotProduct / (queryMagnitude * docMagnitude);
  }
}
