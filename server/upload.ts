import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./_core/env";

export const UPLOAD_FOLDER = "nl-manager/proofs";

function ensureCloudinaryConfig() {
  if (ENV.cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: ENV.cloudinaryUrl,
      secure: true
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: ENV.cloudinaryApiKey,
      api_secret: ENV.cloudinaryApiSecret,
      secure: true
    });
  }
}

export function isCloudinaryConfigured(): boolean {
  ensureCloudinaryConfig();
  const cfg = cloudinary.config();
  return Boolean(cfg.cloud_name && (cfg.api_key || ENV.cloudinaryUrl));
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
    throw new Error("Cloudinary is not configured properly");
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
 */
export async function uploadMedia(
  dataBase64: string,
  contentType: string,
  _fileName: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_URL."
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
        "Cloudinary credentials are invalid. Check CLOUDINARY_URL."
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
