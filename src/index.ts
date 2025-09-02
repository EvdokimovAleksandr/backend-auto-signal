const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
// app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/cars", require("./routes/cars"));
app.use("/api/files", require("./routes/files"));
app.use("/api/info", require("./routes/info"));
app.use("/api/subscription", require("./routes/subscription"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/stats", require("./routes/stats"));

// Health check
// app.get("/health", (req, res) => {
//   res.json({ status: "OK", message: "Server is running" });
// });

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
