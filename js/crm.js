/* Embudo comercial: lead → CRM (ActivePieces) → landing del servicio → checkout PerfectFlow.
   El calendario no se abre desde la home: primero entra el contacto, después el VSL, después el pago. */
const PF_ENDPOINT = "https://cloud.activepieces.com/api/v1/webhooks/owBkjsQ3T1EImbHSkgMH9";
const PF_FALLBACK_MAIL = "contacto@oldtapemusic.com";
const LEAD_KEY = "oldtape-lead";

const SERVICIOS = {
  "track-session": {
    oferta: "Track Session",
    landing: "track-session.html",
    checkout: "https://ecosphere.perfectflow.cloud/es/agendar?fijar=657"
  },
  "pro90": {
    oferta: "PRO-90",
    landing: "pro90.html",
    checkout: "https://ecosphere.perfectflow.cloud/es/agendar?fijar=655"
  },
  "impulso-pro": {
    oferta: "Impulso PRO",
    landing: "impulso-pro.html",
    checkout: "https://ecosphere.perfectflow.cloud/es/agendar?fijar=656"
  }
};
window.SERVICIOS = SERVICIOS;

function slugDeOferta(oferta){
  const n = String(oferta || "").trim().toLowerCase();
  if (n === "track session") return "track-session";
  if (n === "pro-90" || n === "pro90") return "pro90";
  if (n === "impulso pro") return "impulso-pro";
  return "";
}

function servicioDesdeURL(){
  const q = new URLSearchParams(location.search).get("servicio") || "";
  return SERVICIOS[q] ? q : "";
}

function guardarLead(data){
  try {
    sessionStorage.setItem(LEAD_KEY, JSON.stringify({
      oferta: data.oferta || "",
      email: data.email || "",
      t: Date.now()
    }));
  } catch (e) {}
}

function serialize(form){
  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = (k === "consentimiento") ? true : v;
  });
  data.pagina = location.href;
  data.utm = location.search.replace(/^\?/, "");
  data.enviado_en = new Date().toISOString();
  return data;
}

function mailtoFallback(data){
  const cuerpo = Object.entries(data)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}: ${v}`).join("\n");
  const asunto = data.formulario === "contacto"
    ? `Contacto web — ${data.nombre || ""}`
    : `Solicitud — ${data.nombre || ""} (${data.oferta || "sin definir"})`;
  location.href = `mailto:${PF_FALLBACK_MAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

function destinoTrasLead(data){
  const slug = slugDeOferta(data.oferta);
  return slug ? SERVICIOS[slug].landing : "";
}

function cablearFormularios(){
  document.querySelectorAll("form.pf").forEach(form => {
    const msg = form.querySelector(".form-msg");
    const btn = form.querySelector("button[type=submit]");
    if (!msg || !btn) return;

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      msg.className = "form-msg";

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = serialize(form);
      const textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.classList.add("is-blue");
      btn.textContent = "Enviando…";

      const irALanding = data.formulario !== "contacto" && destinoTrasLead(data);

      try {
        if (!PF_ENDPOINT) { mailtoFallback(data); throw new Error("sin-endpoint"); }

        const res = await fetch(PF_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("HTTP " + res.status);

        guardarLead(data);
        form.reset();
        if (irALanding) {
          location.href = irALanding;
          return;
        }
        msg.textContent = "Solicitud enviada. Te respondemos por correo o WhatsApp.";
        msg.className = "form-msg ok show";
      } catch (err) {
        if (err.message === "sin-endpoint") {
          guardarLead(data);
          msg.textContent = "Abrimos tu correo con la solicitud lista para enviar.";
          msg.className = "form-msg ok show";
          if (irALanding) setTimeout(() => { location.href = irALanding; }, 600);
        } else {
          msg.textContent = "No pudimos enviar el formulario. Escríbenos a " + PF_FALLBACK_MAIL;
          msg.className = "form-msg err show";
        }
      } finally {
        btn.disabled = false;
        btn.classList.remove("is-blue");
        btn.textContent = textoOriginal;
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", cablearFormularios);
} else {
  cablearFormularios();
}
