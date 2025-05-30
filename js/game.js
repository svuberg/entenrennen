const PIXELS_PER_METER = 100; // 100 Pixel = 1 Meter

// --- Spielzustand Variablen (GANZ NACH OBEN VERSCHOBEN) ---
let gameRunning = false;
let gameState = 'loading'; // Zustände: 'loading', 'start', 'playing', 'gameOver'

// Bewegungs- und Physikvariablen
let velocityY = 0;
// Werte werden in adjustGameConstants() dynamisch gesetzt
let gravity = 0.2; // Proportionaler Wert, wird mit deltaTime multipliziert
let jumpStrength = -8; // Proportionaler Wert, wird mit deltaTime multipliziert

// --- Globale Variablen für Button-Farben ---
let currentStartButtonColor = "#B22222"; // Rot (Feuerrot)
let currentGameOverButtonColor = "#228B22"; // Grün

function startGame() {
  removeBugReportButton();
  gameRunning = true;
  gameState = 'playing';
  meters = 0;
  speed = INITIAL_SPEED;
  velocityY = 0;
  obstacles = [];
  enemies = [];
  timeSinceLastObstacle = 0;
  timeSinceLastSpeedIncrease = 0;
  player.y = currentLandHeight + (canvas.height - 2 * currentLandHeight) / 2 - player.height / 2;
  bgMusic.currentTime = 0;
  bgMusic.play();
  runSaved = false; // <--- Flag zurücksetzen beim Neustart!
  requestAnimationFrame(gameLoop);
}

// NEU: Zeitmessung für Delta Time
let lastFrameTime = 0; // Speichert den Zeitpunkt des letzten Frames

// NEU: Zeitmessung für Hindernis-Spawn
let timeSinceLastObstacle = 0;
const INITIAL_OBSTACLE_DELAY = 1.5; // Initial: alle 1.5 Sekunden ein Hindernis
let currentObstacleDelay = INITIAL_OBSTACLE_DELAY;

// NEU: Zeitmessung für Geschwindigkeitserhöhung
let timeSinceLastSpeedIncrease = 0;
const SPEED_INCREASE_DELAY_SECONDS = 3; // Erhöhe die Geschwindigkeit alle 3 Sekunden

// --- Kollision Animation Variablen ---
let collisionAnimActive = false;
let collisionAnimTime = 0;
const COLLISION_ANIM_DURATION = 0.9; // Sekunden
let collisionAnimY = 0;
let collisionAnimVY = 0;
let collisionAnimAngle = 0;
let collisionAnimStartX = 0;
let collisionAnimStartY = 0;

// --- Spieler Objekt (MUSS VOR adjustCanvasSize() DEKLARIERT WERDEN) ---
const player = {
  // x, y, width, height werden in startGame() und adjustCanvasSize() dynamisch gesetzt
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  frameIndex: 0,
  frameTick: 0,
  draw() {
    ctx.drawImage(duckFrames[this.frameIndex], this.x, this.y, this.width, this.height);
    // Animation tickt immer noch frame-basiert, das ist okay
    this.frameTick++;
    if (this.frameTick > DUCK_ANIMATION_SPEED) {
      this.frameIndex = (this.frameIndex + 1) % duckFrames.length;
      this.frameTick = 0;
    }
  },
  update(deltaTime) { // update-Funktion nimmt jetzt deltaTime entgegen
    this.y += velocityY * deltaTime; // Bewegung jetzt basierend auf Zeit
    velocityY += gravity * deltaTime; // Gravitation jetzt basierend auf Zeit
  }
};


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const landHeightPercentage = 0.1; // Höhe des Landstreifens als Prozentsatz der Canvas-Höhe

// Anpassbare Spielkonstanten (jetzt mit dynamischen Werten)
const DUCK_ANIMATION_SPEED = 10;
// OBSTACLE_SPAWN_RATE und SPEED_INCREASE_INTERVAL werden jetzt durch Zeit-basierte Werte ersetzt
// const OBSTACLE_SPAWN_RATE = 100;
// const SPEED_INCREASE_INTERVAL = 300;

// INITIAL_SPEED und SPEED_INCREASE_AMOUNT werden in adjustGameConstants() gesetzt
let INITIAL_SPEED = 200; // Angepasst für deltaTime (Pixel pro Sekunde)
let SPEED_INCREASE_AMOUNT = 20; // Angepasst für deltaTime (Pixel pro Sekunde)
const WATER_SCROLL_FACTOR_LOW = 0.5;
const WATER_SCROLL_FACTOR_TOP = 1.0;

// Dynamische Landhöhe berechnen (wird bei adjustCanvasSize aktualisiert)
let currentLandHeight = canvas.height * landHeightPercentage;

// Funktion: Spielkonstanten basierend auf Bildschirmgröße anpassen
function adjustGameConstants() {
  const baseWidth = 800;
  const speedScale = Math.min(1.0, canvas.width / baseWidth);

  // Werte sind jetzt "pro Sekunde"
  INITIAL_SPEED = 200 * speedScale; // z.B. 200 Pixel/Sekunde auf einer 800px breiten Canvas
  SPEED_INCREASE_AMOUNT = 20 * speedScale; // z.B. 20 Pixel/Sekunde Zunahme
  // Die Schwerkraft und Sprungstärke sind ebenfalls "pro Sekunde" und leicht verstärkt
  gravity = 800 * speedScale; // Angepasst für besseres Spielgefühl
  jumpStrength = -400 * speedScale; // Angepasst für besseres Spielgefühl

  // Sicherstellen, dass die Minimalwerte nicht zu niedrig sind
  if (INITIAL_SPEED < 50) INITIAL_SPEED = 50;
  if (SPEED_INCREASE_AMOUNT < 5) SPEED_INCREASE_AMOUNT = 5;
  if (gravity < 100) gravity = 100;
  if (jumpStrength > -100) jumpStrength = -100; // jumpStrength ist negativ
}


