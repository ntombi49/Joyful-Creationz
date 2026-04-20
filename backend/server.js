require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { requireAdmin } = require("./middleware/adminAuth");

const app = express();
const PORT = process.env.PORT || 3000;
const imagesDir = path.join(__dirname, "public", "images");

fs.mkdirSync(imagesDir, { recursive: true });

const upload = multer({
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_.]/g, "")
        .toLowerCase();
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

app.use(cors());
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/images", express.static(imagesDir));

app.post("/api/uploads", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  res.json({
    filename: req.file.filename,
    url: `/images/${req.file.filename}`,
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/users", require("./routes/users"));
app.use("/api/partners", require("./routes/partners"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/tickets", require("./routes/tickets"));
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image files must be smaller than 8MB." });
  }

  if (err && err.message) {
    return res.status(400).json({ error: err.message });
  }

  console.error("Unhandled server error:", err);
  return res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
