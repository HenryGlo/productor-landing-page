/* Dos flujos, dos destinos:
   - Compra (reservar.html): un webhook → landing del servicio → PerfectFlow.
   - Evaluación (#aplicar): un webhook por interés → correo de orientación. No va a landing ni a pago. */
const COMPRA_ENDPOINT = "https://cloud.activepieces.com/api/v1/webhooks/owBkjsQ3T1EImbHSkgMH9";
const CONTACTO_ENDPOINT = COMPRA_ENDPOINT;
const PF_FALLBACK_MAIL = "contacto@oldtapemusic.com";
const LEAD_KEY = "oldtape-lead";

/* Pegá aquí la URL Catch webhook de cada escenario de evaluación en Activepieces. */
const EVAL_ENDPOINTS = {
  "Track Session": "https://cloud.activepieces.com/api/v1/webhooks/CFWtsnwopZ6oSkTQ3QOET",
  "PRO90": "https://cloud.activepieces.com/api/v1/webhooks/CfJoJtaQKIMVgVQbzibna",
  "Impulso PRO": "https://cloud.activepieces.com/api/v1/webhooks/MVK2lB95KgzPnvFMI6hU3",
  "Grupal (lista de espera)": "https://cloud.activepieces.com/api/v1/webhooks/j2eDDxKCAULimdCdkWNPq"
};

const SERVICIOS = {
  "track-session": {
    oferta: "Track Session",
    landing: "track-session.html",
    checkout: "https://ecosphere.perfectflow.cloud/es/agendar?fijar=657"
  },
  "pro90": {
    oferta: "PRO90",
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

/* Valores de `oferta` que acepta el CRM, carácter por carácter.
   Lo que no coincide NO falla: el lead entra con Interés vacío y el texto
   acaba en Notas, así que el error es invisible. De ahí el aviso en consola.
   Actualizado el 2026-09-04: se retiraron Masterclass grupal, Focus 4,
   Sesión individual y Plan a medida. */
const OFERTAS_CRM = [
  "Track Session",
  "PRO90",
  "Impulso PRO",
  "Grupal (lista de espera)",
  "Todavía no lo sé"
];

/* Alias históricos del sitio → valor vigente del CRM. */
const INTERES_CRM = {
  "Track Session": "Track Session",
  "PRO-90": "PRO90",
  "PRO90": "PRO90",
  "Impulso PRO": "Impulso PRO",
  "Focus 4": "Impulso PRO",
  "Lista de espera grupal": "Grupal (lista de espera)",
  "Grupal (lista de espera)": "Grupal (lista de espera)",
  "Todavía no lo sé": "Todavía no lo sé"
};

/* Origen: cualquier otra cosa el CRM la tira a "Formulario web".
   La procedencia fina viaja en `utm`. */
const ORIGENES_CRM = [
  "Email", "Instagram", "Referido", "Anuncio pagado",
  "Webinar", "Orgánico", "Formulario web", "Otro"
];

function slugDeOferta(oferta){
  const n = String(oferta || "").trim().toLowerCase();
  if (n === "track session") return "track-session";
  if (n === "pro-90" || n === "pro90") return "pro90";
  if (n === "impulso pro" || n === "focus 4") return "impulso-pro";
  return "";
}

function servicioDesdeURL(){
  const q = new URLSearchParams(location.search).get("servicio") || "";
  return SERVICIOS[q] ? q : "";
}

function guardarLead(data){
  try {
    sessionStorage.setItem(LEAD_KEY, JSON.stringify({
      oferta: data.interes_web || data.oferta || "",
      email: data.email || "",
      t: Date.now()
    }));
  } catch (e) {}
}

function serialize(form){
  /* Deja en el DOM el teléfono en E.164 y el país antes de leer el formulario. */
  if (window.oldtapeTel) window.oldtapeTel.aplicar(form);

  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = (k === "consentimiento") ? true : v;
  });

  data.pagina = location.href;
  /* UTMs capturados al aterrizar, no sólo los de la URL actual: la persona
     llega por el anuncio y envía el formulario dos páginas después. */
  data.utm = (window.oldtapeUTM && window.oldtapeUTM.cadena()) || location.search.replace(/^\?/, "");
  data.enviado_en = new Date().toISOString();
  data.interes_web = String(data.oferta || "").trim();

  if (data.formulario === "aplicacion-1a1") data.flujo = "evaluacion";
  else if (data.formulario === "reserva-servicio") data.flujo = "compra";
  else if (data.formulario === "lista-espera-grupal") data.flujo = "lista-espera";
  else if (data.formulario === "contacto") data.flujo = "contacto";

  if (data.oferta && INTERES_CRM[data.oferta]) data.oferta = INTERES_CRM[data.oferta];
  if (data.oferta && OFERTAS_CRM.indexOf(data.oferta) === -1) {
    console.warn("[oldtape] `oferta` fuera de la lista del CRM:", data.oferta,
                 "— el lead entra con Interés vacío. Valores válidos:", OFERTAS_CRM);
  }
  if (ORIGENES_CRM.indexOf(data.origen) === -1) data.origen = "Formulario web";

  return data;
}

