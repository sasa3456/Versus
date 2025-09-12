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
        this.mixers = [];

        this.projectName = null;
        this.projectPath = null;
        
        this.stats = new Stats();
        document.getElementById('stats-container').appendChild(this.stats.dom);

        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        this.isDirty = false; // Flag for unsaved changes

        this.cameraTargetPos = new THREE.Vector3();
        this.cameraTargetLookAt = new THREE.Vector3();
        this.isAnimatingCamera = false;
        this.VIEW_DISTANCE = 10;
    }

    init() {
        this.sceneManager = new SceneManager(this.viewportContainer);
        this.environmentManager = new EnvironmentManager(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer);
        this.postprocessingManager = new PostprocessingManager(this.sceneManager.renderer, this.sceneManager.scene, this.sceneManager.camera);
        this.objectManager = new ObjectManager(this.sceneManager.scene, this.mixers, this);
        this.controlsManager = new ControlsManager(this.sceneManager.camera, this.sceneManager.renderer.domElement, this.objectManager, this);
        this.uiManager = new UIManager({
            sceneManager: this.sceneManager,
            objectManager: this.objectManager,
            environmentManager: this.environmentManager,
            postprocessingManager: this.postprocessingManager,
            controlsManager: this.controlsManager,
            editor: this,
        });

        this.setupViewCubeListeners();
        this.setupCloseListeners(); // Setup graceful close listeners

        this.objectManager.rebuildSceneListUI();
        window.addEventListener('resize', () => this.onResize());
        this.onResize();
    }

    setProject(name, path) {
        this.projectName = name;
        this.projectPath = path;
        document.getElementById('project-title-display').textContent = name;
        this.isDirty = false;
        console.log(`Project "${name}" opened at: ${path}`);
    }

    /**
     * Load scene from saved project data.
     * - Не создаём объекты, если тип не распознан.
     * - Устанавливаем трансформы/свойства до регистрации UI-карточки.
     * - Применяем environment/postprocessing через соответствующие менеджеры (если есть).
     */
    loadScene(projectData) {
        if (!projectData) {
            console.warn("Load failed: projectData is null.");
            return;
        }

        if (typeof projectData === 'string') {
            try {
                projectData = JSON.parse(projectData);
            } catch (err) {
                console.error("Failed to parse projectData string:", err);
                return;
            }
        }

        console.log("Loading project data:", projectData);

        // 1) Очистим текущие объекты редактора (не трогаем глобальные помощники и т.п.)
        const toRemove = this.sceneManager.scene.children.filter(c => c.userData && c.userData.isEditorObject);
        toRemove.forEach(o => this.objectManager.remove(o, true));

this.sceneManager.scene.children.slice().forEach(child => {
    // Удаляем авто-плоскость, если она присутствует (имя или геометрия)
    // Условие: не трогаем объекты, помеченные как isEditorObject или явные primitivы
    if (!child.userData?.isEditorObject) {
        // если имя совпадает с Ground/GROUND_HELPER/ground — удаляем
        const lowerName = (child.name || '').toLowerCase();
        if (lowerName.includes('ground') || lowerName.includes('ground_helper') || child.name === 'GROUND_HELPER') {
            this.sceneManager.scene.remove(child);
            console.log('Removed default ground helper from scene.');
        } else if (child.geometry && child.geometry.type === 'PlaneGeometry' && !child.userData?.keep) {
            // дополнительная защита: если это PlaneGeometry и не помечен как keep — удаляем
            this.sceneManager.scene.remove(child);
            console.log('Removed stray plane (PlaneGeometry) from scene.');
        }
    }
});

        // 2) Объекты
        if (Array.isArray(projectData.objects) && projectData.objects.length > 0) {
            projectData.objects.forEach((objData, idx) => {
                let category = objData.isLight ? 'light' : 'primitive';
                // берем явное поле geometryType/lightType/primitiveType или objData.type
                let type = objData.geometryType || objData.lightType || objData.primitiveType || objData.type;

                // Попробуем вывести понятный тип из имени, но только если он совпадает с ожидаемыми
                if (!type || ['mesh','object3d','group'].includes((type + '').toLowerCase())) {
                    const nameSeed = (objData.name || '').toLowerCase();
                    const prefix = nameSeed.split(/[_\s-]/)[0] || '';
                    if (['cube','box'].includes(prefix)) type = 'cube';
                    else if (['sphere','ball'].includes(prefix)) type = 'sphere';
                    else if (['plane','ground','floor'].includes(prefix)) type = 'plane';
                    else if (prefix.includes('point')) { category = 'light'; type = 'point'; }
                    else if (prefix.includes('dir') || prefix.includes('directional')) { category = 'light'; type = 'directional'; }
                    // если не удалось сопоставить — оставляем type undefined
                }

                console.log(`Loading object #${idx}: name="${objData.name}", resolvedType="${type}", category="${category}"`);

                // Если тип не распознан — пропускаем создание (чтобы не создавать plane по-умолчанию)
                const allowedPrimitive = ['cube', 'sphere', 'plane'];
                const allowedLights = ['point', 'directional'];
                if (category === 'primitive' && !allowedPrimitive.includes(type)) {
                    console.warn(`Skipping creation: primitive type "${type}" not recognized for object "${objData.name}"`);
                    return;
                }
                if (category === 'light' && !allowedLights.includes(type)) {
                    console.warn(`Skipping creation: light type "${type}" not recognized for object "${objData.name}"`);
                    return;
                }

                // Создаём объект, suppressHistory=true, чтобы не создавать UI до установки имени/трансформов
                const newObject = this.objectManager.add(type, category, true);
                if (!newObject) {
                    console.warn(`Failed to create object (creators returned falsy) for`, objData);
                    return;
                }

                // Устанавливаем имя/transform/props
                newObject.name = objData.name || newObject.name;
                if (objData.position) {
                    try { newObject.position.set(objData.position.x, objData.position.y, objData.position.z); } catch(e) {}
                }
                if (objData.rotation) {
                    try { newObject.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z); } catch(e) {}
                }
                if (objData.scale) {
                    try { newObject.scale.set(objData.scale.x, objData.scale.y, objData.scale.z); } catch(e) {}
                }
                if (objData.color && newObject.material && newObject.material.color) {
                    try { newObject.material.color.set(objData.color); } catch(e) {}
                }
                if (objData.intensity !== undefined && newObject.intensity !== undefined) {
                    newObject.intensity = objData.intensity;
                }
                if (objData.castShadow !== undefined) newObject.castShadow = objData.castShadow;

                // После настройки — регистрируем в UI (карточка появится с корректным именем)
                this.objectManager.registerSceneObject(newObject);
            });

            console.log(`Scene objects processed: ${projectData.objects.length}`);
        } else {
            console.log('No objects in projectData.objects');
        }

        // 3) Применяем настройки окружения и постпроцессинга — сначала через менеджеры, затем через UI при необходимости.
        const envState = projectData.environment || null;
        const postState = projectData.postprocessing || null;

        // Попытка применить напрямую через менеджеры (если у них есть API)
        try {
            if (envState) {
                if (this.environmentManager && typeof this.environmentManager.applyState === 'function') {
                    this.environmentManager.applyState(envState);
                } else if (this.uiManager && typeof this.uiManager.updateEnvironmentFromState === 'function') {
                    this.uiManager.updateEnvironmentFromState(envState);
                } else if (this.uiManager && typeof this.uiManager.updateAllFromState === 'function') {

this.sceneManager.scene.children.slice().forEach(child => {
    // Удаляем авто-плоскость, если она присутствует (имя или геометрия)
    // Условие: не трогаем объекты, помеченные как isEditorObject или явные primitivы
    if (!child.userData?.isEditorObject) {
        // если имя совпадает с Ground/GROUND_HELPER/ground — удаляем
        const lowerName = (child.name || '').toLowerCase();
        if (lowerName.includes('ground') || lowerName.includes('ground_helper') || child.name === 'GROUND_HELPER') {
            this.sceneManager.scene.remove(child);
            console.log('Removed default ground helper from scene.');
        } else if (child.geometry && child.geometry.type === 'PlaneGeometry' && !child.userData?.keep) {
            // дополнительная защита: если это PlaneGeometry и не помечен как keep — удаляем
            this.sceneManager.scene.remove(child);
            console.log('Removed stray plane (PlaneGeometry) from scene.');
        }
    }
});
                    // fallback: let uiManager handle it
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
            console.warn('Failed to apply environment/postprocessing via dedicated managers, falling back to uiManager:', e);
            try {
                this.uiManager && this.uiManager.updateAllFromState && this.uiManager.updateAllFromState({ environment: envState, postprocessing: postState });
            } catch (ee) {
                console.error('Failed to apply state via uiManager as fallback:', ee);
            }
        }

        // Обновляем UI списка объектов и кнопки истории
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

        // 1. Serialize Objects
        const serializedObjects = this.sceneManager.scene.children
            .filter(obj => obj.userData.isEditorObject)
            .map(obj => {
                const data = {
                    name: obj.name,
                    type: obj.type,
                    position: obj.position.clone(),
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: obj.scale.clone(),
                    isLight: obj.isLight
                };
                if (obj.userData.primitiveType) data.geometryType = obj.userData.primitiveType;
                if (obj.isLight) {
                    data.lightType = obj.userData.lightType;
                    data.color = obj.color.getHex();
                    data.intensity = obj.intensity;
                    data.castShadow = obj.castShadow;
                }
                return data;
            });

        // 2. Serialize Environment & Post-processing
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
        this.isDirty = true; // Any action makes the project dirty
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
        // Main asks if it's okay to close
        window.electronAPI.onCloseRequest(async () => {
            if (this.isDirty) {
                await window.electronAPI.confirmClose();
            } else {
                // If not dirty, just quit immediately without a prompt
                await this.saveProject(true); // Autosave on close
            }
        });

        // Main said to save the project and then quit
        window.electronAPI.onSaveAndQuit(() => {
            this.saveProject(true); // The 'true' flag will trigger the quit after save
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
        this.environmentManager.update(delta);
        this.postprocessingManager.composer.render();
        
		const viewcubeScene = document.getElementById('viewcube-scene');
        if (viewcubeScene) {
            const camInverse = this.sceneManager.camera.quaternion.clone().invert();
            viewcubeScene.style.transform = `matrix3d(${new THREE.Matrix4().makeRotationFromQuaternion(camInverse).elements.join(',')})`;
        }
		
        this.stats.end();
    }
}