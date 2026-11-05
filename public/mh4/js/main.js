// Math Hero 4: bootstrap halaman. Menghubungkan generator, simulasi, renderer, kontrol,
// dan gerbang matematika. Tanpa build step, semua lewat global window.MH4.
(function () {
  const Sim = window.MH4.sim;
  const Levels = window.MH4.levels;
  const Themes = window.MH4.themes;
  const Scene = window.MH4.scene;
  const Progress = window.MH4.progress;
  const Shop = window.MH4.shop;
  const Cloud = window.MH4.cloud;
  const Audio = window.MH4.audio;
  const playSfx = (name) => { if (Audio) Audio.sfx(name); };
  const Bank = window.MHKit && window.MHKit.bank;

  if (Bank && window.MH2Concepts) Bank.useConcepts(window.MH2Concepts);

  const canvas = document.getElementById('game');
  const modal = document.getElementById('modal');
  const winBox = document.getElementById('win');
  const qtext = document.getElementById('qtext');
  const choicesEl = document.getElementById('choices');
  const feedbackEl = document.getElementById('feedback');
  const winStars = document.getElementById('winstars');
  const winText = document.getElementById('wintext');
  const winCoins = document.getElementById('wincoins');
  const coinsEl = document.getElementById('coins');
  const shopEl = document.getElementById('shop');
  const shopBody = document.getElementById('shopbody');
  const shopCoins = document.getElementById('shopcoins');
  const shopStatus = document.getElementById('shopstatus');
  const soundBtn = document.getElementById('sound');
  const menuEl = document.getElementById('menu');
  const rotateEl = document.getElementById('rotate');

  const input = { left: false, right: false, up: false, down: false, jump: false, attack: false, switch: false };
  let viewer = null;
  let level = null, game = null, idx = 0;
  let paused = false, time = 0, toast = '', toastT = 0, last = 0;
  let wasPaused = false;
  let currentQ = null;
  let profile = Progress.loadLocal() || Progress.newProfile('PEMAIN');
  let cloudNote = '';

  const defFor = (i) => Levels.ALL[Math.max(0, Math.min(Levels.ALL.length - 1, i))];
  const isOpen = (el) => !el.classList.contains('hidden');

  // Game berjeda selama ada lapisan terbuka, jadi tiap lapisan cukup buka/tutup dirinya.
  function syncPause() {
    paused = isOpen(modal) || isOpen(winBox) || isOpen(shopEl) || isOpen(menuEl) || isOpen(rotateEl);
    if (paused) clearInput();
  }

  function clearInput() {
    input.left = input.right = input.up = input.down = input.jump = input.attack = input.switch = false;
    document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down'));
  }

  function say(text) { toast = text; toastT = 2.2; }

  function buatSoal() {
    const skill = level.tier <= 0 ? 'garis.tambah' : level.tier === 1 ? 'garis.loncat' : 'garis.puluhan';
    const tingkat = Math.min(3, level.tier + 1);
    const seed = (level.seed * 131 + game.L.gateCol * 17 + 1) >>> 0;
    if (Bank) {
      try { return Bank.soal(skill, tingkat, Bank.rng(seed)); } catch (e) { /* jatuh ke soal cadangan */ }
    }
    return { teks: `${3 + level.id} + ${4 + level.id} = ?`, ekspresi: `${3 + level.id} + ${4 + level.id} = ?`, jawaban: 7 + 2 * level.id, pilihan: null, langkah: ['Hitung satu per satu.'] };
  }

  function pilihanUntuk(q) {
    if (q.pilihan && q.pilihan.length) return q.pilihan.slice();
    const a = q.jawaban, out = [a];
    for (let d = 1; out.length < 4; d++) { out.push(a + d); out.push(a - d); }
    return out.slice(0, 4).sort((x, y) => ((x * 7919 + level.seed) % 13) - ((y * 7919 + level.seed) % 13));
  }

  function showGate() {
    currentQ = buatSoal();
    qtext.textContent = currentQ.ekspresi || currentQ.teks || '...';
    choicesEl.innerHTML = '';
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';
    const vals = pilihanUntuk(currentQ);
    for (const v of vals) {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = String(v);
      b.addEventListener('click', () => jawab(b, v));
      choicesEl.appendChild(b);
    }
    modal.classList.remove('hidden');
    syncPause();
  }

  function jawab(btn, val) {
    const benar = Bank ? Bank.periksa(currentQ, val) : val === currentQ.jawaban;
    if (benar) {
      Sim.openGate(game);
      modal.classList.add('hidden');
      syncPause();
      say('Gerbang terbuka!');
      return;
    }
    btn.classList.add('wrong');
    btn.disabled = true;
    if (Audio) playSfx('salah');
    const hint = (currentQ.langkah && currentQ.langkah[0]) || (currentQ.petunjuk && currentQ.petunjuk[0]) || 'Coba hitung sekali lagi, ya.';
    feedbackEl.textContent = 'Belum tepat. ' + hint;
  }

  const SLOT_NAMES = { pedang: 'Pedang', blaster: 'Blaster', armor: 'Armor', jimat: 'Jimat' };

  function persistProfile() {
    Progress.saveLocal(profile);
    refreshCoins();
    if (Cloud) Cloud.save(profile).catch(() => {});
  }

  function refreshCoins() {
    const text = `Koin ${profile.koin}`;
    coinsEl.textContent = text;
    shopCoins.textContent = text;
  }

  function refreshChips() {
    document.querySelectorAll('[data-level]').forEach((b) => {
      b.disabled = !Progress.unlocked(profile, Number(b.dataset.level));
      b.title = b.disabled ? 'Selesaikan level sebelumnya dulu' : '';
    });
  }

  function refreshAll() {
    refreshCoins();
    refreshChips();
    if (!shopEl.classList.contains('hidden')) renderShop();
  }

  function renderShop() {
    shopBody.innerHTML = '';
    for (const slot of Shop.SLOTS) {
      const sec = document.createElement('div');
      sec.className = 'shopslot';
      const h = document.createElement('h3');
      h.textContent = SLOT_NAMES[slot];
      sec.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'shopgrid';
      for (const item of Shop.bySlot(slot)) {
        const owned = profile.owned.indexOf(item.id) >= 0;
        const equipped = profile.equipped[slot] === item.id;
        const box = document.createElement('div');
        box.className = 'shopitem' + (equipped ? ' on' : '');
        const nm = document.createElement('div');
        nm.className = 'nm'; nm.textContent = item.nama;
        const ds = document.createElement('div');
        ds.className = 'ds'; ds.textContent = item.desc;
        const pr = document.createElement('div');
        pr.className = 'pr';
        pr.textContent = owned ? (equipped ? 'Terpasang' : 'Sudah dimiliki') : `${item.price} koin`;
        const btn = document.createElement('button');
        if (equipped) { btn.textContent = 'Terpasang'; btn.className = 'equipped'; btn.disabled = true; }
        else if (owned) { btn.textContent = 'Pasang'; }
        else {
          btn.textContent = 'Beli';
          btn.disabled = profile.koin < item.price;
        }
        btn.addEventListener('click', () => {
          const res = owned ? Progress.equip(profile, item.id) : Progress.buy(profile, item.id);
          if (!res.ok) {
            shopStatus.textContent = res.reason === 'koin-kurang'
              ? `Koin kurang ${res.kurang}. Kumpulkan bintang dan peti.`
              : 'Item ini belum bisa dipakai.';
            return;
          }
          shopStatus.textContent = owned ? `${item.nama} terpasang.` : `${item.nama} dibeli dan terpasang.`;
          // Efek equipment langsung terasa di level yang sedang berjalan.
          if (game) Sim.applyLoadout(game, Progress.loadout(profile));
          persistProfile();
          const msg = shopStatus.textContent;
          renderShop();
          shopStatus.textContent = msg;
        });
        box.appendChild(nm); box.appendChild(ds); box.appendChild(pr); box.appendChild(btn);
        grid.appendChild(box);
      }
      sec.appendChild(grid);
      shopBody.appendChild(sec);
    }
    refreshCoins();
    shopStatus.textContent = cloudNote || 'Pilih item untuk dibeli, lalu pasang.';
  }

  function openShop() {
    playSfx('klik');
    shopEl.classList.remove('hidden');
    syncPause();
    renderShop();
  }

  function closeShop() {
    playSfx('klik');
    shopEl.classList.add('hidden');
    syncPause();
    refreshAll();
  }

  function openMenu() {
    playSfx('klik');
    refreshAll();
    menuEl.classList.remove('hidden');
    syncPause();
  }

  function closeMenu() {
    playSfx('klik');
    menuEl.classList.add('hidden');
    syncPause();
  }

  function startLevel(i, force) {
    const target = defFor(i);
    if (!force && !Progress.unlocked(profile, target.id)) {
      say('Selesaikan level sebelumnya dulu!');
      return;
    }
    idx = Levels.ALL.indexOf(target);
    level = target;
    game = Sim.create(level, { loadout: Progress.loadout(profile) });
    viewer = Scene.create(canvas, Themes.get(level.tema), level.bossDef);
    toastT = 0;
    clearInput();
    modal.classList.add('hidden');
    shopEl.classList.add('hidden');
    winBox.classList.add('hidden');
    menuEl.classList.add('hidden');
    syncPause();
    refreshChips();
    document.querySelectorAll('[data-level]').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.level) === level.id);
    });
    refreshCoins();
    if (Audio) {
      const track = level.bossDef
        ? (level.bossDef.id === 'raja-bandit' ? 'final' : 'bos')
        : Audio.trackForTheme(level.tema);
      Audio.music(track);
    }
    say(level.boss ? `BOSS: ${level.nama}` : `Level ${level.id}: ${level.nama}`);
  }

  function showWin() {
    if (Audio) Audio.jingle('menang');
    const res = Progress.gain(profile, {
      levelId: level.id, stars: game.stars, chest: game.chest, boss: !!game.boss,
    });
    persistProfile();
    refreshChips();
    winStars.textContent = `\u2605 ${game.stars}/${game.starTotal}`;
    winCoins.textContent = `+${res.coins} koin${res.first ? ' (level baru!)' : ''} · total ${profile.koin}`;
    winText.textContent = level.boss
      ? `${level.nama} kalah. Kamu menembus arena!`
      : game.chest
        ? 'Peti reward berhasil dibuka. Hebat!'
        : 'Kamu sampai di tujuan. Coba buka peti reward di lain waktu!';
    winBox.classList.remove('hidden');
    syncPause();
  }

  function drainEvents() {
    for (const e of Sim.takeEvents(game)) {
      if (e.type === 'gate') { playSfx('awas'); showGate(); }
      else if (e.type === 'win') showWin();
      else if (e.type === 'checkpoint') { playSfx('naik'); say('Checkpoint tersimpan!'); }
      else if (e.type === 'reward') { playSfx('koin'); say('Peti reward terbuka!'); }
      else if (e.type === 'respawn') { playSfx('salah'); say('Kembali ke checkpoint'); }
      else if (e.type === 'hurt') { playSfx('hit'); say(e.why === 'duri' ? 'Awas duri!' : e.why === 'boss' ? 'Serangan boss!' : 'Aduh!'); }
      else if (e.type === 'weapon') { playSfx('klik'); say(`Senjata: ${e.nama}`); }
      else if (e.type === 'bossPhase') { playSfx('bos'); say(`Fase ${e.id}! Boss mengamuk.`); }
      else if (e.type === 'bossDefeated') { playSfx('ledak'); say('Boss kalah! Tujuan terbuka.'); }
      else if (e.type === 'bossSlam') playSfx('ledak');
      else if (e.type === 'goalBlocked') { playSfx('salah'); say('Kalahkan boss dulu!'); }
      else if (e.type === 'enemyDown') { playSfx('pop'); say('Musuh kalah!'); }
      else if (e.type === 'stomp') playSfx('hit');
      else if (e.type === 'enemyShoot') playSfx('tembak');
      else if (e.type === 'gateOpen') playSfx('benar');
      else if (e.type === 'jump') playSfx('lompat');
      else if (e.type === 'djump') playSfx('hop');
      else if (e.type === 'attack') playSfx(e.kind === 'melee' ? 'potong' : 'tembak');
      else if (e.type === 'star') playSfx('bintang');
    }
  }

  function frame(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    dt = Math.min(Math.max(dt, 0), 0.05);
    time += dt;
    if (toastT > 0) toastT = Math.max(0, toastT - dt);
    if (paused !== wasPaused) {
      wasPaused = paused;
      if (Audio) Audio.setPaused(paused);
    }
    if (game && !paused && game.phase === 'play') {
      Sim.update(game, dt, input);
      drainEvents();
    }
    if (game && viewer) viewer.draw(level, game, { time, dt, toast: toastT > 0 ? toast : '' });
    requestAnimationFrame(frame);
  }

  // --- keyboard ---
  const keys = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'up', KeyW: 'up', KeyZ: 'jump',
    ArrowDown: 'down', KeyS: 'down', KeyX: 'down',
    KeyJ: 'attack', KeyK: 'switch', KeyC: 'attack', KeyV: 'switch',
  };
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      e.preventDefault();
      if (isOpen(shopEl)) closeShop();
      else if (isOpen(menuEl)) closeMenu();
      else if (!paused) openMenu();
      return;
    }
    const k = keys[e.code];
    if (!k) return;
    e.preventDefault();
    if (!paused) input[k] = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = keys[e.code];
    if (k) { input[k] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', clearInput);

  // --- touch / pointer ---
  // Laptop layar sentuh bisa saja tidak terdeteksi CSS: sentuhan pertama memunculkan tombol.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') document.documentElement.classList.add('touch');
  });

  function bindHold(el, key) {
    if (!el) return;
    const down = (e) => { e.preventDefault(); input[key] = true; el.classList.add('down'); };
    const up = (e) => { e.preventDefault(); input[key] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  bindHold(document.getElementById('left'), 'left');
  bindHold(document.getElementById('right'), 'right');
  bindHold(document.getElementById('up'), 'up');
  bindHold(document.getElementById('down'), 'down');
  bindHold(document.getElementById('jump'), 'jump');
  bindHold(document.getElementById('attack'), 'attack');
  // Ganti senjata cukup sekali tekan; pointerup mengembalikan status tombol.
  bindHold(document.getElementById('swap'), 'switch');

  // --- suara ---
  // AudioContext baru boleh dibuat setelah sentuhan/ketukan pertama.
  const unlockAudio = () => { if (Audio) Audio.unlock(); };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  function updateSoundBtn() {
    if (!soundBtn) return;
    const on = !Audio || Audio.prefs.music || Audio.prefs.sfx;
    soundBtn.textContent = on ? 'Suara' : 'Bisu';
    soundBtn.classList.toggle('on', on);
  }
  if (soundBtn) {
    if (!Audio) soundBtn.disabled = true;
    soundBtn.addEventListener('click', () => {
      if (!Audio) return;
      Audio.unlock();
      const on = !(Audio.prefs.music || Audio.prefs.sfx);
      Audio.setMusicOn(on);
      Audio.setSfxOn(on);
      updateSoundBtn();
      if (on) playSfx('klik');
    });
  }
  updateSoundBtn();

  document.querySelectorAll('[data-level]').forEach((b) => {
    b.addEventListener('click', () => startLevel(Number(b.dataset.level) - 1));
  });
  document.getElementById('menubtn').addEventListener('click', openMenu);
  document.getElementById('menuclose').addEventListener('click', closeMenu);
  document.getElementById('shopbtn').addEventListener('click', openShop);
  document.getElementById('winshop').addEventListener('click', openShop);
  document.getElementById('shopclose').addEventListener('click', closeShop);
  document.getElementById('restart').addEventListener('click', () => startLevel(idx));
  document.getElementById('later').addEventListener('click', () => {
    modal.classList.add('hidden');
    syncPause();
    say('Dekati gerbang lagi untuk menjawab.');
  });

  // --- layar tegak di perangkat sentuh ---
  // Pemain boleh menutup ajakan bila rotasi layarnya terkunci.
  const portrait = window.matchMedia('(orientation: portrait) and (any-pointer: coarse)');
  let rotateDismissed = false;
  function checkRotate() {
    rotateEl.classList.toggle('hidden', !portrait.matches || rotateDismissed);
    syncPause();
  }
  if (portrait.addEventListener) portrait.addEventListener('change', () => { rotateDismissed = false; checkRotate(); });
  document.getElementById('rotateskip').addEventListener('click', () => { rotateDismissed = true; checkRotate(); });
  checkRotate();
  document.getElementById('again').addEventListener('click', () => startLevel(idx));
  document.getElementById('next').addEventListener('click', () => {
    if (idx + 1 < Levels.ALL.length) startLevel(idx + 1);
    else { startLevel(0); say('Semua level selesai! Mulai lagi dari level 1.'); }
  });

  // Pemain lama langsung melanjutkan level terjauh yang sudah terbuka.
  let furthest = 0;
  Levels.ALL.forEach((def, i) => { if (Progress.unlocked(profile, def.id)) furthest = i; });
  startLevel(furthest);
  checkRotate();
  refreshAll();
  // Muat progres cloud setelah game tampil supaya jaringan tidak menahan layar.
  if (Cloud) {
    Cloud.load(profile.uid).then((data) => {
      const cloudProfile = Progress.normalize(data);
      const best = Progress.newer(profile, cloudProfile);
      if (best === cloudProfile && cloudProfile) {
        profile = cloudProfile;
        Progress.saveLocal(profile);
        refreshAll();
        say('Progres cloud dimuat!');
      }
      return Cloud.save(profile);
    }).then((ok) => {
      cloudNote = ok ? 'Progres tersimpan di cloud.'
        : Cloud.enabled() ? 'Cloud belum aktif; progres tersimpan di perangkat ini.'
          : 'Mode offline: progres tersimpan di perangkat ini.';
      if (!shopEl.classList.contains('hidden')) renderShop();
    }).catch(() => {});
  }
  requestAnimationFrame(frame);

  // Pintasan debug untuk pengujian manual di browser (tidak dipakai gameplay).
  window.MH4.debug = {
    get game() { return game; },
    get level() { return level; },
    get viewer() { return viewer; },
    get boss() { return game && game.boss; },
    draw() { if (viewer && game) viewer.draw(level, game, { time, dt: 1 / 60 }); },
    startLevel: (i) => startLevel(i, true),
    openGate() { Sim.openGate(game); },
    teleport(c, r) { Sim.teleport(game, c, r); },
    setInput(part) { Object.assign(input, part || {}); },
    step(dt) { if (game && !paused) { Sim.update(game, dt || 1 / 60, input); drainEvents(); } },
    get profile() { return profile; },
    refreshShop: renderShop,
    addCoins(n) { profile.koin = Math.max(0, (profile.koin || 0) + Math.floor(n || 0)); persistProfile(); refreshAll(); },
  };
})();
