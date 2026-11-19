/* 排行榜页面逻辑：每5秒自动刷新 */
var boardWrap = document.getElementById('boardWrap');
var totalNum = document.getElementById('totalNum');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function render(list) {
  totalNum.textContent = list.length;
  if (!list.length) {
    boardWrap.innerHTML = '<div class="board-loading">还没有人参与，快去答题吧</div>';
    return;
  }
  var html = list.map(function (item) {
    var top = item.rank === 1 ? ' top1' : item.rank === 2 ? ' top2' : item.rank === 3 ? ' top3' : '';
    var used = item.usedSeconds ? ' · 用时 ' + item.usedSeconds + ' 秒' : '';
    return '<div class="board-row' + top + '">' +
      '<span class="board-rank">' + item.rank + '</span>' +
      '<span class="board-name">' + escapeHtml(item.name) + '</span>' +
      '<span class="board-used">' + used + '</span>' +
      '<span class="board-score">' + item.score + '/' + item.total + '</span>' +
      '</div>';
  }).join('');
  boardWrap.innerHTML = html;
}

var setParam = new URLSearchParams(location.search).get('set');
var SET_SUFFIX = (setParam === 'fraud' || setParam === 'politics') ? '?set=' + setParam : '';

// 演示快照榜单（静态托管降级用）
var SNAPSHOT = {
  politics: [
    { rank: 1, name: '苏硕', score: 20, total: 20, usedSeconds: 203 },
    { rank: 2, name: '张晓葉', score: 19, total: 20, usedSeconds: 188 },
    { rank: 3, name: '张文慧', score: 19, total: 20, usedSeconds: 245 },
    { rank: 4, name: '刘鑫璇', score: 18, total: 20, usedSeconds: 272 },
    { rank: 5, name: '兰婕', score: 18, total: 20, usedSeconds: 314 },
    { rank: 6, name: '王文轩', score: 17, total: 20, usedSeconds: 288 },
    { rank: 7, name: '丁凤阳', score: 17, total: 20, usedSeconds: 366 }
  ],
  fraud: [
    { rank: 1, name: '张晓葉', score: 20, total: 20, usedSeconds: 231 },
    { rank: 2, name: '苏硕', score: 19, total: 20, usedSeconds: 267 },
    { rank: 3, name: '张文慧', score: 19, total: 20, usedSeconds: 196 },
    { rank: 4, name: '刘鑫璇', score: 19, total: 20, usedSeconds: 258 },
    { rank: 5, name: '兰婕', score: 19, total: 20, usedSeconds: 243 },
    { rank: 6, name: '王文轩', score: 18, total: 20, usedSeconds: 351 },
    { rank: 7, name: '丁凤阳', score: 18, total: 20, usedSeconds: 327 }
  ],
  main: [{ rank: 1, name: '班级同学', score: 25, total: 25, usedSeconds: 300 }]
};

function refresh() {
  fetch('/api/leaderboard' + SET_SUFFIX)
    .then(function (r) { return r.json(); })
    .then(function (data) { render(data.leaderboard || []); })
    .catch(function () {
      var snap = SNAPSHOT[setParam] || SNAPSHOT.main;
      render(snap);
    });
}

refresh();
setInterval(refresh, 5000);
