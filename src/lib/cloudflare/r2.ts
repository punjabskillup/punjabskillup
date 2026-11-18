import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

export function getR2Bucket() {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!bucket) {
    throw new Error("Cloudflare R2 bucket is not configured.");
  }
  return bucket;
}

export function getR2Client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not configured.");
  }

  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}
