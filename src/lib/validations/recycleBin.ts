import { z } from "zod";
import { paginationQuery, queryDate, queryString } from "./common";

/** GET /api/recycle-bin */
export const recycleBinListQuerySchema = paginationQuery(100, 500).extend({
  source: queryString,
  trashed_by: queryString,
  startDate: queryDate,
  endDate: queryDate,
});

/** POST /api/recycle-bin/restore, DELETE /api/recycle-bin */
export const recycleBinIdsSchema = z.object({
  ids: z
    .array(z.string().min(1), { message: "No ids provided" })
    .min(1, "No ids provided")
    .max(500, "Too many ids"),
});
