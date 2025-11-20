import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware для обработки BigInt в JSON
const bigIntReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Переопределяем res.json для обработки BigInt
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    return originalJson(JSON.parse(JSON.stringify(body, bigIntReplacer)));
  };
  next();
});

// Debug middleware to log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes (используем require для CommonJS модулей)
// @ts-ignore - роуты используют CommonJS
const carsRoutes = require("./routes/cars");
// @ts-ignore
const filesRoutes = require("./routes/files");
// @ts-ignore
const infoRoutes = require("./routes/info");
// @ts-ignore
const subscriptionRoutes = require("./routes/subscription");
// @ts-ignore
const adminRoutes = require("./routes/admin");
// @ts-ignore
const usersRoutes = require("./routes/users");

// Swagger документация
// @ts-ignore
const swaggerUi = require("swagger-ui-express");
// @ts-ignore
const swaggerSpec = require("./config/swagger");

// Swagger UI endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Auto Signal API Documentation"
}));

app.use("/api/cars", carsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/info", infoRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);

// Debug endpoint to list all routes
app.get("/debug/routes", (req: Request, res: Response) => {
  interface RouteInfo {
    path: string;
    methods: string[];
  }

  const routes: RouteInfo[] = [];

  try {
    // Для Express 5.x используем другой способ получения маршрутов
    const router = (app as any)._router || (app as any).router;
    
    if (router && router.stack) {
      router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods),
          });
        } else if (middleware.name === "router" && middleware.handle && middleware.handle.stack) {
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
    }

    // Если не удалось получить маршруты, возвращаем список вручную
    if (routes.length === 0) {
      routes.push(
        { path: "/api/cars/brands", methods: ["GET", "POST"] },
        { path: "/api/cars/models", methods: ["GET", "POST"] },
        { path: "/api/files/years/:yearId/files", methods: ["GET"] },
        { path: "/api/info/help", methods: ["GET"] },
        { path: "/api/subscription/prices", methods: ["GET"] },
        { path: "/api/subscription/user/:userId", methods: ["GET", "POST", "DELETE"] },
        { path: "/api/users/register", methods: ["POST"] },
        { path: "/api/users/:userId", methods: ["GET", "PUT"] },
        { path: "/api/users", methods: ["GET"] },
        { path: "/api/admin/stats", methods: ["GET"] },
        { path: "/debug/routes", methods: ["GET"] }
      );
    }
  } catch (error) {
    console.error("Error getting routes:", error);
  }

  res.json({
    message: "Available routes",
    routes: routes,
    note: "Some routes may require authentication (admin token)"
  });
});

// Обработка ошибок
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Экспортируем app для тестирования
export default app;

// Запускаем сервер только если файл запущен напрямую
// @ts-ignore - require.main проверка для CommonJS
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });
}
