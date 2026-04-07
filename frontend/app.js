const baseUrl = "http://localhost:3000";

// Load and display events
async function loadEvents() {
  const eventsDiv = document.getElementById("events");
  eventsDiv.innerHTML = "<p>Loading events...</p>";

  try {
    const res = await fetch(`${baseUrl}/events`);
    const events = await res.json();

    eventsDiv.innerHTML = "";

    if (events.length === 0) {
      eventsDiv.innerHTML = "<p>No events available at the moment.</p>";
      return;
    }

    events.forEach((event) => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${event.name}</h3>
        <p>${event.description || "No description"}</p>
        <p><strong>Date:</strong> ${event.date || "TBA"} | <strong>Location:</strong> ${event.location || "TBA"}</p>
        <button onclick="register(${event.id})">Register</button>
      `;
      eventsDiv.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading events:", err);
    eventsDiv.innerHTML = "<p>Failed to load events.</p>";
  }
}

// Register for an event
async function register(eventId) {
  const name = prompt("Enter your name:");
  const email = prompt("Enter your email:");
  const phone = prompt("Enter your phone number:");

  if (!name || !email || !phone) {
    alert("All fields are required!");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, name, email, phone }),
    });

    const data = await res.json();
    alert(data.message);
  } catch (err) {
    console.error("Registration failed:", err);
    alert("Registration failed. Check console for details.");
  }
}

// Admin panel: add new event
document.getElementById("eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const description = document.getElementById("description").value;
  const date = document.getElementById("date").value;
  const location = document.getElementById("location").value;

  try {
    const res = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, date, location }),
    });

    const data = await res.json();
    const msgDiv = document.getElementById("adminMessage");

    if (res.ok) {
      msgDiv.textContent = `Event "${name}" added successfully!`;
      msgDiv.style.color = "green";
      loadEvents(); // Refresh the events list
      document.getElementById("eventForm").reset();
    } else {
      msgDiv.textContent = `Failed to add event: ${data.message || "Unknown error"}`;
      msgDiv.style.color = "red";
    }
  } catch (err) {
    console.error("Error adding event:", err);
    const msgDiv = document.getElementById("adminMessage");
    msgDiv.textContent = "Error adding event. Check console.";
    msgDiv.style.color = "red";
  }
});

// Toggle admin panel with password protection
document.getElementById("adminToggle").addEventListener("click", () => {
  const adminSection = document.getElementById("admin-section");

  if (adminSection.style.display === "none") {
    // Ask for password before showing admin panel
    const password = prompt("Enter admin password:");

    if (password === "admin123") {
      adminSection.style.display = "block";
      document.getElementById("adminToggle").textContent = "Hide Admin Panel";
    } else if (password !== null) {
      alert("Incorrect password!");
    }
  } else {
    adminSection.style.display = "none";
    document.getElementById("adminToggle").textContent = "Admin Panel";
  }
});

// Load events on page load
loadEvents();
