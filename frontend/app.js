const baseUrl =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;
const ADMIN_PASSWORD = "joyful123";
let currentEditEventId = null;

const mainMessage = document.getElementById("mainMessage");
const adminMessage = document.getElementById("adminMessage");
const modalMessage = document.getElementById("modalMessage");
const adminSection = document.getElementById("admin-section");
const registrationModal = document.getElementById("registrationModal");

function showMessage(element, text, type = "success") {
  if (!element) return;
  element.textContent = text;
  element.classList.remove("hidden", "success", "error");
  element.classList.add(type, "visible");
}

function hideMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.classList.add("hidden");
  element.classList.remove("visible", "success", "error");
}

function formatDate(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setAdminMode(enabled) {
  if (!adminSection) return;
  adminSection.classList.toggle("hidden", !enabled);
  const adminToggle = document.getElementById("adminToggle");
  if (adminToggle) {
    adminToggle.textContent = enabled ? "Hide Admin Panel" : "Admin Panel";
  }
  loadEvents();
  if (enabled) {
    loadRegistrations();
    loadProducts();
  }
}

async function loadEvents() {
  const eventsDiv = document.getElementById("events");
  eventsDiv.innerHTML = "<p class='status-message'>Loading events...</p>";

  try {
    const res = await fetch(`${baseUrl}/api/events`);
    if (!res.ok) {
      throw new Error("Failed to fetch events");
    }

    const events = await res.json();
    eventsDiv.innerHTML = "";

    if (!events.length) {
      eventsDiv.innerHTML =
        "<p class='status-message'>No events available at the moment.</p>";
      return;
    }

    events.forEach((event) => {
      eventsDiv.appendChild(renderEventCard(event));
    });
  } catch (err) {
    console.error("Error loading events:", err);
    eventsDiv.innerHTML =
      "<p class='status-message error'>Unable to load events. Please try again later.</p>";
  }
}

function renderEventCard(event) {
  const card = document.createElement("article");
  card.className = "event-card";

  const title = document.createElement("h3");
  title.textContent = event.name;

  const description = document.createElement("p");
  description.textContent = event.description || "No description available.";
  description.className = "event-description";

  const meta = document.createElement("p");
  meta.className = "event-meta";
  meta.innerHTML = `<strong>Date:</strong> ${formatDate(event.date)} • <strong>Location:</strong> ${event.location || "TBA"}`;

  const actions = document.createElement("div");
  actions.className = "button-row";

  const registerBtn = document.createElement("button");
  registerBtn.type = "button";
  registerBtn.className = "secondary-btn";
  registerBtn.textContent = "Register";
  registerBtn.addEventListener("click", () => openRegistrationModal(event));
  actions.appendChild(registerBtn);

  if (!adminSection.classList.contains("hidden")) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => fillEventForm(event));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteEvent(event.id));
    actions.appendChild(deleteBtn);
  }

  card.append(title, description, meta, actions);
  return card;
}

function openRegistrationModal(event) {
  hideMessage(mainMessage);
  hideMessage(modalMessage);
  document.getElementById("modalEventTitle").textContent = event.name;
  document.getElementById("modalEventId").value = event.id;
  registrationModal.classList.remove("hidden");
}

function closeRegistrationModal() {
  hideMessage(modalMessage);
  document.getElementById("registerForm").reset();
  registrationModal.classList.add("hidden");
}

async function submitRegistration(event) {
  event.preventDefault();
  hideMessage(modalMessage);

  const eventId = document.getElementById("modalEventId").value;
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const phone = document.getElementById("registerPhone").value.trim();

  if (!name || !email || !phone) {
    showMessage(
      modalMessage,
      "Please fill in every field before submitting.",
      "error",
    );
    return;
  }

  if (!validateEmail(email)) {
    showMessage(modalMessage, "Please enter a valid email address.", "error");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: Number(eventId), name, email, phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Registration failed");
    }

    showMessage(
      mainMessage,
      data.message || "You are registered successfully!",
      "success",
    );
    closeRegistrationModal();
  } catch (err) {
    console.error("Registration failed:", err);
    showMessage(
      modalMessage,
      err.message || "Unable to complete registration.",
      "error",
    );
  }
}

