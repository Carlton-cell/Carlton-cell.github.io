/* 同舟联络站：渲染 + 搜索过滤 */
var toastTimer = null;
function toast(msg) {
  var t = document.getElementById("ccToast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
}

function personCard(o, opts) {
  var title = o.group || o.role;
  var initial = opts.h ? "☎" : title.charAt(title.length - 1);
  return '<div class="cc-card" data-key="' + title + '">' +
    '<div class="cc-card-top"><div class="cc-avatar' + (opts.h ? " h" : "") + '">' + initial + "</div>" +
    '<div><div class="cc-name">' + title + "</div>" +
    '<div class="cc-role">' + (o.tag || "三互小组联络") + "</div></div></div>" +
    '<div class="cc-phone">' + o.masked + "</div>" +
    '<div class="cc-actions"><button class="cc-btn" onclick="toast(\'🔒 为保护同学隐私，完整号码仅通过线下互助小组同步\')">完整号码</button></div></div>';
}

function hospCard(o) {
  return '<div class="cc-card" data-key="' + o.name + ' ' + o.phone + '">' +
    '<div class="cc-card-top"><div class="cc-avatar h">☎</div>' +
    '<div><div class="cc-name">' + o.name + "</div>" +
    '<div class="cc-role">' + o.desc + "</div></div></div>" +
    '<div class="cc-phone">' + o.phone + "</div>" +
    '<div class="cc-actions"><button class="cc-btn call" onclick="copyPhone(\'' + o.phone + '\')">一键复制</button></div>' +
    "</div>";
}

function copyPhone(phone) {
  var done = function () { toast("✅ 已复制：" + phone); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(phone).then(done).catch(function () { legacyCopy(phone, done); });
  } else {
    legacyCopy(phone, done);
  }
}

// 兼容非 HTTPS 环境（局域网演示）
function legacyCopy(text, done) {
  try {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    done();
  } catch (e) {
    toast(text);
  }
}

fetch("/data/contacts.json")
  .then(function (r) { return r.json(); })
  .then(function (d) {
    var cls = d.committee.map(function (o) { return personCard(o, {}); }).concat(
      d.groups.map(function (o) { return personCard(o, {}); })
    ).join("");
    document.getElementById("ccClass").innerHTML = cls;
    document.getElementById("ccHospital").innerHTML = d.hospital.map(hospCard).join("");
  })
  .catch(function () {
    document.getElementById("ccClass").innerHTML = '<div class="cc-empty">联络数据加载失败，请刷新重试</div>';
  });

// 实时搜索
document.getElementById("ccSearch").addEventListener("input", function (e) {
  var q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".cc-card").forEach(function (card) {
    var key = (card.dataset.key || "").toLowerCase();
    card.classList.toggle("hidden", q && key.indexOf(q) < 0);
  });
});