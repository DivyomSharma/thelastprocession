/**
 * THE LAST PROCESSION - Environment
 * Atmospheric effects: lighting, fog, skybox
 */

import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;

        this.setupLighting();
        this.setupSky();
        this.setupFog();
    }

    /**
     * Set up scene lighting
     */
    setupLighting() {
        // Ambient light (dim moonlight)
        this.ambientLight = new THREE.AmbientLight(0x202030, 0.3);
        this.scene.add(this.ambientLight);

        // Directional light (moon)
        this.moonLight = new THREE.DirectionalLight(0x4040a0, 0.4);
        this.moonLight.position.set(20, 30, -10);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 2048;
        this.moonLight.shadow.mapSize.height = 2048;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 100;
        this.moonLight.shadow.camera.left = -50;
        this.moonLight.shadow.camera.right = 50;
        this.moonLight.shadow.camera.top = 50;
        this.moonLight.shadow.camera.bottom = -50;
        this.scene.add(this.moonLight);

        // Hemisphere light (sky/ground colors)
        this.hemiLight = new THREE.HemisphereLight(0x202040, 0x101008, 0.5);
        this.scene.add(this.hemiLight);
    }

    /**
     * Set up the sky/background
     */
    setupSky() {
        // Dark gradient sky using shader
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a15) },
                bottomColor: { value: new THREE.Color(0x1a1520) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);

        // Add some stars
        this.createStars();

        // Moon
        this.createMoon();
    }

    /**
     * Create star field
     */
    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 500;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            // Random position on hemisphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5; // Only upper hemisphere
            const radius = 350;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) + 50; // Above horizon
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.6
        });

        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }

    /**
     * Create moon
     */
    createMoon() {
        const moonGeometry = new THREE.SphereGeometry(8, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffee
        });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(100, 80, -150);
        this.scene.add(this.moon);

        // Moon glow
        const glowGeometry = new THREE.SphereGeometry(12, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x8080a0,
            transparent: true,
            opacity: 0.2
        });
        const moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        moonGlow.position.copy(this.moon.position);
        this.scene.add(moonGlow);
    }

    /**
     * Set up fog
     */
    setupFog() {
        // Exponential fog for horror atmosphere
        this.scene.fog = new THREE.FogExp2(0x0a0a0c, 0.015);
        this.baseFogDensity = 0.015;
    }

    /**
     * Update environment based on game state
     */
    update(delta, faith) {
        // Intensify fog as faith decreases
        const faithPercent = faith / 100;
        const maxFogDensity = 0.04;
        const minFogDensity = this.baseFogDensity;

        const targetDensity = minFogDensity + (maxFogDensity - minFogDensity) * (1 - faithPercent);
        this.scene.fog.density = THREE.MathUtils.lerp(
            this.scene.fog.density,
            targetDensity,
            delta * 0.5
        );

        // Dim lights as faith decreases
        const lightIntensity = 0.3 + faithPercent * 0.2;
        this.ambientLight.intensity = lightIntensity;

        // Tint fog red when faith is critical
        if (faith < 20) {
            const redTint = (20 - faith) / 20;
            this.scene.fog.color.setRGB(
                0.04 + redTint * 0.1,
                0.04 * (1 - redTint),
                0.05 * (1 - redTint)
            );
        } else {
            this.scene.fog.color.setHex(0x0a0a0c);
        }

        // Animate stars twinkling
        if (this.stars) {
            const time = Date.now() * 0.0005;
            this.stars.material.opacity = 0.5 + Math.sin(time) * 0.1;
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.sky) {
            this.sky.geometry.dispose();
            this.sky.material.dispose();
        }
        if (this.stars) {
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }
        if (this.moon) {
            this.moon.geometry.dispose();
            this.moon.material.dispose();
        }
    }
}
