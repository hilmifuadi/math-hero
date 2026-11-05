// Math Hero 4: warga yang mengenali Arka. Tanpa DOM, jadi bisa diuji di Node.
// Isi kalimat disusun dari keadaan: jam, lama bermain, hasil ladang, ternak, koin, kemajuan cerita.
// Tiap warga punya watak sendiri dan tidak mengulang kalimat selama masih ada pilihan lain.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else ((root.MH4 = root.MH4 || {}).talk = factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const NAMA = { kakek: 'Aki Tyo', sari: 'Bida', empu: 'Ayah Hilmi', gapura: 'Farah', guru: 'Nadiya', zahra: 'Mamah Zahra' };
  const AKI_TUTUP = 'Jangan lupa baca Bismillah sebelum pergi berpetualang!';

  // Waktu dari jam di perangkat.
  function waktu(hour) {
    if (hour >= 21 || hour < 4) return 'larut';
    if (hour < 11) return 'pagi';
    if (hour < 15) return 'siang';
    if (hour < 18) return 'sore';
    return 'malam';
  }

  const SAPA = {
    kakek: {
      pagi: ['Pagi, Cu. Sudah sarapan belum? Perut kosong bikin cangkul terasa berat.', 'Selamat pagi, Arka. Embun masih basah, waktu terbaik melihat ladang.'],
      siang: ['Siang begini Aki biasanya berteduh. Sudah makan siang, Cu?', 'Matahari sedang tinggi. Jangan lupa minum, Cu.'],
      sore: ['Sore yang enak ya, Cu. Sudah mandi belum? Aki bisa mencium bau petualangan dari sini.', 'Sore, Cu. Angin sore begini bagus untuk menyiram ladang.'],
      malam: ['Sudah malam, Cu. Sudah makan malam bersama keluarga?', 'Malam ini bintangnya bagus. Sebentar lagi waktunya istirahat.'],
    },
    sari: {
      pagi: ['Selamat pagi, pelanggan pertamaku! Sudah sarapan? Kalau belum, jangan belanja dulu, nanti salah hitung.', 'Pagi, Arka! Kios baru buka, benih masih segar.'],
      siang: ['Siang, Arka! Sudah makan? Kalau lapar, hitung koinnya suka meleset lho.', 'Wah, siang-siang tetap semangat. Mari, mari.'],
      sore: ['Sore, Arka! Sebentar lagi kios tutup, ayo pilih sekarang.', 'Sore yang ramai! Yah, ramai oleh kamu saja sih.'],
      malam: ['Eh, malam-malam masih belanja? Bida hitung cepat ya.', 'Malam, Arka. Kios sebenarnya mau tutup, tapi untukmu boleh deh.'],
    },
    empu: {
      pagi: ['Pagi, Nak. Sudah sarapan? Ayah tidak mau kamu bertarung dengan perut kosong.', 'Pagi, Nak. Tungku baru menyala, pas untuk mengasah senjata.'],
      siang: ['Siang, Nak. Sudah makan? Sini, duduk dulu sebentar.', 'Panas sekali di dekat tungku. Kamu sudah minum, Nak?'],
      sore: ['Sore, Nak. Hari ini kamu sudah belajar apa?', 'Sore, Nak. Sudah salat Asar? Senjata bisa menunggu sebentar.'],
      malam: ['Malam, Nak. Tungku Ayah sudah mau dipadamkan. Kamu juga sebentar lagi istirahat, ya.', 'Sudah Isya, Nak? Setelah itu kita lihat senjatamu.'],
    },
    gapura: {
      pagi: ['Selamat pagiii, Arka! Hari ini pasti seru banget! Sudah sarapan belum? Pahlawan butuh tenaga!', 'Pagi, pagi, pagi! Lihat, mataharinya saja ikut semangat!'],
      siang: ['Haiii, Arka! Siang-siang begini tetap keren ya! Sudah makan? Makan dulu kalau belum!', 'Siang, pahlawan kita! Farah sudah menunggu dari tadi lho!'],
      sore: ['Sore, Arka! Langitnya cantik sekali! Kamu pasti bisa menyelesaikan satu misi lagi!', 'Yeay, kamu datang! Sore ini kita bikin cerita baru!'],
      malam: ['Wah, malam-malam masih semangat! Farah bangga! Tapi jangan sampai kurang tidur, ya!', 'Malam, Arka! Bintangnya kalah terang sama semangatmu!'],
    },
    guru: {
      pagi: ['Selamat pagi, Arka! Sudah sarapan? Otak perlu makan juga, sama seperti perut.', 'Pagi, Arka. Pikiran paling segar saat pagi, cocok untuk berhitung.'],
      siang: ['Selamat siang, Arka. Sudah makan siang dan salat Zuhur?', 'Siang, Arka. Kalau mengantuk, cuci muka dulu sebelum mengerjakan soal.'],
      sore: ['Selamat sore, Arka. PR sekolahmu sudah selesai belum?', 'Sore, Arka. Main boleh, tapi PR dulu ya.'],
      malam: ['Selamat malam, Arka. Tas sekolah untuk besok sudah disiapkan?', 'Malam, Arka. Sebelum tidur, coba ingat satu hal baru yang kamu pelajari hari ini.'],
    },
    zahra: {
      pagi: ['Pagi, Sayang. Sudah salat Subuh dan sarapan? Sini, Mamah lihat wajahmu.', 'Assalamualaikum, Sayang. Pagi ini sudah berdoa belum?'],
      siang: ['Sayang, sudah makan siang? Sudah salat Zuhur?', 'Siang, Sayang. Jangan lupa minum air putih, ya.'],
      sore: ['Sore, Sayang. Sudah mandi? Sudah salat Asar?', 'Sebentar lagi Magrib, Sayang. Jangan terlalu jauh mainnya.'],
      malam: ['Sudah salat Magrib dan Isya, Sayang? Setelah makan malam, sikat gigi ya.', 'Malam, Sayang. Jangan lupa baca doa sebelum tidur.'],
    },
  };

  const LARUT = {
    kakek: ['Cu, ini sudah larut sekali. Aki saja sudah mengantuk. Tidur dulu, ladang tidak akan lari.', 'Lho, kok belum tidur? Anak-anak seumurmu harusnya sudah terlelap, Cu.'],
    sari: ['Arka! Ini jam berapa? Kios tutup untuk anak yang belum tidur. Besok saja, ya!', 'Bida tidak melayani pelanggan yang seharusnya sudah tidur. Ayo, tidur dulu!'],
    empu: ['Nak, sudah terlalu malam. Ayah minta kamu tidur sekarang. Besok kita lanjutkan.', 'Pahlawan yang kuat itu cukup tidur, Nak. Matikan dulu ya.'],
    gapura: ['Arka, Farah suka semangatmu, tapi sekarang sudah malam banget! Tidur dulu ya, besok kita seru-seruan lagi!', 'Gerbangnya ngantuk, Farah ngantuk, kamu juga pasti ngantuk! Tidur yuk!'],
    guru: ['Arka, tidur larut membuat sulit berkonsentrasi besok. Nadiya minta kamu tidur sekarang.', 'Sudah lewat jam tidur, Arka. Soalnya bisa dikerjakan besok pagi.'],
    zahra: ['Sayang, ini sudah lewat jam tidur. Baca doa, lalu tidur ya. Mamah temani doanya.', 'Sudah larut, Sayang. Tubuhmu juga punya hak untuk istirahat.'],
  };

  const LAMA = {
    kakek: ['Cu, matamu sudah lama di layar. Lihat jendela sebentar, lalu gantian main sama yang lain.', 'Sudah satu jam lebih kamu di sini. Istirahat dulu, Cu. Ladangnya biar Aki yang jaga.'],
    sari: ['Sudah lama sekali kamu di kampung, Arka! Istirahat dulu, gantian sama yang lain. Kios tidak ke mana-mana.', 'Bida hitung, kamu sudah main lebih dari satu jam. Waktunya berhenti sebentar!'],
    empu: ['Nak, sudah lebih dari sejam. Senjata saja perlu didinginkan, apalagi mata. Istirahat ya.', 'Ayo berhenti dulu, Nak. Coba tanya, ada yang mau gantian main?'],
    gapura: ['Kamu hebat sekali main sampai lebih dari sejam! Sekarang istirahat dulu ya, gantian dengan yang lain, nanti balik lagi!', 'Farah punya misi spesial: berhenti main, minum air, dan lihat jauh ke luar! Yuk!'],
    guru: ['Sudah lebih dari sejam, Arka. Belajar yang baik itu ada jedanya. Istirahatkan matamu.', 'Waktu istirahat, Arka. Otak menyimpan pelajaran saat beristirahat.'],
    zahra: ['Sayang, sudah lama mainnya. Istirahat dulu, bantu orang tua atau gantian dengan saudaramu.', 'Mainnya sudah cukup untuk sekarang, Sayang. Waktu itu amanah, gunakan untuk yang lain juga.'],
  };

  const WATAK = {
    kakek: [
      'Waktu Aki muda, kabut seperti ini belum pernah ada. Yang ada cuma kabut pagi dan Aki yang kesiangan.',
      'Tanaman itu seperti ilmu, Cu. Disiram sedikit tapi rutin, nanti panen banyak.',
      'Lutut Aki bilang besok hujan. Lutut Aki hampir selalu benar.',
      'Kalau jatuh, bangun lagi. Aki dulu jatuh dari pohon mangga tiga kali. Mangganya enak.',
      'Bilang terima kasih pada ayam kita. Telurnya banyak berjasa untuk kampung ini.',
      'Orang pintar bukan yang tidak pernah salah, tapi yang mau mencoba lagi.',
      'Aki tidak terlalu paham senjata. Yang Aki paham, cangkul pun bisa jadi pahlawan.',
    ],
    sari: [
      'Beli dua lebih hemat daripada menyesal besok. Itu rumus dagang Bida.',
      'Wortel bagus untuk mata dan untuk bekal. Bida tidak dibayar untuk bilang begitu. Ya, sedikit.',
      'Kemarin ada yang menawar benih pakai batu. Bida tolak, tapi batunya bagus juga.',
      'Tahu kenapa Bida jago berhitung? Karena tiap salah hitung, rugi sendiri!',
      'Gandum lebih mahal dijual. Wortel lebih berguna dibawa. Pilih yang cocok, ya.',
      'Kalau ada yang bilang dagang itu gampang, suruh dia hitung kembalian sambil digigit ayam.',
    ],
    empu: [
      'Pedang yang bagus bukan yang paling tajam, tapi yang dipakai dengan bijak, Nak.',
      'Ayah bangga bukan karena kamu menang, tapi karena kamu tidak menyerah.',
      'Kalau musuhnya sulit dijangkau, coba senjata jauh. Tiap lawan ada caranya.',
      'Palu Ayah ini sudah menempa banyak hal. Yang paling susah ditempa itu sabar.',
      'Bom Pelontar itu melengkung, Nak. Dekati dulu, lalu biarkan jatuh di atas musuh.',
      'Sebelum bertarung, tarik napas dulu. Ayah juga begitu sebelum memukul besi.',
    ],
    gapura: [
      'Kamu tahu tidak? Setiap langkahmu bikin kampung makin cerah! Keren banget!',
      'Tidak apa-apa kalau kalah! Kalah itu latihan menang! Ayo lagi!',
      'Farah sudah bikin yel-yel untukmu! Arka, Arka, hebat! Hitung, lompat, cepat!',
      'Tadi ada burung lewat, Farah kira itu kamu saking cepatnya!',
      'Soal susah? Justru itu yang bikin kamu makin pintar! Ayo!',
      'Hari ini hari terbaik! Besok juga! Lusa juga!',
    ],
    guru: [
      'Tahu tidak? Angka 9 itu unik: jumlah angka hasil kali 9 selalu kembali ke 9. Coba 9 x 7.',
      'Kalau soal terasa sulit, pecah jadi bagian kecil. 25 x 4 sama dengan 100, lho.',
      'Salah itu bagian dari belajar, Arka. Yang penting tahu kenapa salahnya.',
      'Coba hitung bintang yang kamu kumpulkan. Itu juga latihan matematika.',
      'Di gerbang nanti, kamu boleh pakai kertas coretan. Tidak ada yang melarang.',
      'Nadiya suka orang yang banyak bertanya. Bertanya bukan tanda tidak pintar, itu tanda mau tahu.',
    ],
  };

  // Nasihat Mamah Zahra untuk anak.
  const NASIHAT = [
    'Sayang, mulai semua kebaikan dengan Bismillah, dan akhiri dengan Alhamdulillah.',
    'Senyum kepada saudaramu itu sedekah, Sayang. Murah sekali, tapi besar nilainya.',
    'Sayangi yang lebih muda, hormati yang lebih tua. Itu akhlak seorang Muslim.',
    'Jujur itu menenangkan hati, Sayang. Kalau salah, akui saja, lalu perbaiki.',
    'Bantu Ayah dan Mamah di rumah ya. Berbakti kepada orang tua itu amal yang sangat besar.',
    'Kalau marah, diam dulu, lalu ambil wudu. Marahnya biasanya jadi reda.',
    'Ucapkan salam saat masuk rumah dan saat bertemu teman. Salam itu menumbuhkan rasa sayang.',
    'Menuntut ilmu itu ibadah, Sayang. Jadi belajar matematika pun berpahala kalau niatnya baik.',
    'Makan dengan tangan kanan, duduk yang baik, dan baca doa sebelum makan.',
    'Kalau dapat rezeki, bilang Alhamdulillah. Kalau dapat ujian, bersabar. Dua-duanya baik untukmu.',
    'Jangan lupa berbagi. Sedekah tidak akan membuat hartamu berkurang, Sayang.',
    'Menjaga kebersihan itu bagian dari iman. Cuci tangan, sikat gigi, rapikan mainan.',
    'Kalau temanmu berbuat salah, maafkan. Allah menyayangi orang yang pemaaf.',
    'Salat tepat waktu ya, Sayang. Itu cara kita bilang terima kasih kepada Allah.',
    'Berkata baik atau diam, Sayang. Kata-kata itu seperti panah, sulit ditarik kembali.',
    'Tepati janjimu, walau hanya janji kecil kepada adik atau teman.',
  ];

  function fakta(ctx) {
    const p = ctx.profile, b = p.base, items = b.items || {};
    const plots = b.plots || [];
    const ripe = plots.filter((x) => x.crop && x.stage >= (ctx.ripe || 3)).length;
    const dry = plots.filter((x) => x.crop && x.stage < (ctx.ripe || 3) && !x.watered).length;
    const empty = plots.filter((x) => !x.crop).length;
    return {
      items, ripe, dry, empty, koin: p.koin || 0, points: p.points || 0, day: b.day || 1,
      seeds: (b.seeds && (b.seeds.wortel || 0) + (b.seeds.gandum || 0)) || 0,
      pack: b.pack, kelas: p.kelas || 0, ready: ctx.animalsReady || [], done: ctx.done || 0,
      next: ctx.nextMission, last: ctx.last, gear: p.gear || {},
      built: b.built || [], titu: (b.built || []).includes('titu'),
    };
  }

  // Komentar yang hanya muncul bila keadaannya benar.
  function status(id, f) {
    const out = [];
    const add = (cond, text) => { if (cond) out.push(text); };
    // Semua warga mengenal Titu, dan masing-masing punya cerita sendiri tentangnya.
    const TITU = {
      kakek: ['Titu tadi tidur di sandal Aki. Aki tidak tega membangunkannya, jadi Aki pakai satu sandal saja.', 'Kucingmu itu pintar, Cu. Dia tahu kapan Aki membuka bekal ikan asin.'],
      sari: ['Titu! Jangan cakar karung benih! Arka, kucingmu lucu tapi nakal.', 'Bida hitung, Titu sudah tiga kali mampir minta ikan hari ini. Bida catat sebagai utangmu, hihi.'],
      empu: ['Titu suka duduk dekat tungku, hangat katanya. Ayah jadi punya teman kerja.', 'Titu takut suara palu, tapi tetap saja duduk menonton. Gengsi, mungkin.'],
      gapura: ['Titu! Halo Titu! Kamu mau ikut berpetualang juga? Hihi, nanti kamu basah kena sungai!', 'Farah dan Titu sudah sepakat: kami berdua penggemar nomor satu Arka!'],
      guru: ['Titu mengikutimu terus. Coba hitung, berapa langkah kucing untuk satu langkahmu?', 'Kucing tidur sekitar dua belas jam sehari. Titu sepertinya ingin memecahkan rekor.'],
      zahra: ['Sayang, Titu sudah dikasih makan dan minum? Merawat hewan dengan baik itu juga ibadah.', 'Jangan tarik ekor Titu ya, Sayang. Hewan juga merasakan sakit.'],
    };
    if (f.titu && TITU[id]) for (const s of TITU[id]) out.push(s);
    const has = (b) => f.built.includes(b);
    if (id === 'kakek') add(f.built.length >= 3, 'Kampung kita makin ramai, Cu. Aki bersyukur bisa melihatnya.');
    if (id === 'kakek') add(has('altar'), 'Kristal Bilangan di altar itu bersinar terus. Aki jadi teringat masa muda.');
    if (id === 'sari') add(has('dapur'), 'Sejak ada dapur umum, Bida jual bumbu lebih banyak. Terima kasih, Arka!');
    if (id === 'empu') add(has('bengkel'), 'Bengkel baru itu luas sekali, Nak. Ayah bisa menempa sambil melihat sungai.');
    if (id === 'gapura') add(has('perahu'), 'Kamu lihat perahu di sungai? Farah ingin naik sekali saja! Sekali saja!');
    if (id === 'guru') add(has('sekolah'), 'Sekarang kita punya sekolah sendiri! Anak-anak kampung bisa belajar bersama.');
    if (id === 'zahra') add(has('taman') || has('bunga'), 'Bunganya cantik sekali, Sayang. Allah menyukai keindahan.');
    if (id === 'zahra') add(has('unggun'), 'Malam nanti kita berkumpul di api unggun ya, Sayang. Sambil bercerita.');
    if (id === 'kakek') {
      add(f.ripe > 0, `Cu, ${f.ripe} petak sudah siap panen. Sayang kalau dibiarkan lama.`);
      add(f.dry > 0, `Ada ${f.dry} petak yang belum disiram, Cu. Tanaman juga haus.`);
      add(f.empty >= 5, `Masih ${f.empty} petak kosong. Tanah kosong itu menunggu dipercaya, Cu.`);
      add(f.ready.includes('Ayam'), 'Ayam kita sudah bertelur tuh. Ambil di kandang sebelum Mamah Zahra yang mengambil.');
      add(f.last && f.last.win, f.last && `Aki dengar kamu berhasil di ${f.last.nama}. Aki sampai cerita ke semua ayam.`);
    } else if (id === 'sari') {
      for (const [k, nama] of [['gandum', 'gandum'], ['wol', 'wol'], ['wortel', 'wortel'], ['telur', 'telur'], ['susu', 'susu']]) {
        add((f.items[k] || 0) >= 2, `Wah, kamu punya ${f.items[k]} ${nama} ya, Arka. Jangan lupa dijual lewat peti, lumayan koinnya!`);
      }
      add(f.koin >= 300, `Koinmu ${f.koin}! Kaya juga kamu. Ayah Hilmi pasti senang kalau kamu mampir.`);
      add(f.koin < 15, `Koinmu tinggal ${f.koin}. Jual hasil ladang dulu, ya. Bida tidak terima utang.`);
      add(f.seeds === 0, 'Benihmu habis, Arka. Ladang kosong itu rugi, ayo beli.');
    } else if (id === 'empu') {
      add(f.points > 0, `Nak, kamu punya ${f.points} poin upgrade yang belum dipakai. Sini, Ayah bantu.`);
      add(f.koin >= 150, `Koinmu ${f.koin}, Nak. Cukup untuk perlengkapan baru kalau kamu mau.`);
      add(!f.pack && f.done > 0, 'Kamu sering berangkat tanpa bekal ya? Ayah khawatir. Ambil wortel atau telur dari peti.');
      add(f.last && f.last.deaths >= 3, f.last && `Ayah dengar di ${f.last.nama} kamu jatuh ${f.last.deaths} kali. Tidak apa-apa, yang penting bangkit lagi.`);
    } else if (id === 'gapura') {
      add(!!f.next, f.next && `Berikutnya ${f.next}! Farah yakin kamu pasti bisa!`);
      add(f.pack, 'Bekalmu sudah siap! Persiapan yang bagus, Arka!');
      add(!f.pack && f.done > 0, 'Eh, kamu belum bawa bekal! Mampir ke peti dulu supaya lebih kuat!');
      add(f.last && f.last.win && f.last.stars > 0, f.last && `Tadi kamu dapat ${f.last.stars} bintang di ${f.last.nama}! Wow, wow, wow!`);
      add(f.last && !f.last.win, 'Kemarin belum berhasil? Tidak apa! Sekarang kamu sudah lebih pintar!');
    } else if (id === 'guru') {
      add(!!f.kelas, `Kamu kelas ${f.kelas} ya. Soal di gerbang sudah Nadiya sesuaikan: ada yang mudah dan ada yang menantang.`);
      add(f.last && f.last.win, f.last && `Bagus di ${f.last.nama}! Dapat ${f.last.stars} bintang, berarti kamu teliti.`);
      add(f.done >= 10, `Sudah ${f.done} misi selesai. Kalau soalnya terasa mudah, naikkan kelasnya.`);
    } else if (id === 'zahra') {
      add(f.ready.length > 0, `Sayang, ${f.ready.join(' dan ')} sudah punya hasil di kandang. Ambil ya, sambil bersyukur.`);
      add(f.koin >= 200, `Rezekimu ${f.koin} koin, Alhamdulillah. Jangan lupa berbagi ya, Sayang.`);
      add(f.last && f.last.win, f.last && `Mamah dengar kamu menang di ${f.last.nama}. Alhamdulillah. Jangan sombong ya, Sayang.`);
    }
    return out;
  }

  // Ambil kalimat yang paling lama tidak diucapkan.
  function pick(list, memo, id) {
    if (!list.length) return null;
    memo.said = memo.said || {};
    const said = memo.said[id] = memo.said[id] || {};
    memo.tick = (memo.tick || 0) + 1;
    let best = list[0], bestT = Infinity;
    list.forEach((s, i) => {
      const t = said[s] === undefined ? -1000 + i : said[s];
      if (t < bestT) { bestT = t; best = s; }
    });
    said[best] = memo.tick;
    return best;
  }

  // ctx: { hour, playMin, profile, animalsReady, done, nextMission, last, story }
  // memo disimpan pemanggil selama sesi, supaya salam tidak diulang-ulang.
  function compose(id, ctx, memo) {
    memo = memo || {};
    const who = NAMA[id];
    const w = waktu(ctx.hour);
    const f = fakta(ctx);
    const lines = [];
    const say = (t) => { if (t) lines.push([who, t]); };
    memo.greet = memo.greet || {};
    if (w === 'larut') say(pick(LARUT[id], memo, id));
    else if ((ctx.playMin || 0) >= 60) say(pick(LAMA[id], memo, id));
    else if (memo.greet[id] !== ctx.hour) { say(pick(SAPA[id][w], memo, id)); memo.greet[id] = ctx.hour; }

    // Pesan cerita yang belum pernah didengar lebih dulu, lalu komentar keadaan, lalu watak.
    memo.story = memo.story || {};
    const story = (ctx.story || []).filter((l) => !memo.story[l[1]]);
    if (story.length) {
      story.forEach((l) => { memo.story[l[1]] = true; say(l[1]); });
    } else {
      const st = status(id, f);
      if (st.length) say(pick(st, memo, id));
      if (id === 'zahra') say(pick(NASIHAT, memo, id));
      else if (!st.length || lines.length < 2) say(pick(WATAK[id], memo, id));
    }
    if (id === 'zahra' && !lines.some((l) => NASIHAT.includes(l[1]))) say(pick(NASIHAT, memo, id));
    if (id === 'kakek') say(AKI_TUTUP);
    return lines;
  }

  return { compose, waktu, NAMA, NASIHAT, AKI_TUTUP };
});
