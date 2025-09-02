const request = require("supertest");
const express = require("express");
const carsRouter = require("../../routes/cars");

// Моки для контроллера и middleware
jest.mock("../../controllers/carsController");
jest.mock("../../middleware/adminCheck", () => ({
  requireAdmin: (req, res, next) => next(), // Мок middleware, просто пропускаем запрос дальше
}));

const app = express();
app.use(express.json());
app.use("/api/cars", carsRouter);

describe("Cars Routes", () => {
  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
  });

  describe("GET /api/cars/brands", () => {
    it("should return 200 and call getBrands", async () => {
      const { getBrands } = require("../../controllers/carsController");
      getBrands.mockImplementation((req, res) =>
        res.status(200).json({ success: true })
      );

      const response = await request(app).get("/api/cars/brands");

      expect(response.statusCode).toBe(200);
      expect(getBrands).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/cars/brands", () => {
    it("should return 200 and call addBrands", async () => {
      const { addBrands } = require("../../controllers/carsController");
      addBrands.mockImplementation((req, res) =>
        res.status(200).json({ success: true })
      );

      const response = await request(app)
        .post("/api/cars/brands")
        .send({ name: "Test Brand" });

      expect(response.statusCode).toBe(200);
      expect(addBrands).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /api/cars/brands/batch", () => {
    it("should return 200 and call deleteBrands", async () => {
      const { deleteBrands } = require("../../controllers/carsController");
      deleteBrands.mockImplementation((req, res) =>
        res.status(200).json({ success: true })
      );

      const response = await request(app)
        .delete("/api/cars/brands/batch")
        .send({ ids: [1, 2, 3] });

      expect(response.statusCode).toBe(200);
      expect(deleteBrands).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/cars/models", () => {
    it("should return 200 and call getModelsByBrand", async () => {
      const { getModelsByBrand } = require("../../controllers/carsController");
      getModelsByBrand.mockImplementation((req, res) =>
        res.status(200).json({ success: true })
      );

      const response = await request(app).get("/api/cars/models?brandId=1");

      expect(response.statusCode).toBe(200);
      expect(getModelsByBrand).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/cars/models/batch", () => {
    it("should return 200 and call addModels", async () => {
      const { addModels } = require("../../controllers/carsController");
      addModels.mockImplementation((req, res) =>
        res.status(200).json({ success: true })
      );

      const response = await request(app)
        .post("/api/cars/models/batch")
        .send([{ name: "Model 1" }, { name: "Model 2" }]);

      expect(response.statusCode).toBe(200);
      expect(addModels).toHaveBeenCalledTimes(1);
    });
  });

  // Добавьте аналогичные тесты для остальных маршрутов
  // ...

  describe("Error handling", () => {
    it("should return 500 when controller throws error", async () => {
      const { getBrands } = require("../../controllers/carsController");
      getBrands.mockImplementation((req, res) => {
        throw new Error("Test error");
      });

      const response = await request(app).get("/api/cars/brands");

      expect(response.statusCode).toBe(500);
    });
  });
});
