const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAdmin } = require("../middleware/adminAuth");

function parseImages(images) {
  if (!images) return [];

  if (Array.isArray(images)) {
    return images
      .map((image) => String(image || "").trim())
      .filter(Boolean);
  }

  if (typeof images === "string") {
    const trimmed = images.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((image) => String(image || "").trim())
          .filter(Boolean);
      }
    } catch (err) {
      return trimmed
        .split(",")
        .map((image) => String(image || "").trim())
        .filter(Boolean);
    }
  }

  return [];
}

function validateGalleryInput(req, res, next) {
  const { name, date } = req.body;
  const images = parseImages(req.body.images);

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Gallery event name is required." });
  }

  if (!date || !date.trim()) {
    return res.status(400).json({ message: "Gallery date is required." });
  }

  if (!images.length) {
    return res.status(400).json({
      message: "Please add at least one picture to the gallery entry.",
    });
  }

  req.body.images = images;
  next();
}

router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM gallery_items ORDER BY date DESC, id DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        rows.map((row) => ({
          ...row,
          images: parseImages(row.images),
        })),
      );
    },
  );
});

router.post("/", requireAdmin, validateGalleryInput, (req, res) => {
  const { name, description, date, images } = req.body;
  db.run(
    "INSERT INTO gallery_items (name, description, date, images) VALUES (?, ?, ?, ?)",
    [name.trim(), description || "", date.trim(), JSON.stringify(images)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Gallery entry created successfully.",
        galleryId: this.lastID,
      });
    },
  );
});

router.put("/:id", requireAdmin, validateGalleryInput, (req, res) => {
  const { id } = req.params;
  const { name, description, date, images } = req.body;
  db.run(
    "UPDATE gallery_items SET name = ?, description = ?, date = ?, images = ? WHERE id = ?",
    [name.trim(), description || "", date.trim(), JSON.stringify(images), id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Gallery entry not found." });
      }
      res.json({ message: "Gallery entry updated successfully." });
    },
  );
});

router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM gallery_items WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ message: "Gallery entry not found." });
    }
    res.json({ message: "Gallery entry removed successfully." });
  });
});

module.exports = router;
