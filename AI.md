Bu rapor, "Gear Runner" projesinin geliştirilme sürecinde Yapay Zeka (AI) araçlarının nasıl ve hangi kapsamdakullanıldığını şeffaf bir şekilde belgelendirmek amacıyla hazırlanmıştır.

Projenin temel mimarisini, oyun motorunun iskeletini ve ana mekaniklerini (zıplama, puanlama, çarpışma testleri) doğrudan yapay zekaya yazdırmak yerine; AI araçları süreç boyunca bir "Sözdizimi (Syntax) Asistanı", "Algoritma Mentoru" ve "Hata Ayıklayıcı (Debugger)" olarak konumlandırılmıştır.




prompt 1 : HTML5 Canvas kullanarak JavaScript ile basit bir sonsuz koşu oyunu yapıyorum. Oyunun takılmadan akıcı çalışması için setInterval yerine ne kullanmalıyım? Bana sadece temel oyun döngüsü mantığını gösterir misin?

cevap 1: Oyunun takılmadan, akıcı bir şekilde (genellikle 60 FPS) çalışması için setInterval yerine kesinlikle requestAnimationFrame kullanmalısın.

requestAnimationFrame, tarayıcının ekran yenileme hızına senkronize çalışır ve kullanıcı farklı bir sekmeye geçtiğinde döngüyü durdurarak gereksiz işlemci ve pil tüketimini önler.

İşte istediğin temel oyun döngüsü mantığı:

JavaScript
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 1. Oyun verilerini ve fiziğini güncelle (pozisyonlar, çarpışmalar vb.)
function update() {
    // Örnek: Karakteri düşür (yerçekimi), engelleri sola kaydır
}

// 2. Her karede ekrana çizim yap
function draw() {
    // Yeni çizimden önce eski kareyi tamamen temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Karakteri, engelleri ve arka planı çiz
}

// 3. Ana Oyun Döngüsü
function gameLoop() {
    update(); // Önce mantığı işlet
    draw();   // Sonra ekrana yansıt
    
    // Tarayıcı bir sonraki kareyi çizmeye hazır olduğunda döngüyü tekrar çağır
    requestAnimationFrame(gameLoop);
}

// Oyunu başlatmak için döngüyü ilk kez çağır
requestAnimationFrame(gameLoop);



prompt 2 :Karakterime yerçekimi eklemek istiyorum Boşluk tuşuna basınca zıplaması sonra yavaşça yere düşmesi lazım. Karakter objem  de şu şekilde: {y: 300, vy: 0}.
nasıl bi matematiksel mantık kurmalıyım?


cevap 2: Canvas'ta matematiksel mantığı kurarken unutulmaması gereken en önemli kural şudur: Y ekseni (0 noktası) ekranın en üstündedir ve aşağıya doğru artar. Yani karakteri yukarı zıplatmak için hızını (vy) eksi (-) yönde ayarlamalısın, yerçekimi ise onu tekrar artı (+) yönde aşağı çekecektir.

Bunun için üç temel kavrama ihtiyacın var:

Yerçekimi (Gravity): Her karede (frame) karaktere etki eden, sürekli aşağı yönlü kuvvet.

Zıplama Gücü (Jump Force): Boşluğa bastığında karaktere verilecek anlık yukarı yönlü (negatif) hız.

Zemin Seviyesi (Ground Level): Karakterin ekranın dışına (sonsuza) düşmemesi için duracağı alt sınır.

Fizik Döngüsü
Her requestAnimationFrame tetiklendiğinde update fonksiyonun içinde sırasıyla şu matematik işlemelidir:

İvmeyi (yerçekimi) hıza ekle: vy += gravity

Hızı konuma ekle: y += vy

Zemin (çarpışma) kontrolü yap.

Bu mantığın kod hali şu şekildedir:

JavaScript
const character = { y: 300, vy: 0 };
const GRAVITY = 0.6;       // Yerçekimi kuvveti (hızı her karede bu kadar artırır)
const JUMP_FORCE = -12;    // Zıplama anındaki hız (yukarı gitmesi için negatif!)
const GROUND_Y = 300;      // Zeminin başlangıç y ekseni

// Tuş dinleyicisi
window.addEventListener("keydown", (e) => {
    // Sadece karakter yerdeyken zıplamasına izin ver (havada sınırsız zıplamayı önler)
    if (e.code === "Space" && character.y >= GROUND_Y) {
        character.vy = JUMP_FORCE;
    }
});

function update() {
    // 1. Yerçekimini mevcut dikey hıza ekle
    character.vy += GRAVITY;
    
    // 2. Güncel hızı karakterin dikey pozisyonuna uygula
    character.y += character.vy;
    
    // 3. Karakter zeminin altına düştüyse onu zeminde sabitle
    if (character.y >= GROUND_Y) {
        character.y = GROUND_Y; // Karakteri tam zemine oturt
        character.vy = 0;       // Yere çarptığı için düşüş hızını sıfırla
    }
}
Bu formülle boşluğa bastığında vy anında -12 olur ve karakter yukarı fırlar. Döngüdeki her karede yerçekimi (0.6) hıza eklenerek hızı önce -12'den sıfıra doğru düşürür (karakterin havada asılı kaldığı en tepe noktası), ardından pozitife çevirerek karakterin hızlanarak tekrar yere düşmesini sağlar.



