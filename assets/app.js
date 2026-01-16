/**
 * AI EduBrain Demo
 * - Product-like structure: assets split, version, SPA friendly
 * - Features added: Trend chart + Class segmentation + Anomaly drilldown (drawer)
 * - Keeps original flows: Home / Teacher / Student / Gov, Teacher Prep/Mark, OCR scan
 */

const APP = {
  name: "AI EduBrain",
  version: "0.9.0-demo",
  build: "2026.01.16",
};

const state = {
  view: "home",
  teacherMode: "prep", // prep | mark | analytics
  scanning: false,
  feedTimer: null,
  govInited: false,
};

const mock = {
  studentTrend: [62, 64, 61, 66, 69, 70, 72],
  archiveTrend: [58, 61, 63, 62, 66, 69, 72],
  govTrendA: [86, 87, 88, 89, 90, 91, 92],
  govTrendB: [8, 10, 9, 11, 13, 12, 14],

  classSegments: [
    { name: "A 组 · 领先", desc: "综合掌握高，可提升拔高题", count: 9, pct: 30 },
    { name: "B 组 · 稳定", desc: "基础扎实，补齐推理链路", count: 14, pct: 47 },
    { name: "C 组 · 预警", desc: "计算/概念薄弱，需要补救练习", count: 7, pct: 23 },
  ],

  anomalies: [
    {
      id: "an-001",
      title: "作业量预警：初二(3) 班本周作业耗时异常偏高",
      sub: "较区域均值 +38%，疑似题目难度偏高或讲解未覆盖",
      meta: { school: "实验中学", class: "初二(3)班", metric: "作业耗时", impact: "31人" },
      insights: [
        "题目梯度偏陡：中档题占比过高，导致后段学生卡住",
        "错误集中在「分数乘除法 · 单位“1”识别」",
        "讲评环节缺少“错因拆解”，学生反复试错"
      ],
      recommended: [
        "将作业拆为 A/B 两层：基础 8 题 + 提升 4 题",
        "为 C 组推送 3 组“单位 1”专项练习（每组 5 题）",
        "下一课加入 6 分钟错因讲解：画线段图定位单位 1"
      ],
      drill: {
        topMistakes: [
          { k: "单位“1”识别错误", v: "45%" },
          { k: "负号处理错误", v: "21%" },
          { k: "约分步骤遗漏", v: "16%" },
        ],
        students: [
          { name: "张同学", risk: "高", note: "概念理解弱，需先补基础" },
          { name: "王同学", risk: "中", note: "计算粗心，建议限时训练" },
          { name: "李同学", risk: "中", note: "步骤跳跃，需规范书写" },
        ],
      },
    },
    {
      id: "an-002",
      title: "共性错误突增：分数应用题第 2 题错误率升高",
      sub: "错题集中于“20 ÷ 3/4”的逆运算理解偏差",
      meta: { school: "第一中学", class: "初二(1)班", metric: "错误率", impact: "28人" },
      insights: [
        "学生易把“除以分数”当成“乘以分数”",
        "缺少“为什么要乘倒数”的直观解释",
        "线段图/单位 1 视角训练不足"
      ],
      recommended: [
        "课堂加 2 题对比：20×3/4 与 20÷3/4 的含义差异",
        "让学生用“份数法”复述题意：3/4 对应 20，求 1",
        "批改后自动推送同类巩固练习 6 题"
      ],
      drill: {
        topMistakes: [
          { k: "倒数转换遗漏", v: "39%" },
          { k: "题意理解偏差", v: "31%" },
          { k: "步骤书写不规范", v: "18%" },
        ],
        students: [
          { name: "陈同学", risk: "高", note: "概念混淆明显" },
          { name: "赵同学", risk: "中", note: "能做但不稳定" },
          { name: "吴同学", risk: "中", note: "过程跳步" },
        ],
      },
    },
  ],
};

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function setVersionBadge() {
  const el = $("#app-version");
  if (el) el.textContent = `v${APP.version}`;
}

