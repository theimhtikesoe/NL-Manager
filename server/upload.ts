import cloudinaryPkg from "cloudinary";
const cloudinary = cloudinaryPkg.v2;

export const UPLOAD_FOLDER = "nl-manager/proofs";

function loadFromCloudinaryUrl(): boolean {
  if (!process.env.CLOUDINARY_URL) return false;
  cloudinary.config({ secure: true });
  return Boolean(cloudinary.config().cloud_name);
}

function cloudinaryApiKey() {
  return process.env.CLOUDINARY_API_KEY ?? process.env.CLOUDINARY_API;
}

export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL) return loadFromCloudinaryUrl();
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      cloudinaryApiKey() &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function ensureCloudinaryConfig() {
  if (process.env.CLOUDINARY_URL) {
    loadFromCloudinaryUrl();
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: cloudinaryApiKey(),
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export function createSignedUploadParams(): SignedUploadParams {
  ensureCloudinaryConfig();
  const cfg = cloudinary.config();
  const cloudName = cfg.cloud_name;
  const apiKey = cfg.api_key;
  const apiSecret = cfg.api_secret;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: UPLOAD_FOLDER };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret
  );

  return { cloudName, apiKey, timestamp, signature, folder: UPLOAD_FOLDER };
}

/**
 * Server-side upload — avoids browser signature issues and service worker interference.
 * Cloudinary auto-generates public_id; only folder is set.
 */
export async function uploadMedia(
  dataBase64: string,
  contentType: string,
  _fileName: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_* env vars."
    );
  }

  ensureCloudinaryConfig();

  try {
    const result = await cloudinary.uploader.upload(
      `data:${contentType};base64,${dataBase64}`,
      {
        folder: UPLOAD_FOLDER,
        resource_type: "auto",
      }
    );
    return result.secure_url;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary upload failed";
    if (message.includes("Invalid Signature") || message.includes("Invalid api_key")) {
      throw new Error(
        "Cloudinary credentials are invalid. Check CLOUDINARY_URL or API key/secret in server env."
      );
    }
    throw new Error(message);
  }
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return safe || "proof";
}
