/**
 * API route for controller feedback
 * POST: Add controller corrections as learning data
 *
 * This is how the system learns from controller corrections.
 * Each correction is stored and can be retrieved to inform future analyses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnhancedKnowledgeService } from "@/lib/rag/enhanced-knowledge-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { account, originalComment, correctedComment, context } = body;

    // Validate required fields
    if (account === undefined || account === null) {
      return NextResponse.json(
        { error: "Missing required parameter: account" },
        { status: 400 }
      );
    }

    if (!originalComment || typeof originalComment !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter: originalComment (string)" },
        { status: 400 }
      );
    }

    if (!correctedComment || typeof correctedComment !== "string") {
      return NextResponse.json(
        { error: "Missing required parameter: correctedComment (string)" },
        { status: 400 }
      );
    }

    // Validate account number
    const accountNum = parseInt(String(account), 10);
    if (isNaN(accountNum) || accountNum < 0) {
      return NextResponse.json(
        { error: "Invalid account number" },
        { status: 400 }
      );
    }

    const ragService = getEnhancedKnowledgeService();

    // Add the controller feedback
    ragService.addControllerFeedback({
      account: accountNum,
      originalComment,
      correctedComment,
      context: context || undefined,
    });

    // Persist to disk
    ragService.save();

    return NextResponse.json({
      success: true,
      message: "Controller feedback stored successfully",
      feedback: {
        account: accountNum,
        originalLength: originalComment.length,
        correctedLength: correctedComment.length,
        hasContext: !!context,
        storedAt: new Date().toISOString(),
      },
      stats: ragService.getStats(),
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      {
        error: "Failed to store controller feedback",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const account = searchParams.get("account");

    const ragService = getEnhancedKnowledgeService();

    if (account) {
      // Search for feedback related to specific account
      const query = `Konto ${account}`;
      const results = ragService.search(query, {
        limit: 10,
        minScore: 0.1,
      });

      const feedbackResults = results.filter(
        (r) => r.document.type === "controller_feedback"
      );

      return NextResponse.json({
        success: true,
        account: account,
        feedbackCount: feedbackResults.length,
        feedback: feedbackResults.map((r) => ({
          id: r.document.id,
          score: r.score,
          content: r.document.content,
          metadata: r.document.metadata,
          createdAt: r.document.createdAt,
        })),
      });
    } else {
      // Return stats about feedback
      const stats = ragService.getStats();

      return NextResponse.json({
        success: true,
        stats: {
          totalFeedbackDocuments:
            stats.controllerFeedbackDocuments,
          totalDocuments: stats.totalDocuments,
          messageCount: `${stats.controllerFeedbackDocuments} controller corrections have been stored`,
        },
      });
    }
  } catch (error) {
    console.error("Feedback GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve feedback",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
