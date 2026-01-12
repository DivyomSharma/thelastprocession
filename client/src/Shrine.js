/**
 * THE LAST PROCESSION - Shrine
 * Interactive shrine objects that must be lit during the ritual
 */

import * as THREE from 'three';

export class Shrine {
    constructor(scene, data) {
        this.scene = scene;
        this.id = data.id;
        this.name = data.name;
        this.position = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );

        // State
        this.isLit = data.lit || false;
        this.progress = 0; // Interaction progress (0-1)

        // Visual elements
        this.group = new THREE.Group();
        this.flame = null;
        this.light = null;

        this.createMesh();
        this.scene.add(this.group);
    }

    /**
     * Create the shrine mesh
     */
    createMesh() {
        // Materials
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9,
            metalness: 0.1
        });

        const ironMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.6,
            metalness: 0.8
        });

        // Base stone pillar
        const baseGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8);
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.6;
        base.castShadow = true;
        base.receiveShadow = true;
        this.group.add(base);

        // Stone top
        const topGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 8);
        const top = new THREE.Mesh(topGeometry, stoneMaterial);
        top.position.y = 1.3;
        top.castShadow = true;
        this.group.add(top);

        // Fire bowl (iron)
        const bowlGeometry = new THREE.CylinderGeometry(0.35, 0.25, 0.2, 12);
        const bowl = new THREE.Mesh(bowlGeometry, ironMaterial);
        bowl.position.y = 1.5;
        bowl.castShadow = true;
        this.group.add(bowl);

        // Bowl inner (darker)
        const innerGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.15, 12);
        const innerMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 1.0
        });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.position.y = 1.52;
        this.group.add(inner);

        // Decorative runes on base
        this.addRunes();

        // Create flame (hidden initially)
        this.createFlame();

        // Position the group
        this.group.position.copy(this.position);

        // If already lit, show flame
        if (this.isLit) {
            this.showFlame();
        }
    }

    /**
     * Add decorative runes to the base
     */
    addRunes() {
        const runeGeometry = new THREE.PlaneGeometry(0.15, 0.3);
        const runeMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 4; i++) {
            const rune = new THREE.Mesh(runeGeometry, runeMaterial);
            const angle = (i / 4) * Math.PI * 2;
            rune.position.x = Math.sin(angle) * 0.61;
            rune.position.z = Math.cos(angle) * 0.61;
            rune.position.y = 0.6;
            rune.rotation.y = -angle;
            this.group.add(rune);
        }
    }

    /**
     * Create the flame elements
     */
    createFlame() {
        // Flame group
        this.flameGroup = new THREE.Group();
        this.flameGroup.position.y = 1.6;
        this.flameGroup.visible = false;

        // Main flame cone
        const flameGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b35,
            transparent: true,
            opacity: 0.9
        });
        this.flame = new THREE.Mesh(flameGeometry, flameMaterial);
        this.flame.position.y = 0.2;
        this.flameGroup.add(this.flame);

        // Inner flame (brighter)
        const innerFlameGeometry = new THREE.ConeGeometry(0.08, 0.3, 6);
        const innerFlameMaterial = new THREE.MeshBasicMaterial({
            color: 0xffa500
        });
        const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
        innerFlame.position.y = 0.15;
        this.flameGroup.add(innerFlame);

        // Point light
        this.light = new THREE.PointLight(0xff6b35, 0, 15);
        this.light.position.y = 0.4;
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 512;
        this.light.shadow.mapSize.height = 512;
        this.flameGroup.add(this.light);

        this.group.add(this.flameGroup);
    }

    /**
     * Show the flame (animate in)
     */
    showFlame() {
        this.flameGroup.visible = true;
        this.light.intensity = 1.5;
    }

    /**
     * Light the shrine (called when server confirms)
     */
    light() {
        this.isLit = true;
        this.progress = 0;
        this.showFlame();

        // Play lighting animation
        this.animateLighting();
    }

    /**
     * Animate the shrine lighting
     */
    animateLighting() {
        // Flash effect
        const originalIntensity = this.light.intensity;
        this.light.intensity = 5;

        // Animate back to normal
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / 500, 1);
            this.light.intensity = 5 - (5 - originalIntensity) * t;

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    /**
     * Update each frame
     */
    update(delta) {
        if (!this.isLit) return;

        // Animate flame
        const time = Date.now() * 0.003;

        if (this.flame) {
            // Flickering scale
            this.flame.scale.y = 1 + Math.sin(time * 3) * 0.15;
            this.flame.scale.x = 1 + Math.cos(time * 2) * 0.1;
            this.flame.scale.z = 1 + Math.sin(time * 2.5) * 0.1;

            // Slight position wobble
            this.flame.position.x = Math.sin(time * 4) * 0.02;
            this.flame.position.z = Math.cos(time * 3) * 0.02;
        }

        // Light intensity flicker
        if (this.light) {
            this.light.intensity = 1.5 + Math.sin(time * 5) * 0.3;
        }
    }

    /**
     * Get distance to a position
     */
    getDistanceTo(position) {
        return this.position.distanceTo(position);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.scene.remove(this.group);

        this.group.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                child.material.dispose();
            }
        });
    }
}
