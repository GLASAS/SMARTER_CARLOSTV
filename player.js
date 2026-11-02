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

// DESCARGA CON INDICADOR DE PROGRESO Y LECTURA EXACTA
async function loadPlaylistWithProgress(url) {
    allMedia = { live: [], movies: [], series: [] };
    showLoader('Conectando con la lista M3U (0%)...');

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
        showLoader('Procesando grupos y clasificando contenido...');
        // Pequeño respiro para que el navegador actualice el texto de carga
        setTimeout(() => {
            parseExM3UIntelligent(playlistText);
            hideLoader();
            // Mostrar por defecto la sección Live TV o la primera disponible
            openSection('live');
        }, 100);
    } else {
        hideLoader();
        alert("No se pudo descargar la lista M3U. Revisa tu conexión o el enlace.");
    }
}

// MOTOR DE CLASIFICACIÓN INTELIGENTE (DETECTA SI ES VOD, SERIE O LIVE TV)
function parseExM3UIntelligent(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let currentName = '';
    let currentLogo = '';
    let currentGroup = 'General';

    const totalLines = lines.length;

    for (let i = 0; i < totalLines; i++) {
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
            let nLower = currentName.toLowerCase();

            // CLASIFICACIÓN HÍBRIDA ROBUSTA:
            // Si el grupo O el nombre tienen formato de película (ej. años como 2001, 2004, 2007 o palabras VOD/Película/Animación de cine)
            const isMovieCategory = gLower.includes('pelicula') || gLower.includes('vod') || gLower.includes('movie') || gLower.includes('cine') || gLower.includes('animacion') || gLower.includes('estrenos') || gLower.includes('comedia');
            const isSeriesCategory = gLower.includes('serie') || gLower.includes('temporada') || gLower.includes('capitulo') || gLower.includes('season') || nLower.includes('t1') || nLower.includes('s01');

            // Si es categoría de animación pero tiene capítulos o temporadas, o palabras de series -> Series
            if (isSeriesCategory) {
                allMedia.series.push(item);
            } 
            // Si es categoría de películas / VOD / Animación de cine (como Shrek) -> Movies
            else if (isMovieCategory || gLower.includes('animadas')) {
                allMedia.movies.push(item);
            } 
            // Todo lo demás que sean canales de televisión 24/7 o en vivo -> Live TV
            else {
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

    // Mantener la categoría actual si existe en la sección, o seleccionar la primera
    if (!groups.includes(currentGroup)) {
        currentGroup = groups[0];
    }

    groups.forEach(group => {
        const count = list.filter(item => item.group === group).length;
        const el = document.createElement('div');
        el.className = `flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-semibold transition ${group === currentGroup ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`;
        
        // Evento de clic fluido y responsivo para cambiar de categoría al instante
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
            ? `<img src="${item.logo}" class="w-9 h-9 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800" onerror="this.src='https://via.placeholder.com/40?text=TV'">`
            : `<div class="w-9 h-9 bg-slate-950 rounded-lg flex items-center justify-center text-slate-500 border border-slate-800"><i class="fa-solid fa-play text-xs"></i></div>`;

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

function playMedia(item) {
    const video = document.getElementById('videoPlayer');
    document.getElementById('playingName').innerText = item.name;
    document.getElementById('currentChannelInfo').classList.remove('hidden');

    if (Hls.isSupported() && item.url.includes('.m3u8')) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(item.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play();
        });
    } else {
        video.src = item.url;
        video.play();
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