// Funktion zum Anpassen der Canvas-Größe und Neuberechnung der Elemente
function adjustCanvasSize() {
  // Maximalwerte für "Handy-Feeling"
  const MAX_WIDTH = 480;
  const MAX_HEIGHT = 900;

  // Berechne gewünschte Größe (orientiert an Fenster, aber nie größer als MAX)
  let targetWidth = Math.min(window.innerWidth, MAX_WIDTH);
  let targetHeight = Math.min(window.innerHeight, MAX_HEIGHT);

  // Optional: Hochformat erzwingen
  if (targetWidth / targetHeight > 0.7) {
    targetWidth = Math.floor(targetHeight * 0.54); // ca. 9:16
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Canvas mittig im Fenster platzieren (optional, für Desktop)
  canvas.style.position = "absolute";
  canvas.style.left = `calc(50% - ${canvas.width / 2}px)`;
  canvas.style.top = `calc(50% - ${canvas.height / 2}px)`;

  currentLandHeight = canvas.height * landHeightPercentage;

  player.width = canvas.width * 0.10;
  player.height = canvas.width * 0.10;

  if (player.x === 0) {
    player.x = canvas.width * 0.08;
  }
  if (!gameRunning) {
    player.y = currentLandHeight + (canvas.height - 2 * currentLandHeight) / 2 - player.height / 2;
  } else {
    const waterMinY = currentLandHeight;
    const waterMaxY = canvas.height - currentLandHeight - player.height;
    player.y = Math.max(waterMinY, Math.min(player.y, waterMaxY));
  }

  adjustGameConstants();

  if (!gameRunning) {
    if (gameState === 'start') {
      drawStartScreen();
    } else if (gameState === 'gameOver') {
      drawGameOverScreen();
    }
  }
}

// Initialer Aufruf beim Laden und Event-Listener für Größenänderungen
adjustCanvasSize();
window.addEventListener('resize', adjustCanvasSize);


// --- Assets laden ---
const assetsToLoad = [];

const grassImg = new Image();
grassImg.src = 'assets/kenney/terrain_grass_block.png';
assetsToLoad.push(grassImg);

const waterTopImg = new Image();
waterTopImg.src = 'assets/kenney/water_top.png';
assetsToLoad.push(waterTopImg);

const waterTopLowImg = new Image();
waterTopLowImg.src = 'assets/kenney/water_top_low.png';
assetsToLoad.push(waterTopLowImg);

const duckFrames = [
  new Image(), new Image(), new Image()
];
duckFrames[0].src = 'assets/duck/frame1.png';
duckFrames[1].src = 'assets/duck/frame2.png';
duckFrames[2].src = 'assets/duck/frame3.png';
duckFrames.forEach(img => assetsToLoad.push(img));

// NEU: Kollisions-Frames
const duckHitFrames = [
  new Image(),
  new Image()
];
duckHitFrames[0].src = 'assets/duck/hitframe-1.png';
duckHitFrames[1].src = 'assets/duck/hitframe-2.png';
duckHitFrames.forEach(img => assetsToLoad.push(img));

const logoImg = new Image();
logoImg.src = 'assets/SVU_transparent.png';
assetsToLoad.push(logoImg);

const schriftzugImg = new Image();
schriftzugImg.src = 'assets/Schriftzug.png';
assetsToLoad.push(schriftzugImg);

const startGameOverBackgroundImg = new Image();
startGameOverBackgroundImg.src = 'assets/Hintergrund.jpg';
assetsToLoad.push(startGameOverBackgroundImg);

// HIER: Hindernisbilder erzeugen und ins assetsToLoad-Array pushen!
const obstacleImages = [
  new Image(), // großer Felsen
  new Image(), // kleiner Felsen
  new Image(), // Ast
  new Image()  // Baumstamm
];
obstacleImages[0].src = 'assets/kenney/rock_big.png';
obstacleImages[1].src = 'assets/kenney/rock_small.png';
obstacleImages[2].src = 'assets/kenney/branch.png';
obstacleImages[3].src = 'assets/kenney/log.png';
obstacleImages.forEach(img => assetsToLoad.push(img)); // <-- DAS HAT GEFELHT!

const waterAnimImg = new Image();
waterAnimImg.src = 'assets/kenney/water.png';
assetsToLoad.push(waterAnimImg);

let assetsLoadedCount = 0;

function assetLoaded() {
  assetsLoadedCount++;
  console.log(`Asset geladen: ${assetsLoadedCount}/${assetsToLoad.length}`);
  if (assetsLoadedCount === assetsToLoad.length) {
    console.log("Alle Assets geladen, zeige Startbildschirm.");
    gameState = 'start';
    drawStartScreen();
  }
}

// Frosch-Sprites laden (VOR dem Asset-Ladevorgang!)
const frogFrames = [
  new Image(), // idle
  new Image(), // jump
  new Image()  // rest
];
frogFrames[0].src = 'assets/enemy/frog_idle.png';
frogFrames[1].src = 'assets/enemy/frog_jump.png';
frogFrames[2].src = 'assets/enemy/frog_rest.png';
frogFrames.forEach(img => assetsToLoad.push(img));

assetsToLoad.forEach(img => {
  img.onload = assetLoaded;
  img.onerror = () => {
    console.error(`Fehler beim Laden von: ${img.src}`);
    assetLoaded();
  };
});

console.log("Assets to load:", assetsToLoad.length, assetsToLoad.map(img => img.src));

// Highscore Variable
let highScore = 0;
const HIGHSCORE_KEY = 'entenrennen_highscore'; // Key für localStorage

function loadHighScore() {
  const storedHighScore = localStorage.getItem(HIGHSCORE_KEY);
  if (storedHighScore) {
    highScore = parseInt(storedHighScore, 10);
  }
}
loadHighScore(); // Lade den Highscore direkt beim Laden des Skripts


// --- Google Apps Script URL als Variable ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzwX735C-bcWYWLBY2KjYgji9SoYUQ3CTB3YHCVXBzMSAvgrEY4urFdG2iI3kjGERB9CA/exec";

function saveHighScore() {
  if (meters > highScore) {
    highScore = Math.floor(meters);
    localStorage.setItem(HIGHSCORE_KEY, highScore);

    const formData = new FormData();
    formData.append('score', highScore);
    formData.append('device', deviceId);

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: formData
    }).then(() => {
      console.log("Highscore an Google Sheet gesendet!");
    }).catch((err) => {
      console.error("Fehler beim Senden an Google Sheet:", err);
    });

    console.log("Neuer Highscore gespeichert: " + highScore);
  }
}

let waterScrollX1 = 0;
let waterScrollX2 = 0;
let obstacles = [];
let enemies = [];
let speed = INITIAL_SPEED; // Initialwert wird in startGame gesetzt
let meters = 0;

// NEU: Wasser-Animation Variablen
let waterAnimFrame = 0;
let waterAnimTimer = 0;
const WATER_ANIM_INTERVAL = 3.5; // Sekunden pro Frame

// NEU: Event-Hinweis Variablen
let showEventHint = false;
let eventHintTimeout = null;

// --- Zeichnungsfunktionen ---
// KORRIGIERT: drawBackground nimmt jetzt deltaTime entgegen
function drawBackground(deltaTime) {
  // --- 1. Wasser zuerst zeichnen ---
  const waterAreaHeight = canvas.height - (currentLandHeight * 2);
  const waterTileBaseWidth = waterTopImg.naturalWidth;
  const waterTileBaseHeight = waterTopImg.naturalHeight;
  const targetTileWidth = canvas.width * 0.15;
  let scaledWaterTileWidth = waterTileBaseWidth * (targetTileWidth / waterTileBaseWidth);
  let scaledWaterTileHeight = waterTileBaseHeight * (targetTileWidth / waterTileBaseWidth);

  if (!waterTopImg.complete || waterTopImg.naturalWidth === 0 || waterTopImg.naturalHeight === 0) {
      scaledWaterTileWidth = canvas.width / 5;
      scaledWaterTileHeight = waterAreaHeight / 2;
  }
  if (scaledWaterTileWidth === 0) scaledWaterTileWidth = 1;

  // Animation-Timer erhöhen (für sanfte Bewegung)
  waterAnimTimer += deltaTime;
  if (waterAnimTimer >= WATER_ANIM_INTERVAL) {
    waterAnimTimer = 0;
  }
  const waveOffset = Math.sin((waterAnimTimer / WATER_ANIM_INTERVAL) * Math.PI * 2) * (scaledWaterTileHeight * 0.08);

  // Wasser-Animation
  if (waterTopImg.complete && waterTopImg.naturalWidth !== 0) {
    const startY = currentLandHeight;
    const endY = canvas.height - currentLandHeight;
    for (let y = startY; y < endY; y += scaledWaterTileHeight) {
      for (let x = waterScrollX2; x < canvas.width + scaledWaterTileWidth; x += scaledWaterTileWidth) {
        // Hauptwelle
        ctx.globalAlpha = 0.85;
        ctx.drawImage(waterAnimImg, x, y + waveOffset, scaledWaterTileWidth, scaledWaterTileHeight);
        // Nebenwelle
        ctx.globalAlpha = 0.35;
        ctx.drawImage(waterAnimImg, x, y - waveOffset, scaledWaterTileWidth, scaledWaterTileHeight);
        ctx.globalAlpha = 1;
      }
    }
  }

  // --- 2. Ufer/Wiese oben und unten zuletzt zeichnen ---
  if (grassImg.complete && grassImg.naturalWidth !== 0) {
    // Nur den mittleren Bereich des Bildes verwenden (z.B. 60% in der Mitte)
    const midStart = Math.floor(grassImg.naturalWidth * 0.20);
    const midWidth = Math.floor(grassImg.naturalWidth * 0.60);
    const targetHeight = currentLandHeight;
    const scaleY = targetHeight / grassImg.naturalHeight;

    // OBERER RAND (um 180° gedreht, ganz oben)
    ctx.save();
    ctx.translate(0, targetHeight);
    ctx.scale(1, -1);
    let x = 0;
    while (x < canvas.width) {
      // +1 Pixel Überlappung gegen Spalten
      let w = Math.min((midWidth * scaleY) + 1, canvas.width - x);
      ctx.drawImage(
        grassImg,
        midStart, 0, midWidth, grassImg.naturalHeight,
        x, 0,
        w, targetHeight
      );
      x += (midWidth * scaleY);
    }
    ctx.restore();

    // UNTERER RAND (ganz unten)
    x = 0;
    while (x < canvas.width) {
      // +1 Pixel Überlappung gegen Spalten
      let w = Math.min((midWidth * scaleY) + 1, canvas.width - x);
      ctx.drawImage(
        grassImg,
        midStart, 0, midWidth, grassImg.naturalHeight,
        x, canvas.height - targetHeight,
        w, targetHeight
      );
      x += (midWidth * scaleY);
    }
  }
}

