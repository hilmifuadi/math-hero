// T2: kontrol sentuh untuk HP. Hanya tiga kontrol: joystick arah, tombol lompat, tombol aksi (plus pause).
// Modul ini hanya mencatat status input. Gerakan karakter ada di main.js.
(function () {
  const JOY_RADIUS = 46;     // jarak maksimum knob dari pusat joystick (px CSS)
  const DEAD_ZONE = 0.2;     // di bawah ini dianggap diam

  const input = { left: false, right: false, up: false, down: false, jump: false, action: false, pausePressed: false, joy: { x: 0, y: 0 } };
  window.Input = input;

  const ui = document.getElementById('controls');
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const btnJump = document.getElementById('btn-jump');
  const btnAction = document.getElementById('btn-action');
  const btnPause = document.getElementById('btn-pause');

  // Keyboard laptop: panah/WASD jalan, Spasi/Z/K lompat, B/X/J aksi, P/Esc jeda.
  const MOVE = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
  const JUMP = { Space: 1, KeyZ: 1, KeyK: 1 }, ACT = { KeyB: 1, KeyX: 1, KeyJ: 1 }, PAUSE = { KeyP: 1, Escape: 1 };
  const keys = { l: false, r: false, u: false, d: false };
  let kbJump = false, kbAct = false, touchJump = false, touchAct = false;
  const splashEl = document.getElementById('splash'), quizEl = document.getElementById('quiz');
  const gameKeysOn = () => splashEl.classList.contains('hidden') && quizEl.classList.contains('hidden')
    && !document.querySelector('.panel:not(.hidden)');

  let joyPointer = null;
  let joyCenter = { x: 0, y: 0 };

  function setJoy(dx, dy) {
    const len = Math.hypot(dx, dy);
    const cl = Math.min(len, JOY_RADIUS);
    const nx = len > 0 ? (dx / len) * cl : 0;
    const ny = len > 0 ? (dy / len) * cl : 0;
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
    const ax = nx / JOY_RADIUS;
    const ay = ny / JOY_RADIUS;
    input.joy.x = Math.abs(ax) < DEAD_ZONE ? 0 : ax;
    input.joy.y = Math.abs(ay) < DEAD_ZONE ? 0 : ay;
    input.left = input.joy.x < -DEAD_ZONE;
    input.right = input.joy.x > DEAD_ZONE;
    input.up = input.joy.y < -DEAD_ZONE;
    input.down = input.joy.y > DEAD_ZONE;
  }

  function applyKeys() {
    if (joyPointer !== null) return;
    const x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    input.joy.x = x; input.joy.y = y;
    input.left = x < 0; input.right = x > 0; input.up = y < 0; input.down = y > 0;
  }
  function syncButtons() { input.jump = touchJump || kbJump; input.action = touchAct || kbAct; }

  function resetJoy() {
    joyPointer = null;
    knob.style.transform = 'translate(0px, 0px)';
    input.joy.x = 0; input.joy.y = 0;
    input.left = input.right = input.up = input.down = false;
    applyKeys();
  }

  base.addEventListener('pointerdown', (e) => {
    joyPointer = e.pointerId;
    base.setPointerCapture(e.pointerId);
    const r = base.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    setJoy(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
    e.preventDefault();
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointer) return;
    setJoy(e.clientX - joyCenter.x, e.clientY - joyCenter.y);
    e.preventDefault();
  });
  const endJoy = (e) => { if (e.pointerId === joyPointer) resetJoy(); };
  base.addEventListener('pointerup', endJoy);
  base.addEventListener('pointercancel', endJoy);
  base.addEventListener('lostpointercapture', endJoy);

  function holdButton(el, key) {
    const set = (v) => { if (key === 'jump') touchJump = v; else touchAct = v; syncButtons(); };
    el.addEventListener('pointerdown', (e) => { set(true); el.classList.add('down'); e.preventDefault(); });
    const up = () => { set(false); el.classList.remove('down'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  holdButton(btnJump, 'jump');
  holdButton(btnAction, 'action');

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !gameKeysOn()) return;
    const m = MOVE[e.code];
    if (m) { keys[m] = true; applyKeys(); }
    else if (JUMP[e.code]) { kbJump = true; syncButtons(); }
    else if (ACT[e.code]) { kbAct = true; syncButtons(); }
    else if (PAUSE[e.code]) { if (!e.repeat) input.pausePressed = true; }
    else return;
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const m = MOVE[e.code];
    if (m) { keys[m] = false; applyKeys(); }
    else if (JUMP[e.code]) { kbJump = false; syncButtons(); }
    else if (ACT[e.code]) { kbAct = false; syncButtons(); }
  });
  window.addEventListener('blur', () => { keys.l = keys.r = keys.u = keys.d = false; kbJump = kbAct = false; applyKeys(); syncButtons(); });

  btnPause.addEventListener('click', () => { input.pausePressed = true; });

  // Cegah menu konteks, seleksi teks, dan zoom dua jari di area permainan.
  ui.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
