import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  // Get the canvas element and ensure it fills the viewport.
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }
  // Ensure the canvas takes the full window.
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // Create a WebGLRenderer.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create an empty scene.
  const scene = new THREE.Scene();

  // Use an OrthographicCamera for our full-screen quad.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a plane geometry that covers the full screen.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Create a ShaderMaterial using the adapted starfield code.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) } // optional mouse input
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      
      #define NUM_LAYERS 4.
      
      // Rotation matrix.
      mat2 Rot(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
      }
      
      // Star function creates a bright point with flare.
      float Star(vec2 uv, float flare) {
          float d = length(uv);
          float m = 0.05 / d;
          
          float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
          m += rays * flare;
          uv *= Rot(3.1415 / 4.0);
          rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
          m += rays * 0.3 * flare;
          
          m *= smoothstep(1.0, 0.2, d);
          return m;
      }
      
      // Simple hash function.
      float Hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }
      
      // Computes a star layer from UV coordinates.
      vec3 StarLayer(vec2 uv) {
          vec3 col = vec3(0.0);
          vec2 gv = fract(uv) - 0.5;
          vec2 id = floor(uv);
          
          for (int y = -1; y <= 1; y++) {
              for (int x = -1; x <= 1; x++) {
                  vec2 offs = vec2(float(x), float(y));
                  float n = Hash21(id + offs); // random number between 0 and 1
                  float size = fract(n * 345.32);
                  
                  float star = Star(gv - offs - vec2(n, fract(n * 34.0)) + 0.5,
                                     smoothstep(0.9, 1.0, size) * 0.6);
                  
                  vec3 color = sin(vec3(0.2, 0.3, 0.9) * fract(n * 2345.2) * 123.2) * 0.5 + 0.5;
                  color = color * vec3(1.0, 0.25, 1.0 + size) + vec3(0.2, 0.2, 0.1) * 2.0;
                  
                  star *= sin(u_time * 3.0 + n * 6.2831) * 0.5 + 1.0;
                  col += star * size * color;
              }
          }
          return col;
      }
      
      // Main image function (adapted from Shadertoy's mainImage).
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
          // Normalize pixel coordinates.
          vec2 uv = (fragCoord - 0.5 * u_resolution.xy) / u_resolution.y;
          // Adjust for mouse input.
          vec2 M = (u_mouse - 0.5 * u_resolution.xy) / u_resolution.y;
          
          float t = u_time * 0.02;
          uv += M * 4.0;
          uv *= Rot(t);
          
          vec3 col = vec3(0.0);
          for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS) {
              float depth = fract(i + t);
              float scale = mix(20.0, 0.5, depth);
              float fade = depth * smoothstep(1.0, 0.9, depth);
              col += StarLayer(uv * scale + i * 453.2 - M) * fade;
          }
          col = pow(col, vec3(0.4545)); // gamma correction
          fragColor = vec4(col, 1.0);
      }
      
      void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `
  });

  // Create the full-screen quad and add it to the scene.
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Handle window resize.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Optionally update the u_mouse uniform on mouse move.
  window.addEventListener('mousemove', (e) => {
    material.uniforms.u_mouse.value.x = e.clientX;
    // Flip y-coordinate to match WebGL coordinates.
    material.uniforms.u_mouse.value.y = window.innerHeight - e.clientY;
  });

  // Animation loop: update time uniform and render.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // Convert to seconds.
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
