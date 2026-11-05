import { adminAction } from "./api.js";
let session = null;
let users = [];
const $ = id => document.getElementById(id);
const form = $("user-form");
const message = $("admin-message");
const tbody = $("users-table-body");
const dateValue = value => value ? new Date(value).toISOString().slice(0,10) : "";
function say(text, bad=false) { message.textContent = text; message.className = bad ? "message error" : "message success"; }
function resetForm() { form.reset(); $("edit-row").value = ""; $("user-form-title").textContent = "Crear usuario"; $("save-user").textContent = "Crear cuenta"; }
function fillForm(u) {
  $("edit-row").value = u.row;
  $("u-name").value = u.name || ""; $("u-lastname").value = u.lastname || "";
  $("u-username").value = u.username || ""; $("u-password").value = "";
  $("u-expiry").value = dateValue(u.expiry); $("u-url").value = u.url || "";
  $("u-status").value = u.status || "ACTIVO";
  $("user-form-title").textContent = "Editar usuario";
  $("save-user").textContent = "Guardar cambios";
  $("u-password").required = false;
  window.scrollTo({top:0,behavior:"smooth"});
}
function render() {
  tbody.innerHTML = "";
  if (!users.length) {
    const tr=document.createElement("tr"), td=document.createElement("td");
    td.colSpan=7; td.textContent="Todavía no hay usuarios registrados."; td.className="empty-cell";
    tr.append(td); tbody.append(tr); return;
  }
  users.forEach(u => {
    const tr=document.createElement("tr");
    const values=[u.name+" "+u.lastname,u.username,u.expiry,u.status,u.url];
    values.forEach((v,i)=>{const td=document.createElement("td");td.textContent=v || (i===4?"Sin lista":"—");tr.append(td);});
    const action=document.createElement("td"); action.className="table-actions";
    const edit=document.createElement("button"); edit.className="small-btn"; edit.textContent="Editar";
    edit.addEventListener("click",()=>fillForm(u));
    const toggle=document.createElement("button"); toggle.className="small-btn"; toggle.textContent=u.status==="BLOQUEADO"?"Activar":"Bloquear";
    toggle.addEventListener("click",()=>save({mode:"status",row:u.row,status:u.status==="BLOQUEADO"?"ACTIVO":"BLOQUEADO"}));
    action.append(edit,toggle);tr.append(action);tbody.append(tr);
  });
}
async function loadUsers() {
  say("Actualizando usuarios...");
  try { const r=await adminAction(session.token,"listUsers"); users=r.users; render(); say(`${users.length} cuentas cargadas.`); }
  catch(e){say(e.message,true);}
}
async function save(data) {
  try { await adminAction(session.token,"saveUser",data); say("Cambios guardados correctamente."); resetForm(); await loadUsers(); }
  catch(e){say(e.message,true);}
}
export function initAdmin(s) {
  session=s;
  $("admin-view").classList.remove("hidden");
  $("home-view").classList.add("hidden"); $("catalog-view").classList.add("hidden");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view==="admin"));
  loadUsers();
  $("new-user").addEventListener("click",()=>{resetForm();$("u-password").required=true;});
  $("refresh-users").addEventListener("click",loadUsers);
  $("cancel-edit").addEventListener("click",()=>{resetForm();say("Edición cancelada.");});
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const row=$("edit-row").value;
    const data={mode:row?"update":"create",row:row?Number(row):null,
      name:$("u-name").value.trim(),lastname:$("u-lastname").value.trim(),
      username:$("u-username").value.trim(),password:$("u-password").value,
      expiry:$("u-expiry").value,url:$("u-url").value.trim(),status:$("u-status").value};
    await save(data);
  });
}
