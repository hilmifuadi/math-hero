// Math Hero 4: sinkronisasi progres ke Firebase Firestore. Memakai konfigurasi proyek
// yang sama dengan papan skor (window.SCORES_CONFIG). Tanpa konfigurasi/jaringan,
// semua fungsi mengembalikan null/false dan game tetap memakai localStorage.
//   MH4.cloud.load(uid)     -> Promise<profile|null>
//   MH4.cloud.save(profile) -> Promise<boolean>
// Dokumen disimpan di koleksi "saves" dengan id = uid acak milik pemain.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MH4 = root.MH4 || {}).cloud = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const COLLECTION = 'saves';
  const TIMEOUT_MS = 5000;
  let backend = null, backendPromise = null;

  function configured() {
    const c = root.SCORES_CONFIG;
    return !!(c && c.apiKey && c.projectId && !/^ISI_/.test(c.apiKey) && !/^ISI_/.test(c.projectId));
  }

  async function firebaseBackend(cfg) {
    const [appMod, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
    const db = fs.getFirestore(appMod.initializeApp(cfg, 'mh4-save'));
    const col = fs.collection(db, COLLECTION);
    return {
      get: async (uid) => {
        const snap = await fs.getDoc(fs.doc(col, uid));
        return snap.exists() ? snap.data() : null;
      },
      set: (uid, data) => fs.setDoc(fs.doc(col, uid), data),
    };
  }

  function getBackend() {
    if (backend) return Promise.resolve(backend);
    if (!configured()) return Promise.resolve(null);
    if (!backendPromise) {
      backendPromise = firebaseBackend(root.SCORES_CONFIG).then(
        (b) => { backend = b; return b; },
        () => { backendPromise = null; return null; }
      );
    }
    return backendPromise;
  }

  const timeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))]);

  async function load(uid) {
    try {
      if (!uid) return null;
      const b = await getBackend();
      if (!b) return null;
      return await timeout(b.get(uid));
    } catch (e) { return null; }
  }

  async function save(profile) {
    try {
      if (!profile || !profile.uid) return false;
      const b = await getBackend();
      if (!b) return false;
      const Progress = root.MH4 && root.MH4.progress;
      const data = Progress ? Progress.toCloud(profile) : profile;
      await timeout(b.set(profile.uid, data));
      return true;
    } catch (e) { return false; }
  }

  return {
    load, save,
    enabled: () => !!backend || configured(),
    _setBackend(b) { backend = b; backendPromise = null; },
  };
});
