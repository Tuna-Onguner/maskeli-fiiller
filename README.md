# Maskeli Fiiller

Fiilimsileri bulup türünü söylediğin, dedektif temalı bir Türkçe oyunu. 8. sınıf (LGS) fiilimsi konusu için hazırlandı; TÜBİTAK 4006-B Bilim Fuarı tasarım projesinin tarayıcı sürümüdür.

> Kelimeler Sarayı'nda maskeli balo var. Bazı fiiller ek takıp kılık değiştirmiş: kimi isim, kimi sıfat, kimi zarf gibi davranıyor. Oyuncular dedektiftir; maskeli fiilleri yakalar ve hangi maskeyi taktıklarını bulurlar.

| Tür | Maske |
| --- | --- |
| İsim-fiil | Mavi |
| Sıfat-fiil | Yeşil |
| Zarf-fiil | Turuncu |
| Joker | Altın |

## Oyun modları

- **Tam oyun (2–4 oyuncu ya da takım, 25–30 dk):** Aynı ekranda sırayla oynanır. 24 karelik Balo Salonu tahtasında zar atılır; Vaka, Üret, Tuzak ve Düello kareleri maske kazandırır. Her renkten 2 maske toplayan ilk dedektif kazanır. İtiraz hakkı, takas ve isteğe bağlı Uzman kuralı vardır.
- **Fuar modu (5 dk):** Ziyaretçi 3 Vaka ve 1 Tuzak sorusu çözer; en az 3 doğru “Fiilimsi Dedektifi” rozeti kazandırır. İki ziyaretçi gelirse düello oynanır. Çetele, bu cihazda kaç ziyaretçinin oynadığını ve rozet aldığını sayar.

Oyun her turdan sonra tarayıcıya kaydedilir; sayfa kapansa da “Oyuna devam et” ile sürer.

## Dosyalar

| Dosya | İçerik |
| --- | --- |
| `index.html` | Sayfa iskeleti |
| `css/style.css` | Görünüm |
| `js/data.js` | Tüm kartlar (36 Vaka, 16 Tuzak, 20 Kök), tahta düzeni, ek listeleri |
| `js/game.js` | Oyun kuralları ve ekranlar |

Kart eklemek ya da düzeltmek için yalnızca `js/data.js` dosyasını değiştirmek yeterlidir. Derleme adımı ya da paket kurulumu yoktur.

## Bilgisayarda çalıştırma

`index.html` dosyasını tarayıcıda açmak yeterlidir. İsterseniz küçük bir sunucuyla da açabilirsiniz:

```bash
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresine gidin.

## GitHub Pages'te yayınlama

1. GitHub'da yeni bir depo açın (ör. `maskeli-fiiller`) ve bu klasördeki dosyaları deponun köküne yükleyin.
2. Deponun **Settings → Pages** sayfasına gidin.
3. **Build and deployment → Source** için **Deploy from a branch** seçin; dal olarak `main`, klasör olarak `/ (root)` seçip kaydedin.
4. Bir iki dakika sonra oyun `https://<kullanıcı-adı>.github.io/maskeli-fiiller/` adresinde açılır.

İnternet bağlantısı olmayan bir fuar standında oyun yine çalışır; yalnızca yazı tipleri sistem yazı tipine döner.

## Lisans

MIT Lisansı. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
