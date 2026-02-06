/**
 * API routes for RAG operations
 * GET: Search the RAG store
 * POST: Add context/feedback to the RAG store
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnhancedKnowledgeService } from "@/lib/rag/enhanced-knowledge-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const limit = searchParams.get("limit");
    const minScore = searchParams.get("minScore");
    const type = searchParams.get("type");

    if (!query) {
      return NextResponse.json(
        { error: "Missing required parameter: query" },
        { status: 400 }
      );
    }

    const ragService = getEnhancedKnowledgeService();

    const results = ragService.search(query, {
      limit: limit ? parseInt(limit, 10) : undefined,
      minScore: minScore ? parseFloat(minScore) : undefined,
    });

    return NextResponse.json({
      success: true,
      query,
      resultCount: results.length,
      results: results.map((r) => ({
        documentId: r.document.id,
        type: r.document.type,
        score: r.score,
        content: r.document.content.substring(0, 300),
        metadata: r.document.metadata,
        createdAt: r.document.createdAt,
      })),
    });
  } catch (error) {
    console.error("RAG search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search RAG store",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required parameter: action" },
        { status: 400 }
      );
    }

    const ragService = getEnhancedKnowledgeService();

    if (action === "index-knowledge-base") {
      ragService.indexKnowledgeBase();
      ragService.save();

      return NextResponse.json({
        success: true,
        message: "Knowledge base indexed successfully",
        stats: ragService.getStats(),
      });
    } else if (action === "add-analysis") {
      if (!params.entity || !params.period || !params.accountDeviations) {
        return NextResponse.json(
          {
            error:
              "Missing required parameters: entity, period, accountDeviations",
          },
          { status: 400 }
        );
      }

      ragService.addHistoricalAnalysis({
        entity: params.entity,
        period: params.period,
        accountDeviations: params.accountDeviations,
      });

      ragService.save();

      return NextResponse.json({
        success: true,
        message: "Historical analysis added to RAG store",
        stats: ragService.getStats(),
      });
    } else if (action === "get-stats") {
      return NextResponse.json({
        success: true,
        stats: ragService.getStats(),
      });
    } else if (action === "export") {
      const json = ragService.exportAsJson();
      return NextResponse.json({
        success: true,
        data: json,
      });
    } else if (action === "clear") {
      ragService.clear();
      ragService.save();

      return NextResponse.json({
        success: true,
        message: "RAG store cleared",
      });
    } else {
      return NextResponse.json(
        {
          error: `Unknown action: ${action}`,
          validActions: [
            "index-knowledge-base",
            "add-analysis",
            "get-stats",
            "export",
            "clear",
          ],
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("RAG POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to process RAG request",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
