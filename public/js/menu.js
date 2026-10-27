// Menu utama Math Hero: Mulai Baru (isi nama), Lanjutkan, dan Papan Juara.
// Juga klien penyimpanan (window.Store) yang bicara ke API lokal di server (SQLite).
// Nama diisi lewat papan huruf di layar (tanpa keyboard HP, agar layar tidak bergeser); keyboard laptop juga bisa dipakai.
(function () {
  const $ = (id) => document.getElementById(id);
  const splash = $('splash');
  const mainBox = $('menu-main');
  const nameBox = $('menu-name');
  const pick = $('menu-pick');
  const hs = $('menu-hs');
  const heroBox = $('menu-hero');
  const creditBox = $('menu-credit');
  const msg = $('menu-msg');
  const NAME_MAX = 6;
  let player = null;   // { id, nama } pemain yang sedang bermain
  let typed = '';      // huruf nama yang sedang diisi
  let busy = false;    // mencegah ketukan ganda saat menunggu server

  // Mode penyimpanan: server API (SQLite) jika ada; jika tidak ada (hosting statis seperti GitHub Pages/Netlify),
  // otomatis pindah ke LocalApi (localStorage di browser). Pilihan diingat selama halaman terbuka.
  // Hosting statis (GitHub Pages, file://) tidak punya server API: langsung pakai penyimpanan lokal tanpa memanggil /api.
  let useLocal = /(^|\.)github\.io$/.test(location.hostname) || location.protocol === 'file:';

  async function api(method, url, body) {
    if (useLocal && window.LocalApi) return window.LocalApi.handle(method, url, body);
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opt.body = JSON.stringify(body);
    let r;
    try {
      r = await fetch(url, opt);
    } catch (e) {
      // Galat jaringan: tanpa server API, pakai penyimpanan lokal bila tersedia.
      if (window.LocalApi) { useLocal = true; return window.LocalApi.handle(method, url, body); }
      throw e;
    }
    // Server statis menjawab 404/405 dengan halaman HTML, bukan JSON: berarti tidak ada API.
    const isJson = (r.headers.get('content-type') || '').includes('application/json');
    if (!isJson && window.LocalApi) { useLocal = true; return window.LocalApi.handle(method, url, body); }
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Gagal');
    return data;
  }

  function say(text) { msg.textContent = text || ''; }

  let heroTimer = null;  // animasi kartu karakter
  let hsTimer = null;    // animasi avatar di papan juara
  let trioTimer = null;  // animasi tiga karakter di halaman awal
  function stopTimers() { clearInterval(heroTimer); clearInterval(hsTimer); }

  // Halaman awal: tiga karakter berdiri dan melompat bergantian di bawah tombol.
  const TRIO_ANIMS = ['idle', 'run', 'idle'];
  function buildTrio() {
    const box = $('hero-trio');
    if (box.childElementCount) return;
    for (let n = 1; n <= 3; n++) {
      const cv = document.createElement('canvas');
      cv.width = 32; cv.height = 32;
      cv.className = 'trio-hero trio-' + n;
      box.appendChild(cv);
    }
  }
  function startTrio() {
    buildTrio();
    const cvs = document.querySelectorAll('#hero-trio canvas');
    const A = window.Assets;
    const paint = () => {
      const t = performance.now() / 1000;
      cvs.forEach((cv, i) => paintHero(cv, i + 1, t, TRIO_ANIMS[i]));
    };
    A.onReady(() => { if (splash.dataset.panel !== 'main') return; clearInterval(trioTimer); paint(); trioTimer = setInterval(paint, 100); });
  }

  function showPanel(which) {
    if (which !== 'hero' && which !== 'hs') stopTimers();
    clearInterval(trioTimer);
    splash.dataset.panel = which; // CSS memakai ini untuk meringkas layar saat panel bukan menu utama
    if (which === 'main') startTrio();
    mainBox.classList.toggle('hidden', which !== 'main');
    creditBox.classList.toggle('hidden', which !== 'credit');
    nameBox.classList.toggle('hidden', which !== 'name');
    pick.classList.toggle('hidden', which !== 'pick');
    hs.classList.toggle('hidden', which !== 'hs');
    heroBox.classList.toggle('hidden', which !== 'hero');
    splash.dataset.panel = which; // CSS memakai ini untuk meringkas layar saat panel bukan menu utama
  }

  function fail() {
    say('Penyimpanan belum tersedia. Pastikan server berjalan lewat run.bat.');
  }

  // Galat dari server (mis. nama tidak pantas) ditampilkan apa adanya; galat jaringan memakai pesan umum.
  function showError(e) {
    if (e instanceof TypeError) fail(); else say(e.message);
  }

  // Karakter untuk baris lama yang belum mencatat hero: dipilih tetap dari namanya agar tampilan tidak berubah-ubah.
  function heroFor(nama, hero) {
    if (hero >= 1 && hero <= 3) return hero;
    let sum = 0;
    for (const ch of String(nama)) sum += ch.charCodeAt(0);
    return (sum % 3) + 1;
  }

  // Gambar satu frame sprite karakter ke canvas 32x32 (diperbesar lewat CSS dengan image-rendering: pixelated).
  function paintHero(cv, hero, t, anim) {
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    const name = `hero${hero}_${anim || 'idle'}`;
    window.Assets.draw(g, name, window.Assets.at(name, t, 10), 0, 0, 1, false);
  }

  // Dipakai main.js untuk mencatat progres dan skor.
  window.Store = {
    get player() { return player; },
    // Setiap awal area: simpan checkpoint agar bisa dilanjutkan.
    onAreaStart(index, score) {
      if (!player) return;
      api('PUT', `/api/progress/${player.id}`, { area: index + 1, skor: score, hero: window.__mathHero.game.hero }).catch(() => {});
    },
    // Saat kalah atau tamat: catat skor (beserta karakter yang dipakai) dan hapus checkpoint.
    onSessionEnd(hasil) {
      if (!player) return;
      const g = window.__mathHero.game;
      const w = window.__mathHero.world;
      api('POST', '/api/scores', { playerId: player.id, skor: g.score, area: w.areaIndex + 1, hasil, hero: g.hero }).catch(() => {});
      api('DELETE', `/api/progress/${player.id}`).catch(() => {});
      // Papan skor bersama (opsional, lihat js/scores.js): gagal atau belum dikonfigurasi tidak mengganggu game.
      if (window.Scores) window.Scores.submit('math-hero', 'mh1', player.nama, g.score, { area: w.areaIndex + 1, hasil, hero: g.hero || 0 });
    },
  };

  function goMenu() {
    player = null;
    say('');
    showPanel('main');
    window.__mathHero.showMenu();
  }

  // ---------- Isi nama ----------
  function buildKeys() {
    const keys = $('name-keys');
    keys.innerHTML = '';
    for (let c = 65; c <= 90; c++) {
      const ch = String.fromCharCode(c);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch;
      b.setAttribute('aria-label', `Huruf ${ch}`);
      b.addEventListener('click', () => addLetter(ch));
      keys.appendChild(b);
    }
  }

  function renderName() {
    const slots = $('name-slots');
    slots.innerHTML = '';
    for (let i = 0; i < NAME_MAX; i++) {
      const s = document.createElement('span');
      s.className = 'slot' + (i === typed.length ? ' cursor' : '');
      s.textContent = typed[i] || '';
      slots.appendChild(s);
    }
    $('name-ok').disabled = typed.length === 0;
    slots.setAttribute('aria-label', typed ? `Namamu: ${typed.split('').join(' ')}` : 'Namamu masih kosong');
  }

  function addLetter(ch) {
    if (typed.length >= NAME_MAX) return;
    typed += ch;
    say('');
    renderName();
  }

  function delLetter() {
    typed = typed.slice(0, -1);
    say('');
    renderName();
  }

  function openName() {
    say('');
    typed = '';
    renderName();
    showPanel('name');
  }

  async function confirmName() {
    if (busy || typed.length === 0) return;
    busy = true;
    try {
      const res = await api('POST', '/api/players', { nama: typed });
      player = res.player;
      await api('DELETE', `/api/progress/${player.id}`);
      openHero(0, 0);
    } catch (e) {
      showError(e);
    } finally {
      busy = false;
    }
  }

  // Keyboard laptop: huruf, Backspace, Enter. Hanya aktif saat panel nama tampil.
  document.addEventListener('keydown', (e) => {
    if (nameBox.classList.contains('hidden') || splash.classList.contains('hidden')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { addLetter(e.key.toUpperCase()); e.preventDefault(); }
    else if (e.key === 'Backspace') { delLetter(); e.preventDefault(); }
    else if (e.key === 'Enter') { confirmName(); e.preventDefault(); }
  });

  // ---------- Pilih karakter ----------
  // Langkah pilih karakter: tiga pahlawan dengan animasi diam, ketuk untuk mulai.
  const HERO_NAMES = ['Anak Berani', 'Robo Kuning', 'Rubah Lincah'];
  function openHero(level, score) {
    const list = $('hero-list');
    list.innerHTML = '';
    const cards = [];
    for (let n = 1; n <= 3; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hero-card' + (window.__mathHero.game.hero === n ? ' chosen' : '');
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const label = document.createElement('span');
      label.textContent = HERO_NAMES[n - 1];
      b.append(cv, label);
      b.addEventListener('click', () => {
        stopTimers();
        window.__mathHero.startGame(level, score, n);
      });
      list.appendChild(b);
      cards.push(cv);
    }
    stopTimers();
    const A = window.Assets;
    let t = 0;
    const paint = () => {
      t += 0.1;
      cards.forEach((cv, i) => {
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, 64, 64);
        A.draw(g, `hero${i + 1}_idle`, A.at(`hero${i + 1}_idle`, t, 10), 0, 0, 2, false);
      });
    };
    A.onReady(() => { paint(); heroTimer = setInterval(paint, 100); });
    showPanel('hero');
  }

  // ---------- Lanjutkan ----------
  async function openContinue() {
    say('');
    const d = await api('GET', '/api/players');
    const ready = d.players.filter((p) => p.punya_progres);
    if (ready.length === 0) {
      say('Belum ada permainan yang bisa dilanjutkan. Yuk mulai baru!');
      return;
    }
    $('pick-title').textContent = 'Lanjutkan permainan siapa?';
    const list = $('pick-list');
    list.innerHTML = '';
    for (const p of ready) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'secondary pick-item';
      const cv = document.createElement('canvas');
      cv.className = 'pick-avatar'; cv.width = 32; cv.height = 32;
      const label = document.createElement('span');
      label.textContent = `${String(p.nama).toUpperCase()} (Level ${p.area_progres})`;
      b.append(cv, label);
      window.Assets.onReady(() => paintHero(cv, heroFor(p.nama, p.hero), 0));
      b.addEventListener('click', () => {
        Promise.resolve().then(async () => {
          player = { id: p.id, nama: p.nama };
          const prog = (await api('GET', `/api/progress/${p.id}`)).progress;
          if (prog.hero) window.__mathHero.setHero(prog.hero); // karakter terakhir terpilih lebih dulu
          openHero(prog.area - 1, prog.skor);
        }).catch(showError);
      });
      list.appendChild(b);
    }
    showPanel('pick');
  }

  // ---------- Papan Juara ----------
  async function openHighscore() {
    say('');
    let d;
    let online = false;
    // Utamakan papan bersama (Firebase). Hanya jika tidak tersedia, pakai API server lokal atau skor di HP ini.
    const shared = window.Scores ? await window.Scores.top('math-hero', 'mh1', 10) : null;
    if (shared) {
      online = true;
      d = { scores: shared.map((r) => ({ nama: r.name, skor: r.score, area: r.meta.area || 1, hasil: r.meta.hasil || 'kalah', hero: r.meta.hero || null })) };
    } else {
      d = await api('GET', '/api/highscores');
    }
    const list = $('hs-list');
    list.innerHTML = '';
    stopTimers();
    const avatars = [];
    if (d.scores.length === 0) {
      const li = document.createElement('li');
      li.className = 'hs-empty';
      li.textContent = 'Belum ada juara. Ayo jadi yang pertama!';
      list.appendChild(li);
    }
    d.scores.forEach((s, i) => {
      const rank = i + 1;
      const li = document.createElement('li');
      li.className = 'hs-row' + (rank <= 3 ? ` rank-${rank}` : '');
      const badge = document.createElement('span');
      badge.className = 'hs-rank';
      badge.textContent = String(rank);
      const cv = document.createElement('canvas');
      cv.className = 'hs-avatar'; cv.width = 32; cv.height = 32;
      cv.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'hs-name';
      name.textContent = String(s.nama).toUpperCase();
      const score = document.createElement('span');
      score.className = 'hs-score';
      const pts = document.createElement('b');
      pts.textContent = Number(s.skor).toLocaleString('id-ID');
      const note = document.createElement('small');
      note.textContent = s.hasil === 'tamat' ? 'Tamat!' : `Level ${s.area}`;
      score.append(pts, note);
      li.append(badge, cv, name, score);
      list.appendChild(li);
      avatars.push({ cv, hero: heroFor(s.nama, s.hero), champ: rank === 1 });
    });
    let t = 0;
    const paint = () => {
      t += 0.1;
      // Juara 1 bersalto (animasi lompat ganda), lainnya berdiri.
      avatars.forEach((a) => paintHero(a.cv, a.hero, t, a.champ ? 'double_jump' : 'idle'));
    };
    window.Assets.onReady(() => { paint(); if (avatars.length) hsTimer = setInterval(paint, 100); });
    showPanel('hs');
    if (window.Scores && window.Scores.enabled()) say(online ? '' : 'Tidak terhubung. Menampilkan skor di HP ini.');
  }

  buildKeys();
  renderName();
  $('btn-start').addEventListener('click', openName);
  $('btn-continue').addEventListener('click', () => openContinue().catch(fail));
  $('btn-highscore').addEventListener('click', () => openHighscore().catch(fail));
  $('name-del').addEventListener('click', delLetter);
  $('name-ok').addEventListener('click', confirmName);
  $('name-back').addEventListener('click', () => showPanel('main'));
  $('pick-back').addEventListener('click', () => showPanel('main'));
  $('hero-back').addEventListener('click', () => { stopTimers(); showPanel('main'); });
  $('hs-back').addEventListener('click', () => showPanel('main'));
  $('btn-credit').addEventListener('click', () => showPanel('credit'));
  $('credit-back').addEventListener('click', () => showPanel('main'));
  $('btn-retry').addEventListener('click', goMenu);
  $('btn-again').addEventListener('click', goMenu);
  showPanel('main');

  window.Menu = { goMenu };
})();
