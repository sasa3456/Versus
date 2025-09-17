// js/PlayerController.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export default class PlayerController {
    constructor(camera, physicsManager, domElement, playerStartData) {
        this.camera = camera;
        this.physicsManager = physicsManager;
        this.domElement = domElement;
        
        // Get settings from data, with defaults
        this.settings = playerStartData.playerSettings || {};
        this.settings.moveSpeed ??= 5.0;
        this.settings.runSpeed ??= 8.0;
        this.settings.jumpHeight ??= 5.0;
        this.settings.cameraHeight ??= 1.7;
        this.settings.fov ??= 75;
        this.settings.mouseSensitivity ??= 0.002;
        this.settings.playerMass ??= 70;
        this.settings.playerHeight ??= 1.8;
        this.settings.playerRadius ??= 0.4;
        
        this.camera.fov = this.settings.fov;
        this.camera.updateProjectionMatrix();

        this.moveState = { forward: false, backward: false, left: false, right: false, run: false };
        this.canJump = false;

        this.initControls();
        this.initPhysicsBody(playerStartData.position);
        this.initEventListeners();
    }

    initControls() {
        this.controls = new PointerLockControls(this.camera, this.domElement);
        this.domElement.addEventListener('click', () => {
            this.controls.lock();
        });
    }

    initPhysicsBody(startPosition) {
        const shape = new CANNON.Capsule(this.settings.playerRadius, this.settings.playerHeight - 2 * this.settings.playerRadius);
        
        this.body = new CANNON.Body({
            mass: this.settings.playerMass,
            position: new CANNON.Vec3(startPosition.x, startPosition.y + this.settings.playerHeight / 2, startPosition.z),
            fixedRotation: true,
            material: new CANNON.Material({ friction: 0, restitution: 0 })
        });
        
        // Adjust shape orientation for upright capsule
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        this.body.addShape(shape, new CANNON.Vec3(), q);

        this.physicsManager.world.addBody(this.body);

        this.body.addEventListener('collide', (event) => {
            const contactNormal = event.contact.ni;
            if (contactNormal.y > 0.5) { // Check if contact is from below
                this.canJump = true;
            }
        });
    }

    initEventListeners() {
        document.addEventListener('keydown', (e) => this.onKey(e.key.toLowerCase(), true));
        document.addEventListener('keyup', (e) => this.onKey(e.key.toLowerCase(), false));
    }

    onKey(key, isPressed) {
        switch(key) {
            case 'w': this.moveState.forward = isPressed; break;
            case 's': this.moveState.backward = isPressed; break;
            case 'a': this.moveState.left = isPressed; break;
            case 'd': this.moveState.right = isPressed; break;
            case 'shift': this.moveState.run = isPressed; break;
            case ' ': if (isPressed && this.canJump) this.jump(); break;
        }
    }
    
    jump() {
        this.canJump = false;
        this.body.velocity.y = this.settings.jumpHeight;
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        const speed = this.moveState.run ? this.settings.runSpeed : this.settings.moveSpeed;
        
        const inputVelocity = new THREE.Vector3();
        if (this.moveState.forward) inputVelocity.z = -speed;
        if (this.moveState.backward) inputVelocity.z = speed;
        if (this.moveState.left) inputVelocity.x = -speed;
        if (this.moveState.right) inputVelocity.x = speed;

        // Apply camera rotation to movement vector so we move in the direction we're looking
        inputVelocity.applyQuaternion(this.camera.quaternion);
        
        this.body.velocity.x = inputVelocity.x;
        this.body.velocity.z = inputVelocity.z;
        
        // Update camera to follow the physics body
        this.camera.position.copy(this.body.position);
        this.camera.position.y += this.settings.cameraHeight - (this.settings.playerHeight / 2); // Adjust camera height
    }
}