function spawnObstacle() {
  // Zufällig eines der vier Hindernisse wählen
  const idx = Math.floor(Math.random() * obstacleImages.length);
  const img = obstacleImages[idx];

  // Größe je nach Hindernis anpassen
  let obstacleSize;
  switch (idx) {
    case 0: // großer Felsen
      obstacleSize = Math.max(canvas.width * 0.12, 60);
      break;
    case 1: // kleiner Felsen
      obstacleSize = Math.max(canvas.width * 0.08, 40);
      break;
    case 2: // Ast
      obstacleSize = Math.max(canvas.width * 0.13, 50);
      break;
    case 3: // Baumstamm
      obstacleSize = Math.max(canvas.width * 0.16, 80);
      break;
    default:
      obstacleSize = Math.max(canvas.width * 0.10, 50);
  }

  // Ast ist flach, Baumstamm jetzt höher!
  let obsHeight = obstacleSize;
  if (idx === 2) {
    obsHeight = obstacleSize * 0.5;
  } else if (idx === 3) {
    obsHeight = obstacleSize * 1.0; // <-- Baumstamm jetzt volle Höhe!
  }

  const obsY = currentLandHeight + Math.random() * (canvas.height - currentLandHeight * 2 - obsHeight);

  obstacles.push({
    x: canvas.width,
    y: obsY,
    width: obstacleSize,
    height: obsHeight,
    img: img,
    // Nur branches (idx === 2) rotieren und wippen, logs (idx === 3) nur wippen
    rotation: (idx === 2) ? (Math.random() * Math.PI * 2) : 0,
    rotationSpeed: (idx === 2) ? ((Math.random() - 0.5) * 0.3) : 0,
    wavePhase: (idx === 2 || idx === 3) ? (Math.random() * Math.PI * 2) : 0
  });

  if (idx === 0 && Math.random() < 0.5) { // 50% Chance für Frosch auf big_rock
    enemies.push({
      x: canvas.width + obstacleSize * 0.2,
      y: obsY - obstacleSize * 0.4,
      width: obstacleSize * 0.6,
      height: obstacleSize * 0.6,
      state: 'idle', // idle, jump, rest
      frame: 0,
      jumpTimer: 0,
      attachedObstacle: obstacles[obstacles.length], // Referenz auf den Felsen
      hasJumped: false
    });
  }
}

// KORRIGIERT: drawObstacles nimmt jetzt deltaTime entgegen
function drawObstacles(deltaTime) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= speed * deltaTime;

    // Wippen/Rotation vorbereiten
    let yOffset = 0;
    if (obs.img === obstacleImages[2]) { // branch: wippen & rotieren
      obs.rotation += obs.rotationSpeed * deltaTime;
      obs.wavePhase += deltaTime * 1.2;
      yOffset = Math.sin(obs.wavePhase) * obs.height * 0.08;
    } else if (obs.img === obstacleImages[3]) { // log: nur wippen, stärker
      obs.wavePhase += deltaTime * 1.2;
      yOffset = Math.sin(obs.wavePhase) * obs.height * 0.18;
    }

    // --- Wasserreflexion ---
    ctx.save();
    ctx.globalAlpha = 0.22; // Etwas sichtbarer
    if (
      obs.img === obstacleImages[0] || // rock_big
      obs.img === obstacleImages[1] || // rock_small
      obs.img === obstacleImages[3]    // log
    ) {
      // Spiegelung weiter nach unten und größer
      const reflectionHeight = obs.height * 0.9; // statt 0.7
      const reflectionYOffset = obs.height * 0.18; // weiter nach unten
      ctx.translate(obs.x + obs.width / 2, obs.y + yOffset + obs.height + reflectionYOffset);
      ctx.scale(1, -1);
      ctx.drawImage(
        obs.img,
        -obs.width / 2,
        0,
        obs.width,
        reflectionHeight
      );
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Hindernis selbst zeichnen
    if (obs.img.complete && obs.img.naturalWidth !== 0) {
      if (obs.img === obstacleImages[2]) { // branch: wippen & rotieren
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + yOffset + obs.height / 2);
        ctx.rotate(obs.rotation);
        ctx.drawImage(
          obs.img,
          -obs.width / 2,
          -obs.height / 2,
          obs.width,
          obs.height
        );
        ctx.restore();
      } else if (obs.img === obstacleImages[3]) { // log: nur wippen
        ctx.drawImage(obs.img, obs.x, obs.y + yOffset, obs.width, obs.height);
      } else { // rocks: normal
        ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height);
      }
    }

    const duckHitbox = {
      x: player.x + player.width * 0.1,
      y: player.y + player.height * 0.1,
      width: player.width * 0.8,
      height: player.height * 0.8
    };

    let obsHitbox = {
      x: obs.x,
      y: obs.y,
      width: obs.width,
      height: obs.height
    };

    // Hitbox für LOG (Baumstamm) anpassen:
    if (obs.img === obstacleImages[3]) { // log
      obsHitbox = {
        x: obs.x + obs.width * 0.15,
        y: obs.y + obs.height * 0.25,
        width: obs.width * 0.7,
        height: obs.height * 0.5
      };
    }

    if (
      duckHitbox.x < obsHitbox.x + obsHitbox.width &&
      duckHitbox.x + duckHitbox.width > obsHitbox.x &&
      duckHitbox.y < obsHitbox.y + obsHitbox.height &&
      duckHitbox.y + duckHitbox.height > obsHitbox.y
    ) {
      gameOver();
      return;
    }

    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}


