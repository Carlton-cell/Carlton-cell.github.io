/* 心晴互助平台：弹幕循环 + 实时互通 + 词云统计 */
var PRESETS = [
  "今天也是元气满满的一天！","实验顺利，细胞状态真好看","导师今天夸了我，开心！",
  "规培轮转虽然累，但学到了好多","同门帮我看了 Western blot，感动","文献读不下去时，去操场跑两圈",
  "夜班结束看到日出，觉得一切都值了","课题卡住没关系，休息一下再战","和大家一起进步，真好",
  "今天的病人说谢谢，心里暖暖的","食堂新出的菜还不错！","DDL 是第一生产力（笑）",
  "焦虑的时候，写下三件小确幸","答辩顺利，天道酬勤！","睡眠是稀缺资源，但要努力争取",
  "实验室的灯光，也是星光","保持热爱，奔赴山海","累了就休息，我们不是机器",
  "运动完真的会心情变好","给爸妈打了个电话，满血复活","SCI 返修意见很友好，稳住",
  "帮师妹搭了 qPCR，很充实","心情低落时，找朋友聊聊就好","压力是常态，但我们可以互相撑伞",
  "把大目标切成小任务，就没那么难","今天早点睡，晚安","情绪没有好坏，允许自己偶尔emo",
  "求助不是软弱，是智慧","你不是一个人在战斗","坚持写实验记录，未来会感谢自己",
  "图书馆靠窗的位置yyds","阳光好的日子，记得抬头看看天","多和同门交流，思路就打开了",
  "科研很苦，但我们很甜","呼吸，放空，再出发","今天的小进步，值得表扬"
];
var KEYWORDS = ["实验","SCI","导师","规培","夜班","同门","文献","课题","答辩","运动","睡眠",
  "焦虑","情绪","压力","心情","病人","食堂","图书馆","咖啡","爸妈","朋友","进步","坚持","休息",
  "帮助","温暖"," Cells","细胞","论文","健康","希望","小确幸","科研","emo"];
var COLORS = ["#7fd0c5","#E8A33D","#b39ddb","#5cc8be","#f0a58a","#8fd4cc"];

var stage = document.getElementById("careStage");
var cloudBox = document.getElementById("careCloud");
var input = document.getElementById("careInput");
var sendBtn = document.getElementById("careSend");
var LANES = 6;
var laneLast = [];
for (var i = 0; i < LANES; i++) laneLast.push(0);
var queue = [];
var userMsgs = [];   // 服务器上的真实弹幕
var lastId = 0;
var presetIdx = 0;

// 打乱预置池
var pool = PRESETS.slice().sort(function () { return Math.random() - 0.5; });

function spawn(text, mine) {
  var now = Date.now();
  var lane = 0, best = Infinity;
  for (var i = 0; i < LANES; i++) { if (laneLast[i] < best) { best = laneLast[i]; lane = i; } }
  laneLast[lane] = now;
  var el = document.createElement("div");
  el.className = "danmaku" + (mine ? " mine" : "");
  el.textContent = text;
  el.style.top = (10 + lane * 50) + "px";
  el.style.setProperty("--d", (14 + Math.random() * 6) + "s");
  stage.appendChild(el);
  el.addEventListener("animationend", function () { el.remove(); });
}

function buildCloud() {
  var allText = pool.join(" ") + " " + userMsgs.map(function (m) { return m.text; }).join(" ");
  var counts = {};
  KEYWORDS.forEach(function (k) {
    var m = allText.match(new RegExp(k, "gi"));
    if (m) counts[k] = m.length;
  });
  var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 18);
  var max = top.length ? counts[top[0]] : 1;
  cloudBox.innerHTML = top.map(function (w, i) {
    var size = 13 + Math.round(counts[w] / max * 17);
    return '<span class="cloud-word" style="font-size:' + size + 'px;color:' +
      COLORS[i % COLORS.length] + ';animation-delay:' + (i * 0.05) + 's">' + w + "</span>";
  }).join("");
}

function tick() {
  if (queue.length) { spawn(queue.shift(), false); }
  else {
    spawn(pool[presetIdx % pool.length], false);
    presetIdx++;
  }
  setTimeout(tick, 1800 + Math.random() * 1400);
}
// 拉取服务器弹幕（其他同学发的）
function fetchMsgs() {
  fetch("/api/danmaku?since=" + lastId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      (data.messages || []).forEach(function (m) {
        if (m.id > lastId) lastId = m.id;
        userMsgs.push(m);
        queue.push(m.text);
      });
      document.getElementById("careCount").textContent = PRESETS.length + userMsgs.length;
      buildCloud();
    })
    .catch(function () {});
}
fetchMsgs();
setInterval(fetchMsgs, 6000);

// 发送自己的弹幕
function sendMine() {
  var text = (input.value || "").trim();
  if (!text) { input.focus(); return; }
  input.value = "";
  fetch("/api/danmaku", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text })
  }).then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        userMsgs.push(data.message);
        lastId = Math.max(lastId, data.message.id);
        spawn(text, true);
        document.getElementById("careCount").textContent = PRESETS.length + userMsgs.length;
        buildCloud();
      }
    }).catch(function () { spawn(text, true); });
}
sendBtn.addEventListener("click", sendMine);
input.addEventListener("keyup", function (e) { if (e.key === "Enter") sendMine(); });

// 启动
for (var s = 0; s < 4; s++) setTimeout(function () { spawn(pool[presetIdx++ % pool.length], false); }, s * 900);
buildCloud();
document.getElementById("careCount").textContent = PRESETS.length;
setTimeout(tick, 2500);