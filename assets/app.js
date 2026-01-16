/* ======================================================
   AI EduBrain Demo - app.js (Global Click Fix Version)
   目标：所有 onclick 都能正常触发（挂载到 window）
====================================================== */

(() => {
  "use strict";

  const APP_VERSION = "v0.9.0-demo";

  // ---------- Utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeText(el, text) {
    if (!el) return;
    el.innerText = text;
  }

  // ---------- View Switch ----------
  function switchView(id, navEl) {
    // 1) nav active
    $$(".nav-item").forEach((el) => el.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    // 2) view active
    $$(".view-container").forEach((el) => el.classList.remove("active"));
    const current = $("#view-" + id);
    if (current) current.classList.add("active");

    // 3) header / title
    const topHeader = $("#top-header");
    const pageTitle = $("#page-title");

    const titles = {
      home: "首页入口",
      teacher: "教师工作台",
      student: "学习伴侣",
      gov: "治理驾驶舱",
    };
    safeText(pageTitle, titles[id] || id);

    // 4) gov mode (hide header)
    if (id === "gov") {
      if (topHeader) topHeader.style.display = "none";
      requestAnimationFrame(initMap);
    } else {
      if (topHeader) topHeader.style.display = "flex";
      // 清空地图，节省资源
      const grid = $("#map-grid");
      if (grid) grid.innerHTML = "";
      stopFeed();
    }
  }

  // ---------- Home shortcuts ----------
  function startScenario(type) {
    // 跳转到教师工作台
    const navTeacher = $$(".nav-item")[1];
    switchView("teacher", navTeacher);

    if (type === "prep") {
      setTeacherMode("prep");
      // 自动输入一句示例
      setTimeout(() => {
        const input = $("#teacher-input");
        if (input) {
          input.value = "帮我生成一节《分数应用题》的教学设计";
          triggerMsg();
        }
      }, 380);
    }

    if (type === "mark") {
      setTeacherMode("mark");
    }
  }

  // ---------- Teacher mode ----------
  function setTeacherMode(mode) {
    const btnPrep = $("#btn-prep");
    const btnMark = $("#btn-mark");

    const prepPlaceholder = $("#prep-placeholder");
    const lessonResult = $("#lesson-result");
    const ocr = $("#ocr-interface");

    // 切按钮样式
    if (mode === "prep") {
      if (btnPrep) btnPrep.className = "btn btn-primary";
      if (btnMark) btnMark.className = "btn btn-ghost";

      if (prepPlaceholder) prepPlaceholder.style.display = "flex";
      if (lessonResult) lessonResult.style.display = "none";
      if (ocr) ocr.style.display = "none";
    } else {
      if (btnPrep) btnPrep.className = "btn btn-ghost";
      if (btnMark) btnMark.className = "btn btn-primary";

      if (prepPlaceholder) prepPlaceholder.style.display = "none";
      if (lessonResult) lessonResult.style.display = "none";
      if (ocr) ocr.style.display = "block";

      // 重置 OCR 状态
      if (ocr) {
        const tip = $("#ocr-tip", ocr);
        const laser = $(".scan-laser", ocr);
        const spot = $(".error-spot", ocr);
        if (tip) tip.style.display = "block";
        if (laser) laser.style.display = "none";
        if (spot) spot.style.display = "none";
      }
    }
  }

  function addMsg(role, text) {
    const box = $("#chat-box");
    if (!box) return;

    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="msg-bubble">${text}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function triggerMsg() {
    const input = $("#teacher-input");
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    addMsg("user", text);
    input.value = "";

    // AI 回复（模拟）
    setTimeout(() => {
      addMsg("ai", "收到，我正在生成教学设计与课堂环节建议…");

      setTimeout(() => {
        const prepPlaceholder = $("#prep-placeholder");
        const lessonResult = $("#lesson-result");

        if (prepPlaceholder) prepPlaceholder.style.display = "none";
        if (lessonResult) {
          lessonResult.style.display = "block";
          renderLessonCard();
        }

        addMsg("ai", "已生成：含导入、探究、练习分层与课后作业建议。");
      }, 800);
    }, 450);
  }

  function renderLessonCard() {
    const target = $("#lesson-result");
    if (!target) return;

    target.innerHTML = `
      <div style="
        background: rgba(255,255,255,0.92);
        border:1px solid #eef2ff;
        border-radius:22px;
        padding:22px;
        box-shadow: 0 10px 30px rgba(15,23,42,0.06);
      ">
        <h2 style="
          margin:0 0 14px 0;
          font-size:20px;
          font-weight:900;
          background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        ">📘 教学设计：分数应用题</h2>

        <div style="color:#64748b; font-size:13px; margin-bottom:14px;">
          教学目标：理解数量关系、建立线段图模型、掌握“单位 1”的迁移推理
        </div>

        <div style="position:relative; padding-left:18px;">
          <div style="
            position:absolute; left:6px; top:6px; bottom:-6px;
            width:2px; background:#e2e8f0;
          "></div>

          ${timelineItem("00:00 课堂导入", "生活中的“切蛋糕/折扣”问题引入")}
          ${timelineItem("05:00 核心探究", "画线段图 → 明确单位1 → 列式求解")}
          ${timelineItem("18:00 分层练习", "A 基础巩固 / B 变式迁移 / C 综合挑战")}
          ${timelineItem("35:00 课堂小测", "2 题诊断：单位1识别 + 逆向推理")}
          ${timelineItem("42:00 总结作业", "错因归纳 + 3 题巩固 + 1 题拓展")}
        </div>

        <button class="btn btn-primary" style="width:100%; justify-content:center; margin-top:16px;"
          onclick="alert('Demo：导出功能可接入 PPT/Word 生成服务')">
          ✨ 导出 PPT
        </button>
      </div>
    `;
  }

  function timelineItem(title, sub) {
    return `
      <div style="position:relative; padding-left:22px; margin-bottom:14px;">
        <div style="
          position:absolute; left:0; top:3px;
          width:12px; height:12px; border-radius:50%;
          background:#fff; border:3px solid #4f46e5;
        "></div>
        <div style="font-weight:900; color:#111827; font-size:13px;">${title}</div>
        <div style="font-size:12px; color:#64748b; margin-top:4px;">${sub}</div>
      </div>
    `;
  }

  // ---------- OCR ----------
  let isScanning = false;
  function runOCR(el) {
    if (isScanning) return;
    isScanning = true;

    const tip = $("#ocr-tip", el);
    const laser = $(".scan-laser", el);
    const spot = $(".error-spot", el);

    if (tip) tip.style.display = "none";
    if (laser) laser.style.display = "block";

    setTimeout(() => {
      if (laser) laser.style.display = "none";
      if (spot) spot.style.display = "block";

      addMsg("ai", "检测到共性错误：38% 学生在第 2 题（单位 1 识别）出错。");
      addMsg("ai", "建议：下节课用 3 分钟做“单位 1 快速判断”微训练。");
      isScanning = false;
    }, 1900);
  }

  // ---------- Student modal ----------
  function openVoiceModal() {
    const modal = $("#voice-modal");
    if (modal) modal.style.display = "flex";
  }

  function closeVoiceModal() {
    const modal = $("#voice-modal");
    if (modal) modal.style.display = "none";
    alert("🎉 评分：98分！（Demo）");
  }

  // ---------- Gov Map ----------
  let feedTimer = null;

  function initMap() {
    const grid = $("#map-grid");
    if (!grid) return;

    grid.innerHTML = "";

    // 生成柱状数据
    for (let i = 0; i < 60; i++) {
      const bar = document.createElement("div");
      const isWarn = Math.random() > 0.86;
      const h = Math.floor(Math.random() * 260 + 40);

      bar.className = "data-bar" + (isWarn ? " warning" : "");
      bar.style.left = Math.floor(Math.random() * 1080 + 50) + "px";
      bar.style.top = Math.floor(Math.random() * 1080 + 50) + "px";
      bar.style.transform = "translateZ(0px)";
      bar.title = isWarn ? "预警：作业量偏高" : "正常";

      // 点击钻取（Demo）
      bar.onclick = () => {
        alert(isWarn ? "钻取：该校作业量预警（Demo）" : "钻取：该校掌握度趋势（Demo）");
      };

      grid.appendChild(bar);

      setTimeout(() => {
        bar.style.height = h + "px";
        bar.style.transform = `translateZ(${h}px)`;
      }, 80 + Math.random() * 700);
    }

    startFeed();
  }

  function startFeed() {
    const list = $("#feed-list");
    if (!list) return;

    const schools = ["第一中学", "实验小学", "育才学校", "高新一小"];
    const acts = ["生成了数学教案", "发布了分层作业", "触发了作业量预警", "查看了学生档案"];

    stopFeed();
    feedTimer = setInterval(() => {
      const d = document.createElement("div");
      d.className = "feed-item";

      const s = schools[Math.floor(Math.random() * schools.length)];
      const a = acts[Math.floor(Math.random() * acts.length)];

      d.innerHTML = `<span style="color:#38bdf8">[${s}]</span> 李老师 ${a}`;
      list.prepend(d);

      // 最多保留 5 条
      if (list.children.length > 5) {
        list.removeChild(list.lastChild);
      }
    }, 1600);
  }

  function stopFeed() {
    if (feedTimer) clearInterval(feedTimer);
    feedTimer = null;
  }

  // ---------- Boot ----------
  function boot() {
    // set version badge if empty
    const v = $("#app-version");
    if (v && (!v.innerText || !v.innerText.trim())) {
      v.innerText = APP_VERSION;
    }

    // 默认模式：备课
    setTeacherMode("prep");

    // 防止首次加载没有 active 的情况
    if (!$("#view-home")?.classList.contains("active")) {
      const navHome = $$(".nav-item")[0];
      switchView("home", navHome);
    }
  }

  // ✅ 关键：挂载到 window（保证 inline onclick 可用）
  window.switchView = switchView;
  window.startScenario = startScenario;
  window.setTeacherMode = setTeacherMode;
  window.triggerMsg = triggerMsg;
  window.runOCR = runOCR;
  window.openVoiceModal = openVoiceModal;
  window.closeVoiceModal = closeVoiceModal;
  window.initMap = initMap;

  // 等待 DOM
  document.addEventListener("DOMContentLoaded", boot);
})();
