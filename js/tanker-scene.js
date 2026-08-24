/* ==========================================================================
   ANATOMY SCENE — DOT-407 chemical tanker that explodes on scroll
   ========================================================================== */
import * as THREE from 'three';

/* procedural studio environment so metal reads correctly with zero assets */
function studioEnv(renderer){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.00, '#ffffff');
  g.addColorStop(0.36, '#e6ecf5');
  g.addColorStop(0.50, '#aab9cd');
  g.addColorStop(0.55, '#46526b');
  g.addColorStop(1.00, '#232b3c');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  // key + fill highlights
  const hot = (cx, cy, r, a) => {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  hot(120, 56, 96, .98); hot(392, 80, 74, .6);
  const amber = x.createRadialGradient(300, 150, 0, 300, 150, 120);
  amber.addColorStop(0, 'rgba(242,179,71,.34)');
  amber.addColorStop(1, 'rgba(242,179,71,0)');
  x.fillStyle = amber; x.fillRect(180, 30, 240, 240);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

function placardTexture(){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#F2B347'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#1a1205'; x.lineWidth = 5;
  x.strokeRect(8, 8, 112, 112);
  x.fillStyle = '#1a1205';
  x.font = 'bold 30px sans-serif'; x.textAlign = 'center';
  x.fillText('1789', 64, 100);
  // flame glyph
  x.beginPath();
  x.moveTo(64, 22); x.quadraticCurveTo(80, 44, 70, 58);
  x.quadraticCurveTo(84, 52, 80, 66); x.quadraticCurveTo(74, 74, 56, 70);
  x.quadraticCurveTo(46, 60, 52, 46); x.quadraticCurveTo(56, 52, 58, 46);
  x.quadraticCurveTo(56, 34, 64, 22); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTanker(canvas){
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
  }catch(err){
    console.warn('[anatomy] WebGL unavailable — falling back to static layout.', err);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0xEDF1F8, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const env = studioEnv(renderer);
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  camera.position.set(11, 4.2, 15);

  const root = new THREE.Group();
  root.rotation.y = -0.42;
  scene.add(root);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xC8D4E4, 0.5));
  const key = new THREE.DirectionalLight(0xEEF3FB, 2.1); key.position.set(6, 9, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xF2B347, 1.0); rim.position.set(-8, 3, -6); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8FA8CC, 0.85); fill.position.set(-4, -3, 8); scene.add(fill);

  /* ---------- materials ---------- */
  const steel = new THREE.MeshStandardMaterial({color:0xB8C5D6, metalness:1, roughness:0.19, envMapIntensity:1.45});
  const brushed = new THREE.MeshStandardMaterial({color:0x8E9DB4, metalness:0.95, roughness:0.44, envMapIntensity:1.0});
  const navy = new THREE.MeshStandardMaterial({color:0x101E42, metalness:0.65, roughness:0.3, envMapIntensity:1.1});
  const dark = new THREE.MeshStandardMaterial({color:0x1A2338, metalness:0.5, roughness:0.62});
  const rubber = new THREE.MeshStandardMaterial({color:0x0C1120, metalness:0.1, roughness:0.9});
  const glass = new THREE.MeshPhysicalMaterial({color:0x0F2144, metalness:0.2, roughness:0.06, transmission:0.55, thickness:0.6, transparent:true, opacity:0.85, envMapIntensity:1.6});
  const amberMat = new THREE.MeshStandardMaterial({color:0xF2B347, metalness:0.4, roughness:0.35, emissive:0xF2B347, emissiveIntensity:0.22});

  /* ---------- part builder ---------- */
  const parts = [];
  function part(index, dir, dist, builder){
    const g = new THREE.Group();
    builder(g);
    g.userData = {home:g.position.clone(), dir:new THREE.Vector3(...dir).normalize(), dist, index};
    root.add(g);
    parts[index] = g;
    return g;
  }

  const wheel = (x, z) => {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 28), rubber);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.46, 20), steel);
    hub.rotation.z = Math.PI / 2;
    g.add(tire, hub);
    g.position.set(x, -1.35, z);
    return g;
  };

  /* 00 — TRACTOR */
  part(0, [-0.7, 0.52, 0.5], 3.1, g => {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.35, 2.5), navy);
    cab.position.set(-4.9, 0.25, 0);
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 2.42), navy);
    sleeper.position.set(-3.4, 0.15, 0);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 2.2), glass);
    wind.position.set(-6.12, 0.72, 0);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 2.1), brushed);
    grille.position.set(-6.14, -0.35, 0);
    const stack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.5, 14), steel);
    stack1.position.set(-3.9, 0.9, 1.15);
    const stack2 = stack1.clone(); stack2.position.z = -1.15;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 2.3), dark);
    deck.position.set(-3.1, -0.98, 0);
    g.add(cab, sleeper, wind, grille, stack1, stack2, deck, wheel(-5.6, 1.25), wheel(-5.6, -1.25), wheel(-3.2, 1.25), wheel(-3.2, -1.25));
  });

  /* 01 — BARREL + LINING */
  part(1, [0, 1, 0.05], 2.9, g => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 7.4, 48, 1, true), steel);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.9, 0.25, 0);
    const capA = new THREE.Mesh(new THREE.SphereGeometry(1.42, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), steel);
    capA.rotation.z = -Math.PI / 2; capA.position.set(4.6, 0.25, 0); capA.scale.set(1, 0.62, 1);
    const capB = capA.clone(); capB.rotation.z = Math.PI / 2; capB.position.x = -2.8;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.42, 20), brushed);
    dome.position.set(1.6, 1.66, 0);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 20), navy);
    hatch.position.set(1.6, 1.9, 0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.06, 0.06), brushed);
    rail.position.set(0.9, 1.5, 0.9);
    const rail2 = rail.clone(); rail2.position.z = -0.9;
    g.add(barrel, capA, capB, dome, hatch, rail, rail2);
  });

  /* 02 — BAFFLES */
  part(2, [0.05, 0.3, 1], 3.2, g => {
    for(let i = 0; i < 4; i++){
      const b = new THREE.Mesh(new THREE.TorusGeometry(1.40, 0.038, 8, 40), amberMat);
      b.rotation.y = Math.PI / 2;
      b.position.set(-1.5 + i * 1.9, 0.25, 0);
      g.add(b);
    }
  });

  /* 03 — PUMP & HOSE CABINET */
  part(3, [0.2, -0.9, 0.55], 2.9, g => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 0.86), brushed);
    box.position.set(2.5, -1.05, 0.95);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 18), steel);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0.4, -1.05, 0.95);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.11, 10, 26), rubber);
    hose.position.set(-0.9, -1.05, 0.95);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 12), amberMat);
    valve.rotation.z = Math.PI / 2;
    valve.position.set(1.5, -1.1, 0.95);
    g.add(box, pump, hose, valve);
  });

  /* 04 — PLACARDS & PAPERS */
  part(4, [0.25, 0.5, -1], 3.4, g => {
    const pt = placardTexture();
    const mat = new THREE.MeshStandardMaterial({map:pt, metalness:0.25, roughness:0.5, side:THREE.DoubleSide});
    const mk = (x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), mat);
      m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = Math.PI / 4;
      return m;
    };
    g.add(mk(0.9, 0.15, 1.45, 0), mk(0.9, 0.15, -1.45, Math.PI), mk(4.78, 0.15, 0, Math.PI / 2), mk(-6.28, 0.1, 0, -Math.PI / 2));
  });

  /* 05 — RUNNING GEAR */
  part(5, [0.1, -1, -0.4], 2.9, g => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.16, 0.16), dark);
    frame.position.set(0.9, -1.02, 0.62);
    const frame2 = frame.clone(); frame2.position.z = -0.62;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.4), dark);
    cross.position.set(3.2, -1.02, 0);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 14), steel);
    tank.rotation.z = Math.PI / 2; tank.position.set(-1.6, -1.1, 0.86);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 2.2), dark);
    guard.position.set(4.9, -1.1, 0);
    g.add(frame, frame2, cross, tank, guard, wheel(2.6, 1.25), wheel(2.6, -1.25), wheel(3.9, 1.25), wheel(3.9, -1.25));
  });

  /* ---------- ground reflection plane ---------- */
  const grid = new THREE.GridHelper(60, 60, 0x9FAFC6, 0xC3CEDF);
  grid.position.y = -2.05;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  /* ---------- anchors used to place the HTML hotspots ---------- */
  const anchors = [
    new THREE.Vector3(-4.9, 0.6, 0),
    new THREE.Vector3(0.9, 1.5, 0),
    new THREE.Vector3(0.3, 0.25, 0),
    new THREE.Vector3(1.0, -1.05, 0.95),
    new THREE.Vector3(0.9, 0.15, 1.45),
    new THREE.Vector3(3.2, -1.3, 0)
  ];

  const pointer = {x:0, y:0, tx:0, ty:0};
  let explode = 0, target = 0, w = 1, h = 1, lookX = 0;
  const clock = new THREE.Clock();
  const proj = new THREE.Vector3();
  let hotEls = [];

  function resize(){
    const r = canvas.getBoundingClientRect();
    w = r.width || window.innerWidth; h = r.height || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = Math.min(1, Math.max(0, (1100 - w) / 620));
    camera.fov = 34 + narrow * 14;
    // on wide screens bias the rig to the right so the copy column stays clear
    lookX = -2.3 * (1 - narrow);
    root.position.x = 1.0 * (1 - narrow);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', e => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, {passive:true});
  resize();

  function tick(){
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    explode += (target - explode) * 0.085;

    root.rotation.y = -0.42 + t * 0.055 + pointer.x * 0.3;
    root.rotation.x = pointer.y * 0.08;
    root.position.y = Math.sin(t * 0.55) * 0.12;

    // dolly out as the truck disassembles
    const d = 20.5 + explode * 6.5;
    camera.position.set(Math.sin(0.62) * d * 0.66, 4.4 + explode * 2.6, Math.cos(0.62) * d);
    camera.lookAt(lookX, 0.2 + explode * 0.4, 0);

    parts.forEach(p => {
      const u = p.userData;
      const e = explode * u.dist;
      p.position.set(u.home.x + u.dir.x * e, u.home.y + u.dir.y * e, u.home.z + u.dir.z * e);
      p.rotation.z = u.dir.y * explode * 0.09;
    });

    grid.material.opacity = 0.55 * (1 - explode * 0.6);

    renderer.render(scene, camera);

    // project anchors → screen space, then keep every card on-screen, clear of
    // the copy column, and clear of each other
    if(hotEls.length && explode > 0.02 && w >= 900){
      const topBound = 96;
      const boxes = [];

      for(let i = 0; i < hotEls.length; i++){
        const el = hotEls[i];
        const p = parts[i];
        const bw = el.offsetWidth || 240;
        const bh = el.offsetHeight || 120;

        proj.copy(anchors[i]).add(p.position.clone().sub(p.userData.home));
        p.parent.localToWorld(proj);
        proj.project(camera);

        const sx = (proj.x * 0.5 + 0.5) * w;
        const sy = (-proj.y * 0.5 + 0.5) * h;

        const leftBound = Math.min(w * 0.40, w - bw - 20);
        let x = sx + (i % 2 === 0 ? -bw - 20 : 20);
        let y = sy - bh * 0.5;
        x = Math.min(Math.max(x, leftBound), Math.max(leftBound, w - bw - 20));
        y = Math.min(Math.max(y, topBound), Math.max(topBound, h - bh - 24));
        boxes.push({ el, x, y, bw, bh });
      }

      const hits = (a, b) =>
        a.x < b.x + b.bw + 12 && b.x < a.x + a.bw + 12 &&
        a.y < b.y + b.bh + 10 && b.y < a.y + a.bh + 10;

      boxes.sort((a, b) => a.y - b.y);
      for(let pass = 0; pass < 2; pass++)
      for(let i = 1; i < boxes.length; i++){
        const a = boxes[i];
        for(let j = 0; j < i; j++) if(hits(a, boxes[j])) a.y = boxes[j].y + boxes[j].bh + 12;

        // the bottom of the viewport can push a card straight back into a
        // neighbour — resolve those horizontally rather than stacking forever
        if(a.y > h - a.bh - 16){
          a.y = h - a.bh - 16;
          for(let j = 0; j < i; j++){
            if(!hits(a, boxes[j])) continue;
            const leftSlot = boxes[j].x - a.bw - 14;
            const rightSlot = boxes[j].x + boxes[j].bw + 14;
            if(rightSlot + a.bw <= w - 20) a.x = rightSlot;
            else if(leftSlot >= 16) a.x = leftSlot;
            else a.y = Math.max(topBound, boxes[j].y - a.bh - 12);
          }
        }
      }

      for(const b of boxes) b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
    }
  }

  return {
    tick,
    setExplode(v){ target = Math.max(0, Math.min(1, v)); },
    bindHotspots(els){ hotEls = els; },
    partCount: parts.length
  };
}
