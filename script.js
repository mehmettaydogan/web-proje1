const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = canvas.width;  // 800
const H = canvas.height; // 380

// ---------- Oyun durumu ----------
let gameState = 'menu'; // 'menu' | 'playing' | 'gameover'
let score = 0;
let highScore = 0;
let lives = 3;
let frame = 0;
let speed = 4;
let animId;

// ---------- Ses Dosyaları (HTML5 Audio) ----------
const sesZiplama = new Audio('ziplama.mp3');
const sesToplama = new Audio('disli.mp3');
const sesCarpma = new Audio('carpma.mp3');
const sesBitis = new Audio('oyunbitti.mp3');

function playSound(type) {
  if (type === 'jump') {
    sesZiplama.currentTime = 0; // Hızlı tıklamalarda sesin kesilmemesi için başa sar
    sesZiplama.play();
  } else if (type === 'gear') {
    sesToplama.currentTime = 0;
    sesToplama.play();
  } else if (type === 'hit') {
    sesCarpma.currentTime = 0;
    sesCarpma.play();
  } else if (type === 'gameover') {
    sesBitis.currentTime = 0;
    sesBitis.play();
  }
}



// ---------- Arka Plan Katmanları (paralaks) ----------
const bgLayers = [
  { x: 0, speed: 0.5, color: '#1a0e00' },
  { x: 0, speed: 1.2, color: '#221400' },
  { x: 0, speed: 2.0, color: '#2a1800' },
];

// fabrika dekor nesneleri
const pipes = [];
function spawnPipe() {
  pipes.push({
    x: W + 20,
    y: H - 80 - Math.random() * 120,
    w: 18,
    h: 60 + Math.random() * 80,
    speed: 1.5
  });
}

// ---------- ZEMİN ----------
const GROUND_Y = H - 60;

// ---------- OYUNCU (Robot) ----------
const player = {
  x: 120,
  y: GROUND_Y,
  w: 40,
  h: 52,
  vy: 0,
  jumping: false,
  ducking: false,
  jumpCount: 0,
  invincible: 0,
  legAnim: 0,
};

// ---------- ENGELLERİ ----------
const obstacles = [];
let obstacleTimer = 0;
let obstacleInterval = 90;

function spawnObstacle() {
  const types = ['gear_obstacle', 'spike', 'laser'];
  const t = types[Math.floor(Math.random() * types.length)];
  let h = 40, w = 30;
  let y = GROUND_Y;
  let flying = false;
  if (t === 'laser') {
    h = 12; w = 60;
    y = GROUND_Y - 80 - Math.random() * 60;
    flying = true;
  } else if (t === 'spike') {
    h = 50; w = 28;
    y = GROUND_Y;
  } else {
    h = 38; w = 38;
    y = Math.random() > 0.5 ? GROUND_Y - 25 : GROUND_Y;
  }
  obstacles.push({ type: t, x: W + 10, y, w, h, flying, rot: 0 });
}

// ---------- TOPLANAN DİŞLİLER ----------
const gears = [];
let gearTimer = 0;

function spawnGear() {
  gears.push({
    x: W + 10,
    y: GROUND_Y - 40 - Math.random() * 120,
    r: 14,
    rot: 0,
    speed: speed
  });
}

// ---------- ARKA PLAN DİŞLİLERİ (dekoratif) ----------
const bgGears = [];
for (let i = 0; i < 6; i++) {
  bgGears.push({
    x: Math.random() * W,
    y: 30 + Math.random() * (GROUND_Y - 80),
    r: 20 + Math.random() * 40,
    speed: 0.3 + Math.random() * 0.5,
    rot: Math.random() * Math.PI * 2,
    alpha: 0.05 + Math.random() * 0.08,
    dir: Math.random() > 0.5 ? 1 : -1
  });
}

// ---------- KONTROLLER ----------
const keys = {};
window.addEventListener('keydown', e => {
  if (!keys[e.code]) {
    keys[e.code] = true;
    if (gameState === 'playing') {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && player.jumpCount < 2) {
        player.vy = -14;
        player.jumping = true;
        player.jumpCount++;
        playSound('jump');
      }
    }
    if (e.code === 'Enter') {
      if (gameState === 'menu' || gameState === 'gameover') startGame();
    }
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// Dokunmatik destek (mobil)
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (gameState === 'menu' || gameState === 'gameover') { startGame(); return; }
  if (player.jumpCount < 2) {
    player.vy = -14;
    player.jumping = true;
    player.jumpCount++;
    playSound('jump');
  }
}, { passive: false });

