// ============================================================
// quiz.ts — نظام الكويز | TypeScript Edition
// ============================================================

// ── أنواع البيانات ────────────────────────────────────────────

interface Question {
  readonly q: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
}

interface QuizVariation {
  readonly questions: Question[];
}

interface QuizDoc {
  readonly variations: Record<string, QuizVariation>;
}

type PowerUpKey = "fifty50" | "freeze";

// ── حالة الكويز (Typed State) ─────────────────────────────────

let currentQuestions: Question[] = [];
let currentIndex: number = 0;
let sessionScore: number = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let globalTimeLeft: number = 15;
let isQuizActive: boolean = false;
let used5050InRound: boolean = false;
let usedFreezeInRound: boolean = false;
let free5050: number = 1;
let freeFreeze: number = 1;

// ── نظام مكافحة الغش ─────────────────────────────────────────

document.addEventListener("visibilitychange", (): void => {
  if (document.hidden && isQuizActive && currentQuestions.length > 0 && currentIndex >= 0) {
    triggerAntiCheat("غادرت شاشة الكويز! اختر هل تكمل أم تخرج.");
  }
});

function triggerAntiCheat(reason: string): void {
  if (!isQuizActive) return;

  if (timerInterval) clearInterval(timerInterval);
  document.querySelectorAll<HTMLButtonElement>(".opt-btn").forEach((btn) => {
    btn.style.pointerEvents = "none";
  });

  window._acResume = (): void => {
    document.querySelectorAll<HTMLButtonElement>(".opt-btn").forEach((btn) => {
      btn.style.pointerEvents = "auto";
    });
    timerInterval = setInterval((): void => {
      globalTimeLeft--;
      const timerEl = document.getElementById("timer");
      if (timerEl) timerEl.innerText = String(globalTimeLeft);
      if (globalTimeLeft <= 0) window.handleAnswer(-1);
    }, 1_000);
  };

  window._acForceEnd = (): void => {
    isQuizActive = false;
    endQuiz();
  };

  if (window.showAcWarning) {
    window.showAcWarning(reason);
  } else if (window.showAlert) {
    window.showAlert("تحذير! 🚨", reason, "🛑", "error");
    setTimeout((): void => {
      window.closeCustomAlert?.();
      isQuizActive = false;
      endQuiz();
    }, 3_500);
  }
}

// ── بدء الكويز ────────────────────────────────────────────────

window.openQuiz = function (day: number): void {
  if (myLogs?.[day] !== undefined) {
    window.showAlert("انتباه!", "أنت لعبت الجولة دي خلاص يا بطل!", "⚠️", "error");
    return;
  }

  document.body.classList.add("hide-ads");
  const overlay = document.getElementById("quiz-overlay");
  const content = document.getElementById("quiz-content");
  if (!overlay || !content) return;

  overlay.style.display = "flex";
  content.innerHTML = `
    <div class="text-center relative z-10">
      <h2 style="font-size:28px;font-weight:900;color:white;margin-bottom:12px;">مستعد للمواجهة؟ 🔥</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:28px;font-weight:700;">
        لديك (1) تجميد و (1) حذف مجاناً في هذا التحدي.
      </p>
      <div style="display:flex;gap:12px;">
        <button onclick="window.startQuizFetch(${day})" style="flex:1;background:linear-gradient(135deg,#059669,#10B981);color:white;font-weight:900;padding:15px;border-radius:14px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:16px;box-shadow:0 4px 18px rgba(16,185,129,0.4);">
          جاهز ⚔️
        </button>
        <button onclick="window.closeQuizOverlay()" style="flex:1;background:rgba(15,6,32,0.8);color:rgba(255,255,255,0.7);font-weight:700;padding:15px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-family:'Cairo',sans-serif;font-size:15px;">
          تراجع ✋
        </button>
      </div>
    </div>`;
};

window.closeQuizOverlay = function (): void {
  const overlay = document.getElementById("quiz-overlay");
  if (overlay) overlay.style.display = "none";
  document.body.classList.remove("hide-ads");
};