function setActiveView(id) {
  state.view = id;

  $$(".nav-item").forEach((n) => n.classList.remove("active"));
  const nav = $(`.nav-item[data-view="${id}"]`);
  if (nav) nav.classList.add("active");

  $$(".view-container").forEach((v) => v.classList.remove("active"));
  const view = $(`#view-${id}`);
  if (view) view.classList.add("active");

  const titles = { home: "首页", teacher: "教师工作台", student: "学生伴侣", gov: "治理驾驶舱" };
  $("#page-title").textContent = titles[id] || "工作区";

  // header toggle
  if (id === "gov") {
    $("#top-header").style.display = "none";
    initGov();
  } else {
    $("#top-header").style.display = "flex";
    teardownGov();
  }

  if (id === "student") {
    renderStudentCharts();
    seedStudentFeed();
  }
}

function svgTrend(values, opts = {}) {
  const w = 520, h = 120;
  const pad = 10;
  const max = Math.max(...values) + 3;
  const min = Math.min(...values) - 3;

  const xStep = (w - pad * 2) / (values.length - 1);
  const scaleY = (val) => {
    const t = (val - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  };

  const points = values.map((v, i) => `${pad + i * xStep},${scaleY(v).toFixed(2)}`).join(" ");

  const last = values[values.length - 1];
  const label = opts.label || "趋势";
  const suffix = opts.suffix || "%";

  return `
  <svg viewBox="0 0 ${w} ${h}" aria-label="${label}">
    <defs>
      <linearGradient id="gl" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#4f46e5" stop-opacity="0.25"></stop>
        <stop offset="1" stop-color="#8b5cf6" stop-opacity="0.10"></stop>
      </linearGradient>
    </defs>

    <path d="M ${pad},${h-pad} L ${points.replaceAll(" ", " L ")} L ${w-pad},${h-pad} Z"
      fill="url(#gl)" opacity="1"></path>

    <polyline points="${points}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>

    ${values.map((v, i) => `
      <circle cx="${pad + i * xStep}" cy="${scaleY(v)}" r="4" fill="#4f46e5" opacity="${i === values.length - 1 ? 1 : 0.35}"></circle>
    `).join("")}

    <text x="${w - 12}" y="18" text-anchor="end" font-size="12" fill="#64748b">最新</text>
    <text x="${w - 12}" y="40" text-anchor="end" font-size="20" font-weight="900" fill="#0f172a">${last}${suffix}</text>
  </svg>`;
}

function addMsg(role, text) {
  const box = $("#chat-box");
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ---------- Home ----------
function bindHomeActions() {
  // cards
  $$(".feature-card").forEach((c) => {
    c.addEventListener("click", () => {
      const act = c.getAttribute("data-action");
      if (act === "prep") {
        setActiveView("teacher");
        setTeacherMode("prep");
        $("#teacher-input").value = "生成《分数应用题》教学设计";
        setTimeout(triggerTeacherMsg, 150);
      } else if (act === "mark") {
        setActiveView("teacher");
        setTeacherMode("mark");
      } else if (act === "student") {
        setActiveView("student");
      }
    });
  });

  // magic go
  $("#magic-go").addEventListener("click", () => {
    const v = ($("#magic-input").value || "").trim();
    if (!v) return;

    if (v.includes("备课")) {
      setActiveView("teacher");
      setTeacherMode("prep");
      $("#teacher-input").value = v;
      triggerTeacherMsg();
    } else if (v.includes("批改") || v.includes("作业")) {
      setActiveView("teacher");
      setTeacherMode("mark");
    } else if (v.includes("成长") || v.includes("档案")) {
      setActiveView("student");
      openGrowthModal();
    } else {
      addMsg("ai", `我理解为：${v}。你可以进入教师端或学生端继续操作。`);
    }
  });

  $("#magic-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") $("#magic-go").click();
  });
}

// ---------- Teacher ----------
function setTeacherMode(mode) {
  state.teacherMode = mode;

  // button states
  const btnPrep = $("#btn-prep");
  const btnMark = $("#btn-mark");
  const btnAnalytics = $("#btn-analytics");

  btnPrep.className = "btn " + (mode === "prep" ? "btn-primary" : "btn-ghost");
  btnMark.className = "btn " + (mode === "mark" ? "btn-primary" : "btn-ghost");
  btnAnalytics.className = "btn " + (mode === "analytics" ? "btn-primary" : "btn-ghost");

  // workspace visibility
  $("#prep-placeholder").style.display = mode === "prep" ? "block" : "none";
  $("#lesson-result").style.display = "none";
  $("#ocr-interface").style.display = mode === "mark" ? "block" : "none";
  $("#analytics-root").style.display = mode === "analytics" ? "block" : "none";

  // reset OCR
  if (mode === "mark") {
    state.scanning = false;
    $("#ocr-tip").style.display = "block";
    const laser = $("#ocr-interface .scan-laser");
    const spot = $("#ocr-interface .error-spot");
    laser.style.display = "none";
    spot.style.display = "none";
  }

  if (mode === "analytics") {
    renderTeacherAnalytics();
  }
}

