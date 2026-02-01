import { MongoClient, Db, Collection } from "mongodb";
import { env } from "../env";
import type {
  PatientDocument,
  ClinicalTrialDocument,
  MatchResultDocument,
} from "../types";

// ============================================
// MongoDB Client Configuration
// ============================================

let client: MongoClient | null = null;
let db: Db | null = null;

const MONGODB_OPTIONS = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,

  // Timeouts - increased for cloud connections
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 30000,

  // Retry settings
  retryWrites: true,
  retryReads: true,
};

// ============================================
// Connection Management
// ============================================

/**
 * Get or create the MongoDB client connection
 * Uses connection pooling for efficient resource usage
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  try {
    client = new MongoClient(env.MONGODB_URI, MONGODB_OPTIONS);
    await client.connect();

    // Verify connection with a ping
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB connected successfully");

    return client;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    client = null;
    throw new Error("MongoDB connection failed");
  }
}

/**
 * Get the database instance
 * Database name is extracted from the connection URI or defaults to 'clinical_trials'
 */
export async function getDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoClient = await getMongoClient();

  // Extract database name from URI or use default
  const uriMatch = env.MONGODB_URI.match(/\/([^/?]+)(\?|$)/);
  const dbName = uriMatch?.[1] || "clinical_trials";

  db = mongoClient.db(dbName);
  return db;
}

/**
 * Close the MongoDB connection
 * Should be called during graceful shutdown
 */
export async function closeMongoConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("MongoDB connection closed");
  }
}

// ============================================
// Typed Collection Accessors
// ============================================

/**
 * Get the patients collection with TypeScript typing
 */
export async function getPatientsCollection(): Promise<Collection<PatientDocument>> {
  const database = await getDatabase();
  return database.collection<PatientDocument>("patients");
}

/**
 * Get the clinical trials collection with TypeScript typing
 */
export async function getTrialsCollection(): Promise<Collection<ClinicalTrialDocument>> {
  const database = await getDatabase();
  return database.collection<ClinicalTrialDocument>("trials");
}

/**
 * Get the matches collection with TypeScript typing
 */
export async function getMatchesCollection(): Promise<Collection<MatchResultDocument>> {
  const database = await getDatabase();
  return database.collection<MatchResultDocument>("matches");
}

// ============================================
// Health Check
// ============================================

/**
 * Check if MongoDB connection is healthy
 */
export async function checkMongoHealth(): Promise<{ status: "ok" | "error"; message?: string }> {
  try {
    const mongoClient = await getMongoClient();
    await mongoClient.db("admin").command({ ping: 1 });
    return { status: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", message };
  }
}

// ============================================
// Index Management
// ============================================

/**
 * Ensure all required indexes exist
 * Should be called once during application startup
 */
export async function ensureIndexes(): Promise<void> {
  try {
    const patients = await getPatientsCollection();
    const trials = await getTrialsCollection();
    const matches = await getMatchesCollection();

    // Patient indexes
    await patients.createIndex({ email: 1 }, { unique: true });
    await patients.createIndex({ state: 1 });
    await patients.createIndex({ createdAt: -1 });

    // Trial indexes
    await trials.createIndex({ nctId: 1 }, { unique: true });
    await trials.createIndex({ status: 1 });
    await trials.createIndex({ conditions: 1 });
    await trials.createIndex({ ingestedAt: -1 });

    // Match indexes
    await matches.createIndex({ patientId: 1 });
    await matches.createIndex({ trialId: 1 });
    await matches.createIndex({ patientId: 1, trialId: 1 }, { unique: true });
    await matches.createIndex({ confidenceScore: -1 });
    await matches.createIndex({ createdAt: -1 });

    console.log("MongoDB indexes ensured successfully");
  } catch (error) {
    console.error("Failed to create indexes:", error);
    throw error;
  }
}

// ============================================
// Graceful Shutdown Handler
// ============================================

// Handle process termination
process.on("SIGINT", async () => {
  await closeMongoConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeMongoConnection();
  process.exit(0);
});
