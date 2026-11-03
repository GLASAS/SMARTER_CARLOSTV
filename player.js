let allChannels = [];
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
        await loadPlaylistDirect(targetUrls[0]);
    } else {
        hideLoader();
        alert("No se encontró ninguna URL en la columna URL1 de Google Sheets.");
    }
}

async function loadPlaylistDirect(url) {
    allChannels = [];
    showLoader('Descargando lista M3U...');

    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('No se pudo descargar la lista M3U');
        
        const data = await response.text();
        parseExM3UUniversal(data);
        hideLoader();
        openSection('live');
    } catch (error) {
        console.error(error);
        hideLoader();
        alert('Error al cargar la lista M3U. Comprueba que el enlace sea accesible.');
    }
}

// LECTURA UNIVERSAL DE EXM3U (CANALES, PELÍCULAS Y SERIES)
function parseExM3UUniversal(content) {
    allChannels = [];
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            currentItem = {};
            let tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i) || line.match(/logo="([^"]*)"/i);
            let groupMatch = line.match(/group-title="([^"]*)"/i) || line.match(/group-title='([^']*)'/i);
            
            let nameParts = line.split(',');
            currentItem.name = nameParts[nameParts.length - 1].trim();
            currentItem.logo = tvgLogoMatch ? tvgLogoMatch[1] : '';
            currentItem.group = groupMatch ? groupMatch[1].trim() : 'General';
        } else if (line && !line.startsWith('#')) {
            currentItem.url = line;
            if (currentItem.name && currentItem.url) {
                let gLower = currentItem.group.toLowerCase();
                let uLower = currentItem.url.toLowerCase();

                // Clasificación inteligente por tipo
                if (gLower.includes('pelicula') || gLower.includes('vod') || gLower.includes('movie') || gLower.includes('cine') || gLower.includes('animacion') || gLower.includes('animadas') || gLower.includes('comedia') || uLower.includes('.mp4') || uLower.includes('.mkv')) {
                    currentItem.type = 'movies';
                } else if (gLower.includes('serie') || gLower.includes('temporada') || gLower.includes('capitulo')) {
                    currentItem.type = 'series';
                } else {
                    currentItem.type = 'live';
                }

                allChannels.push(currentItem);
            }
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
    const list = allChannels.filter(item => item.type === currentSection);
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
    const list = allChannels.filter(item => item.type === currentSection);

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
            ? `<img src="${item.logo}" class="w-9 h-9 object-cover rounded-lg bg-slate-950 p-1 border border-slate-800" onerror="this.src='https://via.placeholder.com/40?text=TV'">`
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

// REPRODUCTOR LIMPIO Y SIN ALERTAS INTRUSIVAS (ESTILO DVSDFS.HTML)
function playMedia(item) {
    const video = document.getElementById('videoPlayer');
    document.getElementById('playingName').innerText = item.name;
    document.getElementById('currentChannelInfo').classList.remove('hidden');

    if (Hls.isSupported() && item.url.includes('.m3u8')) {
        if (hls) {
            hls.destroy();
        }
        hls = new Hls();
        hls.loadSource(item.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Reproducción iniciada", e));
        });
    } else {
        video.src = item.url;
        video.play().catch(e => {
            console.warn("Reproducción directa intentada:", e);
        });
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
