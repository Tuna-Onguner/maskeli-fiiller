/*
 * Maskeli Fiiller – oyun verileri.
 * Kart içerikleri tasarım belgesindeki tablolardan alınmıştır.
 * Kart eklemek ya da düzeltmek için yalnızca bu dosyayı değiştirmek yeterlidir.
 */
window.MF_DATA = (() => {
  // Fiilimsi türleri ve maske renkleri
  const TYPES = {
    isim:  { label: 'İsim-fiil',  mask: 'Mavi',    task: 'Eylemin adıdır' },
    sifat: { label: 'Sıfat-fiil', mask: 'Yeşil',   task: 'İsmi niteler; isim düşerse adlaşır' },
    zarf:  { label: 'Zarf-fiil',  mask: 'Turuncu', task: 'Eylemi zaman ya da durum yönünden niteler' },
  };

  // Ek grupları (Uzman kuralı ve Üret kontrolü için).
  // v: sözcükte kökten hemen sonra aranan ek biçimleri (ünlü/ünsüz uyumu ve y kaynaştırmasıyla)
  const SUFFIX_GROUPS = {
    isim: [
      { id: 'mak', label: '-mak / -mek', v: ['mak', 'mek'] },
      { id: 'ma',  label: '-ma / -me',   v: ['ma', 'me'] },
      { id: 'is',  label: '-ış / -iş / -uş / -üş', v: ['ış', 'iş', 'uş', 'üş', 'yış', 'yiş', 'yuş', 'yüş'] },
    ],
    sifat: [
      { id: 'an',   label: '-an / -en',   v: ['an', 'en', 'yan', 'yen'] },
      { id: 'asi',  label: '-ası / -esi', v: ['ası', 'esi', 'yası', 'yesi'] },
      { id: 'maz',  label: '-maz / -mez', v: ['maz', 'mez'] },
      { id: 'ar',   label: '-ar / -er / -r', v: ['ar', 'er', 'ır', 'ir', 'ur', 'ür', 'r'] },
      { id: 'dik',  label: '-dık / -dik / -duk / -tık…',
        v: ['dık', 'dik', 'duk', 'dük', 'tık', 'tik', 'tuk', 'tük', 'dığ', 'diğ', 'duğ', 'düğ', 'tığ', 'tiğ', 'tuğ', 'tüğ'] },
      { id: 'acak', label: '-acak / -ecek',
        v: ['acak', 'ecek', 'yacak', 'yecek', 'acağ', 'eceğ', 'yacağ', 'yeceğ'] },
      { id: 'mis',  label: '-mış / -miş / -muş / -müş', v: ['mış', 'miş', 'muş', 'müş'] },
    ],
    zarf: [
      { id: 'ip',       label: '-ıp / -ip / -up / -üp', v: ['ıp', 'ip', 'up', 'üp', 'yıp', 'yip', 'yup', 'yüp'] },
      { id: 'arak',     label: '-arak / -erek', v: ['arak', 'erek', 'yarak', 'yerek'] },
      { id: 'inca',     label: '-ınca / -ince',
        v: ['ınca', 'ince', 'unca', 'ünce', 'yınca', 'yince', 'yunca', 'yünce'] },
      { id: 'madan',    label: '-madan / -meden', v: ['madan', 'meden'] },
      { id: 'ken',      label: '-ken', v: [], ends: ['ken'] },
      { id: 'ali',      label: '-alı / -eli', v: ['alı', 'eli', 'yalı', 'yeli'] },
      { id: 'dikca',    label: '-dıkça / -dikçe',
        v: ['dıkça', 'dikçe', 'dukça', 'dükçe', 'tıkça', 'tikçe', 'tukça', 'tükçe'] },
      { id: 'casina',   label: '-casına / -cesine', v: [], ends: ['casına', 'cesine', 'çasına', 'çesine'] },
      { id: 'maksizin', label: '-maksızın / -meksizin', v: ['maksızın', 'meksizin'] },
      { id: 'aa',       label: '-a -a / -e -e', v: [] },
      { id: 'rmaz',     label: '-r -maz', v: [] },
    ],
  };

  // Vaka kartları: s = cümle, w = fiilimsi, t = tür, ek = karttaki ek, g = ek grubu, n = not, tip = tartışma notu
  const VAKA = [
    { id: 'V01', s: 'Her sabah erken kalkmak bana iyi geliyor.', w: 'kalkmak', t: 'isim', ek: '-mak', g: 'mak' },
    { id: 'V02', s: 'Kitap okumayı çok seviyorum.', w: 'okumayı', t: 'isim', ek: '-ma', g: 'ma' },
    { id: 'V03', s: 'Annemin gülüşü evi aydınlatırdı.', w: 'gülüşü', t: 'isim', ek: '-üş', g: 'is',
      tip: 'Dikkat: Yüklemdeki “aydınlatırdı” sıfat-fiil ekine (-ar) benzer ama çekimli fiildir.' },
    { id: 'V04', s: 'Yaz tatilinde yüzmeyi öğrendim.', w: 'yüzmeyi', t: 'isim', ek: '-me', g: 'ma' },
    { id: 'V05', s: 'Dedemin hikâye anlatışı bambaşkadır.', w: 'anlatışı', t: 'isim', ek: '-ış', g: 'is' },
    { id: 'V06', s: 'Bu soruyu çözmek hiç de kolay değil.', w: 'çözmek', t: 'isim', ek: '-mek', g: 'mak' },
    { id: 'V07', s: 'Kardeşim yağmurda oynamaya bayılır.', w: 'oynamaya', t: 'isim', ek: '-ma', g: 'ma' },
    { id: 'V08', s: 'Sınıfta yüksek sesle konuşmak yasaktır.', w: 'konuşmak', t: 'isim', ek: '-mak', g: 'mak' },
    { id: 'V09', s: 'Babam her akşam yürümeye karar verdi.', w: 'yürümeye', t: 'isim', ek: '-me', g: 'ma' },
    { id: 'V10', s: 'Kuşların ötüşü beni her sabah uyandırır.', w: 'ötüşü', t: 'isim', ek: '-üş', g: 'is',
      tip: 'Dikkat: Yüklemdeki “uyandırır” sıfat-fiil ekine (-ar) benzer ama çekimli fiildir.' },
    { id: 'V11', s: 'Kahvaltı yapmamak sağlığa zararlıdır.', w: 'yapmamak', t: 'isim', ek: '-mak', g: 'mak', n: 'olumsuz' },
    { id: 'V12', s: 'Arkadaşımın gelişine çok sevindim.', w: 'gelişine', t: 'isim', ek: '-iş', g: 'is' },
    { id: 'V13', s: 'Bahçede koşan çocuklar çok mutluydu.', w: 'koşan', t: 'sifat', ek: '-an', g: 'an' },
    { id: 'V14', s: 'Bu kitabı okuyanlar çok beğendi.', w: 'okuyanlar', t: 'sifat', ek: '-an', g: 'an', n: 'adlaşmış' },
    { id: 'V15', s: 'Ağlayan bebeği annesi kucağına aldı.', w: 'ağlayan', t: 'sifat', ek: '-an', g: 'an' },
    { id: 'V16', s: 'Dün okuduğum kitabı sana da vereyim.', w: 'okuduğum', t: 'sifat', ek: '-duk', g: 'dik' },
    { id: 'V17', s: 'Yeni tanıştığımız komşular bize tatlı getirdi.', w: 'tanıştığımız', t: 'sifat', ek: '-tık', g: 'dik' },
    { id: 'V18', s: 'Kurumuş yapraklar rüzgârla savruldu.', w: 'kurumuş', t: 'sifat', ek: '-muş', g: 'mis' },
    { id: 'V19', s: 'Okula gidecek öğrenciler durakta bekliyordu.', w: 'gidecek', t: 'sifat', ek: '-ecek', g: 'acak' },
    { id: 'V20', s: 'Kaynar suyla çay demledik.', w: 'kaynar', t: 'sifat', ek: '-ar', g: 'ar' },
    { id: 'V21', s: 'Koşar adımlarla sınıfa girdi.', w: 'koşar', t: 'sifat', ek: '-ar', g: 'ar' },
    { id: 'V22', s: 'Söz dinlemez bir kedimiz var.', w: 'dinlemez', t: 'sifat', ek: '-mez', g: 'maz' },
    { id: 'V23', s: 'Unutulmaz bir yaz tatili geçirdik.', w: 'unutulmaz', t: 'sifat', ek: '-maz', g: 'maz' },
    { id: 'V24', s: 'Bu sıcakta denize giresim geldi.', w: 'giresim', t: 'sifat', ek: '-esi', g: 'asi' },
    { id: 'V25', s: 'Çocuk ağlayarak annesine koştu.', w: 'ağlayarak', t: 'zarf', ek: '-arak', g: 'arak' },
    { id: 'V26', s: 'Eve gelince ödevlerimi yaptım.', w: 'gelince', t: 'zarf', ek: '-ince', g: 'inca' },
    { id: 'V27', s: 'Okula giderken arkadaşımla karşılaştım.', w: 'giderken', t: 'zarf', ek: '-ken', g: 'ken' },
    { id: 'V28', s: 'Kahvaltı yapmadan evden çıktı.', w: 'yapmadan', t: 'zarf', ek: '-madan', g: 'madan' },
    { id: 'V29', s: 'Kitabı okudukça konuyu daha iyi anladım.', w: 'okudukça', t: 'zarf', ek: '-dukça', g: 'dikca' },
    { id: 'V30', s: 'Kapıyı açıp içeri girdi.', w: 'açıp', t: 'zarf', ek: '-ıp', g: 'ip' },
    { id: 'V31', s: 'Buraya taşınalı iki yıl oldu.', w: 'taşınalı', t: 'zarf', ek: '-alı', g: 'ali' },
    { id: 'V32', s: 'Koşa koşa otobüse yetişti.', w: 'koşa koşa', t: 'zarf', ek: '-a -a', g: 'aa' },
    { id: 'V33', s: 'Zil çalar çalmaz bahçeye çıktık.', w: 'çalar çalmaz', t: 'zarf', ek: '-r -maz', g: 'rmaz' },
    { id: 'V34', s: 'Hiç durmaksızın iki saat çalıştı.', w: 'durmaksızın', t: 'zarf', ek: '-maksızın', g: 'maksizin' },
    { id: 'V35', s: 'Her şeyi biliyormuşçasına konuşuyordu.', w: 'biliyormuşçasına', t: 'zarf', ek: '-çasına', g: 'casina' },
    { id: 'V36', s: 'Gülümseyerek bize el salladı.', w: 'gülümseyerek', t: 'zarf', ek: '-erek', g: 'arak' },
  ];

  // "Hayır" cevabı için neden seçenekleri
  const NO_REASONS = {
    kalici:  'Kalıcı isim (bir şeyin adı olmuş)',
    cekimli: 'Çekimli fiil (yüklem, zaman eki almış)',
    olumsuz: 'Olumsuzluk eki -ma/-me (emir kipi)',
    kenisim: '-ken isme gelmiş (ek-fiil)',
  };

  // Tuzak kartları: s = cümle (**koyu sözcük**), a = cevap ('hayir' ya da tür), r = kabul edilen "hayır" nedenleri
  const TUZAK = [
    { id: 'T01', s: 'Bu akşam **dondurma** yiyeceğiz.', a: 'hayir', r: ['kalici'], why: 'Kalıcı isim: bir tatlının adı.' },
    { id: 'T02', s: 'Etleri **dondurma** işi bana kaldı.', a: 'isim', why: 'Dondurma eyleminin adı; -ma eki.' },
    { id: 'T03', s: 'Mutfakta hiç **çakmak** bulamadık.', a: 'hayir', r: ['kalici'], why: 'Kalıcı isim: bir nesnenin adı.' },
    { id: 'T04', s: 'Duvara çivi **çakmak** kolay değil.', a: 'isim', why: 'Çakma eyleminin adı; -mak eki.' },
    { id: 'T05', s: '**Yemek** soğumadan sofraya gelin.', a: 'hayir', r: ['kalici'], why: 'Kalıcı isim: "aş" anlamında.' },
    { id: 'T06', s: 'Çok acıktım, bir şeyler **yemek** istiyorum.', a: 'isim', why: 'Yeme eyleminin adı; -mek eki.' },
    { id: 'T07', s: 'Lütfen bana **bakma**!', a: 'hayir', r: ['olumsuz', 'cekimli'], why: '-ma olumsuzluk ekidir; emir kipinde çekimli fiil.' },
    { id: 'T08', s: 'Çiçeklere **bakma** işini ben üstlendim.', a: 'isim', why: 'Bakma eyleminin adı; -ma eki.' },
    { id: 'T09', s: "Kardeşim yarın Ankara'ya **gidecek**.", a: 'hayir', r: ['cekimli'], why: 'Yüklemdir; -ecek gelecek zaman eki.' },
    { id: 'T10', s: 'Kampa **gidecek** öğrenciler listeye yazılsın.', a: 'sifat', why: '"öğrenciler" ismini niteliyor.' },
    { id: 'T11', s: 'Yapraklar sonbaharda **kurumuş**.', a: 'hayir', r: ['cekimli'], why: 'Yüklemdir; -muş öğrenilen geçmiş zaman eki.' },
    { id: 'T12', s: '**Kurumuş** dalları bahçeden topladık.', a: 'sifat', why: '"dalları" ismini niteliyor.' },
    { id: 'T13', s: 'Ben **çocukken** bu parkta oynardım.', a: 'hayir', r: ['kenisim'], why: '-ken isme gelmiş; ek-fiil.' },
    { id: 'T14', s: 'Parkta **oynarken** düştü.', a: 'zarf', why: '-ken fiile gelmiş.' },
    { id: 'T15', s: 'Annem bugün biber **dolması** yaptı.', a: 'hayir', r: ['kalici'], why: 'Kalıcı isim: bir yemeğin adı.' },
    { id: 'T16', s: 'Ali her sabah süt **içer**.', a: 'hayir', r: ['cekimli'], why: 'Yüklemdir; -er geniş zaman eki.' },
  ];

  // Kök kartları ve hakem için örnek türetmeler
  const KOK = [
    { k: 'koş',    isim: 'koşmak',    sifat: 'koşan',      zarf: 'koşarak' },
    { k: 'oku',    isim: 'okuma',     sifat: 'okuduğum',   zarf: 'okuyunca' },
    { k: 'yaz',    isim: 'yazmak',    sifat: 'yazdığım',   zarf: 'yazarken' },
    { k: 'gül',    isim: 'gülüş',     sifat: 'gülen',      zarf: 'gülerek' },
    { k: 'gel',    isim: 'geliş',     sifat: 'gelecek',    zarf: 'gelince' },
    { k: 'git',    isim: 'gitmek',    sifat: 'giden',      zarf: 'gidip' },
    { k: 'bak',    isim: 'bakış',     sifat: 'bakan',      zarf: 'bakınca' },
    { k: 'uyu',    isim: 'uyumak',    sifat: 'uyuyan',     zarf: 'uyurken' },
    { k: 'çalış',  isim: 'çalışma',   sifat: 'çalışan',    zarf: 'çalıştıkça' },
    { k: 'oyna',   isim: 'oynamak',   sifat: 'oynayan',    zarf: 'oynaya oynaya' },
    { k: 'düşün',  isim: 'düşünmek',  sifat: 'düşündüğüm', zarf: 'düşünmeden' },
    { k: 'konuş',  isim: 'konuşma',   sifat: 'konuşan',    zarf: 'konuşarak' },
    { k: 'ağla',   isim: 'ağlamak',   sifat: 'ağlayan',    zarf: 'ağlayıp' },
    { k: 'dinle',  isim: 'dinlemek',  sifat: 'dinlemez',   zarf: 'dinleyince' },
    { k: 'yüz',    isim: 'yüzme',     sifat: 'yüzen',      zarf: 'yüzerek' },
    { k: 'uç',     isim: 'uçmak',     sifat: 'uçan',       zarf: 'uçunca' },
    { k: 'sev',    isim: 'sevmek',    sifat: 'sevdiğim',   zarf: 'sevince' },
    { k: 'bekle',  isim: 'bekleyiş',  sifat: 'bekleyen',   zarf: 'beklerken' },
    { k: 'anla',   isim: 'anlamak',   sifat: 'anlayan',    zarf: 'anladıkça' },
    { k: 'çiz',    isim: 'çizmek',    sifat: 'çizdiğim',   zarf: 'çizip' },
  ];

  // Balo Salonu: 24 kare, sol üst köşedeki Başlangıç'tan saat yönünde
  const BOARD = [
    'start', 'vaka', 'uret', 'vaka', 'tuzak', 'vaka', 'duello',
    'uret', 'vaka', 'vaka', 'tuzak', 'uret', 'vaka',
    'duello', 'vaka', 'uret', 'tuzak', 'vaka', 'uret',
    'vaka', 'duello', 'tuzak', 'uret', 'vaka',
  ];

  const SQUARES = {
    start:  { label: 'Balo Kapısı', short: 'Başlangıç', icon: '🚪', desc: 'Etkisiz kare' },
    vaka:   { label: 'Vaka',   short: 'Vaka',   icon: '🔍', desc: 'Cümledeki fiilimsiyi bul, türünü söyle' },
    uret:   { label: 'Üret',   short: 'Üret',   icon: '✍️', desc: 'Kökten istenen türde fiilimsi türet, cümlede kullan' },
    tuzak:  { label: 'Tuzak',  short: 'Tuzak',  icon: '🪤', desc: 'Koyu sözcük fiilimsi mi, karar ver' },
    duello: { label: 'Düello', short: 'Düello', icon: '⚔️', desc: 'Bir rakiple aynı soruya yarış' },
  };

  // Hazine: 12 mavi, 12 yeşil, 12 turuncu, 8 altın
  const TREASURY = { isim: 12, sifat: 12, zarf: 12, altin: 8 };

  return { TYPES, SUFFIX_GROUPS, VAKA, NO_REASONS, TUZAK, KOK, BOARD, SQUARES, TREASURY };
})();
