/**
 * THE LAST PROCESSION - Player Controller
 * First-person camera and movement controls
 */

import * as THREE from 'three';

export class Player {
    constructor(camera, map) {
        this.camera = camera;
        this.map = map;

        // Position and rotation (controlled by camera)
        this.position = camera.position;
        this.rotation = { y: 0 };
        this.pitch = 0;

        // Movement
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 5;
        this.sprintSpeed = 8;
        this.jumpForce = 6;
        this.gravity = 15;
        this.isGrounded = true;
        this.isSprinting = false;
        this.enabled = false;

        // Carrying state
        this.carrying = null;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            interact: false
        };

        // Mouse sensitivity
        this.mouseSensitivity = 0.002;

        // Collision
        this.playerRadius = 0.4;
        this.playerHeight = 1.6;

        // Set up input handlers
        this.setupInput();
    }

    /**
     * Set up keyboard and mouse input
     */
    setupInput() {
        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    /**
     * Handle key down
     */
    onKeyDown(event) {
        if (!this.enabled) return;

        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
                break;
            case 'KeyE':
                this.keys.interact = true;
                // Dispatch interaction event
                window.dispatchEvent(new CustomEvent('player-interact', {
                    detail: { held: true }
                }));
                break;
            case 'KeyF':
                // Transfer vessel
                window.dispatchEvent(new CustomEvent('player-transfer'));
                break;
            case 'Tab':
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('show-player-list'));
                break;
        }
    }

    /**
     * Handle key up
     */
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                break;
            case 'KeyE':
                this.keys.interact = false;
                break;
            case 'Tab':
                window.dispatchEvent(new CustomEvent('hide-player-list'));
                break;
        }
    }

    /**
     * Handle mouse movement
     */
    onMouseMove(event) {
        if (!this.enabled) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Horizontal rotation (yaw)
        this.rotation.y -= movementX * this.mouseSensitivity;

        // Vertical rotation (pitch)
        this.pitch -= movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

        // Apply rotation to camera
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.rotation.y;
        this.camera.rotation.x = this.pitch;
    }

    /**
     * Update player each frame
     */
    update(delta) {
        if (!this.enabled) return;

        // Calculate movement direction
        const moveDirection = new THREE.Vector3();

        if (this.keys.forward) moveDirection.z -= 1;
        if (this.keys.backward) moveDirection.z += 1;
        if (this.keys.left) moveDirection.x -= 1;
        if (this.keys.right) moveDirection.x += 1;

        // Normalize diagonal movement
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }

        // Apply rotation to movement
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        // Calculate speed
        this.isSprinting = this.keys.sprint && !this.carrying;
        const currentSpeed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;

        // Slow down if carrying vessel
        const carryPenalty = this.carrying ? 0.7 : 1.0;

        // Set horizontal velocity
        this.velocity.x = moveDirection.x * currentSpeed * carryPenalty;
        this.velocity.z = moveDirection.z * currentSpeed * carryPenalty;

        // Gravity
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * delta;
        } else if (this.keys.jump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }

        // Calculate new position
        const newPos = new THREE.Vector3(
            this.position.x + this.velocity.x * delta,
            this.position.y + this.velocity.y * delta,
            this.position.z + this.velocity.z * delta
        );

        // Collision detection
        if (this.map) {
            newPos.copy(this.checkCollisions(newPos));
        }

        // Ground check
        const groundHeight = this.getGroundHeight(newPos);
        if (newPos.y <= groundHeight + this.playerHeight) {
            newPos.y = groundHeight + this.playerHeight;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Apply position
        this.position.copy(newPos);

        // Keep continuous interaction check
        if (this.keys.interact) {
            window.dispatchEvent(new CustomEvent('player-interact', {
                detail: { held: true }
            }));
        }
    }

    /**
     * Check collisions with map geometry
     */
    checkCollisions(newPos) {
        if (!this.map || !this.map.colliders) {
            return newPos;
        }

        const result = newPos.clone();
        const origin = this.position.clone();
        origin.y -= 0.5; // Check at chest height

        // Check collisions with each collider
        for (const collider of this.map.colliders) {
            const box = new THREE.Box3().setFromObject(collider);

            // Expand box by player radius
            box.min.x -= this.playerRadius;
            box.min.z -= this.playerRadius;
            box.max.x += this.playerRadius;
            box.max.z += this.playerRadius;

            // Check if new position would be inside
            if (result.x >= box.min.x && result.x <= box.max.x &&
                result.z >= box.min.z && result.z <= box.max.z &&
                result.y >= box.min.y && result.y <= box.max.y + this.playerHeight) {

                // Push out of collision
                const dx = result.x - (box.min.x + box.max.x) / 2;
                const dz = result.z - (box.min.z + box.max.z) / 2;

                if (Math.abs(dx) > Math.abs(dz)) {
                    // Push on X axis
                    result.x = dx > 0 ? box.max.x + 0.01 : box.min.x - 0.01;
                } else {
                    // Push on Z axis
                    result.z = dz > 0 ? box.max.z + 0.01 : box.min.z - 0.01;
                }
            }
        }

        return result;
    }

    /**
     * Get ground height at position
     */
    getGroundHeight(pos) {
        // For now, simple flat ground
        // TODO: Implement terrain height map
        return 0;
    }

    /**
     * Enable/disable player controls
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Get player looking direction
     */
    getLookDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        return direction;
    }

    /**
     * Clean up
     */
    dispose() {
        // Remove event listeners would go here if we stored references
    }
}