function renderLessonCard() {
  $("#lesson-result").innerHTML = `
    <div class="lesson-card">
      <h2 style="font-size:20px;margin:0 0 14px 0;background:var(--primary-grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:950">
        📘 教学设计：分数应用题（学情联动版）
      </h2>

      <div style="position:relative; padding-left:18px">
        <div class="timeline-line"></div>

        <div class="timeline-item">
          <div style="font-weight:950;color:#0f172a">00:00 课堂导入</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">用“切蛋糕”引入单位“1”的含义</div>
        </div>

        <div class="timeline-item">
          <div style="font-weight:950;color:#0f172a">05:00 核心探究</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">画线段图理解数量关系（重点补齐：单位“1”定位）</div>
        </div>

        <div class="timeline-item">
          <div style="font-weight:950;color:#0f172a">15:00 分层训练</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">A/B/C 分层练习：基础 8 + 提升 4（自动推荐）</div>
        </div>

        <div class="timeline-item">
          <div style="font-weight:950;color:#0f172a">28:00 课堂小测</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">实时收集反馈，生成薄弱点雷达</div>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%;margin-top:14px;justify-content:center">✨ 导出 PPT（Mock）</button>
    </div>
  `;
}

function triggerTeacherMsg() {
  const input = $("#teacher-input");
  const text = (input.value || "").trim();
  if (!text) return;

  addMsg("user", text);
  input.value = "";

  // simple routing
  if (text.includes("异常") || text.includes("分析")) {
    addMsg("ai", "已切换到「教学分析」，正在汇总：趋势 + 分层 + 异常钻取…");
    setTimeout(() => {
      setTeacherMode("analytics");
      addMsg("ai", "已生成分析看板：你可以点击异常卡片进入钻取详情。");
    }, 600);
    return;
  }

  if (state.teacherMode !== "prep") {
    addMsg("ai", "我已记录指令。建议切换到「备课模式」执行教案生成。");
    return;
  }

  setTimeout(() => {
    addMsg("ai", "正在生成《分数应用题》教学设计（已联动班级薄弱点：单位“1”识别）…");
    setTimeout(() => {
      $("#prep-placeholder").style.display = "none";
      $("#lesson-result").style.display = "block";
      renderLessonCard();
    }, 700);
  }, 350);
}

