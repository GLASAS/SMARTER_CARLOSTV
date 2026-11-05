let hlsInstance = null;
const video = document.getElementById("video-player");
const errorBox = document.getElementById("player-error");

export function playItem(item) {
  document.getElementById("now-playing").textContent = item.name;
  document.getElementById("player-subtitle").textContent = item.group;
  document.getElementById("player-modal").classList.remove("hidden");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";

  const url = item.url;

  // Destruir instancia anterior de HLS si existe
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  // Comprobar si es un enlace HLS (.m3u8) o si Hls.js es necesario
  if (url.includes(".m3u8") && Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        showError("No se pudo reproducir este contenido en directo.");
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl") && url.includes(".m3u8")) {
    // Soporte nativo para Safari / iOS
    video.src = url;
    video.addEventListener("loadedmetadata", () => {
      video.play().catch(() => {});
    }, { once: true });
  } else {
    // Para archivos MP4 / VOD directos
    video.src = url;
    video.load();
    video.play().catch((err) => {
      console.warn("Reproducción automática bloqueada o formato no compatible:", err);
      showError("Haz clic en el botón de reproducir del video para iniciar.");
    });
  }
}

export function stopPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.pause();
  video.src = "";
  video.load();
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}
