import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setClearColor(0x000000); // Fallback background color

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10; // Adjusted to fit larger plane geometry

  /**
   * @function resizeRendererToDisplaySize
   * @description Dynamically adjusts the renderer and camera aspect ratio to match the canvas's display size.
   * @param {THREE.WebGLRenderer} renderer - The renderer instance to be adjusted.
   * @returns {boolean} True if a resize occurred, false otherwise.
   */
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    return needResize;
  }

  // Create a plane geometry with more segments for smoother deformations.
  const geometry = new THREE.PlaneGeometry(40, 40, 100, 100); // Larger geometry

  // Create a color attribute for the vertices.
  const numVertices = geometry.attributes.position.count;
  const colors = new Float32Array(numVertices * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Use vertexColors in the material so that each vertex color is used.
  const material = new THREE.MeshPhongMaterial({ 
    vertexColors: true, 
    side: THREE.DoubleSide, 
    shininess: 50 
  });

  const waveMesh = new THREE.Mesh(geometry, material);
  waveMesh.rotation.x = -Math.PI / 2; // Rotate to face up
  scene.add(waveMesh);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const animate = function () {
    requestAnimationFrame(animate);

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    const time = performance.now() * 0.001;
    const waveAmplitude = 1.5; // Base wave amplitude
    const waveFrequency = 0.5; // Base wave frequency
    const waveSpeed = 1;

    // Parameters for an added finer detail wave.
    const fineAmplitude = 0.3;
    const fineFrequency = 5;
    const fineSpeed = 2;

    // Update vertex positions and colors.
    for (let i = 0; i < numVertices; i++) {
      const x = geometry.attributes.position.getX(i);
      const y = geometry.attributes.position.getY(i);

      // Base wave using sine and cosine.
      let z = waveAmplitude * Math.sin(waveFrequency * x + waveSpeed * time) +
              waveAmplitude * Math.cos(waveFrequency * y + waveSpeed * time);

      // Add fine detail wave.
      z += fineAmplitude * Math.sin(fineFrequency * x + fineSpeed * time) *
           Math.cos(fineFrequency * y + fineSpeed * time);

      geometry.attributes.position.setZ(i, z);

      // Normalize z for color mapping. For the base wave, z varies roughly between -3 and 3.
      // Adjust the range if you change amplitudes.
      const t = (z + 3) / 6; // t goes from 0 (low) to 1 (high)

      // Create a color gradient that shifts over time.
      // Here, lower parts are bluish (hue ~0.6) and higher parts are reddish (hue ~0.0).
      const hue = 0.6 * (1 - t) + ((time * 0.05) % 1) * 0.1; // slight time-based shift
      const color = new THREE.Color();
      color.setHSL(hue, 1.0, 0.5);

      // Assign the color to the vertex.
      geometry.attributes.color.setXYZ(i, color.r, color.g, color.b);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  };

  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