function endpointEval(interes){
  const k = String(interes || "").trim();
  if (EVAL_ENDPOINTS[k]) return EVAL_ENDPOINTS[k];
  if (k === "PRO-90") return EVAL_ENDPOINTS["PRO90"];
  if (k === "Focus 4") return EVAL_ENDPOINTS["Impulso PRO"];
  if (k === "Lista de espera grupal") return EVAL_ENDPOINTS["Grupal (lista de espera)"];
  return "";
}

function esEvaluacion(data, form){
  return data.formulario === "aplicacion-1a1" || (form && form.id === "form-aplicacion");
}

function endpointPara(data, form){
  /* Lista de espera grupal: mismo escenario de Activepieces que su evaluación
     (contacto + estado "Pendiente de responder" + acuse). No pasa por pago. */
  if (data.formulario === "lista-espera-grupal") {
    return EVAL_ENDPOINTS["Grupal (lista de espera)"] || CONTACTO_ENDPOINT;
  }
  if (esEvaluacion(data, form)) {
    return endpointEval(data.interes_web) || endpointEval(data.oferta) || "";
  }
  if (data.formulario === "contacto" || (form && form.id === "form-contacto")) {
    return CONTACTO_ENDPOINT;
  }
  return COMPRA_ENDPOINT;
}

function mailtoFallback(data){
  const cuerpo = Object.entries(data)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}: ${v}`).join("\n");
  const asunto = data.formulario === "contacto"
    ? `Contacto web — ${data.nombre || ""}`
    : `Solicitud — ${data.nombre || ""} (${data.interes_web || data.oferta || "sin definir"})`;
  location.href = `mailto:${PF_FALLBACK_MAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

function destinoTrasLead(data){
  if (data.formulario !== "reserva-servicio") return "";
  const fromUrl = servicioDesdeURL();
  if (fromUrl) return SERVICIOS[fromUrl].landing;
  const slug = slugDeOferta(data.interes_web || data.oferta);
  return slug ? SERVICIOS[slug].landing : "";
}

function mensajeOk(data){
  if (data.formulario === "aplicacion-1a1") {
    return "Te hemos enviado un correo con toda la información. Revisá tu bandeja (y spam) en unos minutos.";
  }
  if (data.formulario === "lista-espera-grupal") {
    return "Estás en la lista. Te avisamos por correo en cuanto se abran fechas.";
  }
  if (data.formulario === "contacto") {
    return "Mensaje enviado. Te respondemos por correo o WhatsApp.";
  }
  return "Solicitud enviada. Te respondemos por correo o WhatsApp.";
}

function cablearFormularios(){
  document.querySelectorAll("form.pf").forEach(form => {
    const msg = form.querySelector(".form-msg");
    const btn = form.querySelector("button[type=submit]");
    if (!msg || !btn) return;

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      msg.className = "form-msg";

      /* Espera a la tabla de validación de teléfonos si aún no llegó, para no
         mandar a WhatsApp un número normalizado a ojo. Resuelve igual si falla. */
      if (window.oldtapeTel) await window.oldtapeTel.listo();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = serialize(form);
      const endpoint = endpointPara(data, form);
      const textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.classList.add("is-blue");
      btn.textContent = "Enviando…";

      const irALanding = destinoTrasLead(data);

      try {
        if (!endpoint) { mailtoFallback(data); throw new Error("sin-endpoint"); }

        const res = await fetch(endpoint, {
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
        msg.textContent = mensajeOk(data);
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
