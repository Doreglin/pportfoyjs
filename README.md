Portfolio Canvas Pro - No-Code Website Builder

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Portfolio Canvas Pro**, tarayıcı üzerinde çalışan, Figma ve Webflow hissiyatı veren tam teşekküllü bir **Kodsuz (No-Code) Web Sitesi İnşa Motorudur**. Herhangi bir dış kütüphane (React, Vue vb.) kullanılmadan, tamamen Vanilla JavaScript mimarisi ile "Veri Güdümlü" (Data-Driven) olarak sıfırdan geliştirilmiştir.

## 📸 Arayüz ve Çalışma Alanı

*Sistemin ana çalışma alanını, sonsuz tuval motorunu ve çift panelli kontrol arayüzünü aşağıda görebilirsiniz:*

![Portfolio Canvas Pro Arayüzü](<img width="1919" height="1079" alt="Ekran görüntüsü 2026-04-10 085526" src="https://github.com/user-attachments/assets/26d831c9-f1d7-4e2b-81cf-03a60ec8c48a" />
)
*(Not: Ekran görüntünüzü proje klasörüne `arayuz.png` adıyla eklediğinizde burada görünecektir.)*

## 🚀 Öne Çıkan Özellikler

* **♾️ Sonsuz Tuval & Zoom Motoru:** 6000x6000px devasa tasarım çalışma alanı. `%20`'den `%200`'e kadar kusursuz koordinat hesaplamalı yakınlaştırma (Zoom) özelliği.
* **🧲 Akıllı Sürükle-Bırak & Grid Mıknatısı:** Öğeleri farenin tam sol üst ucundan kavrayın ve özgürce konumlandırın. 10px *Snap-to-Grid* motoru sayesinde her şey her zaman milimetrik hizada kalır.
* **📦 İç İçe Gruplama (Nested Divs):** Div (kutu) oluşturun ve içine başlık, metin, resim veya butonları sürükleyin. Hiyerarşik yapı sayesinde ebeveyn öğe taşındığında çocuklar da beraberinde gelir.
* **📱 Responsive Cihaz Simülatörü:** Tasarımınızı Masaüstü, Tablet ve Mobil ekranlarda canlı olarak test edin. Akıllı ölçekleme (Responsive Scale) motoru, CSS Flex/Grid bilmenize gerek kalmadan tasarımları cihaz ekranına taşırmadan sığdırır.
* **🎨 Profesyonel Stilleme & Hover Efektleri:** Her bir öğe için CSS tabanlı gölge (blur), kenarlık, şeffaflık ayarları ve pürüzsüz Hover (üzerine gelme) renk/arkaplan geçişleri.
* **🗂️ Katmanlar Paneli (Layers Tree):** Sitenizdeki tüm hiyerarşiyi ağaç yapısında görün. Öğeleri kilitleyin (Lock), seçin veya sürükleyerek Z-Index (çizim sırası) değerlerini anında değiştirin.
* **🕰️ Zaman Makinesi (Undo/Redo):** Gelişmiş State Stack motoru sayesinde yapılan her işlem geçmişe kaydedilir, hata yapmaktan korkmayın.
* **🖼️ Yerel Base64 Resim Yükleme:** Bilgisayarınızdaki görselleri doğrudan tuvale yükleyin. Sistem resimleri Base64 formatına çevirip projenizin içine kalıcı olarak gömer.
* **💾 JSON Yedekleme (Import/Export):** Projenizi `.json` dosyası olarak bilgisayarınıza indirin ve istediğiniz zaman geri yükleyip tasarıma kaldığınız yerden devam edin.
* **🌐 Canlı HTML Derleyici (Export HTML):** Tasarımınızı bitirdiğinizde **"HTML İndir"** butonuna basın. Sistem size Tailwind, Google Fonts ve özel Responsive motoru içine gömülmüş, yayına hazır temiz bir `.html` dosyası derler!

## ⌨️ Klavye Kısayolları (Pro Kullanım)

Tasarım hızınızı maksimuma çıkarmak için endüstri standartlarındaki kısayollar desteklenmektedir:

| Kısayol | İşlem | Açıklama |
| :--- | :--- | :--- |
| `Ctrl + Z` | Geri Al (Undo) | Son yapılan işlemi geri alır. |
| `Ctrl + Y` (veya `Shift+Z`) | İleri Al (Redo) | Geri alınan işlemi tekrar uygular. |
| `Ctrl + C` | Kopyala | Seçili öğeyi veya içi dolu koca bir bölümü kopyalar. |
| `Ctrl + V` | Yapıştır | Kopyalanan öğeyi iç hiyerarşisiyle tuvale yapıştırır. |
| `Ctrl + D` | Çoğalt (Duplicate) | Seçili öğeyi olduğu yere klonlar (20px kaydırarak). |
| `Delete` / `Backspace` | Sil | Seçili öğeyi veya bölümü anında siler. |

## 🛠️ Kurulum ve Çalıştırma

Proje hiçbir sunucu, veritabanı veya derleyici (build tool) gerektirmez. Doğrudan tarayıcınızda yerel olarak çalışır.

1. Proje dosyalarını bilgisayarınıza indirin.
2. Aşağıdaki dosya yapısına sahip olduğunuzdan emin olun:
   ```text
   📁 portfolio-canvas-pro
   ├── 📄 index.html
   ├── 📄 App.js
   └── 🖼️ arayuz.png
index.html dosyasını Chrome, Safari veya Firefox gibi modern bir tarayıcıda açın.

Sol panelden "Hero" veya "Navbar" gibi bir ana bölümü sürükleyerek tasarıma başlayın!

🏗️ Mimari ve Teknolojiler
Veri Güdümlü Mimari (State Management): DOM manipülasyonu yerine tek bir state objesi baz alınır. Herhangi bir değer değiştiğinde, ekran güncel veriye göre yeniden çizilir (Virtual DOM konsepti).

Recursive Rendering: İç içe geçen (Nested) öğelerin ve katmanlar panelinin (Layers Tree) sorunsuz çizilmesi için kendi kendini çağıran fonksiyonlar (Recursive Functions) kullanılmıştır.

Local Storage: Sayfa yenilense veya kapatılsa bile tasarımlarınız tarayıcınızın önbelleğinde şifrelenmiş JSON metni olarak güvenle saklanır.
