let allMedia = { live: [], movies: [], series: [] };
let currentSection = 'live';
let currentGroup = '';
let hls = null;

async function initAppSession(isAuto = false) {
    if (!isAuto) showLoader('Sincronizando lista ExM3U V1.1...');
    
    document.getElementById('viewLogin').classList.add('hidden');
    document.getElementById('appHeader').classList.remove('hidden');
    document.getElementById('appMain').classList.remove('hidden');
    
    document.getElementById('headerUserInfo').innerText = `Usuario: ${currentUserData.usuario} (${currentUserData.nombre || ''})`;
    document.getElementById('headerExp').innerText = `Vence: ${currentUserData.vencimiento}`;

    let targetUrls = [];
    if (Array.isArray(currentUserData.urls)) {
        targetUrls = currentUserData.urls;
    } else if (typeof currentUserData.urls === 'string' && currentUserData.urls.trim() !== '') {
        targetUrls = [currentUserData.urls];
    }

    if (targetUrls.length > 0) {
        await loadPlaylistWithProgress(targetUrls[0]);
    } else {
        hideLoader();
        alert("No se encontró ninguna URL en la columna URL1 de Google Sheets.");
    }
}

async function loadPlaylistWithProgress(url) {
    allMedia = { live: [], movies: [], series: [] };
    showLoader('Descargando lista M3U (0%)...');

    let playlistText = null;
    const proxies = [
        url,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];

    let loaded = false;
    for (let i = 0; i < proxies.length; i++) {
        try {
            showLoader(`Descargando lista (Intento ${i + 1}/${proxies.length})...`);
            const response = await fetch(proxies[i]);
            if (response.ok) {
                playlistText = await response.text();
                if (playlistText && playlistText.length > 50) {
                    loaded = true;
                    break;
                }
            }
        } catch (e) {
            console.warn("Proxy fallido, probando siguiente...", e);
        }
    }

    if (loaded && playlistText) {
        showLoader('Analizando grupos y clasificando contenido...');
        setTimeout(() => {
            parseExM3UProfessional(playlistText);
            hideLoader();
            openSection('live');
        }, 150);
    } else {
        hideLoader();
        alert("No se pudo descargar la lista M3U. Revisa la URL en Google Sheets.");
    }
}

// MOTOR PROFESIONAL DE LECTURA EXM3U
function parseExM3UProfessional(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let currentName = '';
    let currentLogo = '';
    let currentGroup = 'General';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            let commaIndex = line.lastIndexOf(',');
            if (commaIndex !== -1) {
                currentName = line.substring(commaIndex + 1).trim();
            }

            let logoMatch = line.match(/tvg-logo="([^"]*)"/i) || line.match(/logo="([^"]*)"/i);
            currentLogo = logoMatch ? logoMatch[1] : '';

            let groupMatch = line.match(/group-title="([^"]*)"/i) || line.match(/group-title='([^']*)'/i);
            currentGroup = groupMatch ? groupMatch[1].trim() : 'General';

        } else if (line && !line.startsWith('#')) {
            let mediaUrl = line;
            if (currentName === '') currentName = 'Contenido sin nombre';

            let item = {
                name: currentName,
                logo: currentLogo,
                group: currentGroup,
                url: mediaUrl
            };

            let gLower = currentGroup.toLowerCase();
            let uLower = mediaUrl.toLowerCase();

            // CLASIFICACIÓN EXACTA Y RIGUROSA
            const isMovie = gLower.includes('pelicula') || gLower.includes('vod') || gLower.includes('movie') || gLower.includes('cine') || gLower.includes('estrenos') || gLower.includes('comedia') || gLower.includes('animacion') || gLower.includes('animadas') || uLower.includes('/movie/') || uLower.includes('.mp4') || uLower.includes('.mkv') || uLower.includes('.avi');
            const isSeries = gLower.includes('serie') || gLower.includes('temporada') || gLower.includes('capitulo') || gLower.includes('season') || uLower.includes('/series/');

            if (isSeries) {
                allMedia.series.push(item);
            } else if (isMovie) {
                allMedia.movies.push(item);
            } else {
                allMedia.live.push(item);
            }

            currentName = '';
            currentLogo = '';
            currentGroup = 'General';
        }
    }
}

function openSection(section) {
    currentSection = section;
    document.getElementById('viewDashboard').classList.add('hidden');
    document.getElementById('viewContent').classList.remove('hidden');
    document.getElementById('btnHome').classList.remove('hidden');

    const titles = { live: 'Canales en Vivo', movies: 'Películas VOD', series: 'Series TV' };
    document.getElementById('sidebarTitle').innerText = titles[section];

    document.getElementById('searchMedia').value = '';
    renderCategories();
}

