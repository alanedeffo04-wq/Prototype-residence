const $ = s => document.querySelector(s);
const src = p => encodeURI(p); // gère les espaces dans les noms de fichiers
let current = null;

/* ========= LANGUES (FR / EN) ========= */
const I18N = {
  fr: {
    title:"Résidence meublée en centre-ville", menu:"Ouvrir le menu", close:"Fermer",
    nav_home:"Accueil", nav_catalog:"Catalogue", nav_contact:"Contact",
    hero_title:"Séjournez au cœur de la ville, comme chez vous",
    hero_text:"Des appartements meublés et équipés, à deux pas de tout. Choisissez le vôtre et réservez en quelques minutes.",
    hero_btn:"Voir les appartements",
    a1:"Assistance 24h/24", a2:"Plein centre-ville", a3:"Sécurité",
    cat_title:"Catalogue", contact_title:"Contact",
    contact_text:"Besoin d’informations ? Posez-nous vos questions, nous vous répondons rapidement.",
    wa_btn:"Écrire sur WhatsApp", mail_btn:"Envoyer un e-mail",
    f_contact:"Contact", f_assist:"Assistance", f_assist_txt:"Disponible 24h/24, 7j/7", rights:"Tous droits réservés.",
    book_title:"Réserver", f_last:"Nom", f_first:"Prénom", f_email:"Adresse e-mail", f_phone:"Numéro de téléphone",
    f_in:"Date d’arrivée", f_out:"Date de départ", f_options:"Options",
    o1:"Transfert depuis l’aéroport", o2:"Ménage supplémentaire", o3:"Petit-déjeuner", o4:"Lit bébé", o5:"Arrivée tardive",
    f_other:"Autre demande (facultatif)", send:"Envoyer",
    sent_title:"Demande envoyée", sent_text:"Merci ! Votre demande a bien été transmise. Nous vous recontactons très vite.",
    close_btn:"Fermer",
    wa_fallback:"Ouvrir WhatsApp",
    reserve:"Réserver", unavailable:"Indisponible pour le moment", badge:"Indisponible", view:"Voir", unavail_paren:" (indisponible)", photo:"photo",
    err_required:"Veuillez remplir tous les champs obligatoires.",
    err_email:"L’adresse e-mail n’est pas valide.",
    err_dates:"La date de départ doit être après la date d’arrivée.",
    wa_info:"Bonjour, j’aimerais avoir des informations.",
    wa_intro:"Bonjour, je souhaite réserver :", wa_apt:"Appartement", wa_name:"Nom", wa_email:"E-mail", wa_phone:"Téléphone",
    wa_in:"Arrivée", wa_out:"Départ", wa_opts:"Options", wa_none:"aucune", wa_msg:"Message"
  },
  en: {
    title:"Furnished residence in the city center", menu:"Open menu", close:"Close",
    nav_home:"Home", nav_catalog:"Catalog", nav_contact:"Contact",
    hero_title:"Stay in the heart of the city, feel right at home",
    hero_text:"Furnished, fully equipped apartments, steps from everything. Pick yours and book in minutes.",
    hero_btn:"View the apartments",
    a1:"24/7 support", a2:"City center", a3:"Security",
    cat_title:"Catalog", contact_title:"Contact",
    contact_text:"Need information? Ask us anything, we reply quickly.",
    wa_btn:"Message us on WhatsApp", mail_btn:"Send an e-mail",
    f_contact:"Contact", f_assist:"Support", f_assist_txt:"Available 24/7", rights:"All rights reserved.",
    book_title:"Book", f_last:"Last name", f_first:"First name", f_email:"E-mail address", f_phone:"Phone number",
    f_in:"Check-in date", f_out:"Check-out date", f_options:"Options",
    o1:"Airport transfer", o2:"Extra cleaning", o3:"Breakfast", o4:"Baby cot", o5:"Late arrival",
    f_other:"Other request (optional)", send:"Send",
    sent_title:"Request sent", sent_text:"Thank you! Your request has been sent. We will contact you very soon.",
    close_btn:"Close",
    wa_fallback:"Open WhatsApp",
    reserve:"Book", unavailable:"Currently unavailable", badge:"Unavailable", view:"View", unavail_paren:" (unavailable)", photo:"photo",
    err_required:"Please fill in all required fields.",
    err_email:"The e-mail address is not valid.",
    err_dates:"The check-out date must be after the check-in date.",
    wa_info:"Hello, I would like some information.",
    wa_intro:"Hello, I would like to book:", wa_apt:"Apartment", wa_name:"Name", wa_email:"E-mail", wa_phone:"Phone",
    wa_in:"Check-in", wa_out:"Check-out", wa_opts:"Options", wa_none:"none", wa_msg:"Message"
  }
};

