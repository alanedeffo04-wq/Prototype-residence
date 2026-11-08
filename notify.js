/* Envoie un e-mail à la résidence pour chaque nouvelle réservation (via Web3Forms) */
(function(){
  const form = document.querySelector("#form");
  if(!form) return;

  form.addEventListener("submit", function(){
    if(!CONFIG.web3formsKey) return;
    // Ne rien envoyer si le formulaire est incomplet ou si les dates sont incohérentes
    if(!form.checkValidity() || form.depart.value <= form.arrivee.value) return;

    const options = [...form.querySelectorAll('[name=options]:checked')].map(o=>o.value).join(", ") || "aucune";
    const appart = (document.querySelector("#bSum").textContent || "").split(" · ")[0];
    const nom = form.prenom.value.trim() + " " + form.nom.value.trim();

    const message =
      "Nouvelle demande de réservation\n\n" +
      "Appartement : " + appart + "\n" +
      "Nom : " + nom + "\n" +
      "E-mail : " + form.email.value.trim() + "\n" +
      "Téléphone : " + form.tel.value.trim() + "\n" +
      "Arrivée : " + form.arrivee.value + "\n" +
      "Départ : " + form.depart.value + "\n" +
      "Options : " + options + "\n" +
      "Message : " + (form.message.value.trim() || "–");

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {"Content-Type":"application/json","Accept":"application/json"},
      body: JSON.stringify({
        access_key: CONFIG.web3formsKey,
        subject: "Nouvelle réservation – " + appart + " – " + nom,
        from_name: "Site de la résidence",
        name: nom,
        email: form.email.value.trim(),
        message: message
      })
    }).catch(function(e){ console.error("E-mail non envoyé", e); });
  });
})();