function renderTeacherAnalytics() {
  const root = $("#analytics-root");

  const kpis = [
    { k: "本周作业完成率", v: "91%", s: "较上周 +2%" },
    { k: "薄弱知识点数", v: "4", s: "单位“1”/负号/约分/推理链路" },
    { k: "异常预警", v: "2", s: "可点击钻取详情" },
  ];

  const segHtml = mock.classSegments.map((s) => `
    <div class="seg-item">
      <div class="seg-left">
        <div class="seg-name">${s.name}</div>
        <div class="seg-desc">${s.desc}</div>
      </div>
      <div class="seg-right">
        <div class="seg-num">${s.count}人</div>
        <div class="seg-bar"><i style="width:${Math.min(100, s.pct)}%"></i></div>
      </div>
    </div>
  `).join("");

  const anomalyHtml = mock.anomalies.map((a) => `
    <div class="anomaly" data-anomaly="${a.id}">
      <div class="an-title">${a.title}</div>
      <div class="an-sub">${a.sub}</div>
      <div class="an-meta">
        <span>${a.meta.school} · ${a.meta.class}</span>
        <span>影响：${a.meta.impact}</span>
      </div>
    </div>
  `).join("");

  root.innerHTML = `
    <div class="analytics">
      <div class="analytics-head">
        <div>
          <div class="ah-title">📊 教学分析看板（趋势 · 分层 · 异常）</div>
          <div class="ah-sub">数据源：作业/练习/课堂反馈（Mock） · 支撑：学段能力标准库</div>
        </div>
        <div style="display:flex; gap:10px">
          <button class="btn btn-ghost btn-sm" id="btn-refresh-analytics">刷新</button>
          <button class="btn btn-primary btn-sm" id="btn-action-plan">生成教学调整建议</button>
        </div>
      </div>

      <div class="kpi-row">
        ${kpis.map(k => `
          <div class="kpi">
            <div class="k">${k.k}</div>
            <div class="v">${k.v}</div>
            <div class="s">${k.s}</div>
          </div>
        `).join("")}
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">📈 班级趋势（近 7 天掌握度）</div>
          <div class="card-sub">综合掌握度 · 正确率 · 稳定性</div>
          <div class="chart-wrap" id="teacher-trend"></div>
        </div>

        <div class="card">
          <div class="card-title">👥 班级分层（A/B/C）</div>
          <div class="card-sub">用于作业分层、精准补救、拔高提升</div>
          <div class="segment-list">
            ${segHtml}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="card-title">🚨 异常预警（可钻取）</div>
        <div class="card-sub">点击进入：错因分布 · 影响学生 · 建议动作</div>
        <div class="anomaly-list">
          ${anomalyHtml}
        </div>
      </div>
    </div>
  `;

  $("#teacher-trend").innerHTML = svgTrend([68, 69, 67, 70, 71, 72, 73], { label: "班级趋势" });

  $("#btn-refresh-analytics").addEventListener("click", () => {
    addMsg("ai", "已刷新教学分析看板（Mock）。");
    renderTeacherAnalytics();
  });

  $("#btn-action-plan").addEventListener("click", () => {
    addMsg("ai", "教学调整建议：建议对 C 组进行“单位1识别”专项补救；对 B 组加推理链路训练；A 组加入 2 道拔高题。");
  });

  // bind anomaly click
  root.querySelectorAll("[data-anomaly]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-anomaly");
      openAnomalyDrawer(id);
    });
  });
}

// OCR scan
function runOCR() {
  if (state.scanning) return;
  state.scanning = true;

  $("#ocr-tip").style.display = "none";
  const laser = $("#ocr-interface .scan-laser");
  const spot = $("#ocr-interface .error-spot");
  laser.style.display = "block";
  laser.querySelector?.("::before");

  // make laser visible via pseudo: show wrapper
  laser.style.setProperty("opacity", "1");
  laser.style.pointerEvents = "none";
  laser.style.position = "absolute";
  laser.style.inset = "0";
  laser.style.display = "block";
  laser.style.background = "transparent";
  laser.style.zIndex = "6";

  // show animation
  laser.style.display = "block";
  laser.style.setProperty("display", "block");
  // use pseudo animation by enabling opacity on ::before
  laser.style.setProperty("--x", "1");

  // hack: toggle class by inserting style attribute for before
  laser.style.setProperty("filter", "none");
  laser.style.setProperty("mix-blend-mode", "screen");
  laser.style.setProperty("opacity", "1");
  laser.style.setProperty("pointer-events", "none");
  laser.style.setProperty("display", "block");
  laser.style.setProperty("visibility", "visible");

  // the real animation is in CSS on ::before; we just need it visible:
  laser.style.setProperty("contain", "paint");

  // also toggle pseudo by adding attribute (CSS already runs, but opacity 0->1 inside)
  laser.style.setProperty("display", "block");
  laser.style.setProperty("opacity", "1");
  laser.style.setProperty("will-change", "transform");

  setTimeout(() => {
    laser.style.display = "none";
    spot.style.display = "block";
    addMsg("ai", "OCR 诊断完成：共性错误集中在「单位“1”识别」与「除以分数=乘倒数」。建议对 C 组推送专项补救练习。");
    state.scanning = false;
  }, 1700);
}

