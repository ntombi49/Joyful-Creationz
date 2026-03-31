const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Joyful Creationz API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
