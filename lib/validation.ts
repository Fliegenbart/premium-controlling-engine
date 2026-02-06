import { z } from 'zod';

export const bookingSchema = z.object({
  posting_date: z.coerce.string().min(1),
  amount: z.coerce.number(),
  account: z.coerce.number(),
  account_name: z.coerce.string().default(''),
  cost_center: z.coerce.string().default(''),
  profit_center: z.coerce.string().default(''),
  vendor: z.union([z.string(), z.null()]).default(null),
  customer: z.union([z.string(), z.null()]).default(null),
  document_no: z.coerce.string().default(''),
  text: z.coerce.string().default(''),
  entity: z.coerce.string().optional(),
});

export const bookingsArraySchema = z.array(bookingSchema).min(1).max(200000);

export const analyzeBookingsSchema = z.object({
  prevBookings: bookingsArraySchema,
  currBookings: bookingsArraySchema,
});

const chatHistorySchema = z.array(z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
  isLoading: z.boolean().optional(),
})).max(20);

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.unknown(),
  history: chatHistorySchema.optional(),
});

export const summaryRequestSchema = z.object({
  analysisResult: z.unknown(),
  entityName: z.string().max(200).optional(),
});

export const anomalyRequestSchema = z.object({
  deviations: z.array(z.unknown()).min(1),
  context: z.unknown().optional(),
});

export const generateCommentSchema = z.object({
  deviation: z.unknown(),
});

export const documentQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  quick: z.boolean().optional(),
});

export const documentsSearchSchema = z.object({
  question: z.string().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
