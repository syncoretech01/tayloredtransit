/* ==========================================================================
   HERO SCENE — displaced "chemical core" + molecular lattice
   ========================================================================== */
import * as THREE from 'three';

const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export function createHero(canvas){
  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
  }catch(err){
    console.warn('[hero] WebGL unavailable — falling back to CSS backdrop.', err);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0xF5F7FB, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xF5F7FB, 0.030); // fades the lattice into the light page

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 0, 16);

  const world = new THREE.Group();
  scene.add(world);

  /* ---------- the core: displaced sphere, liquid-metal chemical mass ---------- */
  const coreUniforms = {
    uTime:{value:0}, uAmp:{value:0.0}, uProg:{value:0}, uPointer:{value:new THREE.Vector2()},
    uColA:{value:new THREE.Color('#0E1F45')},
    uColB:{value:new THREE.Color('#8FA2BB')},
    uColC:{value:new THREE.Color('#F2B347')}
  };

  const coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    transparent:true,
    vertexShader:`
      uniform float uTime; uniform float uAmp; uniform vec2 uPointer;
      varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
      ${NOISE}
      void main(){
        vec3 p = position;
        float t = uTime * 0.28;
        float n1 = snoise(p * 0.62 + vec3(t, t * 0.7, -t * 0.5));
        float n2 = snoise(p * 1.7 + vec3(-t * 1.3, t * 0.4, t));
        float pull = snoise(p * 0.9 + vec3(uPointer * 2.2, t * 0.6));
        float disp = (n1 * 0.72 + n2 * 0.26 + pull * 0.34) * uAmp;
        vDisp = disp;
        vec3 np = p + normal * disp;
        // recompute an approximate normal via neighbouring samples
        float e = 0.09;
        vec3 tx = normalize(cross(normal, vec3(0.,1.,0.) + 1e-4));
        vec3 ty = normalize(cross(normal, tx));
        vec3 a = p + tx * e; vec3 b = p + ty * e;
        float na = (snoise(a*0.62+vec3(t,t*0.7,-t*0.5))*0.72 + snoise(a*1.7+vec3(-t*1.3,t*0.4,t))*0.26) * uAmp;
        float nb = (snoise(b*0.62+vec3(t,t*0.7,-t*0.5))*0.72 + snoise(b*1.7+vec3(-t*1.3,t*0.4,t))*0.26) * uAmp;
        vec3 pa = a + normal * na; vec3 pb = b + normal * nb;
        vNormal = normalize(normalMatrix * normalize(cross(pa - np, pb - np)) * -1.0);
        vec4 mv = modelViewMatrix * vec4(np, 1.0);
        vPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader:`
      uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uTime; uniform float uProg;
      varying vec3 vNormal; varying vec3 vPos; varying float vDisp;
      void main(){
        vec3 N = normalize(vNormal);
        vec3 V = normalize(-vPos);
        vec3 R = reflect(-V, N);

        // procedural studio environment — dark floor, bright sky, hard horizon
        float up = R.y * 0.5 + 0.5;
        vec3 envc = mix(vec3(0.012, 0.024, 0.062), vec3(0.72, 0.80, 0.93), smoothstep(0.34, 0.94, up));
        envc = mix(envc, vec3(0.04, 0.08, 0.19), smoothstep(0.40, 0.52, up) * (1.0 - smoothstep(0.52, 0.64, up)) * 0.8);

        vec3 L1 = normalize(vec3(0.55, 0.85, 0.55));
        vec3 L2 = normalize(vec3(-0.85, -0.15, 0.35));
        float d1 = max(dot(N, L1), 0.0);
        float d2 = max(dot(N, L2), 0.0);
        float spec  = pow(max(dot(reflect(-L1, N), V), 0.0), 52.0);
        float spec2 = pow(max(dot(reflect(-L2, N), V), 0.0), 22.0);
        float fres  = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.2);

        vec3 col = mix(uColA, envc, 0.80);       // chromed navy body
        col = mix(col, uColB, d1 * 0.26);        // steel key
        col += vec3(1.0) * spec * 0.42;          // white hotspot
        col += uColC * spec2 * 0.55;             // amber rim light
        col += uColC * fres * 0.16 * (0.6 + uProg * 0.5);
        col += uColB * fres * 0.10;
        col = mix(col, uColC * 0.85, smoothstep(0.34, 0.88, vDisp) * 0.12);

        float alpha = 0.96 - fres * 0.08;
        gl_FragColor = vec4(col, alpha);
      }`
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.75, 64), coreMat);
  core.position.set(4.8, -0.15, 0);
  core.scale.setScalar(0.001);
  world.add(core);

  /* ---------- wireframe shell ---------- */
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.2, 2),
    new THREE.MeshBasicMaterial({color:0x54637F, wireframe:true, transparent:true, opacity:0})
  );
  shell.position.copy(core.position);
  world.add(shell);

  /* ---------- molecular lattice: points + bonds ---------- */
  const COUNT = 460;
  const pts = [];
  for(let i=0;i<COUNT;i++){
    const r = 7 + Math.pow(Math.random(), 0.6) * 13;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pts.push(new THREE.Vector3(
      Math.sin(ph) * Math.cos(th) * r * 1.35,
      Math.sin(ph) * Math.sin(th) * r * 0.62,
      Math.cos(ph) * r * 0.8
    ));
  }
  const pPos = new Float32Array(COUNT * 3);
  const pSeed = new Float32Array(COUNT);
  pts.forEach((p,i)=>{ pPos[i*3]=p.x; pPos[i*3+1]=p.y; pPos[i*3+2]=p.z; pSeed[i]=Math.random()*10; });

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, blending:THREE.NormalBlending,
    uniforms:{uTime:{value:0}, uSize:{value:renderer.getPixelRatio()*2.6}, uOpacity:{value:0}},
    vertexShader:`
      attribute float aSeed; uniform float uTime; uniform float uSize;
      varying float vF;
      void main(){
        vec3 p = position;
        p.x += sin(uTime*0.32 + aSeed*2.1) * 0.55;
        p.y += cos(uTime*0.26 + aSeed*1.7) * 0.5;
        p.z += sin(uTime*0.2 + aSeed) * 0.45;
        vF = 0.45 + 0.55 * sin(uTime*0.9 + aSeed*3.0);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize * (26.0 / -mv.z) * (0.6 + vF*0.8);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader:`
      uniform float uOpacity; varying float vF;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if(d > 0.5) discard;
        float a = smoothstep(0.5, 0.06, d);
        vec3 c = mix(vec3(0.20,0.27,0.44), vec3(0.66,0.44,0.06), step(0.86, vF));
        gl_FragColor = vec4(c, a * uOpacity * (0.35 + vF*0.65));
      }`
  });
  const points = new THREE.Points(pGeo, pMat);
  world.add(points);

  // bonds between nearby atoms
  const bonds = [];
  const MAXD = 4.4;
  for(let i=0;i<COUNT && bonds.length < 620;i++){
    for(let j=i+1;j<COUNT;j++){
      if(pts[i].distanceTo(pts[j]) < MAXD){ bonds.push(pts[i], pts[j]); break; }
    }
  }
  const bGeo = new THREE.BufferGeometry().setFromPoints(bonds);
  const bMat = new THREE.LineBasicMaterial({color:0x5E6E8C, transparent:true, opacity:0, depthWrite:false});
  const lines = new THREE.LineSegments(bGeo, bMat);
  world.add(lines);

  /* ---------- flowing route arcs ---------- */
  const arcs = new THREE.Group();
  world.add(arcs);
  const arcMats = [];
  // kept wide, shallow and well behind the core so they read as faint route
  // curves rather than stray vertical strokes crossing the headline
  for(let i=0;i<5;i++){
    const z = -14 + Math.random() * 7;
    const a = new THREE.Vector3(-9 - Math.random()*11, (Math.random()-0.5)*7, z);
    const b = new THREE.Vector3( 9 + Math.random()*11, (Math.random()-0.5)*7, z + (Math.random()-0.5)*3);
    const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 2.4 + Math.random()*2.6, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, m, b);
    const g = new THREE.TubeGeometry(curve, 60, 0.016, 6, false);
    const mat = new THREE.MeshBasicMaterial({color: i%2 ? 0xC4830F : 0x5E6E8C, transparent:true, opacity:0, depthWrite:false});
    arcMats.push(mat);
    arcs.add(new THREE.Mesh(g, mat));
  }

  /* ---------- state ---------- */
  const pointer = {x:0, y:0, tx:0, ty:0};
  let scrollP = 0, targetScroll = 0;
  let w = 1, h = 1, running = true;
  const clock = new THREE.Clock();

  function resize(){
    const r = canvas.getBoundingClientRect();
    w = r.width || window.innerWidth; h = r.height || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // pull the core toward the centre on narrow screens
    const narrow = Math.min(1, Math.max(0, (1200 - w) / 620));
    core.position.x = 4.8 - narrow * 4.8;
    core.position.y = -0.15 + narrow * 1.9;
    shell.position.copy(core.position);
    camera.fov = 42 + narrow * 12;
    camera.updateProjectionMatrix();
  }

  function onPointer(e){
    const cx = (e.touches ? e.touches[0].clientX : e.clientX);
    const cy = (e.touches ? e.touches[0].clientY : e.clientY);
    pointer.tx = (cx / window.innerWidth) * 2 - 1;
    pointer.ty = (cy / window.innerHeight) * 2 - 1;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointer, {passive:true});
  resize();

  function tick(){
    if(!running) return;
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    scrollP += (targetScroll - scrollP) * 0.07;

    coreUniforms.uTime.value = t;
    coreUniforms.uProg.value = scrollP;
    coreUniforms.uPointer.value.set(pointer.x, -pointer.y);
    pMat.uniforms.uTime.value = t;

    core.rotation.y = t * 0.11 + pointer.x * 0.28;
    core.rotation.x = Math.sin(t * 0.16) * 0.14 - pointer.y * 0.2;
    shell.rotation.y = -t * 0.06 - pointer.x * 0.16;
    shell.rotation.z = t * 0.03;

    points.rotation.y = t * 0.026;
    lines.rotation.y = points.rotation.y;
    arcs.rotation.y = t * 0.018;

    world.position.x = -pointer.x * 0.9;
    world.position.y = pointer.y * 0.55;

    // immersive scroll dolly
    camera.position.z = 16 - scrollP * 4.5;
    camera.position.y = scrollP * 1.1;
    camera.rotation.x = -scrollP * 0.06;

    renderer.render(scene, camera);
  }

  return {
    tick,
    setScroll(v){ targetScroll = Math.max(0, Math.min(1, v)); },
    reveal(gsap){
      gsap.to(core.scale, {x:1,y:1,z:1, duration:2.4, ease:'expo.out'});
      gsap.to(coreUniforms.uAmp, {value:0.92, duration:3, ease:'power2.out'});
      gsap.to(pMat.uniforms.uOpacity, {value:1, duration:2.6, delay:.25, ease:'power2.out'});
      gsap.to(bMat, {opacity:0.26, duration:2.6, delay:.4, ease:'power2.out'});
      gsap.to(shell.material, {opacity:0.1, duration:2.2, delay:.5, ease:'power2.out'});
      arcMats.forEach((m,i)=> gsap.to(m, {opacity:0.26, duration:1.6, delay:.7 + i*0.12, ease:'power2.out'}));
    },
    pause(){ running = false; },
    resume(){ if(!running){ running = true; } }
  };
}
