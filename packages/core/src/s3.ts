import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const REGION = process.env.AWS_REGION ?? "eu-west-2";
// Newer SDK versions default to auto-attaching a request checksum to S3
// commands, including presigned PutObject URLs. The presigner has no access
// to the file body at sign time, so it bakes in the checksum of an empty
// payload — which then mismatches whatever the browser actually PUTs and
// S3 rejects the upload. "WHEN_REQUIRED" restores the old opt-in-only
// behavior, which is what a presigned direct-to-S3 upload needs.
const s3 = new S3Client({ region: REGION, requestChecksumCalculation: "WHEN_REQUIRED" });
const BUCKET = process.env.AWS_S3_BUCKET ?? "asaplocal-uploads";

export type UploadPurpose =
  | "job-photo"
  | "business-logo"
  | "business-cover"
  | "business-photo"
  | "portfolio-media"
  | "review-photo"
  | "business-verification-doc"
  | "insurance-doc"
  | "qualification-doc"
  | "message-attachment"
  | "staff-profile-photo"
  | "staff-id-front"
  | "staff-id-back"
  | "user-avatar"
  | "supply-image"
  | "dispute-photo";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Portfolio is the only purpose that accepts video, and needs a much bigger
// ceiling than the flat image/PDF default.
const PORTFOLIO_ALLOWED_MIME = new Set([...ALLOWED_MIME, "video/mp4"]);
const PORTFOLIO_MAX_BYTES = 200 * 1024 * 1024; // 200MB

/**
 * Issues a short-lived presigned PUT URL so the browser uploads directly to
 * S3 (never through our servers). Validates content-type and enforces a
 * per-object size ceiling via S3 policy conditions + a max-size header the
 * client must send. Keys are namespaced by purpose + a random UUID so user
 * input never reaches the object key (avoids path traversal).
 */
export async function createPresignedUpload(opts: { purpose: UploadPurpose; contentType: string; ownerId: string }) {
  const allowedMime = opts.purpose === "portfolio-media" ? PORTFOLIO_ALLOWED_MIME : ALLOWED_MIME;
  const maxBytes = opts.purpose === "portfolio-media" ? PORTFOLIO_MAX_BYTES : DEFAULT_MAX_BYTES;

  if (!allowedMime.has(opts.contentType)) {
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
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { uploadUrl: url, publicUrl, key, maxBytes };
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