// --- Sounds laden ---
const frogSound = new Audio('assets/sounds/frog.mp3');
const getHitSound = new Audio('assets/sounds/gethit.mp3');
const startSound = new Audio('assets/sounds/start.mp3');
const bgMusic = new Audio('assets/sounds/musicloop.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.18; // Leise (Skala: 0.0 - 1.0)

function drawEnemies(deltaTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const frog = enemies[i];

    // Frosch bleibt auf dem Felsen, bis die Ente nahe ist
    if (frog.state === 'idle') {
      frog.x -= speed * deltaTime;
      // Prüfe Abstand zur Ente
      if (!frog.hasJumped && frog.x - player.x < player.width * 4) {
        frog.showWarning = true;
        frog.warningTimer = 0;
        frog.hasJumped = true;
      }
      // Warnung anzeigen für 0.4 Sekunden, dann springen
      if (frog.showWarning) {
        frog.warningTimer += deltaTime;
        if (frog.warningTimer > 0.4) {
          frog.state = 'jump';
          frog.jumpTimer = 0;
          frog.showWarning = false;
          // --- Frosch-Sound ---
          frogSound.currentTime = 0;
          frogSound.play();
        }
      }
    }

    // Frosch springt
    if (frog.state === 'jump') {
      frog.jumpTimer += deltaTime;
      frog.x -= speed * deltaTime * 1.5;
      frog.y -= 200 * deltaTime - 400 * frog.jumpTimer * deltaTime;
      if (frog.jumpTimer > 0.5) {
        frog.state = 'rest';
      }
    }

    // Frosch landet im Wasser und verschwindet
    if (frog.state === 'rest') {
      frog.x -= speed * deltaTime;
      frog.y += 300 * deltaTime;
      if (frog.y > canvas.height) {
        enemies.splice(i, 1);
        continue;
      }
    }

    // Zeichnen
    let frameImg = frogFrames[0];
    if (frog.state === 'jump') frameImg = frogFrames[1];
    if (frog.state === 'rest') frameImg = frogFrames[2];
    ctx.drawImage(frameImg, frog.x, frog.y, frog.width, frog.height);

    // !!! Warnung anzeigen
    if (frog.showWarning) {
      const boxW = frog.width * 1.1;
      const boxH = frog.height * 0.5;
      const boxX = frog.x + frog.width * 0.5 - boxW / 2;
      const boxY = frog.y - boxH - 8;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#000";
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.globalAlpha = 1;
      ctx.font = `bold ${Math.floor(boxH * 0.7)}px sans-serif`;
      ctx.fillStyle = "#FF2222";
      ctx.textAlign = "center";
      ctx.fillText("!!!", frog.x + frog.width * 0.5, boxY + boxH * 0.75);
      ctx.restore();
    }

    // Kollision mit Ente prüfen
    if (
      frog.x < player.x + player.width * 0.8 &&
      frog.x + frog.width > player.x + player.width * 0.2 &&
      frog.y < player.y + player.height * 0.8 &&
      frog.y + frog.height > player.y + player.height * 0.2
    ) {
      gameOver();
      return;
    }
  }
}

// Funktion zum Zeichnen der Distanz und des Highscores
function drawMeters() {
  const currentDistance = Math.floor(meters);
  const textCurrent = `Distanz: ${currentDistance} m`;
  const textHighscore = `Highscore: ${highScore} m`;

  const fontSize = Math.max(16, canvas.width * 0.018);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "left";

  const padding = fontSize * 0.5;
  const lineHeight = fontSize + padding;

  const metricsCurrent = ctx.measureText(textCurrent);
  let rectWidthCurrent = metricsCurrent.width + padding * 2;
  let rectHeightCurrent = lineHeight + padding;
  let xCurrent = canvas.width - rectWidthCurrent - padding;
  let yCurrent = currentLandHeight + 20; // vorher: currentLandHeight - rectHeightCurrent - padding

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  roundRect(ctx, xCurrent, yCurrent, rectWidthCurrent, rectHeightCurrent, 5, true, false);
  ctx.fillStyle = "white";
  ctx.fillText(textCurrent, xCurrent + padding, yCurrent + padding + fontSize * 0.7);

  const metricsHighscore = ctx.measureText(textHighscore);
  let rectWidthHighscore = metricsHighscore.width + padding * 2;
  let rectHeightHighscore = lineHeight + padding;
  let xHighscore = canvas.width - rectWidthHighscore - padding;
  let yHighscore = yCurrent + rectHeightCurrent + padding / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  roundRect(ctx, xHighscore, yHighscore, rectWidthHighscore, rectHeightHighscore, 5, true, false);
  ctx.fillStyle = "white";
  ctx.fillText(textHighscore, xHighscore + padding, yHighscore + padding + fontSize * 0.7);
}


// --- Spielbildschirme und Logik ---
function gameOver() {
  if (!gameRunning) return;
  saveRun(); // <-- Jeder Lauf wird gespeichert!
  gameRunning = false;
  // --- Kollisionssound ---
  getHitSound.currentTime = 0;
  getHitSound.play();
  // --- Musik pausieren ---
  bgMusic.pause();
  saveHighScore();
  gameState = 'collisionAnim';
  collisionAnimActive = true;
  collisionAnimTime = 0;
  collisionAnimY = player.y;
  collisionAnimVY = -canvas.height * 0.7;
  collisionAnimAngle = 0;
  collisionAnimStartX = player.x;
  collisionAnimStartY = player.y;

  // Vibrations-Feedback bei Kollision (wenn unterstützt)
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }

  // Event-Hinweis anzeigen und nach 5 Sekunden ausblenden
  showEventHint = true;
  if (eventHintTimeout) clearTimeout(eventHintTimeout);
  eventHintTimeout = setTimeout(() => {
    showEventHint = false;
    drawGameOverScreen();
  }, 5000);

  requestAnimationFrame(gameLoop);
}

let frame = 0; // frame bleibt für Dinge wie Ente Animation

