# 赛博人格鉴定所

一个 100 题的娱乐向人格小游戏：4 个维度、16 种「互联网生物」，结果带维度条、生存建议、最佳拍档 / 天生不对付，可以一键复制文案分享。

整个仓库就是一个纯静态站点，没有构建步骤、没有后端、没有依赖。把这一目录丢给任意静态服务器就能跑。

- 纯静态：HTML + CSS + 原生 JS，零依赖、零构建、零后端
- 离线可用：不加载任何外部字体、图片或第三方脚本（山、树、河、水豚全是内联 SVG）
- 森林系视觉：奶油色纸感 + 森林绿 / 溪水蓝，标题用圆体，配一只陪答的水豚
- 进度自动存在浏览器 localStorage，刷新 / 关掉再回来都能接着答
- 每 25 题一次「中场休息」，100 题不至于答到怀疑人生
- 兼容手机：390px 宽起正常显示，支持点击、键盘 `1` / `2` / `←`

## 文件结构

```
.
├── index.html    页面骨架 + SEO / favicon（含背景里的山、河、云）
├── styles.css    全部样式与动画
├── core.js       计分内核（不碰 DOM，Node 也能跑）
├── data.js       100 道题 + 16 型文案（想改内容只动这个文件）
├── app.js        界面渲染、水豚和首页小风景的内联 SVG
└── README.md     本文件
```

## 本地预览

直接双击 `index.html` 就能看（所有资源都是相对路径，`file://` 下也能跑）。

想更接近线上环境：

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

## 部署

这个目录本身就是构建产物，不需要打包：

```bash
rsync -avz --exclude '.git' ./ user@your-server:/var/www/quiz/
```

nginx：

```nginx
server {
    listen 80;
    server_name maimai.vip;
    root /var/www/quiz;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Caddy：

```
maimai.vip {
    root * /var/www/quiz
    file_server
}
```

如果想挂在子路径（比如 `https://example.com/quiz/`），把文件放到对应目录即可，页面里都是相对路径。唯一要改的是 `data.js` 里的 `homeUrl`，改成 `/quiz/`，这样左上角「麦麦.vip」和页脚链接才会回到游戏首页。

## 改内容

### 改题目

打开 `data.js`，`questions` 数组里每题长这样：

```js
{
  id: "q007",
  axis: "SN",                       // 属于哪个维度：EI / SN / TF / JP
  text: "看到「限时五折」四个字，你的大脑：",
  options: [
    { pole: "S", text: "自动开始算：原价多少、到手多少……" },
    { pole: "N", text: "自动开始想象：买了它，我的人生会不一样。" }
  ]
}
```

- 每题两个选项，`pole` 必须属于该维度的两个字母之一。
- 计分就是数票：每个维度哪边票多，结果就是哪个字母。
- 现在是 100 题，四个维度各 25 题（奇数，所以永远不会平票）。题目在数组里是穿插排列的，改题时不用管顺序，插在哪都行；只要四个维度的题数都保持**奇数**就好。改完跑一次自测（见下）。
- 新增题目时记得换一个不重复的 `id`（只是给阅读和排查用的，不影响计分）。

### 改结果文案

`types` 里每一型包含：`name`（外号）、`emoji`、`tagline`（一句话）、`summary`（一段话）、`traits`（3 个标签）、`strengths`、`weakness`、`advice`（3 条）、`match` / `rival`（拍档与宿敌的类型码）、`quote`（名场面）、`rarity`（占比，纯娱乐，16 型加起来是 100）。

### 改站点信息

`data.js` 顶部的 `meta`：

```js
homeUrl: "/",                         // 左上角「麦麦.vip」和页脚返回链接
shareUrl: "https://maimai.vip/",      // file:// 预览时复制文案里用的地址
icp: "辽ICP备2026027768号",
disclaimer: "本所不做心理诊断……"
```

### 换配色

`styles.css` 顶部的 `:root` 变量控制整片森林：`--brand`（叶绿）、`--river`（溪水蓝）、`--page-bg`（奶油纸色）、`--grad`（进度条 / 标题渐变）。背景里的山、河、云和飘落的叶子分别在 `index.html` 的 `.scene` 和 `styles.css` 的 `.scene` / `.cloud` / `.leaf-fly` 里；水豚和首页小风景在 `app.js` 的 `mascotSvg()` / `forestStripHtml()` 里，都是内联 SVG，随便改颜色。

## 调试参数

开发时可以直接跳到某个状态看效果（线上也生效，但没有入口）：

| 参数 | 效果 |
| --- | --- |
| `?preview=quiz&q=12` | 直接打开第 12 题 |
| `?preview=checkpoint&at=50` | 直接看 50 题后的中场休息页 |
| `?preview=result&type=INTJ` | 直接看 INTJ 的结果页（维度条是模拟数据） |
| `?preview=types` | 直接打开 16 型图鉴 |

## 自测

`core.js` 是纯函数，可以用 Node 直接验：

```bash
node -e "
global.window = global;
require('./core.js'); require('./data.js');
const d = global.QUIZ_DATA, c = global.QuizCore;
console.log('题目数', d.questions.length);
console.log('各维度题数', c.axisTotals(d.questions));
console.log('示例计分', c.compute(d.questions, d.questions.map(q => q.options[0].pole)).code);
"
```

线上行为检查清单：答完 100 题出结果（25 / 50 / 75 题处各有一个中场休息）、`←` 能回上一题、刷新能续答、复制文案有提示、手机上无横向滚动。

## 说明

- 不收集任何数据，进度只存在浏览器的 localStorage 里（key：`cyber-persona-quiz-v1`）。
- 结果、占比、稀有度都是编的，页面上也写了「图一乐」。
- 题目与文案可以随意改，改完记得保持四维度的题数是奇数。

> 每一个技术概念的诞生，都源于人们要解决的某个具体问题。
