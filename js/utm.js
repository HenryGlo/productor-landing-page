/* Captura de UTMs.
   Se leen al aterrizar y sobreviven la navegación entre secciones y entre
   páginas (sessionStorage) hasta que la persona envía un formulario.
   Se mandan concatenados en `utm`, que en el CRM cae en las notas. */
(function(){
  const KEY = "oldtape-utm";
  const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  /* Los enlaces de anuncios y de descripciones de video no siempre traen utm_*;
     estos identificadores son los que llegan de verdad y valen igual para atribuir. */
  const EXTRA = ["gclid", "fbclid", "ttclid", "msclkid", "li_fat_id", "ref"];

  /* Respaldo en memoria: en navegación privada sessionStorage puede fallar. */
  let memoria = {};

  function leerURL(){
    const q = new URLSearchParams(location.search);
    const out = {};
    UTM.concat(EXTRA).forEach(function(k){
      const v = (q.get(k) || "").trim();
      if (v) out[k] = v.slice(0, 200);
    });
    return out;
  }

  function guardado(){
    let s = {};
    try { s = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
    return Object.assign({}, s, memoria);
  }

  function capturar(){
    const nuevos = leerURL();
    /* Sin parámetros en la URL no se pisa lo ya capturado: la persona pudo
       entrar por el anuncio y luego navegar a otra sección o a reservar.html. */
    if (!Object.keys(nuevos).length) return guardado();

    const datos = Object.assign(guardado(), nuevos);
    if (!datos.entrada) datos.entrada = location.href;
    memoria = datos;
    try { sessionStorage.setItem(KEY, JSON.stringify(datos)); } catch (e) {}
    return datos;
  }

  capturar();

  window.oldtapeUTM = {
    datos: guardado,
    /* String libre para el campo `utm`. Vacío si la visita fue directa. */
    cadena: function(){
      const d = guardado();
      return Object.keys(d).map(function(k){ return k + "=" + d[k]; }).join(" | ");
    }
  };
})();
