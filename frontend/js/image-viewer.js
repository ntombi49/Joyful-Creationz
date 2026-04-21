let activeImageTrigger = null;

function getImageViewerElements() {
  return {
    modal: document.getElementById("imageViewerModal"),
    image: document.getElementById("imageViewerImg"),
    closeButton: document.getElementById("closeImageViewer"),
  };
}

function openImageViewer(src, title) {
  const { modal, image, closeButton } = getImageViewerElements();

  if (!modal || !image) return;

  activeImageTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  image.src = src;
  image.alt = title || "Image preview";

  modal.classList.remove("hidden");
  closeButton?.focus();
}

function closeImageViewer() {
  const { modal, image } = getImageViewerElements();
  if (!modal || !image) return;

  modal.classList.add("hidden");
  image.src = "";

  if (activeImageTrigger && typeof activeImageTrigger.focus === "function") {
    activeImageTrigger.focus();
  }
  activeImageTrigger = null;
}

function attachImagePreview(image, title, subtitle) {
  if (!image) return;
  const previewTitle = String(title || "image");
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.setAttribute("aria-label", `View ${previewTitle.toLowerCase()}`);
  image.title = "Click to view full screen";
  image.addEventListener("click", () => openImageViewer(image.src, previewTitle));
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openImageViewer(image.src, previewTitle);
    }
  });
}

document.addEventListener("keydown", (event) => {
  const { modal } = getImageViewerElements();
  if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
    closeImageViewer();
  }
});