function fillEventForm(event) {
  currentEditEventId = event.id;
  document.getElementById("eventId").value = event.id;
  document.getElementById("name").value = event.name;
  document.getElementById("location").value = event.location;
  document.getElementById("date").value = event.date;
  document.getElementById("description").value = event.description || "";

  document.getElementById("cancelEdit").classList.remove("hidden");
  showMessage(
    adminMessage,
    "Editing event. Update the fields and save.",
    "success",
  );
}

function resetEventForm() {
  currentEditEventId = null;
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
  document.getElementById("cancelEdit").classList.add("hidden");
  hideMessage(adminMessage);
}

async function submitEventForm(e) {
  e.preventDefault();
  hideMessage(adminMessage);

  const name = document.getElementById("name").value.trim();
  const date = document.getElementById("date").value;
  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!name || !date || !location) {
    showMessage(
      adminMessage,
      "Name, date, and location are required.",
      "error",
    );
    return;
  }

  const payload = { name, date, location, description };
  const url = currentEditEventId
    ? `${baseUrl}/api/events/${currentEditEventId}`
    : `${baseUrl}/api/events`;
  const method = currentEditEventId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Unable to save event.");
    }

    showMessage(
      adminMessage,
      data.message || "Event saved successfully.",
      "success",
    );
    resetEventForm();
    loadEvents();
  } catch (err) {
    console.error("Error saving event:", err);
    showMessage(adminMessage, err.message || "Failed to save event.", "error");
  }
}

async function loadProducts() {
  const productsDiv = document.getElementById("products");
  productsDiv.innerHTML = "<p class='status-message'>Loading products...</p>";

  try {
    const res = await fetch(`${baseUrl}/api/products`);
    if (!res.ok) {
      throw new Error("Failed to fetch products");
    }

    const products = await res.json();
    productsDiv.innerHTML = "";

    if (!products.length) {
      productsDiv.innerHTML =
        "<p class='status-message'>No products available.</p>";
      return;
    }

    products.forEach((product) => {
      productsDiv.appendChild(renderProductCard(product));
    });
  } catch (err) {
    console.error("Error loading products:", err);
    productsDiv.innerHTML =
      "<p class='status-message error'>Unable to load products. Please try again later.</p>";
  }
}

function renderProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const title = document.createElement("h4");
  title.textContent = product.name;

  const description = document.createElement("p");
  description.textContent = product.description || "No description available.";
  description.className = "product-description";

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = `$${product.price}`;

  const image = document.createElement("img");
  if (product.image) {
    image.src = product.image;
    image.alt = product.name;
    image.className = "product-image";
  }

  const actions = document.createElement("div");
  actions.className = "button-row";

  if (!adminSection.classList.contains("hidden")) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => fillProductForm(product));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteProduct(product.id));
    actions.appendChild(deleteBtn);
  }

  card.append(title, image, description, price, actions);
  return card;
}

function fillProductForm(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productDescription").value =
    product.description || "";

  document.getElementById("cancelProductEdit").classList.remove("hidden");
  showMessage(
    adminMessage,
    "Editing product. Update the fields and save.",
    "success",
  );
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("cancelProductEdit").classList.add("hidden");
  hideMessage(adminMessage);
}

async function submitProductForm(e) {
  e.preventDefault();
  hideMessage(adminMessage);

  const name = document.getElementById("productName").value.trim();
  const price = parseFloat(document.getElementById("productPrice").value);
  const image = document.getElementById("productImage").value.trim();
  const description = document
    .getElementById("productDescription")
    .value.trim();
  const productId = document.getElementById("productId").value;

  if (!name || isNaN(price)) {
    showMessage(adminMessage, "Name and valid price are required.", "error");
    return;
  }

  const payload = { name, price, image, description };
  const url = productId
    ? `${baseUrl}/api/products/${productId}`
    : `${baseUrl}/api/products`;
  const method = productId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Unable to save product.");
    }

    showMessage(
      adminMessage,
      data.message || "Product saved successfully.",
      "success",
    );
    resetProductForm();
    loadProducts();
  } catch (err) {
    console.error("Error saving product:", err);
    showMessage(
      adminMessage,
      err.message || "Failed to save product.",
      "error",
    );
  }
}

async function deleteProduct(productId) {
  const confirmed = confirm("Delete this product? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Could not delete product.");
    }

    showMessage(
      adminMessage,
      data.message || "Product removed successfully.",
      "success",
    );
    loadProducts();
  } catch (err) {
    console.error("Error deleting product:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove product.",
      "error",
    );
  }
}

