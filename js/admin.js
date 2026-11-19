/* 管理后台逻辑：口令 → 数据 → 表格/删除/导出 */
var TOKEN = sessionStorage.getItem("adminToken") || "";
var DATA = null;
var curTab = "politics";

var el = function (id) { return document.getElementById(id); };
function toastMsg(msg) {
  var t = el("ccToast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 2000);
}
function fmtTime(ms) {
  if (!ms) return "-";
  var d = new Date(ms);
  var p = function (n) { return (n < 10 ? "0" : "") + n; };
  return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function fmtUsed(s) {
  var m = Math.floor(s / 60);
  return m > 0 ? m + "分" + (s % 60) + "秒" : s + "秒";
}

function loadData() {
  return fetch("/api/admin/data?token=" + encodeURIComponent(TOKEN))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.error) { logout(); return; }
      DATA = d;
      render();
    });
}

function render() {
  if (curTab === "danmaku") { renderDanmaku(); return; }
  var SET_NAMES = { politics: "时政专项", fraud: "防诈专项", main: "综合竞赛" };
  var list = (DATA.sets[curTab] || []).slice().sort(function (a, b) {
    return b.score - a.score || a.usedMs - b.usedMs || a.time - b.time;
  });
  el("adPanelTitle").innerHTML = SET_NAMES[curTab] + "成绩 · 共 " + list.length + " 人 <button id=\"adExport\" class=\"ad-btn ad-btn-sm\">导出 Excel</button>";
  bindExport();
  if (!list.length) { el("adTable").innerHTML = '<div class="ad-empty">暂无成绩，等同学交卷后自动出现</div>'; return; }
  var rows = list.map(function (s, i) {
    return "<tr><td>" + (i + 1) + "</td><td>" + s.name + "</td>" +
      "<td><b style=\"color:#7fd0c5\">" + s.score + "</b>/" + s.total + "</td>" +
      "<td>" + fmtUsed(Math.round((s.usedMs || 0) / 1000)) + "</td>" +
      "<td class=\"ad-dm-time\">" + fmtTime(s.time) + "</td>" +
      "<td><button class=\"ad-del\" data-name=\"" + s.name + "\" data-time=\"" + s.time + "\">删除</button></td></tr>";
  }).join("");
  el("adTable").innerHTML = "<table class=\"ad-table\"><tr><th>名次</th><th>姓名</th><th>得分</th><th>用时</th><th>交卷时间</th><th></th></tr>" + rows + "</table>";
  el("adTable").querySelectorAll(".ad-del").forEach(function (btn) {
    btn.addEventListener("click", function () { delScore(btn.dataset.name, Number(btn.dataset.time)); });
  });
}
function renderDanmaku() {
  var list = (DATA.danmaku || []).slice().reverse();
  el("adPanelTitle").innerHTML = "弹幕记录 · 共 " + list.length + " 条";
  bindExport();
  if (!list.length) { el("adTable").innerHTML = '<div class="ad-empty">暂无弹幕</div>'; return; }
  var rows = list.map(function (m) {
    return "<tr><td class=\"ad-dm-text\">" + m.text + "</td>" +
      "<td class=\"ad-dm-time\">" + fmtTime(m.time) + "</td>" +
      "<td><button class=\"ad-del\" data-id=\"" + m.id + "\">删除</button></td></tr>";
  }).join("");
  el("adTable").innerHTML = "<table class=\"ad-table\"><tr><th>内容</th><th>时间</th><th></th></tr>" + rows + "</table>";
  el("adTable").querySelectorAll(".ad-del").forEach(function (btn) {
    btn.addEventListener("click", function () { delDanmaku(Number(btn.dataset.id)); });
  });
}

function delScore(name, time) {
  if (!confirm("确定删除「" + name + "」的成绩？不可恢复")) return;
  fetch("/api/admin/delete", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: TOKEN, set: curTab, name: name, time: time })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) { toastMsg("已删除"); loadData(); }
  });
}

function delDanmaku(id) {
  if (!confirm("确定删除该弹幕？")) return;
  fetch("/api/admin/danmaku/delete", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: TOKEN, id: id })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.ok) { toastMsg("已删除"); loadData(); }
  });
}

function exportCsv() {
  var lines = [];
  if (curTab === "danmaku") {
    lines.push(["内容", "时间"]);
    (DATA.danmaku || []).forEach(function (m) { lines.push([m.text, fmtTime(m.time)]); });
  } else {
    var SET_NAMES = { politics: "时政专项", fraud: "防诈专项", main: "综合竞赛" };
    lines.push(["【" + SET_NAMES[curTab] + "】"]);
    lines.push(["导出时间", fmtTime(Date.now())]);
    lines.push(["名次", "姓名", "得分", "总分", "用时秒", "交卷时间"]);
    var list = (DATA.sets[curTab] || []).slice().sort(function (a, b) {
      return b.score - a.score || a.usedMs - b.usedMs || a.time - b.time;
    });
    list.forEach(function (s, i) {
      lines.push([i + 1, s.name, s.score, s.total, Math.round((s.usedMs || 0) / 1000), fmtTime(s.time)]);
    });
  }
  var csv = lines.map(function (r) {
    return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
  }).join("\r\n");
  var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "班级成绩_" + curTab + ".csv";
  a.click();
  toastMsg("已导出，用 Excel 打开即可");
}

function bindExport() {
  var b = el("adExport");
  if (b) b.addEventListener("click", exportCsv);
}

function logout() {
  sessionStorage.removeItem("adminToken");
  TOKEN = "";
  el("adminMain").style.display = "none";
  el("adminGate").style.display = "";
  el("adminErr").textContent = "口令已失效，请重新登录";
}

function tryLogin() {
  var pass = el("adminPass").value;
  if (!pass) return;
  fetch("/api/admin/data?token=" + encodeURIComponent(pass))
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.error) { el("adminErr").textContent = "口令错误，请重试"; return; }
      TOKEN = pass;
      sessionStorage.setItem("adminToken", pass);
      DATA = d;
      el("adminGate").style.display = "none";
      el("adminMain").style.display = "";
      render();
    });
}
el("adminGo").addEventListener("click", tryLogin);
el("adminPass").addEventListener("keyup", function (e) { if (e.key === "Enter") tryLogin(); });

el("adminTabs").addEventListener("click", function (e) {
  var tab = e.target.closest(".ad-tab");
  if (!tab) return;
  document.querySelectorAll(".ad-tab").forEach(function (t) { t.classList.remove("active"); });
  tab.classList.add("active");
  curTab = tab.dataset.tab;
  render();
});

if (TOKEN) {
  loadData().then(function () {
    if (DATA) {
      el("adminGate").style.display = "none";
      el("adminMain").style.display = "";
    }
  });
} else {
  el("adminPass").focus();
}