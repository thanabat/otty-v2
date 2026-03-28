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
  const cursor = collection.find(
    {
      $and: [
        {
          $or: [
            { working_experiences: { $exists: false } },
            { working_experiences: { $size: 0 } }
          ]
        },
        {
          $or: [
            { "working_info.current_site": { $type: "string" } },
            { "working_info.current_site_other": { $type: "string" } },
            { "working_info.project": { $type: "string" } }
          ]
        }
      ]
    },
    {
      projection: {
        _id: 1,
        working_info: 1
      }
    }
  );

  const operations = [];

  for await (const user of cursor) {
    const site =
      normalizeCurrentSite(user?.working_info?.current_site) ??
      normalizeCurrentSite(user?.working_info?.current_site_other);
    const project = normalizeString(user?.working_info?.project);
    const joiningYear = normalizeYear(user?.working_info?.joining_year);

    if (!site && !project) {
      continue;
    }

    operations.push({
      updateOne: {
        filter: {
          _id: user._id,
          $or: [
            { working_experiences: { $exists: false } },
            { working_experiences: { $size: 0 } }
          ]
        },
        update: {
          $set: {
            working_experiences: [
              {
                _id: new mongoose.Types.ObjectId(),
                site: site ?? null,
                project: project ?? null,
                start_year: joiningYear,
                end_year: null,
                is_current: true
              }
            ],
            "working_info.current_site": site ?? null,
            "working_info.current_site_other": null,
            "working_info.project": project ?? null,
            updated_at: new Date()
          }
        }
      }
    });
  }

  if (operations.length === 0) {
    console.log(
      JSON.stringify(
        {
          matchedCount: 0,
          modifiedCount: 0
        },
        null,
        2
      )
    );

    await mongoose.disconnect();
    return;
  }

  const result = await collection.bulkWrite(operations, {
    ordered: false
  });

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

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCurrentSite(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeYear(value) {
  return Number.isInteger(value) && value >= 1900 && value <= 3000 ? value : null;
}

main().catch(async (error) => {
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
