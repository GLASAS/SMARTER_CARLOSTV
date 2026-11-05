import { API_URL } from "./config.js";

async function request(payload) {
  if (!API_URL || API_URL.includes("PEGA_AQUI")) throw new Error("Falta configurar la URL del servicio en js/config.js.");
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Error de conexión (${response.status}).`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || "No fue posible completar la solicitud.");
  return data;
}
export const login = (username, password) => request({ action: "login", username, password });
export const adminAction = (token, action, data = {}) => request({ action, token, ...data });
