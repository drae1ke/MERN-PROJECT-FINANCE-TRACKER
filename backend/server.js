const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const financeRoutes = require("./routes/financeRoutes");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/finance", financeRoutes);

// Serve frontend build in production (allows one-command start)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "frontend", "dist");
  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    app.use(express.static(distPath));
    app.get("/{*splat}", (req, res) => {
      res.sendFile(indexPath);
    });
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)))
  .catch((err) => console.error("❌ Database connection error:", err));
