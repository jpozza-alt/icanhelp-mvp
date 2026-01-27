import { z } from "zod";

export const ticketCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional().or(z.literal("")),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
});

export const ticketUpdateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["open","in_progress","closed"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
