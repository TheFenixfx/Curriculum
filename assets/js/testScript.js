import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  // Get the canvas and ensure it fills the viewport.
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }
  // Make sure the canvas uses full window dimensions.
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // Create a WebGLRenderer and set it to the full window size.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create an empty scene.
  const scene = new THREE.Scene();

  // Use an OrthographicCamera so that our full-screen quad fills the viewport.
  // The orthographic camera spans from (-1, -1) to (1, 1).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a plane geometry that spans the full screen.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Create a ShaderMaterial with uniforms for time and resolution.
  // The fragment shader computes a Mandelbrot-like fractal and maps the iteration count to pastel hues.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      void main() {
        // Pass through the vertex positions directly.
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;

      // Convert a hue value to an RGB color.
      vec3 hue2rgb(float h) {
        return vec3(
          abs(h * 6.0 - 3.0) - 1.0,
          2.0 - abs(h * 6.0 - 2.0),
          2.0 - abs(h * 6.0 - 4.0)
        );
      }

      void main(){
        // Compute normalized pixel coordinates (from 0 to 1)
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        // Center coordinates around (0,0) and adjust scale.
        vec2 c = (uv - 0.5) * 3.0;
        // Adjust for screen aspect ratio.
        c.x *= u_resolution.x / u_resolution.y;
        // Apply a slow animated offset.
        c += 0.5 * vec2(sin(u_time * 0.2), cos(u_time * 0.2));

        // Mandelbrot iteration:
        vec2 z = vec2(0.0);
        int iter;
        const int maxIter = 100;
        for (iter = 0; iter < maxIter; iter++){
          // z = z^2 + c
          float x = (z.x * z.x - z.y * z.y) + c.x;
          float y = (2.0 * z.x * z.y) + c.y;
          if ((x*x + y*y) > 4.0) break;
          z = vec2(x, y);
        }
        float normIter = float(iter) / float(maxIter);

        // Compute a shifting hue based on the normalized iteration count and time.
        float hue = mod(normIter + u_time * 0.05, 1.0);
        // Get a pastel color by converting the hue with an offset.
        vec3 color = 0.5 + 0.5 * hue2rgb(hue);

        // OPTIONAL: Quantize the color to emulate stained-glass segments.
        color = floor(color * 8.0) / 8.0;

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  // Create the mesh (full-screen quad) and add it to the scene.
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  // Resize handler to update renderer and shader uniform.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Animation loop: update the time uniform and render the scene.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // convert to seconds
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
