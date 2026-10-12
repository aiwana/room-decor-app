import { app } from "./routes";
import { config } from "./config";
import { initializeDatabase, pool } from "./db";

const start = async (): Promise<void> => {
  await initializeDatabase();
  app.listen(config.PORT, () => {
    console.log(`Backend is running at http://localhost:${config.PORT}`);
  });
};

void start().catch(async (error: unknown) => {
  console.error("Backend startup failed", error);
  await pool.end();
  process.exitCode = 1;
});
