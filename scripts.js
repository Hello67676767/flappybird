const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");

const WIDTH = 480;
const HEIGHT = 640;
const GROUND_HEIGHT = 64;
const GROUND_TOP = HEIGHT - GROUND_HEIGHT;
const BIRD_X = 135;
const BIRD_RADIUS = 17;
const PIPE_WIDTH = 76;
const PIPE_GAP = 174;
const GRAVITY = 1450;
const FLAP_STRENGTH = -465;
const PIPE_SPEED = 190;
const SKINS = {
  sunshine: { body: "#ffd34f", wing: "#e99b38", outline: "#d68d2e", beak: "#f4834b" },
  sky: { body: "#75c9f1", wing: "#378fc6", outline: "#286c9c", beak: "#f4a54b" },
  berry: { body: "#f28aa3", wing: "#c94d75", outline: "#a63e62", beak: "#f6b84a" },
  mint: { body: "#8cddb0", wing: "#48aa7d", outline: "#347f60", beak: "#f18b58" },
  fire: { body: "#ff8248", wing: "#dc452d", outline: "#a93628", beak: "#ffdb63" },
  ice: { body: "#a8edff", wing: "#63bce1", outline: "#438db8", beak: "#ffb95e" },
  lightning: { body: "#ffe968", wing: "#f3ad34", outline: "#bd8a24", beak: "#f28349" },
  water: { body: "#58c9ee", wing: "#268dc5", outline: "#246c9d", beak: "#ffb95e" },
  "wild-christmas": { body: "#e94b4b", wing: "#176b43", outline: "#9e2431", beak: "#fff1bc" },
  "minecraft-cactus": { body: "#55b84a", wing: "#2d7435", outline: "#1c5428", beak: "#b6dc55" },
  camera: { body: "#30353c", wing: "#4b535d", outline: "#111318", beak: "#d9f1ff" },
  laptop: { body: "#262a31", wing: "#11151b", outline: "#0a0d11", beak: "#55ff77" },
};

let state = "ready";
let birdY = HEIGHT * 0.43;
let birdVelocity = 0;
let pipes = [];
let score = 0;
let groundOffset = 0;
let lastFrame = 0;
let pixelRatio = 1;
let selectedSkin = "sunshine";
let selectedTrail = "none";
let activeCategory = "skins";
let isShopOpen = false;
let trailHistory = [];
let lastTrailSample = 0;
let cameraFlashUntil = 0;

const shopDialog = document.querySelector("#skin-shop");
const categoryTabs = document.querySelectorAll(".customize-tab");
const categoryPanels = document.querySelectorAll(".shop-category");
const skinOptions = document.querySelectorAll("[data-skin]");
const trailOptions = document.querySelectorAll("[data-trail]");

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * pixelRatio;
  canvas.height = HEIGHT * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  draw();
}

function addPipe(x = WIDTH + 24) {
  const gapCenter = 155 + Math.random() * 260;
  pipes.push({
    x,
    gapTop: gapCenter - PIPE_GAP / 2,
    scored: false,
  });
}

function startGame() {
  state = "playing";
  birdY = HEIGHT * 0.43;
  birdVelocity = FLAP_STRENGTH;
  pipes = [];
  score = 0;
  trailHistory = [];
  addPipe(WIDTH + 100);
}

function recordTrailPoint(timestamp) {
  if (selectedTrail === "none") {
    trailHistory = [];
    return;
  }

  if (timestamp - lastTrailSample < 35) return;
  lastTrailSample = timestamp;
  trailHistory.unshift({ y: birdY });
  if (trailHistory.length > 16) trailHistory.pop();
}

function flap() {
  if (state === "ready" || state === "over") {
    startGame();
    if (selectedSkin === "camera") cameraFlashUntil = performance.now() + 190;
    return;
  }

  birdVelocity = FLAP_STRENGTH;
  if (selectedSkin === "camera") cameraFlashUntil = performance.now() + 190;
}

function handleKeyDown(event) {
  if (shopDialog.open) return;

  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    if (!event.repeat) flap();
  }
}

