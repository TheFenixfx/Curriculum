// Interactive ASCII-neon word overlay — Gauntlet WIN artifact.
(function(){
  "use strict";

  /* ============================================================
     1) EMBEDDED BLOCK FONT  (A-Z + ' ')  ->  5 rows x 5 cols
     ============================================================ */
  var FONT = {
    'A':["01110","10001","11111","10001","10001"],
    'B':["11110","10001","11110","10001","11110"],
    'C':["01111","10000","10000","10000","01111"],
    'D':["11110","10001","10001","10001","11110"],
    'E':["11111","10000","11110","10000","11111"],
    'F':["11111","10000","11110","10000","10000"],
    'G':["01111","10000","10011","10001","01111"],
    'H':["10001","10001","11111","10001","10001"],
    'I':["11111","00100","00100","00100","11111"],
    'J':["00111","00010","00010","10010","01100"],
    'K':["10001","10010","11100","10010","10001"],
    'L':["10000","10000","10000","10000","11111"],
    'M':["10001","11011","10101","10001","10001"],
    'N':["10001","11001","10101","10011","10001"],
    'O':["01110","10001","10001","10001","01110"],
    'P':["11110","10001","11110","10000","10000"],
    'Q':["01110","10001","10101","10010","01101"],
    'R':["11110","10001","11110","10010","10001"],
    'S':["01111","10000","01110","00001","11110"],
    'T':["11111","00100","00100","00100","00100"],
    'U':["10001","10001","10001","10001","01110"],
    'V':["10001","10001","10001","01010","00100"],
    'W':["10001","10001","10101","11011","10001"],
    'X':["10001","01010","00100","01010","10001"],
    'Y':["10001","01010","00100","00100","00100"],
    'Z':["11111","00010","00100","01000","11111"],
    '@':["01110","10001","10111","10001","01111"],
    '.':["00000","00000","00000","00000","00100"],
    ' ':["00000","00000","00000","00000","00000"]
  };
  var GLYPH_ROWS = 5;

  /* ============================================================
     2) CONFIG
     ============================================================ */
  var BUTTON_WORDS = {
    profile:'knifefx@gmail.com',
    resume:'Developer',
    portfolio:'Computer Science',
    blog:'Blog',
    contact:'Contact'
  };
  var POOL = Object.keys(BUTTON_WORDS).map(function(k){return BUTTON_WORDS[k];});
  var PALETTE = ['#22e1ff','#5b8cff','#a855f7','#9dff3d'];

  // Compact scale: keep the long words readable without dominating the page.
  var FIT_WIDTH_RATIO = 0.72;
  var CELL_DEFAULT = 7;
  var CELL_MIN = 3;
  var CELL_MAX = 12;
  var REVEAL_DUR = 1.6;
  var HOLD_DUR   = 1.8;
  var FADE_DUR   = 1.4;
  var PULSE_SPEED = 2.3;

  // Pulse envelope: dim phase -> tight subdued halo; bright phase -> large bloom.
  var PULSE_MIN = 0.35;   // perceptible dim (not zero)
  var PULSE_MAX = 1.0;    // bright bloom
  var BLOOM_MIN = 4;      // px glow at dim phase
  var BLOOM_MAX = 24;     // px glow at bright phase

  var COLLISION_TOL = 10;      // px tolerance allowed before counting overlap
  var MOUSE_CANDIDATES = 14;   // >= 10 random candidates
  var MOUSE_SPAWN_CHANCE = 0.24;
  var MOUSE_COOLDOWN = 220;
  var MAX_MOUSE_WORDS = 3;
  // Words appear centered, alternating between a TOP band and a BOTTOM band,
  // each kept EDGE_MARGIN_RATIO of the viewport height away from the border.
  var EDGE_MARGIN_RATIO = 0.12;
  var EDGE_MARGIN_MIN = 56;
  var topNext = true;          // toggles each spawn so top/bottom alternate

  /* ============================================================
     3) CANVAS + DPR
     ============================================================ */
  // Standalone deployment bootstrap: create the transparent overlay when the live CV
  // page does not already contain the Gauntlet canvas.
  var deployedCanvas = document.getElementById('ascii-neon');
  if(!deployedCanvas){
    deployedCanvas = document.createElement('canvas');
    deployedCanvas.id = 'ascii-neon';
    deployedCanvas.setAttribute('aria-hidden','true');
    deployedCanvas.style.position = 'fixed';
    deployedCanvas.style.inset = '0';
    deployedCanvas.style.width = '100%';
    deployedCanvas.style.height = '100%';
    deployedCanvas.style.pointerEvents = 'none';
    (document.body || document.documentElement).appendChild(deployedCanvas);
  }
  var canvas = document.getElementById('ascii-neon');
  if(canvas){
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
  }
  var ctx = null;
  var cssW = 0, cssH = 0, dpr = 1;

  function resize(){
    if(!canvas) return;
    dpr = Math.min(window.devicePixelRatio||1, 1.5);
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width  = cssW+'px';
    canvas.style.height = cssH+'px';
    if(ctx){
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    // cell size depends on width; drop stale sprites so they re-bake at the new size.
    activeWords.length = 0;
  }

  /* ============================================================
     4) WORD -> GRID
     ============================================================ */
  function buildGrid(word){
    word = String(word==null?'':word).toUpperCase();
    var rows = ["","","","",""];
    for(var i=0;i<word.length;i++){
      var ch = word.charAt(i);
      var g = FONT[ch] || FONT[' '];
      for(var r=0;r<GLYPH_ROWS;r++){
        rows[r] += g[r] + '0';   // +1 col right-pad
      }
    }
    return rows;
  }

  var LONGEST_COLS = (function(){
    var m = 1;
    for(var i=0;i<POOL.length;i++){
      var c = buildGrid(POOL[i])[0].length;
      if(c>m) m=c;
    }
    return m;
  })();

  function fitCell(availW){
    var w = availW;
    if(typeof w !== 'number' || isNaN(w) || w<=0){
      w = (typeof cssW==='number' && cssW) ? cssW : (window.innerWidth || 900);
    }
    var cell = Math.floor((w * FIT_WIDTH_RATIO) / LONGEST_COLS);
    if(cell < CELL_MIN) cell = CELL_MIN;
    if(cell > CELL_MAX) cell = CELL_MAX;
    return cell;
  }

  /* ============================================================
     5) PULSE PHASE
     Returns a 0..1 value. Uses a global clock so the rAF render
     path and window.__ASCII.drawWord stay in sync.
     ============================================================ */
  function pulsePhase(t){
    return 0.5 + 0.5*Math.sin(t*PULSE_SPEED);
  }

  /* ============================================================
     6) STATE
     ============================================================ */
  var activeWords = [];
  var nextId = 1;
  var __clock = 0;
  var __stepping = false;
  var lastWall = null;
  var fpsSmoothed = 60;
  var hueIdx = 0;

  function nextHue(){
    var h = PALETTE[hueIdx % PALETTE.length];
    hueIdx++;
    return h;
  }
  function randHue(){
    return PALETTE[Math.floor(Math.random()*PALETTE.length)];
  }

  /* ============================================================
     7) RECT HELPERS  (used by collision avoidance)
     ============================================================ */
  function rectFromWord(w){
    return { left:w.x, top:w.y, right:w.x+w.w, bottom:w.y+w.h };
  }
  // Separation between two rects. Positive = gap distance,
  // negative = overlap penetration magnitude.
  function rectGap(a, b){
    var dx = Math.max(a.left - b.right, b.left - a.right);
    var dy = Math.max(a.top - b.bottom, b.top - a.bottom);
    if(dx <= 0 && dy <= 0){
      // truly overlapping -> combined penetration (negative)
      return -((-dx) + (-dy));
    }
    // separated by some gap
    return Math.max(dx, dy);
  }

  /* ============================================================
     8) SPAWN
     x,y are treated as the CENTER of the word; left/top derived
     so the whole fitted word stays on-canvas.
     ============================================================ */
  function spawn(word, x, y, hue){
    if(!word) return null;
    var grid = buildGrid(word);
    var cell = fitCell(cssW);
    var gw = grid[0].length * cell;
    var gh = GLYPH_ROWS * cell;

    var cx = (typeof x === 'number' && !isNaN(x)) ? x : cssW/2;
    var cy = (typeof y === 'number' && !isNaN(y)) ? y : cssH/2;

    var left = cx - gw/2;
    var top  = cy - gh/2;
    left = Math.max(2, Math.min(cssW - gw - 2, left));
    top  = Math.max(2, Math.min(cssH - gh - 2, top));

    var h = hue || nextHue();

    var desc = {
      id: nextId++,
      word: word,
      x: left, y: top,
      w: gw, h: gh,
      cell: cell,
      hue: h,
      grid: grid,
      sprite: bakeSprite(grid, cell, h),
      born: __clock,
      reveal: 0
    };
    activeWords.push(desc);
    startLoop();
    return desc;
  }

  /* ============================================================
     9) DRAW HELPERS
     ============================================================ */
  function roundRect(c,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }

  function easeOutCubic(t){ t = Math.max(0,Math.min(1,t)); return 1-Math.pow(1-t,3); }

  function hexToRgb(hex){
    hex = String(hex).replace('#','');
    if(hex.length===3){ hex = hex.split('').map(function(c){return c+c;}).join(''); }
    var n = parseInt(hex,16);
    return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
  }

  // Pre-render a word ONCE to an offscreen canvas with the neon bloom baked in.
  // The per-frame loop then only does a cheap drawImage (+ alpha/clip) instead of
  // hundreds of expensive shadowBlur fills every frame.
  function bakeSprite(grid, cell, hue){
    var cols = grid[0].length, rows = grid.length;
    var gw = cols*cell, gh = rows*cell;
    var pad = BLOOM_MAX + 6;          // room so the bloom is not clipped at edges
    var off = document.createElement('canvas');
    off.width  = Math.ceil(gw + pad*2);
    off.height = Math.ceil(gh + pad*2);
    var o = off.getContext('2d');
    var rgb = hexToRgb(hue);
    o.shadowColor = hue;
    o.shadowBlur = BLOOM_MAX;
    o.fillStyle = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.95)';
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        if(grid[r].charAt(c)!=='1') continue;
        roundRect(o, pad+c*cell+1, pad+r*cell+1, cell-2, cell-2, Math.max(1.5,cell*0.28));
        o.fill();
      }
    }
    // subtle white hot core (second pass, cheaper blur)
    o.shadowBlur = BLOOM_MAX*0.5;
    o.fillStyle = 'rgba(255,255,255,0.22)';
    for(var r2=0;r2<rows;r2++){
      for(var c2=0;c2<cols;c2++){
        if(grid[r2].charAt(c2)!=='1') continue;
        roundRect(o, pad+c2*cell+2.5, pad+r2*cell+2.5, cell-5, cell-5, Math.max(1,cell*0.2));
        o.fill();
      }
    }
    return { canvas:off, pad:pad };
  }

  /* ============================================================
     10) RENDER FRAME
     One cheap drawImage per active word (sprite has bloom baked in).
     No shadowBlur in the loop -> lightweight even with several words.
     ============================================================ */
  function render(t){
    if(!ctx) return;
    ctx.clearRect(0,0,cssW,cssH);
    if(!activeWords.length) return;            // nothing to draw
    ctx.globalCompositeOperation = 'lighter';
    var pulse = pulsePhase(t);
    var env = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * pulse;

    for(var i=activeWords.length-1;i>=0;i--){
      var w = activeWords[i];
      var age = t - w.born;
      if(age < 0) age = 0;
      var reveal = Math.min(age/REVEAL_DUR, 1);
      var eRev = easeOutCubic(reveal);
      w.reveal = eRev;

      var alphaMul = 1;
      if(age > REVEAL_DUR + HOLD_DUR){
        var f = (age - REVEAL_DUR - HOLD_DUR)/FADE_DUR;
        alphaMul = Math.max(0, 1-f);
      }
      if(alphaMul<=0.001){
        activeWords.splice(i,1);
        continue;
      }
      var sp = w.sprite;
      if(!sp) continue;
      var front = eRev * w.w;                    // revealed width in px
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alphaMul * env));
      if(front < w.w){                           // clip to the reveal sweep
        ctx.beginPath();
        ctx.rect(w.x - sp.pad, w.y - sp.pad, front + sp.pad, w.h + sp.pad*2);
        ctx.clip();
      }
      ctx.drawImage(sp.canvas, w.x - sp.pad, w.y - sp.pad);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
     11) PLACEMENT  (centered, top/bottom bands with border margin)
     Words are horizontally centered and alternate between a top band and
     a bottom band. Each band keeps a margin from the viewport border, and
     only one word is allowed per band at a time so centered words never
     overlap (they share the same x). Returns null if there is no free slot.
     ============================================================ */
  function edgeMargin(){
    return Math.max(EDGE_MARGIN_MIN, Math.round(cssH * EDGE_MARGIN_RATIO));
  }
  function bandCenterY(gh, top){
    var c = top ? (edgeMargin() + gh/2) : (cssH - edgeMargin() - gh/2);
    return Math.max(gh/2 + 4, Math.min(cssH - gh/2 - 4, c));
  }
  function bandBusy(cy){
    for(var i=0;i<activeWords.length;i++){
      var w = activeWords[i];
      if(Math.abs((w.y + w.h/2) - cy) < w.h*0.6) return true;
    }
    return false;
  }
  // Choose a centered {x,y} in a free band, alternating top/bottom. If both
  // bands are busy, evict the oldest word in the alternation target to make room.
  function nextSpawnCenter(gh){
    var topCy = bandCenterY(gh, true);
    var botCy = bandCenterY(gh, false);
    var topBusy = bandBusy(topCy);
    var botBusy = bandBusy(botCy);
    var useTop;
    if(!topBusy && !botBusy){
      useTop = topNext;
    } else if(!topBusy){
      useTop = true;
    } else if(!botBusy){
      useTop = false;
    } else {
      // both busy: clear the oldest word in the target band so we always place
      useTop = topNext;
      var targetCy = useTop ? topCy : botCy;
      for(var i=0;i<activeWords.length;i++){
        var w = activeWords[i];
        if(Math.abs((w.y + w.h/2) - targetCy) < w.h*0.6){ activeWords.splice(i,1); break; }
      }
    }
    topNext = !useTop;
    return { x: cssW/2, y: useTop ? topCy : botCy };
  }

  /* ============================================================
     12) BUTTON WIRING
     Button words are centered and placed in the top/bottom bands.
     ============================================================ */
  function onTabClick(li){
    if(!li) return null;
    var name = li.getAttribute('data-tab-name');
    var word = BUTTON_WORDS[name];
    if(!word) return null;
    var cell = fitCell(cssW);
    var gh = GLYPH_ROWS * cell;
    var pos = nextSpawnCenter(gh);
    var desc = spawn(word, pos.x, pos.y, nextHue());
    return desc ? {id:desc.id, word:desc.word, x:desc.x, y:desc.y, hue:desc.hue,
                   w:desc.w, h:desc.h, born:desc.born} : null;
  }

  function bindButtons(){
    var nodes = document.querySelectorAll('[data-tab-name]');
    for(var i=0;i<nodes.length;i++){
      (function(node){
        node.addEventListener('click', function(){
          onTabClick(node);
        });
      })(nodes[i]);
    }
  }

  /* ============================================================
     13) MOUSE MOVE  (throttled spawn)
     Moving the mouse spawns words; placement is the centered top/bottom
     bands (same as buttons), not the cursor location.
     ============================================================ */
  function bindMouse(){
    var last = 0;
    window.addEventListener('mousemove', function(){
      var now = (typeof performance!=='undefined'?performance.now():Date.now());
      if(now - last < MOUSE_COOLDOWN) return;
      last = now;
      if(activeWords.length >= MAX_MOUSE_WORDS) return;
      if(Math.random() < MOUSE_SPAWN_CHANCE){
        var word = POOL[Math.floor(Math.random()*POOL.length)];
        var gh = GLYPH_ROWS * fitCell(cssW);
        var pos = nextSpawnCenter(gh);
        if(pos) spawn(word, pos.x, pos.y, randHue());
      }
    });
  }

  /* ============================================================
     13) MAIN LOOP
     ============================================================ */
  var running = false;
  function startLoop(){
    if(running || __stepping) return;
    running = true;
    lastWall = null;
    requestAnimationFrame(loop);
  }

  function loop(ts){
    if(__stepping){ running = false; return; }
    var t = ts/1000;
    if(lastWall!=null){
      var dt = t - lastWall;
      if(dt>0 && dt<1){
        __clock += dt;
        fpsSmoothed = fpsSmoothed*0.9 + (1/dt)*0.1;
      }
    }
    lastWall = t;
    render(__clock);
    if(activeWords.length===0){ running = false; return; }   // idle: free the CPU
    requestAnimationFrame(loop);
  }

  function step(t){
    __stepping = true;
    // step never moves the clock backwards; if it would, we just advance it.
    if(t > __clock) __clock = t;
    render(__clock);
    __stepping = false;
  }

  /* ============================================================
     14) PUBLIC INSPECT CONTRACT
     ============================================================ */
  function trigger(tabName){
    var node = document.querySelector('[data-tab-name="'+tabName+'"]');
    if(!node){ return null; }
    // Call the handler exactly once (no double-spawn).
    var res = onTabClick(node);
    return res ? {word:res.word, x:res.x, y:res.y} : null;
  }

  // Same pulse behavior as the render loop: pulse is derived from the
  // global clock, never from `progress`. progress=1 stays fully drawn
  // while the breathing phase keeps cycling.
  function drawWord(word,x,y,progress,hue){
    var grid = buildGrid(word);
    if(!ctx) return grid;
    var cell = fitCell(cssW);
    var gw = grid[0].length * cell;
    var gh = GLYPH_ROWS * cell;
    var cx = (typeof x === 'number' && !isNaN(x)) ? x : cssW/2;
    var cy = (typeof y === 'number' && !isNaN(y)) ? y : cssH/2;
    var left = cx - gw/2;
    var top  = cy - gh/2;
    left = Math.max(2, Math.min(cssW - gw - 2, left));
    top  = Math.max(2, Math.min(cssH - gh - 2, top));

    var h = hue || PALETTE[0];
    var p = (progress==null?1:Math.max(0,Math.min(1,progress)));
    var sp = bakeSprite(grid, cell, h);
    var env = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * pulsePhase(__clock);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, Math.min(1, env));
    var front = easeOutCubic(p) * gw;
    if(front < gw){
      ctx.beginPath();
      ctx.rect(left - sp.pad, top - sp.pad, front + sp.pad, gh + sp.pad*2);
      ctx.clip();
    }
    ctx.drawImage(sp.canvas, left - sp.pad, top - sp.pad);
    ctx.restore();
    return grid;
  }

  function active(){
    var out = [];
    for(var i=0;i<activeWords.length;i++){
      var w = activeWords[i];
      out.push({id:w.id, word:w.word, x:w.x, y:w.y, hue:w.hue, reveal:w.reveal,
                w:w.w, h:w.h, born:w.born});
    }
    return out;
  }

  window.__ASCII = {
    canvasId: 'ascii-neon',
    pool: POOL.slice(),
    buttonWord: function(tabName){ return BUTTON_WORDS[tabName] || null; },
    getGlyphGrid: function(word){ return buildGrid(word).slice(); },
    fitCell: function(availW){ return fitCell(availW); },
    spawn: function(word,x,y,hue){
      var d = spawn(word,x,y,hue);
      return d ? {id:d.id,word:d.word,x:d.x,y:d.y,hue:d.hue} : null;
    },
    drawWord: drawWord,
    active: active,
    trigger: trigger,
    step: step,
    fps: function(){ return fpsSmoothed; },
    PALETTE: PALETTE.slice()
  };

  /* ============================================================
     15) INIT
     ============================================================ */
  function init(){
    try{
      if(!canvas) return;
      ctx = canvas.getContext('2d');
      if(!ctx) return;
      resize();
      window.addEventListener('resize', resize);
      bindButtons();
      bindMouse();
      // The render loop starts on demand (first spawn) and stops when idle.
    }catch(err){
      // fail soft
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
