let activeImageTrigger = null;

function getImageViewerElements() {
  return {
    modal: document.getElementById("imageViewerModal"),
    image: document.getElementById("imageViewerImg"),
    title: document.getElementById("imageViewerTitle"),
    subtitle: document.getElementById("imageViewerSubtitle"),
    closeButton: document.getElementById("closeImageViewer"),
  };
}

function openImageViewer(src, title, subtitle = "") {
  const { modal, image, title: titleNode, subtitle: subtitleNode, closeButton } =
    getImageViewerElements();

  if (!modal || !image || !titleNode) return;

  activeImageTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  image.src = src;
  image.alt = title || "Image preview";
  titleNode.textContent = title || "Image preview";

  if (subtitleNode) {
    subtitleNode.textContent = subtitle || "";
    subtitleNode.classList.toggle("hidden", !subtitle);
  }

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
  image.addEventListener("click", () => openImageViewer(image.src, previewTitle, subtitle));
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openImageViewer(image.src, previewTitle, subtitle);
    }
  });
}

document.addEventListener("keydown", (event) => {
  const { modal } = getImageViewerElements();
  if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
    closeImageViewer();
  }
});
