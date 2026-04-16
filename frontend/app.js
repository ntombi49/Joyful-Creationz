const baseUrl =
  window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "http://localhost:3000";
const ADMIN_PASSWORD = "joyful123";
let currentEditEventId = null;

function resolveAssetUrl(src) {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return encodeURI(trimmed);
  if (trimmed.toLowerCase().startsWith("images/"))
    return encodeURI(`/${trimmed}`);
  return encodeURI(`${baseUrl}/images/${trimmed}`);
}

async function uploadImageFile(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl}/api/uploads`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unable to upload image.");
  }

  return data.filename || data.url;
}

const mainMessage = document.getElementById("mainMessage");
const adminMessage = document.getElementById("adminMessage");
const modalMessage = document.getElementById("modalMessage");
const orderMessage = document.getElementById("orderMessage");
const adminSection = document.getElementById("admin-section");
const registrationModal = document.getElementById("registrationModal");
const orderModal = document.getElementById("orderModal");

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

function formatTime(value) {
  if (!value) return "TBA";
  const rawTime = String(value).trim();
  if (!rawTime) return "TBA";

  const parsedTime = new Date(`1970-01-01T${rawTime}`);
  if (Number.isNaN(parsedTime.valueOf())) return rawTime;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedTime);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `R ${value}`;
  return `R ${amount.toFixed(2)}`;
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
    loadProducts(true);
    loadPartners(true);
    loadOrders();
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

  const image = document.createElement("img");
  image.src =
    resolveAssetUrl(event.image) ||
    "https://via.placeholder.com/460x260?text=Event+Image";
  image.alt = event.name;
  image.className = "event-image";

  const title = document.createElement("h3");
  title.textContent = event.name;

  const description = document.createElement("p");
  description.textContent = event.description || "No description available.";
  description.className = "event-description";

  const meta = document.createElement("p");
  meta.className = "event-meta";
  meta.innerHTML = `<strong>Date:</strong> ${formatDate(event.date)} | <strong>Time:</strong> ${formatTime(event.time)} | <strong>Location:</strong> ${event.location || "TBA"}`;

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

  card.append(image, title, description, meta, actions);
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

function openOrderModal(product) {
  hideMessage(mainMessage);
  hideMessage(orderMessage);
  document.getElementById("modalProductTitle").textContent = product.name;
  document.getElementById("modalProductId").value = product.id;
  orderModal.classList.remove("hidden");
}

function closeOrderModal() {
  hideMessage(orderMessage);
  document.getElementById("orderForm").reset();
  orderModal.classList.add("hidden");
}

async function submitOrder(event) {
  event.preventDefault();
  hideMessage(orderMessage);

  const productId = document.getElementById("modalProductId").value;
  const quantity = parseInt(document.getElementById("orderQuantity").value);
  const name = document.getElementById("orderName").value.trim();
  const email = document.getElementById("orderEmail").value.trim();
  const phone = document.getElementById("orderPhone").value.trim();

  if (!name || !email || !phone || quantity < 1) {
    showMessage(
      orderMessage,
      "Please fill in all fields with valid information.",
      "error",
    );
    return;
  }

  if (!validateEmail(email)) {
    showMessage(orderMessage, "Please enter a valid email address.", "error");
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: Number(productId),
        quantity,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Order failed");
    }

    showMessage(
      mainMessage,
      data.message || "Order placed successfully! Admin will be notified.",
      "success",
    );
    closeOrderModal();
  } catch (err) {
    console.error("Order failed:", err);
    showMessage(orderMessage, err.message || "Unable to place order.", "error");
  }
}

function fillEventForm(event) {
  currentEditEventId = event.id;
  document.getElementById("eventId").value = event.id;
  document.getElementById("name").value = event.name;
  document.getElementById("location").value = event.location;
  document.getElementById("date").value = event.date;
  document.getElementById("time").value = event.time || "";
  document.getElementById("eventImage").value = event.image || "";
  document.getElementById("eventImageFile").value = "";
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
  document.getElementById("eventImageFile").value = "";
  document.getElementById("cancelEdit").classList.add("hidden");
  hideMessage(adminMessage);
}

async function submitEventForm(e) {
  e.preventDefault();
  hideMessage(adminMessage);

  const name = document.getElementById("name").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const location = document.getElementById("location").value.trim();
  const imageInput = document.getElementById("eventImage").value.trim();
  const imageFile = document.getElementById("eventImageFile").files[0];
  let image = imageInput;
  const description = document.getElementById("description").value.trim();

  if (!name || !date || !time || !location) {
    showMessage(
      adminMessage,
      "Name, date, time, and location are required.",
      "error",
    );
    return;
  }

  if (imageFile) {
    try {
      image = await uploadImageFile(imageFile);
    } catch (uploadErr) {
      throw new Error(uploadErr.message || "Unable to upload event image.");
    }
  }

  const payload = { name, date, time, location, description, image };
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

async function deleteEvent(eventId) {
  const confirmed = confirm("Delete this event? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/events/${eventId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Could not delete event.");
    }

    showMessage(
      adminMessage,
      data.message || "Event removed successfully.",
      "success",
    );
    if (currentEditEventId === eventId) {
      resetEventForm();
    }
    loadEvents();
  } catch (err) {
    console.error("Error deleting event:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove event.",
      "error",
    );
  }
}

async function loadProducts(isAdmin = false) {
  const productsDiv = document.getElementById(
    isAdmin ? "admin-products" : "products",
  );
  productsDiv.innerHTML = "<p class='status-message'>Loading products...</p>";

  try {
    const res = await fetch(`${baseUrl}/api/products`);
    if (!res.ok) {
      throw new Error("Failed to fetch products");
    }

    const products = await res.json();
    productsDiv.innerHTML = "";

    if (!products.length) {
      productsDiv.innerHTML = isAdmin
        ? "<p class='status-message'>No products available.</p>"
        : "<p class='status-message'>No products available at the moment.</p>";
      return;
    }

    products.forEach((product) => {
      productsDiv.appendChild(renderProductCard(product, isAdmin));
    });
  } catch (err) {
    console.error("Error loading products:", err);
    productsDiv.innerHTML =
      "<p class='status-message error'>Unable to load products. Please try again later.</p>";
  }
}

function renderProductCard(product, isAdmin = false) {
  const card = document.createElement("article");
  card.className = "product-card";

  const title = document.createElement("h4");
  title.textContent = product.name;

  const description = document.createElement("p");
  description.textContent = product.description || "No description available.";
  description.className = "product-description";

  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = formatCurrency(product.price);

  const image = document.createElement("img");
  image.src =
    resolveAssetUrl(product.image) ||
    "https://via.placeholder.com/150x150?text=No+Image";
  image.alt = product.name;
  image.className = "product-image";

  const actions = document.createElement("div");
  actions.className = "button-row";

  if (isAdmin) {
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
  } else {
    const buyBtn = document.createElement("button");
    buyBtn.type = "button";
    buyBtn.className = "primary-btn";
    buyBtn.textContent = "Buy Now";
    buyBtn.addEventListener("click", () => openOrderModal(product));
    actions.appendChild(buyBtn);
  }

  card.append(title, image, description, price, actions);
  return card;
}

function fillProductForm(product) {
  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productImage").value = product.image || "";
  document.getElementById("productImageFile").value = "";
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
  document.getElementById("productImageFile").value = "";
  document.getElementById("cancelProductEdit").classList.add("hidden");
  hideMessage(adminMessage);
}

async function submitProductForm(e) {
  e.preventDefault();
  hideMessage(adminMessage);

  const name = document.getElementById("productName").value.trim();
  const price = parseFloat(document.getElementById("productPrice").value);
  const imageInput = document.getElementById("productImage").value.trim();
  const imageFile = document.getElementById("productImageFile").files[0];
  let image = imageInput;
  const description = document
    .getElementById("productDescription")
    .value.trim();
  const productId = document.getElementById("productId").value;

  if (!name || isNaN(price)) {
    showMessage(adminMessage, "Name and valid price are required.", "error");
    return;
  }

  if (imageFile) {
    try {
      image = await uploadImageFile(imageFile);
    } catch (uploadErr) {
      throw new Error(uploadErr.message || "Unable to upload product image.");
    }
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
    loadProducts(true);
    loadProducts(false); // reload public too
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
    loadProducts(true);
    loadProducts(false);
  } catch (err) {
    console.error("Error deleting product:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove product.",
      "error",
    );
  }
}

async function loadPartners(isAdmin = false) {
  const partnersDiv = document.getElementById(
    isAdmin ? "admin-partners" : "partners",
  );
  partnersDiv.innerHTML = "<p class='status-message'>Loading partners...</p>";

  try {
    const res = await fetch(`${baseUrl}/api/partners`);
    if (!res.ok) {
      throw new Error("Failed to fetch partners");
    }

    const partners = await res.json();
    partnersDiv.innerHTML = "";

    if (!partners.length) {
      partnersDiv.innerHTML = isAdmin
        ? "<p class='status-message'>No partners available.</p>"
        : "<p class='status-message'>No partners at the moment.</p>";
      return;
    }

    partners.forEach((partner) => {
      partnersDiv.appendChild(renderPartnerCard(partner, isAdmin));
    });
  } catch (err) {
    console.error("Error loading partners:", err);
    partnersDiv.innerHTML =
      "<p class='status-message error'>Unable to load partners. Please try again later.</p>";
  }
}

function renderPartnerCard(partner, isAdmin = false) {
  const card = document.createElement("article");
  card.className = "partner-card";

  const title = document.createElement("h4");
  title.textContent = partner.name;

  const description = document.createElement("p");
  description.textContent = partner.description || "No description available.";
  description.className = "partner-description";

  const logo = document.createElement("img");
  logo.src =
    resolveAssetUrl(partner.logo) ||
    "https://via.placeholder.com/150x150?text=No+Logo";
  logo.alt = partner.name;
  logo.className = "partner-logo";

  const actions = document.createElement("div");
  actions.className = "button-row";

  if (isAdmin) {
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => fillPartnerForm(partner));
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deletePartner(partner.id));
    actions.appendChild(deleteBtn);
  }

  card.append(title, logo, description, actions);
  return card;
}

function fillPartnerForm(partner) {
  document.getElementById("partnerId").value = partner.id;
  document.getElementById("partnerName").value = partner.name;
  document.getElementById("partnerLogo").value = partner.logo || "";
  document.getElementById("partnerLogoFile").value = "";
  document.getElementById("partnerDescription").value =
    partner.description || "";

  document.getElementById("cancelPartnerEdit").classList.remove("hidden");
  showMessage(
    adminMessage,
    "Editing partner. Update the fields and save.",
    "success",
  );
}

function resetPartnerForm() {
  document.getElementById("partnerForm").reset();
  document.getElementById("partnerId").value = "";
  document.getElementById("partnerLogoFile").value = "";
  document.getElementById("cancelPartnerEdit").classList.add("hidden");
  hideMessage(adminMessage);
}

async function submitPartnerForm(e) {
  e.preventDefault();
  hideMessage(adminMessage);

  const name = document.getElementById("partnerName").value.trim();
  const logoInput = document.getElementById("partnerLogo").value.trim();
  const logoFile = document.getElementById("partnerLogoFile").files[0];
  let logo = logoInput;
  const description = document
    .getElementById("partnerDescription")
    .value.trim();
  const partnerId = document.getElementById("partnerId").value;

  if (!name) {
    showMessage(adminMessage, "Partner name is required.", "error");
    return;
  }

  if (logoFile) {
    try {
      logo = await uploadImageFile(logoFile);
    } catch (uploadErr) {
      throw new Error(uploadErr.message || "Unable to upload partner logo.");
    }
  }

  const payload = { name, logo, description };
  const url = partnerId
    ? `${baseUrl}/api/partners/${partnerId}`
    : `${baseUrl}/api/partners`;
  const method = partnerId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Unable to save partner.");
    }

    showMessage(
      adminMessage,
      data.message || "Partner saved successfully.",
      "success",
    );
    resetPartnerForm();
    loadPartners(true);
    loadPartners(false);
  } catch (err) {
    console.error("Error saving partner:", err);
    showMessage(
      adminMessage,
      err.message || "Failed to save partner.",
      "error",
    );
  }
}

async function deletePartner(partnerId) {
  const confirmed = confirm("Delete this partner? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/partners/${partnerId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Could not delete partner.");
    }

    showMessage(
      adminMessage,
      data.message || "Partner removed successfully.",
      "success",
    );
    loadPartners(true);
    loadPartners(false);
  } catch (err) {
    console.error("Error deleting partner:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove partner.",
      "error",
    );
  }
}

async function loadOrders() {
  const ordersDiv = document.getElementById("orders");
  ordersDiv.innerHTML = "<p class='status-message'>Loading orders...</p>";

  try {
    const res = await fetch(`${baseUrl}/api/orders`);
    if (!res.ok) {
      throw new Error("Failed to fetch orders");
    }

    const orders = await res.json();
    ordersDiv.innerHTML = "";

    if (!orders.length) {
      ordersDiv.innerHTML = "<p class='status-message'>No orders yet.</p>";
      return;
    }

    orders.forEach((order) => {
      ordersDiv.appendChild(renderOrderCard(order));
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    ordersDiv.innerHTML =
      "<p class='status-message error'>Unable to load orders. Please try again later.</p>";
  }
}

function renderOrderCard(order) {
  const card = document.createElement("article");
  card.className = "order-card";

  const title = document.createElement("p");
  title.className = "order-title";
  title.innerHTML = `<strong>${order.customer_name}</strong> | ${order.customer_email}`;

  const details = document.createElement("p");
  details.textContent = `${order.product_name} x${order.quantity} - ${formatCurrency(order.total)} (${order.status})`;

  const meta = document.createElement("p");
  meta.className = "order-meta";
  meta.textContent = `Ordered on ${formatDate(order.order_date)} | Phone: ${order.customer_phone}`;

  const actions = document.createElement("div");
  actions.className = "button-row";

  if (order.status === "pending") {
    const completeBtn = document.createElement("button");
    completeBtn.type = "button";
    completeBtn.className = "primary-btn";
    completeBtn.textContent = "Mark Complete";
    completeBtn.addEventListener("click", () =>
      updateOrderStatus(order.id, "completed"),
    );
    actions.appendChild(completeBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteOrder(order.id));
  actions.appendChild(deleteBtn);

  card.append(title, details, meta, actions);
  return card;
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update order");
    }

    showMessage(
      adminMessage,
      data.message || "Order updated successfully.",
      "success",
    );
    loadOrders();
  } catch (err) {
    console.error("Error updating order:", err);
    showMessage(
      adminMessage,
      err.message || "Failed to update order.",
      "error",
    );
  }
}

async function deleteOrder(orderId) {
  const confirmed = confirm("Delete this order? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Could not delete order.");
    }

    showMessage(
      adminMessage,
      data.message || "Order removed successfully.",
      "success",
    );
    loadOrders();
  } catch (err) {
    console.error("Error deleting order:", err);
    showMessage(
      adminMessage,
      err.message || "Unable to remove order.",
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
  title.innerHTML = `<strong>${registration.name}</strong> | ${registration.email}`;

  const details = document.createElement("p");
  details.textContent = `${registration.phone} - ${registration.event_name} on ${formatDate(registration.event_date)}`;

  const status = document.createElement("p");
  status.className = "registration-status";
  status.innerHTML = `<strong>Status:</strong> ${
    registration.paid ? "Paid" : "Not Paid"
  } | ${registration.ticket_sent ? "Ticket Sent" : "No Ticket"}`;

  const actions = document.createElement("div");
  actions.className = "button-row";

  // Mark as Paid button
  if (!registration.paid) {
    const paidBtn = document.createElement("button");
    paidBtn.type = "button";
    paidBtn.className = "primary-btn";
    paidBtn.textContent = "Mark Paid";
    paidBtn.addEventListener("click", () =>
      markRegistrationPaid(registration.id),
    );
    actions.appendChild(paidBtn);
  }

  // Send Ticket button
  if (registration.paid && !registration.ticket_sent) {
    const ticketBtn = document.createElement("button");
    ticketBtn.type = "button";
    ticketBtn.className = "primary-btn";
    ticketBtn.textContent = "Send Ticket";
    ticketBtn.addEventListener("click", () =>
      sendTicketToRegistrant(registration.id),
    );
    actions.appendChild(ticketBtn);
  }

  // Resend Ticket button
  if (registration.paid && registration.ticket_sent) {
    const resendBtn = document.createElement("button");
    resendBtn.type = "button";
    resendBtn.className = "secondary-btn";
    resendBtn.textContent = "Resend Ticket";
    resendBtn.addEventListener("click", () =>
      resendTicketToRegistrant(registration.id),
    );
    actions.appendChild(resendBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger-btn";
  deleteBtn.textContent = "Remove";
  deleteBtn.addEventListener("click", () =>
    deleteRegistration(registration.id),
  );

  actions.appendChild(deleteBtn);
  card.append(title, details, status, actions);
  return card;
}

async function markRegistrationPaid(registrationId) {
  const confirmed = confirm("Mark this registration as paid?");
  if (!confirmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/registrations/${registrationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: 1 }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update registration");
    }

    showMessage(
      adminMessage,
      "Registration marked as paid. Now you can send the ticket!",
      "success",
    );
    loadRegistrations();
  } catch (err) {
    console.error("Error updating registration:", err);
    showMessage(
      adminMessage,
      err.message || "Failed to mark as paid.",
      "error",
    );
  }
}

async function sendTicketToRegistrant(registrationId) {
  try {
    const res = await fetch(`${baseUrl}/api/tickets/send/${registrationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to send ticket");
    }

    showMessage(adminMessage, data.message, "success");
    loadRegistrations();
  } catch (err) {
    console.error("Error sending ticket:", err);
    showMessage(adminMessage, err.message || "Failed to send ticket.", "error");
  }
}

