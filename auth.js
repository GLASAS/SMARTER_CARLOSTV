const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbykiHN6nT6qro80InnesjcRTdXNvS-JF4WxZ_HqswrwiE9NGyFOVsgjDHvTV70H661f/exec';

let currentUserData = null;

async function handleLogin() {
    const userIn = document.getElementById('loginUser').value.trim();
    const passIn = document.getElementById('loginPass').value.trim();
    const errDiv = document.getElementById('loginError');

    if (!userIn || !passIn) {
        errDiv.innerText = 'Introduce usuario y contraseña.';
        errDiv.classList.remove('hidden');
        return;
    }

    showLoader('Verificando credenciales en Google Sheets...');

    try {
        const response = await fetch(`${WEB_APP_URL}?action=login&user=${encodeURIComponent(userIn)}&pass=${encodeURIComponent(passIn)}`);
        const data = await response.json();

        if (data.status === 'success') {
            currentUserData = data;
            localStorage.setItem('iptv_session_user', JSON.stringify(currentUserData));
            toggleAppFullscreen();
            initAppSession(false);
        } else {
            hideLoader();
            errDiv.innerText = data.message;
            errDiv.classList.remove('hidden');
        }
    } catch (e) {
        hideLoader();
        console.error("Error de autenticación:", e);
        errDiv.innerText = 'Error al conectar con Google Sheets.';
        errDiv.classList.remove('hidden');
    }
}

function checkStoredSession() {
    const savedUser = localStorage.getItem('iptv_session_user');
    if (savedUser) {
        currentUserData = JSON.parse(savedUser);
        if (new Date(currentUserData.vencimiento) < new Date()) {
            alert('Su suscripción ha vencido.');
            logout();
        } else {
            initAppSession(true);
        }
    }
}

function logout() {
    localStorage.removeItem('iptv_session_user');
    location.reload();
}

function toggleAppFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
    }
}
