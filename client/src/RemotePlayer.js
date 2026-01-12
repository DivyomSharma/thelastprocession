/**
 * THE LAST PROCESSION - Remote Player
 * Visual representation of other players in the game
 */

import * as THREE from 'three';

export class RemotePlayer {
    constructor(scene, playerData) {
        this.scene = scene;
        this.id = playerData.id;
        this.name = playerData.name;

        // Position interpolation
        this.currentPosition = new THREE.Vector3(
            playerData.position?.x || 0,
            playerData.position?.y || 1.6,
            playerData.position?.z || 0
        );
        this.targetPosition = this.currentPosition.clone();
        this.currentRotation = playerData.rotation?.y || 0;
        this.targetRotation = this.currentRotation;

        // Interpolation settings
        this.lerpFactor = 10; // Higher = faster interpolation

        // Create visual representation
        this.createMesh();
        this.createNameLabel();
    }

    /**
     * Create the player mesh (hooded villager)
     */
    createMesh() {
        // Group for all player parts
        this.group = new THREE.Group();
        this.group.position.copy(this.currentPosition);
        this.group.position.y = 0; // Base at ground

        // Materials
        const robeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2520,
            roughness: 0.9,
            metalness: 0.0
        });

        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xa08060,
            roughness: 0.8,
            metalness: 0.0
        });

        // Body (robe)
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.4, 1.4, 8);
        const body = new THREE.Mesh(bodyGeometry, robeMaterial);
        body.position.y = 0.7;
        body.castShadow = true;
        this.group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.18, 8, 8);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.y = 1.55;
        head.castShadow = true;
        this.group.add(head);

        // Hood
        const hoodGeometry = new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hood = new THREE.Mesh(hoodGeometry, robeMaterial);
        hood.position.y = 1.55;
        hood.rotation.x = Math.PI * 0.1;
        hood.castShadow = true;
        this.group.add(hood);

        // Arms (simplified)
        const armGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);

        const leftArm = new THREE.Mesh(armGeometry, robeMaterial);
        leftArm.position.set(-0.35, 0.9, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        this.group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, robeMaterial);
        rightArm.position.set(0.35, 0.9, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        this.group.add(rightArm);

        // Add torch placeholder (visible light source)
        this.torch = this.createTorch();
        this.torch.position.set(0.4, 0.8, 0.2);
        this.group.add(this.torch);

        this.scene.add(this.group);
    }

    /**
     * Create a simple torch with light
     */
    createTorch() {
        const torchGroup = new THREE.Group();

        // Torch handle
        const handleGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3520,
            roughness: 0.9
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        torchGroup.add(handle);

        // Flame (emissive geometry)
        const flameGeometry = new THREE.ConeGeometry(0.06, 0.15, 6);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b35
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 0.25;
        torchGroup.add(flame);

        // Point light
        const light = new THREE.PointLight(0xff6b35, 0.8, 8);
        light.position.y = 0.3;
        light.castShadow = false; // Save performance
        torchGroup.add(light);

        return torchGroup;
    }

    /**
     * Create floating name label
     */
    createNameLabel() {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Draw text
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'bold 32px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.name, canvas.width / 2, canvas.height / 2);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        this.nameSprite = new THREE.Sprite(material);
        this.nameSprite.scale.set(1.5, 0.375, 1);
        this.nameSprite.position.y = 2;
        this.group.add(this.nameSprite);
    }

    /**
     * Set target position for interpolation
     */
    setTargetPosition(position, rotation) {
        this.targetPosition.set(position.x, position.y, position.z);
        this.targetRotation = rotation.y;
    }

    /**
     * Update each frame
     */
    update(delta) {
        // Interpolate position
        this.currentPosition.lerp(this.targetPosition, this.lerpFactor * delta);
        this.group.position.x = this.currentPosition.x;
        this.group.position.z = this.currentPosition.z;

        // Keep at ground level
        this.group.position.y = 0;

        // Interpolate rotation
        let rotationDiff = this.targetRotation - this.currentRotation;

        // Handle wrap-around
        if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;

        this.currentRotation += rotationDiff * this.lerpFactor * delta;
        this.group.rotation.y = this.currentRotation;

        // Animate flame flicker
        if (this.torch) {
            const flame = this.torch.children[1];
            if (flame) {
                flame.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.2;
            }
        }
    }

    /**
     * Get distance to a position
     */
    getDistanceTo(position) {
        return this.currentPosition.distanceTo(position);
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Remove from scene
        this.scene.remove(this.group);

        // Dispose geometries and materials
        this.group.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                child.material.dispose();
            }
        });
    }
}
