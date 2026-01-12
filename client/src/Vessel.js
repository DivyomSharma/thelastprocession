/**
 * THE LAST PROCESSION - Vessel
 * The sacred vessel that must be carried to the altar
 */

import * as THREE from 'three';

export class Vessel {
    constructor(scene, position) {
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, position.y, position.z);

        // State
        this.isCarried = false;
        this.carrier = null;
        this.isPlaced = false;

        // Create mesh
        this.createMesh();
        this.scene.add(this.group);
    }

    /**
     * Create the vessel mesh
     */
    createMesh() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // Materials
        const clayMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,
            roughness: 0.8,
            metalness: 0.1
        });

        const ashMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 1.0,
            metalness: 0.0
        });

        // Main vessel body (urn shape)
        const bodyPoints = [];
        bodyPoints.push(new THREE.Vector2(0, 0));
        bodyPoints.push(new THREE.Vector2(0.12, 0));
        bodyPoints.push(new THREE.Vector2(0.18, 0.05));
        bodyPoints.push(new THREE.Vector2(0.15, 0.15));
        bodyPoints.push(new THREE.Vector2(0.12, 0.25));
        bodyPoints.push(new THREE.Vector2(0.08, 0.30));
        bodyPoints.push(new THREE.Vector2(0.06, 0.32));
        bodyPoints.push(new THREE.Vector2(0, 0.32));

        const bodyGeometry = new THREE.LatheGeometry(bodyPoints, 16);
        const body = new THREE.Mesh(bodyGeometry, clayMaterial);
        body.castShadow = true;
        this.group.add(body);

        // Ash contents (visible at top)
        const ashGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
        const ash = new THREE.Mesh(ashGeometry, ashMaterial);
        ash.position.y = 0.30;
        this.group.add(ash);

        // Decorative bands
        const bandGeometry = new THREE.TorusGeometry(0.13, 0.01, 8, 16);
        const bandMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.7
        });

        const band1 = new THREE.Mesh(bandGeometry, bandMaterial);
        band1.position.y = 0.1;
        band1.rotation.x = Math.PI / 2;
        this.group.add(band1);

        const band2 = new THREE.Mesh(bandGeometry, bandMaterial);
        band2.position.y = 0.2;
        band2.rotation.x = Math.PI / 2;
        this.group.add(band2);

        // Subtle glow effect (particle or emissive)
        this.createGlow();
    }

    /**
     * Create subtle glow around vessel
     */
    createGlow() {
        const glowGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xc9a227,
            transparent: true,
            opacity: 0.1
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.position.y = 0.15;
        this.group.add(this.glow);
    }

    /**
     * Attach vessel to a carrier (player)
     */
    attachTo(carrier) {
        this.isCarried = true;
        this.carrier = carrier;

        // Remove from scene (will be rendered relative to carrier)
        // Actually, keep in scene but update position each frame
    }

    /**
     * Detach vessel from carrier
     */
    detach() {
        this.isCarried = false;
        this.carrier = null;
    }

    /**
     * Drop vessel at a position
     */
    dropAt(position) {
        this.detach();
        this.position.set(position.x, 0.15, position.z);
        this.group.position.copy(this.position);
    }

    /**
     * Place vessel at the altar
     */
    placeAtAltar(altarPosition) {
        this.detach();
        this.isPlaced = true;

        // Position on altar
        this.position.set(altarPosition.x, altarPosition.y + 1.7, altarPosition.z);
        this.group.position.copy(this.position);

        // Enhance glow
        this.glow.material.opacity = 0.3;
    }

    /**
     * Update each frame
     */
    update(delta, localPlayer) {
        // Follow carrier if being carried
        if (this.isCarried && this.carrier) {
            // Position in front of carrier
            let carrierPos;
            let carrierRotY;

            if (this.carrier === localPlayer) {
                // Local player - position in front of camera view
                carrierPos = localPlayer.position;
                carrierRotY = localPlayer.rotation.y;

                // Offset down and forward
                const offset = new THREE.Vector3(0, -0.4, -0.5);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carrierRotY);

                this.group.position.set(
                    carrierPos.x + offset.x,
                    carrierPos.y + offset.y,
                    carrierPos.z + offset.z
                );
            } else {
                // Remote player
                carrierPos = this.carrier.currentPosition;
                carrierRotY = this.carrier.currentRotation;

                // Position in front of character
                const offset = new THREE.Vector3(0, 0.8, 0.3);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carrierRotY);

                this.group.position.set(
                    carrierPos.x + offset.x,
                    offset.y,
                    carrierPos.z + offset.z
                );
            }
        }

        // Animate glow
        const time = Date.now() * 0.001;
        if (this.glow) {
            this.glow.material.opacity = 0.1 + Math.sin(time * 2) * 0.05;
            this.glow.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        }

        // Bob slightly when on ground
        if (!this.isCarried && !this.isPlaced) {
            this.group.position.y = this.position.y + Math.sin(time * 2) * 0.02;
        }
    }

    /**
     * Get distance to a position
     */
    getDistanceTo(position) {
        return this.group.position.distanceTo(position);
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