let lang = "fr";
try{
  lang = localStorage.getItem("lang") || ((navigator.language||"fr").toLowerCase().startsWith("en") ? "en" : "fr");
}catch(e){
  lang = (navigator.language||"fr").toLowerCase().startsWith("en") ? "en" : "fr";
}
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.fr[k] || k;
const L = (a,k) => (lang === "en" && a[k+"_en"]) || a[k];

/* ========= DISPONIBILITÉ (gérée depuis admin.html) ========= */
let indispos = {};
const dispo = a => indispos[a.id] !== false;
async function chargerDispos(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return;
  try{
    const r = await fetch(CONFIG.supabaseUrl + "/rest/v1/appartements_statut?select=id,disponible",
      {headers:{"apikey":CONFIG.supabaseKey}});
    if(!r.ok) return;
    (await r.json()).forEach(x => indispos[x.id] = x.disponible);
    renderGrid();
  }catch(x){ console.error("Disponibilités indisponibles", x); }
}

/* ========= CATALOGUE ========= */
const grid = $("#grid");
function renderGrid(){
  grid.innerHTML = "";
  APPARTS.forEach(a=>{
    const ok = dispo(a);
    const nom = L(a,"nom");
    const b = document.createElement("button");
    b.className = "card" + (ok ? "" : " off"); b.type = "button";
    b.setAttribute("aria-label", t("view") + " " + nom + (ok ? "" : t("unavail_paren")));
    b.innerHTML = `<div class="ph"><img src="${src(a.cover || a.photos[0])}" alt="${nom}" loading="lazy" onerror="this.remove()">${ok ? "" : '<span class="badge">' + t("badge") + '</span>'}</div>
      <div class="meta"><h3>${nom}</h3><p>${L(a,"resume")}</p><div class="price">${L(a,"prix")}</div></div>`;
    b.onclick = () => openDetail(a);
    grid.appendChild(b);
  });
}

/* ========= FICHE ========= */
function showPhoto(i){
  $("#dMain").src = src(current.photos[i]);
  $("#dMain").alt = L(current,"nom") + " – " + t("photo") + " " + (i+1);
  [...$("#dThumbs").children].forEach((x,k)=>x.setAttribute("aria-current", k===i));
}
function openDetail(a){
  current = a;
  $("#dTitle").textContent = L(a,"nom");
  $("#dDesc").textContent = L(a,"desc");
  $("#dPrice").textContent = L(a,"prix");
  $("#dBook").disabled = !dispo(a);
  $("#dBook").textContent = dispo(a) ? t("reserve") : t("unavailable");
  $("#dList").innerHTML = (a["infos_"+lang] || a.infos).map(x=>`<li>${x}</li>`).join("");
  const th = $("#dThumbs"); th.innerHTML = "";
  a.photos.forEach((p,i)=>{
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", t("photo") + " " + (i+1));
    b.innerHTML = `<img src="${src(p)}" alt="" onerror="this.remove()">`;
    b.onclick = () => showPhoto(i);
    th.appendChild(b);
  });
  showPhoto(0);
  $("#dlgDetail").showModal();
}

