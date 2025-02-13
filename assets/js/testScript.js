import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
    const canvas = document.getElementById('background-effect');
    if (!canvas) {
        console.error("Canvas element with id 'background-effect' not found!");
        return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setClearColor(0x000000);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

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

    const geometry = new THREE.PlaneGeometry(40, 40, 100, 100);
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('lightblue'), // Peaceful base color
        emissive: new THREE.Color('darkblue').multiplyScalar(0.1), // Subtle emissive glow
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.2
    });
    const waveMesh = new THREE.Mesh(geometry, material);
    waveMesh.rotation.x = -Math.PI / 2;
    scene.add(waveMesh);

    // Improved lighting for MeshStandardMaterial
    const hemiLight = new THREE.HemisphereLight( 0xbbbbff, 0x888822, 1 );
    scene.add( hemiLight );

    const animate = function () {
        requestAnimationFrame(animate);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        const time = performance.now() * 0.001;
        let waveAmplitude = 1.0;
        let waveFrequency = 0.3;
        let waveSpeed = 0.7;
        const timeSlow = time * 0.7;
        let maxZ = 0;

        for (let i = 0; i < geometry.attributes.position.count; i++) {
            let x = geometry.attributes.position.getX(i);
            let y = geometry.attributes.position.getY(i);
            let z = 0;

            // Layer 1
            z += waveAmplitude * Math.sin(waveFrequency * x + timeSlow);
            z += waveAmplitude * Math.cos(waveFrequency * y + timeSlow);

            // Layer 2 - Higher frequency, lower amplitude for fractal detail
            waveAmplitude *= 0.5;
            waveFrequency *= 2;
            z += waveAmplitude * Math.sin(waveFrequency * x + timeSlow * 0.5);
            z += waveAmplitude * Math.cos(waveFrequency * y + timeSlow * 0.5);


            geometry.attributes.position.setZ(i, z);
            maxZ = Math.max(maxZ, Math.abs(z));
        }
        geometry.attributes.position.needsUpdate = true;


        // Color modulation based on Z position and time
        waveMesh.material.color.setHSL(
            (maxZ * 0.02 + time * 0.02) % 0.5, // Hue cycle - less than 0.5 for blue/green peaceful mood
            0.6, // Saturation - slightly increased
            0.7  // Lightness - slightly increased
        );
        waveMesh.material.emissive.setHSL(
            (maxZ * 0.03 + time * 0.01) % 0.5, // Hue cycle for emissive - same hue range
            0.4, // Saturation - reduced for subtle emissive
            0.05  // Lightness - very dark emissive
        );


        renderer.render(scene, camera);
    };

    animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
