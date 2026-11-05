import { authenticate, currentSession, logout } from "./auth.js";
import { loadPlaylist, showCatalog } from "./catalog.js";
import { stopPlayer } from "./player.js";
import { initAdmin } from "./admin.js";
const loginScreen=document.getElementById("login-screen"), appScreen=document.getElementById("app-screen");
const loginForm=document.getElementById("login-form"), loginMessage=document.getElementById("login-message");
const playerModal=document.getElementById("player-modal");
function setView(view) {
  document.querySelectorAll(".view").forEach(el=>el.classList.add("hidden"));
  document.getElementById(view==="home"?"home-view":"catalog-view").classList.remove("hidden");
  document.getElementById("admin-view").classList.add("hidden");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view!=="home"&&view!=="admin") showCatalog(view);
}
async function enter(s) {
  loginScreen.classList.add("hidden");appScreen.classList.remove("hidden");
  document.getElementById("welcome-user").textContent=s.user+(s.role==="admin"?" · ADMIN":"");
  document.getElementById("account-expiry").textContent=s.role==="admin"?"Panel de administración":`Vence: ${s.expiresAt}`;
  document.getElementById("admin-nav").classList.toggle("hidden",s.role!=="admin");
  setView("home");
  if(s.role==="admin") return;
  try { await loadPlaylist(s.playlistUrl); } catch(e){console.error(e);}
}
loginForm.addEventListener("submit",async e=>{
  e.preventDefault();loginMessage.textContent="Validando acceso...";
  const btn=loginForm.querySelector("button");btn.disabled=true;
  try { const s=await authenticate(document.getElementById("username").value,document.getElementById("password").value);loginMessage.textContent="";await enter(s); }
  catch(err){loginMessage.textContent=err.message||"Usuario o contraseña incorrectos.";}
  finally{btn.disabled=false;}
});
document.addEventListener("click",e=>{
  const target=e.target.closest("[data-view]");
  if(!target)return;
  const s=currentSession();
  if(target.dataset.view==="admin"&&s?.role==="admin"){initAdmin(s);return;}
  setView(target.dataset.view);
});
function closePlayer(){stopPlayer();playerModal.classList.add("hidden");}
document.getElementById("player-close").addEventListener("click",closePlayer);
document.getElementById("player-back").addEventListener("click",closePlayer);
document.getElementById("logout-btn").addEventListener("click",()=>{closePlayer();logout();appScreen.classList.add("hidden");loginScreen.classList.remove("hidden");loginForm.reset();});
document.getElementById("search-toggle").addEventListener("click",()=>{setView("live");document.getElementById("catalog-search").focus();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!playerModal.classList.contains("hidden"))closePlayer();});
const s=currentSession();if(s)enter(s);
