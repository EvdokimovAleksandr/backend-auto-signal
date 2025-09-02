const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Добавляем импорт типов Express
import { Request, Response, NextFunction, Express } from "express";

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Debug middleware to log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/cars", require("./routes/cars"));
app.use("/api/files", require("./routes/files"));
app.use("/api/info", require("./routes/info"));
app.use("/api/subscription", require("./routes/subscription"));
app.use("/api/admin", require("./routes/admin"));

// Debug endpoint to list all routes
app.get("/debug/routes", (req: Request, res: Response) => {
  interface RouteInfo {
    path: string;
    methods: string[];
  }

  const routes: RouteInfo[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json(routes);
});

const PORT = process.env.PORT || 8000;

// Экспортируем app для тестирования
module.exports = app;

// Запускаем сервер только если файл запущен напрямую
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  module.exports.server = server;
}
