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

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  video.removeAttribute("src");
  video.load();

  if (url.includes(".m3u8") && Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(handlePlayError);
    });
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        showError("Error de reproducción HLS. Verifique el enlace o la red.");
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl") && url.includes(".m3u8")) {
    video.src = url;
    video.play().catch(handlePlayError);
  } else {
    video.src = url;
    video.load();
    video.play().catch(handlePlayError);
  }
}

function handlePlayError(err) {
  console.warn("Reproducción automática bloqueada o error de códec:", err);
  showError("Haz clic en el botón de reproducción del video o verifica si el formato es compatible.");
}

export function stopPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.pause();
  video.removeAttribute("src");
  video.load();
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}

video.addEventListener("error", (e) => {
  console.error("Error en el elemento de video:", video.error);
  showError("El navegador no pudo reproducir este formato de video.");
});