// Drawer
function openAnomalyDrawer(id) {
  const item = mock.anomalies.find((x) => x.id === id);
  if (!item) return;

  $("#drawer-title").textContent = "异常钻取";
  $("#drawer-sub").textContent = `${item.meta.school} · ${item.meta.class} · 指标：${item.meta.metric}`;

  const chips = item.drill.topMistakes.map((m) => `<span class="chip">${m.k} · ${m.v}</span>`).join("");
  const students = item.drill.students.map((s) => `
    <div style="display:flex; justify-content:space-between; gap:12px; padding:10px; border:1px solid #e2e8f0; border-radius:14px; background:#f8fafc; margin-bottom:8px">
      <div>
        <div style="font-weight:950">${s.name} <span style="font-size:12px; color:#64748b; font-weight:900">风险：${s.risk}</span></div>
        <div style="font-size:12px; color:#64748b; margin-top:4px">${s.note}</div>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="push">推送练习</button>
    </div>
  `).join("");

  $("#drawer-body").innerHTML = `
    <div class="drawer-section">
      <div class="ds-title">问题概览</div>
      <div class="ds-text">${item.sub}</div>
    </div>

    <div class="drawer-section">
      <div class="ds-title">洞察（为什么发生）</div>
      <div class="ds-text">
        <ol style="margin:8px 0 0 18px; padding:0; color:#334155; font-size:13px; line-height:1.7">
          ${item.insights.map(i => `<li>${i}</li>`).join("")}
        </ol>
      </div>
    </div>

    <div class="drawer-section">
      <div class="ds-title">错因分布</div>
      <div class="ds-chip-row">${chips}</div>
    </div>

    <div class="drawer-section">
      <div class="ds-title">建议动作（可执行）</div>
      <div class="ds-text">
        <ol style="margin:8px 0 0 18px; padding:0; color:#334155; font-size:13px; line-height:1.7">
          ${item.recommended.map(r => `<li>${r}</li>`).join("")}
        </ol>
      </div>
      <div style="display:flex; gap:10px; margin-top:12px">
        <button class="btn btn-primary btn-sm" id="btn-gen-remedy">一键生成补救练习</button>
        <button class="btn btn-ghost btn-sm" id="btn-write-plan">生成教研要点</button>
      </div>
    </div>

    <div class="drawer-section">
      <div class="ds-title">影响学生（可推送）</div>
      ${students}
    </div>
  `;

  $("#drawer-backdrop").style.display = "block";
  $("#drawer").style.display = "flex";

  $("#btn-gen-remedy").addEventListener("click", () => {
    addMsg("ai", "已生成补救练习（Mock）：单位“1”识别专项 15 题（按 C 组推送）。");
  });

  $("#btn-write-plan").addEventListener("click", () => {
    addMsg("ai", "教研要点建议：错因分类讲解 + 分层作业梯度优化 + 课堂 6 分钟“倒数直观解释”环节。");
  });

  // push buttons
  $("#drawer-body").querySelectorAll('[data-action="push"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      addMsg("ai", "已向该学生推送同类巩固练习（Mock）。");
    });
  });
}

function closeDrawer() {
  $("#drawer-backdrop").style.display = "none";
  $("#drawer").style.display = "none";
}

// ---------- Student ----------
function renderStudentCharts() {
  $("#student-trend").innerHTML = svgTrend(mock.studentTrend, { label: "学生趋势", suffix: "%" });
}

function seedStudentFeed() {
  const box = $("#student-feed");
  if (!box || box.children.length) return;

  const items = [
    "我已识别你在「单位“1”」上容易混淆，建议先做 5 道基础题。",
    "几何推理建议：先写条件→结论，再补充推理链路。",
    "你的练习完成度不错，保持每天 15 分钟巩固即可。",
  ];
  items.forEach((t) => {
    const d = document.createElement("div");
    d.className = "feed-bubble";
    d.textContent = t;
    box.appendChild(d);
  });
}

function openGrowthModal() {
  $("#growth-backdrop").style.display = "block";
  $("#growth-modal").style.display = "flex";
  $("#archive-trend").innerHTML = svgTrend(mock.archiveTrend, { label: "成长档案趋势", suffix: "%" });
}
function closeGrowthModal() {
  $("#growth-backdrop").style.display = "none";
  $("#growth-modal").style.display = "none";
}

// student QA
function studentAsk() {
  const ip = $("#student-qa");
  const text = (ip.value || "").trim();
  if (!text) return;
  ip.value = "";

  const feed = $("#student-feed");
  const q = document.createElement("div");
  q.className = "feed-bubble";
  q.textContent = `你：${text}`;
  feed.prepend(q);

  const a = document.createElement("div");
  a.className = "feed-bubble";
  a.textContent = `学伴：我会先给分步思路，再补充相关知识点，并将错题归档（Mock）。`;
  feed.prepend(a);
}

