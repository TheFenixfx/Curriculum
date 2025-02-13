import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  // Get the canvas element and ensure it fills the viewport.
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }
  // Ensure the canvas occupies the entire screen.
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.margin = '0';
  canvas.style.padding = '0';

  // Create the renderer.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create a scene.
  const scene = new THREE.Scene();

  // Use an OrthographicCamera for our full-screen quad.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Full-screen quad geometry.
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Create the ShaderMaterial.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.0, 0.0) }
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
      
      // Global time variable (modified in the raymarch loop)
      float gTime = 0.0;
      const float REPEAT = 5.0;
      
      // Rotation matrix.
      mat2 rot(float a) {
        float c = cos(a), s = sin(a);
        return mat2(c, s, -s, c);
      }
      
      // Signed distance function for a box.
      float sdBox(vec3 p, vec3 b) {
        vec3 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
      }
      
      // Function defining a single box shape.
      float box(vec3 pos, float scale) {
        pos *= scale;
        float base = sdBox(pos, vec3(0.4, 0.4, 0.1)) / 1.5;
        pos.xy *= 5.0;
        pos.y -= 3.5;
        pos.xy *= rot(0.75);
        float result = -base;
        return result;
      }
      
      // Constructs a set of boxes with time-varying offsets.
      float box_set(vec3 pos, float timeVal) {
        vec3 pos_origin = pos;
        pos = pos_origin;
        pos.y += sin(gTime * 0.4) * 2.5;
        pos.xy *= rot(0.8);
        float box1 = box(pos, 2.0 - abs(sin(gTime * 0.4)) * 1.5);
        
        pos = pos_origin;
        pos.y -= sin(gTime * 0.4) * 2.5;
        pos.xy *= rot(0.8);
        float box2 = box(pos, 2.0 - abs(sin(gTime * 0.4)) * 1.5);
        
        pos = pos_origin;
        pos.x += sin(gTime * 0.4) * 2.5;
        pos.xy *= rot(0.8);
        float box3 = box(pos, 2.0 - abs(sin(gTime * 0.4)) * 1.5);
        
        pos = pos_origin;
        pos.x -= sin(gTime * 0.4) * 2.5;
        pos.xy *= rot(0.8);
        float box4 = box(pos, 2.0 - abs(sin(gTime * 0.4)) * 1.5);
        
        pos = pos_origin;
        pos.xy *= rot(0.8);
        float box5 = box(pos, 0.5) * 6.0;
        
        pos = pos_origin;
        float box6 = box(pos, 0.5) * 6.0;
        
        float result = max(max(max(max(max(box1, box2), box3), box4), box5), box6);
        return result;
      }
      
      // Scene SDF.
      float map(vec3 pos, float timeVal) {
        return box_set(pos, timeVal);
      }
      
      // Main raymarching function.
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        // Normalize coordinates to range [-1,1]
        vec2 p = (fragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        // Define the ray origin with time-based z-motion.
        vec3 ro = vec3(0.0, -0.2, u_time * 4.0);
        
        // Incorporate mouse input as an offset.
        vec2 m = (u_mouse / u_resolution) - 0.5;
        ro.x += m.x * 2.0;
        ro.y += m.y * 2.0;
        
        // Create the ray direction.
        vec3 ray = normalize(vec3(p, 1.5));
        ray.xy = ray.xy * rot(sin(u_time * 0.03) * 5.0);
        ray.yz = ray.yz * rot(sin(u_time * 0.05) * 0.2);
        
        float t = 0.1;
        vec3 col = vec3(0.0);
        float ac = 0.0;
        
        // Raymarch loop.
        for (int i = 0; i < 99; i++){
          vec3 pos = ro + ray * t;
          pos = mod(pos - 2.0, 4.0) - 2.0;
          gTime = u_time - float(i) * 0.01;
          
          float d = map(pos, u_time);
          d = max(abs(d), 0.01);
          ac += exp(-d * 23.0);
          t += d * 0.55;
        }
        
        col = vec3(ac * 0.02);
        col += vec3(0.0, 0.2 * abs(sin(u_time)), 0.5 + sin(u_time) * 0.2);
        
        fragColor = vec4(col, 1.0 - t * (0.02 + 0.02 * sin(u_time)));
      }
      
      void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `
  });
  
  // Create the full-screen quad mesh.
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);
  
  // Update resolution uniform on window resize.
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);
  
  // Update the mouse uniform on mouse move.
  window.addEventListener('mousemove', (event) => {
    material.uniforms.u_mouse.value.x = event.clientX;
    material.uniforms.u_mouse.value.y = window.innerHeight - event.clientY;
  });
  
  // Animation loop.
  function animate(time) {
    requestAnimationFrame(animate);
    material.uniforms.u_time.value = time * 0.001; // Convert to seconds.
    renderer.render(scene, camera);
  }
  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
