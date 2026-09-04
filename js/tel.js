/* Teléfono con bandera y prefijo en todos los formularios.
   Se envía el número normalizado a E.164 en `telefono` (lo que exige WhatsApp)
   y el país seleccionado en `pais` (ISO 3166-1 alfa-2).

   Coste: el núcleo son ~14 KB gz. La tabla de validación (utils, ~60 KB gz) se
   descarga sólo cuando alguien toca un campo de teléfono, no en cada visita.
   Si la librería no carga, el campo sigue funcionando: se manda lo escrito. */
(function(){
  const VER  = "25.11.2";
  const CDN  = "https://cdn.jsdelivr.net/npm/intl-tel-input@" + VER + "/build/js/";

  /* País por defecto. Pendiente: confirmar con Nathaly cuál trae más tráfico.
     Mientras tanto, España (es lo acordado como fallback).
     Para detectar por IP hay que poner DETECTAR_POR_IP = true, y antes revisar
     el aviso de cookies: es una petición a un tercero con la IP del visitante. */
  const PAIS_POR_DEFECTO = "es";
  const DETECTAR_POR_IP  = false;

  const instancias = [];
  let promesaUtils = null;

  function lang(){
    try {
      const s = localStorage.getItem("oldtape-lang");
      if (s === "en" || s === "es") return s;
    } catch (e) {}
    return (document.documentElement.lang || "es").toLowerCase().startsWith("en") ? "en" : "es";
  }

  /* La tabla de validación pesa: se pide al tocar el campo, no en cada visita.
     Devuelve siempre una promesa que resuelve, cargue o no: el formulario
     nunca se queda colgado esperando al CDN. */
  function pedirUtils(){
    if (promesaUtils) return promesaUtils;
    if (!window.intlTelInput) return (promesaUtils = Promise.resolve(false));
    if (window.intlTelInput.utils) return (promesaUtils = Promise.resolve(true));

    let carga;
    try {
      carga = window.intlTelInput.attachUtils(function(){ return import(CDN + "utils.js"); });
    } catch (e) {
      carga = Promise.reject(e);
    }
    const tope = new Promise(function(r){ setTimeout(r, 6000); });
    promesaUtils = Promise.race([Promise.resolve(carga).catch(function(){}), tope])
      .then(function(){ return !!window.intlTelInput.utils; });
    return promesaUtils;
  }

  /* Lo llama crm.js antes de validar y serializar: si la tabla no llegó todavía,
     se espera a que llegue en vez de mandar un número mal normalizado. */
  function listo(){
    return pedirUtils().then(function(ok){
      if (ok) instancias.forEach(function(reg){ reg.revisar(); });
      return ok;
    });
  }

  function hiddenPais(form){
    let el = form.querySelector('[name="pais"]');
    if (!el) {
      el = document.createElement("input");
      el.type = "hidden";
      el.name = "pais";
      form.appendChild(el);
    }
    return el;
  }

  /* Respaldo si utils nunca llegó: E.164 a mano.
     Se quita el 0 de tronco nacional, que es el error habitual al escribir. */
  function e164Manual(iti, valor){
    const pais = iti.getSelectedCountryData() || {};
    const escrito = String(valor || "").trim();
    if (escrito.charAt(0) === "+") return "+" + escrito.replace(/\D/g, "");
    const nacional = escrito.replace(/\D/g, "").replace(/^0+/, "");
    if (!nacional) return "";
    return "+" + (pais.dialCode || "") + nacional;
  }

  function montar(input){
    const form = input.closest("form");
    if (!form || input._iti) return;

    const opciones = {
      initialCountry: DETECTAR_POR_IP ? "auto" : PAIS_POR_DEFECTO,
      countryOrder: ["es", "mx", "co", "ar", "us", "ve", "cl", "pe"],
      separateDialCode: true,
      countrySearch: true,
      formatAsYouType: true,
      strictMode: true,
      i18n: window.__itiES || {}
    };
    if (DETECTAR_POR_IP) {
      opciones.geoIpLookup = function(cb){
        fetch("https://ipapi.co/json/")
          .then(function(r){ return r.json(); })
          .then(function(d){ cb((d && d.country_code || PAIS_POR_DEFECTO).toLowerCase()); })
          .catch(function(){ cb(PAIS_POR_DEFECTO); });
      };
    }

    const iti = window.intlTelInput(input, opciones);
    input._iti = iti;

    /* El mensaje nativo del navegador ya lo muestra crm.js con reportValidity(). */
    function revisar(){
      if (!input.value.trim() || !window.intlTelInput.utils) { input.setCustomValidity(""); return; }
      input.setCustomValidity(iti.isValidNumber() ? "" : "Revisa el número: falta algún dígito para ese país.");
    }

    instancias.push({ input: input, iti: iti, pais: hiddenPais(form), revisar: revisar });

    /* Varios disparadores: focus solo se pierde en algunos recorridos (autocompletar,
       pegar con el ratón), y el número tiene que salir bien igualmente. */
    ["focus", "pointerdown", "input"].forEach(function(ev){
      input.addEventListener(ev, pedirUtils, { once: true });
    });

    input.addEventListener("blur", revisar);
    input.addEventListener("input", function(){ input.setCustomValidity(""); });
    input.addEventListener("countrychange", revisar);
  }

  /* crm.js llama a esto antes de serializar: deja el DOM con los valores que van al CRM. */
  function aplicar(form){
    instancias.forEach(function(reg){
      if (form && reg.input.closest("form") !== form) return;
      if (!reg.input.value.trim()) { reg.pais.value = ""; return; }
      const e164 = reg.iti.getNumber() || e164Manual(reg.iti, reg.input.value);
      if (e164) reg.input.value = e164;
      const pais = reg.iti.getSelectedCountryData() || {};
      reg.pais.value = (pais.iso2 || "").toUpperCase();
    });
  }

  window.oldtapeTel = { aplicar: aplicar, listo: listo };

  function arrancar(){
    const campos = document.querySelectorAll("form.pf input[type=tel]");
    if (!campos.length || !window.intlTelInput) return;
    campos.forEach(montar);
  }

  /* Los nombres de país en español son 2 KB gz. Si no llegan, quedan en inglés. */
  function conIdioma(){
    if (lang() !== "es") return arrancar();
    import(CDN + "i18n/es/index.js")
      .then(function(m){ window.__itiES = m.default || {}; })
      .catch(function(){})
      .then(arrancar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", conIdioma);
  } else {
    conIdioma();
  }
})();
