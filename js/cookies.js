/* Consentimiento de cookies. Preferencia en localStorage (cookie estrictamente necesaria). */
(function(){
  const KEY = "oldtape-cookies";
  const COPY = {
    es: {
      txt: 'Usamos cookies técnicas para que el sitio funcione y para recordar tu idioma y esta preferencia. Al enviar un formulario, tus datos van a Oldtape para atenderte. Más información en la <a href="cookies.html">política de cookies</a>.',
      ok: "Aceptar",
      no: "Solo necesarias"
    },
    en: {
      txt: 'We use essential cookies so the site works and to remember your language and this choice. When you submit a form, your details go to Oldtape so we can reply. See the <a href="cookies.html">cookie policy</a>.',
      ok: "Accept",
      no: "Essential only"
    }
  };

  function lang(){
    try {
      const saved = localStorage.getItem("oldtape-lang");
      if (saved === "en" || saved === "es") return saved;
    } catch (e) {}
    const l = (document.documentElement.lang || "es").toLowerCase();
    return l.startsWith("en") ? "en" : "es";
  }

  function leido(){
    try { return localStorage.getItem(KEY); } catch (e) { return "all"; }
  }

  function guardar(v){
    try { localStorage.setItem(KEY, v); } catch (e) {}
    document.documentElement.classList.remove("ck-open");
    const bar = document.getElementById("ck-bar");
    if (bar) bar.remove();
  }

  function pintar(){
    if (leido()) return;
    const t = COPY[lang()] || COPY.es;
    const bar = document.createElement("div");
    bar.id = "ck-bar";
    bar.className = "ck-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", lang() === "en" ? "Cookies" : "Cookies");
    bar.innerHTML =
      '<div class="ck-inner">' +
        "<p>" + t.txt + "</p>" +
        '<div class="ck-actions">' +
          '<button type="button" class="ck-ok">' + t.ok + "</button>" +
          '<button type="button" class="ck-no">' + t.no + "</button>" +
        "</div>" +
      "</div>";
    document.body.appendChild(bar);
    document.documentElement.classList.add("ck-open");
    bar.querySelector(".ck-ok").addEventListener("click", function(){ guardar("all"); });
    bar.querySelector(".ck-no").addEventListener("click", function(){ guardar("necessary"); });
  }

  window.oldtapeResetCookies = function(){
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pintar);
  } else {
    pintar();
  }

  document.querySelectorAll(".lang button[data-lang]").forEach(function(b){
    b.addEventListener("click", function(){
      const bar = document.getElementById("ck-bar");
      if (!bar) return;
      const t = COPY[b.dataset.lang === "en" ? "en" : "es"];
      bar.querySelector("p").innerHTML = t.txt;
      bar.querySelector(".ck-ok").textContent = t.ok;
      bar.querySelector(".ck-no").textContent = t.no;
    });
  });
})();
