// js/Editor.js
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import SceneManager from './managers/SceneManager.js';
import UIManager from './managers/UIManager.js';
import ControlsManager from './managers/ControlsManager.js';
import ObjectManager from './managers/ObjectManager.js';
import PostprocessingManager from './managers/PostprocessingManager.js';
import EnvironmentManager from './managers/EnvironmentManager.js';
import PhysicsManager from './managers/PhysicsManager.js'; // Import PhysicsManager

export default class Editor {
    constructor(viewportContainer) {
        this.viewportContainer = viewportContainer;
        this.clock = new THREE.Clock();
        this.mixers = [];

        this.projectName = null;
        this.projectPath = null;
        
        this.stats = new Stats();
        document.getElementById('stats-container').appendChild(this.stats.dom);

        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        this.isDirty = false;

        this.cameraTargetPos = new THREE.Vector3();
        this.cameraTargetLookAt = new THREE.Vector3();
        this.isAnimatingCamera = false;
        this.VIEW_DISTANCE = 10;
        
        // --- NEW PROPERTIES FOR PLAY MODE ---
        this.isPlaying = false;
        this.sceneStateBeforePlay = null;
    }

    init() {
        this.sceneManager = new SceneManager(this.viewportContainer);
        this.environmentManager = new EnvironmentManager(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer);
        this.postprocessingManager = new PostprocessingManager(this.sceneManager.renderer, this.sceneManager.scene, this.sceneManager.camera);
        
        // --- INITIALIZE PHYSICS MANAGER ---
        this.physicsManager = new PhysicsManager(this.sceneManager.scene, this);

        this.objectManager = new ObjectManager(this.sceneManager.scene, this.mixers, this);
        this.controlsManager = new ControlsManager(this.sceneManager.camera, this.sceneManager.renderer.domElement, this.objectManager, this);
        this.uiManager = new UIManager({
            sceneManager: this.sceneManager,
            objectManager: this.objectManager,
            environmentManager: this.environmentManager,
            postprocessingManager: this.postprocessingManager,
            controlsManager: this.controlsManager,
            physicsManager: this.physicsManager, // Pass to UI Manager
            editor: this,
        });

        this.setupViewCubeListeners();
        this.setupCloseListeners();

        this.objectManager.rebuildSceneListUI();
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }
    
