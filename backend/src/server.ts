import { app } from "./app";

const PORT = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;

// Khởi động server
app.listen(PORT, () => {
  console.log(`Backend is running at http://localhost:${PORT}`);
});
