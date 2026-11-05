/**
 * SMART IPTV CHARLY - API para Google Sheets.
 * Hoja: A FECHA CREACION | B FECHA VENCIMIENTO | C NOMBRE | D APELLIDO
 * E USUARIO | F CLAVE | G URL1 | H ESTADO (opcional; si falta, se considera ACTIVO)
 *
 * Configura ADMIN_USER y ADMIN_PASSWORD en Propiedades del script.
 */
const CONFIG = {
  SPREADSHEET_ID: "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET",
  SHEET_NAME: "Hoja 1",
  HEADER_ROW: 1,
  TOKEN_TTL_SECONDS: 21600
};
function doPost(e) {
  try {
    const b=JSON.parse((e&&e.postData&&e.postData.contents)||"{}");
    if(b.action==="login") return json_(login_(b));
    const session=getSession_(String(b.token||""));
    if(!session) return json_({ok:false,message:"Sesión vencida. Ingresa nuevamente."});
    if(session.role!=="admin") return json_({ok:false,message:"No tienes permisos de administrador."});
    if(b.action==="listUsers") return json_(listUsers_());
    if(b.action==="saveUser") return json_(saveUser_(b));
    return json_({ok:false,message:"Acción no válida."});
  } catch(err) {
    console.error(err);
    return json_({ok:false,message:"Error interno. Revisa la configuración del servicio."});
  }
}
function login_(b) {
  const username=String(b.username||"").trim(), password=String(b.password||"");
  if(!username||!password) return {ok:false,message:"Completa usuario y contraseña."};
  const props=PropertiesService.getScriptProperties();
  const adminUser=props.getProperty("ADMIN_USER"), adminPass=props.getProperty("ADMIN_PASSWORD");
  if(adminUser&&adminPass&&username===adminUser&&password===adminPass) {
    const token=createSession_({role:"admin",user:adminUser});
    return {ok:true,role:"admin",user:"Administrador",token};
  }
  const sh=getSheet_(), last=sh.getLastRow();
  if(last<=CONFIG.HEADER_ROW) return {ok:false,message:"No hay usuarios registrados."};
  const rows=sh.getRange(CONFIG.HEADER_ROW+1,1,last-CONFIG.HEADER_ROW,8).getValues();
  for(let i=0;i<rows.length;i++) {
    const r=rows[i], status=String(r[7]||"ACTIVO").toUpperCase();
    if(String(r[4]||"").trim().toLowerCase()!==username.toLowerCase()||String(r[5]||"")!==password) continue;
    if(status!=="ACTIVO") return {ok:false,message:"Esta cuenta está bloqueada."};
    const expiry=r[1];
    if(!(expiry instanceof Date)||isNaN(expiry.getTime())) return {ok:false,message:"La fecha de vencimiento no es válida."};
    const end=new Date(expiry);end.setHours(23,59,59,999);
    if(new Date()>end) return {ok:false,message:"Tu cuenta está vencida. Comunícate con el administrador."};
    const url=String(r[6]||"").trim();
    if(!/^https?:\/\//i.test(url)) return {ok:false,message:"Tu cuenta no tiene una URL válida en la columna G."};
    const token=createSession_({role:"user",user:username,playlistUrl:url,expiresAt:Utilities.formatDate(end,Session.getScriptTimeZone(),"yyyy-MM-dd")});
    return {ok:true,role:"user",user:[r[2],r[3]].filter(Boolean).join(" ")||username,playlistUrl:url,expiresAt:Utilities.formatDate(end,Session.getScriptTimeZone(),"yyyy-MM-dd"),token};
  }
  return {ok:false,message:"Usuario o contraseña incorrectos."};
}
function createSession_(data) {
  const token=Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"");
  CacheService.getScriptCache().put("sess_"+token,JSON.stringify(data),CONFIG.TOKEN_TTL_SECONDS);
  return token;
}
function getSession_(token) {
  if(!token) return null;
  const value=CacheService.getScriptCache().get("sess_"+token);
  return value?JSON.parse(value):null;
}
function getSheet_() {
  const sh=SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if(!sh) throw new Error("Pestaña no encontrada: "+CONFIG.SHEET_NAME);
  return sh;
}
function listUsers_() {
  const sh=getSheet_(), last=sh.getLastRow();
  if(last<=CONFIG.HEADER_ROW) return {ok:true,users:[]};
  const rows=sh.getRange(CONFIG.HEADER_ROW+1,1,last-CONFIG.HEADER_ROW,8).getValues();
  const users=rows.map((r,i)=>({row:i+CONFIG.HEADER_ROW+1,name:String(r[2]||""),lastname:String(r[3]||""),
    username:String(r[4]||""),expiry:r[1] instanceof Date?Utilities.formatDate(r[1],Session.getScriptTimeZone(),"yyyy-MM-dd"):"",
    url:String(r[6]||""),status:String(r[7]||"ACTIVO").toUpperCase()})).filter(u=>u.username);
  return {ok:true,users};
}
function saveUser_(b) {
  const sh=getSheet_();
  if(sh.getMaxColumns()<8) sh.insertColumnsAfter(sh.getMaxColumns(),8-sh.getMaxColumns());
  if(String(b.mode)==="status") {
    const row=Number(b.row);
    if(row<=CONFIG.HEADER_ROW||row>sh.getLastRow()) return {ok:false,message:"Fila inválida."};
    sh.getRange(row,8).setValue(String(b.status)==="BLOQUEADO"?"BLOQUEADO":"ACTIVO");
    return {ok:true};
  }
  const username=String(b.username||"").trim(), password=String(b.password||"");
  const name=String(b.name||"").trim(), lastname=String(b.lastname||"").trim();
  const url=String(b.url||"").trim(), status=String(b.status||"ACTIVO").toUpperCase();
  if(!username||!name||!b.expiry||!/^https?:\/\//i.test(url)) return {ok:false,message:"Completa nombre, usuario, vencimiento y URL válida."};
  if(status!=="ACTIVO"&&status!=="BLOQUEADO") return {ok:false,message:"Estado inválido."};
  const expiry=new Date(String(b.expiry)+"T12:00:00");
  if(isNaN(expiry.getTime())) return {ok:false,message:"Fecha de vencimiento inválida."};
  const last=sh.getLastRow(), rows=last>CONFIG.HEADER_ROW?sh.getRange(CONFIG.HEADER_ROW+1,1,last-CONFIG.HEADER_ROW,8).getValues():[];
  const mode=String(b.mode||"create"), row=Number(b.row||0);
  for(let i=0;i<rows.length;i++) {
    const actualRow=i+CONFIG.HEADER_ROW+1;
    if(String(rows[i][4]||"").trim().toLowerCase()===username.toLowerCase()&&!(mode==="update"&&actualRow===row))
      return {ok:false,message:"Ese nombre de usuario ya existe."};
  }
  if(mode==="create") {
    if(!password) return {ok:false,message:"La contraseña es obligatoria al crear."};
    sh.appendRow([new Date(),expiry,name,lastname,username,password,url,status]);
  } else if(mode==="update") {
    if(row<=CONFIG.HEADER_ROW||row>sh.getLastRow()) return {ok:false,message:"Fila inválida."};
    const old=sh.getRange(row,1,1,8).getValues()[0];
    sh.getRange(row,1,1,8).setValues([[old[0]||new Date(),expiry,name,lastname,username,password||old[5],url,status]]);
  } else return {ok:false,message:"Operación no reconocida."};
  return {ok:true};
}
function doGet() { return json_({ok:true,service:"SMART IPTV CHARLY API",status:"online"}); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
