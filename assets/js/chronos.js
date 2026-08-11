// "Aurora Terrestris" by chronos — Shadertoy WcdcD7
// https://www.shadertoy.com/view/WcdcD7
//
// Ported to a Three.js full-screen quad, matching the renderer conventions of
// testScript2.js (alpha:true, transparent clear, capped pixel ratio, antialias
// off — iGPU friendly). GLSL ES 3.00 is required for tanh().
//
// Fusion contract (for _config.yml background_mode:"both"): the shader's soft
// auroral sky fills start from a sub-3/255 dark tint baseline (vec3(0.005,
// 0.005, 0.008)) instead of pure black. Under the page's CSS mix-blend-mode:
// screen, this lets the dark-sky regions read as a near-imperceptible dark
// wash over the video while the bright aurora strokes and rim light glow
// through as chronos intended.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  const canvas = document.getElementById('bg-shader');
  if (!canvas) {
    console.error("Canvas element with id 'bg-shader' not found!");
    return;
  }
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  const inspect = location.search.indexOf('inspect=1') !== -1;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: inspect, // inspect=1 -> keep framebuffer for readPixels probes
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // cap DPR — iGPU-friendly
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent backdrop (screen-blend uses RGB)

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_frame: { value: 0.0 }
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform float u_time;      // iTime
      uniform vec2  u_resolution; // iResolution.xy (drawing-buffer px)
      uniform float u_frame;     // iFrame

      out vec4 fragColor;

      // chronos' rotation: #define R(a) mat2(cos((a)+vec4(0,-11,11,0)))
      // 11 rad ~= 3.5*pi so cos(a+11)~=sin(a), cos(a-11)~= -sin(a)
      // -> column-major mat2(cos(a), -sin(a), sin(a), cos(a))
      mat2 R(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = (2.0 * fragCoord - u_resolution.xy) / u_resolution.y;

        // chronos signature camera: slow orbit radius r=200, speed -3.5
        float r = 200.0;
        float pos = u_time * -3.5;
        vec3  ro  = vec3(cos(pos / r) * r, 3.0 + sin(0.1 * pos), sin(pos / r) * r);

        float focal = 2.0;
        vec3  rd = normalize(vec3(uv, -focal));
        rd.xy *= R(0.3 * sin(0.1 * u_time) + 0.4); // slow roll
        rd.xz *= R(pos / r);                        // orbit yaw

        // day / night cycle (period ~125.7s)
        float daynight = smoothstep(-0.6, 0.6, sin(u_time * 0.05));

        // golden-ratio rotation matrix for the fractal fold
        float phi = sqrt(5.0) * 0.5 + 0.5;
        mat2  M   = R(phi * 3.14159265359);

        // per-pixel hash noise (chronos) — t-bias dither
        float hash = fract(631.123123 * sin(u_frame + length(uv) * 331.0
                     + dot(uv, vec2(111.123123, 171.3123))));

        // FUSION CONTRACT: sub-3/255 dark tint baseline (not pure black) so the
        // soft auroral sky survives screen-blend over bg.mp4 without washing out.
        vec3 finalColor = vec3(0.005, 0.005, 0.008);

        float t = 1.0 + 0.2 * hash;
        vec3  color = vec3(0.0);

        // outer raymarch: up to 99 steps OR t > 1e3
        for (int i = 0; i < 99; i++) {
          if (t > 1e3) break;

          vec3 p = ro + rd * t;
          vec3 q = p;

          // inner fractal fold (j: 0.01 -> ~10.24, doubling each step)
          for (float j = 0.01; j < 11.0; j += j) {
            p.xz *= M;
            p.xz -= 1.3 * j;
            p += 0.4 * j * cos(p.zxy / j);
          }

          float sdf = max(p.y + 1.5, 0.0);
          sdf = mix(sdf, min(sdf, 7.0 - 0.2 * p.y), daynight);

          float dt = abs(sdf) * 0.3 + 1e-3;
          t += dt;

          // chronos' exact color map — the cos oscillation across p.y and
          // length(p-ro) is what creates the aurora curtain rays.
          vec3 cmap = (1.0 + -cos(p.y * 0.3 + 0.1 * (t + 1.5 * u_time)
                       + vec3(1.0, 2.0, 3.0) + length(p - ro) * 0.1))
                     * exp2(2.65 * tanh(q.y * 0.55) - 1.55)
                     * exp2(-0.01 * t);
          color += cmap * dt / (sdf * sdf + 1.0);
        }

        finalColor += color;

        // tonemap + gamma. Soft-cap at 30 prevents float-precision blowouts on
        // software WebGL (SwiftShader); on real GPUs this never triggers.
        vec3 col = min(finalColor, 30.0);
        col = tanh(0.0025 * col * col);
        col = pow(col, vec3(1.0 / 2.2));
        fragColor = vec4(col, 1.0);
      }
    `,
    glslVersion: THREE.GLSL3, // ES 3.00 — needed for tanh()
    depthTest: false,
    depthWrite: false
  });

  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Resize handler — update drawing buffer + u_resolution.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(
      renderer.domElement.width, renderer.domElement.height
    );
  }
  window.addEventListener('resize', onWindowResize);

  // Frame-rate-independent clock (delta accumulation).
  let lastTime = performance.now() / 1000;
  let frame = 0;
  let smoothedFps = 60.0;
  let lastFrameStamp = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now() / 1000;
    const dt = now - lastTime;
    lastTime = now;

    material.uniforms.u_time.value += dt;
    material.uniforms.u_frame.value = frame;

    const stamp = performance.now();
    const instant = 1000.0 / Math.max(1.0, stamp - lastFrameStamp);
    lastFrameStamp = stamp;
    smoothedFps = smoothedFps * 0.9 + instant * 0.1;

    renderer.render(scene, camera);
    frame++;
  }
  animate();

  // Inspect hooks for the Gauntlet evaluation scripts.
  window.__CHRONOS = {
    fpsBudget: 60,
    dayNightPeriod: 125.66, // 2*PI/0.05
    canvasId: 'bg-shader'
  };
  window.__setTime = function (s) {
    material.uniforms.u_time.value = Number(s) || 0.0;
    material.uniforms.u_frame.value = Math.round((Number(s) || 0) * 60);
    renderer.render(scene, camera);
    return true;
  };
  window.__getStats = function () {
    const t = material.uniforms.u_time.value;
    const dn = Math.max(0, Math.min(1, (Math.sin(t * 0.05) + 0.6) / 1.2));
    return { fps: smoothedFps, frame: frame, dayNight: dn };
  };
}

document.addEventListener('DOMContentLoaded', initThreeScene);
