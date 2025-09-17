// js/managers/PhysicsManager.js
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export default class PhysicsManager {
    constructor(scene, editor) {
        this.editor = editor;
        this.scene = scene;
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });

        this.objects = []; // To map { mesh, body }
        this.player = null; // To hold player-specific physics data
    }
    
    // Add a physics body for a Three.js mesh
    add(mesh) {
        if (!mesh) return;

        const physicsProps = mesh.userData.physics || { isDynamic: false, mass: 0 };
        const isDynamic = physicsProps.isDynamic;
        const mass = isDynamic ? physicsProps.mass || 1 : 0;

        let shape;
        const box = new THREE.Box3().setFromObject(mesh, true);
        const size = box.getSize(new THREE.Vector3());
        
        // Determine shape based on geometry type
        const geoType = mesh.geometry ? mesh.geometry.type : 'BoxGeometry';
        
        if (geoType.includes('Sphere')) {
            const radius = size.x / 2;
            shape = new CANNON.Sphere(radius);
        } else if (geoType.includes('Plane')) {
            shape = new CANNON.Plane();
        } else { // Default to Box for everything else (Cube, GLTF models, etc.)
            shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        }

        const body = new CANNON.Body({
            mass: mass,
            shape: shape,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            quaternion: new CANNON.Quaternion(mesh.quaternion.x, mesh.quaternion.y, mesh.quaternion.z, mesh.quaternion.w)
        });
        
        if (geoType.includes('Plane')) {
            // Cannon.js planes are infinite and defined by a normal. Three.js planes are visual meshes.
            // We need to rotate the cannon plane to match the visual one.
            body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        }

        this.world.addBody(body);
        this.objects.push({ mesh, body });
    }

    // Remove the physics body associated with a mesh
    remove(mesh) {
        const entry = this.objects.find(obj => obj.mesh === mesh);
        if (entry) {
            this.world.removeBody(entry.body);
            this.objects = this.objects.filter(obj => obj.mesh !== mesh);
        }
    }
    
    // Clear all bodies from the world
    clear() {
        this.objects.forEach(({ body }) => this.world.removeBody(body));
        this.objects = [];
        this.player = null;
        // Remove any temporary ground meshes added during play
        try {
            const leftovers = this.scene.children.filter(c => c.userData && c.userData.__tempGround);
            leftovers.forEach(mesh => {
                if (mesh.parent) mesh.parent.remove(mesh);
            });
        } catch (e) {}
    }
    
    // Initialize physics for all relevant objects in the scene
    initFromScene() {
        this.clear();
        console.log("Initializing physics from scene...");
        this.scene.children.forEach(child => {
            console.log("Checking object:", child.name, "isEditorObject:", child.userData.isEditorObject);
            // Skip helpers and Player_Start marker from physics bodies
            if (child.userData.isEditorObject && !child.userData.isHelper && !child.userData.isPlayerStart) {
                this.add(child);
                console.log("Added physics body for:", child.name);
            }
        });
        console.log("Physics initialization complete. Total objects:", this.objects.length);
    }
    
    // Initialize player controller
    initPlayer(playerStartObject, camera) {
        if (!playerStartObject) {
            console.warn("Player Start object not found, cannot initialize player.");
            return;
        }
        
        const shape = new CANNON.Sphere(0.5); // Player collision shape
        const body = new CANNON.Body({
            mass: 70, // Player mass in kg
            shape: shape,
            position: new CANNON.Vec3().copy(playerStartObject.position),
            fixedRotation: true, // Prevents player from tipping over
            material: new CANNON.Material({ friction: 0, restitution: 0 })
        });
        body.linearDamping = 0.05; // reduced damping to keep movement responsive
        
        this.world.addBody(body);
        this.player = {
            body,
            camera,
            velocity: new THREE.Vector3(),
            canJump: false
        };
        
        // Collision listener to detect if player is on the ground
        body.addEventListener('collide', (event) => {
            // Use contact normal in world frame; ensure it's pointing away from player
            const contact = event.contact;
            let normal = contact.ni || contact.n;
            if (!normal) return;
            // If the normal is not pointing up relative to player, invert
            const up = new CANNON.Vec3(0, 1, 0);
            if (normal.dot(up) < 0) normal = normal.scale(-1);
            if (normal.y > 0.4) {
                this.player.canJump = true;
            }
        });
    }
    
    // Update player movement based on input state
    updatePlayer(delta, moveState) {
        if (!this.player) {
            console.warn("Player not initialized in updatePlayer");
            return;
        }
        
        // Check if scene has Player Start to get settings
        let moveSpeed = 11.5; // slightly faster base walk
        let runSpeed = 18.0;  // slightly faster run
        const playerStart = this.scene.children.find(o => o.userData && o.userData.isPlayerStart);
        if (playerStart && playerStart.userData && playerStart.userData.playerSettings) {
            moveSpeed = playerStart.userData.playerSettings.moveSpeed || moveSpeed;
            runSpeed = playerStart.userData.playerSettings.runSpeed || runSpeed;
        }
        // Make normal walk speed equal to run speed
        moveSpeed = runSpeed;
        const speed = moveState.run ? runSpeed : moveSpeed;
        const jumpVelocity = 5.5; // tuned so movement feels faster than jump
        
        // Compute horizontal movement vectors from camera orientation
        const forward = new THREE.Vector3();
        this.player.camera.getWorldDirection(forward);
        forward.y = 0; forward.normalize();
        // Use camera's world X axis for right to keep left/right consistent even with camera flips
        const right = new THREE.Vector3().setFromMatrixColumn(this.player.camera.matrixWorld, 0);
        right.y = 0; right.normalize();
        // Fallback if one of vectors degenerated (e.g., looking straight up/down)
        if (!isFinite(right.x) || !isFinite(right.z) || right.lengthSq() < 1e-6) {
            const upVec = new THREE.Vector3(0, 1, 0);
            right.copy(new THREE.Vector3().crossVectors(upVec, forward)).normalize();
        }
 
        const moveVec = new THREE.Vector3();
        if (moveState.forward) moveVec.add(forward);
        if (moveState.backward) moveVec.sub(forward);
        if (moveState.right) moveVec.add(right);
        if (moveState.left) moveVec.sub(right);
        
        if (moveVec.lengthSq() > 0) {
            moveVec.normalize().multiplyScalar(speed);
            this.player.body.velocity.x = moveVec.x;
            this.player.body.velocity.z = moveVec.z;
        } else {
            // no input: stop horizontal movement
            this.player.body.velocity.x = 0;
            this.player.body.velocity.z = 0;
        }
        
        if (moveState.jump && this.player.canJump) {
            this.player.body.velocity.y = jumpVelocity;
            this.player.canJump = false;
        }
        
        // Update camera position to follow the physics body
        this.player.camera.position.copy(this.player.body.position);
        this.player.camera.position.y += 0.8; // Camera height offset
    }

    // Main update loop for the physics world
    update(delta) {
        this.world.step(1 / 60, delta, 3);
        
        // Sync visual objects with physics bodies
        for (const { mesh, body } of this.objects) {
             if (body.mass > 0) { // only update dynamic objects
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
            }
        }
    }
}