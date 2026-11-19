/* 主页面逻辑：首页 -> 答题 -> 成绩 */
var $ = function (id) { return document.getElementById(id); };
var viewHome = $('view-home'), viewQuiz = $('view-quiz'), viewResult = $('view-result');
var nameInput = $('nameInput'), startBtn = $('startBtn');
var progressBar = $('progressBar'), quizIndex = $('quizIndex'), quizCategory = $('quizCategory');
var questionText = $('questionText'), optionsWrap = $('optionsWrap');
var prevBtn = $('prevBtn'), nextBtn = $('nextBtn');
var scoreNum = $('scoreNum'), scoreTotal = $('scoreTotal');
var rankNum = $('rankNum'), participantNum = $('participantNum');
var backHomeBtn = $('backHomeBtn'), toast = $('toast');

var questions = [], current = 0, answers = [], startedAt = 0, submitting = false;
var toastTimer = null;

// 题库集：URL 带 ?set=fraud / ?set=politics 时进入对应专项答题
var urlParams = new URLSearchParams(location.search);
var SET = urlParams.get('set') === 'fraud' ? 'fraud' : urlParams.get('set') === 'politics' ? 'politics' : 'main';
var SET_SUFFIX = SET === 'main' ? '' : '?set=' + SET;
var BADGE_TEXT = { main: '知识竞赛进行中', fraud: '防诈专项答题', politics: '时政专项答题' };
(function () {
  var badge = document.querySelector('.hero-badge');
  if (badge && SET !== 'main') badge.textContent = BADGE_TEXT[SET] || badge.textContent;
})();
document.querySelectorAll('a[href="/leaderboard.html"]').forEach(function (a) {
  a.href = '/leaderboard.html' + SET_SUFFIX;
});

function toastMsg(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.add('hidden'); }, 2200);
}

function showView(v) {
  [viewHome, viewQuiz, viewResult].forEach(function (x) { x.classList.add('hidden'); });
  v.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- 首页 ---------- */
// 演示降级模式：接口不可用时改用静态题库（含答案，本地判分）
var LOCAL_MODE = false;
function loadQuestions() {
  return fetch('/api/questions' + SET_SUFFIX)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.questions || !data.questions.length) throw new Error('empty');
      LOCAL_MODE = false;
      return data.questions;
    })
    .catch(function () {
      return fetch('/data/' + SET + '-questions.json')
        .then(function (r) { return r.json(); })
        .then(function (full) {
          LOCAL_MODE = true;
          return full;
        });
    });
}

startBtn.addEventListener('click', function () {
  var name = (nameInput.value || '').trim();
  if (!name) { toastMsg('请先输入姓名'); nameInput.focus(); return; }
  sessionStorage.setItem('quizName', name);
  startBtn.disabled = true;
  loadQuestions()
    .then(function (qs) {
      questions = qs;
      answers = questions.map(function () { return null; });
      current = 0;
      startedAt = Date.now();
      renderQuestion();
      showView(viewQuiz);
    })
    .catch(function () { toastMsg('题目加载失败，请刷新重试'); })
    .finally(function () { startBtn.disabled = false; });
});

nameInput.addEventListener('keyup', function (e) {
  if (e.key === 'Enter') startBtn.click();
});

/* ---------- 答题 ---------- */
function renderQuestion() {
  var q = questions[current];
  quizIndex.textContent = '第 ' + (current + 1) + ' / ' + questions.length + ' 题';
  quizCategory.textContent = q.category || '';
  questionText.textContent = q.question;
  progressBar.style.width = (current / questions.length * 100) + '%';

  optionsWrap.innerHTML = '';
  var keys = ['A', 'B', 'C', 'D', 'E', 'F'];
  q.options.forEach(function (opt, i) {
    var div = document.createElement('div');
    div.className = 'option' + (answers[current] === i ? ' selected' : '');
    div.innerHTML = '<span class="option-key">' + keys[i] + '</span><span>' + escapeHtml(opt) + '</span>';
    div.addEventListener('click', function () {
      answers[current] = i;
      renderQuestion();
      if (current < questions.length - 1) {
        setTimeout(function () { current++; renderQuestion(); }, 180);
      }
    });
    optionsWrap.appendChild(div);
  });

  prevBtn.disabled = current === 0;
  nextBtn.textContent = (current === questions.length - 1) ? '提交答卷' : '下一题';
}

prevBtn.addEventListener('click', function () {
  if (current > 0) { current--; renderQuestion(); }
});

nextBtn.addEventListener('click', function () {
  if (current < questions.length - 1) { current++; renderQuestion(); return; }
  submitAnswers();
});

// 演示快照榜单（静态托管时用于计算名次）
var SNAPSHOT_BOARD = {
  politics: [
    { name: '苏硕', score: 20, usedMs: 203000 }, { name: '张晓葉', score: 19, usedMs: 188000 },
    { name: '张文慧', score: 19, usedMs: 245000 }, { name: '刘鑫璇', score: 18, usedMs: 272000 },
    { name: '兰婕', score: 18, usedMs: 314000 }, { name: '王文轩', score: 17, usedMs: 288000 },
    { name: '丁凤阳', score: 17, usedMs: 366000 }
  ],
  fraud: [
    { name: '张晓葉', score: 20, usedMs: 231000 }, { name: '苏硕', score: 19, usedMs: 267000 },
    { name: '张文慧', score: 19, usedMs: 196000 }, { name: '兰婕', score: 19, usedMs: 243000 },
    { name: '刘鑫璇', score: 19, usedMs: 258000 }, { name: '王文轩', score: 18, usedMs: 351000 },
    { name: '丁凤阳', score: 18, usedMs: 327000 }
  ],
  main: [{ name: '班级同学', score: 25, usedMs: 300000 }]
};

function showResult(score, total, rank, participants) {
  scoreNum.textContent = score;
  scoreTotal.textContent = total;
  rankNum.textContent = rank ? '第 ' + rank + ' 名' : '-';
  participantNum.textContent = participants;
  progressBar.style.width = '100%';
  if (SET === 'fraud') {
    location.href = '/leaderboard.html?set=fraud';
    return;
  }
  showView(viewResult);
}

function submitAnswers() {
  if (submitting) return;
  var unanswered = answers.filter(function (a) { return a === null; }).length;
  if (unanswered > 0) {
    if (!confirm('还有 ' + unanswered + ' 题未作答，确定要提交吗？')) return;
  }
  submitting = true;
  nextBtn.disabled = true;
  fetch('/api/submit' + SET_SUFFIX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: sessionStorage.getItem('quizName') || '同学',
      answers: answers,
      startedAt: startedAt
    })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) { toastMsg(data.error); return; }
      showResult(data.score, data.total, data.rank, data.participants);
    })
    .catch(function () {
      // 降级：本地判分 + 快照名次
      if (!questions[0] || typeof questions[0].answer !== 'number') {
        toastMsg('提交失败，请重试');
        return;
      }
      var score = 0;
      questions.forEach(function (q, i) { if (answers[i] === q.answer) score += 1; });
      var board = SNAPSHOT_BOARD[SET] || [];
      var better = board.filter(function (b) {
        return b.score > score || (b.score === score && b.usedMs < Date.now() - startedAt);
      }).length;
      showResult(score, questions.length, better + 1, board.length + 1);
    })
    .finally(function () { submitting = false; nextBtn.disabled = false; });
}

/* ---------- 成绩 ---------- */
backHomeBtn.addEventListener('click', function () {
  showView(viewHome);
});
