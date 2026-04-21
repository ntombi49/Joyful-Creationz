let activeImageTrigger = null;
let activeGalleryImages = [];
let activeGalleryIndex = 0;
let activeGalleryTitle = "";

function getImageViewerElements() {
  return {
    modal: document.getElementById("imageViewerModal"),
    image: document.getElementById("imageViewerImg"),
    closeButton: document.getElementById("closeImageViewer"),
    previousButton: document.getElementById("previousImage"),
    nextButton: document.getElementById("nextImage"),
    thumbs: document.getElementById("imageViewerThumbs"),
  };
}

function normalizeViewerImages(images) {
  if (!images) return [];
  if (Array.isArray(images)) {
    return images.map((image) => String(image || "").trim()).filter(Boolean);
  }
  return [String(images || "").trim()].filter(Boolean);
}

function renderViewerThumbs() {
  const { thumbs } = getImageViewerElements();
  if (!thumbs) return;

  thumbs.innerHTML = "";
  thumbs.classList.toggle("hidden", activeGalleryImages.length <= 1);

  activeGalleryImages.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "image-viewer-thumb";
    button.dataset.galleryIndex = String(index);
    button.setAttribute(
      "aria-label",
      `View image ${index + 1} of ${activeGalleryImages.length}`,
    );

    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.alt = `${activeGalleryTitle || "Image"} thumbnail ${index + 1}`;
    thumb.loading = "lazy";
    button.appendChild(thumb);

    if (index === activeGalleryIndex) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      showGalleryImage(index);
    });

    thumbs.appendChild(button);
  });
}

function updateViewerImage() {
  const { image, previousButton, nextButton } = getImageViewerElements();
  if (!image || !activeGalleryImages.length) return;

  const currentSrc = activeGalleryImages[activeGalleryIndex] || "";
  image.src = currentSrc;
  image.alt = activeGalleryTitle
    ? `${activeGalleryTitle} image ${activeGalleryIndex + 1}`
    : `Image ${activeGalleryIndex + 1}`;

  if (previousButton) {
    previousButton.disabled = activeGalleryImages.length <= 1;
  }
  if (nextButton) {
    nextButton.disabled = activeGalleryImages.length <= 1;
  }

  renderViewerThumbs();
}

function openGalleryViewer(images, startIndex = 0, title = "Image preview") {
  const { modal, closeButton } = getImageViewerElements();
  if (!modal) return;

  const normalized = normalizeViewerImages(images);
  if (!normalized.length) return;

  activeImageTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeGalleryImages = normalized;
  activeGalleryIndex = Math.min(
    Math.max(Number(startIndex) || 0, 0),
    activeGalleryImages.length - 1,
  );
  activeGalleryTitle = title || "Image preview";

  updateViewerImage();
  modal.classList.remove("hidden");
  closeButton?.focus();
}

function showGalleryImage(index) {
  if (!activeGalleryImages.length) return;
  const nextIndex =
    (index + activeGalleryImages.length) % activeGalleryImages.length;
  activeGalleryIndex = nextIndex;
  updateViewerImage();
}

function showNextGalleryImage() {
  showGalleryImage(activeGalleryIndex + 1);
}

function showPreviousGalleryImage() {
  showGalleryImage(activeGalleryIndex - 1);
}

function closeImageViewer() {
  const { modal, image, thumbs } = getImageViewerElements();
  if (!modal || !image) return;

  modal.classList.add("hidden");
  image.src = "";
  activeGalleryImages = [];
  activeGalleryIndex = 0;
  activeGalleryTitle = "";

  if (thumbs) {
    thumbs.innerHTML = "";
    thumbs.classList.add("hidden");
  }

  if (activeImageTrigger && typeof activeImageTrigger.focus === "function") {
    activeImageTrigger.focus();
  }
  activeImageTrigger = null;
}

function attachImagePreview(image, title) {
  if (!image) return;
  const previewTitle = String(title || "image");
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.setAttribute("aria-label", `View ${previewTitle.toLowerCase()}`);
  image.title = "Click to view full screen";
  image.addEventListener("click", () =>
    openGalleryViewer([image.src], 0, previewTitle),
  );
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGalleryViewer([image.src], 0, previewTitle);
    }
  });
}

document.addEventListener("keydown", (event) => {
  const { modal } = getImageViewerElements();
  if (!modal || modal.classList.contains("hidden")) return;

  if (event.key === "Escape") {
    closeImageViewer();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPreviousGalleryImage();
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    showNextGalleryImage();
  }
});
