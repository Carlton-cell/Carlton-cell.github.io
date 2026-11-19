/* 官网滚动渐入动画：元素进入视口时淡入上浮 */
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  // 老浏览器兜底：直接全部显示
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target); // 只播放一次
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  els.forEach(function (el) { io.observe(el); });
})();

/* ---------- 活动相册：横向滑动画廊 + 全屏灯箱 ---------- */
var photoState = { photos: [], index: 0, title: '' };

function openLightbox(photos, index, title) {
  photoState.photos = photos;
  photoState.index = index;
  photoState.title = title;
  updateLightbox();
  document.getElementById('lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateLightbox() {
  document.getElementById('lbImg').src = photoState.photos[photoState.index];
  document.getElementById('lbCaption').textContent =
    photoState.title + ' · ' + (photoState.index + 1) + ' / ' + photoState.photos.length;
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lbImg').src = '';
  document.body.style.overflow = '';
}

function stepLightbox(step) {
  var n = photoState.photos.length;
  if (!n) return;
  photoState.index = (photoState.index + step + n) % n;
  updateLightbox();
}

(function () {
  var wall = document.getElementById('photoWall');
  if (!wall) return;

  fetch('/photos/manifest.json')
    .then(function (r) { return r.json(); })
    .then(function (albums) {
      wall.innerHTML = '';
      albums.forEach(function (album) {
        var photos = [];
        for (var i = 1; i <= album.count; i++) photos.push('/photos/' + album.slug + '/' + i + '.jpg');

        var box = document.createElement('div');
        box.className = 'album reveal';
        box.innerHTML =
          '<div class="album-head"><h3>' + album.title + '</h3>' +
          '<span>活动照片共 ' + album.total + ' 张 · 左右滑动</span></div>' +
          '<div class="album-track">' +
          photos.map(function (p, i) {
            return '<div class="album-card" data-i="' + i + '"><img loading="lazy" src="' + p + '" alt="' + album.title + '"></div>';
          }).join('') +
          '</div>';

        box.querySelector('.album-track').addEventListener('click', function (e) {
          var card = e.target.closest('.album-card');
          if (card) openLightbox(photos, Number(card.dataset.i), album.title);
        });
        wall.appendChild(box);

        // 新增的相册元素也纳入渐入动画
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (en) {
              if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
            });
          }, { threshold: 0.08 }).observe(box);
        } else {
          box.classList.add('visible');
        }
      });
    })
    .catch(function () {
      wall.innerHTML = '<div class="board-loading">照片加载失败，请刷新重试</div>';
    });

  // 灯箱控制
  var lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lb.querySelector('.lb-prev').addEventListener('click', function () { stepLightbox(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { stepLightbox(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
  // 手机左右滑动
  var sx = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
