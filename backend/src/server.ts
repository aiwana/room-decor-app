
import express from "express";

const app = express();
const PORT = 3000;

// Cho phép backend đọc request có nội dung JSON
app.use(express.json());

// API kiểm tra trạng thái backend
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Room Decor AI backend is running",
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Backend is running at http://localhost:${PORT}`);
});