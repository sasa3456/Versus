import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class ControlsManager {
    constructor(camera, domElement, objectManager, editor) {
        this.camera = camera;
        this.domElement = domElement;
        this.objectManager = objectManager;
        this.editor = editor;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.objectBeforeTransform = null;
        this.currentControlType = null;
        
        // --- UPDATED moveState ---
        this.moveState = { forward: false, backward: false, left: false, right: false, jump: false, run: false };

        this.initOrbitControls();
        this.initPointerLockControls();
        this.initTransformControls();

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
        this.pointerLock = new PointerLockControls(this.camera, document.body); // Lock to body for better experience
    }

    initTransformControls() {
        this.transform = new TransformControls(this.camera, this.domElement);
        this.transform.isTransformControls = true;
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
            if (this.editor.isPlaying) return; // Don't attach gizmo in play mode
            const selected = e.detail.selected;
            if (selected) {
                this.transform.attach(selected);
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

         this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // --- Lock pointer on canvas click when in game mode ---
        this.domElement.addEventListener('click', () => {
            if (this.currentControlType === 'game' && !this.pointerLock.isLocked) {
                this.pointerLock.lock();
            }
        });
    }

    onPointerDown(e) {
        if (this.editor.isPlaying || this.transform.dragging) return;
        if (e.button !== 0 || e.target.closest('.vs-viewport-tools, .dropdown, .vs-btn, .vs-tree-item, .viewcube-container')) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objectManager.scene.children, true);

        let hit = null;
        for (const i of intersects) {
            if (i.object.userData.isHelper || i.object.isGridHelper) continue;
            let topLevelParent = i.object;
            while (topLevelParent.parent && topLevelParent.parent !== this.objectManager.scene) {
                topLevelParent = topLevelParent.parent;
            }
            if (topLevelParent.isTransformControls) continue;
            hit = topLevelParent;
            break;
        }
        this.objectManager.setSelected(hit);
    }

    onKeyDown(e) {
        // In play mode, handle movement first regardless of focused inputs
        if (this.editor.isPlaying) {
            const code = e.code;
            switch (code) {
                case 'KeyW': e.preventDefault(); this.moveState.forward = true; break;
                case 'KeyS': e.preventDefault(); this.moveState.backward = true; break;
                case 'KeyA': e.preventDefault(); this.moveState.left = true; break;
                case 'KeyD': e.preventDefault(); this.moveState.right = true; break;
                case 'Space': e.preventDefault(); this.moveState.jump = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': e.preventDefault(); this.moveState.run = true; break;
            }
            return;
        }

        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
        }

        if (e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'z': e.preventDefault(); this.editor.undo && this.editor.undo(); break;
                case 'y': e.preventDefault(); this.editor.redo && this.editor.redo(); break;
            }
            return;
        }

        const key = e.key.toLowerCase();
        if (key === 'w' || key === 'e' || key === 'r') {
            e.preventDefault();
            if (key === 'w') this.setTransformMode('translate');
            if (key === 'e') this.setTransformMode('rotate');
            if (key === 'r') this.setTransformMode('scale');
        }
    }

    onKeyUp(e) {
        // --- Handle Player Movement in Game Mode ---
        if (this.editor.isPlaying) {
            const code = e.code;
            switch (code) {
                case 'KeyW': e.preventDefault(); this.moveState.forward = false; break;
                case 'KeyS': e.preventDefault(); this.moveState.backward = false; break;
                case 'KeyA': e.preventDefault(); this.moveState.left = false; break;
                case 'KeyD': e.preventDefault(); this.moveState.right = false; break;
                case 'Space': e.preventDefault(); this.moveState.jump = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': e.preventDefault(); this.moveState.run = false; break;
            }
        }
    }

    setControlType(type) {
        this.currentControlType = type;
        if (type === 'orbit') {
            if(this.pointerLock.isLocked) this.pointerLock.unlock();
            this.orbit.enabled = true;
            this.transform.enabled = true;
            document.body.style.cursor = 'auto';
        } else if (type === 'game') {
            this.orbit.enabled = false;
            this.transform.enabled = false;
            this.objectManager.setSelected(null);
            this.pointerLock.lock();
            document.body.style.cursor = 'crosshair';
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
        // Only update orbit controls if they are enabled and not in play mode
        if (this.currentControlType === 'orbit' && !this.editor.isPlaying) {
            this.orbit.update();
        }
    }
}
