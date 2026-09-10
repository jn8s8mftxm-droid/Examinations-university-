(() => {
  'use strict';

  // ========== BUILT-IN DECKS ==========
  const BUILTIN = {
    english: [
      { f: "abandon", b: "捨てる、放棄する" }, { f: "able", b: "〜できる" },
      { f: "abroad", b: "海外で" }, { f: "absence", b: "不在" },
      { f: "absolute", b: "絶対的な" }, { f: "absorb", b: "吸収する" },
      { f: "abstract", b: "抽象的な" }, { f: "abundant", b: "豊富な" },
      { f: "abuse", b: "乱用・虐待" }, { f: "academic", b: "学術的な" },
      { f: "accept", b: "受け入れる" }, { f: "access", b: "アクセス" },
      { f: "accident", b: "事故" }, { f: "accommodate", b: "収容する" },
      { f: "accompany", b: "同行する" }, { f: "accomplish", b: "成し遂げる" },
      { f: "accurate", b: "正確な" }, { f: "accuse", b: "非難する" },
      { f: "achieve", b: "達成する" }, { f: "acknowledge", b: "認める" },
      { f: "acquire", b: "獲得する" }, { f: "adapt", b: "適応する" },
      { f: "adequate", b: "適切な" }, { f: "adjust", b: "調整する" },
      { f: "admire", b: "称賛する" }, { f: "admit", b: "認める" },
      { f: "adopt", b: "採用する" }, { f: "advance", b: "前進する" },
      { f: "advantage", b: "利点" }, { f: "affect", b: "影響する" },
    ],
    math: [
      { f: "二次方程式の解の公式", b: "x = [-b ± √(b²-4ac)] / 2a" },
      { f: "sin²θ + cos²θ", b: "1" },
      { f: "加法定理 sin(α+β)", b: "sinαcosβ + cosαsinβ" },
      { f: "加法定理 cos(α+β)", b: "cosαcosβ − sinαsinβ" },
      { f: "微分 xⁿ", b: "n xⁿ⁻¹" },
      { f: "積分 xⁿ (n≠-1)", b: "xⁿ⁺¹/(n+1) + C" },
      { f: "対数 logₐ(MN)", b: "logₐM + logₐN" },
      { f: "等差数列の和", b: "n(a₁+aₙ)/2" },
      { f: "等比数列の和", b: "a(rⁿ−1)/(r−1)" },
      { f: "余弦定理", b: "c² = a²+b²−2ab cosC" },
      { f: "正弦定理", b: "a/sinA = 2R" },
      { f: "ベクトル内積", b: "a·b = |a||b|cosθ" },
    ],
    science: [
      { f: "運動方程式", b: "F = ma" },
      { f: "万有引力", b: "F = G m₁m₂ / r²" },
      { f: "オームの法則", b: "V = IR" },
      { f: "気体の状態方程式", b: "PV = nRT" },
      { f: "アボガドロ定数", b: "6.02×10²³ /mol" },
      { f: "光速", b: "約 3.0×10⁸ m/s" },
      { f: "光合成", b: "6CO₂+6H₂O → C₆H₁₂O₆+6O₂" },
      { f: "DNA塩基対", b: "A-T / G-C" },
    ],
    history: [
      { f: "大化の改新", b: "645年" },
      { f: "奈良遷都", b: "710年 平城京" },
      { f: "平安遷都", b: "794年" },
      { f: "鎌倉幕府", b: "1185年頃 源頼朝" },
      { f: "元寇", b: "1274・1281年" },
      { f: "室町幕府", b: "1338年 足利尊氏" },
      { f: "応仁の乱", b: "1467年〜" },
      { f: "関ヶ原", b: "1600年" },
      { f: "江戸幕府", b: "1603年" },
      { f: "黒船来航", b: "1853年" },
      { f: "明治維新", b: "1868年" },
      { f: "終戦", b: "1945年8月15日" },
    ],
    custom: []
  };

  const DECK_NAMES = {
    english: "英語単語", math: "数学公式", science: "理科",
    history: "日本史", custom: "マイ単語"
  };

  // ========== STATE ==========
  const defaultState = {
    level: 1, xp: 0, streak: 0, lastStudyDate: null,
    totalMinutes: 0, totalSessions: 0, todayMinutes: 0, todayDate: null,
    sessionsToday: 0,
    subjects: { "英語": 0, "数学": 0, "国語": 0, "理科": 0, "社会": 0, "その他": 0 },
    weekly: {},
    tasks: [],
    mocks: [],
    universities: [],
    customCards: []
  };

  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem("focusCalm") || "null");
      if (s) return { ...defaultState, ...s, subjects: { ...defaultState.subjects, ...(s.subjects || {}) } };
    } catch (e) {}
    return JSON.parse(JSON.stringify(defaultState));
  }
  function save() { localStorage.setItem("focusCalm", JSON.stringify(state)); }

  function checkDay() {
    const today = new Date().toDateString();
    if (state.todayDate !== today) {
      state.todayMinutes = 0;
      state.sessionsToday = 0;
      state.todayDate = today;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
      Object.keys(state.weekly).forEach(d => { if (new Date(d) < cutoff) delete state.weekly[d]; });
      save();
    }
  }
  checkDay();

  // ========== XP ==========
  function xpNeed(lv) { return Math.floor(80 * Math.pow(1.35, lv - 1)); }
  function addXP(n) {
    state.xp += n;
    let need = xpNeed(state.level);
    while (state.xp >= need) {
      state.xp -= need;
      state.level++;
      need = xpNeed(state.level);
      toast(`レベルアップ！ Lv.${state.level}`);
    }
    save(); updateUI();
  }

  // ========== TIMER ==========
  const MODES = {
    pomodoro: { m: 25, label: "集中タイム" },
    short: { m: 5, label: "短い休憩" },
    long: { m: 15, label: "長い休憩" },
    custom: { m: 30, label: "カスタム" }
  };
  let mode = "pomodoro", totalSec = 25 * 60, remain = totalSec, running = false, timerId = null;
  const CIRC = 2 * Math.PI * 88;

  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === m));
    totalSec = MODES[m].m * 60;
    remain = totalSec;
    document.getElementById("timer-label").textContent = MODES[m].label;
    drawTimer();
    stopTimer();
  }
  function drawTimer() {
    const mm = Math.floor(remain / 60), ss = remain % 60;
    document.getElementById("time-text").textContent = `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    document.getElementById("ring").style.strokeDasharray = CIRC;
    document.getElementById("ring").style.strokeDashoffset = CIRC * (1 - remain / totalSec);
  }
  function startTimer() {
    if (running) return;
    running = true;
    document.getElementById("btn-start").disabled = true;
    document.getElementById("btn-pause").disabled = false;
    timerId = setInterval(() => {
      remain--;
      drawTimer();
      if (remain <= 0) {
        clearInterval(timerId);
        running = false;
        document.getElementById("btn-start").disabled = false;
        document.getElementById("btn-pause").disabled = true;
        onComplete();
      }
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerId);
    running = false;
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-pause").disabled = true;
  }
  function resetTimer() { stopTimer(); remain = totalSec; drawTimer(); }

  function onComplete() {
    beep();
    if (mode === "pomodoro" || mode === "custom") {
      const mins = Math.round(totalSec / 60);
      const sub = document.getElementById("focus-subject").value;
      addStudy(sub, mins);
      state.sessionsToday++;
      state.totalSessions++;
      document.getElementById("session-count").textContent = state.sessionsToday;
      addXP(mins * 2);
      updateStreak();
      toast(`${mins}分の集中完了！ +${mins * 2} XP`);
      if (mode === "pomodoro") setMode("short");
    } else {
      toast("休憩終了。また集中しましょう");
    }
  }

  function beep() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 660; g.gain.value = 0.08;
      o.start(); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      o.stop(c.currentTime + 0.6);
    } catch (e) {}
  }

  document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.mode === "custom") {
      const v = prompt("分数を入力", MODES.custom.m);
      if (v && !isNaN(v) && v > 0) MODES.custom.m = +v;
    }
    setMode(b.dataset.mode);
  }));
  document.getElementById("btn-start").onclick = startTimer;
  document.getElementById("btn-pause").onclick = stopTimer;
  document.getElementById("btn-reset").onclick = resetTimer;

  // ========== STUDY TIME ==========
  function addStudy(sub, mins) {
    checkDay();
    state.subjects[sub] = (state.subjects[sub] || 0) + mins;
    state.totalMinutes += mins;
    state.todayMinutes += mins;
    const t = new Date().toDateString();
    state.weekly[t] = (state.weekly[t] || 0) + mins;
    state.lastStudyDate = t;
    save(); updateUI();
  }
  function updateStreak() {
    const today = new Date().toDateString();
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (state.lastStudyDate === today) {
      if (state.streak === 0) state.streak = 1;
    } else if (state.lastStudyDate === y.toDateString()) {
      state.streak++;
    } else {
      state.streak = 1;
    }
    state.lastStudyDate = today;
    save();
  }

  document.getElementById("add-time-btn").onclick = () => {
    const sub = document.getElementById("manual-subject").value;
    const mins = +document.getElementById("manual-minutes").value || 0;
    if (mins > 0) {
      addStudy(sub, mins);
      addXP(mins);
      updateStreak();
      toast(`${sub} に ${mins}分追加`);
      renderSubjects();
    }
  };

  // ========== FLASHCARDS ==========
  let deckKey = "english", idx = 0, flipped = false;

  function getDeck() {
    if (deckKey === "custom") return state.customCards;
    return [...(BUILTIN[deckKey] || []), ...(state.customCards.filter(c => c.deck === deckKey))];
  }

  function renderDeckTabs() {
    const el = document.getElementById("deck-tabs");
    el.innerHTML = "";
    Object.keys(DECK_NAMES).forEach(k => {
      const b = document.createElement("button");
      b.className = "deck-btn" + (k === deckKey ? " active" : "");
      b.textContent = DECK_NAMES[k];
      b.onclick = () => { deckKey = k; idx = 0; showCard(); renderDeckTabs(); };
      el.appendChild(b);
    });
  }

  function showCard() {
    const deck = getDeck();
    if (!deck.length) {
      document.getElementById("card-front").textContent = "カードがありません";
      document.getElementById("card-back").textContent = "「単語を追加」から作ろう";
      document.getElementById("card-index").textContent = "0";
      document.getElementById("card-total").textContent = "0";
      return;
    }
    idx = Math.max(0, Math.min(idx, deck.length - 1));
    const c = deck[idx];
    document.getElementById("card-front").textContent = c.f || c.front;
    document.getElementById("card-back").textContent = c.b || c.back;
    document.getElementById("card-index").textContent = idx + 1;
    document.getElementById("card-total").textContent = deck.length;
    flipped = false;
    document.getElementById("flashcard").classList.remove("flipped");
  }

  function flip() {
    flipped = !flipped;
    document.getElementById("flashcard").classList.toggle("flipped", flipped);
  }

  document.getElementById("card-flip").onclick = flip;
  document.getElementById("flashcard").onclick = flip;
  document.getElementById("card-prev").onclick = () => {
    const d = getDeck(); if (!d.length) return;
    idx = (idx - 1 + d.length) % d.length; showCard();
  };
  document.getElementById("card-next").onclick = () => {
    const d = getDeck(); if (!d.length) return;
    idx = (idx + 1) % d.length; showCard();
  };
  document.getElementById("card-know").onclick = () => {
    addXP(5); toast("覚えた！ +5 XP");
    const d = getDeck(); if (d.length) { idx = (idx + 1) % d.length; showCard(); }
  };
  document.getElementById("card-again").onclick = () => {
    const d = getDeck(); if (d.length) { idx = (idx + 1) % d.length; showCard(); }
  };

  // Add card
  document.getElementById("btn-add-card").onclick = () => {
    document.getElementById("add-card-modal").classList.remove("hidden");
  };
  document.getElementById("cancel-card").onclick = () => {
    document.getElementById("add-card-modal").classList.add("hidden");
  };
  document.getElementById("save-card").onclick = () => {
    const f = document.getElementById("new-front").value.trim();
    const b = document.getElementById("new-back").value.trim();
    const d = document.getElementById("new-deck").value;
    if (!f || !b) { toast("表面と裏面を入力してください"); return; }
    state.customCards.push({ f, b, deck: d });
    save();
    document.getElementById("new-front").value = "";
    document.getElementById("new-back").value = "";
    document.getElementById("add-card-modal").classList.add("hidden");
    if (d === deckKey || deckKey === "custom") showCard();
    toast("カードを追加しました");
  };

  // ========== MOCK EXAMS ==========
  function renderMocks() {
    const list = document.getElementById("mock-list");
    list.innerHTML = "";
    const sorted = [...state.mocks].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "mock-item";
      div.innerHTML = `
        <div>
          <strong>${esc(m.name)}</strong>
          <span style="color:var(--text-soft);font-size:0.82rem;margin-left:8px">${m.date}</span>
          ${m.score ? `<span style="color:var(--text-soft);font-size:0.82rem"> / ${m.score}点</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span class="hensachi">${m.hensachi}</span>
          <button class="delete" data-i="${state.mocks.indexOf(m)}">×</button>
        </div>
      `;
      div.querySelector(".delete").onclick = () => {
        state.mocks.splice(+div.querySelector(".delete").dataset.i, 1);
        save(); renderMocks(); drawChart();
      };
      list.appendChild(div);
    });
    drawChart();
  }

  function drawChart() {
    const canvas = document.getElementById("hensachi-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.parentElement.clientWidth - 40;
    canvas.width = w;
    canvas.height = 200;
    ctx.clearRect(0, 0, w, 200);

    const data = [...state.mocks].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (data.length < 1) {
      ctx.fillStyle = "#999";
      ctx.font = "14px sans-serif";
      ctx.fillText("模試を記録するとグラフが表示されます", 20, 100);
      return;
    }

    const vals = data.map(d => d.hensachi);
    const minV = Math.min(...vals) - 3;
    const maxV = Math.max(...vals) + 3;
    const pad = 30;
    const chartW = w - pad * 2;
    const chartH = 160;

    // grid
    ctx.strokeStyle = "#e5e1d8";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }

    // line
    ctx.strokeStyle = "#5b8a72";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad + (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * i);
      const y = pad + chartH - ((d.hensachi - minV) / (maxV - minV)) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points
    data.forEach((d, i) => {
      const x = pad + (data.length === 1 ? chartW / 2 : (chartW / (data.length - 1)) * i);
      const y = pad + chartH - ((d.hensachi - minV) / (maxV - minV)) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#5b8a72";
      ctx.fill();
      ctx.fillStyle = "#2c2c2c";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.hensachi, x, y - 10);
    });
  }

  document.getElementById("add-mock").onclick = () => {
    const name = document.getElementById("mock-name").value.trim();
    const date = document.getElementById("mock-date").value;
    const h = parseFloat(document.getElementById("mock-hensachi").value);
    const score = document.getElementById("mock-score").value;
    if (!name || !date || isNaN(h)) { toast("模試名・日付・偏差値は必須です"); return; }
    state.mocks.push({ name, date, hensachi: h, score: score ? +score : null });
    save();
    document.getElementById("mock-name").value = "";
    document.getElementById("mock-hensachi").value = "";
    document.getElementById("mock-score").value = "";
    renderMocks();
    toast("模試結果を記録しました");
  };

  // set default date
  document.getElementById("mock-date").value = new Date().toISOString().slice(0, 10);

  // ========== UNIVERSITIES ==========
  function latestHensachi() {
    if (!state.mocks.length) return null;
    const sorted = [...state.mocks].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0].hensachi;
  }

  function renderUnis() {
    const el = document.getElementById("uni-list");
    el.innerHTML = "";
    const latest = latestHensachi();
    state.universities.forEach((u, i) => {
      const diff = latest != null ? (latest - u.hensachi).toFixed(1) : null;
      const card = document.createElement("div");
      card.className = "uni-card";
      card.innerHTML = `
        <div class="uni-info">
          <h4>${esc(u.name)}</h4>
          <div class="faculty">${esc(u.faculty || "")}</div>
        </div>
        <div class="uni-meta">
          <div class="target">目標 ${u.hensachi}</div>
          <div class="priority">${u.priority}</div>
          ${diff != null ? `<div class="diff ${diff >= 0 ? "ok" : "ng"}">現在との差: ${diff >= 0 ? "+" : ""}${diff}</div>` : ""}
        </div>
        <button class="uni-delete" data-i="${i}">×</button>
      `;
      card.querySelector(".uni-delete").onclick = () => {
        state.universities.splice(i, 1);
        save(); renderUnis();
      };
      el.appendChild(card);
    });
  }

  document.getElementById("add-uni").onclick = () => {
    const name = document.getElementById("uni-name").value.trim();
    const faculty = document.getElementById("uni-faculty").value.trim();
    const h = parseFloat(document.getElementById("uni-hensachi").value);
    const priority = document.getElementById("uni-priority").value;
    if (!name || isNaN(h)) { toast("大学名と目標偏差値は必須です"); return; }
    state.universities.push({ name, faculty, hensachi: h, priority });
    save();
    document.getElementById("uni-name").value = "";
    document.getElementById("uni-faculty").value = "";
    document.getElementById("uni-hensachi").value = "";
    renderUnis();
    toast("志望校を追加しました");
  };

  // ========== TASKS ==========
  function renderTasks() {
    const list = document.getElementById("task-list");
    list.innerHTML = "";
    let done = 0;
    state.tasks.forEach((t, i) => {
      if (t.done) done++;
      const li = document.createElement("li");
      li.className = "task-item" + (t.done ? " done" : "");
      li.innerHTML = `
        <div class="task-check">${t.done ? "✓" : ""}</div>
        <div class="text">${esc(t.text)}</div>
        <span class="task-tag">${t.subject}</span>
        <button class="task-del">×</button>
      `;
      li.querySelector(".task-check").onclick = () => {
        t.done = !t.done;
        if (t.done) addXP(8);
        save(); renderTasks();
      };
      li.querySelector(".task-del").onclick = () => {
        state.tasks.splice(i, 1); save(); renderTasks();
      };
      list.appendChild(li);
    });
    document.getElementById("tasks-done").textContent = done;
    document.getElementById("tasks-total").textContent = state.tasks.length;
  }

  document.getElementById("add-task").onclick = () => {
    const text = document.getElementById("task-input").value.trim();
    if (!text) return;
    state.tasks.push({ text, subject: document.getElementById("task-subject").value, done: false });
    document.getElementById("task-input").value = "";
    save(); renderTasks();
  };
  document.getElementById("task-input").onkeypress = e => {
    if (e.key === "Enter") document.getElementById("add-task").click();
  };

  // ========== SUBJECTS ==========
  function renderSubjects() {
    const grid = document.getElementById("subjects-grid");
    grid.innerHTML = "";
    const max = Math.max(...Object.values(state.subjects), 60);
    Object.entries(state.subjects).forEach(([name, mins]) => {
      const pct = Math.min(100, (mins / max) * 100);
      const card = document.createElement("div");
      card.className = "subject-card";
      card.innerHTML = `
        <div class="name"><span>${name}</span><span class="time">${mins}分</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      `;
      grid.appendChild(card);
    });
  }

  // ========== COACH (rule-based AI) ==========
  function generateCoach() {
    const tips = [];
    const total = state.totalMinutes;
    const subjects = state.subjects;
    const maxSub = Object.entries(subjects).sort((a, b) => b[1] - a[1])[0];
    const minSub = Object.entries(subjects).filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1])[0];
    const latest = latestHensachi();
    const unis = state.universities;

    // Main message
    let msg = "";
    if (total === 0) {
      msg = "まだ勉強記録がありません。まずはタイマーで25分、集中してみましょう。小さな一歩が大きな結果につながります。";
    } else if (state.streak >= 7) {
      msg = `素晴らしい！${state.streak}日連続で学習を続けています。このペースを維持できれば、確実に力がついていきます。`;
    } else if (state.streak >= 3) {
      msg = `${state.streak}日連続です。習慣化の入り口に立っています。あと数日続ければ「当たり前」になりますよ。`;
    } else {
      msg = `これまでの総勉強時間は${total}分です。今日も少しでも進められれば、それが積み重なって合格に近づきます。`;
    }

    // Subject balance
    if (minSub && maxSub && maxSub[1] > minSub[1] * 2.5 && minSub[1] > 0) {
      tips.push({ title: "科目バランス", text: `${maxSub[0]}に時間を多く使っています。${minSub[0]}も毎日少し触れると、苦手意識が薄れやすくなります。` });
    }

    // Mock vs target
    if (latest != null && unis.length) {
      const first = unis.find(u => u.priority === "第一志望") || unis[0];
      const gap = first.hensachi - latest;
      if (gap > 5) {
        tips.push({ title: "志望校との差", text: `第一志望まであと偏差値${gap.toFixed(1)}。焦らず、弱点分野を重点的に潰していきましょう。` });
      } else if (gap > 0) {
        tips.push({ title: "あと少し", text: `第一志望まで偏差値${gap.toFixed(1)}差です。過去問と弱点補強で十分届く範囲です。` });
      } else {
        tips.push({ title: "目標達成圏内", text: `現在の偏差値は志望校レベルに到達しています。油断せず、安定させることを意識しましょう。` });
      }
    } else if (unis.length && latest == null) {
      tips.push({ title: "模試の活用", text: "志望校を設定済みです。模試を受けたら結果を記録すると、進捗が可視化されます。" });
    }

    // Streak
    if (state.streak === 0 && total > 0) {
      tips.push({ title: "習慣づくり", text: "昨日勉強していないようです。今日25分だけでも再開すれば、連続記録がまた始まります。" });
    }

    // Tasks
    const undone = state.tasks.filter(t => !t.done).length;
    if (undone > 3) {
      tips.push({ title: "課題の整理", text: `未完了の課題が${undone}件あります。優先順位をつけて、今日やる分だけに絞ると楽になります。` });
    }

    // General tips
    const general = [
      { title: "睡眠", text: "記憶の定着には睡眠が不可欠です。夜更かしして詰め込んでも、翌朝にはほとんど残っていません。" },
      { title: "休憩の質", text: "休憩中はスマホを見ない方が、次の集中が戻りやすくなります。短い散歩や深呼吸がおすすめです。" },
      { title: "アウトプット", text: "読んだだけでは定着しません。問題を解く・声に出す・誰かに説明する時間を意識的に取りましょう。" },
      { title: "小さな成功", text: "大きな目標だけでなく「今日は英単語30個」のような小さな達成を積み重ねると、やる気は続きやすくなります。" },
    ];
    // pick 1-2 random general
    const shuffled = general.sort(() => Math.random() - 0.5).slice(0, 2);
    tips.push(...shuffled);

    document.getElementById("coach-message").textContent = msg;
    const tipsEl = document.getElementById("coach-tips");
    tipsEl.innerHTML = tips.map(t => `<div class="tip-item"><strong>${t.title}</strong><br>${t.text}</div>`).join("");
  }

  document.getElementById("coach-refresh").onclick = generateCoach;

  // ========== STATS ==========
  function renderStats() {
    document.getElementById("stat-total").textContent = state.totalMinutes;
    document.getElementById("stat-sessions").textContent = state.totalSessions;
    document.getElementById("stat-streak").textContent = state.streak;
    document.getElementById("stat-level").textContent = state.level;

    const bars = document.getElementById("weekly-bars");
    bars.innerHTML = "";
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); days.push(d);
    }
    const maxM = Math.max(...days.map(d => state.weekly[d.toDateString()] || 0), 30);
    days.forEach(d => {
      const mins = state.weekly[d.toDateString()] || 0;
      const h = Math.max(3, (mins / maxM) * 100);
      const col = document.createElement("div");
      col.className = "bar-col";
      col.innerHTML = `<div class="bar" style="height:${h}px"></div><div class="bar-lbl">${d.getMonth()+1}/${d.getDate()}</div>`;
      bars.appendChild(col);
    });

    const subEl = document.getElementById("subject-bars");
    subEl.innerHTML = "";
    const tot = Object.values(state.subjects).reduce((a, b) => a + b, 0) || 1;
    Object.entries(state.subjects).forEach(([n, m]) => {
      const pct = (m / tot) * 100;
      const row = document.createElement("div");
      row.className = "sub-row";
      row.innerHTML = `<div class="sub-name">${n}</div><div class="sub-track"><div class="sub-fill" style="width:${pct}%"></div></div><div class="sub-val">${m}分</div>`;
      subEl.appendChild(row);
    });
  }

  // ========== NAV ==========
  const meta = {
    timer: ["フォーカスタイマー", "落ち着いて集中する時間を作りましょう"],
    flashcards: ["単語・公式帳", "繰り返し覚えて定着させよう"],
    mock: ["模試・偏差値", "結果を記録して成長を可視化"],
    target: ["志望校設定", "目標を明確にしてモチベーションを保つ"],
    subjects: ["科目進捗", "どの科目に時間を使っているか確認"],
    tasks: ["今日の課題", "やることを明確にして消化しよう"],
    coach: ["学習コーチ", "あなたのデータに基づいたアドバイス"],
    stats: ["学習統計", "これまでの積み重ねを振り返る"]
  };

  document.querySelectorAll(".nav-item").forEach(item => {
    item.onclick = () => {
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      const p = item.dataset.panel;
      document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
      document.getElementById("panel-" + p).classList.add("active");
      document.getElementById("panel-title").textContent = meta[p][0];
      document.getElementById("panel-desc").textContent = meta[p][1];
      if (p === "subjects") renderSubjects();
      if (p === "stats") renderStats();
      if (p === "tasks") renderTasks();
      if (p === "mock") renderMocks();
      if (p === "target") renderUnis();
      if (p === "coach") generateCoach();
      if (p === "flashcards") { renderDeckTabs(); showCard(); }
    };
  });

  // ========== UI ==========
  function updateUI() {
    document.getElementById("user-level").textContent = state.level;
    document.getElementById("streak-count").textContent = state.streak;
    document.getElementById("today-study-time").textContent = state.todayMinutes + "分";
    document.getElementById("session-count").textContent = state.sessionsToday;
    const need = xpNeed(state.level);
    document.getElementById("xp-mini").style.width = Math.min(100, (state.xp / need) * 100) + "%";
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.add("hidden"), 2600);
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // INIT
  drawTimer();
  renderDeckTabs();
  showCard();
  renderTasks();
  updateUI();
})();
