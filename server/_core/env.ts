/**
 * Environment variables configuration with validation
 */

function validateEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("[ENV] Missing required environment variables:", missing.join(", "));
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }
}

if (typeof process !== "undefined") {
  validateEnv();
}

export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
  authDisabled: process.env.AUTH_DISABLED !== "false", // Default to true unless explicitly disabled
  port: parseInt(process.env.PORT || "3000", 10),
};
