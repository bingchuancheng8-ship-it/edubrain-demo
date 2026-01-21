(() => {
  const VERSION = "v1.4.0-pc";

  // -----------------------------
  // Roles & role-nav configuration
  // -----------------------------
  const ROLE_DEFS = {
    teacher: {
      label: "教师",
      userName: "李老师",
      userDesc: "数学组 · 教师端",
      homeView: "teacher",
      nav: [
        { view: "teacher", icon: "🧑‍🏫", text: "教师工作台" }
      ]
    },
    student: {
      label: "学生",
      userName: "小明",
      userDesc: "学生端 · 学习中心",
      homeView: "student",
      nav: [
        { view: "student", icon: "🧑‍🎓", text: "学生学习中心" }
      ]
    },
    homeroom: {
      label: "班主任",
      userName: "张老师",
      userDesc: "班主任 · 班级管理",
      homeView: "homeroom",
      nav: [
        { view: "homeroom", icon: "🧑‍💼", text: "班主任工作台" }
      ]
    },
    admin: {
      label: "教育管理者",
      userName: "教育管理者",
      userDesc: "区县教育局 · 管理端",
      homeView: "admin",
      nav: [
        { view: "admin", icon: "🏛️", text: "治理驾驶舱" },
        { view: "kb", icon: "📚", text: "知识库管理" }
      ]
    },
    parent: {
      label: "家长",
      userName: "家长用户",
      userDesc: "家校协同 · 家长端",
      homeView: "parent",
      nav: [
        { view: "parent", icon: "👨‍👩‍👧", text: "家长家校协同" }
      ]
    }
  };

  const VIEW_TITLES = {
    portal: "AI智能门户",
    agents: "智能体中心",
    teacher: "教师工作台",
    student: "学生学习中心",
    homeroom: "班主任工作台",
    parent: "家长家校协同",
    admin: "治理驾驶舱",
    kb: "知识库管理"
  };

  // -----------------------------
  // DOM helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    role: localStorage.getItem("edubrain_role") || "",
    view: "portal",
    collapsed: localStorage.getItem("edubrain_sidebar") === "1"
  };

  // -----------------------------
  // Init
  // -----------------------------
  function boot() {
    // version pill
    const versionPill = $("#versionPill");
    if (versionPill) versionPill.textContent = VERSION;

    // sidebar collapse (PC)
    const sidebar = $("#sidebar");
    if (sidebar && state.collapsed) sidebar.classList.add("collapsed");

    $("#btnCollapse")?.addEventListener("click", () => {
      sidebar?.classList.toggle("collapsed");
      const collapsed = sidebar?.classList.contains("collapsed") ? "1" : "0";
      localStorage.setItem("edubrain_sidebar", collapsed);
    });

    // primary nav
    $$(".nav-item[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view");
        switchView(v);
      });
    });

    // portal CTAs
    $("#btnEnterWithRole")?.addEventListener("click", openRoleModal);
    $("#btnPickRole")?.addEventListener("click", openRoleModal);
    $("#btnSwitchRole")?.addEventListener("click", openRoleModal);
    $("#btnGoPortal")?.addEventListener("click", () => {
      closeRoleModal();
      switchView("portal");
    });
    $("#btnCloseRoleModal")?.addEventListener("click", closeRoleModal);
    $(".modal-mask")?.addEventListener("click", closeRoleModal);

    $("#btnClearRole")?.addEventListener("click", () => {
      setRole("");
      closeRoleModal();
      switchView("portal");
    });

    $("#btnOpenHomeroom")?.addEventListener("click", () => {
      // if role not selected, auto pick homeroom for demo
      if (!state.role) setRole("homeroom");
      switchView("homeroom");
    });

    // role cards
    $$(".role-card[data-role]").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.getAttribute("data-role");
        setRole(r);
        closeRoleModal();
        // jump to role home view
        const home = ROLE_DEFS[r]?.homeView || "portal";
        switchView(home);
      });
    });

    // agent center filters
    $$(".filters .chip").forEach(chip => {
      chip.addEventListener("click", () => {
        $$(".filters .chip").forEach(c => c.classList.remove("chip-on"));
        chip.classList.add("chip-on");
        const f = chip.getAttribute("data-filter");
        filterAgents(f);
      });
    });

    // agent center open buttons
    $$(".agent-actions [data-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-open");
        // auto role if not selected
        if (!state.role) {
          if (v === "teacher") setRole("teacher");
          else if (v === "student") setRole("student");
          else if (v === "homeroom") setRole("homeroom");
          else if (v === "admin" || v === "kb") setRole("admin");
          else if (v === "parent") setRole("parent");
        }
        switchView(v === "kb" ? "kb" : v);
      });
    });

    // teacher tab behavior (simple demo)
    $$(".teacher-toolbar .tab").forEach(tab => {
      tab.addEventListener("click", () => {
        $$(".teacher-toolbar .tab").forEach(t => t.classList.remove("tab-on"));
        tab.classList.add("tab-on");
        const key = tab.getAttribute("data-tab");
        renderTeacherTasks(key);
      });
    });

    // dashboard seg buttons
    $$(".seg-btn[data-range]").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".seg-btn").forEach(b => b.classList.remove("seg-on"));
        btn.classList.add("seg-on");
        const r = btn.getAttribute("data-range");
        renderDashboard(r);
      });
    });

    // first render
    renderRoleUI();
    // default view
    switchView("portal");

    // "进入即身份选择"：首次进入自动弹窗，但允许关闭浏览门户/智能体中心
    if (!state.role) {
      openRoleModal();
    } else {
      // if already has role, jump to its home for demo体验
      const home = ROLE_DEFS[state.role]?.homeView;
      if (home) switchView(home);
    }
  }

  // -----------------------------
  // Role logic
  // -----------------------------
  function setRole(roleKey) {
    state.role = roleKey || "";
    if (state.role) localStorage.setItem("edubrain_role", state.role);
    else localStorage.removeItem("edubrain_role");
    renderRoleUI();
  }

  function renderRoleUI() {
    const rolePill = $("#rolePill");
    const roleNavWrap = $("#roleNavWrap");
    const roleNav = $("#roleNav");
    const userName = $("#userName");
    const userDesc = $("#userDesc");

    if (!state.role) {
      rolePill.textContent = "未选择";
      rolePill.className = "pill pill-muted";
      roleNavWrap.classList.add("hidden");
      roleNav.innerHTML = "";
      userName.textContent = "访问者";
      userDesc.textContent = "请选择身份进入演示";
      // 未选角色：隐藏工作区二级菜单，仅保留门户+智能体中心（HTML 已固定如此）
      return;
    }

    const def = ROLE_DEFS[state.role];
    rolePill.textContent = def?.label || "已选择";
    rolePill.className = "pill pill-primary";

    userName.textContent = def?.userName || "用户";
    userDesc.textContent = def?.userDesc || "";

    // secondary nav
    roleNavWrap.classList.remove("hidden");
    roleNav.innerHTML = "";
    (def?.nav || []).forEach(item => {
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.setAttribute("data-view", item.view);
      btn.innerHTML = `<span class="nav-ico">${item.icon}</span><span class="nav-text">${item.text}</span>`;
      btn.addEventListener("click", () => switchView(item.view));
      roleNav.appendChild(btn);
    });
  }

  // -----------------------------
  // Modal
  // -----------------------------
  function openRoleModal() {
    $("#roleModal")?.classList.remove("hidden");
  }
  function closeRoleModal() {
    $("#roleModal")?.classList.add("hidden");
  }

  // -----------------------------
  // View switching
  // -----------------------------
  function switchView(viewKey) {
    const key = viewKey || "portal";

    // views requiring role gating (除 portal / agents 外)
    const needsRole = !["portal", "agents"].includes(key);
    if (needsRole && !state.role) {
      openRoleModal();
      // still allow switching to portal
      state.view = "portal";
      activateView("portal");
      return;
    }

    // if role chosen but role doesn't allow the view (basic guard)
    if (needsRole && state.role) {
      const allowed = (ROLE_DEFS[state.role]?.nav || []).some(n => n.view === key);
      // admin allow kb/admin; parent allow parent; etc.
      // teacher/student/homeroom allow their own views.
      if (!allowed) {
        // fall back to role home
        const home = ROLE_DEFS[state.role]?.homeView || "portal";
        state.view = home;
        activateView(home);
        return;
      }
    }

    state.view = key;
    activateView(key);
  }

  function activateView(key) {
    // toggle view containers
    $$(".view").forEach(v => v.classList.remove("active"));
    const el = document.getElementById(`view-${key}`);
    if (el) el.classList.add("active");
    else {
      // fallback
      document.getElementById("view-portal")?.classList.add("active");
      state.view = "portal";
    }

    // active nav highlight (primary + role nav)
    $$(".nav-item[data-view]").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-view") === state.view);
    });

    // crumbs
    $("#crumbSub").textContent = VIEW_TITLES[state.view] || "—";

    // view-specific init
    if (state.view === "teacher") renderTeacherTasks("prep");
    if (state.view === "admin") {
      renderDashboard(getSelectedRange());
      renderFeed();
    }
  }

  // -----------------------------
  // Agents filter
  // -----------------------------
  function filterAgents(filterKey) {
    const cards = $$(".agent-card");
    if (filterKey === "all") {
      cards.forEach(c => (c.style.display = ""));
      return;
    }
    cards.forEach(c => {
      const tags = c.getAttribute("data-tags") || "";
      c.style.display = tags.includes(filterKey) ? "" : "none";
    });
  }

  // -----------------------------
  // Teacher tasks demo
  // -----------------------------
  const TEACHER_TASKS = {
    prep: [
      { title: "生成教学设计：函数单调性（高中）", sub: "按课标对齐 + 重点难点 + 活动设计" },
      { title: "课标要点检查：本节课是否覆盖核心素养", sub: "自动标注缺漏与建议补充" },
      { title: "分层作业：A/B/C 三档题（含解析）", sub: "按班级学情自动给建议比例" }
    ],
    mark: [
      { title: "作文批改：结构与语言建议", sub: "生成可复制评语 + 修改建议" },
      { title: "数学解题过程批改（步骤诊断）", sub: "识别关键步骤遗漏与错因" }
    ],
    analysis: [
      { title: "学情联动：知识点掌握雷达图", sub: "薄弱点 → 推荐题/微课" },
      { title: "异常清单：作业未交/错题高频", sub: "一键发起补救任务" }
    ],
    research: [
      { title: "跨校教研课题：分层作业策略优化", sub: "课题管理 + 成果共享（演示）" },
      { title: "发起教研会议：共备《函数单调性》", sub: "议程模板 + 资料汇总（演示）" },
      { title: "授课视频复盘：课堂节奏与互动点", sub: "视频分析要点（演示）" }
    ],
    growth: [
      { title: "职称晋升材料：业绩成果智能梳理", sub: "证据链聚合 + 缺失提醒（演示）" },
      { title: "名师工作联动：经验沉淀与资源共享", sub: "可复用案例库（演示）" }
    ]
  };

  function renderTeacherTasks(tabKey) {
    // ensure tab state
    $$(".teacher-toolbar .tab").forEach(t => {
      t.classList.toggle("tab-on", t.getAttribute("data-tab") === tabKey);
    });

    const list = $("#teacherTaskList");
    const items = TEACHER_TASKS[tabKey] || [];
    list.innerHTML = "";
    items.forEach((it) => {
      const btn = document.createElement("button");
      btn.className = "list-item";
      btn.innerHTML = `<div style="font-weight:950">${it.title}</div><div style="color:#6b7280;font-size:12px;font-weight:800;margin-top:4px">${it.sub}</div>`;
      btn.addEventListener("click", () => {
        $("#teacherDetailTitle").textContent = it.title;
        $("#teacherDetailSub").textContent = it.sub;
        $("#teacherDetailBody").innerHTML = `
          <div class="note">
            演示：此处可接入 “模板驱动 + 自然语言补充” 的生成式工作流，并把结果沉淀到知识库/教研资产库。
          </div>
          <div class="card" style="box-shadow:none;margin-top:12px">
            <div class="card-hd"><div class="card-title">生成结果（示例）</div><div class="card-sub">可复制/导出/分享</div></div>
            <div class="card-bd">
              <div style="font-weight:900;margin-bottom:6px">要点</div>
              <ul style="margin:0;padding-left:18px;color:#374151">
                <li>目标：对齐课标，明确“导数符号表 → 单调区间”推理链</li>
                <li>活动：例题引导 + 变式训练 + 分层作业</li>
                <li>评价：当堂小测 + 错因归类 + 课后巩固包</li>
              </ul>
            </div>
          </div>`;
      });
      list.appendChild(btn);
    });

    // reset detail
    $("#teacherDetailTitle").textContent = "详情";
    $("#teacherDetailSub").textContent = "选择左侧任务查看";
    $("#teacherDetailBody").innerHTML = `<div class="empty">请选择任务进行演示。</div>`;
  }

  // -----------------------------
  // Dashboard (clear interactive)
  // -----------------------------
  function getSelectedRange() {
    const on = $(".seg-btn.seg-on");
    return on?.getAttribute("data-range") || "7d";
  }

  const DASH_DATA = {
    "7d": {
      schools: 128, schoolsDelta: "+7.1%",
      eff: "23%", effSub: "18 分钟/节",
      risk: 14,
      series: [12, 18, 16, 22, 26, 24, 30]
    },
    "30d": {
      schools: 362, schoolsDelta: "+12.4%",
      eff: "19%", effSub: "15 分钟/节",
      risk: 37,
      series: [10, 12, 14, 16, 15, 18, 20, 22, 21, 24, 26, 25]
    },
    "term": {
      schools: 528, schoolsDelta: "+21.0%",
      eff: "27%", effSub: "21 分钟/节",
      risk: 52,
      series: [8, 9, 12, 14, 15, 17, 18, 22, 24, 26, 28, 30, 32, 31, 34]
    }
  };

  function renderDashboard(rangeKey) {
    const d = DASH_DATA[rangeKey] || DASH_DATA["7d"];
    animateNumber($("#kpiSchools"), d.schools);
    $("#kpiSchoolsDelta").textContent = d.schoolsDelta;
    $("#kpiEff").textContent = d.eff;
    $("#kpiEffSub").textContent = d.effSub;
    animateNumber($("#kpiRisk"), d.risk);

    // build SVG path
    const svg = $("#trendSvg");
    const path = $("#trendPath");
    const dot = $("#trendDot");
    if (!svg || !path || !dot) return;

    const w = 700, h = 240;
    const padding = { x: 30, y: 20 };
    const series = d.series;
    const max = Math.max(...series) * 1.1;
    const min = 0;

    const stepX = (w - padding.x * 2) / (series.length - 1);
    const toX = (i) => padding.x + i * stepX;
    const toY = (v) => {
      const t = (v - min) / (max - min);
      return (h - padding.y) - t * (h - padding.y * 2);
    };

    let dPath = "";
    series.forEach((v, i) => {
      const x = toX(i);
      const y = toY(v);
      dPath += (i === 0 ? `M${x} ${y}` : ` L${x} ${y}`);
    });

    path.setAttribute("d", dPath);

    // dot at last
    const lx = toX(series.length - 1);
    const ly = toY(series[series.length - 1]);
    dot.setAttribute("cx", lx);
    dot.setAttribute("cy", ly);

    // animate line draw
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect(); // reflow
    path.style.transition = "stroke-dashoffset 650ms ease";
    path.style.strokeDashoffset = "0";
  }

  function animateNumber(el, to) {
    if (!el) return;
    const from = parseInt(el.textContent.replace(/\D/g, ""), 10);
    const start = Number.isFinite(from) ? from : 0;
    const end = to;
    const dur = 380;
    const t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(start + (end - start) * (p * (2 - p))); // easeOut
      el.textContent = String(v);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderFeed() {
    const feed = $("#activityFeed");
    if (!feed) return;
    const rows = [
      "【育才学校】李老师 生成了数学教学设计（函数单调性）",
      "【育才学校】张老师 发布了分层作业（A/B/C）",
      "【育才学校】班主任 发送家长会提醒（模板）",
      "【实验中学】学生学伴 完成错题举一反三（8 题）",
      "【区级平台】风险预警：缺勤异常（需关注）"
    ];
    feed.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "list-item";
      div.textContent = r;
      feed.appendChild(div);
    });
  }

  // -----------------------------
  // Start
  // -----------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
