// ─────────────────────────────────────────────
//  CHOOSE YOUR PATH  —  sketch.js
//  start → branch → merging → ring
// ─────────────────────────────────────────────

const BG      = [26, 46, 26];
const C_WHITE = [255, 255, 255];
const C_PINK  = [230, 100, 140];
const NODE_R  = 10;
const HALO_R  = 24;
const CONN_D  = 110;

// ── STATE ────────────────────────────────────
let appState = 'start';
let chosen   = '';

// ── INTERACTIVE NODES ────────────────────────
let iNodes = [];
let iEdges = [];

// ── RING PARTICLES ───────────────────────────
let ring = [];

// ── TIMERS ───────────────────────────────────
let mergeT  = 0;
let branchT = 0;
let inBranch = false;

// ─────────────────────────────────────────────
class RingParticle {
  constructor(bx, by, angle, rr) {
    this.bx   = bx;
    this.by   = by;
    this.tx   = cx() + cos(angle) * rr;
    this.ty   = cy() + sin(angle) * rr;
    this.x    = bx;
    this.y    = by;
    this.vx   = 0;
    this.vy   = 0;
    this.no   = random(1000);
    this.pink = random() < 0.18;
    this.delay = random(0, 0.3);
  }

  update(t) {
    let tt   = constrain(map(t, this.delay, 1.0, 0, 1), 0, 1);
    let ease = tt < 0.5 ? 2*tt*tt : -1+(4-2*tt)*tt;
    let goalX = lerp(this.bx, this.tx, ease);
    let goalY = lerp(this.by, this.ty, ease);

    if (tt > 0.85) {
      let n  = noise(this.no, frameCount * 0.003);
      let a  = n * TWO_PI * 2;
      this.vx += cos(a) * 0.04;
      this.vy += sin(a) * 0.04;
      this.vx += (goalX - this.x) * 0.025;
      this.vy += (goalY - this.y) * 0.025;
      this.vx *= 0.88;
      this.vy *= 0.88;
      this.x  += this.vx;
      this.y  += this.vy;
      this.no += 0.004;
    } else {
      this.x = lerp(this.x, goalX, 0.12);
      this.y = lerp(this.y, goalY, 0.12);
    }
  }

  draw(alpha) {
    let c = this.pink ? C_PINK : C_WHITE;
    noStroke();
    fill(c[0], c[1], c[2], alpha);
    ellipse(this.x, this.y, 5);
  }
}

// ─────────────────────────────────────────────
function cx() { return width  * 0.5; }
function cy() { return height * 0.44; }

function hoveredNode() {
  for (let n of iNodes) {
    if (dist(mouseX, mouseY, n.x, n.y) < HALO_R) return n;
  }
  return null;
}

// ─────────────────────────────────────────────
//  LAYOUTS
// ─────────────────────────────────────────────
function layoutStart() {
  iNodes = [{ id:'start', x:cx(), y:cy(), label:'Start', pink:false, alpha:0 }];
  iEdges = [];
}

function layoutBranch() {
  let gap = width * 0.22;
  let oy  = cy();
  iNodes = [
    { id:'start', x:cx(),       y:oy - height*0.08, label:'',                       pink:false, alpha:255 },
    { id:'must',  x:cx()-gap,   y:oy + height*0.12, label:'Do what you must do',    pink:false, alpha:0   },
    { id:'want',  x:cx()+gap,   y:oy + height*0.12, label:'Do what you want to do', pink:true,  alpha:0   },
  ];
  iEdges = [[0,1],[0,2]];
}

// ─────────────────────────────────────────────
//  BUILD RING from current dot positions
// ─────────────────────────────────────────────
function buildRing() {
  ring = [];
  let inner = min(width, height) * 0.13;
  let outer = min(width, height) * 0.28;
  let srcs  = iNodes.map(n => ({ x:n.x, y:n.y }));

  for (let i = 0; i < 110; i++) {
    let angle = random(TWO_PI);
    let rr    = sqrt(random(inner*inner, outer*outer));
    let src   = srcs[i % srcs.length];
    let bx    = src.x + random(-8, 8);
    let by    = src.y + random(-8, 8);
    ring.push(new RingParticle(bx, by, angle, rr));
  }
}

function drawRingConnections(alpha) {
  for (let i = 0; i < ring.length; i++) {
    for (let j = i+1; j < ring.length; j++) {
      let d = dist(ring[i].x, ring[i].y, ring[j].x, ring[j].y);
      if (d < CONN_D) {
        let a = map(d, 0, CONN_D, 55, 0) * alpha;
        stroke(255, 255, 255, a);
        strokeWeight(0.6);
        line(ring[i].x, ring[i].y, ring[j].x, ring[j].y);
      }
    }
  }
}