function gameLoop(currentTime) {
  if (gameState === 'collisionAnim') {
    // Delta Time Berechnung
    const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0;
    lastFrameTime = currentTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(0); // Hintergrund ohne Bewegung

    // Animation: Ente nach oben und drehen
    collisionAnimTime += deltaTime;
    collisionAnimY += collisionAnimVY * deltaTime + 0.5 * (canvas.height * 1.5) * deltaTime * deltaTime;
    collisionAnimVY += canvas.height * 1.5 * deltaTime;
    collisionAnimAngle += Math.PI * 2 * 3 * deltaTime / COLLISION_ANIM_DURATION;

    // --- NEU: Hit-Frames animieren ---
    ctx.save();
    ctx.translate(
      collisionAnimStartX + player.width / 2,
      collisionAnimY + player.height / 2
    );
    ctx.rotate(collisionAnimAngle);
    // Animation zwischen den beiden Frames
    const hitFrameIdx = Math.floor((collisionAnimTime / COLLISION_ANIM_DURATION) * duckHitFrames.length) % duckHitFrames.length;
    ctx.drawImage(
      duckHitFrames[hitFrameIdx],
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height
    );
    ctx.restore();

    if (collisionAnimTime >= COLLISION_ANIM_DURATION) {
      collisionAnimActive = false;
      gameState = 'gameOver';
      drawGameOverScreen();
      return;
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!gameRunning) {
    // Wenn das Spiel nicht läuft, setze lastFrameTime zurück
    lastFrameTime = 0;
    return;
  }

  // Delta Time Berechnung
  const deltaTime = (currentTime - lastFrameTime) / 1000; // Zeit in Sekunden
  lastFrameTime = currentTime;

  // Begrenze deltaTime, um Sprünge bei Tabswechseln oder Lag zu vermeiden
  const maxDeltaTime = 0.1; // Max 100ms
  const clampedDeltaTime = Math.min(deltaTime, maxDeltaTime);


  frame++; // Frame-Zähler bleibt für nicht-zeitbasierte Logik (z.B. Ente Animation)

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // KORRIGIERT: clampedDeltaTime an drawBackground übergeben
  drawBackground(clampedDeltaTime);

  player.update(clampedDeltaTime); // Spieler aktualisieren mit deltaTime

  if (player.y < currentLandHeight || player.y + player.height > canvas.height - currentLandHeight) {
    gameOver();
    return;
  }

  if (duckFrames[player.frameIndex].complete && duckFrames[player.frameIndex].naturalWidth !== 0) {
    player.draw(); // Animation bleibt frame-basiert
  }

  drawObstacles(clampedDeltaTime); // Hindernisse zeichnen mit deltaTime
  drawEnemies(clampedDeltaTime); // <--- HIER EINFÜGEN

  const schriftzugMaxWidth = canvas.width * 0.25;
  const schriftzugWidth = Math.min(schriftzugMaxWidth, 250);
  const schriftzugHeight = schriftzugImg.height * (schriftzugWidth / schriftzugImg.width);
  const schriftzugX = canvas.width - schriftzugWidth - (canvas.width * 0.015);
  const schriftzugY = canvas.height - schriftzugHeight - (canvas.height * 0.10); // vorher 0.015

  if (schriftzugImg.complete && schriftzugImg.naturalWidth !== 0) {
    ctx.globalAlpha = 1;
    ctx.drawImage(schriftzugImg, schriftzugX, schriftzugY, schriftzugWidth, schriftzugHeight);
  }

  drawMeters();

  // NEU: Zeit-basierte Hindernis-Spawn-Logik
  timeSinceLastObstacle += clampedDeltaTime;
  // Der Spawn-Delay kann auch mit der Geschwindigkeit skaliert werden, damit es bei höherer Geschwindigkeit schwieriger wird
  currentObstacleDelay = Math.max(0.7, INITIAL_OBSTACLE_DELAY - (meters / 1000)); // Delay wird kleiner, je weiter man kommt, min 0.7s
  if (timeSinceLastObstacle >= currentObstacleDelay) {
    spawnObstacle();
    timeSinceLastObstacle = 0; // Timer zurücksetzen
  }

  meters += (speed * clampedDeltaTime) / PIXELS_PER_METER; // Distanz sammeln basierend auf Zeit

  // NEU: Zeit-basierte Geschwindigkeitserhöhung
  timeSinceLastSpeedIncrease += clampedDeltaTime;
  if (timeSinceLastSpeedIncrease >= SPEED_INCREASE_DELAY_SECONDS) {
    speed += SPEED_INCREASE_AMOUNT;
    timeSinceLastSpeedIncrease = 0; // Timer zurücksetzen
  }

  requestAnimationFrame(gameLoop);
}

// Hilfsfunktion zum Zeichnen von abgerundeten Rechtecken
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = radius;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Event-Listener für Buttons einmalig registrieren
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleCanvasMouseMove);

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  if (gameState === 'start') {
    const btnWidth = Math.min(canvas.width * 0.4, 250);
    const btnHeight = Math.min(canvas.height * 0.1, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.35 - btnHeight / 2; // <-- Korrigiert!

    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= btnY && clickY <= btnY + btnHeight) {
      currentStartButtonColor = "#8B0000";
      drawStartScreen();
      // --- Startsound ---
      startSound.currentTime = 0;
      startSound.play();
      setTimeout(() => {
        currentStartButtonColor = "#B22222";
        startGame();
      }, 100);
    }
  } else if (gameState === 'gameOver') {
    // Werte wie in drawGameOverScreen berechnen:
    const gameOverFontSize = Math.max(28, canvas.width * 0.032);
    const infoFontSize = Math.max(20, canvas.width * 0.028);
    const padding = infoFontSize * 0.7;
    const lineHeight = infoFontSize * 1.3;
    const distText = `Du bist ${Math.floor(meters)} Meter geschwommen.`;
    const hsText = `Highscore: ${highScore} m`;
    const boxWidth = Math.max(ctx.measureText(distText).width, ctx.measureText(hsText).width) + padding * 2;
    // KORREKTUR: Boxhöhe wie in drawGameOverScreen!
    const boxHeight = lineHeight * 2 + padding * 1.2;
    const boxY = canvas.height * 0.24 + gameOverFontSize * 0.7;

    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.10, 55);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight + infoFontSize * 0.8;

    // Highscore übermitteln Button
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= btnY && clickY <= btnY + btnHeight) {
      showHighscoreInput = true;
      drawHighscoreInput();
      return;
    }

    // Leaderboard Button
    const lbBtnY = btnY + btnHeight + 12;
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= lbBtnY && clickY <= lbBtnY + btnHeight) {
      showLeaderboard = true;
      fetchLeaderboard();
      drawLeaderboard();
      return;
    }

    // Nochmal spielen Button
    const playAgainBtnY = lbBtnY + btnHeight + 12;
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= playAgainBtnY && clickY <= playAgainBtnY + btnHeight) {
      currentGameOverButtonColor = "#8B0000";
      drawGameOverScreen();
      startSound.currentTime = 0;
      startSound.play();
      setTimeout(() => {
        currentGameOverButtonColor = "#B22222";
        startGame();
      }, 100);
    }
  }
}

function handleCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (gameState === 'start') {
    const btnWidth = Math.min(canvas.width * 0.4, 250);
    const btnHeight = Math.min(canvas.height * 0.1, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.35 - btnHeight / 2; // <-- Korrigiert!

    const isHovering = (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight);
    const newColor = isHovering ? "#FF6347" : "#B22222"; // Hellrot beim Hover

    if (currentStartButtonColor !== newColor) {
      currentStartButtonColor = newColor;
      drawStartScreen();
    }
  } else if (gameState === 'gameOver') {
    const gameOverFontSize = Math.max(36, canvas.width * 0.04);
    const scoreFontSize = Math.max(28, canvas.width * 0.035);
    const hsGameOverFontSize = Math.max(24, canvas.width * 0.03);
    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.12, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.32 + gameOverFontSize * 1.3 + scoreFontSize * 1.2 + hsGameOverFontSize * 1.5;

    const isHovering = (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight);
    const newColor = isHovering ? "#2E8B57" : "#228B22";

    if (currentGameOverButtonColor !== newColor) {
      currentGameOverButtonColor = newColor;
      drawGameOverScreen();
    }
  }
}

