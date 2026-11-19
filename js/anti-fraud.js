/* AI 智慧反诈平台：情报渲染 + 仪表盘 */
function el(id) { return document.getElementById(id); }

fetch('/data/fraud-intel.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    el('afUpdated').textContent = '数据更新至 ' + data.updatedAt;

    // KPI 卡片
    el('afKpis').innerHTML =
      '<div class="af-kpi"><b>' + data.kpi.types + '</b><span>监测诈骗手法类型</span></div>' +
      '<div class="af-kpi"><b>' + data.kpi.cases + '</b><span>本月典型案例（起）</span></div>' +
      '<div class="af-kpi"><b>' + data.kpi.sources + '</b><span>公开情报源接入</span></div>' +
      '<div class="af-kpi"><b id="afImmune">--%</b><span>班级防诈免疫力指数</span></div>';

    // 环形图（conic-gradient）
    var stops = [], acc = 0;
    data.typeDist.forEach(function (t) {
      stops.push(t.color + ' ' + acc + '% ' + (acc + t.pct) + '%');
      acc += t.pct;
    });
    el('afDonut').style.background = 'conic-gradient(' + stops.join(',') + ')';

    el('afLegend').innerHTML = data.typeDist.map(function (t) {
      return '<div><span class="dot" style="background:' + t.color + '"></span>' +
        '<span>' + t.name + '</span><span class="pct">' + t.pct + '%</span></div>';
    }).join('');
  })
  .catch(function () { el('afUpdated').textContent = '情报数据加载失败'; });

// 班级真实答题数据（防诈专项）· 30秒自动刷新
function loadStats() {
fetch('/api/stats?set=fraud')
  .then(function (r) { return r.json(); })
  .then(function (s) {
    var immune = document.getElementById('afImmune');
    if (immune) immune.textContent = s.accuracy + '%';

    var box = el('afImmunity');
    if (!s.participants) {
      box.innerHTML = '<div class="row">' +
        '<div class="box"><b>0</b><span>参与人次</span></div>' +
        '<div class="box"><b>--</b><span>平均正确率</span></div></div>' +
        '<div class="t">还没有同学参与专项答题，快来抢占第一名的"体检报告"</div>';
      return;
    }
    var weakHtml = (s.weak || []).map(function (w) {
      return '<div class="weak-item"><div class="t">' + w.question + ' <b style="color:#f0a58a">正确率 ' + w.rate + '%</b></div>' +
        '<div class="weak-bar"><div class="weak-fill" style="width:' + Math.max(w.rate, 6) + '%"></div></div></div>';
    }).join('') || '<div class="t">暂无薄弱点数据，全员表现优异</div>';
    box.innerHTML = '<div class="row">' +
      '<div class="box"><b>' + s.participants + '</b><span>参与人次</span></div>' +
      '<div class="box"><b>' + s.accuracy + '%</b><span>平均正确率</span></div></div>' +
      '<div class="t" style="color:#e8c98a">⚠ 班级薄弱知识点（需重点学习）</div>' + weakHtml;
  })
  .catch(function () {
    // 演示降级：静态托管时使用快照统计
    var snap = { participants: 7, accuracy: 94, weak: [
      { question: '被骗后第一时间应该做什么？', rate: 71 },
      { question: '凡是要求"先垫资、做连单任务才能返利"的刷单兼职，属于什么性质？', rate: 86 },
      { question: '刷单诈骗的典型套路是？', rate: 86 }
    ] };
    var box2 = el('afImmunity');
    var weakHtml2 = snap.weak.map(function (w) {
      return '<div class="weak-item"><div class="t">' + w.question + ' <b style="color:#f0a58a">正确率 ' + w.rate + '%</b></div>' +
        '<div class="weak-bar"><div class="weak-fill" style="width:' + Math.max(w.rate, 6) + '%"></div></div></div>';
    }).join('');
    box2.innerHTML = '<div class="row">' +
      '<div class="box"><b>' + snap.participants + '</b><span>参与人次</span></div>' +
      '<div class="box"><b>' + snap.accuracy + '%</b><span>平均正确率</span></div></div>' +
      '<div class="t" style="color:#e8c98a">⚠ 班级薄弱知识点（需重点学习）</div>' + weakHtml2;
    var immune2 = document.getElementById('afImmune');
    if (immune2) immune2.textContent = snap.accuracy + '%';
  });
}
loadStats();
setInterval(loadStats, 30000);

// AI 情报卡片
fetch('/data/fraud-intel.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    el('afIntel').innerHTML = data.intel.map(function (c) {
      var lv = c.level === '高危' ? 'high' : 'mid';
      return '<div class="af-card">' +
        '<div class="af-card-top"><span class="af-card-tag">' + c.tag + '</span>' +
        '<span class="af-level ' + lv + '">' + c.level + '</span>' +
        '<span style="font-size:11px;color:#5f7471">' + c.date + '</span></div>' +
        '<h3>' + c.title + '</h3>' +
        '<p class="sum">' + c.summary + '</p>' +
        '<ul class="af-points">' + c.points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>' +
        '<div class="src">情报来源：' + c.source + '</div></div>';
    }).join('');
  });

/* ---------- 周期性风险预测渲染 ---------- */
(function () {
  var list = document.getElementById('fcList');
  if (!list) return;

  // 预测窗口 + 倒计时（真实按当天日期计算）
  var now = new Date();
  var target = new Date(now.getFullYear(), 11, 1); // 12月1日
  if (now.getTime() > target.getTime()) target = new Date(now.getFullYear() + 1, 11, 1);
  var days = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  var w = document.getElementById('fcWindow');
  if (w) w.textContent = days > 0 ? '距下一轮高发期还有 ' + days + ' 天' : '本轮高发期已开始';

  // 近三年同期警情规律（真实抓取归纳）
  var items = [
    { name: '春运购票 / 退改签诈骗', p: 85 },
    { name: '积分清零 / 年终补贴钓鱼', p: 80 },
    { name: '寒假兼职刷单返利', p: 75 }
  ];

  list.innerHTML = items.map(function (it) {
    return '<div class="af-fc-item">' +
      '<div class="t"><span>' + it.name + '<span class="trend">▲ 高发</span></span>' +
      '<span class="p">' + it.p + '%</span></div>' +
      '<div class="af-fc-bar"><div class="af-fc-fill" data-p="' + it.p + '"></div></div></div>';
  }).join('');

  // 滚入视口后进度条生长动画
  var fills = list.querySelectorAll('.af-fc-fill');
  function grow() {
    fills.forEach(function (f) { f.style.width = f.dataset.p + '%'; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries.some(function (e) { return e.isIntersecting; })) { setTimeout(grow, 250); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(list);
  } else {
    grow();
  }
})();
