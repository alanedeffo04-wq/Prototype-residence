const $ = s => document.querySelector(s);
const API = CONFIG.supabaseUrl;
let token = sessionStorage.getItem("admin_token");
let etat = {};   // id -> true/false (absent = disponible)
let resas = [];

const headers = () => {
  const h = {"Content-Type":"application/json","apikey":CONFIG.supabaseKey};
  if(token) h["Authorization"] = "Bearer " + token;
  return h;
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fr = d => d ? d.split("-").reverse().join("/") : "";

function afficher(connecte){
  $("#login").hidden = connecte;
  $("#panel").hidden = !connecte;
}
function deconnecter(msg){
  token = null; sessionStorage.removeItem("admin_token");
  afficher(false);
  $("#loginErr").textContent = msg || "";
}

/* ---------- Disponibilités ---------- */
async function chargerDispos(){
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
    row.innerHTML = `<div><strong>${esc(a.nom)}</strong><span class="etat ${ok ? "" : "off"}">${ok ? "Disponible" : "Indisponible"}</span></div>`;
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

/* ---------- Réservations ---------- */
async function chargerResas(){
  $("#resaErr").textContent = "";
  try{
    const r = await fetch(API + "/rest/v1/reservations?select=*&order=created_at.desc", {headers: headers()});
    if(r.status === 401) return deconnecter("Session expirée. Reconnectez-vous.");
    if(!r.ok) throw new Error();
    resas = await r.json();
    dessinerResas();
  }catch(e){ $("#resaErr").textContent = "Impossible de charger les réservations. Avez-vous lancé le script SQL (policies « Admin lit… ») dans Supabase ?"; }
}

function dessinerResas(){
  const box = $("#resas");
  box.innerHTML = "";
  if(!resas.length){ box.innerHTML = '<p style="color:var(--muted)">Aucune réservation pour le moment.</p>'; return; }
  resas.forEach(r=>{
    const opts = (r.options && r.options.length) ? r.options.join(", ") : "aucune";
    const recu = r.created_at ? new Date(r.created_at).toLocaleString("fr-FR", {dateStyle:"short", timeStyle:"short"}) : "";
    const div = document.createElement("div");
    div.className = "resa";
    div.innerHTML = `
      <div class="resa-top"><strong>${esc(r.prenom)} ${esc(r.nom)}</strong><span class="tag ${r.statut === "nouvelle" ? "new" : ""}">${esc(r.statut)}</span></div>
      <p>${esc(r.appartement)} · du ${esc(fr(r.arrivee))} au ${esc(fr(r.depart))}</p>
      <p>${esc(r.email)} · ${esc(r.tel)}</p>
      <p>Options : ${esc(opts)}</p>
      ${r.message ? `<p>Message : ${esc(r.message)}</p>` : ""}
      <p style="font-size:.85rem">Reçue le ${esc(recu)}</p>`;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn sm" + (r.statut === "nouvelle" ? "" : " ghost");
    b.textContent = r.statut === "nouvelle" ? "Envoyer l’accusé de réception" : "Renvoyer l’accusé";
    b.onclick = () => accuse(r, b);
    div.appendChild(b);
    box.appendChild(div);
  });
}

async function accuse(r, btn){
  btn.disabled = true; $("#resaErr").textContent = "";
  const opts = (r.options && r.options.length) ? r.options.join(", ") : "aucune";
  const sujet = "Accusé de réception de votre demande de réservation";
  const corps = `Bonjour ${r.prenom} ${r.nom},\n\nNous avons bien reçu votre demande de réservation :\n• Appartement : ${r.appartement}\n• Arrivée : ${fr(r.arrivee)}\n• Départ : ${fr(r.depart)}\n• Options : ${opts}\n\nNous vous recontactons très prochainement pour la confirmer.\n\nCordialement,\nL’équipe de la résidence`;
  try{
    const res = await fetch(API + "/rest/v1/reservations?id=eq." + r.id, {
      method: "PATCH",
      headers: {...headers(), "Prefer": "return=minimal"},
      body: JSON.stringify({statut: "accusé envoyé"})
    });
    if(res.status === 401) return deconnecter("Session expirée. Reconnectez-vous.");
    if(!res.ok) throw new Error();
    r.statut = "accusé envoyé";
  }catch(e){ $("#resaErr").textContent = "Le statut n’a pas pu être mis à jour, mais l’e-mail est prêt."; }
  dessinerResas();
  window.location.href = "mailto:" + r.email + "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(corps);
}

/* ---------- Connexion ---------- */
function charger(){ chargerDispos(); chargerResas(); }

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