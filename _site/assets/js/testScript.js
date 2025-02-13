import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
  const canvas = document.getElementById('background-effect');
  if (!canvas) {
    console.error("Canvas element with id 'background-effect' not found!");
    return;
  }

  // Create the renderer with antialiasing.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  // Initial clear color (will be updated every frame).
  renderer.setClearColor(0x001133);

  // Create the scene and add a subtle fog.
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x001133, 20, 60);

  // Set up a perspective camera.
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  // Position the camera so that the mountain and sun are both in view.
  camera.position.set(20, 15, 40);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  /**
   * Adjusts renderer and camera aspect ratio based on the canvas's display size.
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

  // ─────────────────────────────────────────────
  // Create the mountain (a static, displaced plane)
  // ─────────────────────────────────────────────

  // Create a PlaneGeometry; it will be deformed to resemble a rugged mountain.
  const mountainGeometry = new THREE.PlaneGeometry(40, 40, 200, 200);
  // Rotate so the plane lies in the XZ plane (with Y as up).
  mountainGeometry.rotateX(-Math.PI / 2);

  // Parameters for the mountain shape.
  const mountainPeakHeight = 8; // maximum height
  const mountainOffsetX = -5;   // offset so the peak is off-center

  // For each vertex, compute a height based on its distance from a chosen “peak center”
  for (let i = 0; i < mountainGeometry.attributes.position.count; i++) {
    const x = mountainGeometry.attributes.position.getX(i);
    const z = mountainGeometry.attributes.position.getZ(i);
    // Shift the x coordinate so the mountain peak is offset.
    const dx = x - mountainOffsetX;
    const d = Math.sqrt(dx * dx + z * z);
    // A smooth falloff: higher near the center and tapering off with distance.
    const scale = 50; // larger values yield gentler slopes
    let height = mountainPeakHeight * Math.exp(-d * d / scale);
    // Add a bit of sine–based variation for a natural, rugged look.
    height += 0.5 * Math.sin(x * 0.5) * Math.cos(z * 0.5);
    // Set the computed height into the Y coordinate.
    mountainGeometry.attributes.position.setY(i, height);
  }
  mountainGeometry.attributes.position.needsUpdate = true;
  mountainGeometry.computeVertexNormals();

  // Use a MeshPhongMaterial for smooth lighting on the mountain.
  const mountainMaterial = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: false });
  const mountainMesh = new THREE.Mesh(mountainGeometry, mountainMaterial);
  scene.add(mountainMesh);

  // ─────────────────────────────────────────────
  // Create the sun (a simple colored circle)
  // ─────────────────────────────────────────────

  const sunRadius = 3;
  const sunGeometry = new THREE.CircleGeometry(sunRadius, 32);
  // A warm golden color for the sun.
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  // Initially position the sun (its position will be animated).
  sunMesh.position.set(-15, -5, -30);
  scene.add(sunMesh);

  // ─────────────────────────────────────────────
  // Lighting: simulate sunlight using a directional light that follows the sun.
  // ─────────────────────────────────────────────

  // The directional light will mimic the sun’s rays.
  const directionalLight = new THREE.DirectionalLight(0xffcc33, 1);
  directionalLight.position.copy(sunMesh.position);
  scene.add(directionalLight);

  // A subtle ambient light to fill in shadows.
  const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────
  // Animate the scene.
  // ─────────────────────────────────────────────

  const animate = function () {
    requestAnimationFrame(animate);

    // Ensure the canvas size is kept up-to-date.
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    const time = performance.now() * 0.001; // time in seconds

    // Animate the sun along a cyclical path to simulate sunrise-to-sunset.
    // Cycle period: 20 seconds.
    const cycle = 20;
    const tCycle = (time % cycle) / cycle; // normalized time [0,1]

    // Map the cycle to a sun path:
    // - Sun's Y position goes from below the horizon (-5) to high in the sky (15).
    // - Its X position shifts gently from -15 to +15.
    const sunY = -5 + 20 * tCycle; // -5 to 15
    const sunX = -15 + 30 * tCycle; // -15 to +15
    sunMesh.position.set(sunX, sunY, -30);

    // Update the directional light to follow the sun.
    directionalLight.position.copy(sunMesh.position);

    // Adjust light intensities based on sun height.
    // When the sun is low, the light is soft; as it rises, it becomes brighter.
    const sunFactor = Math.max(0, Math.min((sunY + 5) / 20, 1)); // 0 when sun is at -5, 1 when sun is at 15
    ambientLight.intensity = 0.3 + 0.7 * sunFactor;
    directionalLight.intensity = 0.5 + 1.5 * sunFactor;

    // Update the background (sky) color to evoke a sunrise:
    // - When the sun is below the horizon, use a deep, moonlit blue.
    // - As the sun rises, blend from warm sunrise oranges to a light daytime blue.
    let skyColor = new THREE.Color();
    if (sunY < 0) {
      // Nighttime / pre-dawn: deep blue.
      skyColor.setHSL(0.6, 0.5, 0.1);
    } else {
      // Sunrise/day: blend from a warm orange to a soft blue.
      const mix = Math.min(sunY / 15, 1);
      const sunriseColor = new THREE.Color();
      sunriseColor.setHSL(0.1, 0.7, 0.5); // warm orange
      const dayColor = new THREE.Color();
      dayColor.setHSL(0.6, 0.3, 0.7); // light blue
      skyColor = sunriseColor.lerp(dayColor, mix);
    }
    renderer.setClearColor(skyColor);

    renderer.render(scene, camera);
  };

  animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
