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
  const newWeaponEl = document.getElementById('newweapon');
  let foundWeapon = null;
  const Weapons = window.MH4.weapons;
  const Story = window.MH4.story;
  const Farm = window.MH4.farm;
  const BaseSim = window.MH4.baseSim;
  const BaseScene = window.MH4.baseScene;
  const titleEl = document.getElementById('title');
  const dialogEl = document.getElementById('dialog');
  const boardEl = document.getElementById('board');
  const wrapEl = document.getElementById('wrap');

  // Mode permainan: judul -> markas -> misi platformer -> markas.
  let mode = 'title', baseGame = null, baseView = null, missionBonus = 0;

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
    paused = isOpen(modal) || isOpen(winBox) || isOpen(shopEl) || isOpen(menuEl) || isOpen(rotateEl) || isOpen(newWeaponEl)
      || isOpen(titleEl) || isOpen(dialogEl) || isOpen(boardEl);
    if (paused) clearInput();
  }

  function clearInput() {
    input.left = input.right = input.up = input.down = input.jump = input.attack = input.switch = false;
    document.querySelectorAll('#touch .down').forEach((b) => b.classList.remove('down'));
  }

  // Petunjuk boss tidak tertimpa pesan kecil seperti "Aduh!" selama masih tampil.
  let hintT = 0;
  function say(text) { if (hintT > 0) return; toast = text; toastT = 2.2; }
  function sayLong(text) { toast = text; toastT = 3.6; hintT = 3.6; }

  function buatSoal() {
    const skill = level.tier <= 0 ? 'garis.tambah' : level.tier === 1 ? 'garis.loncat' : 'garis.puluhan';
    const tingkat = Math.min(3, level.tier + 1);
    // Hari ikut menentukan soal, jadi main ulang tidak selalu mendapat soal yang sama.
    const seed = (level.seed * 131 + game.L.gateCol * 17 + profile.base.day * 7919 + 1) >>> 0;
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

  const SLOT_NAMES = { pedang: 'Asahan senjata dekat', blaster: 'Laras senjata jauh', armor: 'Armor', jimat: 'Jimat' };

  function persistProfile() {
    Progress.saveLocal(profile);
    refreshCoins();
    if (Cloud) Cloud.save(profile).catch(() => {});
  }

  function refreshCoins() {
    const text = `Koin ${profile.koin} · Poin ${profile.points}`;
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

  // Efek upgrade dan senjata langsung terasa di level yang sedang berjalan.
  function afterProfileChange(message) {
    if (game) Sim.applyLoadout(game, currentLoadout());
    persistProfile();
    renderShop();
    if (message) shopStatus.textContent = message;
  }

  function shopSection(title) {
    const sec = document.createElement('div');
    sec.className = 'shopslot';
    const h = document.createElement('h3');
    h.textContent = title;
    sec.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'shopgrid';
    sec.appendChild(grid);
    shopBody.appendChild(sec);
    return grid;
  }

  function shopCard(grid, opts) {
    const box = document.createElement('div');
    box.className = 'shopitem' + (opts.on ? ' on' : '');
    for (const [cls, text] of [['nm', opts.nama], ['ds', opts.desc], ['pr', opts.price]]) {
      const el = document.createElement('div');
      el.className = cls; el.textContent = text;
      box.appendChild(el);
    }
    const btn = document.createElement('button');
    btn.textContent = opts.label;
    if (opts.btnClass) btn.className = opts.btnClass;
    btn.disabled = !!opts.disabled;
    if (opts.onClick) btn.addEventListener('click', opts.onClick);
    box.appendChild(btn);
    grid.appendChild(box);
  }

  function renderUpgrades() {
    const grid = shopSection(`Upgrade (sisa ${profile.points} poin)`);
    for (const [id, def] of Object.entries(Progress.STATS)) {
      const lv = profile.stats[id] || 0;
      const full = lv >= def.max;
      shopCard(grid, {
        nama: def.nama, desc: def.desc, price: `Tingkat ${lv}/${def.max}`,
        label: full ? 'Penuh' : 'Naikkan', disabled: full || profile.points <= 0,
        onClick: () => {
          if (Progress.spendPoint(profile, id).ok) afterProfileChange(`${def.nama} naik ke tingkat ${lv + 1}.`);
        },
      });
    }
  }

  function renderWeapons() {
    const locked = {};
    for (const [lv, id] of Object.entries(Progress.CHEST_WEAPONS)) locked[id] = lv;
    const grid = shopSection('Senjata (satu dekat dan satu jauh)');
    for (const id of [...Weapons.MELEE, ...Weapons.RANGED]) {
      const w = Weapons.get(id);
      const owned = profile.weapons.indexOf(id) >= 0;
      const equipped = profile.gear.melee === id || profile.gear.ranged === id;
      shopCard(grid, {
        nama: w.nama, desc: owned ? w.desc : `Temukan di peti Level ${locked[id]}.`,
        price: w.type === 'melee' ? 'Jarak dekat' : 'Jarak jauh', on: equipped,
        label: equipped ? 'Dipakai' : owned ? 'Pakai' : 'Terkunci',
        btnClass: equipped ? 'equipped' : '', disabled: equipped || !owned,
        onClick: () => {
          if (Progress.equipWeapon(profile, id).ok) afterProfileChange(`${w.nama} dipakai.`);
        },
      });
    }
  }

  function renderShop() {
    shopBody.innerHTML = '';
    renderUpgrades();
    renderWeapons();
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
          afterProfileChange(shopStatus.textContent);
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
    // Boss acak: seed baru tiap main. Waktu hanya dipakai di sini; simulasi tetap deterministik.
    level = target.gen ? Levels.genBoss((Date.now() >>> 0) || 1, 2) : target;
    game = Sim.create(level, { loadout: currentLoadout() });
    viewer = Scene.create(canvas, Themes.get(level.tema), level.bossDef);
    setMode('level');
    toastT = 0;
    clearInput();
    hideOverlays();
    syncPause();
    refreshCoins();
    if (Audio) {
      const track = level.bossDef
        ? (level.bossDef.id === 'raja-bandit' ? 'final' : 'bos')
        : Audio.trackForTheme(level.tema);
      Audio.music(track);
    }
    if (level.boss) sayLong(level.bossDef.hint || `BOSS: ${level.nama}`);
    else say(`Misi ${level.id}: ${level.nama}`);
  }

  // Bekal wortel menambah HP untuk satu misi, termasuk bila misi diulang.
  function currentLoadout() {
    const lo = Progress.loadout(profile);
    lo.maxHp += missionBonus;
    return lo;
  }

  function hideOverlays() {
    for (const el of [modal, shopEl, winBox, menuEl, newWeaponEl, boardEl, dialogEl, titleEl]) el.classList.add('hidden');
  }

  function setMode(next) {
    mode = next;
    wrapEl.classList.toggle('basemode', next !== 'level');
    wrapEl.classList.toggle('titlemode', next === 'title');
    document.getElementById('restart').classList.toggle('hidden', next !== 'level');
    document.getElementById('home').classList.toggle('hidden', next !== 'level');
  }

  // --- dialog cerita ---
  let dialogQueue = [], dialogDone = null, dialogHasChoices = false;
  const PORTRAITS = {
    'Kakek Darma': 'npc_kakek', 'Bu Sari': 'npc_sari', 'Empu Bara': 'npc_empu', 'Pak Gapura': 'npc_gapura',
  };

  function showLine() {
    const [who, text, choices] = dialogQueue[0];
    document.getElementById('dname').textContent = who || '';
    document.getElementById('dtext').textContent = text;
    const face = document.getElementById('dface');
    const art = PORTRAITS[who];
    face.style.backgroundImage = art ? `url(../assets/mh4/v2/base/${art}.png)` : who === 'Bayu' ? 'url(../assets/mh4/v2/hero/player.png)' : '';
    face.style.display = art || who === 'Bayu' ? 'block' : 'none';
    const box = document.getElementById('dchoices');
    box.innerHTML = '';
    dialogHasChoices = !!(choices && choices.length);
    if (dialogHasChoices) {
      for (const c of choices) {
        const b = document.createElement('button');
        b.className = 'choice';
        b.textContent = c.label;
        b.disabled = !!c.disabled;
        b.addEventListener('click', (e) => { e.stopPropagation(); closeDialog(); if (c.run) c.run(); });
        box.appendChild(b);
      }
    }
    document.getElementById('dnext').classList.toggle('hidden', dialogHasChoices);
  }

  function closeDialog() {
    dialogQueue = [];
    dialogEl.classList.add('hidden');
    syncPause();
    const done = dialogDone;
    dialogDone = null;
    if (done) done();
  }

  // lines: [[nama, teks, pilihan?], ...]
  function showDialog(lines, onDone) {
    dialogQueue = lines.slice();
    dialogDone = onDone || null;
    if (!dialogQueue.length) { closeDialog(); return; }
    dialogEl.classList.remove('hidden');
    syncPause();
    showLine();
  }

  function nextLine() {
    if (dialogHasChoices) return;
    playSfx('klik');
    dialogQueue.shift();
    if (dialogQueue.length) showLine();
    else closeDialog();
  }

  // --- markas ---
  function enterBase(mapId, at) {
    baseGame = BaseSim.create(mapId, at);
    if (!baseView) baseView = BaseScene.create(canvas);
    game = null;
    level = null;
    toastT = 0;
    hintT = 0;
    setMode('base');
    hideOverlays();
    clearInput();
    syncPause();
    if (Audio) Audio.music('padang');
  }

  function returnHome() {
    missionBonus = 0;
    enterBase('kampung', BaseSim.MAPS.kampung.fromMission);
    if (!profile.base.seen.includes('pulang')) {
      profile.base.seen.push('pulang');
      persistProfile();
      say('Tanaman yang disiram sudah tumbuh!');
    }
  }

  function startGame() {
    titleEl.classList.add('hidden');
    syncPause();
    if (Audio) Audio.unlock();
    if (profile.base.intro) { enterBase('kampung'); return; }
    const lines = Story.INTRO.map((t) => ['', t]);
    enterBase('kampung');
    showDialog(lines, () => {
      profile.base.intro = true;
      persistProfile();
      showDialog(Story.linesFor('kakek', profile));
    });
  }

  function startMission(id) {
    boardEl.classList.add('hidden');
    missionBonus = Farm.useBekal(profile.base);
    if (missionBonus) persistProfile();
    const index = Levels.ALL.findIndex((d) => d.id === id);
    const def = Levels.ALL[index];
    const pre = def.bossDef && Story.BOSS_LINES[def.bossDef.id];
    const go = () => {
      startLevel(index);
      if (missionBonus && !def.boss) say(`Bekal wortel: +${missionBonus} HP!`);
    };
    if (pre) showDialog(pre.before, go);
    else go();
  }

  function showBoard() {
    const body = document.getElementById('boardbody');
    body.innerHTML = '';
    for (const ch of Story.CHAPTERS) {
      const h = document.createElement('h3');
      h.textContent = ch.nama;
      body.appendChild(h);
      const row = document.createElement('div');
      row.className = 'chips';
      for (const id of ch.misi) {
        const def = Levels.ALL.find((d) => d.id === id);
        const best = profile.best[id];
        const b = document.createElement('button');
        b.className = 'chip' + (def.boss ? ' boss' : '') + (best && best.done ? ' done' : '');
        b.dataset.mission = id;
        b.textContent = def.gen ? 'Acak' : def.boss ? def.nama : `${id}. ${def.nama}`;
        b.disabled = !Progress.unlocked(profile, id);
        b.addEventListener('click', () => startMission(id));
        row.appendChild(b);
      }
      body.appendChild(row);
    }
    document.getElementById('boardinfo').textContent = profile.base.bekal
      ? `Bekal wortel: ${profile.base.bekal}. Satu dipakai otomatis saat berangkat (+10 HP).`
      : 'Belum ada bekal. Panen wortel untuk menambah tenaga.';
    boardEl.classList.remove('hidden');
    syncPause();
  }

  function seedChoices() {
    const list = Object.values(Farm.CROPS).map((c) => ({
      label: `Benih ${c.nama}: ${c.price} koin (punya ${profile.base.seeds[c.id]})`,
      disabled: profile.koin < c.price,
      run: () => {
        if (Farm.buySeed(profile, c.id).ok) { playSfx('koin'); persistProfile(); }
        talkSari();
      },
    }));
    list.push({ label: 'Lihat perlengkapan', run: openShop });
    list.push({ label: 'Sudah cukup' });
    return list;
  }

  function talkSari() {
    const [first] = Story.linesFor('sari', profile);
    showDialog([[first[0], `${first[1]} Koinmu ${profile.koin}.`, seedChoices()]]);
  }

  function plotAction(i) {
    const base = profile.base;
    const act = Farm.action(base, i);
    if (act === 'tanam') {
      const choices = Object.values(Farm.CROPS).map((c) => ({
        label: `${c.nama} (benih ${base.seeds[c.id]}). ${c.desc}`,
        disabled: !(base.seeds[c.id] > 0),
        run: () => {
          if (Farm.plant(base, i, c.id).ok) {
            BaseSim.useTool(baseGame, 'tanam');
            playSfx('hit');
            persistProfile();
          }
        },
      }));
      choices.push({ label: 'Tidak jadi' });
      showDialog([['Bayu', 'Tanam apa di petak ini?', choices]]);
    } else if (act === 'siram') {
      Farm.water(base, i);
      BaseSim.useTool(baseGame, 'siram');
      playSfx('pop');
      persistProfile();
      say('Disiram! Tumbuh saat hari berganti.');
    } else if (act === 'panen') {
      const res = Farm.harvest(base, i);
      profile.koin += res.koin;
      BaseSim.useTool(baseGame, 'panen');
      playSfx('koin');
      persistProfile();
      say(`Panen ${res.nama}! +${res.koin} koin${res.bekal ? ', +1 bekal' : ''}`);
    } else {
      say('Sudah disiram. Pergilah misi atau tidur dulu.');
    }
  }

  function baseInteract(e) {
    const id = e.id;
    if (e.plot !== undefined) { plotAction(e.plot); return; }
    if (id === 'rumah') { playSfx('klik'); enterBase('rumah'); return; }
    if (id === 'keluar') {
      playSfx('klik');
      enterBase('kampung', { x: 9 * 16, y: 9 * 16 });
      return;
    }
    if (id === 'tidur') {
      if (Farm.sleep(profile.base)) {
        persistProfile();
        say(`Selamat pagi! Hari ke-${profile.base.day}.`);
      } else say('Bayu belum mengantuk. Bertualanglah dulu.');
      return;
    }
    if (id === 'meja' || id === 'empu') {
      const open = () => openShop();
      if (id === 'empu') showDialog(Story.linesFor('empu', profile), open); else open();
      return;
    }
    if (id === 'rak') {
      showDialog(Story.INTRO.map((t) => ['Buku Kakek', t]));
      return;
    }
    if (id === 'kakek') { showDialog(Story.linesFor('kakek', profile)); return; }
    if (id === 'sari') { talkSari(); return; }
    if (id === 'gapura') { showDialog(Story.linesFor('gapura', profile), showBoard); }
  }

  function plotLabel(i) {
    const p = profile.base.plots[i];
    const act = Farm.action(profile.base, i);
    const nama = p.crop ? Farm.CROPS[p.crop].nama : '';
    return { tanam: 'Tanam benih', siram: `Siram ${nama}`, panen: `Panen ${nama}`, tunggu: `${nama} sudah disiram` }[act];
  }

  function updateBase(dt) {
    if (!paused) {
      BaseSim.update(baseGame, dt, {
        left: input.left, right: input.right, up: input.up, down: input.down,
        act: input.jump || input.attack,
      });
      for (const e of BaseSim.takeEvents(baseGame)) baseInteract(e);
    }
    const near = baseGame.near;
    baseView.draw(baseGame, {
      time, dt, base: profile.base, fog: Story.fogAlpha(profile),
      hidePrompt: mode === 'title' || paused,
      label: near && near.plot !== undefined ? plotLabel(near.plot) : '',
      hud: mode === 'title' ? '' : `Hari ${profile.base.day} · Koin ${profile.koin} · Bekal ${profile.base.bekal}`,
      toast: toastT > 0 ? toast : '',
    });
  }

  function showFoundWeapon(id) {
    if (!id) return;
    foundWeapon = id;
    const w = Weapons.get(id);
    const current = Weapons.get(w.type === 'melee' ? profile.gear.melee : profile.gear.ranged);
    document.getElementById('nwname').textContent = w.nama;
    document.getElementById('nwdesc').textContent = w.desc;
    document.getElementById('nwswap').textContent = `Ganti ${current.nama} dengan ${w.nama}? Senjata lama tetap tersimpan.`;
    persistProfile();
    newWeaponEl.classList.remove('hidden');
    syncPause();
  }

  function closeFoundWeapon(equip) {
    if (equip && foundWeapon && Progress.equipWeapon(profile, foundWeapon).ok) {
      Sim.applyLoadout(game, currentLoadout());
      persistProfile();
      say(`${Weapons.get(foundWeapon).nama} dipakai!`);
    }
    foundWeapon = null;
    newWeaponEl.classList.add('hidden');
    syncPause();
  }

  function showWin() {
    if (Audio) Audio.jingle('menang');
    const res = Progress.gain(profile, {
      levelId: level.id, stars: game.stars, chest: game.chest, boss: !!game.boss,
    });
    Farm.nextDay(profile.base);
    persistProfile();
    winStars.textContent = `\u2605 ${game.stars}/${game.starTotal}`;
    winCoins.textContent = `+${res.coins} koin${res.points ? ` dan +${res.points} poin upgrade` : ''} · total ${profile.koin} koin, ${profile.points} poin`;
    winText.textContent = level.boss
      ? `${level.nama} kalah. Kamu menembus arena!`
      : game.chest
        ? 'Peti reward berhasil dibuka. Hebat!'
        : 'Kamu sampai di tujuan. Coba buka peti reward di lain waktu!';
    const post = level.bossDef && Story.BOSS_LINES[level.bossDef.id];
    const reveal = () => { winBox.classList.remove('hidden'); syncPause(); };
    if (post && res.first) showDialog(post.after, reveal);
    else reveal();
  }

  function drainEvents() {
    for (const e of Sim.takeEvents(game)) {
      if (e.type === 'gate') { playSfx('awas'); showGate(); }
      else if (e.type === 'win') showWin();
      else if (e.type === 'checkpoint') { playSfx('naik'); say('Checkpoint tersimpan!'); }
      else if (e.type === 'reward') {
        playSfx('koin');
        say('Peti reward terbuka!');
        showFoundWeapon(Progress.openChest(profile, level.id));
      } else if (e.type === 'blast') playSfx('ledak');
      else if (e.type === 'respawn') { playSfx('salah'); say('Kembali ke checkpoint'); }
      else if (e.type === 'hurt') { playSfx('hit'); say(e.why === 'duri' ? 'Awas duri!' : e.why === 'boss' ? 'Serangan boss!' : 'Aduh!'); }
      else if (e.type === 'weapon') { playSfx('klik'); say(`Senjata: ${e.nama}`); }
      else if (e.type === 'bossPhase') { playSfx('bos'); say(`Fase ${e.id}! Boss mengamuk.`); }
      else if (e.type === 'bossDefeated') { playSfx('ledak'); say('Boss kalah! Tujuan terbuka.'); }
      else if (e.type === 'bossRetry') {
        playSfx('salah');
        sayLong(e.assist ? `Coba lagi! Serangan boss kini lebih lemah. ${e.hint || ''}` : `Coba lagi dari Fase ${e.phase}! ${e.hint || ''}`);
      } else if (e.type === 'bossTelegraph') playSfx('awas');
      else if (e.type === 'bossStun') { playSfx('ledak'); say('Dia pusing! Serang sekarang!'); }
      else if (e.type === 'bossRecovery') { if (e.open) playSfx('naik'); }
      else if (e.type === 'bossGuard') playSfx('klik');
      else if (e.type === 'bossSummon') { playSfx('bos'); say('Anak buah datang!'); }
      else if (e.type === 'bossBurst') playSfx('ledak');
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
    if (hintT > 0) hintT = Math.max(0, hintT - dt);
    if (paused !== wasPaused) {
      wasPaused = paused;
      if (Audio) Audio.setPaused(paused);
    }
    if (mode === 'level') {
      if (game && !paused && game.phase === 'play') {
        Sim.update(game, dt, input);
        drainEvents();
      }
      if (game && viewer) viewer.draw(level, game, { time, dt, toast: toastT > 0 ? toast : '' });
    } else if (baseGame && baseView) {
      updateBase(dt);
    }
    requestAnimationFrame(frame);
  }

  // --- keyboard ---
  const keys = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'up', KeyW: 'up', KeyZ: 'jump',
    ArrowDown: 'down', KeyS: 'down', KeyX: 'down',
    KeyJ: 'attack', KeyK: 'switch', KeyC: 'attack', KeyV: 'switch', KeyE: 'attack', Enter: 'attack',
  };
  window.addEventListener('keydown', (e) => {
    // Soal gerbang bisa dijawab dengan tombol angka 1 sampai 4 di laptop.
    if (isOpen(modal) && /^Digit[1-4]$/.test(e.code) && !e.repeat) {
      const b = document.querySelectorAll('#choices .choice')[Number(e.code.slice(5)) - 1];
      if (b && !b.disabled) b.click();
      return;
    }
    // Dialog dilanjutkan dengan tombol aksi yang sama seperti interaksi.
    if (isOpen(dialogEl) && !isOpen(shopEl) && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') && !e.repeat) {
      e.preventDefault();
      nextLine();
      return;
    }
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      e.preventDefault();
      if (isOpen(shopEl)) closeShop();
      else if (isOpen(boardEl)) { boardEl.classList.add('hidden'); syncPause(); }
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

  document.getElementById('start').addEventListener('click', startGame);
  document.getElementById('home').addEventListener('click', returnHome);
  document.getElementById('dialog').addEventListener('click', nextLine);
  document.getElementById('boardclose').addEventListener('click', () => { boardEl.classList.add('hidden'); syncPause(); });
  document.getElementById('nwuse').addEventListener('click', () => closeFoundWeapon(true));
  document.getElementById('nwkeep').addEventListener('click', () => closeFoundWeapon(false));
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
  document.getElementById('next').addEventListener('click', returnHome);

  // Simpan sejak awal: tanpa ini tiap muat ulang membuat profil dan uid baru.
  Progress.saveLocal(profile);
  document.getElementById('start').textContent = profile.base.intro ? 'Lanjutkan' : 'Mulai Petualangan';
  baseGame = BaseSim.create('kampung');
  baseView = BaseScene.create(canvas);
  setMode('title');
  titleEl.classList.remove('hidden');
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
    get mode() { return mode; },
    get base() { return baseGame; },
    start: startGame,
    enterBase,
    returnHome,
    showBoard,
    startMission,
    stepBase(dt) { updateBase(dt || 1 / 60); },
    draw() {
      if (mode === 'level' && viewer && game) viewer.draw(level, game, { time, dt: 1 / 60 });
      else if (baseGame && baseView) updateBase(0);
    },
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