// Hilfsfunktion für schönes Hintergrundbild (Cover-Effekt)
function drawBackgroundImageCover(img, ctx, canvas) {
  if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) return;

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.naturalWidth / img.naturalHeight;

  let drawWidth, drawHeight, offsetX, offsetY;

  if (canvasRatio > imgRatio) {
    // Canvas ist breiter als das Bild
    drawWidth = canvas.width;
    drawHeight = canvas.width / imgRatio;
    offsetX = 0;
    offsetY = (canvas.height - drawHeight) / 2;
  } else {
    // Canvas ist höher als das Bild
    drawHeight = canvas.height;
    drawWidth = canvas.height * imgRatio;
    offsetX = (canvas.width - drawWidth) / 2;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Startbildschirm
function drawStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackgroundImageCover(startGameOverBackgroundImg, ctx, canvas);

  // --- Start-Button mittig im orangen Bereich ---
  // Positioniere Button etwa bei 35% der Canvas-Höhe (optisch mittig im Orange)
  const btnWidth = Math.min(canvas.width * 0.4, 250);
  const btnHeight = Math.min(canvas.height * 0.1, 70);
  const btnX = (canvas.width - btnWidth) / 2;
  const btnY = canvas.height * 0.35 - btnHeight / 2;

  ctx.fillStyle = currentStartButtonColor;
  roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 15, true, false);

  const btnFontSize = Math.max(24, canvas.width * 0.028);
  ctx.fillStyle = "white";
  ctx.font = `bold ${btnFontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Start", canvas.width / 2, btnY + btnHeight * 0.65);

  // --- Top Score direkt unter dem Button, ebenfalls im orangen Bereich ---
  const hsText = `Top Score: ${highScore} m`;
  const hsFontSize = Math.max(20, canvas.width * 0.025);
  ctx.font = `bold ${hsFontSize}px sans-serif`;
  const hsPadding = hsFontSize * 0.6;
  const hsMetrics = ctx.measureText(hsText);
  const hsRectWidth = hsMetrics.width + hsPadding * 2;
  const hsRectHeight = hsFontSize + hsPadding * 2;
  const hsX = (canvas.width - hsRectWidth) / 2;
  const hsY = btnY + btnHeight + hsPadding;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  roundRect(ctx, hsX, hsY, hsRectWidth, hsRectHeight, 10, true, false);

  ctx.fillStyle = "white";
  ctx.fillText(hsText, canvas.width / 2, hsY + hsPadding + hsFontSize * 0.7);

  // --- Schriftzug unten rechts einfügen ---
  if (schriftzugImg.complete && schriftzugImg.naturalWidth !== 0) {
    const schriftzugMaxWidth = canvas.width * 0.25;
    const schriftzugWidth = Math.min(schriftzugMaxWidth, 250);
    const schriftzugHeight = schriftzugImg.height * (schriftzugWidth / schriftzugImg.width);
    const schriftzugX = canvas.width - schriftzugWidth - (canvas.width * 0.015);
    const schriftzugY = canvas.height - schriftzugHeight - (canvas.height * 0.10);

    ctx.globalAlpha = 1;
    ctx.drawImage(schriftzugImg, schriftzugX, schriftzugY, schriftzugWidth, schriftzugHeight);
  }
}

// Game Over Bildschirm
function drawGameOverScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackgroundImageCover(startGameOverBackgroundImg, ctx, canvas);

  // Game Over Überschrift
  ctx.fillStyle = "black";
  const gameOverFontSize = Math.max(28, canvas.width * 0.032);
  ctx.font = `bold ${gameOverFontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  const gameOverY = canvas.height * 0.24;
  ctx.strokeText("Game Over!", canvas.width / 2, gameOverY);
  ctx.fillText("Game Over!", canvas.width / 2, gameOverY);

  // --- Gemeinsame Box für Distanz und Highscore ---
  const infoFontSize = Math.max(20, canvas.width * 0.028);
  ctx.font = `bold ${infoFontSize}px sans-serif`;
  ctx.textAlign = "center";
  const distText = `Du bist ${Math.floor(meters)} Meter geschwommen.`;
  const hsText = `Highscore: ${highScore} m`;

  const padding = infoFontSize * 0.7;
  const lineHeight = infoFontSize * 1.3;
  const boxWidth = Math.max(ctx.measureText(distText).width, ctx.measureText(hsText).width) + padding * 2;
  const boxHeight = lineHeight * 2 + padding * 1.2;
  const boxX = (canvas.width - boxWidth) / 2;
  const boxY = gameOverY + gameOverFontSize * 0.7;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 18, true, false);

  ctx.fillStyle = "white";
  ctx.fillText(distText, canvas.width / 2, boxY + padding + infoFontSize * 0.8);
  ctx.fillText(hsText, canvas.width / 2, boxY + padding + infoFontSize * 0.8 + lineHeight);

  // --- Event-Hinweisbox ---
  if (showEventHint) {
    const eventText1 = "14.06.2025 - Entenrennen Fürstenbrunn";
    const eventText2 = "Hast du deine Ente schon !?";
    const eventFontSize = Math.max(20, canvas.width * 0.028);
    ctx.font = `bold ${eventFontSize}px sans-serif`;
    const eventPadding = eventFontSize * 0.7;
    const eventBoxWidth = Math.max(ctx.measureText(eventText1).width, ctx.measureText(eventText2).width) + eventPadding * 2;
    const eventBoxHeight = eventFontSize * 2 + eventPadding * 2;
    const eventBoxX = (canvas.width - eventBoxWidth) / 2;
    const eventBoxY = boxY + boxHeight + eventFontSize * 1.7;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    roundRect(ctx, eventBoxX, eventBoxY, eventBoxWidth, eventBoxHeight, 16, true, false);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(eventText1, canvas.width / 2, eventBoxY + eventPadding + eventFontSize * 0.85);
    ctx.fillStyle = "#ff2222";
    ctx.fillText(eventText2, canvas.width / 2, eventBoxY + eventPadding + eventFontSize * 2.5);
  }

  // --- PATCH: Buttons für Highscore & Leaderboard ---
  if (!showEventHint) {
    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.10, 55);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight + infoFontSize * 0.8;

    // Highscore übermitteln Button
    ctx.fillStyle = "#1E90FF";
    roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 15, true, false);
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.max(18, canvas.width * 0.025)}px sans-serif`;
    ctx.fillText("Highscore übermitteln", canvas.width / 2, btnY + btnHeight * 0.65);

    // Leaderboard Button
    const lbBtnWidth = btnWidth;
    const lbBtnHeight = btnHeight;
    const lbBtnX = btnX;
    const lbBtnY = btnY + btnHeight + 12;

    ctx.fillStyle = "#444";
    roundRect(ctx, lbBtnX, lbBtnY, lbBtnWidth, lbBtnHeight, 15, true, false);
    ctx.fillStyle = "white";
    ctx.fillText("Leaderboard", canvas.width / 2, lbBtnY + lbBtnHeight * 0.65);

    // Nochmal spielen Button
    const playAgainBtnY = lbBtnY + lbBtnHeight + 12;
    ctx.fillStyle = currentGameOverButtonColor = "#B22222";
    roundRect(ctx, btnX, playAgainBtnY, btnWidth, btnHeight, 15, true, false);
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.max(18, canvas.width * 0.025)}px sans-serif`;
    ctx.fillText("Nochmal spielen", canvas.width / 2, playAgainBtnY + btnHeight * 0.65);
  }

  // Schriftzug unten rechts (nur einmal gezeichnet)
  if (schriftzugImg.complete && schriftzugImg.naturalWidth !== 0) {
    const schriftzugMaxWidth = canvas.width * 0.25;
    const schriftzugWidth = Math.min(schriftzugMaxWidth, 250);
    const schriftzugHeight = schriftzugImg.height * (schriftzugWidth / schriftzugImg.width);
    const schriftzugX = canvas.width - schriftzugWidth - (canvas.width * 0.015);
    const schriftzugY = canvas.height - schriftzugHeight - (canvas.height * 0.015);

    ctx.drawImage(schriftzugImg, schriftzugX, schriftzugY, schriftzugWidth, schriftzugHeight);
  }
}

