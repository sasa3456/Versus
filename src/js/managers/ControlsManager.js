// js/managers/ControlsManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class ControlsManager {
    constructor(camera, domElement, objectManager) {
        this.camera = camera;
        this.domElement = domElement;
        this.objectManager = objectManager;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initOrbitControls();
        this.initPointerLockControls();
        this.initTransformControls();
        
        this.setupEventListeners();
        
        this.setControlType('orbit');
    }

    initOrbitControls() {
        this.orbit = new OrbitControls(this.camera, this.domElement);
        this.orbit.enableDamping = true;
        this.orbit.dampingFactor = 0.05;
    }

    initPointerLockControls() {
        this.pointerLock = new PointerLockControls(this.camera, this.domElement);
        this.moveState = { forward: 0, right: 0 };
        this.moveSpeed = 5.0;
    }
    
    initTransformControls() {
    this.transform = new TransformControls(this.camera, this.domElement);
    this.transform.isTransformControls = true; // <-- ДОБАВЬТЕ ЭТУ СТРОКУ
    this.objectManager.scene.add(this.transform);
}
    
    setupEventListeners() {
        // Слушаем событие выбора объекта от ObjectManager
        window.addEventListener('selectionChanged', (e) => {
            const selected = e.detail.selected;
            if (selected) {
                this.transform.attach(selected);
            } else {
                this.transform.detach();
            }
        });

        // Отключаем OrbitControls во время перетаскивания
        this.transform.addEventListener('dragging-changed', (e) => {
            this.orbit.enabled = !e.value;
        });

        // Клик для выбора объекта
        this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        
        // Управление в режиме PointerLock
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
	
	// js/managers/ControlsManager.js

onPointerDown(e) {
    if (this.transform.dragging || this.pointerLock.isLocked) return;
    if (e.button !== 0 || e.target.closest('.vs-viewport-tools, .dropdown, .vs-btn, .vs-tree-item, .viewcube-container')) return;
    
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.objectManager.scene.children, true);
    
    let hit = null;
    for (const i of intersects) {
        // Пропускаем все вспомогательные объекты сразу
        if (i.object.userData.isHelper || i.object.isGridHelper) {
            continue;
        }

        // Находим самый верхний родительский объект в сцене
        let topLevelParent = i.object;
        while (topLevelParent.parent && topLevelParent.parent !== this.objectManager.scene) {
            topLevelParent = topLevelParent.parent;
        }

        // ИСПРАВЛЕНО: Проверяем, не является ли этот объект самим гизмо.
        // Если да - пропускаем его и ищем дальше (может, за ним есть другой объект).
        if (topLevelParent.isTransformControls) {
            continue;
        }
        
        // Если мы дошли сюда, значит, мы нашли валидный объект.
        hit = topLevelParent;
        break; // Выходим из цикла, так как нашли то, что нужно.
    }

    this.objectManager.setSelected(hit);
}
    
    onKeyDown(e) {
        if (this.pointerLock.isLocked) {
             switch (e.key.toLowerCase()) {
                case 'w': this.moveState.forward = 1; break;
                case 's': this.moveState.forward = -1; break;
                case 'a': this.moveState.right = -1; break;
                case 'd': this.moveState.right = 1; break;
            }
        }
    }
    
    onKeyUp(e) {
        if (this.pointerLock.isLocked) {
            switch (e.key.toLowerCase()) {
                case 'w': case 's': this.moveState.forward = 0; break;
                case 'a': case 'd': this.moveState.right = 0; break;
            }
        }
    }

    setControlType(type) {
        if (type === 'orbit') {
            this.pointerLock.unlock();
            this.orbit.enabled = true;
            this.transform.enabled = true;
        } else if (type === 'game') {
            this.orbit.enabled = false;
            this.transform.enabled = false;
            this.objectManager.setSelected(null);
            this.pointerLock.lock();
        }
    }
    
    update(delta) {
        if (this.pointerLock.isLocked) {
            const moveDirection = new THREE.Vector3(this.moveState.right, 0, this.moveState.forward).normalize();
            this.pointerLock.moveRight(moveDirection.x * this.moveSpeed * delta);
            this.pointerLock.moveForward(-moveDirection.z * this.moveSpeed * delta);
        } else {
            this.orbit.update();
        }
    }
}