// js/managers/ControlsManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class ControlsManager {
    constructor(camera, domElement, objectManager, editor) {
        this.camera = camera;
        this.domElement = domElement;
        this.objectManager = objectManager;
        this.editor = editor; // Reference to the main editor class for history
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.objectBeforeTransform = null; // To store state before transform

        this.initOrbitControls();
        this.initPointerLockControls();
        this.initTransformControls();

        // init gizmo buttons (UI) and keyboard handling
        this.initGizmoButtons();

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
        this.transform.isTransformControls = true;
        // transform will be added to scene via objectManager.scene
        this.objectManager.scene.add(this.transform);
    }

    /**
     * Ищет кнопки в панеле .vs-viewport-tools и навешивает события клика,
     * а также запоминает список кнопок для подсветки active.
     */
    initGizmoButtons() {
        try {
            const container = document.querySelector('.vs-viewport-tools');
            if (!container) {
                this.gizmoButtons = [];
                return;
            }
            // ожидаем, что первые три кнопки — move, rotate, scale (как в index.html)
            const buttons = Array.from(container.querySelectorAll('.vs-btn'));
            // защищаемся от неожиданного порядка: найдем кнопки по title, fallback по индексу
            const moveBtn = buttons.find(b => /move/i.test(b.title)) || buttons[0];
            const rotateBtn = buttons.find(b => /rotate/i.test(b.title)) || buttons[1];
            const scaleBtn = buttons.find(b => /scale/i.test(b.title)) || buttons[2];

            this.gizmoButtons = [{ mode: 'translate', el: moveBtn }, { mode: 'rotate', el: rotateBtn }, { mode: 'scale', el: scaleBtn }];

            this.gizmoButtons.forEach(item => {
                if (!item.el) return;
                item.el.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.setTransformMode(item.mode);
                });
            });
        } catch (e) {
            console.warn('initGizmoButtons failed', e);
            this.gizmoButtons = [];
        }
    }

    setupEventListeners() {
        // Слушаем событие выбора объекта от ObjectManager
        window.addEventListener('selectionChanged', (e) => {
            const selected = e.detail.selected;
            if (selected) {
                this.transform.attach(selected);
                // ensure transform is enabled so gizmo is visible
                this.transform.enabled = true;
            } else {
                this.transform.detach();
            }
        });

        // Отключаем OrbitControls во время перетаскивания
        this.transform.addEventListener('dragging-changed', (e) => {
            this.orbit.enabled = !e.value;
        });

        // --- HISTORY EVENT LISTENERS FOR TRANSFORM ---
        // Привязываемся к событиям TransformControls
        this.transform.addEventListener('mouseDown', (e) => {
            const object = e.target.object;
            if (object) {
                this.objectBeforeTransform = {
                    position: object.position.clone(),
                    rotation: object.rotation.clone(),
                    scale: object.scale.clone()
                };
            }
        });

        this.transform.addEventListener('mouseUp', (e) => {
            if (this.objectBeforeTransform) {
                const object = e.target.object;
                const oldState = this.objectBeforeTransform;
                const newState = {
                    position: object.position.clone(),
                    rotation: object.rotation.clone(),
                    scale: object.scale.clone()
                };

                const action = {
                    undo: () => {
                        object.position.copy(oldState.position);
                        object.rotation.copy(oldState.rotation);
                        object.scale.copy(oldState.scale);
                    },
                    redo: () => {
                        object.position.copy(newState.position);
                        object.rotation.copy(newState.rotation);
                        object.scale.copy(newState.scale);
                    }
                };

                this.editor.addHistory && this.editor.addHistory(action);
                this.objectBeforeTransform = null;
            }
        });

        // Клик для выбора объекта
        this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        // Клавиши
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

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

            if (topLevelParent.isTransformControls) {
                continue;
            }

            hit = topLevelParent;
            break;
        }

        this.objectManager.setSelected(hit);
    }

    onKeyDown(e) {
        // Игнорируем, если ввод текста
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
        }

        // --- Глобальные горячие клавиши (Undo/Redo) ---
        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    this.editor.undo && this.editor.undo();
                    break;
                case 'y':
                    e.preventDefault();
                    this.editor.redo && this.editor.redo();
                    break;
            }
            return;
        }

        // Если pointer lock активен — используем WASD для движения, не переключаем гизмо
        if (this.pointerLock.isLocked) {
            switch (e.key.toLowerCase()) {
                case 'w': this.moveState.forward = 1; break;
                case 's': this.moveState.forward = -1; break;
                case 'a': this.moveState.right = -1; break;
                case 'd': this.moveState.right = 1; break;
            }
            return;
        }

        // Горячие клавиши для переключения гизмо: W/E/R
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'e' || key === 'r') {
            e.preventDefault();
            if (key === 'w') this.setTransformMode('translate');
            if (key === 'e') this.setTransformMode('rotate');
            if (key === 'r') this.setTransformMode('scale');
            return;
        }

        // Прочие клавиши — нет обработки
    }

    onKeyUp(e) {
        if (this.pointerLock.isLocked) {
            switch (e.key.toLowerCase()) {
                case 'w': case 's': this.moveState.forward = 0; break;
                case 'a': case 'd': this.moveState.right = 0; break;
            }
        }
    }

    /**
     * Переключает тип управления (orbit / game), включает/выключает трансформконтролсы.
     */
    setControlType(type) {
        if (type === 'orbit') {
            try { this.pointerLock.unlock(); } catch(e) {}
            this.orbit.enabled = true;
            this.transform.enabled = true;
        } else if (type === 'game') {
            this.orbit.enabled = false;
            this.transform.enabled = false;
            this.objectManager.setSelected(null);
            try { this.pointerLock.lock(); } catch(e) {}
        }
    }

    /**
     * Устанавливает режим TransformControls.
     * Принимает: 'translate' | 'rotate' | 'scale'
     */
    setTransformMode(mode) {
        if (!this.transform) return;

        // TransformControls API: 'translate' | 'rotate' | 'scale'
        const map = { translate: 'translate', rotate: 'rotate', scale: 'scale' };
        const resolved = map[mode] || mode;

        try {
            this.transform.setMode(resolved);
        } catch (e) {
            // На старых версиях three.js может использоваться 'translate'/'rotate'/'scale' - всё равно пробуем
            try { this.transform.setMode(mode); } catch (ee) { console.warn('setTransformMode failed', ee); }
        }

        this._updateGizmoButtonsUI(resolved);
    }

    _updateGizmoButtonsUI(mode) {
        if (!this.gizmoButtons || !this.gizmoButtons.length) return;
        this.gizmoButtons.forEach(item => {
            if (!item.el) return;
            const isActive = item.mode === (mode === 'translate' ? 'translate' : mode === 'rotate' ? 'rotate' : 'scale');
            item.el.classList.toggle('active', isActive);
        });
    }

    update(delta) {
        if (this.pointerLock.isLocked) {
            const moveDirection = new THREE.Vector3(this.moveState.right, 0, this.moveState.forward).normalize();
            // PointerLockControls ожидает moveRight/moveForward - мы используем их через небольшую хитрость
            try {
                this.pointerLock.moveRight(moveDirection.x * this.moveSpeed * delta);
                this.pointerLock.moveForward(-moveDirection.z * this.moveSpeed * delta);
            } catch (e) { /* some builds may not have move* methods */ }
        } else {
            this.orbit.update();
        }
    }
}
