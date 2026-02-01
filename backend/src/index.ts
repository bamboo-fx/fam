import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { auth } from "./auth";
import { sampleRouter } from "./routes/sample";
import { patientsRouter } from "./routes/patients";
import { trialsRouter } from "./routes/trials";
import { matchesRouter } from "./routes/matches";
import { logger } from "hono/logger";
import { ensureIndexes } from "./services/mongodb";
import { ingestTrials } from "./services/firecrawl";

// Type the Hono app with user/session variables
const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Auth middleware - populates user/session for all routes
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// Mount auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Get current user
app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);
  return c.json({ data: { user } });
});

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/patients", patientsRouter);
app.route("/api/trials", trialsRouter);
app.route("/api/matches", matchesRouter);

const port = Number(process.env.PORT) || 3000;

// ============================================
// Startup Logic
// ============================================

async function startupTasks() {
  try {
    // Initialize MongoDB indexes
    console.log("[Startup] Initializing MongoDB indexes...");
    await ensureIndexes();
    console.log("[Startup] MongoDB indexes initialized successfully");

    // Automatically ingest trials on startup (for demo)
    console.log("[Startup] Starting automatic trial ingestion...");
    const result = await ingestTrials();
    console.log(`[Startup] Ingested ${result.count} trials from ClinicalTrials.gov`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Startup] Startup tasks failed:", message);
    // Don't throw - allow server to start even if ingestion fails
  }
}

// Run startup tasks
startupTasks();

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120, // 2 minutes - needed for long-running SSE connections during matching
};
