const baseUrl = "http://localhost:3000"; // Update if your backend port is different

// Fetch and display all events
async function loadEvents() {
  const eventsDiv = document.getElementById("events");
  eventsDiv.innerHTML = "<p>Loading events...</p>";

  try {
    const res = await fetch(`${baseUrl}/events`);
    console.log("Fetch response:", res);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const events = await res.json();
    console.log("Events received:", events);

    eventsDiv.innerHTML = ""; // Clear loading message

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
    eventsDiv.innerHTML = `
      <p>Failed to load events.</p>
      <p>Check the console for details.</p>
    `;
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
    console.log("Registration response:", data);
    alert(data.message);
  } catch (err) {
    console.error("Registration failed:", err);
    alert("Registration failed. Check console for details.");
  }
}

// Load events when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, fetching events...");
  loadEvents();
});
