const express = require("express");
const app = express();

app.use(express.json());

const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const eventRoutes = require("./routes/events");

app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/events", eventRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
