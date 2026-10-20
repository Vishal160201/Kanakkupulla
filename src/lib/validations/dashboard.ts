import { z } from "zod";
import { queryDate } from "./common";
import { shopIdQuery } from "./shops";

/** GET /api/dashboard/overview */
export const dashboardOverviewQuerySchema = z.object({
  startDate: queryDate,
  endDate: queryDate,
  shopId: shopIdQuery,
});

/** GET /api/analytics/unified */
export const analyticsQuerySchema = z.object({
  startDate: queryDate,
  endDate: queryDate,
  range: z.enum(["today", "this-week", "this-month", "this-year", "custom"]).optional().catch("this-month"),
  shopId: shopIdQuery,
});
