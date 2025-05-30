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


function saveHighScore() {
  if (meters > highScore) {
    highScore = Math.floor(meters);
    localStorage.setItem(HIGHSCORE_KEY, highScore);

    const formData = new FormData();
    formData.append('score', highScore);
    formData.append('device', deviceId);

    fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec', {
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

function saveRun() {
  const formData = new FormData();
  formData.append('score', Math.floor(meters));
  formData.append('device', deviceId);

  fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec', {
    method: 'POST',
    body: formData
  }).then(() => {
    console.log("Run an Google Sheet gesendet!");
  }).catch((err) => {
    console.error("Fehler beim Senden an Google Sheet:", err);
  });
}

function sendHighscoreWithName() {
  let input = document.getElementById("nameInputBox");
  const name = input.value.trim();
  if (!name) return;
  const formData = new FormData();
  formData.append('score', Math.floor(meters));
  formData.append('device', deviceId);
  formData.append('name', name);

  fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec', {
    method: 'POST',
    body: formData
  }).then(() => {
    showNameInput = false;
    playerName = "";
    hideNameInputBox();
    alert("Highscore übertragen!");
    drawGameOverScreen();
  });
}

// Highscore Liste laden
fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec')
  .then(r => r.json())
  .then(list => {
    highscoreList = list;
    drawGameOverScreen();
  });

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
    // Diese Werte müssen exakt wie in drawGameOverScreen berechnet werden:
    const gameOverFontSize = Math.max(28, canvas.width * 0.032);
    const infoFontSize = Math.max(20, canvas.width * 0.028);
    const padding = infoFontSize * 0.7;
    const lineHeight = infoFontSize * 1.3;
    const distText = `Du bist ${Math.floor(meters)} Meter geschwommen.`;
    const hsText = `Highscore: ${highScore} m`;
    const boxWidth = Math.max(ctx.measureText(distText).width, ctx.measureText(hsText).width) + padding * 2;
    const boxHeight = lineHeight + padding * 1.2;
    const gameOverY = canvas.height * 0.24;
    const boxY = gameOverY + gameOverFontSize * 0.7;

    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.12, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight + infoFontSize * 0.8;

    if (clickX >= btnX && clickX <= btnX + btnWidth && clickY >= btnY && clickY <= btnY + btnHeight) {
      currentGameOverButtonColor = "#8B0000";
      drawGameOverScreen();
      // --- Startsound ---
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
    // Abstand zwischen den Texten vergrößert (z.B. *2.5 statt *2.0)
    ctx.fillText(eventText2, canvas.width / 2, eventBoxY + eventPadding + eventFontSize * 2.5);
  }

  // --- "Nochmal spielen" Button erst nach 5 Sekunden anzeigen ---
  if (!showEventHint) {
    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.12, 70);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = boxY + boxHeight + infoFontSize * 0.8 + (showEventHint ? eventFontSize * 2.5 : 0);

    ctx.fillStyle = currentGameOverButtonColor = "#B22222";
    roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 15, true, false);

    const playAgainFontSize = Math.max(18, canvas.width * 0.025);
    ctx.fillStyle = "white";
    ctx.font = `bold ${playAgainFontSize}px sans-serif`;
    ctx.fillText("Nochmal spielen", canvas.width / 2, btnY + btnHeight * 0.65);
  }

  // --- Highscore übertragen Button ---
  if (!showEventHint && !showNameInput && !showHighscoreList) {
    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.12, 60);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.65;

    ctx.fillStyle = "#1E90FF";
    roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 15, true, false);
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.max(18, canvas.width * 0.025)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Highscore übertragen", canvas.width / 2, btnY + btnHeight * 0.65);

    // --- Highscore Liste Button ---
    const listBtnY = btnY + btnHeight + 15;
    ctx.fillStyle = "#228B22";
    roundRect(ctx, btnX, listBtnY, btnWidth, btnHeight, 15, true, false);
    ctx.fillStyle = "white";
    ctx.fillText("Highscore Liste", canvas.width / 2, listBtnY + btnHeight * 0.65);
  }

  // --- Namenseingabe anzeigen ---
  if (showNameInput) {
    // HTML-Input über dem Canvas einblenden
    showNameInputBox();
  } else {
    hideNameInputBox();
  }

  // --- Highscore Liste anzeigen ---
  if (showHighscoreList) {
    drawHighscoreList();
  }
}

// Hilfsfunktionen für Namenseingabe
function showNameInputBox() {
  let input = document.getElementById("nameInputBox");
  let sendBtn = document.getElementById("sendHighscoreBtn");
  if (!input) {
    input = document.createElement("input");
    input.id = "nameInputBox";
    input.type = "text";
    input.placeholder = "Dein Name";
    input.style.position = "absolute";
    input.style.left = "50%";
    input.style.top = "60%";
    input.style.transform = "translate(-50%, 0)";
    input.style.fontSize = "1.2em";
    document.body.appendChild(input);
  }
  input.style.display = "block";
  input.value = playerName;

  if (!sendBtn) {
    sendBtn = document.createElement("button");
    sendBtn.id = "sendHighscoreBtn";
    sendBtn.innerText = "Senden";
    sendBtn.style.position = "absolute";
    sendBtn.style.left = "50%";
    sendBtn.style.top = "65%";
    sendBtn.style.transform = "translate(-50%, 0)";
    sendBtn.style.fontSize = "1.1em";
    document.body.appendChild(sendBtn);
    sendBtn.onclick = sendHighscoreWithName;
  }
  sendBtn.style.display = "block";
}