// ---------- OYUNU BAŞLAT ----------
function startGame() {
  gameState = 'playing';
  score = 0;
  lives = 3;
  speed = 5;
  frame = 0;
  obstacles.length = 0;
  gears.length = 0;
  particles.length = 0;
  pipes.length = 0;
  obstacleTimer = 0;
  obstacleInterval = 90;
  gearTimer = 0;
  player.y = GROUND_Y;
  player.vy = 0;
  player.jumping = false;
  player.ducking = false;
  player.jumpCount = 0;
  player.invincible = 0;
  updateHUD();
}

// ---------- HUD GÜNCELLE ----------
function updateHUD() {
  document.getElementById('score-display').textContent = score;
  document.getElementById('high-display').textContent = highScore;
  document.getElementById('life-display').textContent = '♥️'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
}

// ---------- ÇARPIŞMA TESTI ----------
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  const margin = 6;
  return ax + margin < bx + bw - margin &&
         ax + aw - margin > bx + margin &&
         ay + margin < by + bh - margin &&
         ay + ah - margin > by + margin;
}

// ---------- DİŞLİ ÇİZİMİ ----------
 function drawGear(cx, cy, outerR, innerR, teeth, rot, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha || 1;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  
 
  ctx.fillRect(-outerR, -outerR/4, outerR*2, outerR/2); // Yatay dikdörtgen
  ctx.fillRect(-outerR/4, -outerR, outerR/2, outerR*2); // Dikey dikdörtgen
  
  // Ana gövde
  ctx.beginPath();
  ctx.arc(0, 0, outerR * 0.8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#0a0a0f';
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}




// ---------- ROBOT ÇİZİMİ ----------
function drawRobot(x, y, w, h, ducking, legAnim, invincible) {
  if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

  const rh = ducking ? h * 0.55 : h;
  const rx = x;
  const ry = y + (ducking ? h - rh : 0);

  ctx.fillStyle = '#3a3a5a';
  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 2;
  const bodyH = rh * 0.45;
  ctx.beginPath();
  ctx.roundRect(rx + w * 0.1, ry + rh * 0.28, w * 0.8, bodyH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(rx + w * 0.25, ry + rh * 0.36, w * 0.5 * (lives / 3), 6);
  ctx.strokeStyle = '#ff8c0055';
  ctx.strokeRect(rx + w * 0.25, ry + rh * 0.36, w * 0.5, 6);

  if (!ducking) {
    ctx.fillStyle = '#2a2a4a';
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx + w * 0.18, ry, w * 0.64, rh * 0.3, 6);
    ctx.fill();
    ctx.stroke();

    const eyeY = ry + rh * 0.1;
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(rx + w * 0.35, eyeY, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rx + w * 0.65, eyeY, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx + w * 0.5, ry);
    ctx.lineTo(rx + w * 0.5, ry - 10);
    ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(rx + w * 0.5, ry - 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!ducking) {
    const armSwing = (Math.floor(legAnim / 5) % 2 === 0) ? 6 : -6; 
    
    ctx.fillStyle = '#4a4a6a';
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rx - 8, ry + rh * 0.3 + armSwing, 10, 22, 3);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(rx + w - 2, ry + rh * 0.3 - armSwing, 10, 22, 3);
    ctx.fill(); ctx.stroke();
  }
  if (!ducking) {
    const legSwing = (Math.floor(legAnim / 5) % 2 === 0) ? 8 : -8;
    
    ctx.fillStyle = '#4a4a6a';
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rx + w * 0.15, ry + rh * 0.72, 12, 22 + legSwing, 3);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(rx + w * 0.55, ry + rh * 0.72, 12, 22 - legSwing, 3);
    ctx.fill(); ctx.stroke();
    // Ayaklar
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.roundRect(rx + w * 0.1, ry + rh * 0.72 + 22 + legSwing, 18, 8, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(rx + w * 0.5, ry + rh * 0.72 + 22 - legSwing, 18, 8, 3);
    ctx.fill();
  } else {
  }
}
// ---------- ENGELLER ----------
function drawObstacle(ob) {
  ctx.save();
  if (ob.type === 'gear_obstacle') {
    drawGear(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.h / 2, ob.h / 3, 8, ob.rot, '#cc2200', 1);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 9px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText('!', ob.x + ob.w / 2, ob.y + ob.h / 2 + 3);
  } else if (ob.type === 'spike') {
    ctx.fillStyle = '#884400';
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.fillRect(ob.x, ob.y + ob.h - 12, ob.w, 12);
    ctx.strokeRect(ob.x, ob.y + ob.h - 12, ob.w, 12);
    ctx.fillStyle = '#ff6600';
    const spikes = 4;
    const sw = ob.w / spikes;
    for (let i = 0; i < spikes; i++) {
      ctx.beginPath();
      ctx.moveTo(ob.x + i * sw, ob.y + ob.h - 12);
      ctx.lineTo(ob.x + i * sw + sw / 2, ob.y);
      ctx.lineTo(ob.x + (i + 1) * sw, ob.y + ob.h - 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (ob.type === 'laser') {
    const grd = ctx.createLinearGradient(ob.x, 0, ob.x + ob.w, 0);
    grd.addColorStop(0, 'rgba(255,0,80,0)');
    grd.addColorStop(0.2, 'rgba(255,0,80,0.9)');
    grd.addColorStop(0.8, 'rgba(255,0,80,0.9)');
    grd.addColorStop(1, 'rgba(255,0,80,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    ctx.shadowColor = '#ff0050';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255,100,140,0.8)';
    ctx.fillRect(ob.x, ob.y + ob.h * 0.3, ob.w, ob.h * 0.4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff0050';
    ctx.beginPath();
    ctx.arc(ob.x, ob.y + ob.h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- ZEMİN ----------
function drawGround() {
  const grd = ctx.createLinearGradient(0, GROUND_Y + player.h, 0, H);
  grd.addColorStop(0, '#3a1800');
  grd.addColorStop(1, '#1a0a00');
  ctx.fillStyle = grd;
  ctx.fillRect(0, GROUND_Y + player.h, W, H - GROUND_Y - player.h);

  ctx.strokeStyle = '#ff8c0033';
  ctx.lineWidth = 2;
  const beltOffset = (frame * speed) % 40;
  for (let x = -40 + beltOffset; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + player.h);
    ctx.lineTo(x + 20, GROUND_Y + player.h);
    ctx.stroke();
  }

  ctx.strokeStyle = '#ff8c00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y + player.h);
  ctx.lineTo(W, GROUND_Y + player.h);
  ctx.stroke();

  drawGear(20, GROUND_Y + player.h + 18, 18, 11, 7, frame * 0.04, '#552200', 1);
  drawGear(W - 20, GROUND_Y + player.h + 18, 18, 11, 7, -frame * 0.04, '#552200', 1);
}

// ---------- ANA GÜNCELLEME ----------
function update() {
  frame++;

  speed = 7 + Math.floor(score / 200) * 1.2;
  obstacleInterval = Math.max(40, 90 - Math.floor(score / 300) * 5);

  if (frame % 120 === 0) spawnPipe();
  pipes.forEach(p => { p.x -= p.speed; });
  pipes.splice(0, pipes.findIndex(p => p.x > -50));

  player.ducking = !!(keys['ArrowDown'] || keys['KeyS']);
  const effectiveH = player.ducking ? player.h * 0.55 : player.h;

  player.vy += 0.7;
  player.y += player.vy;

  const groundLevel = GROUND_Y;
  if (player.y >= groundLevel) {
    player.y = groundLevel;
    player.vy = 0;
    player.jumping = false;
    player.jumpCount = 0;
  }

  if (!player.jumping) player.legAnim++;

  obstacleTimer++;
  if (obstacleTimer >= obstacleInterval) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  gearTimer++;
  if (gearTimer >= 60) {
    spawnGear();
    gearTimer = 0;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= speed;
    ob.rot += 0.05;

    if (player.invincible <= 0) {
      const px = player.x;
      const py = player.y + (player.ducking ? player.h - effectiveH : 0);
      if (rectsOverlap(px, py, player.w, effectiveH, ob.x, ob.y, ob.w, ob.h)) {
        lives--;
        player.invincible = 90;
        playSound('hit');
        updateHUD();
        if (lives <= 0) {
          gameState = 'gameover';
          if (score > highScore) highScore = score;
          playSound('gameover');
          updateHUD();
        }
      }
    }

    if (ob.x + ob.w < -10) obstacles.splice(i, 1);
  }

  for (let i = gears.length - 1; i >= 0; i--) {
    const g = gears[i];
    g.x -= speed;
    g.rot += 0.05;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dist = Math.hypot(px - g.x, py - g.y);
    if (dist < g.r + 15) {
      score += 100;
      playSound('gear');
      gears.splice(i, 1);
      updateHUD();
      continue;
    }

    if (g.x < -20) gears.splice(i, 1);
  }

  if (player.invincible > 0) player.invincible--;

  if (frame % 6 === 0) {
    score++;
    updateHUD();
  }

}

// ---------- ANA ÇİZİM ----------
function draw() {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  bgGears.forEach(g => {
    g.rot += 0.005 * g.dir;
    drawGear(g.x, g.y, g.r, g.r * 0.6, 8, g.rot, '#ff8c00', g.alpha);
  });

  pipes.forEach(p => {
    ctx.fillStyle = '#221800';
    ctx.strokeStyle = '#443300';
    ctx.lineWidth = 1;
    ctx.fillRect(p.x - p.w / 2, p.y, p.w, p.h);
    ctx.strokeRect(p.x - p.w / 2, p.y, p.w, p.h);
    ctx.fillStyle = '#332200';
    ctx.fillRect(p.x - p.w / 2 - 4, p.y + 10, p.w + 8, 8);
    ctx.strokeRect(p.x - p.w / 2 - 4, p.y + 10, p.w + 8, 8);
  });

  drawGround();

  gears.forEach(g => {
    ctx.save();
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 12;
    drawGear(g.x, g.y, g.r, g.r * 0.6, 6, g.rot, '#ff8c00', 1);
    ctx.restore();
  });

  obstacles.forEach(ob => drawObstacle(ob));

  drawRobot(
    player.x,
    player.y,
    player.w,
    player.h,
    player.ducking,
    player.legAnim,
    player.invincible
  );

  // ---------- MENÜ EKRANI ----------
  if (gameState === 'menu') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    drawGear(W / 2, H / 2 - 50, 55, 35, 12, frame * 0.02, '#ff8c00', 0.9);
    drawGear(W / 2 - 70, H / 2 - 35, 30, 18, 8, -frame * 0.03, '#cc6600', 0.7);
    drawGear(W / 2 + 70, H / 2 - 35, 30, 18, 8, frame * 0.03, '#cc6600', 0.7);

    ctx.textAlign = 'center';
    ctx.font = '900 42px Orbitron';
    ctx.fillStyle = '#ff8c00';
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur = 20;
    ctx.fillText('⚙️ GEAR RUNNER', W / 2, H / 2 + 30);
    ctx.shadowBlur = 0;

    ctx.font = '14px Share Tech Mono';
    ctx.fillStyle = '#ffcc66';
    ctx.fillText('Dişlileri topla • Engellerden kaç • Hayatta kal!', W / 2, H / 2 + 58);

    ctx.font = '13px Share Tech Mono';
    ctx.fillStyle = Math.sin(frame * 0.1) > 0 ? '#ff8c00' : '#ffcc66';
    ctx.fillText('[ ENTER ] tuşuna bas', W / 2, H / 2 + 90);
  }

  // ---------- OYUN BİTTİ EKRANI ----------
  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = '900 38px Orbitron';
    ctx.fillStyle = '#ff2244';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 20;
    ctx.fillText('SİSTEM ÇÖKTÜ', W / 2, H / 2 - 50);
    ctx.shadowBlur = 0;

    ctx.font = '16px Share Tech Mono';
    ctx.fillStyle = '#ffcc66';
    ctx.fillText('SKOR: ' + score, W / 2, H / 2);
    ctx.fillText('EN YÜKSEK: ' + highScore, W / 2, H / 2 + 28);

    ctx.font = '13px Share Tech Mono';
    ctx.fillStyle = Math.sin(frame * 0.1) > 0 ? '#ff8c00' : '#ffcc66';
    ctx.fillText('Tekrar oynamak için [ ENTER ] tuşuna bas', W / 2, H / 2 + 70)
  }
}

// ---------- OYUN DÖNGÜSÜ ----------
function loop() {
  if (gameState === 'playing') update();
  else if (gameState === 'menu' || gameState === 'gameover') {
    frame++;
    bgGears.forEach(g => { g.rot += 0.005 * g.dir; });
  }
  draw();
  animId = requestAnimationFrame(loop);
}

// İlk başlatma
updateHUD();
loop();