window.startQuizFetch = function (day: number): void {
  isQuizActive = true;
  free5050 = 1;
  freeFreeze = 1;
  used5050InRound = false;
  usedFreezeInRound = false;

  const content = document.getElementById("quiz-content");
  if (content) {
    content.innerHTML = `<p style="text-align:center;font-weight:700;color:var(--gold-light);font-size:18px;animation:pulse 1s infinite;">جاري تجهيز ساحة المعركة...</p>`;
  }

  db!.collection("quizzes_pool")
    .doc(`day_${day}`)
    .get()
    .then((doc: firebase.firestore.DocumentSnapshot): void => {
      if (doc.exists) {
        const data = doc.data() as unknown as QuizDoc;
        if (data.variations) {
          const keys = Object.keys(data.variations);
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          currentQuestions = [...data.variations[randomKey].questions];
          currentIndex = 0;
          sessionScore = 0;
          showQuestion();
          return;
        }
      }
      window.showAlert("عفواً", "التحدي لم يجهز بعد!", "⏳", "normal");
      setTimeout(() => location.reload(), 2_000);
    });
};

// ── عرض السؤال ───────────────────────────────────────────────

function showQuestion(): void {
  if (currentIndex >= currentQuestions.length) {
    endQuiz();
    return;
  }

  const q: Question = currentQuestions[currentIndex];
  globalTimeLeft = 15;

  const total5050: number = free5050 + (window.myPowerups?.fifty50 ?? 0);
  const totalFreeze: number = freeFreeze + (window.myPowerups?.freeze ?? 0);

  const can5050: boolean = total5050 > 0 && !used5050InRound;
  const canFreeze: boolean = totalFreeze > 0 && !usedFreezeInRound;

  const pw5050Style = can5050
    ? "cursor:pointer;opacity:1;"
    : "cursor:not-allowed;opacity:0.35;filter:grayscale(1);";
  const pwFreezeStyle = canFreeze
    ? "cursor:pointer;opacity:1;"
    : "cursor:not-allowed;opacity:0.35;filter:grayscale(1);";

  const optionsHtml: string = q.options
    .map(
      (opt, i) => `
    <button onclick="window.handleAnswer(${i})" class="opt-btn" id="opt-${i}" style="
      width:100%;text-align:right;padding:14px 16px;
      background:rgba(20,8,42,0.7);border:1px solid rgba(201,168,76,0.15);
      border-radius:14px;color:rgba(255,255,255,0.88);font-weight:700;font-size:15px;
      font-family:'Cairo',sans-serif;cursor:pointer;margin-bottom:10px;
      display:flex;align-items:center;gap:12px;transition:all .2s;"
      onmouseover="this.style.borderColor='rgba(201,168,76,0.5)';this.style.background='rgba(201,168,76,0.1)'"
      onmouseout="this.style.borderColor='rgba(201,168,76,0.15)';this.style.background='rgba(20,8,42,0.7)'">
      <span style="width:30px;height:30px;border-radius:50%;flex-shrink:0;
        background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);
        display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:var(--gold-light);">
        ${["أ","ب","ج","د"][i] ?? String(i + 1)}
      </span>
      ${opt}
    </button>`
    )
    .join("");

  const html: string = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="background:rgba(6,1,15,0.7);border:1px solid rgba(201,168,76,0.2);padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);">
        سؤال <span style="color:var(--gold-light);">${currentIndex + 1}</span> / ${currentQuestions.length}
      </div>
      <div style="background:rgba(6,1,15,0.7);border:1px solid rgba(201,168,76,0.2);padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);">
        نقاط: <span style="color:var(--gold-light);">${sessionScore}</span>
      </div>
    </div>

    <div style="background:rgba(10,4,24,0.8);border:1px solid rgba(201,168,76,0.2);border-radius:18px;padding:18px;margin-bottom:16px;text-align:center;">
      <span id="timer" style="display:inline-block;font-weight:900;font-size:32px;color:white;background:rgba(6,1,15,0.8);border:2px solid rgba(239,68,68,0.7);padding:4px 18px;border-radius:12px;margin-bottom:12px;box-shadow:0 0 15px rgba(239,68,68,0.25);">${globalTimeLeft}</span>
      <h3 style="font-size:17px;font-weight:900;color:white;line-height:1.65;">${q.q}</h3>
    </div>

    <div style="margin-bottom:16px;">${optionsHtml}</div>

    <div style="display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
      <div id="btn-5050" onclick="window.use5050()" style="flex:1;position:relative;${pw5050Style}transition:all .2s;">
        ${total5050 > 0 ? `<div style="position:absolute;top:-8px;right:-8px;background:#7C3AED;color:white;font-weight:900;font-size:11px;padding:2px 7px;border-radius:999px;border:2px solid #06010F;">${total5050}</div>` : ""}
        <div style="background:rgba(6,1,15,0.7);border:1px solid rgba(147,51,234,0.4);padding:11px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:7px;">
          <i class="fas fa-cut" style="color:#A78BFA;"></i>
          <span style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.8);">إجابتين</span>
        </div>
      </div>
      <div id="btn-freeze" onclick="window.useFreeze()" style="flex:1;position:relative;${pwFreezeStyle}transition:all .2s;">
        ${totalFreeze > 0 ? `<div style="position:absolute;top:-8px;right:-8px;background:#3B82F6;color:white;font-weight:900;font-size:11px;padding:2px 7px;border-radius:999px;border:2px solid #06010F;">${totalFreeze}</div>` : ""}
        <div style="background:rgba(6,1,15,0.7);border:1px solid rgba(59,130,246,0.4);padding:11px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:7px;">
          <i class="fas fa-snowflake" style="color:#60A5FA;"></i>
          <span style="font-size:12px;font-weight:900;color:rgba(255,255,255,0.8);">تجميد</span>
        </div>
      </div>
    </div>`;

  const content = document.getElementById("quiz-content");
  if (content) content.innerHTML = html;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval((): void => {
    globalTimeLeft--;
    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.innerText = String(globalTimeLeft);
    if (globalTimeLeft <= 0) window.handleAnswer(-1);
  }, 1_000);
}

// ── المساعدات ─────────────────────────────────────────────────

window.use5050 = function (): void {
  const total: number = free5050 + (window.myPowerups?.fifty50 ?? 0);
  if (used5050InRound || total <= 0 || !isQuizActive) return;

  used5050InRound = true;

  if (free5050 > 0) {
    free5050--;
  } else {
    window.myPowerups.fifty50 -= 1;
    db!.collection("users").doc(currentUser!.id).update({ powerups: window.myPowerups });
    const topInv = document.getElementById("inv-5050");
    if (topInv) topInv.innerText = String(window.myPowerups.fifty50);
  }

  const btn = document.getElementById("btn-5050") as HTMLElement | null;
  if (btn) btn.style.cssText += "cursor:not-allowed;opacity:0.35;filter:grayscale(1);";

  const correctIdx: number = currentQuestions[currentIndex].correctIndex;
  let hidden = 0;
  for (let i = 0; i < 4; i++) {
    if (i !== correctIdx && hidden < 2) {
      const optBtn = document.getElementById(`opt-${i}`) as HTMLElement | null;
      if (optBtn) {
        optBtn.style.opacity = "0.15";
        optBtn.style.pointerEvents = "none";
      }
      hidden++;
    }
  }
};

window.useFreeze = function (): void {
  const total: number = freeFreeze + (window.myPowerups?.freeze ?? 0);
  if (usedFreezeInRound || total <= 0 || !isQuizActive) return;

  usedFreezeInRound = true;

  if (freeFreeze > 0) {
    freeFreeze--;
  } else {
    window.myPowerups.freeze -= 1;
    db!.collection("users").doc(currentUser!.id).update({ powerups: window.myPowerups });
    const topInv = document.getElementById("inv-freeze");
    if (topInv) topInv.innerText = String(window.myPowerups.freeze);
  }

  const btn = document.getElementById("btn-freeze") as HTMLElement | null;
  if (btn) btn.style.cssText += "cursor:not-allowed;opacity:0.35;filter:grayscale(1);";

  globalTimeLeft += 10;
  const timerEl = document.getElementById("timer");
  if (timerEl) {
    timerEl.innerText = String(globalTimeLeft);
    timerEl.style.borderColor = "rgba(59,130,246,0.8)";
    timerEl.style.color = "#93C5FD";
    timerEl.style.boxShadow = "0 0 15px rgba(59,130,246,0.4)";
  }
};

// ── معالجة الإجابات ────────────────────────────────────────────

window.handleAnswer = function (selectedIdx: number): void {
  if (!isQuizActive) return;

  if (timerInterval) clearInterval(timerInterval);
  document.querySelectorAll<HTMLButtonElement>(".opt-btn").forEach((btn) => {
    btn.style.pointerEvents = "none";
  });

  const correctIdx: number = currentQuestions[currentIndex].correctIndex;

  if (selectedIdx !== -1) {
    const selectedBtn = document.getElementById(`opt-${selectedIdx}`) as HTMLElement | null;

    if (selectedIdx === correctIdx) {
      sessionScore++;
      if (selectedBtn) {
        selectedBtn.style.background = "rgba(34,197,94,0.2)";
        selectedBtn.style.borderColor = "rgba(34,197,94,0.7)";
        selectedBtn.style.color = "#4ade80";
        selectedBtn.innerHTML += ` <i class="fas fa-check-circle" style="float:left;margin-top:2px;font-size:18px;color:#4ade80;filter:drop-shadow(0 0 8px rgba(34,197,94,0.8));"></i>`;
      }
    } else {
      if (selectedBtn) {
        selectedBtn.style.background = "rgba(239,68,68,0.15)";
        selectedBtn.style.borderColor = "rgba(239,68,68,0.6)";
        selectedBtn.style.textDecoration = "line-through";
        selectedBtn.style.opacity = "0.7";
        selectedBtn.innerHTML += ` <i class="fas fa-times-circle" style="float:left;margin-top:2px;font-size:18px;color:#f87171;"></i>`;
      }
      const correctBtn = document.getElementById(`opt-${correctIdx}`) as HTMLElement | null;
      if (correctBtn) {
        correctBtn.style.borderColor = "rgba(34,197,94,0.5)";
        correctBtn.style.color = "#86efac";
      }
    }
  }

  setTimeout((): void => {
    currentIndex++;
    used5050InRound = false;
    usedFreezeInRound = false;
    showQuestion();
  }, 1_200);
};

// ── إنهاء الكويز ──────────────────────────────────────────────

function endQuiz(): void {
  isQuizActive = false;
  if (timerInterval) clearInterval(timerInterval);

  const content = document.getElementById("quiz-content");
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="width:52px;height:52px;border:3px solid rgba(201,168,76,0.3);border-top-color:var(--gold-light);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
        <p style="color:var(--gold-light);font-weight:700;font-size:16px;">جاري توثيق المعركة...</p>
      </div>`;
  }

  db!.collection("users")
    .doc(currentUser!.id)
    .update({ score: firebase.firestore.FieldValue.increment(sessionScore) })
    .then((): Promise<void> => {
      return db!
        .collection("users")
        .doc(currentUser!.id)
        .collection("game_logs")
        .doc(`day_${adminDay}`)
        .set({
          day: adminDay,
          score: sessionScore,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
    })
    .then((): void => {
      if (window.confetti) {
        void window.confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 },
          colors: ["#F0C96B", "#C9A84C", "#8B6914", "#ffffff"],
        });
      }

      if (content) {
        content.innerHTML = `
          <div style="text-align:center;padding:16px;">
            <div style="position:relative;display:inline-block;margin-bottom:20px;">
              <div style="position:absolute;inset:0;background:rgba(201,168,76,0.3);border-radius:50%;filter:blur(20px);animation:pulse 2s infinite;"></div>
              <div style="background:linear-gradient(135deg,rgba(20,8,42,0.95),rgba(10,4,24,0.98));border:2px solid rgba(201,168,76,0.5);padding:24px;border-radius:50%;position:relative;">
                <i class="fas fa-trophy" style="font-size:52px;background:linear-gradient(180deg,#F0C96B,#8B6914);-webkit-background-clip:text;-webkit-text-fill-color:transparent;"></i>
              </div>
            </div>
            <h2 style="font-size:28px;font-weight:900;color:white;margin-bottom:20px;">انتهت المعركة! 🔥</h2>
            <div style="background:rgba(10,4,24,0.8);border:1px solid rgba(201,168,76,0.3);border-radius:20px;padding:24px;margin-bottom:24px;">
              <p style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:700;letter-spacing:2px;margin-bottom:6px;">غنائمك اليوم</p>
              <p style="font-size:56px;font-weight:900;color:var(--gold-light);line-height:1;">${sessionScore}</p>
              <p style="font-size:13px;color:rgba(201,168,76,0.5);font-weight:700;">نقطة</p>
            </div>
            <button onclick="window.location.replace('dashboard.html')" style="width:100%;background:linear-gradient(135deg,#8B6914,#D4AF37,#F0C96B);color:#1A0530;font-weight:900;font-size:17px;padding:15px;border-radius:14px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;box-shadow:0 4px 20px rgba(201,168,76,0.4);">
              العودة للمعسكر ⛺
            </button>
          </div>`;
      }
    })
    .catch((err: Error): void => {
      console.error("Error saving quiz:", err);
    });
}
