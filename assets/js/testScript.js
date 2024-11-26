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
    camera.position.z = 5;

    // Resize handling
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

    // Wave geometry
    const geometry = new THREE.PlaneGeometry(20, 20, 100, 100);
    const material = new THREE.MeshPhongMaterial({ color: 0x0077be, side: THREE.DoubleSide, shininess: 50 });
    const waveMesh = new THREE.Mesh(geometry, material);
    scene.add(waveMesh);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040); // Add ambient light
    scene.add(ambientLight);

    // Animation loop
    const animate = function () {
        requestAnimationFrame(animate);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        const time = performance.now() * 0.001; // Time in seconds
        const waveAmplitude = 0.5;
        const waveFrequency = 1;
        const waveSpeed = 1;

        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const x = geometry.attributes.position.getX(i);
            const y = geometry.attributes.position.getY(i);
            const z = waveAmplitude * Math.sin(waveFrequency * x + waveSpeed * time) +
                      waveAmplitude * Math.cos(waveFrequency * y + waveSpeed * time);
            geometry.attributes.position.setZ(i, z);
        }
        geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    };

    animate();
};

document.addEventListener('DOMContentLoaded', initThreeScene);
