const baseUrl = "http://localhost:3000";

// users
// Create a new user
document.getElementById("userForm").addEventListener("submit", function (e) {
  e.preventDefault();

  fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("New user created:", data))
    .catch((error) => console.error("Error creating user:", error));
});

// Get all users
document.getElementById("getUsers").addEventListener("click", function () {
  fetch(`${baseUrl}/users`)
    .then((res) => res.json())
    .then((data) => console.log("Users:", data))
    .catch((error) => console.error("Error fetching users:", error));
});


// products
// Fetch all products
document.getElementById("getProducts").addEventListener("click", function () {
  fetch(`${baseUrl}/products`)
    .then((res) => res.json())
    .then((data) => console.log("Products:", data))
    .catch((error) => console.error("Error fetching products:", error));
});

// Create a new product
document.getElementById("createProduct").addEventListener("click", function () {
  fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "I'm a Hiker T-Shirt",
      description: "Official Joyful Creationz hiking shirt",
      price: 25.99,
      image: "hiker-shirt.jpg",
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("Product created:", data))
    .catch((error) => console.error("Error creating product:", error));
});

// orders
// Fetch all orders
document.getElementById("getOrders").addEventListener("click", function () {
  fetch(`${baseUrl}/orders`)
    .then((res) => res.json())
    .then((data) => console.log("Orders:", data))
    .catch((error) => console.error("Error fetching orders:", error));
});

// Create new order
document.getElementById("createOrder").addEventListener("click", function () {
  fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: 1,
      product_id: 1,
      quantity: 2,
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("Order created:", data))
    .catch((error) => console.error("Error creating order:", error));
});


// Events
// Fetch all events
document.getElementById("getEvents").addEventListener("click", function () {
  fetch(`${baseUrl}/events`)
    .then((res) => res.json())
    .then((data) => console.log("Events:", data))
    .catch((error) => console.error("Error fetching events:", error));
});

// Create new event
document.getElementById("createEvent").addEventListener("click", function () {
  fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Joyful Creationz Hiking Meetup",
      description: "Community hiking event",
      event_date: "2026-05-10",
      location: "Johannesburg",
    }),
  })
    .then((res) => res.json())
    .then((data) => console.log("Event created:", data))
    .catch((error) => console.error("Error creating event:", error));
});