// ─────────────────────────────────────────────
//  TRIGGERS
// ─────────────────────────────────────────────
function triggerBranch() {
  let ox = iNodes[0].x, oy = iNodes[0].y;
  layoutBranch();
  iNodes[0].x = ox; iNodes[0].y = oy;
  inBranch = true; branchT = 0;
  appState = 'branch';
}

function triggerMerge() {
  buildRing();
  mergeT   = 0;
  appState = 'merging';
}

// ─────────────────────────────────────────────
//  DRAW HELPERS
// ─────────────────────────────────────────────
function drawIEdges(alpha) {
  iEdges.forEach(([i,j]) => {
    let a  = iNodes[i];
    let b  = iNodes[j];
    let ea = min(a.alpha, b.alpha) * 0.4 * alpha;
    stroke(255, 255, 255, ea);
    strokeWeight(0.8);
    line(a.x, a.y, b.x, b.y);
  });
}

function drawINodes(alpha) {
  let hov = hoveredNode();
  iNodes.forEach(n => {
    let isHov = hov && hov.id === n.id;
    let col   = n.pink ? C_PINK : C_WHITE;
    let a     = n.alpha * alpha;

    if (isHov) {
      noStroke();
      fill(col[0], col[1], col[2], 30);
      ellipse(n.x, n.y, HALO_R * 2.5);
    }
    noStroke();
    fill(col[0], col[1], col[2], a);
    ellipse(n.x, n.y, NODE_R * 2);

    if (n.label) {
      fill(col[0], col[1], col[2], a * 0.9);
      textAlign(CENTER, TOP);
      textSize(isHov ? 16 : 14);
      textFont('sans-serif');
      noStroke();
      text(n.label, n.x, n.y + NODE_R + 10);
    }
  });
}

// ─────────────────────────────────────────────
//  SETUP / DRAW
// ─────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  layoutStart();
}

function draw() {
  background(BG[0], BG[1], BG[2]);

  // fade in start dot
  if (appState === 'start') {
    iNodes[0].alpha = lerp(iNodes[0].alpha, 255, 0.04);
    drawINodes(1);
    cursor(hoveredNode() ? HAND : ARROW);
    return;
  }

  // branch animation
  if (inBranch) {
    branchT += 0.02;
    if (branchT >= 1) { branchT = 1; inBranch = false; }
    let ease = branchT < 0.5 ? 2*branchT*branchT : -1+(4-2*branchT)*branchT;
    // slide start dot up to its target y
    iNodes[0].y = lerp(iNodes[0].y, cy() - height * 0.08, 0.07);
    iNodes[1].alpha = ease * 255;
    iNodes[2].alpha = ease * 255;
  }

  // normal branch display
  if (appState === 'branch') {
    drawIEdges(1);
    drawINodes(1);
    cursor(hoveredNode() ? HAND : ARROW);
    return;
  }

  // ── MERGE ──
  if (appState === 'merging' || appState === 'ring') {
    mergeT += 0.008;
    if (mergeT >= 1) { mergeT = 1; appState = 'ring'; }

    // dots fade out in first third
    let dotAlpha = constrain(map(mergeT, 0, 0.35, 1, 0), 0, 1);
    if (dotAlpha > 0.01) {
      drawIEdges(dotAlpha);
      drawINodes(dotAlpha);
    }

    // ring fades in from 0.25 onward
    let ringAlpha = constrain(map(mergeT, 0.25, 0.9, 0, 1), 0, 1);
    ring.forEach(p => p.update(mergeT));
    drawRingConnections(ringAlpha);
    ring.forEach(p => p.draw(255 * ringAlpha));

    // label fades in near end
    if (mergeT > 0.75) {
      let la  = map(mergeT, 0.75, 1.0, 0, 200);
      let lbl = chosen === 'must' ? 'Do what you must do' : 'Do what you want to do';
      noStroke();
      fill(255, 255, 255, la);
      textAlign(CENTER, TOP);
      textSize(15);
      textFont('sans-serif');
      text(lbl, cx(), cy() + min(width, height) * 0.31);
    }
  }
}

// ─────────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────────
function mousePressed() {
  if (inBranch || appState === 'merging' || appState === 'ring') return;
  let n = hoveredNode();
  if (!n) return;
  if (n.id === 'start' && appState === 'start') {
    triggerBranch();
  } else if ((n.id === 'must' || n.id === 'want') && appState === 'branch') {
    chosen = n.id;
    triggerMerge();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (appState === 'start')  layoutStart();
  if (appState === 'branch') layoutBranch();
}