async function resendTicketToRegistrant(registrationId) {
  // Get the ticket ID first
  try {
    const ticketRes = await fetch(`${baseUrl}/api/tickets`);
    const tickets = await ticketRes.json();
    const ticket = tickets.find((t) => t.registration_id === registrationId);

    if (!ticket) {
      showMessage(adminMessage, "Ticket not found.", "error");
      return;
    }

    const res = await fetch(`${baseUrl}/api/tickets/resend/${ticket.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to resend ticket");
    }

    showMessage(adminMessage, data.message, "success");
    loadRegistrations();
  } catch (err) {
    console.error("Error resending ticket:", err);
    showMessage(
      adminMessage,
      err.message || "Failed to resend ticket.",
      "error",
    );
  }
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
  const partnerForm = document.getElementById("partnerForm");
  const cancelPartnerEdit = document.getElementById("cancelPartnerEdit");
  const orderForm = document.getElementById("orderForm");
  const closeOrderModalButton = document.getElementById("closeOrderModal");
  const cancelOrder = document.getElementById("cancelOrder");

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

  if (partnerForm) {
    partnerForm.addEventListener("submit", submitPartnerForm);
  }

  if (cancelPartnerEdit) {
    cancelPartnerEdit.addEventListener("click", resetPartnerForm);
  }

  if (orderForm) {
    orderForm.addEventListener("submit", submitOrder);
  }

  if (closeOrderModalButton) {
    closeOrderModalButton.addEventListener("click", closeOrderModal);
  }

  if (cancelOrder) {
    cancelOrder.addEventListener("click", closeOrderModal);
  }

  if (registrationModal) {
    registrationModal.addEventListener("click", (event) => {
      if (event.target === registrationModal) {
        closeRegistrationModal();
      }
    });
  }

  if (orderModal) {
    orderModal.addEventListener("click", (event) => {
      if (event.target === orderModal) {
        closeOrderModal();
      }
    });
  }

  loadEvents();
  loadProducts(false);
  loadPartners(false);
}

document.addEventListener("DOMContentLoaded", initialize);
