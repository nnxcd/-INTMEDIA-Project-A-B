// ─────────────────────────────────────────────
//  CHOOSE YOUR PATH  —  sketch.js
//  start → branch → merging → ring
// credits to https://openprocessing.org/@u583556/2860176 for particle flower inspiration.
// ─────────────────────────────────────────────

const BG      = [0, 0, 0];
const C_WHITE = [255, 255, 255];
const C_PINK  = [230, 100, 140];
const NODE_R  = 10;
const HALO_R  = 24;
const CONN_D  = 110;

// ── STATE ────────────────────────────────────
let appState = 'start';
let chosen   = '';
let draggedNode = null;

// ── INTERACTIVE NODES ────────────────────────
let iNodes = [];
let iEdges = [];

// ── RING PARTICLES ───────────────────────────
let ring = [];

// ── TIMERS ───────────────────────────────────
let mergeT  = 0;
let branchT = 0;
let inBranch = false;
let showWant = false;
let wantT = 0;
let showCareers = false;
let careersT = 0;

// ─────────────────────────────────────────────
class PhysicsNode {
  constructor(id, x, y, label, pink = false, isParent = false, rings = [], size = 1) {
    this.id       = id;
    this.x        = x;
    this.y        = y;
    this.label    = label;
    this.pink     = pink;
    this.rings    = rings;  // Array of [color, radius] for concentric rings
    this.size     = size;   // Size multiplier
    this.vx       = 0;
    this.vy       = 0;
    this.fx       = 0;
    this.fy       = 0;
    this.mass     = isParent ? 3 : 1;  // Parent node is heavier
    this.alpha    = 255;
    this.isDragged = false;
    this.isParent = isParent;
  }

  applyForce(fx, fy) {
    this.fx += fx;
    this.fy += fy;
  }

  update() {
    if (this.isDragged) return;

    let ax = this.fx / this.mass;
    let ay = this.fy / this.mass;

    this.vx = (this.vx + ax) * 0.92;
    this.vy = (this.vy + ay) * 0.92;

    // Parent node stays more centered
    if (this.isParent) {
      this.vx *= 0.85;
      this.vy *= 0.85;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.fx = 0;
    this.fy = 0;
  }

  draw(alpha = 1) {
    let col    = this.pink ? C_PINK : C_WHITE;
    let a      = this.alpha * alpha;
    let isHov  = dist(mouseX, mouseY, this.x, this.y) < HALO_R * this.size;

    // Draw concentric rings if they exist
    if (this.rings.length > 0) {
      for (let i = this.rings.length - 1; i >= 0; i--) {
        let ringColor = this.rings[i][0];
        let ringRadius = this.rings[i][1];
        noStroke();
        fill(ringColor[0], ringColor[1], ringColor[2], 40 * alpha);
        ellipse(this.x, this.y, ringRadius * 2);
      }
    }

    if (isHov && !this.isDragged) {
      noStroke();
      fill(col[0], col[1], col[2], 30);
      ellipse(this.x, this.y, HALO_R * 2.5 * this.size);
    }

    noStroke();
    fill(col[0], col[1], col[2], a);
    ellipse(this.x, this.y, NODE_R * 2 * this.size);

    if (this.label) {
      fill(col[0], col[1], col[2], a * 0.9);
      textAlign(CENTER, TOP);
      textSize(isHov ? 16 : 14);
      textFont('sans-serif');
      noStroke();
      text(this.label, this.x, this.y + NODE_R * this.size + 10);
    }
  }
}

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
    if (n.isDragged !== undefined && dist(mouseX, mouseY, n.x, n.y) < HALO_R) return n;
  }
  return null;
}

function applyPhysics() {
  let centerX = cx();
  let centerY = cy();
  let repulsionStrength = 0.3;
  let attractionStrength = 0.008;
  let springStrength = 0.15;  // Spring force between connected nodes

  for (let i = 0; i < iNodes.length; i++) {
    let n = iNodes[i];
    
    // Skip 'enter' node - keep it fixed at top
    if (n.id === 'enter') continue;
    
    // Center attraction (slight gravity) - only for children
    if (!n.isParent) {
      let dx = centerX - n.x;
      let dy = centerY - n.y;
      let d = sqrt(dx*dx + dy*dy);
      if (d > 0) {
        n.applyForce((dx/d) * attractionStrength, (dy/d) * attractionStrength);
      }
    }

    // Spring forces along edges (connect nodes)
    for (let edge of iEdges) {
      let a = iNodes[edge[0]];
      let b = iNodes[edge[1]];
      if (a && b) {
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = sqrt(dx*dx + dy*dy) + 0.1;
        let targetDist = 120;
        let springForce = springStrength * (d - targetDist) / d;
        a.applyForce((dx/d) * springForce, (dy/d) * springForce);
        b.applyForce(-(dx/d) * springForce, -(dy/d) * springForce);
      }
    }

    // Repulsion from other nodes
    for (let j = i + 1; j < iNodes.length; j++) {
      let other = iNodes[j];
      let dx = n.x - other.x;
      let dy = n.y - other.y;
      let d = sqrt(dx*dx + dy*dy) + 0.1;
      let minDist = 150;

      if (d < minDist) {
        let force = repulsionStrength * (minDist - d) / d;
        n.applyForce((dx/d) * force, (dy/d) * force);
        other.applyForce(-(dx/d) * force, -(dy/d) * force);
      }
    }
  }

  // Update all nodes
  for (let n of iNodes) {
    n.update();
  }
}