prompt 3: HTML5 new Audio('ses.mp3') kullanıyorum ama karakter art arda hızlıca zıpladığında ya da iki dişliyi aynı anda topladığında ses kesiliyor sebebi nedir

cevap 3: Bunun sebebi, oluşturduğun Audio objesinin tek bir çalma kafasına (playhead) sahip olmasıdır.

Bir ses dosyası çalarken aynı objeye tekrar play() komutu gönderdiğinde, tarayıcı sesin bitmesini bekler ya da mevcut çalma işlemini kesintiye uğratır. Tek bir kaset çaların aynı anda kasetin iki farklı yerini çalamaması gibi düşünebilirsin.

Bu sorunu çözmek için oyunun ihtiyacına göre iki farklı yöntemden birini kullanmalısın:

Çözüm 1: Sesi Klonlayarak Çalma (Üst Üste Binen Sesler İçin)
Aynı anda iki altın topladığında her ikisinin sesinin de yankılanarak (üst üste) çalmasını istiyorsan en iyi yöntem cloneNode() kullanmaktır. Bu, orijinal ses dosyasının hafif bir kopyasını oluşturup onu çalar.

JavaScript
const altinSesi = new Audio('ses.mp3');

function altinToplandi() {
    // Sesin bir kopyasını oluştur ve anında çal
    altinSesi.cloneNode().play();
}
Çözüm 2: Başa Sararak Çalma (Hızlı Tekrarlar İçin)
Zıplama gibi seslerde sesin üst üste binip gürültü yapması yerine, önceki sesin anında kesilip baştan başlamasını isteyebilirsin. Bunun için sesi çalmadan hemen önce süresini (currentTime) sıfıra eşitlemen yeterlidir.

JavaScript
const ziplamaSesi = new Audio('ziplama.mp3');

function zipla() {
    // Varsa çalan sesi anında başa sar
    ziplamaSesi.currentTime = 0; 
    ziplamaSesi.play();
    
    // Zıplama fizik kodların...
}


Prompt 4

Kullanıcı: "Uçan lazerleri değiştirmek istiyorum, yerdeki can götüren dişlilerin bazılarının biraz daha yüksekte olmasını istiyorum böylece eğilme mekaniği işe yarar"
Claude'un Cevabı:
spawnObstacle() fonksiyonundaki else bloğu düzenlendi:


Prompt 5 : Sonsuz koşu oyunumda karakterin hızı hep sabit. Oyunun ilerledikçe, skor arttıkça yavaş yavaş hızlanmasını ve zorlaşmasını istiyorum. if-else bloklarıyla tek tek skor kontrolü yapmak yerine bunu başka bi yöntemle çözme yolu var mı?

cevap 5 : Kesinlikle var ve profesyonel oyunlarda if-else (örneğin; skor 100'ü geçerse hızı 5 yap, 200'ü geçerse 6 yap) neredeyse hiç kullanılmaz. Çünkü bu yöntem hızın aniden "zıplamasına" neden olur ve oyuncunun ritmini bozar.

Oyunun zorluğunu artırmak, aslında antrenmanlarda uygulanan progressive overload (kademeli yüklenme) mantığına çok benzer. Ağırlığı aniden barın üzerine eklemek yerine, kası yavaş yavaş yeni zorluğa adapte etmek gibi, oyunda da hızı her karede milim milim artıran sürekli bir matematiksel fonksiyon kullanmalısın.

Bunun için en yaygın ve en temiz yöntem Doğrusal Ölçeklendirme (Linear Scaling) yöntemidir ve sadece tek satır matematik gerektirir.

Formül Mantığı
Hızı hesaplarken skoru çok küçük bir çarpanla çarpıp temel hıza eklersin. Ancak oyunun bir noktada oynanamaz hale (ışık hızına) gelmemesi için Math.min() kullanarak bir "tavan hız" (maksimum limit) belirlersin.

İşte oyun döngüne (update fonksiyonuna) eklemen gereken mantık:

JavaScript
let score = 0;
const BASE_SPEED = 5;          // Oyunun en başındaki rahat hız
const MAX_SPEED = 16;          // Oyunun çıkabileceği en zorlu, tepe hız
const SPEED_MULTIPLIER = 0.02; // Skor başına hızın ne kadar artacağı (hassas ayar)

function update() {
    // 1. Skoru artır (mesafeye veya geçen süreye göre)
    score += 1; // (veya requestAnimationFrame'e göre küsuratlı artabilir)
    
    // 2. Dinamik Hız Hesaplama
    // Skor arttıkça (score * SPEED_MULTIPLIER) büyüyecek ve BASE_SPEED'e eklenecek.
    // Ancak bu toplam MAX_SPEED'i geçtiği an, Math.min her zaman MAX_SPEED'i seçecek.
    let gameSpeed = Math.min(MAX_SPEED, BASE_SPEED + (score * SPEED_MULTIPLIER));
    
    // 3. Elde edilen gameSpeed'i engelleri ve arkaplanı kaydırmak için kullan
    // engel.x -= gameSpeed;
    // arkaplan.x -= gameSpeed;
}