function update(delta) {
  if (state !== "playing" || isShopOpen) return;

  birdVelocity += GRAVITY * delta;
  birdY += birdVelocity * delta;
  groundOffset = (groundOffset + PIPE_SPEED * delta) % 48;

  for (const pipe of pipes) {
    pipe.x -= PIPE_SPEED * delta;

    if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.scored = true;
      score += 1;
    }

    const overlapsBird =
      BIRD_X + BIRD_RADIUS > pipe.x &&
      BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
    const missesGap =
      birdY - BIRD_RADIUS < pipe.gapTop ||
      birdY + BIRD_RADIUS > pipe.gapTop + PIPE_GAP;

    if (overlapsBird && missesGap) state = "over";
  }

  pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -8);
  if (pipes.length === 0 || pipes[pipes.length - 1].x < WIDTH - 245) {
    addPipe();
  }

  if (birdY - BIRD_RADIUS < 0 || birdY + BIRD_RADIUS > GROUND_TOP) {
    state = "over";
  }
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#83d9e8");
  sky.addColorStop(1, "#c8f0db");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "#fff5c9";
  context.beginPath();
  context.arc(378, 104, 35, 0, Math.PI * 2);
  context.fill();

  drawCloud(80, 145, 0.85);
  drawCloud(324, 255, 0.65);

  context.fillStyle = "#a9dfbf";
  context.beginPath();
  context.moveTo(0, GROUND_TOP);
  context.quadraticCurveTo(95, 445, 205, GROUND_TOP);
  context.quadraticCurveTo(350, 455, WIDTH, GROUND_TOP);
  context.lineTo(WIDTH, HEIGHT);
  context.lineTo(0, HEIGHT);
  context.closePath();
  context.fill();
}

