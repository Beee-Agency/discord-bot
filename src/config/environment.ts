import dotenv from "dotenv";
import { EnvironmentConfig } from "../types";

dotenv.config();

const requiredEnvVars = [
  "DISCORD_TOKEN",
  "CHANNEL_ID",
  "N8N_WEBHOOK_URL",
] as const;

function validateEnvironment(): EnvironmentConfig {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}`
    );
  }

  return {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
    CHANNEL_ID: process.env.CHANNEL_ID!,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL!,
  };
}

export const config = validateEnvironment();
