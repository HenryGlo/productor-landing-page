function montarVSL(config){
  const poster = document.getElementById("poster");
  const vsl = document.getElementById("vsl");
  if (!poster || !vsl) return;
  const VSL = Object.assign({ tipo:"youtube", id:"", inicio:0, titulo:"OLDTAPE" }, config);

  function fuente(){
    const t = VSL.inicio ? "&start="+VSL.inicio : "";
    if (VSL.tipo === "youtube") return "https://www.youtube-nocookie.com/embed/"+VSL.id+"?autoplay=1&rel=0&modestbranding=1&playsinline=1"+t;
    if (VSL.tipo === "vimeo") return "https://player.vimeo.com/video/"+VSL.id+"?autoplay=1&title=0&byline=0";
    return VSL.id;
  }

  poster.addEventListener("click", function(){
    if (!VSL.id){
      poster.querySelector(".poster-txt").textContent = "El video se publicará aquí";
      return;
    }
    let el;
    if (VSL.tipo === "archivo"){
      el = document.createElement("video");
      el.src = fuente(); el.controls = true; el.autoplay = true; el.playsInline = true;
    } else {
      el = document.createElement("iframe");
      el.src = fuente();
      el.allow = "autoplay; fullscreen; picture-in-picture";
      el.allowFullscreen = true;
      el.title = VSL.titulo;
    }
    poster.remove();
    vsl.appendChild(el);
  });
}

function cablearCheckout(slug){
  const mapa = window.SERVICIOS || {};
  const url = (mapa[slug] && mapa[slug].checkout) || "#";
  document.querySelectorAll("[data-checkout]").forEach(function(a){
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
  });
}
