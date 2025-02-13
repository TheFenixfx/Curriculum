import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  // Get the canvas element and ensure it fills the viewport.
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }
  // Make sure the canvas fills the screen.
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // Create the WebGLRenderer.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create an empty scene.
  const scene = new THREE.Scene();

  // Use an OrthographicCamera to render a full-screen quad.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a plane geometry that spans the entire screen.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Create a custom ShaderMaterial.
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
      
      // A simple hash function to generate pseudo-random numbers from a 2D input.
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      
      // Function that computes the star contribution in a given grid cell.
      float starField(vec2 uv) {
        // Get grid cell coordinates and local position.
        vec2 id = floor(uv);
        vec2 fuv = fract(uv) - 0.5;
        
        // Random value for the current cell.
        float n = hash(id);
        // Use the random value to define a star's offset within the cell.
        vec2 starOffset = vec2(sin(n * 6.2831), cos(n * 6.2831)) * 0.35;
        // Add a slight time-based shift for twinkling.
        starOffset += 0.1 * vec2(sin(u_time + n * 6.2831), cos(u_time + n * 6.2831));
        
        // Compute distance from the "star" center.
        float d = length(fuv - starOffset);
        // Return a star value that is strong when close to the center.
        return 1.0 - smoothstep(0.0, 0.15, d);
      }
      
      void main() {
        // Normalize pixel coordinates.
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        // Scale UV for starfield density (increase factor for a denser starfield).
        uv *= 20.0;
        // Animate vertical movement to simulate drifting through space.
        uv.y += u_time * 0.2;
        
        // Accumulate star brightness from multiple scales for variety.
        float starIntensity = 0.0;
        starIntensity += starField(uv);
        starIntensity += 0.5 * starField(uv * 2.0);
        starIntensity += 0.25 * starField(uv * 4.0);
        
        // Clamp brightness and mix with a deep night background.
        float brightness = clamp(starIntensity, 0.0, 1.0);
        vec3 color = mix(vec3(0.0, 0.0, 0.05), vec3(1.0), brightness);
        
        gl_FragColor = vec4(color, 1.0);
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

  // Animation loop: update time uniform and render the scene.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // Convert time to seconds.
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
