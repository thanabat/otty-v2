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
  const allUsers = await collection
    .find(
      {},
      {
        projection: {
          _id: 1,
          "personal_info.nickname": 1,
          "personal_info.fullname": 1
        }
      }
    )
    .toArray();

  const nicknameIndex = new Map();
  const fullNameIndex = new Map();
  const shortNameIndex = new Map();

  for (const user of allUsers) {
    addIndexValue(nicknameIndex, normalizeString(user?.personal_info?.nickname), user);
    addIndexValue(fullNameIndex, normalizeString(user?.personal_info?.fullname), user);
    addIndexValue(
      shortNameIndex,
      extractShortName(user?.personal_info?.fullname),
      user
    );
  }

  const cursor = collection.find(
    {
      "working_info.referrer": { $type: "string" },
      $or: [
        { "working_info.referrer_user_id": { $exists: false } },
        { "working_info.referrer_user_id": null },
        { "working_info.referrer_user_id": "" }
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
  let scannedCount = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let skippedCount = 0;

  for await (const user of cursor) {
    scannedCount += 1;
    const referrer = normalizeString(user?.working_info?.referrer);

    if (!referrer) {
      skippedCount += 1;
      continue;
    }

    const resolution = resolveReferrer(referrer, {
      nicknameIndex,
      fullNameIndex,
      shortNameIndex
    });

    if (resolution.status === "matched") {
      matchedCount += 1;
      operations.push({
        updateOne: {
          filter: {
            _id: user._id,
            $or: [
              { "working_info.referrer_user_id": { $exists: false } },
              { "working_info.referrer_user_id": null },
              { "working_info.referrer_user_id": "" }
            ]
          },
          update: {
            $set: {
              "working_info.referrer_user_id": resolution.user._id.toString(),
              "working_info.referrer":
                buildReferrerSnapshot(resolution.user?.personal_info) ?? referrer,
              updated_at: new Date()
            }
          }
        }
      });
      continue;
    }

    if (resolution.status === "ambiguous") {
      ambiguousCount += 1;
      continue;
    }

    skippedCount += 1;
  }

  if (operations.length === 0) {
    console.log(
      JSON.stringify(
        {
          scannedCount,
          matchedCount: 0,
          ambiguousCount,
          skippedCount,
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
        scannedCount,
        matchedCount,
        ambiguousCount,
        skippedCount,
        modifiedCount: result.modifiedCount
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

function resolveReferrer(referrer, indexes) {
  const lookupKeys = buildLookupKeys(referrer);

  for (const key of lookupKeys) {
    const nicknameMatches = uniqueUsers(indexes.nicknameIndex.get(key) ?? []);

    if (nicknameMatches.length === 1) {
      return {
        status: "matched",
        user: nicknameMatches[0]
      };
    }

    if (nicknameMatches.length > 1) {
      return {
        status: "ambiguous"
      };
    }
  }

  for (const key of lookupKeys) {
    const fullNameMatches = uniqueUsers(indexes.fullNameIndex.get(key) ?? []);

    if (fullNameMatches.length === 1) {
      return {
        status: "matched",
        user: fullNameMatches[0]
      };
    }

    if (fullNameMatches.length > 1) {
      return {
        status: "ambiguous"
      };
    }
  }

  for (const key of lookupKeys) {
    const shortNameMatches = uniqueUsers(indexes.shortNameIndex.get(key) ?? []);

    if (shortNameMatches.length === 1) {
      return {
        status: "matched",
        user: shortNameMatches[0]
      };
    }

    if (shortNameMatches.length > 1) {
      return {
        status: "ambiguous"
      };
    }
  }

  return {
    status: "unmatched"
  };
}

function addIndexValue(index, key, user) {
  for (const lookupKey of buildLookupKeys(key)) {
    const existing = index.get(lookupKey) ?? [];
    existing.push(user);
    index.set(lookupKey, existing);
  }
}

function uniqueUsers(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item._id);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function buildLookupKeys(value) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return [];
  }

  const keys = new Set([normalized]);
  const apostropheNormalized = normalized.replace(/[’`]/g, "'");
  keys.add(apostropheNormalized);

  const withoutPossessive = apostropheNormalized.replace(/'s$/i, "");
  keys.add(withoutPossessive);

  const withoutApostrophes = withoutPossessive.replace(/'/g, "");
  keys.add(withoutApostrophes);

  const compact = withoutApostrophes.replace(/\s+/g, "");
  keys.add(compact);

  return [...keys].filter(Boolean);
}

function extractShortName(value) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const [firstPart] = normalized.split(/\s+/);
  return firstPart ?? normalized;
}

function buildReferrerSnapshot(personalInfo) {
  const nickname = normalizeDisplayString(personalInfo?.nickname);

  if (nickname) {
    return nickname;
  }

  return extractDisplayShortName(personalInfo?.fullname);
}

function normalizeDisplayString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractDisplayShortName(value) {
  const normalized = normalizeDisplayString(value);

  if (!normalized) {
    return null;
  }

  const [firstPart] = normalized.split(/\s+/);
  return firstPart ?? normalized;
}

main().catch(async (error) => {
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
