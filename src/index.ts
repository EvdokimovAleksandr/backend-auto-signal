import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // для парсинга JSON-тела запросов

// Простейший route для проверки работы сервера
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Здесь позже будут подключаться маршруты вашего API
// app.use('/api/users', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
