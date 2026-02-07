/**
 * API route for controller feedback
 * POST: Add controller corrections as learning data
 *
 * This is how the system learns from controller corrections.
 * Each correction is stored and can be retrieved to inform future analyses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnhancedKnowledgeService } from "@/lib/rag/enhanced-knowledge-service";
import { getRequestId, jsonError, sanitizeError } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: "comment", requestId });
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const { account, originalComment, correctedComment, context } = body;

    // Validate required fields
    if (account === undefined || account === null) {
      return jsonError("Missing required parameter: account", 400, requestId);
    }

    if (!originalComment || typeof originalComment !== "string") {
      return jsonError("Missing required parameter: originalComment (string)", 400, requestId);
    }

    if (!correctedComment || typeof correctedComment !== "string") {
      return jsonError("Missing required parameter: correctedComment (string)", 400, requestId);
    }

    // Validate account number
    const accountNum = parseInt(String(account), 10);
    if (isNaN(accountNum) || accountNum < 0) {
      return jsonError("Invalid account number", 400, requestId);
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
    console.error("Feedback API error:", requestId, sanitizeError(error));
    return jsonError("Failed to store controller feedback", 500, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId();
  try {
    const auth = await requireSessionUser(request, { permission: "analyze", requestId });
    if (auth instanceof NextResponse) return auth;

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
    console.error("Feedback GET error:", requestId, sanitizeError(error));
    return jsonError("Failed to retrieve feedback", 500, requestId);
  }
}
