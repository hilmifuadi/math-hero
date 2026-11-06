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
  const winBox = document.getElementById('win');
  let prOpen = false;
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
  const creditsEl = document.getElementById('credits');
  const Tutor = window.MH4.tutor;

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
    paused = isOpen(winBox) || isOpen(shopEl) || isOpen(menuEl) || isOpen(rotateEl) || isOpen(newWeaponEl)
      || isOpen(titleEl) || isOpen(dialogEl) || isOpen(boardEl) || isOpen(creditsEl) || prOpen;
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
    // Kelas yang ditanyakan Nadiya menentukan soal. Hari ikut menentukan, jadi main ulang tidak selalu sama.
    const seed = (level.seed * 131 + game.gateIdx * 977 + profile.base.day * 7919 + 1) >>> 0;
    return window.MH4.soal.untukLevel(profile.kelas || 1, game.gateIdx, seed);
  }

  function pilihanUntuk(q) {
    if (q.pilihan && q.pilihan.length) return q.pilihan.slice();
    const a = q.jawaban, out = [a];
    for (let d = 1; out.length < 4; d++) { out.push(a + d); out.push(a - d); }
    return out.slice(0, 4).sort((x, y) => ((x * 7919 + level.seed) % 13) - ((y * 7919 + level.seed) % 13));
  }

  // Soal gerbang: pilihan muncul sebagai balok angka di udara, dan permainan tidak berhenti.
  function showGate() {
    currentQ = buatSoal();
    if (window.Scratchpad) window.Scratchpad.clear();
    Sim.setQuiz(game, { teks: currentQ.ekspresi || currentQ.teks || '...', values: pilihanUntuk(currentQ) });
    say('Pukul jawaban dengan senjata dekat!');
  }

  function answerBlock(index, value) {
    if (!game || !game.quiz) return;
    const benar = window.MH4.soal.periksa(currentQ, value);
    if (benar) {
      Sim.addScore(game, 80 + 20 * (currentQ.kelas || 1), 'scoreQuiz');
      Sim.answerQuiz(game, index, true);
      say('Benar! Pagar terbuka!');
      return;
    }
    playSfx('salah');
    Sim.addScore(game, -30, 'scoreQuiz');
    const hint = (currentQ.langkah && currentQ.langkah[0]) || (currentQ.petunjuk && currentQ.petunjuk[0]) || 'Coba hitung sekali lagi, ya.';
    Sim.answerQuiz(game, index, false, 'Belum tepat. ' + hint);
  }

  const SLOT_NAMES = { pedang: 'Asahan senjata dekat', blaster: 'Laras senjata jauh', armor: 'Armor', jimat: 'Benda berguna' };

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

  const SHEETS = {
    weapons: ['weapons.png', 192, 112, 'ui'], wpn: ['weapons.png', 120, 28, 'world'], gear: ['gear.png', 84, 12, 'world'], decor: ['Outdoor_Decor_Free.png', 112, 192, 'base'],
    chicken: ['Chicken.png', 64, 64, 'base'], cow: ['Cow.png', 64, 64, 'base'], sheep: ['Sheep.png', 64, 64, 'base'],
  };
  const GEAR_ICONS = {
    'rompi-kulit': [0, 0, 12, 12], 'zirah-besi': [14, 0, 12, 12], 'jubah-bintang': [28, 0, 12, 12],
    'magnet-koin': [42, 0, 12, 12], 'sepatu-angin': [56, 0, 12, 12], 'jimat-hati': [70, 0, 12, 12],
  };
  const itemIcon = (id) => (GEAR_ICONS[id] ? ['gear', GEAR_ICONS[id]] : SHOP_ICONS[id] ? ['weapons', SHOP_ICONS[id]] : null);
  const SHOP_ICONS = {
    'pedang-biasa': [3, 6, 10, 41], 'blaster-biasa': [81, 3, 29, 10],
    'mata-baja': [35, 17, 10, 28], 'bilah-api': [48, 18, 16, 28], 'pedang-kristal': [83, 16, 10, 21],
    'laras-panjang': [99, 21, 11, 40], pendingin: [19, 48, 10, 32], 'blaster-plasma': [67, 50, 29, 28],
    'rompi-kulit': [119, 19, 17, 24], 'zirah-besi': [145, 0, 14, 16], 'jubah-bintang': [128, 0, 16, 16],
    'magnet-koin': [112, 0, 16, 16], 'sepatu-angin': [0, 50, 16, 28], 'jimat-hati': [51, 2, 11, 13],
  };

  // Ikon dari lembar gambar, diperbesar sampai muat di kotak 32.
  function iconEl(sheet, rect, max) {
    const [file, w, h, dir] = SHEETS[sheet];
    const [x, y, iw, ih] = rect;
    const box = max || 32;
    const k = max ? Math.max(1, Math.floor(Math.min(box / iw, box / ih))) : Math.min(box / iw, box / ih);
    const el = document.createElement('div');
    el.className = 'ic';
    el.style.width = iw * k + 'px';
    el.style.height = ih * k + 'px';
    el.style.backgroundImage = `url(../assets/mh4/v2/${dir}/${file})`;
    el.style.backgroundSize = `${w * k}px ${h * k}px`;
    el.style.backgroundPosition = `${-x * k}px ${-y * k}px`;
    return el;
  }

  function shopCard(grid, opts) {
    const box = document.createElement('div');
    box.className = 'shopitem' + (opts.on ? ' on' : '');
    if (opts.icon) box.appendChild(iconEl(opts.icon[0], opts.icon[1]));
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
    if (opts.second) {
      const b2 = document.createElement('button');
      b2.textContent = opts.second.label;
      b2.addEventListener('click', opts.second.onClick);
      box.appendChild(b2);
    }
    grid.appendChild(box);
  }

  // Peti penyimpanan memakai panel yang sama dengan toko.
  let shopMode = 'toko';

  function renderStorage() {
    shopBody.innerHTML = '';
    document.getElementById('shoptitle').textContent = 'Peti Penyimpanan';
    const base = profile.base;
    const grid = shopSection('Hasil ladang dan ternak');
    let any = false;
    for (const [id, it] of Object.entries(Farm.ITEMS)) {
      const n = base.items[id] || 0;
      if (!n) continue;
      any = true;
      const packed = base.pack === id;
      shopCard(grid, {
        icon: [it.sheet || 'decor', it.icon], on: packed, nama: `${it.nama} x${n}`,
        desc: it.hp ? `Bekal: +${it.hp} HP. Jual: ${it.jual} koin.` : `Hanya untuk dijual: ${it.jual} koin.`,
        price: packed ? 'Dibawa sebagai bekal' : '',
        label: `Jual ${it.jual} koin`,
        onClick: () => {
          if (Farm.sell(profile, id).ok) { playSfx('koin'); afterProfileChange(`${it.nama} terjual.`); }
        },
        second: it.hp ? {
          label: packed ? 'Lepas bekal' : 'Bawa sebagai bekal',
          onClick: () => {
            Farm.setPack(base, packed ? null : id);
            afterProfileChange(packed ? 'Bekal dilepas.' : `${it.nama} jadi bekal misi berikutnya.`);
          },
        } : null,
      });
    }
    if (!any) {
      const empty = document.createElement('div');
      empty.className = 'sub';
      empty.textContent = 'Peti masih kosong. Panen ladang atau ambil hasil dari hewan di kandang.';
      grid.appendChild(empty);
    }
    const seeds = shopSection('Benih');
    for (const c of Object.values(Farm.CROPS)) {
      shopCard(seeds, {
        icon: ['decor', Farm.ITEMS[c.id].icon], nama: `Benih ${c.nama} x${base.seeds[c.id] || 0}`,
        desc: c.desc, price: `Di Bida: ${c.price} koin`, label: 'Tanam di ladang', disabled: true,
      });
    }
    refreshCoins();
    shopStatus.textContent = 'Pilih bekal untuk misi, atau jual hasilnya.';
  }

  function openStorage() {
    shopMode = 'peti';
    shopEl.classList.remove('hidden');
    syncPause();
    renderShop();
  }

  let gearSel = null;
  const hue = (el, w) => { if (el && w.hue) el.style.filter = `hue-rotate(${w.hue}deg) saturate(1.6) brightness(1.15)`; return el; };
  function renderShop() {
    if (shopMode === 'peti') { renderStorage(); return; }
    if (shopMode === 'bangun') { renderBuild(); return; }
    document.getElementById('shoptitle').textContent = 'Perlengkapan Arka';
    shopBody.innerHTML = '';
    if (!gearSel) gearSel = { kind: 'weapon', id: profile.gear.melee };
    const el = (cls, text) => {
      const d = document.createElement('div');
      d.className = cls;
      if (text !== undefined) d.textContent = text;
      return d;
    };
    const locked = {};
    for (const [lv, id] of Object.entries(Progress.CHEST_WEAPONS)) locked[id] = lv;
    const isSel = (kind, id) => gearSel.kind === kind && gearSel.id === id;
    const pick = (kind, id) => { gearSel = { kind, id }; playSfx('klik'); shopStatus.textContent = ''; renderShop(); };
    function tile(kind, id, icon, opts) {
      const t = document.createElement('button');
      t.className = 'tile' + (opts.on ? ' on' : '') + (opts.locked ? ' locked' : '') + (isSel(kind, id) ? ' sel' : '');
      if (icon) t.appendChild(opts.w ? hue(iconEl(icon[0], icon[1], 40), opts.w) : iconEl(icon[0], icon[1], 40));
      if (opts.badge) t.appendChild(el('badge', opts.badge));
      t.addEventListener('click', () => pick(kind, id));
      return t;
    }
    function weaponTiles(list) {
      const box = el('tiles');
      for (const id of list) {
        const w = Weapons.get(id), owned = profile.weapons.indexOf(id) >= 0;
        box.appendChild(tile('weapon', id, ['wpn', w.icon], { w, on: profile.gear.melee === id || profile.gear.ranged === id, locked: !owned }));
      }
      return box;
    }
    function itemTiles(slot) {
      const box = el('tiles');
      for (const item of Shop.bySlot(slot)) {
        const owned = profile.owned.indexOf(item.id) >= 0;
        const on = profile.equipped[slot] === item.id;
        box.appendChild(tile('item', item.id, itemIcon(item.id), { on, badge: owned ? '' : String(item.price) }));
      }
      return box;
    }
    function column(title, list, slot, slotTitle) {
      const col = el('gearcol');
      col.appendChild(el('gearlabel', title));
      col.appendChild(weaponTiles(list));
      col.appendChild(el('gearlabel', slotTitle));
      col.appendChild(itemTiles(slot));
      return col;
    }
    const gear = el('gear');
    gear.appendChild(column('Senjata dekat', Weapons.MELEE, 'pedang', 'Asahan'));
    const mid = el('gearmid');
    mid.appendChild(el('gearlabel', 'Armor'));
    mid.appendChild(itemTiles('armor'));
    const stage = el('stage');
    stage.appendChild(el('floor'));
    const holdL = el('hold l');
    holdL.appendChild(hue(iconEl('wpn', Weapons.get(profile.gear.melee).icon, 44), Weapons.get(profile.gear.melee)));
    stage.appendChild(holdL);
    stage.appendChild(el('arka'));
    const holdR = el('hold r');
    holdR.appendChild(hue(iconEl('wpn', Weapons.get(profile.gear.ranged).icon, 44), Weapons.get(profile.gear.ranged)));
    stage.appendChild(holdR);
    mid.appendChild(stage);
    mid.appendChild(itemTiles('jimat'));
    mid.appendChild(el('gearlabel', 'Benda berguna'));
    gear.appendChild(mid);
    gear.appendChild(column('Senjata jauh', Weapons.RANGED, 'blaster', 'Laras'));
    shopBody.appendChild(gear);

    // Poin upgrade Arka.
    const stats = el('statrow');
    for (const [id, def] of Object.entries(Progress.STATS)) {
      const lv = profile.stats[id] || 0;
      const b = document.createElement('button');
      b.className = 'statbtn' + (isSel('stat', id) ? ' sel' : '');
      const nm = document.createElement('span');
      nm.textContent = def.nama;
      b.appendChild(nm);
      const pips = el('statpips');
      for (let i = 1; i <= def.max; i++) {
        const p = document.createElement('i');
        if (i <= lv) p.className = 'f';
        pips.appendChild(p);
      }
      b.appendChild(pips);
      b.addEventListener('click', () => pick('stat', id));
      stats.appendChild(b);
    }
    shopBody.appendChild(stats);
    shopBody.appendChild(gearDetail(el, locked));
    return;
  }

  // Penjelasan hanya untuk barang yang sedang dipilih, dengan satu tombol tindakan.
  function gearDetail(el, locked) {
    const box = el('gearinfo');
    const text = el('imeta');
    const btn = document.createElement('button');
    btn.className = 'ibtn';
    let label = '', disabled = true, run = null;
    if (gearSel.kind === 'weapon') {
      const w = Weapons.get(gearSel.id), owned = profile.weapons.indexOf(w.id) >= 0;
      const on = profile.gear.melee === w.id || profile.gear.ranged === w.id;
      box.appendChild(hue(iconEl('wpn', w.icon, 44), w));
      text.appendChild(el('inm', w.nama));
      const finale = !!(profile.best[Story.FINALE] && profile.best[Story.FINALE].done);
      text.appendChild(el('ids', owned ? w.desc : w.ultimate
        ? `${w.desc} Senjata pamungkas: ${finale ? `harga ${w.price} koin.` : 'terbuka setelah Raja Goblin kalah.'}`
        : `Temukan di peti Misi ${locked[w.id]}.`));
      const bars = el('tiles');
      for (const [lb, key] of [['Kuat', 'kuat'], ['Cepat', 'cepat'], ['Jarak', 'jarak']]) {
        const row = el('wbar');
        const t = document.createElement('span');
        t.textContent = lb;
        row.appendChild(t);
        for (let i = 1; i <= 5; i++) { const p = document.createElement('i'); if (i <= w.bars[key]) p.className = 'f'; row.appendChild(p); }
        bars.appendChild(row);
      }
      text.appendChild(bars);
      label = on ? 'Dipakai' : owned ? 'Pakai' : 'Terkunci';
      disabled = on || !owned;
      run = () => { if (Progress.equipWeapon(profile, w.id).ok) afterProfileChange(`${w.nama} dipakai.`); };
      if (!owned && w.ultimate && finale) {
        label = `Beli ${w.price} koin`;
        disabled = profile.koin < w.price;
        run = () => {
          if (!Progress.buyWeapon(profile, w.id).ok) return;
          Progress.equipWeapon(profile, w.id);
          playSfx('koin');
          afterProfileChange(`${w.nama} dibeli dan dipakai!`);
        };
      }
    } else if (gearSel.kind === 'item') {
      const item = Shop.get(gearSel.id), owned = profile.owned.indexOf(item.id) >= 0;
      const on = profile.equipped[item.slot] === item.id;
      if (itemIcon(item.id)) box.appendChild(iconEl(itemIcon(item.id)[0], itemIcon(item.id)[1], 44));
      text.appendChild(el('inm', item.nama));
      text.appendChild(el('ids', item.desc));
      label = on ? 'Terpasang' : owned ? 'Pasang' : `Beli ${item.price} koin`;
      disabled = on || (!owned && profile.koin < item.price);
      run = () => {
        const res = owned ? Progress.equip(profile, item.id) : Progress.buy(profile, item.id);
        if (res.ok) { playSfx(owned ? 'klik' : 'koin'); afterProfileChange(owned ? `${item.nama} terpasang.` : `${item.nama} dibeli dan terpasang.`); }
      };
    } else {
      const def = Progress.STATS[gearSel.id], lv = profile.stats[gearSel.id] || 0, full = lv >= def.max;
      text.appendChild(el('inm', `${def.nama}, tingkat ${lv}/${def.max}`));
      text.appendChild(el('ids', def.desc));
      label = full ? 'Penuh' : profile.points > 0 ? 'Naikkan (1 poin)' : 'Poin habis';
      disabled = full || profile.points <= 0;
      run = () => { if (Progress.spendPoint(profile, gearSel.id).ok) afterProfileChange(`${def.nama} naik ke tingkat ${lv + 1}.`); };
    }
    box.appendChild(text);
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', run);
    box.appendChild(btn);
    return box;
  }

  function openShop() {
    shopMode = 'toko';
    gearSel = null;
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

  // Mode acak mengikuti perkembangan: makin banyak boss cerita kalah, makin rumit.
  let runSeed = 0;
  function acakLevel() {
    const n = Levels.BOSSES.filter((b) => profile.best[b.id] && profile.best[b.id].done).length;
    return { tier: n < 3 ? 2 : 3, difficulty: n < 3 ? 1 : n < 6 ? 2 : 3, power: Math.min(3, 0.8 + n * 0.3) };
  }

  // opts.seed: seed yang diketik pemain. opts.same: ulangi peta yang sedang dimainkan.
  function startLevel(i, force, opts) {
    opts = opts || {};
    const target = defFor(i);
    if (!force && !Progress.unlocked(profile, target.id)) {
      say('Selesaikan level sebelumnya dulu!');
      return;
    }
    idx = Levels.ALL.indexOf(target);
    // Mode acak: seed baru tiap main. Peta dan simulasi tetap deterministik dari seed.
    level = target;
    if (target.gen || target.acak) {
      runSeed = opts.seed || (opts.same && runSeed) || 1 + Math.floor(Math.random() * 999999);
      const a = acakLevel();
      level = target.gen ? Levels.genBoss(runSeed, a.difficulty, a.power) : Levels.genLevel(runSeed, { tier: a.tier, power: a.power });
    }
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
    else if (level.acak) say(`${level.nama} · seed ${runSeed}`);
    else say(`Misi ${level.id}: ${level.nama}`);
  }

  // Bekal wortel menambah HP untuk satu misi, termasuk bila misi diulang.
  function currentLoadout() {
    const lo = Progress.loadout(profile);
    lo.maxHp += missionBonus;
    return lo;
  }

  function hideOverlays() {
    for (const el of [shopEl, winBox, menuEl, newWeaponEl, boardEl, dialogEl, titleEl]) el.classList.add('hidden');
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
    'Aki Tyo': 'npc_kakek', Bida: 'npc_sari', 'Ayah Hilmi': 'npc_empu', Farah: 'npc_gapura', Nadiya: 'npc_guru', 'Mamah Zahra': 'npc_zahra',
  };

  function showLine() {
    lineAt = Date.now();
    const [who, text, choices] = dialogQueue[0];
    document.getElementById('dname').textContent = who || '';
    document.getElementById('dtext').textContent = text;
    const face = document.getElementById('dface');
    const art = PORTRAITS[who];
    face.style.backgroundImage = art ? `url(../assets/mh4/v2/base/${art}.png)` : who === 'Arka' ? 'url(../assets/mh4/v2/hero/player.png)' : '';
    face.style.backgroundSize = who === 'Arka' ? '600% auto' : '300% auto';
    face.style.display = art || who === 'Arka' ? 'block' : 'none';
    const box = document.getElementById('dchoices');
    box.innerHTML = '';
    dialogHasChoices = !!(choices && choices.length);
    if (dialogHasChoices) {
      for (const c of choices) {
        const b = document.createElement('button');
        b.className = 'choice';
        b.textContent = c.label;
        b.disabled = !!c.disabled;
        b.addEventListener('click', (e) => { e.stopPropagation(); if (tooSoon()) return; closeDialog(); if (c.run) c.run(); });
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
  // Sentuhan yang membuka dialog bisa mendarat di kotak dialog sebagai klik. Klik sesaat setelah
  // dialog atau baris baru muncul diabaikan, supaya baris pertama tidak terlewat.
  let lineAt = 0;
  // Hanya berlaku untuk sentuhan; klik tetikus dan papan ketik tetap langsung.
  let touchAt = 0;
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touchAt = Date.now(); }, true);
  const tooSoon = () => Date.now() - lineAt < 350 && Date.now() - touchAt < 700;

  function nextLine() {
    if (dialogHasChoices) return;
    playSfx('klik');
    dialogQueue.shift();
    if (dialogQueue.length) showLine();
    else closeDialog();
  }

  // --- markas ---
  function enterBase(mapId, at) {
    baseGame = BaseSim.create(mapId, at, profile.base.built);
    baseGame.animalReady = (kind) => Farm.animalReady(profile.base, kind);
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

  // --- kredit ---
  let creditsDone = null;
  function openCredits(onDone) {
    creditsDone = onDone || null;
    const roll = document.getElementById('creditroll');
    window.MathHeroCredits.renderRoll(roll, Story.CREDITS);
    // Memasang ulang animasi supaya gulungan selalu mulai dari bawah.
    roll.style.animation = 'none';
    creditsEl.classList.remove('hidden');
    void roll.offsetWidth;
    roll.style.animation = '';
    syncPause();
  }
  function closeCredits() {
    creditsEl.classList.add('hidden');
    syncPause();
    const done = creditsDone;
    creditsDone = null;
    if (done) done();
  }
  function leaveToSeries() {
    Progress.saveLocal(profile);
    window.location.href = '../';
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
      showDialog(wargaBicara('kakek'));
    });
  }

  // Seed yang diketik hanya berlaku untuk mode acak, jadi teman bisa berbagi peta yang sama.
  function typedSeed() {
    const n = parseInt(document.getElementById('seedinput').value, 10);
    return n >= 1 && n <= 999999 ? n : 0;
  }

  function startMission(id) {
    boardEl.classList.add('hidden');
    missionBonus = Farm.useBekal(profile.base);
    if (missionBonus) persistProfile();
    const index = Levels.ALL.findIndex((d) => d.id === id);
    const def = Levels.ALL[index];
    const pre = def.bossDef && Story.BOSS_LINES[def.bossDef.id];
    const go = () => {
      startLevel(index, false, { seed: typedSeed() });
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
        b.textContent = def.gen ? 'Boss Acak' : def.acak ? 'Level Acak' : def.boss ? def.nama : `${id}. ${def.nama}`;
        b.disabled = !Progress.unlocked(profile, id);
        b.addEventListener('click', () => startMission(id));
        row.appendChild(b);
      }
      body.appendChild(row);
    }
    document.getElementById('seedrow').classList.toggle('hidden', !Progress.unlocked(profile, Story.ACAK[0]));
    const pack = profile.base.pack && Farm.ITEMS[profile.base.pack];
    document.getElementById('boardinfo').textContent = pack
      ? `Bekal: ${pack.nama} (+${pack.hp} HP). Ganti lewat peti.`
      : 'Belum ada bekal. Ambil hasil ladang atau ternak, lalu pilih di peti.';
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

  // --- warga mengenali keadaan Arka ---
  const talkMemo = {};
  let lastResult = null;
  function wargaBicara(id) {
    const base = profile.base;
    const next = Story.ROUTE.find((m) => !(profile.best[m] && profile.best[m].done));
    const def = next && Levels.ALL.find((l) => l.id === next);
    return window.MH4.talk.compose(id, {
      hour: new Date().getHours(),
      playMin: (profile.playSec || 0) / 60,
      profile,
      ripe: Farm.RIPE,
      animalsReady: Object.keys(Farm.ANIMALS).filter((k) => Farm.animalReady(base, k)).map((k) => Farm.ANIMALS[k].nama),
      done: Story.doneCount(profile),
      nextMission: def ? def.nama : '',
      last: lastResult,
      story: Story.linesFor(id, profile),
    }, talkMemo);
  }

  // Lama bermain hari ini, mulai dari nol tiap hari baru.
  let playSaveT = 0;
  function countPlay(dt) {
    if (!profile || document.hidden) return;
    const d = new Date(), key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (profile.playDay !== key) { profile.playDay = key; profile.playSec = 0; }
    profile.playSec = (profile.playSec || 0) + dt;
    playSaveT += dt;
    if (playSaveT > 30) { playSaveT = 0; Progress.saveLocal(profile); }
  }

  function talkSari() {
    const lines = wargaBicara('sari');
    lines[lines.length - 1][2] = seedChoices();
    showDialog(lines);
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
      showDialog([['Arka', 'Tanam apa di petak ini?', choices]]);
    } else if (act === 'siram') {
      Farm.water(base, i);
      BaseSim.useTool(baseGame, 'siram');
      playSfx('pop');
      persistProfile();
      say('Disiram! Tumbuh saat hari berganti.');
    } else if (act === 'panen') {
      const res = Farm.harvest(base, i);
      BaseSim.useTool(baseGame, 'panen');
      baseGame.tool.icon = Farm.ITEMS[res.item].icon;
      baseGame.tool.sheet = Farm.ITEMS[res.item].sheet;
      playSfx('koin');
      persistProfile();
      say(`Panen ${res.nama}! Tersimpan di peti.`);
    } else {
      say('Sudah disiram. Pergilah misi atau tidur dulu.');
    }
  }

  function baseInteract(e) {
    const id = e.id;
    if (e.plot !== undefined) { plotAction(e.plot); return; }
    if (id === 'peti') { playSfx('klik'); openStorage(); return; }
    if (id === 'ternak') {
      const res = Farm.collectAnimal(profile.base, e.kind);
      if (res.ok) {
        BaseSim.useTool(baseGame, 'panen');
        baseGame.tool.icon = Farm.ITEMS[res.item].icon;
        baseGame.tool.sheet = Farm.ITEMS[res.item].sheet;
        playSfx('koin');
        persistProfile();
        say(`${Farm.ANIMALS[e.kind].nama} memberi ${res.n > 1 ? res.n + ' ' : ''}${res.nama}! Tersimpan di peti.`);
      }
      return;
    }
    if (id === 'rumah') { playSfx('klik'); enterBase('rumah'); return; }
    if (id === 'bangun') { playSfx('klik'); openBuild(); return; }
    if (id === 'titu') { playSfx('pop'); showDialog(tituLines()); return; }
    if (id === 'altar') {
      showDialog([['', 'Kristal Bilangan berputar pelan di atas altar. Cahayanya hangat, dan kabut tidak berani mendekat.'], ['Arka', 'Terima kasih sudah menjaga kampung kami.']]);
      return;
    }
    if (id === 'keluar') {
      playSfx('klik');
      enterBase('kampung', BaseSim.MAPS.kampung.fromHouse);
      return;
    }
    if (id === 'tidur') {
      if (Farm.sleep(profile.base)) {
        persistProfile();
        say(`Selamat pagi! Hari ke-${profile.base.day}.`);
      } else say('Arka belum mengantuk. Bertualanglah dulu.');
      return;
    }
    if (id === 'meja' || id === 'empu') {
      const open = () => openShop();
      if (id === 'empu') showDialog(wargaBicara('empu'), open); else open();
      return;
    }
    if (id === 'rak') {
      showDialog(Story.INTRO.map((t) => ['Buku Aki', t]));
      return;
    }
    if (id === 'kakek') { showDialog(wargaBicara('kakek')); return; }
    if (id === 'zahra') { showDialog(wargaBicara('zahra')); return; }
    if (id === 'sari') { talkSari(); return; }
    if (id === 'guru') { talkGuru(); return; }
    if (id === 'gapura') {
      // Soal di misi mengikuti kelas, jadi kelas harus diketahui sebelum berangkat.
      if (!profile.kelas) { showDialog([['Farah', 'Semangat sekali! Tapi sebelum berangkat, temui Nadiya di alun-alun dulu ya. Dia perlu tahu kamu kelas berapa!']]); return; }
      showDialog(wargaBicara('gapura'), showBoard);
    }
  }

  // Titu manja tapi gengsi, suka tidur, takut air, dan penasaran pada ayam.
  let tituN = 0;
  function tituLines() {
    const pet = baseGame && baseGame.pet;
    const SETS = [
      [['', 'Titu memejamkan mata dan mendengkur keras.'], ['Titu', 'Prrr... prrr...']],
      [['', 'Titu pura-pura tidak peduli, tapi ekornya bergoyang senang.'], ['Titu', 'Meong. (Biasa saja kok.)']],
      [['', 'Titu menatap kandang ayam dengan serius.'], ['Titu', 'Meong! (Suatu hari nanti, ayam...)']],
      [['', 'Titu menggosokkan kepala ke kaki Arka.'], ['Titu', 'Mrrr... (Ada ikan tidak?)']],
      [['', 'Titu melirik sungai, lalu mundur pelan-pelan.'], ['Titu', 'Meong! (Air itu basah. Tidak, terima kasih.)']],
    ];
    if (pet && pet.sleep) return [['', 'Titu tidur meringkuk. Arka mengelus kepalanya pelan-pelan.'], ['Titu', 'Zzz... mrrr...']];
    return SETS[tituN++ % SETS.length];
  }

  // --- bangun kampung ---
  function renderBuild() {
    shopBody.innerHTML = '';
    document.getElementById('shoptitle').textContent = 'Bangun Kampung';
    const grid = shopSection('Hiasan dan bangunan. Tidak menambah kekuatan, tapi kampung makin ramai.');
    for (const b of Farm.BUILDS) {
      const done = Farm.hasBuilt(profile.base, b.id);
      shopCard(grid, {
        on: done, nama: b.nama, desc: b.desc, price: done ? 'Sudah dibangun' : `${b.price} koin`,
        label: done ? 'Sudah ada' : profile.koin >= b.price ? 'Bangun' : `Kurang ${b.price - profile.koin} koin`,
        disabled: done || profile.koin < b.price,
        onClick: () => {
          const res = Farm.buyBuild(profile, b.id);
          if (!res.ok) return;
          playSfx('koin');
          persistProfile();
          // Peta kampung disusun ulang, Arka tetap di tempatnya.
          if (baseGame && baseGame.map.id === 'kampung') {
            const at = { x: baseGame.x, y: baseGame.y };
            baseGame = BaseSim.create('kampung', at, profile.base.built);
            baseGame.animalReady = (kind) => Farm.animalReady(profile.base, kind);
          }
          renderBuild();
          shopStatus.textContent = `${res.nama} selesai dibangun!`;
        },
      });
    }
    refreshCoins();
  }
  function openBuild() {
    shopMode = 'bangun';
    shopEl.classList.remove('hidden');
    syncPause();
    renderShop();
    shopStatus.textContent = 'Pilih yang ingin dibangun. Kumpulkan koin dari ladang, ternak, dan misi.';
  }

  function talkGuru() {
    const pilih = (k) => ({
      label: `Kelas ${k}`,
      run: () => {
        profile.kelas = k;
        persistProfile();
        showDialog([['Nadiya', `Baik, kelas ${k}. Soal di perjalananmu akan menyesuaikan. Datang lagi kalau naik kelas, ya.`]]);
      },
    });
    const kelas = [1, 2, 3, 4, 5, 6].map(pilih);
    if (!profile.kelas) {
      showDialog([['Nadiya', 'Arka, kamu sekarang kelas berapa? Soal di perjalanan nanti mengikuti kelasmu.', kelas]]);
      return;
    }
    const lines = wargaBicara('guru');
    lines.push(['Nadiya', `Masih kelas ${profile.kelas}, atau sudah naik?`, kelas.concat([{ label: 'Masih sama' }])]);
    showDialog(lines);
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
      hud: mode === 'title' ? '' : `Hari ${profile.base.day} · Koin ${profile.koin} · Bekal ${profile.base.pack ? Farm.ITEMS[profile.base.pack].nama : '-'}`,
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
    const bonus = Sim.timeBonus(game);
    Sim.addScore(game, bonus);
    const res = Progress.gain(profile, {
      levelId: level.id, stars: game.stars, chest: game.chest, boss: !!game.boss, score: game.score,
    });
    if (res.newBest) kirimSkor();
    // Mode acak selalu memberi sedikit koin, karena tiap peta baru.
    const acakRun = level.acak || level.gen;
    if (acakRun && !res.first) {
      const extra = level.gen ? 30 : 15;
      profile.koin = Progress.clampCoins(profile.koin + extra);
      res.coins += extra;
    }
    lastResult = { nama: level.nama, stars: game.stars, deaths: game.deaths || 0, win: true };
    Farm.nextDay(profile.base);
    persistProfile();
    winStars.textContent = `\u2605 ${game.stars}/${game.starTotal}`;
    winCoins.textContent = `+${res.coins} koin${res.points ? ` dan +${res.points} poin upgrade` : ''} · total ${profile.koin} koin, ${profile.points} poin`;
    const rekor = res.newBest ? 'Rekor baru!' : `Rekor misi ini ${res.bestScore}.`;
    const rincian = `Skor ${game.score} (soal ${game.scoreQuiz || 0}, musuh ${game.scoreKill || 0}, waktu ${bonus}). ${rekor} Total ${res.total}.${acakRun ? ` Seed ${runSeed}.` : ''}`;
    winText.textContent = rincian + ' ' + (level.boss
      ? `${level.nama} kalah. Kamu menembus arena!`
      : game.chest
        ? 'Peti reward berhasil dibuka. Hebat!'
        : 'Kamu sampai di tujuan. Coba buka peti reward di lain waktu!');
    const post = level.bossDef && Story.BOSS_LINES[level.bossDef.id];
    const reveal = () => { winBox.classList.remove('hidden'); syncPause(); };
    // Boss terakhir ditutup ending dan kredit, hanya saat pertama kali menang.
    const finale = level.id === Story.FINALE && res.first;
    const afterPost = finale ? () => showDialog(Story.ENDING, () => openCredits(reveal)) : reveal;
    if (post && res.first) showDialog(post.after, afterPost);
    else reveal();
  }

  // --- PR soal cerita saat membuka peti ---
  let prQ = null, prVal = '', prWrong = 0, prDone = null;
  const prEl = () => document.getElementById('pr');
  function prShow() {
    document.getElementById('prinput').textContent = prVal || '_';
  }
  function prClose() {
    prOpen = false;
    prEl().classList.add('hidden');
    syncPause();
    const done = prDone;
    prDone = null;
    if (done) done();
  }
  function prCheck() {
    if (!prVal) return;
    if (Number(prVal) === prQ.jawaban) {
      const bonus = Math.max(100, 300 - prWrong * 50);
      Sim.addScore(game, bonus, 'scoreQuiz');
      playSfx('benar');
      say(`PR benar! +${bonus} skor`);
      prClose();
      return;
    }
    prWrong++;
    prVal = '';
    Sim.addScore(game, -30, 'scoreQuiz');
    playSfx('salah');
    document.getElementById('prhint').textContent = 'Belum tepat. ' + prQ.langkah[Math.min(prWrong - 1, prQ.langkah.length - 1)];
    prShow();
  }
  function prKey(d) {
    if (d === 'hapus') prVal = prVal.slice(0, -1);
    else if (prVal.length < 6) prVal = (prVal === '0' ? '' : prVal) + d;
    prShow();
  }
  function openPr(done) {
    prQ = window.MH4.soal.cerita(profile.kelas || 1, (level.seed * 211 + profile.base.day * 3571 + 7) >>> 0);
    prVal = ''; prWrong = 0; prDone = done;
    document.getElementById('prtext').textContent = prQ.teks;
    document.getElementById('prhint').textContent = '';
    const keys = document.getElementById('prkeys');
    keys.innerHTML = '';
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'hapus']) {
      const b = document.createElement('button');
      b.textContent = d === 'hapus' ? '\u232B' : d;
      b.addEventListener('click', () => prKey(d));
      keys.appendChild(b);
    }
    prShow();
    prOpen = true;
    prEl().classList.remove('hidden');
    syncPause();
    if (window.Scratchpad) window.Scratchpad.clear();
  }

  // --- papan skor ---
  async function openScores() {
    shopMode = 'skor';
    shopEl.classList.remove('hidden');
    syncPause();
    shopBody.innerHTML = '';
    document.getElementById('shoptitle').textContent = 'Papan Skor';
    const total = Progress.totalScore(profile);
    const grid = shopSection(`Skormu ${total}. Hanya skor terbaik tiap misi yang dihitung.`);
    grid.className = '';
    const row = document.createElement('div');
    row.className = 'scorerow';
    const input = document.createElement('input');
    input.value = profile.nama === 'PEMAIN' ? '' : profile.nama;
    input.placeholder = 'Tulis namamu';
    input.maxLength = 12;
    const save = document.createElement('button');
    save.textContent = 'Simpan nama';
    save.addEventListener('click', () => {
      const nama = input.value.trim().toUpperCase().slice(0, 12);
      if (!nama) return;
      profile.nama = nama;
      persistProfile();
      kirimSkor();
      openScores();
    });
    row.appendChild(input);
    row.appendChild(save);
    grid.appendChild(row);
    const list = document.createElement('div');
    list.textContent = 'Memuat...';
    grid.appendChild(list);
    const top = window.Scores ? await window.Scores.top('math-hero', 'mh4', 10) : null;
    list.innerHTML = '';
    const rows = top || [{ name: profile.nama, score: total }];
    if (!top) { const n = document.createElement('div'); n.textContent = 'Belum tersambung ke papan bersama. Ini skor di perangkat ini.'; list.appendChild(n); }
    rows.forEach((r, i) => {
      const el = document.createElement('div');
      el.className = 'scorerow' + (r.name === profile.nama ? ' me' : '');
      const a = document.createElement('span'), b = document.createElement('span');
      a.textContent = `${i + 1}. ${r.name}`;
      b.textContent = r.score;
      el.appendChild(a); el.appendChild(b);
      list.appendChild(el);
    });
  }
  function kirimSkor() {
    if (!window.Scores) return;
    window.Scores.submit('math-hero', 'mh4', profile.nama, Progress.totalScore(profile), { kelas: profile.kelas, stars: profile.totalStars }).catch(() => {});
  }

  function drainEvents() {
    for (const e of Sim.takeEvents(game)) {
      if (e.type === 'gate') { playSfx('awas'); showGate(); }
      else if (e.type === 'quizHit') answerBlock(e.index, e.value);
      else if (e.type === 'enemyWarn') playSfx('awas');
      else if (e.type === 'enemyStun') { playSfx('hit'); say('Dia pusing! Injak atau serang!'); }
      else if (e.type === 'win') showWin();
      else if (e.type === 'checkpoint') { playSfx('naik'); say('Checkpoint tersimpan!'); }
      else if (e.type === 'reward') {
        playSfx('koin');
        say('Peti reward terbuka!');
        openPr(() => showFoundWeapon(Progress.openChest(profile, level.id)));
      } else if (e.type === 'blast') playSfx('ledak');
      else if (e.type === 'respawn') { playSfx('salah'); say('Kembali ke checkpoint'); }
      else if (e.type === 'hurt') { playSfx('hit'); say(e.why === 'duri' ? 'Awas duri!' : e.why === 'boss' ? 'Serangan boss!' : 'Aduh!'); }
      else if (e.type === 'weapon') { playSfx('klik'); say(`Senjata: ${e.nama}`); }
      else if (e.type === 'bossPhase') { playSfx('bos'); say(`Fase ${e.id}! Boss mengamuk.`); }
      else if (e.type === 'bossDefeated') {
        // Kemenangan terasa berat: waktu melambat dan ledakan beruntun.
        slowT = 1.7;
        sfxQueue = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.7].map((at) => [at, 'ledak']).concat([[1.9, 'bos'], [2.4, 'naik']]);
        sfxClock = 0;
      } else if (e.type === 'enemyHit') hitstop = Math.max(hitstop, 0.045);
      else if (e.type === 'bossRetry') {
        playSfx('salah');
        sayLong(e.assist ? `Coba lagi! Serangan boss kini lebih lemah. ${e.hint || ''}` : `Coba lagi dari Fase ${e.phase}! ${e.hint || ''}`);
      } else if (e.type === 'bossTelegraph') playSfx('awas');
      else if (e.type === 'bossStun') {
        playSfx('ledak');
        // Senjata dekat jauh lebih kuat saat boss tumbang; beri tahu bila sedang memegang senjata jauh.
        const ranged = Weapons.get(game.weapon).type === 'ranged';
        say(ranged ? 'Ganti senjata dekat! Pukulannya 4 kali lebih kuat!' : 'Sekarang! Pukul dari dekat!');
      } else if (e.type === 'bossReflect') { playSfx('hit'); hitstop = Math.max(hitstop, 0.09); say('Terpental!'); }
      else if (e.type === 'bossReflectHit') { playSfx('ledak'); hitstop = Math.max(hitstop, 0.12); }
      else if (e.type === 'bossBlocked') { playSfx('klik'); say('Perisainya menahan! Hancurkan totem dengan senjata dekat!'); }
      else if (e.type === 'bossPropBreak') { playSfx('hit'); hitstop = Math.max(hitstop, 0.06); }
      else if (e.type === 'bossClonePop') playSfx('pop');
      else if (e.type === 'bossBlink') playSfx('hop');
      else if (e.type === 'bossShield') { playSfx('awas'); say('Perisai! Cari totemnya!'); }
      else if (e.type === 'bossLights') { playSfx('awas'); say('Gelap! Pancing dia ke lentera, lalu pukul lenteranya!'); }
      else if (e.type === 'bossFlash') playSfx('naik');
      else if (e.type === 'bossSteal') { playSfx('salah'); say(`${e.nama} dicuri! Ambil kantongnya!`); }
      else if (e.type === 'bossReturn') { playSfx('koin'); say('Senjata kembali!'); }
      else if (e.type === 'bossRecovery') { if (e.open) playSfx('naik'); }
      else if (e.type === 'bossGuard') playSfx('klik');
      else if (e.type === 'bossSummon') { playSfx('bos'); say('Anak buah datang!'); }
      else if (e.type === 'bossBurst') playSfx('ledak');
      else if (e.type === 'bossSlam') playSfx('ledak');
      else if (e.type === 'goalBlocked') { playSfx('salah'); say('Kalahkan boss dulu!'); }
      else if (e.type === 'enemyDown') { playSfx('pop'); say('Musuh kalah!'); }
      else if (e.type === 'stomp') playSfx('hit');
      else if (e.type === 'enemyShoot') playSfx('tembak');
      else if (e.type === 'heroDown') { playSfx('salah'); say('Aduh, Arka tumbang!'); }
      else if (e.type === 'gateOpen') playSfx('benar');
      else if (e.type === 'spring') playSfx('hop');
      else if (e.type === 'dash') playSfx('hop');
      else if (e.type === 'pipe') playSfx('naik');
      else if (e.type === 'crumble') playSfx('klik');
      else if (e.type === 'miniDown') { playSfx('ledak'); say('Mini boss kalah! Jalan terbuka.'); }
      else if (e.type === 'jump') playSfx('lompat');
      else if (e.type === 'djump') playSfx('hop');
      else if (e.type === 'attack') playSfx(e.kind === 'melee' ? 'potong' : 'tembak');
      else if (e.type === 'star') playSfx('bintang');
    }
  }

  let hitstop = 0, slowT = 0, sfxQueue = [], sfxClock = 0;
  // Tutorial berjalan di misi 1 sampai selesai sekali, lalu tidak muncul lagi.
  let tutor = null;
  function runTutor() {
    if (level.id !== 1 || profile.base.seen.includes('tutor') || game.quiz) return;
    if ((profile.best[1] && profile.best[1].done)) return;
    if (!tutor || tutor.game !== game) tutor = Tutor.create(game);
    const coarse = document.documentElement.classList.contains('touch')
      || window.matchMedia('(any-pointer: coarse)').matches;
    const text = Tutor.update(tutor, coarse);
    if (text) { toast = text; toastT = 0.3; hintT = 0; return; }
    profile.base.seen.push('tutor');
    persistProfile();
    tutor = null;
    say('Bagus! Terus ke kanan sampai gerbang soal.');
  }
  function frame(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    dt = Math.min(Math.max(dt, 0), 0.05);
    time += dt;
    countPlay(dt);
    if (sfxQueue.length) {
      sfxClock += dt;
      while (sfxQueue.length && sfxQueue[0][0] <= sfxClock) playSfx(sfxQueue.shift()[1]);
    }
    if (toastT > 0) toastT = Math.max(0, toastT - dt);
    if (hintT > 0) hintT = Math.max(0, hintT - dt);
    if (paused !== wasPaused) {
      wasPaused = paused;
      if (Audio) Audio.setPaused(paused);
    }
    // Kertas coretan hanya tersedia selama soal gerbang sedang tampil.
    if (window.Scratchpad) window.Scratchpad.setAvailable(mode === 'level' && !!game && ((!!game.quiz && !paused) || prOpen));
    if (mode === 'level') {
      if (game && !paused && game.phase === 'play') {
        // Jeda sesaat saat kena menambah rasa pukulan, dan waktu melambat saat boss kalah.
        if (hitstop > 0) hitstop = Math.max(0, hitstop - dt);
        else {
          Sim.update(game, slowT > 0 ? dt * 0.3 : dt, input);
          drainEvents();
          runTutor();
        }
        if (slowT > 0) slowT = Math.max(0, slowT - dt);
      }
      if (game && viewer) viewer.draw(level, game, { time, dt, toast: toastT > 0 ? toast : '', timeBonus: Sim.timeBonus(game) });
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
    // PR diketik dengan angka di laptop.
    if (prOpen) {
      if (/^(Digit|Numpad)[0-9]$/.test(e.code)) prKey(e.code.slice(-1));
      else if (e.code === 'Backspace') prKey('hapus');
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') prCheck();
      e.preventDefault();
      return;
    }
    // Soal gerbang bisa dijawab dengan tombol angka 1 sampai 4 di laptop.
    if (game && game.quiz && !paused && /^Digit[1-4]$/.test(e.code) && !e.repeat) {
      const b = game.quiz.blocks[Number(e.code.slice(5)) - 1];
      if (b && !b.dead) answerBlock(b.index, b.value);
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
      if (isOpen(creditsEl)) closeCredits();
      else if (isOpen(shopEl)) closeShop();
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
  // Kiri dan kanan satu bantalan: jempol boleh bergeser tanpa diangkat.
  function bindDpad(pad, leftEl, rightEl) {
    if (!pad) return;
    let active = null;
    const set = (x) => {
      const r = pad.getBoundingClientRect();
      const isLeft = x < r.left + r.width / 2;
      input.left = isLeft; input.right = !isLeft;
      leftEl.classList.toggle('down', isLeft); rightEl.classList.toggle('down', !isLeft);
    };
    const end = (e) => {
      if (e.pointerId !== active) return;
      active = null;
      input.left = input.right = false;
      leftEl.classList.remove('down'); rightEl.classList.remove('down');
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      if (!paused) set(e.clientX);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === active && !paused) set(e.clientX); });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
  }
  bindDpad(document.getElementById('dpad'), document.getElementById('left'), document.getElementById('right'));
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
  document.getElementById('creditbtn').addEventListener('click', () => openCredits());
  document.getElementById('creditclose').addEventListener('click', closeCredits);
  document.getElementById('titleseries').addEventListener('click', leaveToSeries);
  document.getElementById('serieslink').addEventListener('click', leaveToSeries);
  document.getElementById('home').addEventListener('click', returnHome);
  document.getElementById('dialog').addEventListener('click', () => { if (!tooSoon()) nextLine(); });
  document.getElementById('boardclose').addEventListener('click', () => { boardEl.classList.add('hidden'); syncPause(); });
  document.getElementById('nwuse').addEventListener('click', () => closeFoundWeapon(true));
  document.getElementById('nwkeep').addEventListener('click', () => closeFoundWeapon(false));
  document.getElementById('menubtn').addEventListener('click', openMenu);
  document.getElementById('menuclose').addEventListener('click', closeMenu);
  document.getElementById('shopbtn').addEventListener('click', openShop);
  document.getElementById('scorebtn').addEventListener('click', openScores);
  document.getElementById('keysbtn').addEventListener('click', () => document.getElementById('keystext').classList.toggle('hidden'));
  document.getElementById('prok').addEventListener('click', prCheck);
  document.getElementById('prskip').addEventListener('click', prClose);
  document.getElementById('winshop').addEventListener('click', openShop);
  document.getElementById('shopclose').addEventListener('click', closeShop);
  document.getElementById('restart').addEventListener('click', () => startLevel(idx, false, { same: true }));
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
  baseGame = BaseSim.create('kampung', null, profile.base.built);
  baseGame.animalReady = (kind) => Farm.animalReady(profile.base, kind);
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
  // Kanvas baru memakai font setelah termuat, jadi muat lebih awal.
  if (document.fonts && document.fonts.load) document.fonts.load('14px Kleintenna');
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
    openStorage,
    answerBlock,
    returnHome,
    showBoard,
    startMission,
    stepBase(dt) { updateBase(dt || 1 / 60); },
    draw() {
      if (mode === 'level' && viewer && game) viewer.draw(level, game, { time, dt: 1 / 60, timeBonus: Sim.timeBonus(game) });
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
