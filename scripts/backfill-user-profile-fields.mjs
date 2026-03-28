import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(repoRoot, "apps/api");

for (const envPath of [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, ".env.local"),
  path.join(apiDir, ".env"),
  path.join(apiDir, ".env.local")
]) {
  loadEnv({
    path: envPath,
    override: false
  });
}

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  console.error("MONGODB_URI is missing. Check apps/api/.env.local");
  process.exit(1);
}

async function main() {
  await mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 5000
  });

  const collection = mongoose.connection.db.collection("users");

  const result = await collection.updateMany(
    {
      $or: [
        { "personal_info.phone": { $exists: false } },
        { "personal_info.bio": { $exists: false } },
        { "working_info.title": { $exists: false } }
      ]
    },
    [
      {
        $set: {
          "personal_info.phone": { $ifNull: ["$personal_info.phone", null] },
          "personal_info.bio": { $ifNull: ["$personal_info.bio", null] },
          "working_info.title": { $ifNull: ["$working_info.title", null] }
        }
      }
    ]
  );

  console.log(
    JSON.stringify(
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
