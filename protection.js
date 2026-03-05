"use strict";
// ============================================================
// protection.ts — نظام الحماية الشامل | TypeScript Edition
// اللغة: TypeScript — أقوى حماية وأصعب اختراق
// ============================================================
;
(function () {
    "use strict";
    const CONFIG = {
        SENSITIVE_VARS: ["currentQuestions", "sessionScore", "globalTimeLeft", "isQuizActive"],
        SENSITIVE_LOG_WORDS: ["question", "correct", "answer", "score", "password", "currentQuestions"],
        BLOCKED_KEYS: ["u", "i", "j", "c", "v", "x", "s", "a", "p", "f", "g", "e", "h", "k", "l", "n", "r", "t", "w"],
        BLOCKED_SHIFT_KEYS: ["i", "j", "c", "k", "e", "m", "u", "p"],
        DEVTOOLS_THRESHOLD: 300,
        DEVTOOLS_CHECK_INTERVAL_MS: 1000,
        TOAST_DURATION_MS: 2500,
        SCREENSHOT_WARNING_DURATION_MS: 2500,
        LONG_PRESS_THRESHOLD_MS: 400,
    };
    // ── CSS الحماية ───────────────────────────────────────────────
    const protectionCSS = `
    * {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    #__security_watermark {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 100vw !important; height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483645 !important;
      opacity: 0.035 !important;
      background-image: repeating-linear-gradient(
        -45deg, transparent, transparent 80px,
        rgba(255,255,255,0.03) 80px, rgba(255,255,255,0.03) 81px
      ) !important;
      user-select: none !important;
    }
    #__blackout_screen {
      position: fixed !important; inset: 0 !important;
      background: #000 !important;
      z-index: 2147483647 !important;
      display: none;
    }
    #__blackout_screen.active { display: flex !important; }
    @media print {
      body > * { display: none !important; }
      body::after {
        content: "🚫 هذا المحتوى محمي ولا يمكن طباعته" !important;
        display: block !important; font-size: 32px !important;
        text-align: center !important; margin-top: 200px !important;
      }
    }
    @media (display-mode: screenshot) { body { visibility: hidden !important; } }
    html { -webkit-user-select: none !important; }
    img, a { -webkit-user-drag: none !important; user-drag: none !important; pointer-events: none !important; }
    button, input, select, textarea, [onclick], .opt-btn, .gold-btn, .tab-btn, nav * {
      pointer-events: auto !important;
      -webkit-user-select: none !important;
    }
  `;
    const styleEl = document.createElement("style");
    styleEl.id = "__protection_styles";
    styleEl.textContent = protectionCSS;
    if (document.head) {
        document.head.appendChild(styleEl);
    }
    else {
        document.addEventListener("DOMContentLoaded", () => {
            document.head.appendChild(styleEl);
        });
    }
    // ── Watermark ─────────────────────────────────────────────────
    function initWatermark() {
        if (document.getElementById("__security_watermark"))
            return;
        let playerName = "PROTECTED";
        try {
            const raw = localStorage.getItem("currentUser");
            if (raw) {
                const u = JSON.parse(raw);
                if (u.name)
                    playerName = u.name.toUpperCase();
            }
        }
        catch { /* ignore */ }
        const wm = document.createElement("div");
        wm.id = "__security_watermark";
        const wmItems = Array.from({ length: 80 }, (_, i) => `
      <span style="
        position:absolute;
        left:${(i % 8) * 13}%;
        top:${Math.floor(i / 8) * 11}%;
        transform:rotate(-35deg);
        font-size:13px; font-weight:900;
        color:rgba(255,255,255,0.5);
        white-space:nowrap; font-family:monospace; letter-spacing:2px;
      ">${playerName}</span>`).join("");
        wm.innerHTML = wmItems;
        const appendWatermark = () => {
            document.body?.appendChild(wm);
        };
        document.body ? appendWatermark() : document.addEventListener("DOMContentLoaded", appendWatermark);
        const observer = new MutationObserver(() => {
            if (!document.getElementById("__security_watermark")) {
                document.body?.appendChild(wm);
            }
        });
        const target = document.body ?? document.documentElement;
        observer.observe(target, { childList: true, subtree: false });
    }
    // ── Screenshot → شاشة سودة دائمة ────────────────────────────
    let screenshotBlocked = false;
    function blackoutScreen() {
        if (screenshotBlocked)
            return;
        screenshotBlocked = true;
        // إيقاف الكويز فوراً
        window.isQuizActive = false;
        // إنشاء طبقة سوداء كاملة مش قابلة للإزالة
        const blackout = document.createElement("div");
        blackout.id = "__blackout_screen";
        blackout.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      background: #000000 !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: all !important;
    `;
        blackout.innerHTML = `
      <div style="text-align:center;padding:30px;max-width:350px;">
        <div style="font-size:72px;margin-bottom:16px;">🚫</div>
        <h1 style="color:#ef4444;font-size:24px;font-weight:900;margin-bottom:12px;font-family:'Cairo',sans-serif;">
          محظور!
        </h1>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;font-weight:700;line-height:1.8;font-family:'Cairo',sans-serif;">
          حاولت أخذ لقطة شاشة.<br>
          هذا المحتوى محمي بالكامل.<br>
          <span style="color:#fbbf24;">محاولتك تم تسجيلها ✓</span>
        </p>
      </div>`;
        document.body.appendChild(blackout);
        // مراقبة الـ DOM عشان متتشالش الطبقة السودة
        const guardian = new MutationObserver(() => {
            if (!document.getElementById("__blackout_screen")) {
                document.body.appendChild(blackout);
            }
        });
        guardian.observe(document.body, { childList: true });
        // منع أي تفاعل مع الصفحة تحت الطبقة
        document.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false, capture: true });
        document.addEventListener("mousedown", (e) => e.preventDefault(), { capture: true });
    }
    // blackoutScreen() يتم استدعاؤها مباشرة — لا حاجة لدوال wrapper
    // ── Keyboard Protection ───────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        const key = (e.key ?? "").toLowerCase();
        // F12
        if (e.keyCode === 123 || key === "f12") {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
        // Print Screen
        if (e.keyCode === 44 || key === "printscreen") {
            e.preventDefault();
            blackoutScreen();
            setTimeout(() => {
                navigator.clipboard?.writeText("").catch(() => { });
            }, 100);
            return false;
        }
        // Ctrl / Meta combinations
        if (e.ctrlKey || e.metaKey) {
            if (CONFIG.BLOCKED_KEYS.includes(key)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
            if (e.shiftKey && CONFIG.BLOCKED_SHIFT_KEYS.includes(key)) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        }
        // Alt + F4 / Alt + Tab
        if (e.altKey && (key === "f4" || key === "tab")) {
            e.preventDefault();
            return false;
        }
        // Windows Key
        if (e.metaKey) {
            e.preventDefault();
            return false;
        }
    }, true);
    // ── keyup — catch PrintScreen on systems that only fire keyup ─
    document.addEventListener("keyup", (e) => {
        if (e.keyCode === 44 || (e.key ?? "").toLowerCase() === "printscreen") {
            e.preventDefault();
            blackoutScreen();
        }
    }, true);
    // ── Right Click ───────────────────────────────────────────────
    document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        showMiniToast("🚫 هذا المحتوى محمي");
    }, true);
    // ── Copy / Cut / Paste / Drag ─────────────────────────────────
    const blockedEvents = [
        "copy", "cut", "paste", "selectstart", "drag", "dragstart",
    ];
    blockedEvents.forEach((evt) => {
        document.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true);
    });
    // ── DevTools Detection ────────────────────────────────────────
    let devToolsOpen = false;
    function checkDevTools() {
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        if (isMobile)
            return;
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > CONFIG.DEVTOOLS_THRESHOLD || heightDiff > CONFIG.DEVTOOLS_THRESHOLD) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                handleDevToolsOpen();
            }
        }
        else {
            devToolsOpen = false;
        }
    }
    function handleDevToolsOpen() {
        if (window.isQuizActive && window.triggerAntiCheat) {
            window.triggerAntiCheat("تم كشف فتح أدوات المطور أثناء الكويز! 🚨");
        }
        const consoleMethods = [
            "log", "warn", "error", "info", "debug", "dir", "table",
        ];
        consoleMethods.forEach((method) => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                console[method] = () => { };
            }
            catch { /* ignore */ }
        });
        showMiniToast("🚨 أدوات المطور مكتشفة!");
    }
    setInterval(checkDevTools, CONFIG.DEVTOOLS_CHECK_INTERVAL_MS);
    // ── Visibility Change ─────────────────────────────────────────
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && window.isQuizActive) {
            document.body.style.filter = "blur(20px)";
            document.body.style.pointerEvents = "none";
        }
        else {
            setTimeout(() => {
                document.body.style.filter = "";
                document.body.style.pointerEvents = "";
            }, 500);
        }
    });
    // ── Back Button Lock — رسالة تحذير مع خيار الخروج ──────────────
    // دفع state مبدئي عشان نمسك الـ popstate
    history.pushState({ quizProtected: true }, "", location.href);
    window.addEventListener("popstate", () => {
        if (!window.isQuizActive)
            return;
        // أعد دفع الـ state عشان متيجيش برة
        history.pushState({ quizProtected: true }, "", location.href);
        // اعرض مودال التحذير المخصص بدل confirm() العادي
        showBackWarningModal();
    });
    function showBackWarningModal() {
        // لو في مودال موجود متفتحش تاني
        if (document.getElementById("__back_warning_modal"))
            return;
        // إيقاف التايمر مؤقتاً
        if (window._acResume) {
            // سنستخدم نفس نظام anti-cheat الموجود
        }
        window.isQuizActive = false; // إيقاف مؤقت
        const modal = document.createElement("div");
        modal.id = "__back_warning_modal";
        modal.style.cssText = `
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0,0,0,0.92) !important;
      z-index: 2147483646 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      backdrop-filter: blur(12px) !important;
      animation: __modalFadeIn 0.25s ease !important;
    `;
        const animStyle = document.createElement("style");
        animStyle.textContent = `
      @keyframes __modalFadeIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      @keyframes __boxPop {
        from { transform: scale(0.75); opacity:0; }
        to   { transform: scale(1);    opacity:1; }
      }
    `;
        document.head.appendChild(animStyle);
        modal.innerHTML = `
      <div style="
        background: linear-gradient(160deg, rgba(30,5,5,0.98), rgba(15,2,2,0.99));
        border: 1.5px solid rgba(239,68,68,0.55);
        border-radius: 24px;
        padding: 32px 24px;
        max-width: 340px;
        width: 100%;
        text-align: center;
        box-shadow: 0 0 80px rgba(239,68,68,0.2), 0 30px 60px rgba(0,0,0,0.9);
        animation: __boxPop 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
        position: relative;
      ">
        <div style="font-size:64px;margin-bottom:12px;animation:__boxPop 0.4s ease 0.1s both;">🚨</div>
        <h2 style="color:#ef4444;font-size:22px;font-weight:900;margin-bottom:10px;font-family:'Cairo',sans-serif;">تحذير!</h2>
        <p style="color:#fca5a5;font-size:14px;font-weight:700;line-height:1.75;margin-bottom:6px;font-family:'Cairo',sans-serif;">
          حاولت الخروج من الكويز!
        </p>
        <p style="color:#f87171;font-size:12px;font-weight:700;margin-bottom:22px;font-family:'Cairo',sans-serif;">
          النقاط المحصودة لحد دلوقتي هتتحسب.
        </p>
        <button id="__back_continue_btn" style="
          width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;
          font-family:'Cairo',sans-serif;font-weight:900;font-size:15px;
          background:linear-gradient(135deg,#16a34a,#15803d);color:white;
          box-shadow:0 4px 14px rgba(22,163,74,0.4);margin-bottom:10px;
          transition:transform .15s;
        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          ✅ أكمل الكويز
        </button>
        <button id="__back_exit_btn" style="
          width:100%;padding:13px;border-radius:14px;border:1px solid rgba(239,68,68,0.35);cursor:pointer;
          font-family:'Cairo',sans-serif;font-weight:900;font-size:15px;
          background:linear-gradient(135deg,#991b1b,#7f1d1d);color:#fca5a5;
          transition:transform .15s;
        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
          خروج (النقاط ستُحسب) 🚪
        </button>
      </div>`;
        document.body.appendChild(modal);
        // زر "أكمل الكويز"
        document.getElementById("__back_continue_btn")?.addEventListener("click", () => {
            modal.remove();
            window.isQuizActive = true;
            // استئناف التايمر
            if (window._acResume)
                window._acResume();
        });
        // زر "خروج"
        document.getElementById("__back_exit_btn")?.addEventListener("click", () => {
            modal.remove();
            window.isQuizActive = false;
            // احتساب النقاط وإنهاء الكويز
            if (window._acForceEnd) {
                window._acForceEnd();
            }
            else {
                // fallback — ارجع للداشبورد
                window.location.replace("dashboard.html");
            }
        });
    }
    // ── Screen Capture API Block ──────────────────────────────────
    if (navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = () => {
            blackoutScreen();
            showMiniToast("🚫 تسجيل الشاشة محظور!");
            return Promise.reject(new DOMException("Screen capture disabled.", "NotAllowedError"));
        };
        const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = (constraints) => {
            const video = constraints?.video;
            if (video === true ||
                (typeof video === "object" && "displaySurface" in video)) {
                return Promise.reject(new DOMException("Screen capture disabled.", "NotAllowedError"));
            }
            return origGetUserMedia(constraints);
        };
    }
    // ── Touch Protection ──────────────────────────────────────────
    document.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1 && window.isQuizActive) {
            e.preventDefault();
        }
    }, { passive: false });
    let longPressTimer = null;
    document.addEventListener("touchstart", (e) => {
        longPressTimer = setTimeout(() => {
            e.preventDefault();
        }, CONFIG.LONG_PRESS_THRESHOLD_MS);
    }, { passive: false });
    document.addEventListener("touchend", () => {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    });
    document.addEventListener("touchmove", () => {
        if (longPressTimer !== null) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
    // ── iFrame Protection ─────────────────────────────────────────
    if (window.top !== window.self) {
        window.top.location.replace(window.self.location.href);
    }
    // ── Global Variable Protection ────────────────────────────────
    (function protectGlobals() {
        CONFIG.SENSITIVE_VARS.forEach((varName) => {
            try {
                Object.defineProperty(window, varName, {
                    configurable: false,
                    enumerable: false,
                });
            }
            catch { /* variable not yet defined */ }
        });
    })();
    // ── Console Cleaner ───────────────────────────────────────────
    (function clearConsole() {
        try {
            console.clear();
        }
        catch { /* ignore */ }
        const noop = () => { };
        void noop; // suppress unused warning
        if (typeof console !== "undefined") {
            const orig = console.log.bind(console);
            console.log = (...args) => {
                const str = args.join(" ").toLowerCase();
                const isSensitive = CONFIG.SENSITIVE_LOG_WORDS.some((word) => str.includes(word));
                if (!isSensitive)
                    orig(...args);
            };
        }
    })();
    // ── Toast Notification ────────────────────────────────────────
    function showMiniToast(msg) {
        const existing = document.getElementById("__security_toast");
        if (existing)
            existing.remove();
        const animStyle = document.createElement("style");
        animStyle.textContent = `
      @keyframes __toastSlide {
        from { opacity:0; transform:translateX(-50%) translateY(20px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0); }
      }`;
        document.head.appendChild(animStyle);
        const toast = document.createElement("div");
        toast.id = "__security_toast";
        toast.textContent = msg;
        toast.style.cssText = `
      position:fixed !important; bottom:80px !important;
      left:50% !important; transform:translateX(-50%) !important;
      background:rgba(239,68,68,0.95) !important; color:white !important;
      padding:12px 24px !important; border-radius:50px !important;
      font-size:14px !important; font-weight:900 !important;
      font-family:'Cairo',sans-serif !important;
      z-index:2147483646 !important; pointer-events:none !important;
      box-shadow:0 4px 20px rgba(0,0,0,0.5) !important;
      animation:__toastSlide 0.3s ease !important;
      direction:rtl !important; white-space:nowrap !important;`;
        document.body?.appendChild(toast);
        setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION_MS);
    }
    // ── Init on Load ──────────────────────────────────────────────
    window.addEventListener("load", () => {
        initWatermark();
        // initScreenshotWarning — blackoutScreen() يشتغل on-demand
        const origTrigger = window.triggerAntiCheat;
        window.triggerAntiCheat = (reason) => {
            const overlay = document.getElementById("quiz-overlay");
            if (overlay)
                overlay.style.filter = "blur(5px)";
            origTrigger?.(reason);
        };
    });
})();
