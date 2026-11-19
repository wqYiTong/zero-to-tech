/* 赛博人格鉴定所 —— 计分内核
 * 不碰 DOM，浏览器和 Node 都能跑，方便单独测试。
 * 暴露 window.QuizCore（Node 里是 globalThis.QuizCore）。
 */
(function (global) {
  "use strict";

  const POLES = ["E", "I", "S", "N", "T", "F", "J", "P"];

  const AXES = [
    { key: "EI", left: "E", right: "I" },
    { key: "SN", left: "S", right: "N" },
    { key: "TF", left: "T", right: "F" },
    { key: "JP", left: "J", right: "P" }
  ];

  /** 统计每个字母被选中的次数 */
  function tally(questions, answers) {
    const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    for (let i = 0; i < questions.length; i += 1) {
      const answer = answers[i];
      if (!answer) continue;
      if (POLES.indexOf(answer) === -1) continue;
      counts[answer] += 1;
    }

    return counts;
  }

  /**
   * 计算人格类型。
   * answers 与 questions 一一对应，每一项是字母（E/I/S/N/T/F/J/P）或 null。
   * 未答完返回 null。
   */
  function compute(questions, answers) {
    if (!Array.isArray(questions) || !Array.isArray(answers)) return null;
    if (questions.length !== answers.length) return null;
    if (answers.some(function (a) { return !a; })) return null;

    const counts = tally(questions, answers);
    const percents = {};
    let code = "";

    AXES.forEach(function (axis) {
      const left = counts[axis.left];
      const right = counts[axis.right];
      const sum = left + right;
      const leftPercent = sum > 0 ? Math.round((left / sum) * 100) : 50;
      const dominant = left > right ? axis.left : axis.right;

      percents[axis.key] = {
        left: leftPercent,
        right: 100 - leftPercent,
        leftCount: left,
        rightCount: right,
        dominant: dominant
      };

      code += dominant;
    });

    return { code: code, percents: percents, counts: counts };
  }

  /** 只统计某个维度答了多少题（用于校验题库配比） */
  function axisTotals(questions) {
    const totals = { EI: 0, SN: 0, TF: 0, JP: 0 };
    questions.forEach(function (q) {
      if (totals[q.axis] !== undefined) totals[q.axis] += 1;
    });
    return totals;
  }

  /** 毫秒 → 「4 分 12 秒」 */
  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "不到 1 分钟";
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) return "不到 1 分钟";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return hours + " 小时 " + (minutes % 60) + " 分";
    }
    return minutes + " 分 " + seconds + " 秒";
  }

  global.QuizCore = {
    POLES: POLES,
    AXES: AXES,
    tally: tally,
    compute: compute,
    axisTotals: axisTotals,
    formatDuration: formatDuration
  };
})(typeof window !== "undefined" ? window : globalThis);