    // --- UPDATED METHOD FOR PLAY MODE ---
    play() {
        if (this.isPlaying) return;
        // 1. Check if a Player Start exists
        const playerStart = this.sceneManager.scene.children.find(o => o.userData.isPlayerStart);
        if (!playerStart) {
            alert("Ошибка: Объект 'Player Start' не найден на сцене. Невозможно начать игру.");
            return;
        }

        console.log("Starting play mode...", playerStart);

        // Save editor state to restore on stop
        this.sceneStateBeforePlay = {
            cameraPosition: this.sceneManager.camera.position.clone(),
            cameraQuaternion: this.sceneManager.camera.quaternion.clone(),
            controlType: this.controlsManager.currentControlType
        };

        // Initialize physics from current scene
        this.physicsManager.initFromScene();
        console.log("Physics initialized, objects:", this.physicsManager.objects.length);
        
        // Add a ground plane if none exists for testing
        const hasGround = this.sceneManager.scene.children.some(child => 
            child.userData.isEditorObject && child.geometry && child.geometry.type.includes('Plane')
        );
        
        if (!hasGround) {
            console.log("No ground found, adding a test ground plane");
            const groundGeometry = new THREE.PlaneGeometry(20, 20);
            const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = 0;
            ground.userData.isEditorObject = true;
            ground.userData.physics = { isDynamic: false, mass: 0 };
            ground.userData.__tempGround = true; // mark for cleanup on stop
            ground.name = 'Ground';
            this.sceneManager.scene.add(ground);
            this.physicsManager.add(ground);
        }
        
        // Initialize player controller at Player Start
        this.physicsManager.initPlayer(playerStart, this.sceneManager.camera);
        console.log("Player initialized:", this.physicsManager.player);

        // Switch controls/UI to game mode
        this.controlsManager.setControlType('game');
        this.isPlaying = true;
        this.uiManager.setPlayMode(true);
        
        // Blur active inputs so gameplay keys are captured
        try { if (document.activeElement) document.activeElement.blur(); } catch (e) {}
        
        // Improve input toggles in play mode
        const toggleLock = (wantLock) => {
            const plc = this.controlsManager.pointerLock;
            if (!plc) return;
            if (wantLock && !plc.isLocked) plc.lock();
            if (!wantLock && plc.isLocked) plc.unlock();
        };
        
        // Attach temporary listeners for play session
        this._playKeyListener = (e) => {
            if (!this.isPlaying) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                toggleLock(false);
            } else if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                toggleLock(!this.controlsManager.pointerLock.isLocked);
            }
        };
        window.addEventListener('keydown', this._playKeyListener);
        
        // Also ensure clicks on the viewport lock the pointer
        const viewport = this.sceneManager.renderer.domElement;
        this._playClickListener = () => { if (this.isPlaying) toggleLock(true); };
        viewport.addEventListener('click', this._playClickListener);

        console.log("Play mode activated");
    }

    stop() {
        if (!this.isPlaying) return;
        // Unlock pointer and switch back to orbit controls
        this.controlsManager.setControlType('orbit');

        // Clear physics world and player and leftover temp ground
        this.physicsManager.clear();

        // Restore camera state
        if (this.sceneStateBeforePlay) {
            this.sceneManager.camera.position.copy(this.sceneStateBeforePlay.cameraPosition);
            this.sceneManager.camera.quaternion.copy(this.sceneStateBeforePlay.cameraQuaternion);
        }

        // Remove temporary listeners
        if (this._playKeyListener) {
            window.removeEventListener('keydown', this._playKeyListener);
            this._playKeyListener = null;
        }
        if (this._playClickListener) {
            const viewport = this.sceneManager.renderer.domElement;
            viewport && viewport.removeEventListener('click', this._playClickListener);
            this._playClickListener = null;
        }
 
        this.isPlaying = false;
        this.uiManager.setPlayMode(false);
    }


    setProject(name, path) {
        this.projectName = name;
        this.projectPath = path;
        document.getElementById('project-title-display').textContent = name;
        this.isDirty = false;
        console.log(`Project "${name}" opened at: ${path}`);
        
        window.electronAPI.projectOpened(path);
        
        this.uiManager.refreshAssetExplorer();
    }

    async loadScene(projectData) {
        if (!projectData) {
            console.warn("Load failed: projectData is null.");
            return;
        }
        
        this.objectManager.deserializeScene(projectData.objects || []);

        const envState = projectData.environment || null;
        const postState = projectData.postprocessing || null;

        try {
            if (envState) {
                if (this.environmentManager && typeof this.environmentManager.applyState === 'function') {
                    this.environmentManager.applyState(envState);
                } else if (this.uiManager && typeof this.uiManager.updateEnvironmentFromState === 'function') {
                    this.uiManager.updateEnvironmentFromState(envState);
                } else if (this.uiManager && typeof this.uiManager.updateAllFromState === 'function') {
                    this.uiManager.updateAllFromState({ environment: envState, postprocessing: postState });
                }
            }
            if (postState) {
                if (this.postprocessingManager && typeof this.postprocessingManager.applyState === 'function') {
                    this.postprocessingManager.applyState(postState);
                } else if (this.uiManager && typeof this.uiManager.updatePostprocessingFromState === 'function') {
                    this.uiManager.updatePostprocessingFromState(postState);
                }
            }
        } catch (e) {
            console.warn('Failed to apply environment/postprocessing:', e);
        }

        this.objectManager.rebuildSceneListUI();
        this.isDirty = false;
        this.undoStack = [];
        this.redoStack = [];
        this.uiManager && this.uiManager.updateUndoRedoButtons && this.uiManager.updateUndoRedoButtons();
    }



    async saveProject(andQuit = false) {
        if (!this.projectPath || !this.projectName) {
            alert("Error: Project not set. Cannot save.");
            return;
        }

        const serializedObjects = this.objectManager.serializeScene();

        const env = this.environmentManager;
        const post = this.postprocessingManager;
        const scene = this.sceneManager.scene;

        const sceneData = {
            projectName: this.projectName,
            version: "0.0.1",
            savedAt: new Date().toISOString(),
            objects: serializedObjects,
            environment: {
                sunPosX: env.sun.position.x,
                sunPosY: env.sun.position.y,
                sunPosZ: env.sun.position.z,
                sunIntensity: env.sun.intensity,
                sunShadow: env.sun.castShadow,
                iblIntensity: scene.environmentIntensity,
                bgBlur: scene.backgroundBlurriness,
                fogColor: env.fog.color.getHex(),
                fogDensity: env.fog.density,
                lensflareEnabled: env.lensflare.visible,
                cloudsEnabled: env.clouds.visible,
                cloudSpeed: env.clouds.material.uniforms.u_speed.value,
                cloudDensity: env.clouds.material.uniforms.u_density.value,
            },
            postprocessing: {
                bloomEnabled: post.bloomPass.enabled,
                bloomThreshold: post.bloomPass.threshold,
                bloomStrength: post.bloomPass.strength,
                bloomRadius: post.bloomPass.radius,
                vignetteStrength: post.vignettePass.uniforms.strength.value,
                chromaticAberration: post.chromaticAberrationPass.uniforms.amount.value,
                outlineEnabled: post.outlinePass.enabled,
                outlineThickness: post.outlinePass.edgeStrength,
                outlineColor: post.outlinePass.visibleEdgeColor.getHex(),
            }
        };

        const projectFileName = `${this.projectPath}\\${this.projectName}.v`;
        const jsonContent = JSON.stringify(sceneData, null, 2);

        const result = await window.electronAPI.saveProject(projectFileName, jsonContent);
        if (result.success) {
            console.log(`Project "${this.projectName}" saved successfully.`);
            this.isDirty = false;
            if (andQuit) {
                window.electronAPI.quitAfterSave();
            }
        } else {
            alert(`Failed to save project: ${result.error}`);
        }
    }

    addHistory(action) {
        this.undoStack.push(action);
        this.redoStack = [];
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        this.isDirty = true;
        this.uiManager.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.undoStack.length === 0) return;
        const action = this.undoStack.pop();
        action.undo();
        this.redoStack.push(action);
        this.isDirty = true;
        this.uiManager.updateUndoRedoButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const action = this.redoStack.pop();
        action.redo();
        this.undoStack.push(action);
        this.isDirty = true;
        this.uiManager.updateUndoRedoButtons();
    }

    setupCloseListeners() {
        window.electronAPI.onCloseRequest(async () => {
            if (this.isDirty) {
                await window.electronAPI.confirmClose();
            } else {
                await this.saveProject(true);
            }
        });

        window.electronAPI.onSaveAndQuit(() => {
            this.saveProject(true);
        });
    }

    setupViewCubeListeners() {
        const viewcube = document.getElementById('viewcube');
        const renderer = this.sceneManager.renderer;
        const orbit = this.controlsManager.orbit;

        let isDragging = false;
        let clickTimeout;

        viewcube.addEventListener('mousedown', (e) => {
            isDragging = false;
            clickTimeout = setTimeout(() => {
                isDragging = true;
                let previousMousePosition = { x: e.clientX, y: e.clientY };
                
                const onMouseMove = (moveEvent) => {
                    const deltaX = moveEvent.clientX - previousMousePosition.x;
                    const deltaY = moveEvent.clientY - previousMousePosition.y;

                    orbit.rotateLeft(2 * Math.PI * deltaX / renderer.domElement.clientHeight);
                    orbit.rotateUp(2 * Math.PI * deltaY / renderer.domElement.clientHeight);
                    previousMousePosition = { x: moveEvent.clientX, y: moveEvent.clientY };
                };
                const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            }, 150);
        });

        window.addEventListener('mouseup', () => clearTimeout(clickTimeout));
        
        document.querySelectorAll('.viewcube-face').forEach(face => {
            face.addEventListener('click', (e) => {
                if(!isDragging) this.setCameraView(e.target.dataset.view);
            });
        });
    }

    setCameraView(view) {
        const orbit = this.controlsManager.orbit;
        const currentLookAt = orbit.target.clone();

        switch (view) {
            case 'front':  this.cameraTargetPos.set(currentLookAt.x, currentLookAt.y, currentLookAt.z + this.VIEW_DISTANCE); break;
            case 'back':   this.cameraTargetPos.set(currentLookAt.x, currentLookAt.y, currentLookAt.z - this.VIEW_DISTANCE); break;
            case 'right':  this.cameraTargetPos.set(currentLookAt.x + this.VIEW_DISTANCE, currentLookAt.y, currentLookAt.z); break;
            case 'left':   this.cameraTargetPos.set(currentLookAt.x - this.VIEW_DISTANCE, currentLookAt.y, currentLookAt.z); break;
            case 'top':    this.cameraTargetPos.set(currentLookAt.x, currentLookAt.y + this.VIEW_DISTANCE, currentLookAt.z); break;
            case 'bottom': this.cameraTargetPos.set(currentLookAt.x, currentLookAt.y - this.VIEW_DISTANCE, currentLookAt.z); break;
        }
        this.cameraTargetLookAt.copy(currentLookAt);
        this.isAnimatingCamera = true;
    }

    onResize() {
        const rect = this.viewportContainer.getBoundingClientRect();
        this.sceneManager.resize(rect.width, rect.height);
        this.postprocessingManager.resize(rect.width, rect.height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.stats.begin();
        const delta = this.clock.getDelta();

        for (const mixer of this.mixers) mixer.update(delta);
        
        // --- UPDATE PHYSICS & PLAYER ---
        if (this.isPlaying) {
            this.physicsManager.update(delta);
            this.physicsManager.updatePlayer(delta, this.controlsManager.moveState);
        } else {
             if (this.isAnimatingCamera) {
                const camera = this.sceneManager.camera;
                const orbit = this.controlsManager.orbit;
                camera.position.lerp(this.cameraTargetPos, 0.1);
                orbit.target.lerp(this.cameraTargetLookAt, 0.1);
                if (camera.position.distanceTo(this.cameraTargetPos) < 0.01) {
                    this.isAnimatingCamera = false;
                    camera.position.copy(this.cameraTargetPos);
                    orbit.target.copy(this.cameraTargetLookAt);
                }
            }
            this.controlsManager.update(delta);
        }


        this.environmentManager.update(delta);
        this.postprocessingManager.composer.render();
        
		const viewcubeScene = document.getElementById('viewcube-scene');
        if (viewcubeScene && !this.isPlaying) { // Only update viewcube in editor mode
            const camInverse = this.sceneManager.camera.quaternion.clone().invert();
            viewcubeScene.style.transform = `matrix3d(${new THREE.Matrix4().makeRotationFromQuaternion(camInverse).elements.join(',')})`;
        }
		
        this.stats.end();
    }
}