// ─────────────────────────────────────────────
//  LAYOUTS
// ─────────────────────────────────────────────
function layoutStart() {
  let gap = width * 0.22;
  let oy  = cy();
  let parentX = cx() + gap;
  let parentY = oy + height * 0.33;
  let careerRadius = width * 0.15;
  let careerY = parentY + height * 0.18;
  
  iNodes = [
    new PhysicsNode('enter',  cx(),       oy,                           'Enter a new chapter',    false, true, [], 2),
    new PhysicsNode('want',   cx()+gap,   oy + height*0.18,             'Do what you want to do', false, false, []),
    new PhysicsNode('careers', parentX,   parentY,                      '',                       false, true, []),
    new PhysicsNode('gardener', parentX - careerRadius, careerY,        'be a gardener',         false, false, [[[100, 180, 100], 28], [[50, 150, 50], 38]]),
    new PhysicsNode('biologist', parentX - careerRadius*0.5, careerY + height*0.08, 'be a marine biologist', false, false, [[[100, 160, 200], 28], [[50, 120, 180], 38]]),
    new PhysicsNode('chef', parentX + careerRadius, careerY,            'be a chef',             false, false, [[[220, 130, 80], 28], [[200, 80, 50], 38]]),
    new PhysicsNode('artist', parentX - careerRadius*0.3, careerY + height*0.15, 'be an artist',     false, false, [[[180, 100, 180], 28], [[150, 50, 150], 38]]),
    new PhysicsNode('actor', parentX + careerRadius*0.3, careerY + height*0.15, 'be an actor',       false, false, [[[230, 180, 60], 28], [[200, 150, 30], 38]]),
  ];
  // Start with only enter node visible
  iNodes[1].alpha = 0; // want node hidden
  for (let i = 2; i < iNodes.length; i++) {
    iNodes[i].alpha = 0; // careers and career nodes hidden
  }
  iEdges = [[0,1],[1,2],[2,3],[2,4],[2,5],[2,6],[2,7]];
}

function layoutBranch() {
  let gap = width * 0.22;
  let oy  = cy();
  iNodes = [
    { id:'start', x:cx(),       y:oy - height*0.08, label:'Enter a new chapter',                       pink:false, alpha:255 },
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
    let a = iNodes[i];
    let b = iNodes[j];
    let ea = 80 * alpha;  // Much more visible opacity
    stroke(100, 150, 180, ea);  // Obsidian-like cyan/blue color
    strokeWeight(1.2);
    line(a.x, a.y, b.x, b.y);
  });
}

function drawINodes(alpha) {
  for (let n of iNodes) {
    n.draw(alpha);
  }
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

  // ── START: Graph view with physics ──
  if (appState === 'start') {
    // Animate want node fade-in
    if (showWant) {
      wantT += 0.04;
      if (wantT >= 1) wantT = 1;
      let ease = wantT < 0.5 ? 2*wantT*wantT : -1+(4-2*wantT)*wantT;
      iNodes[1].alpha = ease * 255; // want node
      iNodes[2].alpha = ease * 255; // careers node
    }
    
    // Animate career nodes fade-in
    if (showCareers) {
      careersT += 0.04;
      if (careersT >= 1) careersT = 1;
      let ease = careersT < 0.5 ? 2*careersT*careersT : -1+(4-2*careersT)*careersT;
      for (let i = 3; i < iNodes.length; i++) {
        iNodes[i].alpha = ease * 255;
      }
    }
    
    applyPhysics();
    drawIEdges(1);
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
      let careerLabels = {
        'gardener': 'be a gardener',
        'biologist': 'be a marine biologist',
        'chef': 'be a chef',
        'artist': 'be an artist',
        'actor': 'be an actor'
      };
      let lbl = careerLabels[chosen] || 'Do what you want to do';
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
  // In start state: dragging or clicking
  if (appState === 'start') {
    let n = hoveredNode();
    if (n) {
      // Check if enter node clicked
      if (n.id === 'enter' && !showWant) {
        showWant = true;
        wantT = 0;
        return;
      }
      // Check if want node clicked
      if (n.id === 'want' && !showCareers) {
        showCareers = true;
        careersT = 0;
        return;
      }
      // Check if careers node clicked
      if (n.id === 'careers' && !showCareers) {
        showCareers = true;
        careersT = 0;
        return;
      }
      draggedNode = n;
      n.isDragged = true;
    }
    return;
  }

  // In other states: original behavior
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

function mouseDragged() {
  if (draggedNode) {
    draggedNode.x = mouseX;
    draggedNode.y = mouseY;
  }
}

function mouseReleased() {
  if (draggedNode) {
    draggedNode.isDragged = false;
    // Check if we clicked on a node (short drag) to trigger interaction
    let n = hoveredNode();
    if (n && n === draggedNode && dist(pmouseX, pmouseY, mouseX, mouseY) < 10) {
      if ((n.id === 'gardener' || n.id === 'biologist' || n.id === 'chef' || n.id === 'artist' || n.id === 'actor') && appState === 'start') {
        chosen = n.id;
        triggerMerge();
      }
    }
    draggedNode = null;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (appState === 'start')  layoutStart();
  if (appState === 'branch') layoutBranch();
}