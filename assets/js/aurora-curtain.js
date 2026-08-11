// "Aurora Curtain" — ported Shadertoy fragment (uses iChannel0/iChannel1 noise
// inputs) to a Three.js full-screen quad. Sits BEHIND ascii-neon.js as the
// page's base background layer (z-index -2), so the ASCII-neon words
// (z-index -1) and page content (z-index >= 0/auto) stay on top.
//
// The original shader has no fixed-function iChannel setup on this page, so
// two tileable grayscale value-noise textures are generated procedurally and
// bound as iChannel1 (domain-warp driver) and iChannel0 (curtain displacement)
// — the same role Shadertoy's built-in "Noise" buffers play for this class of
// shader. Renderer conventions match chronos.js / testScript2.js on this site:
// alpha:true, transparent clear, capped pixel ratio, GLSL ES 3.00 (out vec4).

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

function makeNoiseTexture(size) {
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function initAuroraCurtain() {
  let canvas = document.getElementById('aurora-curtain');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'aurora-curtain';
    canvas.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).appendChild(canvas);
  }
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '-2'; // behind ascii-neon (-1) and page content

  const inspect = location.search.indexOf('inspect=1') !== -1;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: inspect, // inspect=1 -> keep framebuffer for readback probes
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1)); // iGPU-friendly
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const noiseA = makeNoiseTexture(256); // iChannel0
  const noiseB = makeNoiseTexture(256); // iChannel1

  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_channel0: { value: noiseA },
      u_channel1: { value: noiseB }
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      #define TAU 6.2831853071

      uniform float u_time;       // iTime
      uniform vec2  u_resolution; // iResolution.xy
      uniform sampler2D u_channel0; // iChannel0
      uniform sampler2D u_channel1; // iChannel1

      out vec4 fragColor;

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = fragCoord.xy / u_resolution.xy;

        float o = texture(u_channel1, uv * 0.25 + vec2(0.0, u_time * 0.025)).r;
        float d = (texture(u_channel0, uv * 0.25 - vec2(0.0, u_time * 0.02 + o * 0.02)).r * 2.0 - 1.0);

        float v = uv.y + d * 0.1;
        v = 1.0 - abs(v * 2.0 - 1.0);
        v = pow(v, 2.0 + sin((u_time * 0.2 + d * 0.25) * TAU) * 0.5);

        vec3 color = vec3(0.0);

        float x = (1.0 - uv.x * 0.75);
        float y = 1.0 - abs(uv.y * 2.0 - 1.0);
        color += vec3(x * 0.5, y, x) * v;

        vec2 seed = fragCoord.xy;
        vec2 r;
        r.x = fract(sin((seed.x * 12.9898) + (seed.y * 78.2330)) * 43758.5453);
        r.y = fract(sin((seed.x * 53.7842) + (seed.y * 47.5134)) * 43758.5453);

        float s = mix(r.x, (sin((u_time * 2.5 + 60.0) * r.y) * 0.5 + 0.5) * ((r.y * r.y) * (r.y * r.y)), 0.04);
        color += pow(s, 70.0) * (1.0 - v);

        fragColor = vec4(color, 1.0);
      }
    `,
    glslVersion: THREE.GLSL3, // ES 3.00 — matches the `out vec4 fragColor` style
    transparent: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  let lastTime = performance.now() / 1000;
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now() / 1000;
    material.uniforms.u_time.value += (now - lastTime);
    lastTime = now;
    renderer.render(scene, camera);
  }
  animate();

  window.__AURORA_CURTAIN = { canvasId: 'aurora-curtain' };
  window.__setAuroraTime = function (s) {
    material.uniforms.u_time.value = Number(s) || 0.0;
    renderer.render(scene, camera);
    return true;
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuroraCurtain);
} else {
  initAuroraCurtain();
}
