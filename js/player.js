let hlsInstance = null;
const video = document.getElementById("video-player");
const errorBox = document.getElementById("player-error");
function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
export async function playItem(item) {
  stopPlayer();
  errorBox.classList.add("hidden");
  document.getElementById("now-playing").textContent = item.name;
  document.getElementById("player-subtitle").textContent = item.group || "SMART IPTV CHARLY";
  document.getElementById("player-modal").classList.remove("hidden");
  const url = item.url;
  const isHls = /\.m3u8($|\?)/i.test(url) || /\.m3u($|\?)/i.test(url);
  try {
    if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url; // Safari/iOS/tvOS browsers with native HLS support
    } else if (isHls && window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) showError("No se pudo reproducir este stream. Verifica el enlace, CORS, códec y disponibilidad del servidor.");
      });
    } else {
      video.src = url;
    }
    try { await video.play(); } catch {
      // En iOS y Smart TV el autoplay puede estar bloqueado: el usuario pulsa Play.
    }
  } catch {
    showError("No fue posible iniciar el contenido en este dispositivo.");
  }
}
export function stopPlayer() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.pause();
  video.removeAttribute("src");
  video.load();
}