// ---------- Gov ----------
function initGov() {
  // trend chart
  const govTrend = $("#gov-trend");
  if (govTrend) govTrend.innerHTML = svgTrend(mock.govTrendA, { label: "区域备课覆盖率", suffix: "%" });

  // init map once per enter
  const grid = $("#map-grid");
  grid.innerHTML = "";

  for (let i = 0; i < 60; i++) {
    const bar = document.createElement("div");
    const isWarn = Math.random() > 0.85;
    const h = Math.random() * 250 + 50;

    bar.className = "data-bar " + (isWarn ? "warning" : "");
    bar.style.left = Math.random() * 1100 + 50 + "px";
    bar.style.top = Math.random() * 1100 + 50 + "px";
    bar.style.transform = "translateZ(0px)";
    bar.style.height = "6px";

    grid.appendChild(bar);

    setTimeout(() => {
      bar.style.height = h + "px";
      bar.style.transform = `translateZ(${h}px)`;
    }, 100 + Math.random() * 800);
  }

  startGovFeed();
}

function teardownGov() {
  // stop feed
  if (state.feedTimer) {
    clearInterval(state.feedTimer);
    state.feedTimer = null;
  }
  // clear map to save perf
  const grid = $("#map-grid");
  if (grid) grid.innerHTML = "";
}

function startGovFeed() {
  const list = $("#feed-list");
  const schools = ["第一中学", "实验小学", "育才学校", "高新一小"];
  const acts = ["生成了数学教案", "发布了分层作业", "触发了作业量预警", "查看了学生档案"];

  if (state.feedTimer) clearInterval(state.feedTimer);
  state.feedTimer = setInterval(() => {
    const d = document.createElement("div");
    d.className = "feed-item";
    const s = schools[Math.floor(Math.random() * schools.length)];
    const a = acts[Math.floor(Math.random() * acts.length)];
    d.innerHTML = `<span style="color:#38bdf8">[${s}]</span> 李老师 ${a}`;
    list.prepend(d);
    if (list.children.length > 6) list.removeChild(list.lastChild);
  }, 1600);
}

// ---------- SPA wiring ----------
function bindNav() {
  $("#nav-menu").addEventListener("click", (e) => {
    const item = e.target.closest(".nav-item");
    if (!item) return;
    const view = item.getAttribute("data-view");
    if (!view) return;
    setActiveView(view);
  });
}

function bindTeacher() {
  $("#teacher-modes").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    setTeacherMode(btn.getAttribute("data-mode"));
  });

  $("#teacher-send").addEventListener("click", triggerTeacherMsg);
  $("#teacher-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") triggerTeacherMsg();
  });

  $("#ocr-click-area").addEventListener("click", () => {
    if (state.teacherMode !== "mark") return;
    runOCR();
  });

  $("#drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-backdrop").addEventListener("click", closeDrawer);

  $("#btn-export").addEventListener("click", () => {
    addMsg("ai", "导出（Mock）：已生成《本周教学分析报告》PDF。");
  });
}

function bindStudent() {
  $("#btn-growth").addEventListener("click", openGrowthModal);
  $("#growth-close").addEventListener("click", closeGrowthModal);
  $("#growth-backdrop").addEventListener("click", closeGrowthModal);

  $("#qa-go").addEventListener("click", studentAsk);
  $("#student-qa").addEventListener("keypress", (e) => {
    if (e.key === "Enter") studentAsk();
  });

  $("#btn-review").addEventListener("click", () => {
    const feed = $("#student-feed");
    const d = document.createElement("div");
    d.className = "feed-bubble";
    d.textContent = "周度复盘：代数计算错题较多，建议先基础→再综合；我已为你排好 3 组练习（Mock）。";
    feed.prepend(d);
  });

  $("#btn-practice").addEventListener("click", () => {
    const feed = $("#student-feed");
    const d = document.createElement("div");
    d.className = "feed-bubble";
    d.textContent = "已生成专项练习：单位“1”识别 10 题（Mock），完成后自动记录进成长档案。";
    feed.prepend(d);
  });
}

function boot() {
  setVersionBadge();
  bindNav();
  bindHomeActions();
  bindTeacher();
  bindStudent();

  // initial charts
  renderStudentCharts();

  // default view
  setActiveView("home");
}

document.addEventListener("DOMContentLoaded", boot);
