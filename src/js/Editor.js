// js/Editor.js
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import SceneManager from './managers/SceneManager.js';
import UIManager from './managers/UIManager.js';
import ControlsManager from './managers/ControlsManager.js';
import ObjectManager from './managers/ObjectManager.js';
import PostprocessingManager from './managers/PostprocessingManager.js';
import EnvironmentManager from './managers/EnvironmentManager.js';

export default class Editor {
    constructor(viewportContainer) {
        this.viewportContainer = viewportContainer;
        this.clock = new THREE.Clock();
        this.mixers = []; // Массив для всех AnimationMixer'ов

        // Инициализация FPS счётчика
        this.stats = new Stats();
        document.getElementById('stats-container').appendChild(this.stats.dom);

        // --- ViewCube Properties ---
        this.cameraTargetPos = new THREE.Vector3();
        this.cameraTargetLookAt = new THREE.Vector3();
        this.isAnimatingCamera = false;
        this.VIEW_DISTANCE = 10;
    }

    init() {
        // 1. Управление сценой (рендер, камера, сцена)
        this.sceneManager = new SceneManager(this.viewportContainer);

        // 2. Управление окружением (небо, солнце, туман, облака)
        this.environmentManager = new EnvironmentManager(
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.sceneManager.renderer
        );
        
        // 3. Постобработка
        this.postprocessingManager = new PostprocessingManager(
            this.sceneManager.renderer, 
            this.sceneManager.scene, 
            this.sceneManager.camera
        );

        // 4. Управление объектами (создание, удаление, выбор)
        this.objectManager = new ObjectManager(this.sceneManager.scene, this.mixers);

        // 5. Управление контролами (Orbit, PointerLock, Transform)
        this.controlsManager = new ControlsManager(
            this.sceneManager.camera, 
            this.sceneManager.renderer.domElement, 
            this.objectManager
        );

        // 6. Управление UI (обработчики событий, связь с менеджерами)
        this.uiManager = new UIManager({
            sceneManager: this.sceneManager,
            objectManager: this.objectManager,
            environmentManager: this.environmentManager,
            postprocessingManager: this.postprocessingManager,
            controlsManager: this.controlsManager,
        });

        // 7. ViewCube Event Listeners
        this.setupViewCubeListeners();

        // Первоначальное построение списка объектов
        this.objectManager.rebuildSceneListUI();
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }
    
    /**
     * Sets up the event listeners for the ViewCube for dragging and clicking.
     */
    setupViewCubeListeners() {
        const viewcube = document.getElementById('viewcube');
        const renderer = this.sceneManager.renderer;
        const orbit = this.controlsManager.orbitControls;

        let isDragging = false;
        let clickTimeout;

        viewcube.addEventListener('mousedown', (e) => {
            isDragging = false;
            // Delay before dragging starts to register clicks properly
            clickTimeout = setTimeout(() => {
                let previousMousePosition = { x: e.clientX, y: e.clientY };
                
                const onMouseMove = (moveEvent) => {
                    isDragging = true;
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

        window.addEventListener('mouseup', () => {
            clearTimeout(clickTimeout);
        });
        
        document.querySelectorAll('.viewcube-face').forEach(face => {
            face.addEventListener('click', (e) => {
                // A click is only processed if no dragging occurred
                if(!isDragging) {
                    this.setCameraView(e.target.dataset.view);
                }
            });
        });
    }

    /**
     * Animates the camera to a predefined view ('front', 'top', etc.).
     * @param {string} view The target view name.
     */
    setCameraView(view) {
        const orbit = this.controlsManager.orbitControls;
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

        // Обновление анимаций
        for (const mixer of this.mixers) {
            mixer.update(delta);
        }

        // --- Camera Animation for ViewCube ---
        if (this.isAnimatingCamera) {
            const camera = this.sceneManager.camera;
            const orbit = this.controlsManager.orbitControls;
            camera.position.lerp(this.cameraTargetPos, 0.1);
            orbit.target.lerp(this.cameraTargetLookAt, 0.1);
            if (camera.position.distanceTo(this.cameraTargetPos) < 0.01) {
                this.isAnimatingCamera = false;
                camera.position.copy(this.cameraTargetPos);
                orbit.target.copy(this.cameraTargetLookAt);
            }
        }

        // Обновление контролов
        this.controlsManager.update(delta);
        
        // Обновление окружения (облака)
        this.environmentManager.update(delta);
        
        // Рендеринг сцены через post-processing composer
        this.postprocessingManager.composer.render();
        
		const viewcubeScene = document.getElementById('viewcube-scene');
        if (viewcubeScene) {
            // Get the main camera's rotation and invert it
            const camInverse = this.sceneManager.camera.quaternion.clone().invert();
            
            // Create a rotation matrix and apply it as a CSS transform
            viewcubeScene.style.transform = `matrix3d(${new THREE.Matrix4().makeRotationFromQuaternion(camInverse).elements.join(',')})`;
        }
		
        this.stats.end();
    }
}