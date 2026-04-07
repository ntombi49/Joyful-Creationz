const baseUrl = "http://localhost:3000";

// create a new user
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
    .then((data) => console.log("New user created:", data));
});

// fetch all products
document.getElementById("getProducts").addEventListener("click", function () {
  fetch(`${baseUrl}/products`)
    .then((res) => res.json())
    .then((data) => console.log("Products:", data));
});
