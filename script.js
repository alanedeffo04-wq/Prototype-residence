const $ = s => document.querySelector(s);
let current = null;

/* Disponibilité (gérée depuis admin.html) */
let indispos = {};
const dispo = a => indispos[a.id] !== false;
async function chargerDispos(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  try{
    const r = await fetch(CONFIG.supabaseUrl + "/rest/v1/appartements_statut?select=id,disponible",
      {headers:{"apikey":CONFIG.supabaseKey,"Authorization":"Bearer "+CONFIG.supabaseKey}});
    if(!r.ok) return;
    (await r.json()).forEach(x => indispos[x.id] = x.disponible);
    renderGrid();
  }catch(x){ console.error("Disponibilités indisponibles", x); }
}

/* Catalogue */
const grid = $("#grid");
function renderGrid(){
  grid.innerHTML = "";
  APPARTS.forEach(a=>{
    const ok = dispo(a);
    const b = document.createElement("button");
    b.className = "card" + (ok ? "" : " off"); b.type = "button";
    b.setAttribute("aria-label", "Voir " + a.nom + (ok ? "" : " (indisponible)"));
    b.innerHTML = `<div class="ph"><img src="${a.photos[0]}" alt="${a.nom}" loading="lazy" onerror="this.remove()">${ok ? "" : '<span class="badge">Indisponible</span>'}</div>
      <div class="meta"><h3>${a.nom}</h3><p>${a.resume}</p><div class="price">${a.prix}</div></div>`;
    b.onclick = () => openDetail(a);
    grid.appendChild(b);
  });
}
renderGrid();
chargerDispos();

/* Fiche */
function showPhoto(i){
  $("#dMain").src = current.photos[i];
  $("#dMain").alt = current.nom + " – photo " + (i+1);
  [...$("#dThumbs").children].forEach((t,k)=>t.setAttribute("aria-current", k===i));
}
function openDetail(a){
  current = a;
  $("#dTitle").textContent = a.nom;
  $("#dDesc").textContent = a.desc;
  $("#dPrice").textContent = a.prix;
  $("#dBook").disabled = !dispo(a);
  $("#dBook").textContent = dispo(a) ? "Réserver" : "Indisponible pour le moment";
  $("#dList").innerHTML = a.infos.map(x=>`<li>${x}</li>`).join("");
  const th = $("#dThumbs"); th.innerHTML = "";
  a.photos.forEach((p,i)=>{
    const t = document.createElement("button");
    t.type = "button"; t.setAttribute("aria-label","Photo "+(i+1));
    t.innerHTML = `<img src="${p}" alt="" onerror="this.remove()">`;
    t.onclick = () => showPhoto(i);
    th.appendChild(t);
  });
  showPhoto(0);
  $("#dlgDetail").showModal();
}

/* Réservation */
$("#dBook").onclick = () => {
  $("#dlgDetail").close();
  $("#bSum").textContent = current.nom + " · " + current.prix;
  $("#form").hidden = false; $("#ok").hidden = true; $("#err").textContent = "";
  const today = new Date().toISOString().slice(0,10);
  $("#form").arrivee.min = today; $("#form").depart.min = today;
  $("#dlgBook").showModal();
};

$("#form").addEventListener("submit", async e=>{
  e.preventDefault();
  const f = e.target, err = $("#err");
  const d = {
    appartement: current.nom,
    nom: f.nom.value.trim(), prenom: f.prenom.value.trim(),
    email: f.email.value.trim(), tel: f.tel.value.trim(),
    arrivee: f.arrivee.value, depart: f.depart.value,
    options: [...f.querySelectorAll('[name=options]:checked')].map(o=>o.value),
    message: f.message.value.trim(), date_envoi: new Date().toISOString()
  };
  if(!d.nom||!d.prenom||!d.email||!d.tel||!d.arrivee||!d.depart){err.textContent="Veuillez remplir tous les champs obligatoires.";return;}
  if(!/^\S+@\S+\.\S+$/.test(d.email)){err.textContent="L’adresse e-mail n’est pas valide.";return;}
  if(d.depart <= d.arrivee){err.textContent="La date de départ doit être après la date d’arrivée.";return;}
  err.textContent = "";

  // Ouvre WhatsApp tout de suite (évite le blocage des popups)
  const txt = `Bonjour, je souhaite réserver :\n• Appartement : ${d.appartement}\n• Nom : ${d.prenom} ${d.nom}\n• E-mail : ${d.email}\n• Téléphone : ${d.tel}\n• Arrivée : ${d.arrivee}\n• Départ : ${d.depart}\n• Options : ${d.options.join(", ")||"aucune"}\n• Message : ${d.message||"–"}`;
  const wa = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(txt);
  const win = window.open("", "_blank");
  $("#send").disabled = true;

  // Enregistrement en base de données
  try{
    if(CONFIG.supabaseUrl && CONFIG.supabaseKey){
      const {date_envoi, ...row} = d;
      const r = await fetch(CONFIG.supabaseUrl + "/rest/v1/reservations", {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":CONFIG.supabaseKey,"Authorization":"Bearer "+CONFIG.supabaseKey,"Prefer":"return=minimal"},
        body:JSON.stringify(row)
      });
      if(!r.ok) throw new Error(await r.text());
    }else{
      const all = JSON.parse(localStorage.getItem("reservations")||"[]"); all.push(d);
      localStorage.setItem("reservations", JSON.stringify(all)); // test uniquement
    }
  }catch(x){ console.error("Enregistrement impossible", x); }

  if(win) win.location = wa; else location.href = wa;
  $("#send").disabled = false;
  f.reset(); f.hidden = true; $("#ok").hidden = false;
});

/* Divers */
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
$("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
$("#nav").addEventListener("click",e=>{if(e.target.tagName==="A"){$("#nav").classList.remove("open")}});
$("#waContact").href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent("Bonjour, j’aimerais avoir des informations.");
$("#mailContact").href = "mailto:" + CONFIG.email;
$("#yr").textContent = new Date().getFullYear();