function hideNameInputBox() {
  let input = document.getElementById("nameInputBox");
  let sendBtn = document.getElementById("sendHighscoreBtn");
  if (input) input.style.display = "none";
  if (sendBtn) sendBtn.style.display = "none";
}

function sendHighscoreWithName() {
  let input = document.getElementById("nameInputBox");
  const name = input.value.trim();
  if (!name) return;
  const formData = new FormData();
  formData.append('score', Math.floor(meters));
  formData.append('device', deviceId);
  formData.append('name', name);

  fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec', {
    method: 'POST',
    body: formData
  }).then(() => {
    showNameInput = false;
    playerName = "";
    hideNameInputBox();
    alert("Highscore übertragen!");
    drawGameOverScreen();
  });
}

// Highscore Liste anzeigen
function drawHighscoreList() {
  // HTML-Element für Liste erzeugen
  let listDiv = document.getElementById("highscoreListDiv");
  if (!listDiv) {
    listDiv = document.createElement("div");
    listDiv.id = "highscoreListDiv";
    listDiv.style.position = "absolute";
    listDiv.style.left = "50%";
    listDiv.style.top = "70%";
    listDiv.style.transform = "translate(-50%, 0)";
    listDiv.style.background = "rgba(0,0,0,0.8)";
    listDiv.style.color = "#fff";
    listDiv.style.padding = "16px";
    listDiv.style.borderRadius = "12px";
    listDiv.style.maxHeight = "300px";
    listDiv.style.overflowY = "auto";
    listDiv.style.fontSize = "1.1em";
    document.body.appendChild(listDiv);
  }
  listDiv.style.display = "block";
  listDiv.innerHTML = "<b>Highscore Liste</b><br><br>" +
    highscoreList.map((entry, i) =>
      `${i + 1}. ${entry.name}: ${entry.score} m`
    ).join("<br>");
}

function hideHighscoreList() {
  let listDiv = document.getElementById("highscoreListDiv");
  if (listDiv) listDiv.style.display = "none";
}

// Event-Handler für Canvas-Buttons
canvas.addEventListener('click', function(e) {
  if (gameState === 'gameOver' && !showEventHint) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const btnWidth = Math.min(canvas.width * 0.5, 250);
    const btnHeight = Math.min(canvas.height * 0.12, 60);
    const btnX = (canvas.width - btnWidth) / 2;
    const btnY = canvas.height * 0.65;
    const listBtnY = btnY + btnHeight + 15;

    // Highscore übertragen Button
    if (!showNameInput && !showHighscoreList &&
      clickX >= btnX && clickX <= btnX + btnWidth &&
      clickY >= btnY && clickY <= btnY + btnHeight) {
      showNameInput = true;
      drawGameOverScreen();
      return;
    }
    // Highscore Liste Button
    if (!showNameInput && !showHighscoreList &&
      clickX >= btnX && clickX <= btnX + btnWidth &&
      clickY >= listBtnY && clickY <= listBtnY + btnHeight) {
      showHighscoreList = true;
      // Highscore Liste Button (nur ein https://!)
      fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec')
        .then(r => r.json())
        .then(list => {
          highscoreList = list;
          drawGameOverScreen();
        });
      return;
    }
    // Klick außerhalb: Liste/Namenseingabe schließen
    if (showHighscoreList) {
      showHighscoreList = false;
      hideHighscoreList();
      drawGameOverScreen();
    }
    if (showNameInput) {
      showNameInput = false;
      hideNameInputBox();
      drawGameOverScreen();
    }
  }
});

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

function saveRun() {
  const formData = new FormData();
  formData.append('score', Math.floor(meters));
  formData.append('device', deviceId);

  fetch('https://script.google.com/macros/s/AKfycbyR3lfh686T8cFHwIHXNuQeVTGZKCmSf5vVVvBxzIEteFVaVxmGDozwUFhq-g1E19SG-Q/exec', {
    method: 'POST',
    body: formData
  }).then(() => {
    console.log("Run an Google Sheet gesendet!");
  }).catch((err) => {
    console.error("Fehler beim Senden an Google Sheet:", err);
  });
}

function startGame() {
  gameRunning = true;
  gameState = 'playing';
  meters = 0;
  speed = INITIAL_SPEED;
  velocityY = 0;
  obstacles = [];
  enemies = [];
  player.frameIndex = 0;
  player.frameTick = 0;
  player.x = canvas.width * 0.08;
  player.y = currentLandHeight + (canvas.height - 2 * currentLandHeight) / 2 - player.height / 2;
  lastFrameTime = performance.now();
  timeSinceLastObstacle = 0;
  timeSinceLastSpeedIncrease = 0;
  bgMusic.currentTime = 0;
  bgMusic.play();
  drawGameOverScreen(); // oder drawStartScreen(), je nach gewünschtem Verhalten
  requestAnimationFrame(gameLoop);
}
