import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.min.js';

export function initThreeScene() {
    const canvas = document.getElementById('background-effect');
    if (!canvas) {
        console.error("Canvas element with id 'background-effect' not found!");
        return;
    }

    // Center the canvas
    canvas.style.position = 'absolute';
    canvas.style.top = '50%';
    canvas.style.left = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setClearColor(0x000000);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100; // Adjusted camera position

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

    const geometry = new THREE.PlaneGeometry(400, 400, 100, 100); // увеличен geometry size
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('lightblue'),
        emissive: new THREE.Color('darkblue').multiplyScalar(0.1),
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.2,
        transparent: false,
        opacity: 1.0
    });
    const waveMesh = new THREE.Mesh(geometry, material);
    waveMesh.rotation.x = -Math.PI / 2;
    scene.add(waveMesh);

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
        // Peaceful color gradient
        const baseColor = new THREE.Color(0.6, 0.8, 0.8); // Soft blue-green
        const timeOffset = time * 0.2; // Offset for color animation
        const colorVariation = 0.1 * (Math.sin(timeOffset) + 1); // Gentle color variation

        waveMesh.material.color.lerp(new THREE.Color(baseColor.r + colorVariation, baseColor.g, baseColor.b + colorVariation), 0.1);
        waveMesh.material.emissive.lerp(new THREE.Color(0, 0.1 * colorVariation, 0.1 * colorVariation), 0.1);


        let waveAmplitude = 0.5; // Reduced wave amplitude for subtle waves
        let waveFrequency = 0.2; // Slightly increased frequency
        let waveSpeed = 0.5; // Reduced wave speed for slower animation
        const timeSlow = time * 0.5; // Slower time multiplier
        let maxZ = 0;

        for (let i = 0; i < geometry.attributes.position.count; i++) {
            let x = geometry.attributes.position.getX(i);
            let y = geometry.attributes.position.getY(i);
            let z = 0;

            // Layer 1
            z += waveAmplitude * Math.sin(waveFrequency * x + timeSlow);
            z += waveAmplitude * Math.cos(waveFrequency * y + timeSlow);

            // Layer 2
            waveAmplitude *= 0.5;
            waveFrequency *= 2;
            z += waveAmplitude * Math.sin(waveFrequency * x + timeSlow * 0.5);
            z += waveAmplitude * Math.cos(waveFrequency * y + timeSlow * 0.5);


            if (isNaN(z)) {
                z = 0; // Reset z to 0 if NaN is encountered
                console.error("NaN detected in wave calculation, resetting z to 0");
            }


            geometry.attributes.position.setZ(i, z);
            maxZ = Math.max(maxZ, Math.abs(z));
        }
        geometry.attributes.position.needsUpdate = true;


        renderer.render(scene, camera);
    };

    animate();
}

document.addEventListener('DOMContentLoaded', initThreeScene);
