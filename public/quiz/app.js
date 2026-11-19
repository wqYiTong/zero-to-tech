/* 赛博人格鉴定所 —— 界面与交互
 * 纯原生 JS，零依赖。所有屏幕都是字符串模板渲染进 #app。
 * 结构：boot 初始化 → render 按 state.screen 渲染 → 事件委托处理点击 → 键盘快捷键。
 */
(function () {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const core = window.QuizCore;
  const app = document.getElementById("app");
  const TOTAL = DATA.questions.length;
  const STORE_KEY = "cyber-persona-quiz-v1";
  const LETTERS = ["A", "B", "C", "D"];
  const CHECKPOINT_STEP = 25;

  // 100 题太长，每道题的引导语换着说，免得看腻
  const KICKERS = [
    "凭第一反应，选更像你的那个",
    "别演，树都看着呢",
    "森林不会评判你",
    "慢慢来，不着急",
    "选一个，然后深呼吸",
    "这一题没有陷阱，下一题也没有",
    "跟着感觉走，迷路也没关系",
    "本所已记录（吓你的）"
  ];

  // 100 题太长，每 25 题给个中场休息，顺便说点废话
  const CHECKPOINTS = {
    25: {
      title: "第一段山路，走完了",
      copy: "你已经暴露了四分之一的自己。坐下来喝口水，听听溪水声，再继续。"
    },
    50: {
      title: "半山腰，风很舒服",
      copy: "50 题了。别急着赶路，答案又不会跑。"
    },
    75: {
      title: "快到山顶了",
      copy: "还剩 25 题。来都来了，就把这片风景看完吧。"
    }
  };

  const state = {
    screen: "intro", // intro | quiz | checkpoint | result
    index: 0,
    answers: new Array(TOTAL).fill(null),
    startedAt: 0,
    finishedAt: 0,
    result: null,
    viewCode: null, // 当前展示的人格
    browsing: false, // 是否在翻图鉴（不是自己的结果）
    modal: false,
    checkpoint: 0,
    locked: false
  };

  const saved = readSaved();

  /* ---------- 小工具 ---------- */

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readSaved() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.answers) || parsed.answers.length !== TOTAL) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({
        answers: state.answers,
        index: state.index,
        startedAt: state.startedAt,
        finishedAt: state.finishedAt,
        resultCode: state.result ? state.result.code : null,
        savedAt: Date.now()
      }));
    } catch (error) {
      /* 隐私模式下写不进去就算了，不影响答题 */
    }
  }

  function clearProgress() {
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function answeredCount() {
    return state.answers.filter(Boolean).length;
  }

  function firstUnanswered(answers) {
    const index = answers.findIndex(function (answer) { return !answer; });
    return index === -1 ? 0 : index;
  }

  function currentQuestion() {
    return DATA.questions[state.index];
  }

  function typeOf(code) {
    return DATA.types[code] || null;
  }

  /* 森林小伙伴：一只负责陪答、不负责给建议的水豚 */
  function mascotSvg(extraClass, options) {
    const cup = options && options.cup
      ? '<g class="mascot-cup">' +
          '<path d="M64 106h32v18a14 14 0 0 1-14 14h-4a14 14 0 0 1-14-14Z" fill="#fff9ee" stroke="#d8b78e" stroke-width="2.4"/>' +
          '<path d="M96 112h5a7 7 0 0 1 0 14h-5" fill="none" stroke="#d8b78e" stroke-width="2.4"/>' +
          '<path class="steam steam--1" d="M72 100c-3-4 3-7 0-11" stroke="#c3d6bd" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
          '<path class="steam steam--2" d="M84 100c-3-4 3-7 0-11" stroke="#c3d6bd" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        "</g>"
      : "";

    return (
      '<svg class="mascot-svg ' + (extraClass || "") + '" viewBox="0 0 160 150" aria-hidden="true" focusable="false">' +
        '<ellipse cx="80" cy="141" rx="43" ry="7" fill="#35664d" fill-opacity=".12"/>' +
        '<path d="M37 137C37 105 55 90 80 90s43 15 43 47Z" fill="#c9a37b"/>' +
        '<ellipse cx="80" cy="122" rx="25" ry="17" fill="#e2c4a0" opacity=".85"/>' +
        '<ellipse cx="44" cy="33" rx="12" ry="10" fill="#b98d66"/>' +
        '<ellipse cx="116" cy="33" rx="12" ry="10" fill="#b98d66"/>' +
        '<ellipse cx="44" cy="33" rx="6" ry="5" fill="#d8b08a"/>' +
        '<ellipse cx="116" cy="33" rx="6" ry="5" fill="#d8b08a"/>' +
        '<ellipse cx="80" cy="68" rx="46" ry="40" fill="#d3ad86"/>' +
        '<ellipse cx="80" cy="85" rx="30" ry="20" fill="#e8cbaa"/>' +
        '<path d="M53 64q7-7 14 0" stroke="#4a382c" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
        '<path d="M93 64q7-7 14 0" stroke="#4a382c" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="80" cy="78" rx="8.5" ry="5.6" fill="#5c4636"/>' +
        '<path d="M72 89q8 6 16 0" stroke="#5c4636" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="49" cy="81" rx="8" ry="5" fill="#e08a5b" opacity=".38"/>' +
        '<ellipse cx="111" cy="81" rx="8" ry="5" fill="#e08a5b" opacity=".38"/>' +
        '<path d="M85 30C98 11 122 10 126 22c4 12-20 21-38 14Z" fill="#7faf7f"/>' +
        '<path d="M88 32c8-8 20-12 30-11" stroke="#4f8163" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
        '<ellipse cx="47" cy="112" rx="9" ry="14" fill="#c9a37b" transform="rotate(14 47 112)"/>' +
        '<ellipse cx="113" cy="112" rx="9" ry="14" fill="#c9a37b" transform="rotate(-14 113 112)"/>' +
        cup +
      "</svg>"
    );
  }

  /* 一小枝叶子，用来点在卡片角落 */
  function sprigSvg(className) {
    return (
      '<svg class="' + (className || "sprig") + '" viewBox="0 0 120 100" aria-hidden="true" focusable="false">' +
        '<path d="M8 88C36 70 62 46 100 12" stroke="#a9cba0" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M36 66C22 64 12 54 10 42c14 0 24 10 26 24Z" fill="#b7d6ad"/>' +
        '<path d="M58 46C50 32 54 18 64 10c8 10 6 24-6 36Z" fill="#c6e0bc"/>' +
        '<path d="M72 32C88 30 100 20 104 8c-14 0-26 10-32 24Z" fill="#a9cba0"/>' +
      "</svg>"
    );
  }

  /* 首页顶部那条小风景：远山、松树、小河，还有一只坐着的水豚 */
  function forestStripHtml() {
    return (
      '<div class="hero-forest" aria-hidden="true">' +
        '<svg class="hero-forest-svg" viewBox="0 0 900 220" preserveAspectRatio="xMidYMax slice" focusable="false">' +
          '<defs>' +
            '<linearGradient id="stripSky" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0" stop-color="#eaf3ee"/>' +
              '<stop offset="1" stop-color="#fbf6e4"/>' +
            "</linearGradient>" +
            '<linearGradient id="stripRiver" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0" stop-color="#c6e7ea"/>' +
              '<stop offset="1" stop-color="#9bd0da"/>' +
            "</linearGradient>" +
          "</defs>" +
          '<rect width="900" height="220" fill="url(#stripSky)"/>' +
          '<circle cx="700" cy="54" r="54" fill="#ffdca2" opacity=".26"/>' +
          '<circle cx="700" cy="54" r="32" fill="#ffd89b" opacity=".95"/>' +
          '<g fill="#ffffff" opacity=".9">' +
            '<ellipse cx="150" cy="46" rx="46" ry="16"/>' +
            '<ellipse cx="186" cy="38" rx="30" ry="14"/>' +
            '<ellipse cx="470" cy="34" rx="36" ry="13"/>' +
            '<ellipse cx="498" cy="27" rx="23" ry="11"/>' +
          "</g>" +
          '<g stroke="#7fa986" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".65">' +
            '<path d="M566 74q7-7 14 0"/>' +
            '<path d="M588 62q6-6 12 0"/>' +
          "</g>" +
          '<path d="M0 122 C 80 94 140 90 210 116 C 280 142 320 98 400 102 C 480 106 500 142 580 138 C 660 134 700 102 780 110 C 840 116 870 120 900 126 L900 220 L0 220 Z" fill="#dcead0"/>' +
          '<path d="M0 152 C 90 134 160 148 240 152 C 330 157 370 128 460 132 C 550 136 580 156 670 152 C 760 148 810 134 900 144 L900 220 L0 220 Z" fill="#c7dfb9"/>' +
          '<path d="M0 192 C 120 178 220 188 320 194 C 440 200 500 176 620 182 C 740 188 820 196 900 188 L900 220 L0 220 Z" fill="#a6c998"/>' +
          '<path d="M502 106 C 528 122 470 132 500 150 C 530 168 462 180 492 220 L 548 220 C 518 180 586 168 556 150 C 526 132 592 122 566 106 Z" fill="url(#stripRiver)"/>' +
          '<path d="M524 128 C 542 142 500 150 518 168 C 534 184 504 198 516 214" stroke="#ffffff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<g fill="#eef7ef" opacity=".9">' +
            '<ellipse cx="520" cy="176" rx="8" ry="3.4"/>' +
            '<ellipse cx="536" cy="198" rx="7" ry="3"/>' +
          "</g>" +
          '<g stroke="#7ea471" stroke-width="2" stroke-linecap="round" opacity=".55">' +
            '<path d="M330 206q3-8 3-12"/><path d="M336 206q-2-7 1-11"/>' +
            '<path d="M690 204q3-8 3-12"/><path d="M696 204q-2-7 1-11"/>' +
          "</g>" +
          '<g>' +
            '<g transform="translate(84,192) scale(.62)">' +
              '<rect x="-3" y="0" width="6" height="28" rx="3" fill="#7f9e70"/>' +
              '<path d="M0 -56 L21 -6 L-21 -6 Z" fill="#6e9a78"/>' +
              '<path d="M0 -38 L17 8 L-17 8 Z" fill="#82ad88"/>' +
            "</g>" +
            '<g transform="translate(130,198) scale(.46)">' +
              '<rect x="-3" y="0" width="6" height="28" rx="3" fill="#7f9e70"/>' +
              '<path d="M0 -56 L21 -6 L-21 -6 Z" fill="#6e9a78"/>' +
              '<path d="M0 -38 L17 8 L-17 8 Z" fill="#82ad88"/>' +
            "</g>" +
            '<g transform="translate(812,194) scale(.56)">' +
              '<rect x="-3" y="0" width="6" height="28" rx="3" fill="#7f9e70"/>' +
              '<path d="M0 -56 L21 -6 L-21 -6 Z" fill="#6e9a78"/>' +
              '<path d="M0 -38 L17 8 L-17 8 Z" fill="#82ad88"/>' +
            "</g>" +
          "</g>" +
          '<g fill="#f2c5a5">' +
            '<circle cx="250" cy="204" r="2.8"/>' +
            '<circle cx="268" cy="208" r="2.2"/>' +
            '<circle cx="742" cy="206" r="2.6"/>' +
            '<circle cx="300" cy="210" r="2"/>' +
          "</g>" +
          '<g transform="translate(752,198)">' +
            '<rect x="6" y="0" width="5" height="10" rx="2.5" fill="#f3e8d2"/>' +
            '<path d="M0 2C0 -6 8 -10 14 -6 18 -3 16 2 10 2Z" fill="#e7a087"/>' +
          "</g>" +
        "</svg>" +
        '<div class="hero-capy">' + mascotSvg("mascot--hero") + "</div>" +
      "</div>"
    );
  }


  function shareUrl() {
    if (window.location.protocol.indexOf("http") === 0) {
      return window.location.origin + window.location.pathname.replace(/index\.html$/, "");
    }
    return DATA.meta.shareUrl;
  }

  /* ---------- 渲染 ---------- */

  function render(options) {
    const html = state.screen === "quiz" ? quizHtml()
      : state.screen === "checkpoint" ? checkpointHtml()
      : state.screen === "result" ? resultHtml()
      : introHtml();

    app.innerHTML = html + (state.modal ? modalHtml() : "");
    document.body.dataset.screen = state.screen;
    document.body.classList.toggle("is-locked", state.modal);
    updateTitle();

    if (!options || options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    const focusTarget = app.querySelector("[data-autofocus]");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function updateTitle() {
    if (state.screen === "quiz") {
      document.title = "第 " + (state.index + 1) + " 题 · " + DATA.meta.title;
      return;
    }
    if (state.screen === "checkpoint") {
      document.title = "中场休息 " + state.checkpoint + "/" + TOTAL + " · " + DATA.meta.title;
      return;
    }
    if (state.screen === "result" && state.viewCode) {
      const t = typeOf(state.viewCode);
      if (t) {
        document.title = t.code + " " + t.name + " · " + DATA.meta.title;
        return;
      }
    }
    document.title = DATA.meta.title + " · " + DATA.meta.subtitle;
  }

  function footerHtml() {
    return (
      '<footer class="site-footer">' +
        '<p class="footer-note">本所开在森林里 · 全年无休 · 水豚偶尔请假</p>' +
        '<p>' + esc(DATA.meta.disclaimer) + '</p>' +
        '<p class="footer-links">' +
          '<a href="' + esc(DATA.meta.homeUrl) + '">' + esc(DATA.meta.siteName) + '</a>' +
          '<span aria-hidden="true">·</span>' +
          '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">' + esc(DATA.meta.icp) + '</a>' +
        '</p>' +
      '</footer>'
    );
  }

  function toplineHtml(rightHtml) {
    return (
      '<header class="topline">' +
        '<a class="brand" href="' + esc(DATA.meta.homeUrl) + '">' + esc(DATA.meta.siteName) + '</a>' +
        (rightHtml || '<span class="topline-tag">' + esc(DATA.meta.title) + " · " + esc(DATA.meta.edition) + "</span>") +
      "</header>"
    );
  }

  function introHtml() {
    const savedComplete = !!saved && !!saved.resultCode && saved.answers.every(Boolean);
    const hasResult = !!state.result || savedComplete;

    // 当前会话答到一半（点了退出）优先，其次是上次存在浏览器里的进度
    const liveAnswers = answeredCount() > 0;
    const progressIndex = liveAnswers ? firstUnanswered(state.answers)
      : (saved && !savedComplete ? firstUnanswered(saved.answers) : 0);
    const hasProgress = liveAnswers || (!!saved && !savedComplete && saved.answers.some(Boolean));

    let primary = '<button class="btn btn-primary" data-action="start">开始鉴定<span class="btn-arrow" aria-hidden="true">→</span></button>';
    let secondary = "";

    if (hasResult) {
      primary = '<button class="btn btn-primary" data-action="' + (state.result ? "back-result" : "view-saved") + '">查看上次结果<span class="btn-arrow" aria-hidden="true">→</span></button>';
      secondary = '<button class="btn btn-ghost" data-action="start">重新测一次</button>';
    } else if (hasProgress) {
      primary = '<button class="btn btn-primary" data-action="resume">继续上次（第 ' + (progressIndex + 1) + ' 题）<span class="btn-arrow" aria-hidden="true">→</span></button>';
      secondary = '<button class="btn btn-ghost" data-action="start">重新开始</button>';
    }

    const axisCards = DATA.axes.map(function (axis) {
      return (
        '<div class="axis-card">' +
          '<p class="axis-letters"><b>' + axis.left.pole + "</b><span aria-hidden=\"true\">/</span><b>" + axis.right.pole + "</b></p>" +
          '<p class="axis-name">' + esc(axis.name) + "</p>" +
          '<p class="axis-desc">' + esc(axis.left.name) + " ↔ " + esc(axis.right.name) + "</p>" +
        "</div>"
      );
    }).join("");

    return (
      '<section class="screen screen--intro">' +
        toplineHtml() +
        '<div class="panel intro-panel">' +
          forestStripHtml() +
          '<p class="kicker">开在森林里的赛博人格鉴定所 · No.' + esc(DATA.meta.edition.replace(/^No\./, "")) + "</p>" +
          '<h1 class="intro-title">你是哪种<br><span class="grad-text">互联网生物<span class="qmark">？</span></span></h1>' +
          '<p class="intro-lede">' + TOTAL + ' 道题，4 个维度，16 种生物。本所在林子里支了个摊，不做心理诊断，只负责在你身上找到一点熟悉的荒谬。</p>' +
          '<ul class="chips chip-row">' +
            '<li class="chip">' + TOTAL + " 道题</li>" +
            '<li class="chip">' + esc(DATA.meta.duration) + "</li>" +
            '<li class="chip">无需登录</li>' +
            '<li class="chip">测完就忘</li>' +
          "</ul>" +
          '<div class="intro-actions">' + primary + secondary + "</div>" +

          '<div class="guide">' +
            '<p class="guide-bubble">慢慢答，答累了就抬头看看树。树不会催你。</p>' +
          "</div>" +

          '<p class="fineprint">结果仅供娱乐 · 不构成任何人生建议</p>' +
        "</div>" +

        '<section class="panel about-panel">' +
          sprigSvg("sprig") +
          '<p class="kicker">这片林子里测什么</p>' +
          '<h2 class="about-title">四个维度，十六种生物</h2>' +
          '<p class="about-copy">题目换了更贴近当代生活的版本：社交电量、脑内小剧场、先讲道理还是先讲感受、以及你和计划之间的爱恨情仇。</p>' +
          '<div class="axis-grid">' + axisCards + "</div>" +
          '<p class="about-note">每题二选一，选更像自己的那个。没有正确答案，也没有错误答案，只有「你怎么这样」。</p>' +
        "</section>" +

        footerHtml() +
      "</section>"
    );
  }

  function quizHtml() {
    const question = currentQuestion();
    const selected = state.answers[state.index];
    const progress = Math.round((state.index / TOTAL) * 100);
    const options = question.options.map(function (option, i) {
      const isSelected = selected === option.pole;
      const label = LETTERS[i] || String(i + 1);
      return (
        '<button type="button" class="option' + (isSelected ? " is-selected" : "") + '"' +
          ' data-choice="' + i + '"' +
          ' aria-pressed="' + (isSelected ? "true" : "false") + '">' +
          '<span class="option-key" aria-hidden="true">' + label + "</span>" +
          '<span class="option-text">' + esc(option.text) + "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<section class="screen screen--quiz">' +
        '<header class="quiz-top">' +
          '<button type="button" class="text-btn" data-action="quit"><span aria-hidden="true">←</span> 退出</button>' +
          '<div class="quiz-counter" aria-hidden="true"><b>' + (state.index + 1) + "</b><span>/ " + TOTAL + "</span></div>" +
        "</header>" +
        '<div class="progress" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + state.index + '">' +
          '<span class="progress-fill" style="width:' + progress + '%"></span>' +
        "</div>" +

        '<article class="panel question-panel">' +
          sprigSvg("question-sprig") +
          '<p class="kicker">' + esc(KICKERS[state.index % KICKERS.length]) + "</p>" +
          '<h1 class="question" tabindex="-1" data-autofocus>' + esc(question.text) + "</h1>" +
          '<div class="options">' + options + "</div>" +
        "</article>" +

        '<div class="quiz-foot">' +
          '<p class="kbd-hint"><kbd>1</kbd> / <kbd>2</kbd> 选择 · <kbd>←</kbd> 返回上一题</p>' +
          '<p class="sr-only" role="status" aria-live="polite">第 ' + (state.index + 1) + " 题，共 " + TOTAL + " 题</p>" +
        "</div>" +
      "</section>"
    );
  }

  function checkpointHtml() {
    const answered = Math.min(state.checkpoint || 0, TOTAL);
    const info = CHECKPOINTS[answered] || { title: "中场休息", copy: "歇会儿吧，反正也跑不掉。" };
    const percent = Math.round((answered / TOTAL) * 100);
    const remaining = TOTAL - answered;

    return (
      '<section class="screen screen--checkpoint">' +
        '<header class="quiz-top">' +
          '<button type="button" class="text-btn" data-action="quit"><span aria-hidden="true">←</span> 退出</button>' +
          '<div class="quiz-counter" aria-hidden="true"><b>' + answered + "</b><span>/ " + TOTAL + "</span></div>" +
        "</header>" +

        '<div class="panel checkpoint-panel">' +
          '<div class="checkpoint-mascot">' + mascotSvg("mascot--checkpoint", { cup: true }) + "</div>" +
          '<p class="kicker">已答 ' + answered + " 题 · 还剩 " + remaining + " 题</p>" +
          '<p class="checkpoint-num grad-text">' + percent + "%</p>" +
          '<h1 class="checkpoint-title" tabindex="-1" data-autofocus>' + esc(info.title) + "</h1>" +
          '<p class="checkpoint-copy">' + esc(info.copy) + "</p>" +
          '<div class="checkpoint-bar" aria-hidden="true"><span style="width:' + percent + '%"></span></div>' +
          '<button type="button" class="btn btn-primary" data-action="continue">继续第 ' + (answered + 1) + " 题<span class=\"btn-arrow\" aria-hidden=\"true\">→</span></button>" +
          '<p class="checkpoint-hint">按 Enter 继续 · 进度已自动保存</p>' +
        "</div>" +
      "</section>"
    );
  }

  function meterHtml() {
    if (!state.result || state.browsing) return "";

    const rows = DATA.axes.map(function (axis) {
      const p = state.result.percents[axis.key];
      const leftPole = axis.left.pole;
      const rightPole = axis.right.pole;
      const leftDom = p.dominant === leftPole;

      return (
        '<div class="meter">' +
          '<div class="meter-labels">' +
            '<span class="meter-side' + (leftDom ? " is-dom" : "") + '"><b>' + leftPole + "</b>" + esc(axis.left.name) + '<em>' + p.left + "%</em></span>" +
            '<span class="meter-side meter-side--right' + (leftDom ? "" : " is-dom") + '"><em>' + p.right + "%</em>" + esc(axis.right.name) + '<b>' + rightPole + "</b></span>" +
          "</div>" +
          '<div class="meter-track"><span class="meter-fill" style="width:' + p.left + '%"></span><span class="meter-mark' + (p.left <= 0 || p.left >= 100 ? " is-edge" : "") + '" style="left:' + p.left + '%"></span></div>' +
          '<p class="meter-note">' + esc(axis.note[p.dominant]) + "</p>" +
        "</div>"
      );
    }).join("");

    const duration = state.finishedAt && state.startedAt
      ? core.formatDuration(state.finishedAt - state.startedAt)
      : "";

    return (
      '<section class="panel meter-panel">' +
        '<div class="meter-head">' +
          '<p class="kicker">四个维度</p>' +
          (duration ? '<p class="meter-meta">本次鉴定耗时 ' + esc(duration) + "</p>" : "") +
        "</div>" +
        rows +
      "</section>"
    );
  }

  function resultHtml() {
    const code = state.viewCode || (state.result && state.result.code);
    const type = typeOf(code);
    if (!type) return introHtml();

    const own = !state.browsing && !!state.result;
    const match = typeOf(type.match);
    const rival = typeOf(type.rival);
    const blocks = [];

    blocks.push(
      '<div class="block">' +
        '<p class="kicker">一句话人格</p>' +
        '<p class="block-text block-text--lead">' + esc(type.summary) + "</p>" +
      "</div>"
    );

    blocks.push(
      '<div class="block-grid">' +
        '<div class="block">' +
          '<p class="kicker">出厂设置</p>' +
          '<ul class="list-dot">' + type.strengths.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
        "</div>" +
        '<div class="block">' +
          '<p class="kicker">已知 Bug</p>' +
          '<ul class="list-dot list-dot--warn">' + type.weakness.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
        "</div>" +
      "</div>"
    );

    blocks.push(
      '<div class="block">' +
        '<p class="kicker">生存建议</p>' +
        '<ol class="list-num">' + type.advice.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
      "</div>"
    );

    blocks.push(
      '<div class="block-grid">' +
        '<div class="block block--relation">' +
          '<p class="kicker">最佳拍档</p>' +
          '<p class="relation-name"><span aria-hidden="true">' + (match ? match.emoji : "") + "</span> " + esc(type.match) + " " + esc(match ? match.name : "") + "</p>" +
          '<p class="relation-note">' + esc(type.matchNote) + "</p>" +
        "</div>" +
        '<div class="block block--relation">' +
          '<p class="kicker">天生不对付</p>' +
          '<p class="relation-name"><span aria-hidden="true">' + (rival ? rival.emoji : "") + "</span> " + esc(type.rival) + " " + esc(rival ? rival.name : "") + "</p>" +
          '<p class="relation-note">' + esc(type.rivalNote) + "</p>" +
        "</div>" +
      "</div>"
    );

    blocks.push(
      '<div class="block block--quote">' +
        '<p class="kicker">名场面</p>' +
        '<p class="quote">「' + esc(type.quote) + "」</p>" +
      "</div>"
    );

    const sampleNo = String(DATA.typeOrder.indexOf(code) + 1).padStart(2, "0");

    return (
      '<section class="screen screen--result">' +
        toplineHtml('<button type="button" class="text-btn" data-action="all-types">全部 ' + DATA.typeOrder.length + " 种 →</button>") +

        '<div class="panel result-hero">' +
          '<svg class="hero-ridge" viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
            '<path d="M0 92C90 62 150 66 220 84c70 18 120-28 200-32 80-4 120 42 200 38 80-4 130-26 180-18v48H0Z" fill="#eef4e2"/>' +
          "</svg>" +
          '<svg class="hero-mushrooms" viewBox="0 0 90 70" aria-hidden="true" focusable="false">' +
            '<ellipse cx="45" cy="64" rx="30" ry="5" fill="#35664d" opacity=".08"/>' +
            '<g transform="translate(20,38)">' +
              '<rect x="6" y="0" width="7" height="16" rx="3.5" fill="#f3e8d2"/>' +
              '<path d="M0 3C0 -7 10 -12 17 -7 22 -3 20 3 12 3Z" fill="#e7a087"/>' +
              '<circle cx="8" cy="-2" r="1.5" fill="#fff6e8"/>' +
              '<circle cx="14" cy="0" r="1.3" fill="#fff6e8"/>' +
            "</g>" +
            '<g transform="translate(52,46) scale(.68)">' +
              '<rect x="6" y="0" width="7" height="16" rx="3.5" fill="#f3e8d2"/>' +
              '<path d="M0 3C0 -7 10 -12 17 -7 22 -3 20 3 12 3Z" fill="#d98a6b"/>' +
              '<circle cx="8" cy="-2" r="1.5" fill="#fff6e8"/>' +
            "</g>" +
          "</svg>" +
          '<div class="result-topline">' +
            '<p class="kicker">' + (state.browsing ? "生物图鉴 · 第 " : "森林档案 · 第 ") + sampleNo + " 号</p>" +
            '<p class="rarity">本所占比 ' + type.rarity + "%<span>（编的，图一乐）</span></p>" +
          "</div>" +
          '<div class="result-head">' +
            '<div class="result-code-wrap">' +
              '<p class="result-code grad-text">' + esc(type.code) + "</p>" +
              '<h1 class="result-name"><span aria-hidden="true">' + type.emoji + "</span>" + esc(type.name) + "</h1>" +
              '<p class="result-tagline">' + esc(type.tagline) + "</p>" +
            "</div>" +
            '<div class="stamp" aria-hidden="true"><span>森林认证<br>已归档</span></div>' +
          "</div>" +
          '<ul class="chips chip-row">' + type.traits.map(function (t) { return '<li class="chip">' + esc(t) + "</li>"; }).join("") + "</ul>" +
        "</div>" +

        meterHtml() +
        '<div class="blocks">' + blocks.join("") + "</div>" +

        '<div class="result-actions">' +
          (state.browsing
            ? '<button type="button" class="btn btn-primary" data-action="' + (state.result ? "back-result" : "restart") + '">' + (state.result ? "← 返回我的结果" : "开始鉴定 <span class=\"btn-arrow\" aria-hidden=\"true\">→</span>") + "</button>"
            : '<button type="button" class="btn btn-primary" data-action="copy">复制结果文案</button>' +
              '<button type="button" class="btn btn-ghost" data-action="share">分享</button>' +
              '<button type="button" class="btn btn-ghost" data-action="restart">再测一次</button>') +
        "</div>" +

        '<p class="result-guide">' + mascotSvg("mascot--mini") + "<span>本报告由这只水豚全程陪同完成，它已经睡着了。</span></p>" +
        footerHtml() +
      "</section>"
    );
  }

  function modalHtml() {
    const items = DATA.typeOrder.map(function (code) {
      const t = typeOf(code);
      if (!t) return "";
      const current = code === state.viewCode ? " is-current" : "";
      return (
        '<button type="button" class="type-item' + current + '" data-action="view-type" data-code="' + esc(code) + '">' +
          '<span class="type-emoji" aria-hidden="true">' + t.emoji + "</span>" +
          '<span class="type-name">' + esc(t.name) + "</span>" +
          '<span class="type-code">' + esc(t.code) + "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<div class="modal" role="dialog" aria-modal="true" aria-label="全部人格类型">' +
        '<div class="modal-backdrop" data-action="close-modal"></div>' +
        '<div class="modal-panel">' +
          '<div class="modal-head">' +
            '<div>' +
              '<p class="kicker">生物图鉴</p>' +
              '<h2 class="modal-title">十六种互联网生物</h2>' +
            "</div>" +
            '<button type="button" class="text-btn" data-action="close-modal">关闭</button>' +
          "</div>" +
          '<div class="type-grid">' + items + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- 流程 ---------- */

  function startFresh() {
    state.screen = "quiz";
    state.index = 0;
    state.answers = new Array(TOTAL).fill(null);
    state.startedAt = Date.now();
    state.finishedAt = 0;
    state.result = null;
    state.viewCode = null;
    state.browsing = false;
    state.modal = false;
    state.locked = false;
    state.checkpoint = 0;
    clearProgress();
    render();
  }

  function resume() {
    // 点「退出」回到首页时进度还在内存里，优先接着它继续
    if (answeredCount() > 0 && state.startedAt) {
      state.screen = "quiz";
      state.index = firstUnanswered(state.answers);
      state.locked = false;
      state.modal = false;
      state.checkpoint = 0;
      render();
      return;
    }

    if (!saved) return startFresh();
    state.answers = saved.answers.slice();
    state.index = firstUnanswered(state.answers);
    state.startedAt = saved.startedAt || Date.now();
    state.finishedAt = saved.finishedAt || 0;
    state.result = saved.resultCode ? core.compute(DATA.questions, state.answers) : null;
    state.screen = "quiz";
    state.viewCode = null;
    state.browsing = false;
    state.checkpoint = 0;
    render();
  }

  function choose(optionIndex) {
    if (state.locked || state.screen !== "quiz") return;

    const question = currentQuestion();
    const option = question.options[optionIndex];
    if (!option) return;

    state.answers[state.index] = option.pole;
    state.locked = true;
    saveProgress();

    const buttons = app.querySelectorAll("[data-choice]");
    for (let i = 0; i < buttons.length; i += 1) {
      const isSelected = Number(buttons[i].dataset.choice) === optionIndex;
      buttons[i].classList.toggle("is-selected", isSelected);
      buttons[i].setAttribute("aria-pressed", isSelected ? "true" : "false");
    }

    window.setTimeout(function () {
      state.locked = false;
      if (state.screen !== "quiz") return;
      if (state.index >= TOTAL - 1) {
        finish();
      } else {
        state.index += 1;
        if (state.index % CHECKPOINT_STEP === 0 && state.index < TOTAL) {
          state.checkpoint = state.index;
          state.screen = "checkpoint";
        }
        saveProgress();
        render();
      }
    }, 260);
  }

  function continueQuiz() {
    if (state.screen !== "checkpoint") return;
    state.screen = "quiz";
    state.checkpoint = 0;
    render();
  }

  function finish() {
    const result = core.compute(DATA.questions, state.answers);
    if (!result) return;

    state.result = result;
    state.viewCode = result.code;
    state.browsing = false;
    state.screen = "result";
    state.checkpoint = 0;
    state.finishedAt = Date.now();
    saveProgress();
    render();
  }

  function prev() {
    if (state.locked || state.screen !== "quiz" || state.index === 0) return;
    state.index -= 1;
    state.locked = false;
    render();
  }

  function quit() {
    state.screen = "intro";
    state.locked = false;
    state.modal = false;
    state.checkpoint = 0;
    render();
  }

  function restart() {
    clearProgress();
    startFresh();
  }

  function viewSaved() {
    if (!saved || !saved.resultCode) return;
    state.answers = saved.answers.slice();
    state.result = core.compute(DATA.questions, state.answers);
    if (!state.result) return startFresh();
    state.viewCode = state.result.code;
    state.startedAt = saved.startedAt || 0;
    state.finishedAt = saved.finishedAt || 0;
    state.browsing = false;
    state.screen = "result";
    render();
  }

  function backToResult() {
    state.browsing = false;
    state.viewCode = state.result ? state.result.code : null;
    state.screen = state.result ? "result" : "intro";
    render();
  }

  function openTypes() {
    state.modal = true;
    render({ scroll: false });
    const closeBtn = app.querySelector(".modal-panel [data-action='close-modal']");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeTypes() {
    state.modal = false;
    render({ scroll: false });
  }

  function viewType(code) {
    if (!typeOf(code)) return;
    state.viewCode = code;
    state.browsing = true;
    state.modal = false;
    state.screen = "result";
    render();
  }

  /* ---------- 分享 ---------- */

  function resultShareText() {
    const type = typeOf(state.viewCode);
    if (!type) return "";
    return [
      "我在「" + DATA.meta.title + "」测出的人格是 " + type.code + " " + type.emoji + " " + type.name,
      "「" + type.tagline + "」",
      TOTAL + " 道题测出你是哪种互联网生物 → " + shareUrl()
    ].join("\n");
  }

  function legacyCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function handleCopy() {
    copyText(resultShareText()).then(function (ok) {
      showToast(ok ? "文案已复制，去发给那个最懂你的人" : "复制失败，手动选中试试");
    });
  }

  function handleShare() {
    const text = resultShareText();
    if (navigator.share) {
      navigator.share({ title: DATA.meta.title, text: text, url: shareUrl() }).catch(function () {
        handleCopy();
      });
      return;
    }
    handleCopy();
  }

  let toastTimer = 0;
  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  /* ---------- 事件 ---------- */

  app.addEventListener("click", function (event) {
    const choice = event.target.closest("[data-choice]");
    if (choice) {
      choose(Number(choice.dataset.choice));
      return;
    }

    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    const action = trigger.dataset.action;
    if (action === "start") return startFresh();
    if (action === "resume") return resume();
    if (action === "view-saved") return viewSaved();
    if (action === "quit") return quit();
    if (action === "all-types") return openTypes();
    if (action === "close-modal") return closeTypes();
    if (action === "view-type") return viewType(trigger.dataset.code);
    if (action === "back-result") return backToResult();
    if (action === "restart") return restart();
    if (action === "continue") return continueQuiz();
    if (action === "copy") return handleCopy();
    if (action === "share") return handleShare();
    return undefined;
  });

  document.addEventListener("keydown", function (event) {
    if (state.modal) {
      if (event.key === "Escape") closeTypes();
      return;
    }

    if (state.screen === "quiz") {
      const key = event.key.toLowerCase();
      if (key === "1" || key === "a") {
        event.preventDefault();
        choose(0);
      } else if (key === "2" || key === "b") {
        event.preventDefault();
        choose(1);
      } else if (event.key === "ArrowLeft" || event.key === "Backspace") {
        event.preventDefault();
        prev();
      }
      return;
    }

    if (state.screen === "checkpoint" && event.key === "Enter") {
      event.preventDefault();
      continueQuiz();
      return;
    }

    if (state.screen === "intro" && event.key === "Enter") {
      const primary = app.querySelector("[data-action='start'], [data-action='resume'], [data-action='view-saved']");
      if (primary) {
        event.preventDefault();
        primary.click();
      }
    }
  });

  /* ---------- 调试预览：?preview=quiz&q=7 · ?preview=result&type=INTJ ---------- */

  function seedAnswers(code) {
    const dominant = {
      EI: code.charAt(0),
      SN: code.charAt(1),
      TF: code.charAt(2),
      JP: code.charAt(3)
    };
    const answers = new Array(TOTAL).fill(null);

    DATA.axes.forEach(function (axis) {
      const indexes = [];
      DATA.questions.forEach(function (q, i) {
        if (q.axis === axis.key) indexes.push(i);
      });
      const dominantCount = Math.ceil(indexes.length * 0.72);
      indexes.forEach(function (questionIndex, order) {
        const onDominant = order < dominantCount;
        const pole = onDominant
          ? dominant[axis.key]
          : (dominant[axis.key] === axis.left.pole ? axis.right.pole : axis.left.pole);
        answers[questionIndex] = pole;
      });
    });

    return answers;
  }

  function runPreview() {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview");
    if (!preview) return false;

    if (preview === "quiz") {
      const q = Number(params.get("q") || "1");
      state.screen = "quiz";
      state.index = Math.min(Math.max((Number.isFinite(q) ? q : 1) - 1, 0), TOTAL - 1);
      state.startedAt = Date.now();
      render();
      return true;
    }

    if (preview === "result") {
      const code = String(params.get("type") || "INTJ").toUpperCase();
      if (!typeOf(code)) return false;
      state.answers = seedAnswers(code);
      state.result = core.compute(DATA.questions, state.answers);
      if (!state.result) return false;
      state.viewCode = state.result.code;
      state.browsing = false;
      state.startedAt = Date.now() - 4 * 60 * 1000;
      state.finishedAt = Date.now();
      state.screen = "result";
      render();
      return true;
    }

    if (preview === "checkpoint") {
      const at = Number(params.get("at") || "50");
      const seeded = seedAnswers("ENTP");
      state.answers = seeded.map(function (answer, i) { return i < at ? answer : null; });
      state.screen = "checkpoint";
      state.checkpoint = Math.min(Math.max(at, 0), TOTAL);
      state.startedAt = Date.now() - 3 * 60 * 1000;
      render();
      return true;
    }

    if (preview === "types") {
      state.screen = "result";
      state.answers = seedAnswers("INTJ");
      state.result = core.compute(DATA.questions, state.answers);
      state.viewCode = "INTJ";
      state.browsing = false;
      state.modal = true;
      render();
      return true;
    }

    return false;
  }

  /* ---------- 启动 ---------- */

  if (!runPreview()) {
    render();
  }
})();