// --- PATCH: Canvas Click Handler für neue Buttons ---
function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  if (gameState === 'start') {
    const btnWidth = Math.min(canvas.width * 0.4, 250);
    const btnHeight = Math.min(canvas.height * 0.1, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.35 - btnHeight / 2;

    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= btnY && clickY <= btnY + btnHeight) {
      currentStartButtonColor = "#8B0000";
      drawStartScreen();
      startSound.currentTime = 0;
      startSound.play();
      setTimeout(() => {
        currentStartButtonColor = "#B22222";
        startGame();
      }, 100);
    }
  } else if (gameState === 'gameOver') {
    // Werte wie in drawGameOverScreen berechnen:
    const gameOverFontSize = Math.max(28, canvas.width * 0.032);
    const infoFontSize = Math.max(20, canvas.width * 0.028);
    const padding = infoFontSize * 0.7;
    const lineHeight = infoFontSize * 1.3;
    const distText = `Du bist ${Math.floor(meters)} Meter geschwommen.`;
    const hsText = `Highscore: ${highScore} m`;
    const boxWidth = Math.max(ctx.measureText(distText).width, ctx.measureText(hsText).width) + padding * 2;
    // KORREKTUR: Boxhöhe wie in drawGameOverScreen!
    const boxHeight = lineHeight * 2 + padding * 1.2;
    const boxY = canvas.height * 0.24 + gameOverFontSize * 0.7;

    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.10, 55);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight + infoFontSize * 0.8;

    // Highscore übermitteln Button
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= btnY && clickY <= btnY + btnHeight) {
      showHighscoreInput = true;
      drawHighscoreInput();
      return;
    }

    // Leaderboard Button
    const lbBtnY = btnY + btnHeight + 12;
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= lbBtnY && clickY <= lbBtnY + btnHeight) {
      showLeaderboard = true;
      fetchLeaderboard();
      drawLeaderboard();
      return;
    }

    // Nochmal spielen Button
    const playAgainBtnY = lbBtnY + btnHeight + 12;
    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= playAgainBtnY && clickY <= playAgainBtnY + btnHeight) {
      currentGameOverButtonColor = "#8B0000";
      drawGameOverScreen();
      startSound.currentTime = 0;
      startSound.play();
      setTimeout(() => {
        currentGameOverButtonColor = "#B22222";
        startGame();
      }, 100);
    }
  }
}

// --- BUGREPORT OVERLAY & BUTTON ---
function drawBugReportButton() {
  // Button nur im Game Over Screen anzeigen
  if (gameState !== 'gameOver') return;
  let btn = document.getElementById('bugReportBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'bugReportBtn';
    btn.textContent = "🐞 Fehler melden";
    btn.style.position = 'fixed';
    btn.style.left = '18px';
    btn.style.bottom = '18px';
    btn.style.zIndex = 1200;
    btn.style.background = '#B22222';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.padding = '10px 18px';
    btn.style.fontSize = '1em';
    btn.style.boxShadow = '0 2px 8px #0005';
    btn.onclick = drawBugReportOverlay;
    document.body.appendChild(btn);
  }
}
function removeBugReportButton() {
  const btn = document.getElementById('bugReportBtn');
  if (btn) document.body.removeChild(btn);
}

function drawBugReportOverlay() {
  let overlay = document.getElementById('bugReportOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bugReportOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 2000;
    overlay.innerHTML = `
      <div style="background:rgba(0,0,0,0.85);padding:28px 18px;border-radius:14px;box-shadow:0 2px 16px #0008;max-width:90vw;">
        <h2 style="margin-top:0;color:#fff;">Fehler melden</h2>
        <input id="bugNameInput" type="text" maxlength="30" placeholder="Dein Name (optional)" style="font-size:1em;padding:6px;width:90%;margin-bottom:8px;border-radius:8px;border:none;">
        <br>
        <textarea id="bugDescInput" rows="4" maxlength="500" placeholder="Was ist passiert?" style="font-size:1.1em;padding:8px;width:90%;margin-bottom:12px;border-radius:8px;border:none;"></textarea>
        <br>
        <button id="submitBugBtn" style="font-size:1.1em;padding:8px 24px;margin-top:8px;">E-Mail senden</button>
        <button id="cancelBugBtn" style="font-size:1.1em;padding:8px 24px;margin-left:12px;margin-top:8px;">Abbrechen</button>
        <div id="bugReportFeedback" style="color:#fff;margin-top:10px;text-align:center;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('submitBugBtn').onclick = () => {
      const name = document.getElementById('bugNameInput').value.trim();
      const desc = document.getElementById('bugDescInput').value.trim();
      if (desc.length === 0) return;
      sendBugReportMail(name, desc);
    };
    document.getElementById('cancelBugBtn').onclick = () => {
      document.body.removeChild(overlay);
    };
  }
}

function sendBugReportMail(name, desc) {
  const subject = encodeURIComponent("Entenrennen Bugreport");
  const body = encodeURIComponent(
    `Name: ${name}\nGeräte-ID: ${deviceId}\nDatum: ${new Date().toLocaleString()}\n\nBeschreibung:\n${desc}`
  );
  window.location.href = `mailto:svuberg@gmail.com?subject=${subject}&body=${body}`;
  setTimeout(() => {
    const overlay = document.getElementById('bugReportOverlay');
    if (overlay) document.body.removeChild(overlay);
  }, 500);
}

// Button nur im Game Over Screen anzeigen/entfernen
const origDrawGameOverScreen = drawGameOverScreen;
drawGameOverScreen = function() {
  origDrawGameOverScreen();
  drawBugReportButton();
};
function hideAllOverlays() {
  removeBugReportButton();
  const overlay = document.getElementById('bugReportOverlay');
  if (overlay) document.body.removeChild(overlay);
}
window.addEventListener('gameStateChange', () => {
  if (gameState !== 'gameOver') removeBugReportButton();
});

// Entferne Button bei Neustart oder Overlay
window.addEventListener('keydown', (e) => {
  if (e.code === "Enter" && gameState !== 'gameOver') removeBugReportButton();
});

// --- Geräte-ID generieren und speichern ---
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('entenrennen_device_id');
  if (!deviceId) {
    deviceId = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16));
    localStorage.setItem('entenrennen_device_id', deviceId);
  }
  return deviceId;
}
const deviceId = getOrCreateDeviceId();

let runSaved = false; // <--- NEU: Flag für Run-Übertragung

function saveRun() {
  if (runSaved) return; // <--- NEU: Doppelte Übertragung verhindern
  runSaved = true;      // <--- NEU: Flag setzen
  const formData = new FormData();
  formData.append('score', Math.floor(meters));
  formData.append('device', deviceId);
  formData.append('date', new Date().toISOString());
  formData.append('type', 'run');

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: formData
  }).then(() => {
    console.log("Run an Google Sheet gesendet!");
  }).catch((err) => {
    console.error("Fehler beim Senden an Google Sheet:", err);
  });
}

// --- NEU: Highscore-Name-Eingabe Overlay (schwarz-transparent) ---
function drawHighscoreInput() {
  let overlay = document.getElementById('highscoreOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'highscoreOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 1000;
    overlay.innerHTML = `
      <div style="background:rgba(0,0,0,0.75);padding:32px 24px;border-radius:16px;box-shadow:0 2px 16px #0008;max-width:90vw;">
        <h2 style="margin-top:0;color:#fff;">Highscore übermitteln</h2>
        <input id="playerNameInput" type="text" maxlength="20" placeholder="Dein Name" style="font-size:1.2em;padding:8px;width:90%;margin-bottom:12px;border-radius:8px;border:none;">
        <br>
        <button id="submitScoreBtn" style="font-size:1.1em;padding:8px 24px;margin-top:8px;">Senden</button>
        <button id="cancelScoreBtn" style="font-size:1.1em;padding:8px 24px;margin-left:12px;margin-top:8px;">Abbrechen</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('submitScoreBtn').onclick = () => {
      const name = document.getElementById('playerNameInput').value.trim();
      if (name.length === 0) return;
      submitHighscore(name);
      showHighscoreInput = false;
      drawGameOverScreen();
    };
    document.getElementById('cancelScoreBtn').onclick = () => {
      document.body.removeChild(overlay);
      showHighscoreInput = false;
      drawGameOverScreen();
    };
  }
}

