/**
 * Environment variables configuration with validation
 */

function validateEnv() {
  const required = ["DATABASE_URL"];
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
  jwtSecret: process.env.JWT_SECRET ?? "fallback_secret_for_latyar_factory",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
};
