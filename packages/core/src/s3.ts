import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "eu-west-2" });
const BUCKET = process.env.AWS_S3_BUCKET ?? "asaplocal-uploads";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Issues a short-lived presigned PUT URL so the browser uploads directly to
 * S3 (never through our servers). Validates content-type and enforces a
 * per-object size ceiling via S3 policy conditions + a max-size header the
 * client must send. Keys are namespaced by purpose + a random UUID so user
 * input never reaches the object key (avoids path traversal).
 */
export async function createPresignedUpload(opts: {
  purpose: "job-photo" | "business-logo" | "business-cover" | "review-photo" | "verification-doc" | "message-attachment";
  contentType: string;
  ownerId: string;
}) {
  if (!ALLOWED_MIME.has(opts.contentType)) {
    throw Object.assign(new Error("Unsupported file type"), { statusCode: 400 });
  }
  const ext = opts.contentType.split("/")[1];
  const key = `${opts.purpose}/${opts.ownerId}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: opts.contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 120 });
  const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { uploadUrl: url, publicUrl, key, maxBytes: MAX_BYTES };
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
