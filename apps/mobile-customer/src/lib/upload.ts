import { api } from './api';

export type UploadPurpose = 'job-photo' | 'user-avatar';

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Requests a presigned S3 URL and PUTs the local image straight to S3 —
 * same two-step flow as the web app's lib/upload.ts, adapted for a local
 * file:// URI instead of a browser File object (fetch(uri) turns it into a
 * Blob, which is what RN's fetch/XHR polyfill knows how to upload).
 */
export async function uploadImage(localUri: string, purpose: UploadPurpose, contentType = 'image/jpeg'): Promise<string> {
  const { uploadUrl, publicUrl } = await api.request<PresignResponse>('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({ purpose, contentType }),
  });

  const blob = await (await fetch(localUri)).blob();
  const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
  if (!putRes.ok) throw new Error('Upload to storage failed');

  return publicUrl;
}
