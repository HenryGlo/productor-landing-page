/* Idiomas ES / EN sobre una sola URL.
   El español vive en el marcado; el inglés en window.I18N_EN (por página).

   Precedencia: ?lang= en la URL  >  preferencia guardada  >  idioma del navegador.
   La URL manda a propósito: los formularios se auditan desde fuera con enlaces
   directos (?lang=en), y quien los abra tiene que ver ese idioma aunque su
   navegador tenga otra preferencia guardada de una visita anterior. */
(function(){
  const KEY = "oldtape-lang";
  const EN  = window.I18N_EN || {};
  const META = window.I18N_META || {};

  const nodes = document.querySelectorAll("[data-i18n]");
  const phs   = document.querySelectorAll("[data-i18n-ph]");

  /* El español se toma del propio DOM: no hay que mantenerlo dos veces. */
  const ES = {}, ES_PH = {};
  nodes.forEach(el => { ES[el.dataset.i18n] = el.innerHTML; });
  phs.forEach(el => { ES_PH[el.dataset.i18nPh] = el.getAttribute("placeholder"); });

  const btns = document.querySelectorAll(".lang button[data-lang]");
  let actual = "es";

  function apply(lang, guardar){
    const en = lang === "en";
    nodes.forEach(el => {
      const v = en ? EN[el.dataset.i18n] : ES[el.dataset.i18n];
      if (v != null) el.innerHTML = v;
    });
    phs.forEach(el => {
      const v = en ? EN[el.dataset.i18nPh] : ES_PH[el.dataset.i18nPh];
      if (v != null) el.setAttribute("placeholder", v);
    });

    document.documentElement.lang = lang;
    const meta = META[lang];
    if (meta) {
      if (meta.title) document.title = meta.title;
      const md = document.querySelector("meta[name=description]");
      if (md && meta.desc) md.content = meta.desc;
    }
    btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

    actual = lang;
    /* Un ?lang= de la URL no se guarda: es una visita dirigida (auditoría, enlace
       compartido) y no debe reescribir la preferencia de quien ya eligió idioma. */
    if (guardar) { try { localStorage.setItem(KEY, lang); } catch(e){} }
  }

  const url = new URLSearchParams(location.search).get("lang");
  let inicial = null, deURL = false;

  if (url === "es" || url === "en") {
    inicial = url; deURL = true;
  } else {
    try { inicial = localStorage.getItem(KEY); } catch(e){}
    if (inicial !== "es" && inicial !== "en") {
      inicial = (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
    }
  }
  apply(inicial, !deURL);

  btns.forEach(b => b.addEventListener("click", () => apply(b.dataset.lang, true)));

  /* Lo consulta crm.js para registrar en qué idioma se mostró el consentimiento. */
  window.oldtapeLang = function(){ return actual; };
})();
