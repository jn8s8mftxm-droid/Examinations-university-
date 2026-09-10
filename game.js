(() => {
  'use strict';

  // ============ CONFIG ============
  const CONFIG = {
    playerSpeed: 3.2,
    playerRadius: 14,
    playerMaxHp: 100,
    bulletSpeed: 9,
    bulletRadius: 4,
    bulletDamage: 12,
    fireRate: 380, // ms
    enemyBaseSpeed: 1.4,
    enemySpawnRate: 900, // ms initial
    xpOrbRadius: 6,
    magnetRange: 120,
    levelXpBase: 18,
    levelXpGrowth: 1.35,
  };

  // ============ STATE ============
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, CX, CY;

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    time: 0,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpToNext: CONFIG.levelXpBase,
    hp: CONFIG.playerMaxHp,
    maxHp: CONFIG.playerMaxHp,
    player: { x: 0, y: 0, vx: 0, vy: 0 },
    bullets: [],
    enemies: [],
    xpOrbs: [],
    particles: [],
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    lastFire: 0,
    lastSpawn: 0,
    spawnInterval: CONFIG.enemySpawnRate,
    damageMult: 1,
    fireRateMult: 1,
    speedMult: 1,
    bulletCount: 1,
    pierce: 0,
    magnetMult: 1,
    screenShake: 0,
    bestScore: parseInt(localStorage.getItem('neonSurvivorsBest') || '0'),
  };

  // DOM
  const titleScreen = document.getElementById('title-screen');
  const upgradeScreen = document.getElementById('upgrade-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const pauseOverlay = document.getElementById('pause-overlay');
  const hud = document.getElementById('hud');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const menuBtn = document.getElementById('menu-btn');
  const upgradeOptions = document.getElementById('upgrade-options');

  document.getElementById('best-score').textContent = state.bestScore;

  // ============ AUDIO (simple WebAudio beeps) ============
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, duration, type = 'square', volume = 0.08) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function sfxShoot() { playTone(880 + Math.random()*200, 0.05, 'square', 0.04); }
  function sfxHit() { playTone(180, 0.08, 'sawtooth', 0.06); }
  function sfxKill() { playTone(320, 0.12, 'triangle', 0.07); playTone(480, 0.08, 'sine', 0.04); }
  function sfxLevel() { playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 80); setTimeout(() => playTone(784, 0.15), 160); }
  function sfxHurt() { playTone(120, 0.2, 'sawtooth', 0.1); }
  function sfxPickup() { playTone(990, 0.06, 'sine', 0.05); }

  // ============ RESIZE ============
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    CX = W / 2;
    CY = H / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  // ============ INPUT ============
  window.addEventListener('keydown', e => {
    state.keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { state.keys[e.code] = false; });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', () => { state.mouse.down = true; });
  canvas.addEventListener('mouseup', () => { state.mouse.down = false; });

  // Touch support
  let touchId = null;
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (touchId === null) {
      const t = e.changedTouches[0];
      touchId = t.identifier;
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = t.clientX - rect.left;
      state.mouse.y = t.clientY - rect.top;
      state.mouse.down = true;
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        const rect = canvas.getBoundingClientRect();
        state.mouse.x = t.clientX - rect.left;
        state.mouse.y = t.clientY - rect.top;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        touchId = null;
        state.mouse.down = false;
      }
    }
  });

  // ============ UPGRADES ============
  const UPGRADES = [
    { id: 'damage', name: 'POWER CORE', desc: '+25% bullet damage', icon: '⚡', apply: () => { state.damageMult += 0.25; } },
    { id: 'firerate', name: 'RAPID FIRE', desc: '+18% fire rate', icon: '🔫', apply: () => { state.fireRateMult += 0.18; } },
    { id: 'speed', name: 'THRUSTERS', desc: '+15% move speed', icon: '🚀', apply: () => { state.speedMult += 0.15; } },
    { id: 'multishot', name: 'MULTI BARREL', desc: '+1 projectile', icon: '✦', apply: () => { state.bulletCount = Math.min(state.bulletCount + 1, 7); } },
    { id: 'health', name: 'NANO REPAIR', desc: '+30 max HP & heal', icon: '♥', apply: () => { state.maxHp += 30; state.hp = Math.min(state.hp + 40, state.maxHp); } },
    { id: 'pierce', name: 'PIERCING', desc: 'Bullets pierce +1', icon: '➤', apply: () => { state.pierce += 1; } },
    { id: 'magnet', name: 'ATTRACTOR', desc: '+40% XP magnet range', icon: '🧲', apply: () => { state.magnetMult += 0.4; } },
    { id: 'heal', name: 'EMERGENCY', desc: 'Restore 50 HP', icon: '💊', apply: () => { state.hp = Math.min(state.hp + 50, state.maxHp); } },
  ];

  function showUpgrades() {
    state.paused = true;
    upgradeOptions.innerHTML = '';
    // Pick 3 random unique
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach(up => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div class="icon">${up.icon}</div><div class="name">${up.name}</div><div class="desc">${up.desc}</div>`;
      card.onclick = () => {
        up.apply();
        sfxLevel();
        upgradeScreen.classList.add('hidden');
        state.paused = false;
      };
      upgradeOptions.appendChild(card);
    });
    upgradeScreen.classList.remove('hidden');
  }

  // ============ ENTITIES ============
  function spawnEnemy() {
    // Spawn outside screen
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 40;
    if (side === 0) { x = Math.random() * W; y = -margin; }
    else if (side === 1) { x = W + margin; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + margin; }
    else { x = -margin; y = Math.random() * H; }

    // Difficulty scales with time
    const t = state.time / 1000;
    const tier = Math.min(Math.floor(t / 25), 5);
    const types = [
      { r: 11, hp: 18, speed: 1.3, color: '#ff3366', score: 10 }, // basic
      { r: 14, hp: 35, speed: 1.1, color: '#ff9900', score: 20 }, // tank
      { r: 9,  hp: 12, speed: 2.1, color: '#ff00ff', score: 15 }, // fast
      { r: 16, hp: 55, speed: 0.9, color: '#aa00ff', score: 35 }, // elite
      { r: 20, hp: 90, speed: 0.75, color: '#ff0055', score: 60 }, // boss-ish
    ];
    const type = types[Math.min(tier + (Math.random() < 0.3 ? 1 : 0), types.length - 1)];
    const hpScale = 1 + t * 0.04;
    const spdScale = 1 + t * 0.012;

    state.enemies.push({
      x, y,
      r: type.r,
      hp: type.hp * hpScale,
      maxHp: type.hp * hpScale,
      speed: type.speed * spdScale * (0.9 + Math.random() * 0.2),
      color: type.color,
      score: type.score,
      hitFlash: 0,
    });
  }

  function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.6,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  // ============ GAME LOOP ============
  let lastTime = 0;
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 16.666, 2.5); // normalize ~60fps
    lastTime = timestamp;

    if (state.running && !state.paused && !state.gameOver) {
      update(dt, timestamp);
    }
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt, timestamp) {
    state.time += 16.666 * dt; // approx ms

    // Player movement
    let mx = 0, my = 0;
    if (state.keys['KeyW'] || state.keys['ArrowUp']) my -= 1;
    if (state.keys['KeyS'] || state.keys['ArrowDown']) my += 1;
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) mx -= 1;
    if (state.keys['KeyD'] || state.keys['ArrowRight']) mx += 1;

    // Mouse / touch drag move (relative)
    if (state.mouse.down) {
      const dx = state.mouse.x - state.player.x;
      const dy = state.mouse.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        mx += dx / dist;
        my += dy / dist;
      }
    }

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
    }

    const speed = CONFIG.playerSpeed * state.speedMult * dt;
    state.player.x += mx * speed;
    state.player.y += my * speed;

    // Clamp to screen
    state.player.x = Math.max(CONFIG.playerRadius, Math.min(W - CONFIG.playerRadius, state.player.x));
    state.player.y = Math.max(CONFIG.playerRadius, Math.min(H - CONFIG.playerRadius, state.player.y));

    // Auto fire
    const fireInterval = CONFIG.fireRate / state.fireRateMult;
    if (timestamp - state.lastFire > fireInterval) {
      fireBullets();
      state.lastFire = timestamp;
    }

    // Spawn enemies
    if (timestamp - state.lastSpawn > state.spawnInterval) {
      spawnEnemy();
      // Occasionally spawn extra
      if (Math.random() < 0.3 + state.time / 120000) spawnEnemy();
      state.lastSpawn = timestamp;
      // Tighten spawn rate
      state.spawnInterval = Math.max(280, CONFIG.enemySpawnRate - state.time / 40);
    }

    // Update bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
        state.bullets.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < b.r + e.r && !b.hitEnemies.has(e)) {
          e.hp -= b.damage;
          e.hitFlash = 1;
          b.hitEnemies.add(e);
          sfxHit();
          createParticles(b.x, b.y, '#00f5ff', 4);

          if (e.hp <= 0) {
            // Kill
            state.kills++;
            state.score += e.score;
            sfxKill();
            createParticles(e.x, e.y, e.color, 12);
            // Spawn XP
            const xpVal = Math.floor(4 + Math.random() * 5 + state.level * 0.4);
            state.xpOrbs.push({ x: e.x, y: e.y, value: xpVal, vx: (Math.random()-0.5)*1.5, vy: (Math.random()-0.5)*1.5 });
            state.enemies.splice(j, 1);
            state.screenShake = Math.min(state.screenShake + 3, 12);
          }

          if (b.pierce <= 0) {
            state.bullets.splice(i, 1);
            break;
          } else {
            b.pierce--;
          }
        }
      }
    }

    // Update enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const dx = state.player.x - e.x;
      const dy = state.player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.x += (dx / dist) * e.speed * dt;
      e.y += (dy / dist) * e.speed * dt;
      if (e.hitFlash > 0) e.hitFlash -= 0.08 * dt;

      // Collision with player
      if (dist < e.r + CONFIG.playerRadius) {
        state.hp -= 0.35 * dt * (1 + state.time / 90000);
        e.x -= (dx / dist) * 4; // push back a bit
        e.y -= (dy / dist) * 4;
        if (Math.random() < 0.08) sfxHurt();
        state.screenShake = Math.min(state.screenShake + 1.5, 10);
        if (state.hp <= 0) {
          state.hp = 0;
          endGame();
        }
      }
    }

    // XP orbs
    const magnetR = CONFIG.magnetRange * state.magnetMult;
    for (let i = state.xpOrbs.length - 1; i >= 0; i--) {
      const o = state.xpOrbs[i];
      const dx = state.player.x - o.x;
      const dy = state.player.y - o.y;
      const dist = Math.hypot(dx, dy);
      if (dist < magnetR) {
        const pull = (1 - dist / magnetR) * 6 * dt;
        o.vx += (dx / dist) * pull;
        o.vy += (dy / dist) * pull;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vx *= 0.96;
      o.vy *= 0.96;

      if (dist < CONFIG.playerRadius + CONFIG.xpOrbRadius + 4) {
        state.xp += o.value;
        state.score += o.value;
        sfxPickup();
        state.xpOrbs.splice(i, 1);
        // Level up check
        while (state.xp >= state.xpToNext) {
          state.xp -= state.xpToNext;
          state.level++;
          state.xpToNext = Math.floor(CONFIG.levelXpBase * Math.pow(CONFIG.levelXpGrowth, state.level - 1));
          showUpgrades();
        }
      }
    }

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= 0.016 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    if (state.screenShake > 0) state.screenShake *= 0.88;

    // Score time bonus
    state.score += 0.05 * dt;

    updateHUD();
  }

  function fireBullets() {
    // Find nearest enemy for targeting, else random direction
    let target = null;
    let minDist = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
      if (d < minDist) { minDist = d; target = e; }
    }

    let baseAngle;
    if (target) {
      baseAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
    } else {
      // Face movement or last mouse
      baseAngle = Math.atan2(state.mouse.y - state.player.y, state.mouse.x - state.player.x) || 0;
    }

    const count = state.bulletCount;
    const spread = count > 1 ? 0.22 * (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (count > 1 ? (spread / (count - 1)) * i : 0);
      state.bullets.push({
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle) * CONFIG.bulletSpeed,
        vy: Math.sin(angle) * CONFIG.bulletSpeed,
        r: CONFIG.bulletRadius,
        damage: CONFIG.bulletDamage * state.damageMult,
        life: 90,
        pierce: state.pierce,
        hitEnemies: new Set(),
      });
    }
    sfxShoot();
  }

  function updateHUD() {
    const hpPct = (state.hp / state.maxHp) * 100;
    document.getElementById('hp-bar').style.width = hpPct + '%';
    document.getElementById('hp-text').textContent = Math.ceil(state.hp);
    document.getElementById('level').textContent = state.level;
    document.getElementById('score').textContent = Math.floor(state.score);
    const xpPct = (state.xp / state.xpToNext) * 100;
    document.getElementById('xp-bar').style.width = xpPct + '%';
    const secs = Math.floor(state.time / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    document.getElementById('time').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ============ DRAW ============
  function draw() {
    ctx.save();
    // Screen shake
    if (state.screenShake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * state.screenShake,
        (Math.random() - 0.5) * state.screenShake
      );
    }

    // Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0, 100, 150, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const offsetX = (state.player.x * 0.05) % gridSize;
    const offsetY = (state.player.y * 0.05) % gridSize;
    for (let x = -offsetX; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = -offsetY; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Stars / particles bg
    ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97 + state.time * 0.01) % W);
      const sy = ((i * 53) % H);
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!state.running) {
      ctx.restore();
      return;
    }

    // XP orbs
    for (const o of state.xpOrbs) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, CONFIG.xpOrbRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffaa';
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Bullets
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Enemies
    for (const e of state.enemies) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      const alpha = e.hitFlash > 0 ? 0.5 + e.hitFlash * 0.5 : 1;
      ctx.fillStyle = e.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // HP ring for stronger ones
      if (e.maxHp > 40) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2 * (e.hp / e.maxHp));
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Player
    const p = state.player;
    // Glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.playerRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 245, 255, 0.15)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Particles
    for (const pt of state.particles) {
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ============ FLOW ============
  function startGame() {
    // Reset state
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.level = 1;
    state.xp = 0;
    state.xpToNext = CONFIG.levelXpBase;
    state.hp = CONFIG.playerMaxHp;
    state.maxHp = CONFIG.playerMaxHp;
    state.player.x = CX;
    state.player.y = CY;
    state.bullets = [];
    state.enemies = [];
    state.xpOrbs = [];
    state.particles = [];
    state.lastFire = 0;
    state.lastSpawn = 0;
    state.spawnInterval = CONFIG.enemySpawnRate;
    state.damageMult = 1;
    state.fireRateMult = 1;
    state.speedMult = 1;
    state.bulletCount = 1;
    state.pierce = 0;
    state.magnetMult = 1;
    state.screenShake = 0;

    titleScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    upgradeScreen.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    hud.classList.remove('hidden');

    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function endGame() {
    state.gameOver = true;
    state.running = false;
    hud.classList.add('hidden');

    const finalScore = Math.floor(state.score);
    document.getElementById('final-time').textContent = Math.floor(state.time / 1000);
    document.getElementById('final-kills').textContent = state.kills;
    document.getElementById('final-score').textContent = finalScore;

    const newBest = document.getElementById('new-best');
    if (finalScore > state.bestScore) {
      state.bestScore = finalScore;
      localStorage.setItem('neonSurvivorsBest', finalScore);
      document.getElementById('best-score').textContent = finalScore;
      newBest.classList.remove('hidden');
    } else {
      newBest.classList.add('hidden');
    }

    gameoverScreen.classList.remove('hidden');
    sfxHurt();
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    state.paused = !state.paused;
    if (state.paused) {
      pauseOverlay.classList.remove('hidden');
    } else {
      pauseOverlay.classList.add('hidden');
    }
  }

  function showMenu() {
    state.running = false;
    state.gameOver = false;
    gameoverScreen.classList.add('hidden');
    hud.classList.add('hidden');
    titleScreen.classList.remove('hidden');
  }

  // Buttons
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  menuBtn.addEventListener('click', showMenu);

  // Start loop
  requestAnimationFrame(loop);

  // Prevent scroll on mobile
  document.body.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
})();
