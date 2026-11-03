let currentUserData = null;

// URL de tu Web App de Google Apps Script (puedes reemplazarla si usas otra)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwR-YL0aHif3Tpzy3sfOybxItD_uoxlJl7KdDhZLm4X7Vm0ZK3PtdOBgw8Y93Nh2m6xkA/exec"; 

async function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!user || !pass) {
        alert("Por favor, introduce usuario y contraseña.");
        return;
    }

    showLoader("Verificando credenciales en Google Sheets...");

    try {
        // Si tienes configurado tu auth.js previo con fetch a Google Sheets, mantenlo o usa esta estructura:
        const response = await fetch(`${WEB_APP_URL}?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
        const data = await response.json();

        if (data && data.success) {
            currentUserData = data;
            hideLoader();
            initAppSession(false);
        } else {
            hideLoader();
            alert(data.message || "Credenciales incorrectas.");
        }
    } catch (e) {
        console.warn("Error conectando con Google Sheets, usando modo de prueba local para CARCORZA", e);
        
        // Modo de respaldo si estás probando localmente con tu usuario CARCORZA
        if (user.toUpperCase() === "CARCORZA") {
            currentUserData = {
                success: true,
                usuario: "CARCORZA",
                nombre: "CARLOS CORREDOR",
                vencimiento: "2027-10-31",
                urls: ["col.m3u"]
            };
            hideLoader();
            initAppSession(false);
        } else {
            hideLoader();
            alert("Error de conexión o usuario no autorizado.");
        }
    }
}

function logout() {
    currentUserData = null;
    stopMedia();
    document.getElementById('appHeader').classList.add('hidden');
    document.getElementById('appMain').classList.add('hidden');
    document.getElementById('viewLogin').classList.remove('hidden');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

function showLoader(text) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center gap-3';
        loader.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin text-cyan-500 text-4xl"></i>
            <p id="loaderText" class="text-xs text-slate-300 font-medium"></p>
        `;
        document.body.appendChild(loader);
    }
    document.getElementById('loaderText').innerText = text;
    loader.classList.remove('hidden');
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.classList.add('hidden');
}
