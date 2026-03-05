"use strict";
// ============================================================
// app.ts — ملعب رمضان | TypeScript Edition
// اللغة: TypeScript (Strict Mode) — أقوى حماية من runtime exploits
// ============================================================
// ── إعدادات Firebase ────────────────────────────────────────
const isInApp = window.matchMedia("(display-mode: standalone)").matches ||
    !!window.navigator.standalone;
const firebaseConfig = {
    apiKey: "AIzaSyBZMnIJ_IOqeAfXqFt-m4tM1Lvo0tUDnk8",
    projectId: "ramadan-87817",
    appId: "1:343525703258:web:6776b4857425df8bcca263",
};
// ── حالة التطبيق (Typed State) ──────────────────────────────
let db = null;
let currentUser = null;
let myLogs = {};
let adminDay = 1;
let adminStatus = "closed";
let logsUnsubscribe = null;
window.myPowerups = { freeze: 0, fifty50: 0 };
// ── نظام التنبيهات ───────────────────────────────────────────
window.showAlert = function (title, msg, icon = "🔔", type = "normal") {
    const box = document.getElementById("custom-alert");
    const titleEl = document.getElementById("alert-title");
    const msgEl = document.getElementById("alert-msg");
    const iconEl = document.getElementById("alert-icon");
    if (!box || !titleEl || !msgEl || !iconEl)
        return;
    titleEl.innerText = title;
    msgEl.innerText = msg;
    iconEl.innerText = icon;
    const colorMap = {
        success: "text-2xl font-black text-green-400 mb-2",
        error: "text-2xl font-black text-red-500 mb-2",
        normal: "text-2xl font-black text-yellow-400 mb-2",
    };
    titleEl.className = colorMap[type];
    box.style.display = "flex";
    setTimeout(() => document.getElementById("alert-box")?.classList.remove("scale-95"), 10);
};
window.closeCustomAlert = function () {
    const box = document.getElementById("custom-alert");
    document.getElementById("alert-box")?.classList.add("scale-95");
    setTimeout(() => {
        if (box)
            box.style.display = "none";
    }, 200);
};
// ── تهيئة التطبيق ────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    try {
        const raw = localStorage.getItem("currentUser");
        currentUser = raw ? JSON.parse(raw) : null;
    }
    catch {
        localStorage.removeItem("currentUser");
        currentUser = null;
    }
    if (!currentUser?.id) {
        window.location.replace("index.html");
        return;
    }
    try {
        if (!firebase.apps.length)
            firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
    catch (e) {
        console.error("Firebase init error:", e);
        return;
    }
    initFirebaseData();
    setupWheelTimer();
    initNightQuestion();
});
// ── Firebase Data ────────────────────────────────────────────
function initFirebaseData() {
    if (!db || !currentUser)
        return;
    const connStatus = document.getElementById("conn-status");
    if (connStatus) {
        connStatus.innerHTML = "متصل بنجاح 🟢";
        connStatus.style.color = "#10b981";
    }
    db.collection("users")
        .doc(currentUser.id)
        .onSnapshot((doc) => {
        if (doc.exists) {
            const d = doc.data();
            const scoreEl = document.getElementById("p-score");
            const nameEl = document.getElementById("p-name");
            const groupEl = document.getElementById("p-group");
            const freezeEl = document.getElementById("inv-freeze");
            const fiftyEl = document.getElementById("inv-5050");
            if (scoreEl)
                scoreEl.innerText = String(d.score ?? 0);
            if (nameEl)
                nameEl.innerText = d.name ?? "بطل";
            if (groupEl)
                groupEl.innerText = d.group ?? "";
            window.myPowerups = d.powerups ?? { freeze: 0, fifty50: 0 };
            if (freezeEl)
                freezeEl.innerText = String(window.myPowerups.freeze);
            if (fiftyEl)
                fiftyEl.innerText = String(window.myPowerups.fifty50);
        }
    });
    db.collection("settings")
        .doc("global_status")
        .onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            adminDay = data.currentDay ?? 1;
            adminStatus = data.status ?? "closed";
        }
        updateLogs();
    });
}
function updateLogs() {
    if (!db || !currentUser)
        return;
    if (logsUnsubscribe)
        logsUnsubscribe();
    logsUnsubscribe = db
        .collection("users")
        .doc(currentUser.id)
        .collection("game_logs")
        .onSnapshot((snap) => {
        myLogs = {};
        snap.forEach((d) => {
            const log = d.data();
            myLogs[log.day] = log.score;
        });
        renderMap();
    });
}
// ── تبويبات ──────────────────────────────────────────────────
window.showTab = function (t) {
    const arena = document.getElementById("view-arena");
    const leader = document.getElementById("view-leaderboard");
    if (!arena || !leader)
        return;
    arena.classList.toggle("hidden", t !== "arena");
    leader.classList.toggle("hidden", t !== "leaderboard");
    document.getElementById("btn-arena")?.classList.toggle("active", t === "arena");
    document.getElementById("btn-leader")?.classList.toggle("active", t === "leaderboard");
    if (t === "leaderboard")
        fetchLeaderboard();
};
// ── رسم الخريطة ──────────────────────────────────────────────
function renderMap() {
    const container = document.getElementById("view-arena");
    if (!container)
        return;
    if (typeof window.__renderMapEnhanced === "function") {
        window.__renderMapEnhanced(container, myLogs, adminDay, adminStatus);
        return;
    }
    // Fallback — لو __renderMapEnhanced مش موجودة
    let html = "";
    for (let i = 1; i <= 30; i++) {
        const isPlayed = myLogs[i] !== undefined;
        const isActive = i === adminDay && adminStatus === "active";
        if (isPlayed) {
            html += `<div class="glass-card p-5 rounded-2xl flex justify-between border-r-4 border-r-green-500 mb-4">
        <p class="font-bold text-gray-300">الجولة ${i}</p>
        <p class="font-black text-2xl text-green-400">${myLogs[i]}</p>
      </div>`;
        }
        else if (isActive) {
            html += `<div onclick="window.openQuiz(${i})" class="day-active p-6 rounded-2xl flex justify-between mb-4 cursor-pointer">
        <p class="font-black text-white text-xl">الجولة ${i}</p>
      </div>`;
        }
        else {
            html += `<div class="glass-card p-5 rounded-2xl flex items-center gap-4 opacity-40 mb-4">
        <i class="fas fa-lock text-gray-500"></i>
        <p class="font-bold text-sm text-gray-500">الجولة ${i}</p>
      </div>`;
        }
    }
    container.innerHTML = html;
}
// ── Leaderboard ───────────────────────────────────────────────
function fetchLeaderboard() {
    if (!db || !currentUser)
        return;
    db.collection("users")
        .where("group", "==", currentUser.group)
        .get()
        .then((snap) => {
        const list = [];
        snap.forEach((d) => {
            list.push(d.data());
        });
        list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const rankClasses = {
            1: "lb-rank gold",
            2: "lb-rank silver",
            3: "lb-rank bronze",
        };
        const html = list
            .map((u, i) => {
            const rank = i + 1;
            const rankClass = rankClasses[rank] ?? "lb-rank other";
            const isSelf = u.name === currentUser?.name;
            return `<div class="lb-item">
            <div class="${rankClass}">${rank <= 3 ? ["🥇", "🥈", "🥉"][i] : rank}</div>
            <span style="flex:1;font-weight:700;color:${isSelf ? "var(--gold-light)" : "white"};">${u.name}</span>
            <span style="font-weight:900;color:var(--gold-light);font-size:18px;">${u.score ?? 0}</span>
          </div>`;
        })
            .join("");
        const listEl = document.getElementById("group-list");
        if (listEl)
            listEl.innerHTML = html;
    });
}
// ── Logout ────────────────────────────────────────────────────
window.logoutUser = function () {
    localStorage.removeItem("currentUser");
    window.location.replace("index.html");
};
// ════════════════════════════════════════════════════════════
// سؤال الليلة 🌙
// ════════════════════════════════════════════════════════════
let nightQuestionData = null;
function initNightQuestion() {
    if (!db || !currentUser)
        return;
    const today = new Date();
    const dayKey = `night_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
    const nqLog = JSON.parse(localStorage.getItem(`nqLog_${currentUser.id}`) ?? "{}");
    db.collection("settings")
        .doc("night_question")
        .onSnapshot((doc) => {
        if (!doc.exists)
            return;
        const data = doc.data();
        nightQuestionData = data;
        if (nqLog[dayKey] !== undefined)
            return;
        const now = new Date();
        const openH = data.openHour ?? 19;
        const openM = data.openMinute ?? 30;
        const closeH = data.closeHour ?? 4;
        const closeM = data.closeMinute ?? 0;
        const openTime = new Date(now);
        openTime.setHours(openH, openM, 0, 0);
        const closeTime = new Date(now);
        closeTime.setHours(closeH, closeM, 0, 0);
        if (closeH < openH)
            closeTime.setDate(closeTime.getDate() + 1);
        const isActive = now >= openTime && now < closeTime && data.active === true;
        if (isActive) {
            setTimeout(() => window.openNightQuestion(), 2000);
        }
    });
}
window.openNightQuestion = function () {
    if (!nightQuestionData)
        return;
    const overlay = document.getElementById("nq-overlay");
    const content = document.getElementById("nq-content");
    if (!overlay || !content)
        return;
    overlay.style.display = "flex";
    document.body.classList.add("hide-ads");
    const data = nightQuestionData;
    const pts = data.points ?? 10;
    const prizeEl = document.getElementById("nq-prize-pts");
    if (prizeEl)
        prizeEl.textContent = `+${pts}`;
    const arabicLetters = ["أ", "ب", "ج", "د"];
    const optsHtml = data.options
        .map((opt, i) => `
    <button onclick="window.handleNightAnswer(${i})" class="nq-opt-btn" style="
      width:100%;text-align:right;padding:14px 16px;margin-bottom:10px;
      background:rgba(255,255,255,0.05);border:1px solid rgba(167,139,250,0.25);
      border-radius:14px;color:rgba(255,255,255,0.88);font-weight:700;font-size:14px;
      font-family:'Cairo',sans-serif;cursor:pointer;transition:all .2s;
      display:flex;align-items:center;gap:10px;"
      onmouseover="this.style.background='rgba(124,58,237,0.18)';this.style.borderColor='rgba(167,139,250,0.5)'"
      onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(167,139,250,0.25)'">
      <span style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
        background:rgba(124,58,237,0.20);border:1px solid rgba(167,139,250,0.35);
        display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#c4b5fd;">
        ${arabicLetters[i] ?? String(i + 1)}
      </span>
      ${opt}
    </button>`)
        .join("");
    content.innerHTML = `
    <div style="margin-bottom:18px;">
      <p style="font-size:16px;font-weight:900;color:white;line-height:1.65;text-align:center;">${data.question}</p>
    </div>
    <div>${optsHtml}</div>`;
};
window.handleNightAnswer = function (selectedIdx) {
    if (!nightQuestionData || !currentUser || !db)
        return;
    const data = nightQuestionData;
    const correct = data.correctIndex;
    const pts = data.points ?? 10;
    const earned = selectedIdx === correct ? pts : 0;
    document.querySelectorAll(".nq-opt-btn").forEach((btn, idx) => {
        btn.style.pointerEvents = "none";
        if (idx === correct) {
            btn.style.background = "rgba(34,197,94,0.20)";
            btn.style.borderColor = "rgba(34,197,94,0.60)";
            btn.style.color = "#4ade80";
        }
        else if (idx === selectedIdx && selectedIdx !== correct) {
            btn.style.background = "rgba(239,68,68,0.15)";
            btn.style.borderColor = "rgba(239,68,68,0.50)";
            btn.style.opacity = "0.7";
        }
    });
    const today = new Date();
    const dayKey = `night_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
    const nqLog = JSON.parse(localStorage.getItem(`nqLog_${currentUser.id}`) ?? "{}");
    nqLog[dayKey] = earned;
    localStorage.setItem(`nqLog_${currentUser.id}`, JSON.stringify(nqLog));
    if (earned > 0) {
        db.collection("users")
            .doc(currentUser.id)
            .update({ score: firebase.firestore.FieldValue.increment(earned) });
        db.collection("users")
            .doc(currentUser.id)
            .collection("night_logs")
            .doc(dayKey)
            .set({
            day: dayKey,
            score: earned,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }
    setTimeout(() => {
        const content = document.getElementById("nq-content");
        if (!content)
            return;
        if (earned > 0) {
            if (window.confetti) {
                void window.confetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.5 },
                    colors: ["#c4b5fd", "#7c3aed", "#fbbf24", "#fff"],
                });
            }
            content.innerHTML = `
        <div style="text-align:center;padding:20px 10px;">
          <div style="font-size:60px;margin-bottom:12px;filter:drop-shadow(0 0 20px rgba(200,160,255,0.8));">🌟</div>
          <h3 style="font-size:22px;font-weight:900;color:#c4b5fd;margin-bottom:8px;">أحسنت يا بطل!</h3>
          <p style="color:rgba(255,255,255,0.7);font-weight:700;margin-bottom:16px;">الإجابة صحيحة 🎉</p>
          <div style="background:rgba(124,58,237,0.20);border:1px solid rgba(167,139,250,0.35);border-radius:16px;padding:16px;margin-bottom:20px;">
            <div style="font-size:40px;font-weight:900;color:#c4b5fd;">+${earned}</div>
            <div style="font-size:12px;color:rgba(167,139,250,0.7);font-weight:700;">نقطة مضافة 🌙</div>
          </div>
          <button onclick="window.closeNightQuestion()" style="width:100%;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:white;font-weight:900;font-size:16px;padding:14px;border-radius:14px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;">
            العودة للملعب ⛺
          </button>
        </div>`;
        }
        else {
            content.innerHTML = `
        <div style="text-align:center;padding:20px 10px;">
          <div style="font-size:60px;margin-bottom:12px;">😔</div>
          <h3 style="font-size:22px;font-weight:900;color:#f87171;margin-bottom:8px;">إجابة خاطئة</h3>
          <p style="color:rgba(255,255,255,0.6);font-weight:700;margin-bottom:20px;">
            الإجابة الصحيحة: <span style="color:#c4b5fd;font-weight:900;">${data.options[correct]}</span>
          </p>
          <button onclick="window.closeNightQuestion()" style="width:100%;background:linear-gradient(135deg,rgba(124,58,237,0.5),rgba(76,29,149,0.5));color:white;font-weight:900;font-size:16px;padding:14px;border-radius:14px;border:1px solid rgba(167,139,250,0.3);cursor:pointer;font-family:'Cairo',sans-serif;">
            المرة الجاية أحسن 💪
          </button>
        </div>`;
        }
    }, 1200);
};
window.closeNightQuestion = function () {
    const overlay = document.getElementById("nq-overlay");
    if (overlay)
        overlay.style.display = "none";
    document.body.classList.remove("hide-ads");
};
// ════════════════════════════════════════════════════════════
// عجلة الحظ 🎡
// ════════════════════════════════════════════════════════════
function setupWheelTimer() {
    if (!currentUser)
        return;
    const key = `wheelData_${currentUser.id}`;
    let wheelData = JSON.parse(localStorage.getItem(key) ?? "{}");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (wheelData.lastLogin) {
        const last = new Date(wheelData.lastLogin);
        last.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(Math.abs(today.getTime() - last.getTime()) / 86400000);
        if (diffDays === 1) {
            if (wheelData.streak < 3)
                wheelData.streak++;
            wheelData.lastLogin = today.toISOString();
        }
        else if (diffDays > 1) {
            wheelData.streak = 1;
            wheelData.lastLogin = today.toISOString();
        }
    }
    else {
        wheelData = { streak: 1, lastLogin: today.toISOString() };
    }
    localStorage.setItem(key, JSON.stringify(wheelData));
    const badge = document.getElementById("streak-badge");
    if (badge)
        badge.innerText = `${wheelData.streak}/3`;
}
window.openSpinWheel = function () {
    if (!currentUser)
        return;
    const overlay = document.getElementById("spin-overlay");
    if (overlay)
        overlay.style.display = "flex";
    const wheelData = JSON.parse(localStorage.getItem(`wheelData_${currentUser.id}`) ?? "{}");
    const controls = document.getElementById("wheel-controls");
    if (!controls)
        return;
    if (wheelData.streak >= 3) {
        controls.innerHTML = `<button id="spin-btn" onclick="window.spinWheel()" style="width:100%;background:linear-gradient(135deg,#8B6914,#F0C96B);color:#1A0530;font-weight:900;font-size:17px;padding:15px;border-radius:14px;border:none;cursor:pointer;font-family:'Cairo',sans-serif;box-shadow:0 4px 20px rgba(201,168,76,0.4);">لف العجلة الأسطورية! 🎰</button>`;
    }
    else {
        controls.innerHTML = `
      <div style="background:rgba(6,1,15,0.6);border:1px solid rgba(201,168,76,0.2);padding:16px;border-radius:16px;text-align:center;">
        <p style="color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:10px;font-size:13px;">لازم تدخل <span style="color:var(--gold-light);font-weight:900;">${3 - (wheelData.streak ?? 0)}</span> أيام كمان!</p>
        <p id="wheel-timer-inside" style="color:var(--gold-light);font-weight:900;font-size:24px;letter-spacing:3px;font-family:monospace;">--:--:--</p>
      </div>`;
        const interval = setInterval(() => {
            const el = document.getElementById("wheel-timer-inside");
            if (!el) {
                clearInterval(interval);
                return;
            }
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
            el.innerText = `${h}:${m}:${s}`;
        }, 1000);
    }
};
window.closeSpinWheel = function () {
    const overlay = document.getElementById("spin-overlay");
    if (overlay)
        overlay.style.display = "none";
};
let isSpinning = false;
window.spinWheel = function () {
    if (isSpinning || !currentUser || !db)
        return;
    isSpinning = true;
    const wheel = document.getElementById("wheel-spinner");
    if (!wheel)
        return;
    const prizes = [
        { text: "50 نقطة", points: 50, item: null, angle: 330, chance: 5 },
        { text: "حذف إجابتين", points: 0, item: "fifty50", angle: 270, chance: 25 },
        { text: "20 نقطة", points: 20, item: null, angle: 210, chance: 2 },
        { text: "تجميد الوقت", points: 0, item: "freeze", angle: 150, chance: 28 },
        { text: "10 نقاط", points: 10, item: null, angle: 90, chance: 20 },
        { text: "حظ أوفر", points: 0, item: null, angle: 30, chance: 20 },
    ];
    const rand = Math.random() * 100;
    let sum = 0;
    let winIndex = 0;
    for (let i = 0; i < prizes.length; i++) {
        sum += prizes[i].chance;
        if (rand <= sum) {
            winIndex = i;
            break;
        }
    }
    const prize = prizes[winIndex];
    wheel.style.transform = `rotate(${360 * 6 + prize.angle}deg)`;
    setTimeout(() => {
        isSpinning = false;
        const key = `wheelData_${currentUser.id}`;
        const wheelData = JSON.parse(localStorage.getItem(key) ?? "{}");
        wheelData.streak = 0;
        localStorage.setItem(key, JSON.stringify(wheelData));
        if (prize.text === "حظ أوفر") {
            window.showAlert("حظ أوفر!", "معلش يا بطل، حاول تاني المرة الجاية.", "😔");
        }
        else {
            window.showAlert("مبروك!", `كسبت: ${prize.text} 🎁`, "🎉", "success");
            if (window.confetti)
                void window.confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
            if (prize.points > 0) {
                db.collection("users")
                    .doc(currentUser.id)
                    .update({ score: firebase.firestore.FieldValue.increment(prize.points) });
            }
            else if (prize.item) {
                window.myPowerups[prize.item]++;
                db.collection("users")
                    .doc(currentUser.id)
                    .update({ powerups: window.myPowerups });
            }
        }
        setTimeout(() => location.reload(), 3500);
    }, 4000);
};