/* ========= RÉSERVATION ========= */
$("#dBook").onclick = () => {
  $("#dlgDetail").close();
  $("#bSum").textContent = L(current,"nom") + " · " + L(current,"prix");
  $("#form").hidden = false; $("#ok").hidden = true; $("#err").textContent = "";
  const old = $("#waFallback"); if(old) old.remove();
  const today = new Date().toISOString().slice(0,10);
  $("#form").arrivee.min = today; $("#form").depart.min = today;
  $("#dlgBook").showModal();
};

$("#form").addEventListener("submit", async e=>{
  e.preventDefault();
  const f = e.target, err = $("#err");
  const checked = [...f.querySelectorAll('[name=options]:checked')];
  const d = {
    appartement: current.nom,                        // enregistré en français dans la base
    nom: f.nom.value.trim(), prenom: f.prenom.value.trim(),
    email: f.email.value.trim(), tel: f.tel.value.trim(),
    arrivee: f.arrivee.value, depart: f.depart.value,
    options: checked.map(o=>o.value),                // enregistré en français dans la base
    message: f.message.value.trim()
  };
  if(!d.nom||!d.prenom||!d.email||!d.tel||!d.arrivee||!d.depart){err.textContent=t("err_required");return;}
  if(!/^\S+@\S+\.\S+$/.test(d.email)){err.textContent=t("err_email");return;}
  if(d.depart <= d.arrivee){err.textContent=t("err_dates");return;}
  err.textContent = "";

  // Message WhatsApp dans la langue choisie par le client
  const optsTxt = checked.map(o=>o.parentElement.textContent.trim()).join(", ") || t("wa_none");
  const txt = `${t("wa_intro")}\n• ${t("wa_apt")} : ${L(current,"nom")}\n• ${t("wa_name")} : ${d.prenom} ${d.nom}\n• ${t("wa_email")} : ${d.email}\n• ${t("wa_phone")} : ${d.tel}\n• ${t("wa_in")} : ${d.arrivee}\n• ${t("wa_out")} : ${d.depart}\n• ${t("wa_opts")} : ${optsTxt}\n• ${t("wa_msg")} : ${d.message||"–"}`;
  const wa = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(txt);

  // 1) On ouvre WhatsApp tout de suite (pendant le clic, donc non bloqué)
  window.open(wa, "_blank");
  $("#send").disabled = true;

  // 2) On enregistre dans la base de données
  try{
    if(CONFIG.supabaseUrl && CONFIG.supabaseKey){
      const r = await fetch(CONFIG.supabaseUrl + "/rest/v1/reservations", {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":CONFIG.supabaseKey,"Prefer":"return=minimal"},
        body:JSON.stringify(d)
      });
      if(!r.ok) throw new Error(r.status + " " + await r.text());
    }else{
      const all = JSON.parse(localStorage.getItem("reservations")||"[]"); all.push(d);
      localStorage.setItem("reservations", JSON.stringify(all)); // test uniquement
    }
  }catch(x){ console.error("Enregistrement impossible", x); }

  // 3) Écran de confirmation + bouton de secours WhatsApp
  $("#send").disabled = false;
  f.reset(); f.hidden = true; $("#ok").hidden = false;
  const old = $("#waFallback"); if(old) old.remove();
  const p = document.createElement("p");
  p.id = "waFallback"; p.style.marginTop = "18px";
  p.innerHTML = `<a class="btn wa" href="${wa}" target="_blank" rel="noopener">${t("wa_fallback")}</a>`;
  $("#ok").insertBefore(p, $("#ok").lastElementChild);
});

/* ========= APPLIQUER LA LANGUE ========= */
function applyLang(){
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  document.querySelectorAll(".langs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  $("#waContact").href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(t("wa_info"));
  renderGrid();
}
document.querySelectorAll(".langs button").forEach(b => b.onclick = () => {
  lang = b.dataset.lang;
  try{ localStorage.setItem("lang", lang); }catch(e){}
  applyLang();
});

/* ========= DIVERS ========= */
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
$("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
$("#nav").addEventListener("click",e=>{if(e.target.tagName==="A"){$("#nav").classList.remove("open")}});
$("#mailContact").href = "mailto:" + CONFIG.email;
$("#yr").textContent = new Date().getFullYear();

applyLang();
chargerDispos();