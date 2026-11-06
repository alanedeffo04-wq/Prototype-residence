const $ = s => document.querySelector(s);
const API = CONFIG.supabaseUrl;
let token = sessionStorage.getItem("admin_token");
let etat = {}; // id -> true/false (absent = disponible)

const headers = () => ({
  "Content-Type": "application/json",
  "apikey": CONFIG.supabaseKey,
  "Authorization": "Bearer " + (token || CONFIG.supabaseKey)
});

function afficher(connecte){
  $("#login").hidden = connecte;
  $("#panel").hidden = !connecte;
}

function deconnecter(msg){
  token = null; sessionStorage.removeItem("admin_token");
  afficher(false);
  $("#loginErr").textContent = msg || "";
}

async function charger(){
  $("#panelErr").textContent = "";
  try{
    const r = await fetch(API + "/rest/v1/appartements_statut?select=id,disponible", {headers: headers()});
    if(r.status === 401) return deconnecter("Session expirée. Reconnectez-vous.");
    if(!r.ok) throw new Error();
    etat = {};
    (await r.json()).forEach(x => etat[x.id] = x.disponible);
    dessiner();
  }catch(e){ $("#panelErr").textContent = "Impossible de charger les appartements. Vérifiez votre connexion."; }
}

function dessiner(){
  $("#lots").innerHTML = "";
  APPARTS.forEach(a=>{
    const ok = etat[a.id] !== false;
    const row = document.createElement("div");
    row.className = "lot";
    row.innerHTML = `<div><strong>${a.nom}</strong><span class="etat ${ok ? "" : "off"}">${ok ? "Disponible" : "Indisponible"}</span></div>`;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn sm" + (ok ? "" : " ghost");
    b.textContent = ok ? "Mettre indisponible" : "Remettre disponible";
    b.onclick = () => changer(a.id, !ok, b);
    row.appendChild(b);
    $("#lots").appendChild(row);
  });
}

async function changer(id, disponible, btn){
  btn.disabled = true; $("#panelErr").textContent = "";
  try{
    const r = await fetch(API + "/rest/v1/appartements_statut?on_conflict=id", {
      method: "POST",
      headers: {...headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
      body: JSON.stringify({id, disponible, updated_at: new Date().toISOString()})
    });
    if(r.status === 401) return deconnecter("Session expirée. Reconnectez-vous.");
    if(!r.ok) throw new Error();
    etat[id] = disponible;
  }catch(e){ $("#panelErr").textContent = "La modification n’a pas été enregistrée. Réessayez."; }
  dessiner();
}

$("#loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const err = $("#loginErr"); err.textContent = "";
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey){ err.textContent = "Renseignez supabaseUrl et supabaseKey dans config.js."; return; }
  try{
    const r = await fetch(API + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {"Content-Type":"application/json","apikey":CONFIG.supabaseKey},
      body: JSON.stringify({email: $("#email").value.trim(), password: $("#pwd").value})
    });
    if(!r.ok){ err.textContent = "E-mail ou mot de passe incorrect."; return; }
    token = (await r.json()).access_token;
    sessionStorage.setItem("admin_token", token);
    $("#pwd").value = "";
    afficher(true); charger();
  }catch(x){ err.textContent = "Connexion impossible. Réessayez."; }
});

$("#logout").onclick = () => deconnecter();

if(token){ afficher(true); charger(); } else afficher(false);