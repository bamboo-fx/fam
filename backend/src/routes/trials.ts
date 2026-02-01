import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ingestTrials,
  getAllTrials,
  getTrialByNctId,
} from "../services/firecrawl";

const trialsRouter = new Hono();

// ============================================
// POST /api/trials/ingest
// Trigger trial ingestion from ClinicalTrials.gov
// ============================================
trialsRouter.post("/ingest", async (c) => {
  try {
    console.log("[Trials API] Starting trial ingestion...");
    const result = await ingestTrials();

    return c.json({
      data: {
        count: result.count,
        message: `Successfully ingested ${result.count} trials from ClinicalTrials.gov`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Trials API] Ingestion failed:", message);
    return c.json(
      {
        error: {
          message: `Failed to ingest trials: ${message}`,
          code: "INGESTION_FAILED",
        },
      },
      500
    );
  }
});

// ============================================
// GET /api/trials
// List all available trials
// ============================================

trialsRouter.get("/", async (c) => {
  try {
    console.log("[Trials API] Fetching all trials");
    const trials = await getAllTrials();

    return c.json({ data: trials });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Trials API] Failed to fetch trials:", message);
    return c.json(
      {
        error: {
          message: `Failed to fetch trials: ${message}`,
          code: "FETCH_FAILED",
        },
      },
      500
    );
  }
});

// ============================================
// GET /api/trials/:nctId
// Get a single trial by NCT ID
// ============================================
const nctIdParamSchema = z.object({
  nctId: z.string().regex(/^NCT\d{8}$/, "Invalid NCT ID format"),
});

trialsRouter.get("/:nctId", zValidator("param", nctIdParamSchema), async (c) => {
  try {
    const { nctId } = c.req.valid("param");
    console.log(`[Trials API] Fetching trial: ${nctId}`);

    const trial = await getTrialByNctId(nctId);

    if (!trial) {
      return c.json(
        {
          error: {
            message: `Trial not found: ${nctId}`,
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    return c.json({ data: trial });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Trials API] Failed to fetch trial:`, message);
    return c.json(
      {
        error: {
          message: `Failed to fetch trial: ${message}`,
          code: "FETCH_FAILED",
        },
      },
      500
    );
  }
});

export { trialsRouter };