// --- NEU: Leaderboard Overlay (schwarz-transparent) ---
function drawLeaderboard() {
  let overlay = document.getElementById('leaderboardOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'leaderboardOverlay';
    overlay.style.position = 'fixed';
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = 1001;
    overlay.innerHTML = `
      <div style="background:rgba(0,0,0,0.85);padding:24px 8px 16px 8px;border-radius:18px;max-width:95vw;max-height:90vh;overflow:auto;box-shadow:0 2px 16px #0008;">
        <h2 style="margin-top:0;text-align:center;color:#fff;">Leaderboard (Top 100)</h2>
        <div id="leaderboardList" style="max-height:60vh;overflow-y:auto;margin-bottom:16px;"></div>
        <button id="closeLeaderboardBtn" style="font-size:1.1em;padding:8px 24px;display:block;margin:0 auto;margin-top:8px;">Zurück</button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('closeLeaderboardBtn').onclick = () => {
      document.body.removeChild(overlay);
      showLeaderboard = false;
      drawGameOverScreen();
    };
  }
  // Fülle die Liste
  const listDiv = document.getElementById('leaderboardList');
  if (leaderboardData.length === 0) {
    listDiv.innerHTML = "<div style='text-align:center;color:#fff;'>Lade...</div>";
  } else {
    listDiv.innerHTML = leaderboardData.map((entry, i) =>
      `<div style="display:flex;justify-content:space-between;padding:4px 12px;border-bottom:1px solid #333;color:#fff;">
        <span style="font-weight:bold;width:2em;">${i+1}.</span>
        <span style="flex:1;">${entry.name || 'Anonym'}</span>
        <span style="width:4em;text-align:right;">${entry.score} m</span>
      </div>`
    ).join('');
  }
}

// --- NEU: Highscore mit Name übermitteln ---
function submitHighscore(name) {
  const formData = new FormData();
  formData.append('score', highScore);
  formData.append('device', deviceId);
  formData.append('date', new Date().toISOString());
  formData.append('name', name);
  formData.append('type', 'highscore'); // <--- NEU

 let overlay = document.getElementById('highscoreOverlay');
  let feedbackDiv = document.getElementById('highscoreFeedback');
  if (!feedbackDiv && overlay) {
    feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'highscoreFeedback';
    feedbackDiv.style.color = '#fff';
    feedbackDiv.style.marginTop = '12px';
    feedbackDiv.style.textAlign = 'center';
    overlay.querySelector('div').appendChild(feedbackDiv);
  }
  if (feedbackDiv) feedbackDiv.textContent = "Sende...";

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: formData
  })
    .then((response) => response.text())
    .then((text) => {
      let msg = "";
      if (text === "OK") msg = "Dein Score wurde übermittelt!";
      else if (text === "UPDATED") msg = "Dein Eintrag wurde aktualisiert!";
      else if (text === "DUPLICATE") msg = "Dieser Score wurde bereits übermittelt.";
      else if (text === "BADWORD") msg = "Bitte gib einen angemessenen Namen ein!";
      else msg = "Unbekannte Antwort vom Server.";

      if (feedbackDiv) feedbackDiv.textContent = msg;
      setTimeout(() => {
        if (overlay && document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
        showHighscoreInput = false;
        drawGameOverScreen();
      }, 2000);
    })
    .catch((err) => {
      if (feedbackDiv) feedbackDiv.textContent = "Übermittlung fehlgeschlagen. Bitte später erneut versuchen!";
    });
}

// --- NEU: Leaderboard laden ---
function fetchLeaderboard() {
  leaderboardData = [];
  fetch(GOOGLE_SCRIPT_URL + "?leaderboard=1")
    .then(r => r.json())
    .then(data => {
      leaderboardData = data.slice(0, 100); // Top 100
      drawLeaderboard();
    })
    .catch(() => {
      leaderboardData = [];
      drawLeaderboard();
    });
}

// --- Eingabe-Handler ---
window.addEventListener("keydown", (e) => {
  if (!gameRunning && (gameState === 'start' || gameState === 'gameOver')) {
    if (e.code === "Enter") {
      startGame();
      return;
    }
  }
  if (!gameRunning) return;
  if (e.code === "Space" || e.code === "ArrowUp") {
    velocityY = jumpStrength;
  }
});

// Touch-Eingabe für Mobilgeräte
canvas.addEventListener("touchstart", (e) => {
  if (!gameRunning) {
    if (gameState === 'start' || gameState === 'gameOver') {
        const touch = e.touches[0];
        handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        return;
    }
  }

  if (gameRunning) {
    e.preventDefault();
    velocityY = jumpStrength;
  }
}, { passive: false });

function drawLoadingScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Hintergrundbild (wie bei drawBackgroundImageCover)
  drawBackgroundImageCover(startGameOverBackgroundImg, ctx, canvas);

  // Halbtransparent abdunkeln
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ladebalken
  const barWidth = canvas.width * 0.5;
  const barHeight = 32;
  const barX = (canvas.width - barWidth) / 2;
  // Weiter nach unten verschieben (z.B. 65% der Höhe)
  const barY = canvas.height * 0.65 - barHeight / 2;

  // "Lädt..." Text (ROT und weiter unten)
  ctx.font = `bold ${Math.max(28, canvas.width * 0.04)}px sans-serif`;
  ctx.fillStyle = "#ff2222";
  ctx.textAlign = "center";
  ctx.fillText("Lädt...", canvas.width / 2, barY - 18);

  // Rahmen
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#B22222";
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 16);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Fortschritt
  const progress = assetsLoadedCount / assetsToLoad.length;
  ctx.save();
  ctx.fillStyle = "#ff2222"; // Ladebalken jetzt rot
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * progress, barHeight, 16);
  ctx.fill();
  ctx.restore();

  // Prozentanzeige
  ctx.font = `bold ${Math.max(18, canvas.width * 0.025)}px sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(progress * 100)}%`, canvas.width / 2, barY + barHeight * 0.72);

  // Optional: kleine Ente in der Mitte (weiter unten)
  if (duckFrames[0].complete && duckFrames[0].naturalWidth > 0) {
    const iconSize = Math.min(barHeight * 1.2, );
    ctx.drawImage(
      duckFrames[0],
      canvas.width / 2 - iconSize / 2,
      barY - iconSize - 12 + 100, // +60 Pixel weiter nach unten
      iconSize,
      iconSize
    );
  }
}

// ...und im assetLoaded():
if (gameState === 'loading') drawLoadingScreen();

function loadingLoop() {
  if (gameState === 'loading') {
    drawLoadingScreen();
    requestAnimationFrame(loadingLoop);
  }
}

gameState = 'loading';
loadingLoop();

// Highscore auch beim Verlassen der Seite speichern (z.B. bei App-Schließen oder Neuladen)
window.addEventListener('beforeunload', () => {
  saveHighScore();
});