function drawCloud(x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = "#ffffffc9";
  context.beginPath();
  context.arc(-25, 4, 17, 0, Math.PI * 2);
  context.arc(-5, -5, 23, 0, Math.PI * 2);
  context.arc(19, 3, 18, 0, Math.PI * 2);
  context.arc(0, 9, 23, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPipe(pipe) {
  const bottomY = pipe.gapTop + PIPE_GAP;
  const capHeight = 22;

  drawPipeBody(pipe.x, 0, pipe.gapTop, false);
  drawPipeBody(pipe.x, bottomY, GROUND_TOP - bottomY, true);

  function drawPipeBody(x, y, height, fromTop) {
    const bodyY = fromTop ? y + capHeight : y;
    const bodyHeight = Math.max(0, height - capHeight);
    const gradient = context.createLinearGradient(x, 0, x + PIPE_WIDTH, 0);
    gradient.addColorStop(0, "#42ad61");
    gradient.addColorStop(0.35, "#81d66b");
    gradient.addColorStop(1, "#319b5d");

    context.fillStyle = gradient;
    context.fillRect(x + 6, bodyY, PIPE_WIDTH - 12, bodyHeight);
    context.fillStyle = "#a0e978";
    context.fillRect(x + 13, bodyY, 8, bodyHeight);

    const capY = fromTop ? y : y + height - capHeight;
    context.fillStyle = "#42ad61";
    context.fillRect(x, capY, PIPE_WIDTH, capHeight);
    context.fillStyle = "#a0e978";
    context.fillRect(x + 8, capY + 4, PIPE_WIDTH - 16, 5);
    context.strokeStyle = "#25854f";
    context.lineWidth = 3;
    context.strokeRect(x + 1.5, capY + 1.5, PIPE_WIDTH - 3, capHeight - 3);
  }
}

function drawGround() {
  context.fillStyle = "#e9c779";
  context.fillRect(0, GROUND_TOP, WIDTH, GROUND_HEIGHT);

  context.fillStyle = "#89cf67";
  context.fillRect(0, GROUND_TOP, WIDTH, 13);
  context.fillStyle = "#b4e879";
  context.fillRect(0, GROUND_TOP, WIDTH, 5);

  context.save();
  context.beginPath();
  context.rect(0, GROUND_TOP + 13, WIDTH, GROUND_HEIGHT - 13);
  context.clip();
  context.strokeStyle = "#d3ad61";
  context.lineWidth = 3;
  for (let x = -48 - groundOffset; x < WIDTH + 48; x += 48) {
    context.beginPath();
    context.moveTo(x, GROUND_TOP + 13);
    context.lineTo(x + 25, HEIGHT);
    context.stroke();
  }
  context.restore();
}

function drawBird() {
  const skin = SKINS[selectedSkin];
  const tilt = state === "playing"
    ? Math.max(-0.4, Math.min(0.75, birdVelocity / 750))
    : Math.sin(performance.now() / 210) * 0.08;

  drawTrail(selectedTrail, performance.now() / 180);

  context.save();
  context.translate(BIRD_X, birdY);
  context.rotate(tilt);

  context.fillStyle = skin.wing;
  context.beginPath();
  context.ellipse(-5, 5, 13, 9, -0.2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = skin.body;
  context.beginPath();
  context.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = skin.outline;
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#fffdf4";
  context.beginPath();
  context.arc(8, -6, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#23445a";
  context.beginPath();
  context.arc(10, -6, 2.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = skin.beak;
  context.beginPath();
  context.moveTo(15, 1);
  context.lineTo(27, 5);
  context.lineTo(15, 9);
  context.closePath();
  context.fill();

  drawSkinEffect(selectedSkin, performance.now() / 180);
  context.restore();
}

function drawTrail(trail, time) {
  if (trail === "none") return;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowBlur = 8;

  for (let i = 0; i < trailHistory.length; i += 1) {
    const point = trailHistory[i];
    const x = BIRD_X - 18 - i * 10;
    const y = point.y;
    const size = 3 + (i % 3);

    if (trail === "sparkle") {
      context.fillStyle = ["#ffd34f", "#f28aa3", "#75c9f1", "#8cddb0"][i % 4];
      context.globalAlpha = 0.35 + (1 - i / trailHistory.length) * 0.65;
      context.shadowColor = context.fillStyle;
      context.beginPath();
      context.arc(x, y + Math.sin(time + i) * 4, size, 0, Math.PI * 2);
      context.fill();
    } else if (trail === "fire") {
      context.fillStyle = i % 2 ? "#ffbd38" : "#f45132";
      context.globalAlpha = 0.35 + (1 - i / trailHistory.length) * 0.65;
      context.shadowColor = "#ff542e";
      context.beginPath();
      context.ellipse(x, y + Math.sin(time + i) * 3, size * 0.7, size * 1.5, -0.5, 0, Math.PI * 2);
      context.fill();
    } else if (trail === "bubbles") {
      context.strokeStyle = "#e7fbff";
      context.globalAlpha = 0.4 + (1 - i / trailHistory.length) * 0.6;
      context.shadowColor = "#40cfff";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y - (time % 8), size, 0, Math.PI * 2);
      context.stroke();
    }
  }

  if (trail === "rainbow" && trailHistory.length > 1) {
    const rainbow = ["#f45132", "#ff9f38", "#ffe45c", "#62d66b", "#48aee6", "#b56ce4"];
    for (let band = 0; band < rainbow.length; band += 1) {
      context.strokeStyle = rainbow[band];
      context.globalAlpha = 0.92;
      context.shadowColor = rainbow[band];
      context.lineWidth = 5;
      context.beginPath();
      for (let i = 0; i < trailHistory.length; i += 1) {
        const point = trailHistory[i];
        const x = BIRD_X - 18 - i * 10;
        const y = point.y - 11 + band * 4.5;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }

  if (trail === "red-black-lightning" && trailHistory.length > 1) {
    const flashCycle = Math.sin(time * 12);
    const flashAmount = flashCycle > 0.55 ? 1 : 0.38;
    const boltColors = ["#17171c", "#ff304f"];

    context.save();
    context.globalAlpha = flashAmount;

    for (let bolt = 0; bolt < 2; bolt += 1) {
      context.strokeStyle = boltColors[bolt];
      context.shadowColor = bolt === 1 ? "#ff304f" : "#ff304f";
      context.shadowBlur = 18;
      context.lineWidth = 5;
      context.beginPath();

      for (let i = 0; i < trailHistory.length; i += 1) {
        const point = trailHistory[i];
        const x = BIRD_X - 18 - i * 11;
        const noise = ((i * 17 + bolt * 9) % 19) - 9;
        const y = point.y + noise + (bolt === 0 ? 7 : -7);
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();

      for (let i = 2; i < trailHistory.length - 2; i += 3) {
        const point = trailHistory[i];
        const startX = BIRD_X - 18 - i * 11;
        const startY = point.y + (bolt === 0 ? 7 : -7);
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(startX - 12, startY + (bolt === 0 ? 15 : -15));
        context.lineTo(startX - 7, startY + (bolt === 0 ? 20 : -20));
        context.lineTo(startX - 19, startY + (bolt === 0 ? 34 : -34));
        context.stroke();
      }
    }

    context.restore();
  }

  if (trail === "crazy-christmas" && trailHistory.length > 0) {
    const christmasColors = ["#ff304f", "#fff078", "#62dc78", "#72cfff", "#fff7e8", "#b56ce4"];
    for (let i = 0; i < trailHistory.length; i += 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 9;
      const y = point.y + Math.sin(time * 8 + i * 1.3) * 9;
      const color = christmasColors[(i + Math.floor(time * 7)) % christmasColors.length];
      const size = 5 + (i % 3) * 2;

      context.save();
      context.globalAlpha = 0.55 + (1 - i / trailHistory.length) * 0.45;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 14;
      context.beginPath();

      if (i % 4 === 0) {
        context.moveTo(x, y - size);
        context.lineTo(x + size, y);
        context.lineTo(x, y + size);
        context.lineTo(x - size, y);
      } else if (i % 4 === 1) {
        context.arc(x, y, size * 0.8, 0, Math.PI * 2);
      } else if (i % 4 === 2) {
        context.moveTo(x, y - size);
        context.lineTo(x - size * 0.35, y - size * 0.15);
        context.lineTo(x - size, y);
        context.lineTo(x - size * 0.25, y + size * 0.25);
        context.lineTo(x - size * 0.5, y + size);
        context.lineTo(x + size * 0.5, y + size);
        context.lineTo(x + size * 0.25, y + size * 0.25);
        context.lineTo(x + size, y);
        context.lineTo(x + size * 0.35, y - size * 0.15);
      } else {
        context.moveTo(x, y - size);
        context.lineTo(x + size * 0.9, y - size * 0.1);
        context.lineTo(x + size * 0.35, y + size);
        context.lineTo(x - size * 0.35, y + size);
        context.lineTo(x - size * 0.9, y - size * 0.1);
      }

      context.closePath();
      context.fill();

      if (i % 3 === 0) {
        context.fillStyle = "#fff";
        context.globalAlpha = 0.8;
        context.beginPath();
        context.arc(x - size * 0.35, y - size * 0.45, 1.5, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }

    context.strokeStyle = "#fff";
    context.globalAlpha = 0.65 + Math.sin(time * 15) * 0.35;
    context.shadowColor = "#fff";
    context.shadowBlur = 20;
    context.lineWidth = 3;
    context.beginPath();
    for (let i = 0; i < trailHistory.length; i += 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 9;
      const y = point.y + Math.sin(time * 8 + i * 1.3) * 9;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  if (trail === "crazy-cactus" && trailHistory.length > 0) {
    const cactusColors = ["#62d66b", "#39a94b", "#a3eb55", "#1f6f32", "#d5ff70"];
    for (let i = 0; i < trailHistory.length; i += 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 9;
      const y = point.y + Math.sin(time * 10 + i * 1.5) * 7;
      const size = 7 + (i % 3) * 2;
      const color = cactusColors[(i + Math.floor(time * 9)) % cactusColors.length];

      context.save();
      context.globalAlpha = 0.5 + (1 - i / trailHistory.length) * 0.5;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 16;
      context.beginPath();
      context.fillRect(x - size * 0.45, y - size, size * 0.9, size * 2);
      context.fillRect(x - size * 1.15, y - size * 0.25, size * 0.75, size * 0.8);
      context.fillRect(x - size * 1.15, y - size * 0.75, size * 0.55, size * 0.65);
      context.fillRect(x + size * 0.45, y - size * 0.1, size * 0.75, size * 0.8);
      context.fillRect(x + size * 0.8, y - size * 0.75, size * 0.55, size * 0.75);

      context.fillStyle = i % 2 ? "#d7ff82" : "#1c5428";
      context.fillRect(x - size * 0.25, y - size * 0.75, 2, size * 1.35);
      context.restore();
    }

    context.strokeStyle = Math.floor(time * 10) % 2 ? "#8cff70" : "#39a94b";
    context.globalAlpha = 0.75;
    context.shadowColor = "#62d66b";
    context.shadowBlur = 24;
    context.lineWidth = 6;
    context.beginPath();
    for (let i = 0; i < trailHistory.length; i += 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 9;
      const y = point.y + Math.sin(time * 10 + i * 1.5) * 7;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  if (trail === "binary" && trailHistory.length > 0) {
    const flash = Math.sin(time * 18) > 0.15 ? 1 : 0.68;
    context.save();
    context.font = "900 20px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "#55ff77";
    context.shadowBlur = 18;

    for (let row = -1; row <= 1; row += 1) {
      for (let i = 0; i < trailHistory.length; i += 1) {
        const point = trailHistory[i];
        const x = BIRD_X - 18 - i * 8;
        const y = point.y + row * 16;
        const digit = (i + row + Math.floor(time * 10)) % 2 ? "1" : "0";
        context.globalAlpha = flash * (0.62 + (1 - i / trailHistory.length) * 0.38);
        context.fillStyle = row === 0 ? "#d8ffc5" : "#55ff77";
        context.fillText(digit, x, y);
      }
    }

    context.strokeStyle = "#55ff77";
    context.globalAlpha = 0.9 * flash;
    context.lineWidth = 5;
    context.shadowBlur = 24;
    context.beginPath();
    for (let i = 0; i < trailHistory.length; i += 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 10;
      const y = point.y;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.restore();
  }

  if (trail === "avatar-echo" && trailHistory.length > 0) {
    const skin = SKINS[selectedSkin];
    for (let i = trailHistory.length - 1; i >= 1; i -= 1) {
      const point = trailHistory[i];
      const x = BIRD_X - 18 - i * 11;
      const y = point.y;
      const scale = Math.max(0.18, 1 - i / (trailHistory.length + 3));
      context.save();
      context.translate(x, y);
      context.scale(scale, scale);
      context.globalAlpha = 0.18 + (1 - i / trailHistory.length) * 0.62;

      context.fillStyle = skin.wing;
      context.beginPath();
      context.ellipse(-5, 5, 13, 9, -0.2, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = skin.body;
      context.beginPath();
      context.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = skin.outline;
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = "#fffdf4";
      context.beginPath();
      context.arc(8, -6, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#23445a";
      context.beginPath();
      context.arc(10, -6, 2.5, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = skin.beak;
      context.beginPath();
      context.moveTo(15, 1);
      context.lineTo(27, 5);
      context.lineTo(15, 9);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  context.restore();
}

function drawSkinEffect(skinName, time) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  if (skinName === "laptop") {
    context.fillStyle = "#262a31";
    context.strokeStyle = "#0a0d11";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-19, -15, 38, 30, 3);
    context.fill();
    context.stroke();

    context.fillStyle = "#11151b";
    context.fillRect(-16, -12, 32, 23);
    context.strokeStyle = "#55ff77";
    context.lineWidth = 1;
    context.strokeRect(-16, -12, 32, 23);

    context.fillStyle = "#55ff77";
    context.shadowColor = "#55ff77";
    context.shadowBlur = 8;
    context.font = "900 8px monospace";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText("101", -13, -9);
    context.fillText("010", -13, -1);
    context.fillText("110", -13, 7);

    context.fillStyle = "#707984";
    context.beginPath();
    context.moveTo(-22, 16);
    context.lineTo(22, 16);
    context.lineTo(25, 20);
    context.lineTo(-25, 20);
    context.closePath();
    context.fill();
  } else if (skinName === "camera") {
    context.fillStyle = "#30353c";
    context.strokeStyle = "#111318";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-19, -16, 38, 32, 4);
    context.fill();
    context.stroke();

    context.fillStyle = "#4b535d";
    context.fillRect(-10, -22, 20, 7);
    context.strokeRect(-10, -22, 20, 7);

    context.fillStyle = "#111318";
    context.beginPath();
    context.arc(7, 0, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#70aeca";
    context.beginPath();
    context.arc(7, 0, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#bfeaff";
    context.beginPath();
    context.arc(9, -2, 3.5, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#fff4b0";
    context.beginPath();
    context.arc(-12, -9, 3.5, 0, Math.PI * 2);
    context.fill();

    if (performance.now() < cameraFlashUntil) {
      context.fillStyle = "#fff";
      context.shadowColor = "#fff";
      context.shadowBlur = 24;
      context.beginPath();
      context.arc(-12, -9, 6, 0, Math.PI * 2);
      context.fill();
    }
  } else if (skinName === "minecraft-cactus") {
    const flash = Math.sin(time * 9) > 0 ? 1 : 0.45;
    context.globalAlpha = flash;
    context.shadowColor = "#62ef62";
    context.shadowBlur = 16;

    context.fillStyle = "#55b84a";
    context.fillRect(-13, -17, 26, 34);
    context.fillRect(-24, -8, 13, 15);
    context.fillRect(-22, -15, 9, 9);
    context.fillRect(13, -3, 12, 15);
    context.fillRect(21, -10, 8, 9);

    context.fillStyle = "#79d45a";
    for (let y = -14; y < 16; y += 7) {
      for (let x = -10 + ((y + 14) % 14); x < 12; x += 8) {
        context.fillRect(x, y, 3, 3);
      }
    }

    context.fillStyle = "#1c5428";
    context.fillRect(-11, -15, 4, 32);
    context.fillRect(8, -12, 3, 28);
    context.fillRect(-22, -6, 3, 11);
    context.fillRect(14, -1, 3, 11);

    context.fillStyle = "#dcff76";
    context.fillRect(-7, -8, 3, 3);
    context.fillRect(5, 5, 3, 3);
    context.fillRect(-19, -4, 2, 2);
    context.fillRect(17, 1, 2, 2);
  } else if (skinName === "wild-christmas") {
    context.shadowBlur = 10;

    context.strokeStyle = "#7a4b24";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-13, -14);
    context.quadraticCurveTo(-22, -27, -18, -38);
    context.moveTo(-18, -29);
    context.lineTo(-27, -33);
    context.moveTo(-18, -33);
    context.lineTo(-14, -42);
    context.moveTo(8, -14);
    context.quadraticCurveTo(17, -26, 12, -37);
    context.moveTo(12, -29);
    context.lineTo(21, -33);
    context.moveTo(12, -32);
    context.lineTo(9, -41);
    context.stroke();

    context.fillStyle = "#e52f3d";
    context.beginPath();
    context.moveTo(-11, -13);
    context.quadraticCurveTo(-8, -34, 9, -42);
    context.quadraticCurveTo(18, -30, 12, -12);
    context.closePath();
    context.fill();
    context.strokeStyle = "#9e2431";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#fff7e8";
    context.beginPath();
    context.moveTo(-12, -17);
    context.quadraticCurveTo(-1, -10, 14, -14);
    context.quadraticCurveTo(16, -7, 11, -4);
    context.quadraticCurveTo(-3, -8, -13, -11);
    context.closePath();
    context.fill();
    context.beginPath();
    context.arc(11, -40, 6, 0, Math.PI * 2);
    context.fill();

    const lights = [
      [-20, -5, "#ffdf55"],
      [-17, 10, "#62dc78"],
      [18, 7, "#72cfff"],
      [21, -8, "#ffdf55"],
    ];
    for (let i = 0; i < lights.length; i += 1) {
      const [x, y, color] = lights[i];
      context.globalAlpha = Math.sin(time * 5 + i * 1.7) > 0 ? 1 : 0.45;
      context.fillStyle = color;
      context.shadowColor = color;
      context.beginPath();
      context.arc(x, y, 3.2, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  } else if (skinName === "fire") {
    const flicker = Math.sin(time * 3) * 5;
    context.globalAlpha = 0.95;
    context.shadowColor = "#ff542e";
    context.shadowBlur = 14;
    for (const [x, y, height, color] of [
      [-17, -8, 24 + flicker, "#ffbd38"],
      [-12, 4, 29 - flicker, "#ff612e"],
      [-4, -11, 20 - flicker, "#fff078"],
      [-2, 9, 22 + flicker, "#ff8b27"],
    ]) {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(x, y + 10);
      context.quadraticCurveTo(x - height * 0.65, y - height * 0.2, x - 3, y - height);
      context.quadraticCurveTo(x + height * 0.35, y - height * 0.4, x + 5, y + 10);
      context.closePath();
      context.fill();
    }
  } else if (skinName === "ice") {
    context.shadowColor = "#73ddff";
    context.shadowBlur = 12;
    for (const [x, y, size] of [[-25, -19, 10], [-3, -27, 8], [-25, 19, 8], [19, -20, 7]]) {
      context.save();
      context.translate(x, y);
      context.rotate(time * 0.45);
      context.fillStyle = "#d9fbff";
      context.beginPath();
      context.moveTo(0, -size);
      context.lineTo(size * 0.35, -size * 0.35);
      context.lineTo(size, 0);
      context.lineTo(size * 0.35, size * 0.35);
      context.lineTo(0, size);
      context.lineTo(-size * 0.35, size * 0.35);
      context.lineTo(-size, 0);
      context.lineTo(-size * 0.35, -size * 0.35);
      context.closePath();
      context.fill();
      context.strokeStyle = "#56b9e8";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -size * 0.7);
      context.lineTo(0, size * 0.7);
      context.moveTo(-size * 0.6, -size * 0.35);
      context.lineTo(size * 0.6, size * 0.35);
      context.moveTo(-size * 0.6, size * 0.35);
      context.lineTo(size * 0.6, -size * 0.35);
      context.stroke();
      context.restore();
    }
  } else if (skinName === "lightning") {
    context.shadowColor = "#ffe542";
    context.shadowBlur = 15;
    for (const [x, y, scale] of [[-26, -20, 1], [-22, 16, -0.8], [13, -22, 0.7]]) {
      context.save();
      context.translate(x, y);
      context.scale(scale, Math.abs(scale));
      context.fillStyle = "#fff34f";
      context.strokeStyle = "#e99b1d";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(2, -13);
      context.lineTo(-8, 1);
      context.lineTo(-2, 1);
      context.lineTo(-7, 14);
      context.lineTo(9, -4);
      context.lineTo(3, -4);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    }
  } else if (skinName === "water") {
    const wave = Math.sin(time * 1.5) * 3;
    context.shadowColor = "#40cfff";
    context.shadowBlur = 12;
    context.fillStyle = "#51c9f2";
    context.beginPath();
    context.moveTo(-30, 15 + wave);
    context.quadraticCurveTo(-22, 4 + wave, -14, 15 + wave);
    context.quadraticCurveTo(-5, 25 + wave, 4, 15 + wave);
    context.quadraticCurveTo(14, 5 + wave, 24, 15 + wave);
    context.lineTo(22, 22 + wave);
    context.lineTo(-26, 22 + wave);
    context.closePath();
    context.fill();
    context.strokeStyle = "#d7faff";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-26, 14 + wave);
    context.quadraticCurveTo(-18, 5 + wave, -10, 14 + wave);
    context.quadraticCurveTo(0, 23 + wave, 10, 14 + wave);
    context.quadraticCurveTo(18, 6 + wave, 26, 14 + wave);
    context.stroke();
    context.fillStyle = "#d7faff";
    for (const [x, y, size] of [[-22, -13, 4], [-4, -23, 3], [21, -12, 4]]) {
      const dropY = y + ((time * 5 + x) % 12);
      context.beginPath();
      context.moveTo(x, dropY - size);
      context.quadraticCurveTo(x + size, dropY + size, x, dropY + size * 1.4);
      context.quadraticCurveTo(x - size, dropY + size, x, dropY - size);
      context.fill();
    }
  }

  context.restore();
}

function drawMessage(title, subtitle) {
  context.fillStyle = "#173a53";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 34px Trebuchet MS, sans-serif";
  context.fillText(title, WIDTH / 2, 250);
  context.font = "700 17px Trebuchet MS, sans-serif";
  context.fillText(subtitle, WIDTH / 2, 286);
}

function draw() {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  for (const pipe of pipes) drawPipe(pipe);
  drawGround();
  drawBird();

  if (selectedSkin === "camera" && performance.now() < cameraFlashUntil) {
    const remaining = cameraFlashUntil - performance.now();
    context.save();
    context.globalAlpha = Math.min(0.9, remaining / 190);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, WIDTH, HEIGHT);
    context.restore();
  }

  if (state === "playing") {
    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = "900 48px Trebuchet MS, sans-serif";
    context.lineWidth = 5;
    context.strokeStyle = "#347d74";
    context.fillStyle = "#fffdf4";
    context.strokeText(String(score), WIDTH / 2, 35);
    context.fillText(String(score), WIDTH / 2, 35);
  } else if (state === "ready") {
    drawMessage("Ready?", "Tap or press a key to fly");
  } else {
    drawMessage("Game over!", `Score: ${score}  ·  Tap to try again`);
  }
}

function frame(timestamp) {
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.04);
  lastFrame = timestamp;
  update(delta);
  recordTrailPoint(timestamp);
  draw();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button === 0) flap();
});
function openShop(category = activeCategory) {
  setShopCategory(category);
  isShopOpen = true;
  shopDialog.showModal();
}

function setShopCategory(category) {
  activeCategory = category;
  for (const tab of categoryTabs) {
    tab.setAttribute("aria-pressed", String(tab.dataset.category === category));
  }
  for (const panel of categoryPanels) {
    panel.hidden = panel.dataset.panel !== category;
  }
  document.querySelector("#shop-title").textContent =
    category === "skins"
      ? "Bird skins"
      : category === "trails"
        ? "Bird trails"
        : "Limited items";
}

document.querySelector("#open-shop").addEventListener("click", () => openShop("skins"));
for (const tab of categoryTabs) {
  tab.addEventListener("click", () => setShopCategory(tab.dataset.category));
}
document.querySelector("#close-shop").addEventListener("click", () => {
  shopDialog.close();
});
shopDialog.addEventListener("close", () => {
  isShopOpen = false;
});
for (const option of skinOptions) {
  option.addEventListener("click", () => {
    selectedSkin = option.dataset.skin;
    for (const skinOption of skinOptions) {
      const selected = skinOption === option;
      skinOption.setAttribute("aria-pressed", String(selected));
      const status = skinOption.querySelector(".skin-status");
      if (status) status.textContent = selected ? "Selected" : "Choose";
    }
    draw();
  });
}
for (const option of trailOptions) {
  option.addEventListener("click", () => {
    selectedTrail = option.dataset.trail;
    trailHistory = [];
    for (const trailOption of trailOptions) {
      const selected = trailOption === option;
      trailOption.setAttribute("aria-pressed", String(selected));
      const status = trailOption.querySelector(".skin-status");
      if (status) status.textContent = selected ? "Selected" : "Choose";
    }
    draw();
  });
}
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(frame);