/**
 * THE LAST PROCESSION - Map
 * Hollowmere Village map geometry and collision
 */

import * as THREE from 'three';

export class Map {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];

        this.createGround();
        this.createVillage();
        this.createForest();
        this.createPaths();
        this.createHilltop();
    }

    /**
     * Create the ground plane
     */
    createGround() {
        // Main ground
        const groundGeometry = new THREE.PlaneGeometry(150, 150);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3020,
            roughness: 1.0,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Mud/dirt patches near paths
        this.addGroundDetails();
    }

    /**
     * Add ground texture variation
     */
    addGroundDetails() {
        const patchMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3525,
            roughness: 1.0
        });

        // Scatter some darker patches
        for (let i = 0; i < 30; i++) {
            const size = 2 + Math.random() * 4;
            const patchGeometry = new THREE.CircleGeometry(size, 8);
            const patch = new THREE.Mesh(patchGeometry, patchMaterial);
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(
                (Math.random() - 0.5) * 100,
                0.01,
                (Math.random() - 0.5) * 100
            );
            patch.receiveShadow = true;
            this.scene.add(patch);
        }
    }

    /**
     * Create village structures
     */
    createVillage() {
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3a2a,
            roughness: 0.9
        });

        const roofMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.95
        });

        // Village square area (central spawn)
        this.createCentralSquare();

        // Church (Shrine 1 location) - West
        this.createBuilding(-20, 0, 8, 6, 7, buildingMaterial, roofMaterial, 'church');

        // Well (Shrine 2 location) - North
        this.createWell(0, 18);

        // Mill (Shrine 3 location) - East
        this.createBuilding(18, 0, 6, 5, 6, buildingMaterial, roofMaterial, 'mill');

        // Graveyard area (Shrine 4 location) - South
        this.createGraveyard(0, -18);

        // Additional cottages
        this.createBuilding(-8, 8, 4, 4, 4, buildingMaterial, roofMaterial);
        this.createBuilding(8, 8, 4, 4, 4, buildingMaterial, roofMaterial);
        this.createBuilding(-8, -8, 4, 4, 4, buildingMaterial, roofMaterial);
        this.createBuilding(10, -8, 5, 4, 4, buildingMaterial, roofMaterial);
    }

    /**
     * Create central village square
     */
    createCentralSquare() {
        // Cobblestone-like center
        const squareGeometry = new THREE.CircleGeometry(8, 16);
        const squareMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9
        });
        const square = new THREE.Mesh(squareGeometry, squareMaterial);
        square.rotation.x = -Math.PI / 2;
        square.position.y = 0.02;
        square.receiveShadow = true;
        this.scene.add(square);

        // Central post/marker
        const postGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.9
        });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 1;
        post.castShadow = true;
        this.scene.add(post);
    }

    /**
     * Create a simple building
     */
    createBuilding(x, z, width, depth, height, wallMaterial, roofMaterial, type = 'cottage') {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Walls
        const wallGeometry = new THREE.BoxGeometry(width, height, depth);
        const walls = new THREE.Mesh(wallGeometry, wallMaterial);
        walls.position.y = height / 2;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);
        this.colliders.push(walls);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(
            Math.max(width, depth) * 0.75,
            height * 0.5,
            4
        );
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = height + height * 0.25;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Church-specific additions
        if (type === 'church') {
            // Steeple
            const steepleGeometry = new THREE.ConeGeometry(1, 4, 4);
            const steeple = new THREE.Mesh(steepleGeometry, roofMaterial);
            steeple.position.y = height + 4;
            steeple.rotation.y = Math.PI / 4;
            steeple.castShadow = true;
            group.add(steeple);
        }

        // Mill-specific additions
        if (type === 'mill') {
            // Simple windmill blades representation
            const bladeGroup = new THREE.Group();
            bladeGroup.position.set(0, height * 0.7, depth / 2 + 0.1);

            for (let i = 0; i < 4; i++) {
                const bladeGeometry = new THREE.BoxGeometry(0.2, 3, 0.05);
                const bladeMaterial = new THREE.MeshStandardMaterial({
                    color: 0x5a4a3a
                });
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.rotation.z = (i / 4) * Math.PI * 2;
                blade.position.y = 1.5 * Math.cos(blade.rotation.z);
                blade.position.x = 1.5 * Math.sin(blade.rotation.z);
                bladeGroup.add(blade);
            }
            group.add(bladeGroup);
        }

        this.scene.add(group);
    }

    /**
     * Create the well structure
     */
    createWell(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Stone base
        const baseGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.8, 12);
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.9
        });
        const base = new THREE.Mesh(baseGeometry, stoneMaterial);
        base.position.y = 0.4;
        base.castShadow = true;
        group.add(base);
        this.colliders.push(base);

        // Inner dark circle (water)
        const waterGeometry = new THREE.CircleGeometry(0.9, 12);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.2
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.81;
        group.add(water);

        // Posts
        const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 6);
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3520,
            roughness: 0.9
        });

        const post1 = new THREE.Mesh(postGeometry, woodMaterial);
        post1.position.set(0.8, 1.8, 0);
        group.add(post1);

        const post2 = new THREE.Mesh(postGeometry, woodMaterial);
        post2.position.set(-0.8, 1.8, 0);
        group.add(post2);

        // Crossbeam
        const beamGeometry = new THREE.CylinderGeometry(0.06, 0.06, 2, 6);
        const beam = new THREE.Mesh(beamGeometry, woodMaterial);
        beam.rotation.z = Math.PI / 2;
        beam.position.y = 2.8;
        group.add(beam);

        this.scene.add(group);
    }

    /**
     * Create the graveyard
     */
    createGraveyard(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.95
        });

        // Gravestones
        const positions = [
            [-3, -2], [-1, -2], [1, -2], [3, -2],
            [-2, 0], [0, 0], [2, 0],
            [-3, 2], [-1, 2], [1, 2], [3, 2]
        ];

        positions.forEach(([gx, gz]) => {
            const height = 0.6 + Math.random() * 0.4;
            const width = 0.4 + Math.random() * 0.2;

            const stoneGeometry = new THREE.BoxGeometry(width, height, 0.15);
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.set(gx, height / 2, gz);
            stone.rotation.y = (Math.random() - 0.5) * 0.2;
            stone.rotation.z = (Math.random() - 0.5) * 0.1;
            stone.castShadow = true;
            group.add(stone);
        });

        // Fence around graveyard
        this.createFence(group, 8, 6);

        this.scene.add(group);
    }

    /**
     * Create a simple fence
     */
    createFence(parent, width, depth) {
        const fenceMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a,
            roughness: 0.9
        });

        const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
        const railGeometry = new THREE.BoxGeometry(2, 0.05, 0.05);

        // Create posts and rails along perimeter
        const hw = width / 2;
        const hd = depth / 2;

        const createFenceSection = (x1, z1, x2, z2) => {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.sqrt(dx * dx + dz * dz);
            const numPosts = Math.floor(length / 2);

            for (let i = 0; i <= numPosts; i++) {
                const t = i / numPosts;
                const post = new THREE.Mesh(postGeometry, fenceMaterial);
                post.position.set(
                    x1 + dx * t,
                    0.5,
                    z1 + dz * t
                );
                parent.add(post);
            }
        };

        createFenceSection(-hw, -hd, hw, -hd);
        createFenceSection(hw, -hd, hw, hd);
        createFenceSection(hw, hd, -hw, hd);
        createFenceSection(-hw, hd, -hw, -hd);
    }

    /**
     * Create forest areas
     */
    createForest() {
        // Forest Left (Shrine 5 area)
        this.createForestCluster(-28, 28, 15, 20);

        // Forest Right (Shrine 6 area)
        this.createForestCluster(28, 28, 15, 20);

        // Background forest (edges of map)
        this.createForestCluster(-50, 0, 20, 30);
        this.createForestCluster(50, 0, 20, 30);
        this.createForestCluster(0, -40, 30, 15);
    }

    /**
     * Create a cluster of trees
     */
    createForestCluster(centerX, centerZ, width, depth) {
        const treeCount = Math.floor((width * depth) / 15);

        for (let i = 0; i < treeCount; i++) {
            const x = centerX + (Math.random() - 0.5) * width;
            const z = centerZ + (Math.random() - 0.5) * depth;

            // Don't place trees on paths
            if (this.isOnPath(x, z)) continue;

            this.createTree(x, z);
        }
    }

    /**
     * Create a simple tree
     */
    createTree(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Trunk
        const trunkHeight = 3 + Math.random() * 2;
        const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, trunkHeight, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        group.add(trunk);
        this.colliders.push(trunk);

        // Foliage (bare/sparse for horror atmosphere)
        const branchCount = 3 + Math.floor(Math.random() * 3);
        const branchMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2520,
            roughness: 0.9
        });

        for (let i = 0; i < branchCount; i++) {
            const branchLength = 1 + Math.random() * 1.5;
            const branchGeometry = new THREE.CylinderGeometry(0.02, 0.05, branchLength, 4);
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);

            const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
            const heightOffset = trunkHeight * (0.5 + Math.random() * 0.4);

            branch.position.set(
                Math.sin(angle) * branchLength * 0.3,
                heightOffset,
                Math.cos(angle) * branchLength * 0.3
            );
            branch.rotation.z = Math.PI / 3 + Math.random() * 0.3;
            branch.rotation.y = angle;

            group.add(branch);
        }

        this.scene.add(group);
    }

    /**
     * Create path markings (blessed paths)
     */
    createPaths() {
        const pathMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a40,
            roughness: 0.95
        });

        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.9
        });

        // Path definitions (matching server's blessed paths)
        const paths = [
            { start: [0, 0], end: [-20, 0] },      // To church
            { start: [0, 0], end: [0, 20] },       // To well
            { start: [0, 0], end: [20, 0] },       // To mill
            { start: [0, 0], end: [0, -20] },      // To graveyard
            { start: [-20, 10], end: [-30, 30] },  // To forest left
            { start: [20, 10], end: [30, 30] },    // To forest right
            { start: [0, 25], end: [0, 50] }       // To hilltop
        ];

        paths.forEach(path => {
            this.createPathSegment(path.start, path.end, pathMaterial, stoneMaterial);
        });
    }

    /**
     * Create a path segment with markers
     */
    createPathSegment(start, end, pathMaterial, stoneMaterial) {
        const dx = end[0] - start[0];
        const dz = end[1] - start[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        // Path surface
        const pathGeometry = new THREE.PlaneGeometry(2, length);
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.rotation.z = -angle;
        path.position.set(
            start[0] + dx / 2,
            0.02,
            start[1] + dz / 2
        );
        this.scene.add(path);

        // Stone markers along path
        const numStones = Math.floor(length / 5);
        for (let i = 1; i < numStones; i++) {
            const t = i / numStones;
            const stoneGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6);
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);

            // Place on both sides of path
            const perpAngle = angle + Math.PI / 2;
            const offset = 1.2;

            const leftStone = stone.clone();
            leftStone.position.set(
                start[0] + dx * t + Math.sin(perpAngle) * offset,
                0.2,
                start[1] + dz * t + Math.cos(perpAngle) * offset
            );
            leftStone.castShadow = true;
            this.scene.add(leftStone);

            const rightStone = stone.clone();
            rightStone.position.set(
                start[0] + dx * t - Math.sin(perpAngle) * offset,
                0.2,
                start[1] + dz * t - Math.cos(perpAngle) * offset
            );
            rightStone.castShadow = true;
            this.scene.add(rightStone);
        }
    }

    /**
     * Create the hilltop area (final shrine)
     */
    createHilltop() {
        // Raised hill
        const hillGeometry = new THREE.ConeGeometry(12, 5, 16, 1, true);
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3020,
            roughness: 1.0
        });
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(0, -0.5, 50);
        hill.receiveShadow = true;
        this.scene.add(hill);

        // Flat top
        const topGeometry = new THREE.CircleGeometry(6, 16);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a4030,
            roughness: 1.0
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.rotation.x = -Math.PI / 2;
        top.position.set(0, 4.5, 50);
        top.receiveShadow = true;
        this.scene.add(top);

        // Standing stones around altar area
        this.createStandingStones(0, 50, 5);
    }

    /**
     * Create a circle of standing stones
     */
    createStandingStones(x, z, radius) {
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9
        });

        const numStones = 8;
        for (let i = 0; i < numStones; i++) {
            const angle = (i / numStones) * Math.PI * 2;
            const height = 2 + Math.random() * 1;
            const width = 0.5 + Math.random() * 0.3;

            const stoneGeometry = new THREE.BoxGeometry(width, height, 0.4);
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);

            stone.position.set(
                x + Math.sin(angle) * radius,
                4.5 + height / 2,
                z + Math.cos(angle) * radius
            );
            stone.rotation.y = -angle;
            stone.rotation.z = (Math.random() - 0.5) * 0.1;
            stone.castShadow = true;
            this.scene.add(stone);
        }
    }

    /**
     * Check if position is on a path
     */
    isOnPath(x, z) {
        // Simple check - refine based on actual path definitions
        const paths = [
            { minX: -2, maxX: 2, minZ: -25, maxZ: 55 },   // Main N-S
            { minX: -25, maxX: 25, minZ: -2, maxZ: 2 }    // Main E-W
        ];

        for (const path of paths) {
            if (x >= path.minX && x <= path.maxX &&
                z >= path.minZ && z <= path.maxZ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Would traverse and dispose all geometries/materials
        this.colliders = [];
    }
}
