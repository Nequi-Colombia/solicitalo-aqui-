/* ============================================================================
   utils.js — Utilidades compartidas para todo el flujo
   ============================================================================
   Contiene:
   - safeStorage: wrapper seguro de localStorage (funciona en Safari incógnito)
   - toast: notificaciones no bloqueantes (reemplazo de alert)
   - sendToDiscord: envío a Discord con timeout y reintentos
   - formatCOP: formateo de moneda colombiana
   - formatearFecha: formateo de fechas
   - debounce: utilidad genérica
   ============================================================================ */

(function (global) {
  "use strict";

  /* --------------------------------------------------------------------------
     1) SAFE STORAGE
     Wrapper que evita que la app se rompa si localStorage está bloqueado
     (Safari en modo incógnito, permisos de terceros, storage lleno, etc.)
     -------------------------------------------------------------------------- */
  const memoryFallback = new Map();
  let storageAvailable = true;

  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (e) {
    storageAvailable = false;
    console.warn("[safeStorage] localStorage no disponible, usando fallback en memoria");
  }

  const safeStorage = {
    getItem(key) {
      try {
        if (storageAvailable) return window.localStorage.getItem(key);
      } catch (e) { /* ignorar */ }
      return memoryFallback.has(key) ? memoryFallback.get(key) : null;
    },

    setItem(key, value) {
      try {
        if (storageAvailable) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (e) { /* ignorar */ }
      memoryFallback.set(key, String(value));
    },

    removeItem(key) {
      try {
        if (storageAvailable) window.localStorage.removeItem(key);
      } catch (e) { /* ignorar */ }
      memoryFallback.delete(key);
    },

    // Helpers JSON seguros
    getJSON(key, defaultValue) {
      const raw = this.getItem(key);
      if (!raw) return defaultValue ?? null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.warn(`[safeStorage] JSON inválido en "${key}", devolviendo default`);
        return defaultValue ?? null;
      }
    },

    setJSON(key, value) {
      try {
        this.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`[safeStorage] No se pudo guardar JSON en "${key}"`, e);
      }
    }
  };

  /* --------------------------------------------------------------------------
     2) TOAST (notificaciones no bloqueantes)
     -------------------------------------------------------------------------- */
  let toastContainerEl = null;

  function ensureToastContainer() {
    if (toastContainerEl) return toastContainerEl;

    toastContainerEl = document.createElement("div");
    toastContainerEl.id = "toast-container";
    toastContainerEl.setAttribute("role", "status");
    toastContainerEl.setAttribute("aria-live", "polite");
    Object.assign(toastContainerEl.style, {
      position: "fixed",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "92vw",
      pointerEvents: "none",
    });
    document.body.appendChild(toastContainerEl);
    return toastContainerEl;
  }

  /**
   * Muestra un toast no bloqueante.
   * @param {string} message - Texto a mostrar.
   * @param {object} [opts]
   * @param {"info"|"success"|"error"|"warning"} [opts.type="info"]
   * @param {number} [opts.duration=3500] - ms antes de desaparecer (0 = no auto-cerrar)
   */
  function toast(message, opts) {
    const options = Object.assign(
      { type: "info", duration: 3500 },
      opts || {}
    );

    const colors = {
      info:    { bg: "#200020", fg: "#ffffff" },
      success: { bg: "#0bbd67", fg: "#ffffff" },
      error:   { bg: "#da0081", fg: "#ffffff" },
      warning: { bg: "#ff9800", fg: "#ffffff" }
    };
    const c = colors[options.type] || colors.info;

    const el = document.createElement("div");
    el.textContent = message;
    Object.assign(el.style, {
      background: c.bg,
      color: c.fg,
      padding: "12px 16px",
      borderRadius: "10px",
      fontFamily: "Manrope, system-ui, sans-serif",
      fontSize: "14px",
      fontWeight: "600",
      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      opacity: "0",
      transform: "translateY(-12px)",
      transition: "opacity .25s ease, transform .25s ease",
      pointerEvents: "auto",
      lineHeight: "1.35",
      maxWidth: "420px",
    });

    ensureToastContainer().appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    const remove = () => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-12px)";
      setTimeout(() => el.remove(), 260);
    };

    if (options.duration > 0) {
      setTimeout(remove, options.duration);
    }

    el.addEventListener("click", remove);
    return remove;
  }

  /* --------------------------------------------------------------------------
     3) SEND TO DISCORD (con timeout, retry y log)
     -------------------------------------------------------------------------- */
  /**
   * Envía un mensaje a Discord.
   * @param {string} webhookUrl
   * @param {string} content
   * @param {object} [opts]
   * @param {number} [opts.timeout=8000]
   * @param {number} [opts.retries=2]
   * @returns {Promise<boolean>} true si se envió, false si falló tras reintentos
   */
  async function sendToDiscord(webhookUrl, content, opts) {
    const options = Object.assign({ timeout: 8000, retries: 2 }, opts || {});
    let attempt = 0;

    while (attempt <= options.retries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeout);

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok || res.status === 204) {
          return true;
        }
        if (res.status === 429) {
          // Rate limit: esperamos y reintentamos
          const retryAfter = Number(res.headers.get("retry-after")) || 1;
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        console.warn(`[sendToDiscord] HTTP ${res.status} (intento ${attempt})`);
      } catch (err) {
        clearTimeout(timer);
        console.warn(`[sendToDiscord] Fallo intento ${attempt}:`, err.message);
      }

      if (attempt <= options.retries) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }

    console.error("[sendToDiscord] Se agotaron los reintentos");
    return false;
  }

  /* --------------------------------------------------------------------------
     4) FORMATO MONEDA Y FECHA
     -------------------------------------------------------------------------- */
  function formatCOP(value, opts) {
    const n = typeof value === "string"
      ? Number(value.replace(/[^\d.-]/g, ""))
      : Number(value);
    if (isNaN(n)) return "";
    return new Intl.NumberFormat("es-CO", Object.assign(
      { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 },
      opts || {}
    )).format(n);
  }

  function formatearFecha(fecha) {
    if (!fecha || fecha === "No disponible") return "No disponible";
    // Si ya viene YYYY-MM-DD o DD-MM-YYYY, la devolvemos normalizada YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
      const [d, m, y] = fecha.split("-");
      return `${y}-${m}-${d}`;
    }
    return fecha;
  }

  /* --------------------------------------------------------------------------
     5) DEBOUNCE
     -------------------------------------------------------------------------- */
  function debounce(fn, wait) {
    let t;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* --------------------------------------------------------------------------
     EXPORTAR
     -------------------------------------------------------------------------- */
  global.Utils = {
    safeStorage,
    toast,
    sendToDiscord,
    formatCOP,
    formatearFecha,
    debounce,
    storageAvailable,
  };

})(window);