async function loadRegistrations() {
  const regDiv = document.getElementById("registrations");
  regDiv.innerHTML = "<p class='status-message'>Loading registrations...</p>";
  hideMessage(adminMessage);

  try {
    const res = await fetch(`${baseUrl}/api/registrations`);
    if (!res.ok) {
      throw new Error("Failed to fetch registrations");
    }

    const registrations = await res.json();
    regDiv.innerHTML = "";

    if (!registrations.length) {
      regDiv.innerHTML = "<p class='status-message'>No registrations yet.</p>";
      return;
    }

    registrations.forEach((registration) => {
      regDiv.appendChild(renderRegistrationCard(registration));
    });
  } catch (err) {
    console.error("Error loading registrations:", err);
    regDiv.innerHTML =
      "<p class='status-message error'>Cannot load registrations right now.</p>";
  }
}

function renderRegistrationCard(registration) {
  const card = document.createElement("article");
  card.className = "registration-card";

  const title = document.createElement("p");
  title.className = "registration-title";
  title.innerHTML = `<strong>${registration.name}</strong> • ${registration.email}`;

  const details = document.createElement("p");
  details.textContent = `${registration.phone} — ${registration.event_name} on ${formatDate(registration.event_date)}`;

  const actions = document.createElement("div");
  actions.className = "button-row";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger-btn";
  deleteBtn.textContent = "Remove";
  deleteBtn.addEventListener("click", () =>
    deleteRegistration(registration.id),
  );

  actions.appendChild(deleteBtn);
  card.append(title, details, actions);
  return card;
}

async function deleteRegistration(registrationId) {
  const confirmed = confirm("Remove this registration? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/registrations/${registrationId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to delete registration.");
    }

    showMessage(
      adminMessage,
      data.message || "Registration removed.",
      "success",
    );
    loadRegistrations();
  } catch (err) {
    console.error("Error deleting registration:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove registration.",
      "error",
    );
  }
}

async function exportRegistrations() {
  try {
    const res = await fetch(`${baseUrl}/api/registrations/export`);
    if (!res.ok) {
      throw new Error("Unable to download CSV.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registrations.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("CSV export failed:", err);
    showMessage(
      adminMessage,
      err.message || "Could not export registrations.",
      "error",
    );
  }
}

function askAdminPassword() {
  const password = prompt("Enter admin password:");
  if (password === null) return;
  if (password === ADMIN_PASSWORD) {
    setAdminMode(true);
    hideMessage(mainMessage);
  } else {
    showMessage(mainMessage, "Incorrect password. Access denied.", "error");
  }
}

function hideAdminPanel() {
  setAdminMode(false);
  resetEventForm();
  hideMessage(adminMessage);
}

function initialize() {
  const adminToggle = document.getElementById("adminToggle");
  const registerForm = document.getElementById("registerForm");
  const closeModalButton = document.getElementById("closeRegistrationModal");
  const cancelRegistration = document.getElementById("cancelRegistration");
  const eventForm = document.getElementById("eventForm");
  const cancelEdit = document.getElementById("cancelEdit");
  const refreshRegistrationsBtn = document.getElementById(
    "refreshRegistrations",
  );
  const exportCsvBtn = document.getElementById("exportCsv");
  const productForm = document.getElementById("productForm");
  const cancelProductEdit = document.getElementById("cancelProductEdit");

  if (adminToggle) {
    adminToggle.addEventListener("click", () => {
      if (adminSection.classList.contains("hidden")) {
        askAdminPassword();
      } else {
        hideAdminPanel();
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", submitRegistration);
  }

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeRegistrationModal);
  }

  if (cancelRegistration) {
    cancelRegistration.addEventListener("click", closeRegistrationModal);
  }

  if (eventForm) {
    eventForm.addEventListener("submit", submitEventForm);
  }

  if (cancelEdit) {
    cancelEdit.addEventListener("click", resetEventForm);
  }

  if (refreshRegistrationsBtn) {
    refreshRegistrationsBtn.addEventListener("click", loadRegistrations);
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportRegistrations);
  }

  if (productForm) {
    productForm.addEventListener("submit", submitProductForm);
  }

  if (cancelProductEdit) {
    cancelProductEdit.addEventListener("click", resetProductForm);
  }

  if (registrationModal) {
    registrationModal.addEventListener("click", (event) => {
      if (event.target === registrationModal) {
        closeRegistrationModal();
      }
    });
  }

  loadEvents();
}

document.addEventListener("DOMContentLoaded", initialize);
