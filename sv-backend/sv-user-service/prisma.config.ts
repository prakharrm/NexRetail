import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const dbUrl: string = env("DATABASE_URL") as string;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
} as any);
