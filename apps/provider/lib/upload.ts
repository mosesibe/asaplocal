type UploadPurpose =
  | "job-photo"
  | "business-logo"
  | "business-cover"
  | "business-photo"
  | "portfolio-media"
  | "review-photo"
  | "verification-doc"
  | "message-attachment"
  | "staff-profile-photo"
  | "staff-id-front"
  | "staff-id-back";

/** Requests a presigned S3 URL, PUTs the file directly to S3, and returns its public URL. */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<string> {
  const presignRes = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType: file.type }),
  });
  if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => ({}))).message ?? "Upload failed");
  const { uploadUrl, publicUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Upload to storage failed");

  return publicUrl;
}
