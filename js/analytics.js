/* Analítica: GA4 + Meta Pixel, atados al banner de cookies.

   Pegá aquí los dos identificadores. Mientras estén vacíos no se carga nada,
   así que el sitio sigue funcionando igual si todavía no los tenés.
     - GA4: Admin → Flujos de datos → tu web  (G-XXXXXXXXXX)
     - Meta: Administrador de eventos → Orígenes de datos (15-16 dígitos) */
const GA4_ID = "G-9WR2SB06PD";
const META_PIXEL_ID = "";

(function(){
  const KEY = "oldtape-cookies";

  function consentimiento(){
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  /* Sin decisión tomada, o con "solo necesarias", nada de cookies de medición.
     GA4 igual se carga: en modo denegado manda pings sin cookies ni id, que es
     lo que permite recuperar los datos si después la persona acepta. */
  const acepta = consentimiento() === "all";

  /* ---------- GA4 (Consent Mode v2) ---------- */

  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ window.dataLayer.push(arguments); };

  /* El default tiene que quedar fijado ANTES de que cargue el script de Google;
     por eso este archivo va en el <head>, antes que el resto. */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });

  if (GA4_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);

    gtag("js", new Date());
    /* El idioma se elige en la página y no está en la URL: viaja como parámetro
       propio para poder separar el tráfico ES del EN en los informes. */
    /* `anonymize_ip` no existe en GA4 (era de Universal Analytics): pasarlo solo
       crea un parámetro de evento inútil. GA4 no guarda la IP en ningún caso. */
    gtag("config", GA4_ID, {
      idioma_sitio: (document.documentElement.lang || "es").toLowerCase().slice(0, 2)
    });
  }

  /* ---------- Meta Pixel ---------- */

  /* No tiene modo de consentimiento: o se carga con permiso, o no se carga. */
  function cargarMeta(){
    if (!META_PIXEL_ID || window.fbq) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq("init", META_PIXEL_ID);
    fbq("track", "PageView");
  }

  if (acepta) cargarMeta();

  /* ---------- Puente con el banner de cookies ---------- */

  /* cookies.js llama a esto al guardar la preferencia, para no obligar a
     recargar la página cuando alguien acepta. */
  window.oldtapeConsent = function(valor){
    const ok = valor === "all";
    gtag("consent", "update", {
      ad_storage: ok ? "granted" : "denied",
      ad_user_data: ok ? "granted" : "denied",
      ad_personalization: ok ? "granted" : "denied",
      analytics_storage: ok ? "granted" : "denied"
    });
    if (ok) cargarMeta();
  };

  /* ---------- Eventos ---------- */

  /* Un solo punto de entrada para el resto del sitio: manda el mismo evento a
     GA4 y a Meta con el nombre que cada uno espera. */
  const NOMBRE_META = {
    generate_lead: "Lead",
    begin_checkout: "InitiateCheckout",
    contacto: "Contact",
    lista_espera: "Lead"
  };

  window.oldtapeTrack = function(nombre, params){
    const p = params || {};
    try { if (window.gtag && GA4_ID) gtag("event", nombre, p); } catch (e) {}
    try {
      if (window.fbq) {
        const meta = NOMBRE_META[nombre];
        if (meta) fbq("track", meta, p);
        else fbq("trackCustom", nombre, p);
      }
    } catch (e) {}
  };

  /* Clic en el enlace de compartir por WhatsApp: sale del sitio, así que sin
     esto no queda registro de que ocurrió. */
  document.addEventListener("click", function(ev){
    const a = ev.target.closest && ev.target.closest('a[href^="https://wa.me"]');
    if (a) window.oldtapeTrack("compartir_whatsapp", { metodo: "whatsapp" });
  });
})();
