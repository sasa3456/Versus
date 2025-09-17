// js/game.js
import * as THREE from 'three';
import SceneManager from './managers/SceneManager.js';
import PhysicsManager from './managers/PhysicsManager.js';
import PlayerController from './PlayerController.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class Game {
    constructor() {
        this.container = document.getElementById('game-viewport');
        if (!this.container) {
            console.error('Game container not found!');
            return;
        }
        
        this.clock = new THREE.Clock();
        this.gltfLoader = new GLTFLoader();

        this.init();
    }

    init() {
        this.sceneManager = new SceneManager(this.container);
        this.physicsManager = new PhysicsManager(this.sceneManager.scene);

        // Listen for the scene data from the main process
        window.electronAPI.onLoadScene((sceneData) => {
            this.loadScene(sceneData).then(() => {
                this.startGame();
            });
        });

        // Fallback: start rendering even if no scene is sent
        window.setTimeout(() => {
            if (!this.playerStartData) {
                this.startRenderOnly();
            }
        }, 500);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            const rect = this.container.getBoundingClientRect();
            this.sceneManager.resize(rect.width, rect.height);
        });
        resizeObserver.observe(this.container);
    }

    async loadScene(objectsData) {
        if (!Array.isArray(objectsData)) return;

        for (const objData of objectsData) {
            // We only care about visible objects, not lights or PlayerStart marker itself
            if (objData.isLight || objData.isPlayerStart) continue;

            let mesh;
            if (objData.isModel && objData.modelPath) {
                mesh = await this.loadModel(objData.modelPath);
            } else {
                const geo = this.createGeometry(objData.geometryType);
                const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                mesh = new THREE.Mesh(geo, mat);
            }
            
            if (!mesh) continue;

            mesh.position.set(objData.position.x, objData.position.y, objData.position.z);
            mesh.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
            mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
            
            // Assign physics properties before adding to physics manager
            mesh.userData.physics = objData.physics;

            this.sceneManager.scene.add(mesh);
            this.physicsManager.add(mesh);
        }
        
        // Find player start data to initialize player
        this.playerStartData = objectsData.find(d => d.isPlayerStart);
    }
    
    createGeometry(type) {
        switch(type) {
            case 'cube': return new THREE.BoxGeometry(1, 1, 1);
            case 'sphere': return new THREE.SphereGeometry(0.5, 32, 20);
            case 'plane': return new THREE.PlaneGeometry(10, 10);
            default: return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    loadModel(filePath) {
        return new Promise((resolve, reject) => {
             const modelUrl = `file://${filePath.replace(/\\/g, '/')}`;
             this.gltfLoader.load(modelUrl, 
                (gltf) => resolve(gltf.scene), 
                undefined, 
                (error) => reject(error)
             );
        });
    }

    startGame() {
        if (!this.playerStartData) {
            console.error("Player Start data not found! Cannot start game.");
            // Fall back to render-only mode
            this.startRenderOnly();
            return;
        }

        this.playerController = new PlayerController(
            this.sceneManager.camera,
            this.physicsManager,
            this.container,
            this.playerStartData
        );

        this.animate();
    }

    startRenderOnly() {
        // Basic animation loop without player controls/physics
        const loop = () => {
            requestAnimationFrame(loop);
            this.physicsManager.update(this.clock.getDelta());
            this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
        };
        loop();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();

        if (this.playerController) {
            this.playerController.update(delta);
        }
        
        this.physicsManager.update(delta);

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game();
});