function returnToDashboard() {
    document.getElementById('viewContent').classList.add('hidden');
    document.getElementById('viewDashboard').classList.remove('hidden');
    document.getElementById('btnHome').classList.add('hidden');

    const video = document.getElementById('videoPlayer');
    if (video) { video.pause(); video.src = ''; }
}

function renderCategories() {
    const list = allMedia[currentSection];
    const groups = [...new Set(list.map(item => item.group))].sort();
    const container = document.getElementById('categoryList');
    container.innerHTML = '';
    document.getElementById('groupCount').innerText = groups.length;

    if (groups.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-500 text-xs">No hay categorías en esta sección</div>`;
        document.getElementById('mediaList').innerHTML = `<div class="text-center py-16 text-slate-500 text-xs">No hay elementos</div>`;
        document.getElementById('itemCount').innerText = '0';
        return;
    }

    if (!groups.includes(currentGroup)) {
        currentGroup = groups[0];
    }

    groups.forEach(group => {
        const count = list.filter(item => item.group === group).length;
        const el = document.createElement('div');
        el.className = `flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-semibold transition ${group === currentGroup ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
        
        el.onclick = () => {
            currentGroup = group;
            renderCategories();
            filterMedia();
        };

        el.innerHTML = `
            <span class="truncate pr-2">${group}</span>
            <span class="bg-slate-950/40 text-[10px] px-2 py-0.5 rounded-full">${count}</span>
        `;
        container.appendChild(el);
    });

    filterMedia();
}

function filterMedia() {
    const search = document.getElementById('searchMedia').value.toLowerCase();
    const list = allMedia[currentSection];

    const filtered = list.filter(item => {
        const matchesGroup = (item.group === currentGroup);
        const matchesSearch = item.name.toLowerCase().includes(search);
        return matchesGroup && matchesSearch;
    });

    renderMediaList(filtered);
}

function renderMediaList(items) {
    const container = document.getElementById('mediaList');
    container.innerHTML = '';
    document.getElementById('itemCount').innerText = items.length;

    if (items.length === 0) {
        container.innerHTML = `<div class="text-center py-16 text-slate-500 text-xs">No hay elementos</div>`;
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'flex items-center gap-3 p-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-xl cursor-pointer transition group';
        
        let logoHtml = item.logo 
            ? `<img src="${item.logo}" class="w-9 h-9 object-cover rounded-lg bg-slate-950 p-1 border border-slate-800" onerror="this.src='https://via.placeholder.com/40?text=VOD'">`
            : `<div class="w-9 h-9 bg-slate-950 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800"><i class="fa-solid fa-film text-xs"></i></div>`;

        el.onclick = () => playMedia(item);
        el.innerHTML = `
            ${logoHtml}
            <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold truncate text-slate-200 group-hover:text-cyan-400 transition">${item.name}</p>
                <p class="text-[10px] text-slate-400 truncate">${item.group}</p>
            </div>
        `;
        container.appendChild(el);
    });
}

// REPRODUCTOR UNIVERSAL BLINDADO PARA VOD Y STREAMING
async function playMedia(item) {
    const video = document.getElementById('videoPlayer');
    document.getElementById('playingName').innerText = item.name;
    document.getElementById('currentChannelInfo').classList.remove('hidden');

    if (hls) {
        hls.destroy();
        hls = null;
    }

    let mediaUrl = item.url;

    // Si es un enlace HTTP en un entorno HTTPS, evitamos bloqueo de seguridad mixto usando proxy de streaming
    if (mediaUrl.startsWith('http://') && window.location.protocol === 'https:') {
        mediaUrl = `https://corsproxy.io/?${encodeURIComponent(mediaUrl)}`;
    }

    // Si el archivo es HLS (.m3u8) o contenedor de video moderno
    if (item.url.includes('.m3u8') && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(mediaUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Reproducción HLS iniciada:", e));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.warn("Fallo HLS, cambiando a reproducción directa...", data);
                video.src = item.url;
                video.play().catch(err => console.error("Error reproduciendo enlace directo:", err));
            }
        });
    } else {
        // Carga directa optimizada para películas (MP4, MKV, etc.)
        video.src = mediaUrl;
        video.load();
        try {
            await video.play();
        } catch (err) {
            console.warn("Error en reproducción con proxy, intentando enlace nativo...", err);
            video.src = item.url;
            video.load();
            video.play().catch(e => {
                console.error("No se pudo reproducir el archivo multimedia:", e);
                alert("El navegador no puede decodificar este formato de película directamente.");
            });
        }
    }
}

function skipTime(seconds) {
    const video = document.getElementById('videoPlayer');
    if (video) video.currentTime += seconds;
}

function toggleFullscreen() {
    const video = document.getElementById('videoPlayer');
    if (!document.fullscreenElement) {
        if (video.requestFullscreen) video.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}
