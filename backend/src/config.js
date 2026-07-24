import "dotenv/config";
export const config = Object.freeze({
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "postgresql://wielerpool:wielerpool@127.0.0.1:5432/wielerpool",
  databaseSsl: process.env.DATABASE_SSL === "true",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:8125"
});