import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  // Get the canvas element and ensure it fills the viewport.
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }
  // Set CSS to fill the entire window.
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // Create the renderer.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create an empty scene.
  const scene = new THREE.Scene();

  // Use an OrthographicCamera so our full-screen quad covers the viewport.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a plane geometry that spans the entire screen.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // The ShaderMaterial contains our custom vertex and fragment shaders.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
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
      
      // Kaleidoscopic transform: mirror the input into N symmetric sectors.
      vec2 kaleido(vec2 uv, float sectors) {
        float angle = atan(uv.y, uv.x);
        float radius = length(uv);
        float sectorAngle = 2.0 * 3.14159265 / sectors;
        angle = mod(angle, sectorAngle);
        angle = abs(angle - sectorAngle * 0.5);
        return vec2(radius * cos(angle), radius * sin(angle));
      }
      
      void main() {
        // Normalize coordinates: center at (0,0) with aspect ratio preserved.
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        // Apply a kaleidoscopic transform with 8 sectors.
        uv = kaleido(uv, 8.0);
        
        // Create a fractal by iterating a Mandelbrot-like function.
        // The fractal is animated by a time-based offset.
        vec2 c = uv * 1.5 + vec2(sin(u_time * 0.3), cos(u_time * 0.2));
        vec2 z = vec2(0.0);
        float iter = 0.0;
        const float maxIter = 100.0;
        for (int i = 0; i < 100; i++) {
          if (dot(z, z) > 4.0) break;
          z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
          iter += 1.0;
        }
        float t = iter / maxIter;
        
        // Generate a soothing, shifting color based on the fractal iteration.
        vec3 color = vec3(
          0.5 + 0.5 * sin(3.14159 * t + u_time),
          0.5 + 0.5 * sin(3.14159 * t + u_time + 2.0),
          0.5 + 0.5 * sin(3.14159 * t + u_time + 4.0)
        );
        // Quantize the color to emulate stained-glass segments.
        color = floor(color * 8.0) / 8.0;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  // Create the full-screen quad and add it to the scene.
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Update renderer and shader uniforms on window resize.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Animation loop: update time uniform and render.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // convert time to seconds
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
