// js/managers/ObjectManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sanitizeName } from '../utils/helpers.js';
import { createPrimitive, createLight, createPlayerStart } from '../utils/creators.js';

const PRIMITIVE_TYPES = new Set(['cube', 'sphere', 'plane']);
const LIGHT_TYPES = new Set(['point', 'directional']);
const GAME_TYPES = new Set(['player_start']);


export default class ObjectManager {
    constructor(scene, mixers, editor) {
        this.scene = scene;
        this.mixers = mixers;
        this.editor = editor;
        this.selected = null;

        this.originalMaterials = new Map();
        this.defaultShadedMaterial = new THREE.MeshStandardMaterial({ color: 0xbfbfbf });

        this.sceneListContainer = document.querySelector('.vs-tree');
        this.sceneItems = new Map();
        this.nameCounters = Object.create(null);
        
        // --- Accordion Items ---
        this.lightAccordionItem = document.getElementById('light-accordion-item');
        this.physicsAccordionItem = document.getElementById('physics-accordion-item');
        this.materialAccordionItem = document.getElementById('material-accordion-item');

        this.gltfLoader = new GLTFLoader();
		this.playerSettingsAccordionItem = document.getElementById('player-settings-accordion-item');
        
    }
	
	loadModel(filePath, suppressHistory = false) {
        return new Promise((resolve, reject) => {
            if (!filePath) {
                reject(new Error("File path is empty."));
                return;
            }

            const extension = filePath.split('.').pop().toLowerCase();
            let loader;

            switch(extension) {
                case 'glb':
                case 'gltf':
                    loader = this.gltfLoader;
                    break;
                default:
                    const errorMsg = `Unsupported model format: .${extension}`;
                    console.warn(errorMsg);
                    alert(`Формат .${extension} не поддерживается для загрузки.`);
                    reject(new Error(errorMsg));
                    return;
            }

            const modelUrl = `file://${filePath.replace(/\\/g, '/')}`;

            loader.load(modelUrl, (model) => {
                const loadedObject = model.scene || model;
                
                loadedObject.userData.isModel = true;
                loadedObject.userData.modelPath = filePath;

                const baseName = sanitizeName(loadedObject.name || filePath.split('\\').pop().split('.')[0] || 'Model');
                loadedObject.name = this._generateUniqueName(baseName);
                
                // Add default physics data to loaded models
                loadedObject.userData.physics = {
                    isDynamic: true,
                    mass: 1
                };
                
                this.scene.add(loadedObject);
                
                if (!suppressHistory) {
                    this.registerSceneObject(loadedObject);
                    this.setSelected(loadedObject);
                    
                    const action = {
                        undo: () => this.remove(loadedObject, true),
                        redo: () => {
                            this.scene.add(loadedObject);
                            this.registerSceneObject(loadedObject);
                            this.setSelected(loadedObject);
                        }
                    };
                    this.editor && this.editor.addHistory && this.editor.addHistory(action);
                }

                console.log('Model loaded successfully:', loadedObject);
                resolve(loadedObject);

            }, undefined, (error) => {
                console.error('An error happened during model loading:', error);
                alert('Ошибка при загрузке модели. Подробности в консоли.');
                reject(error);
            });
        });
    }

    add(type, category, suppressHistory = false) {
        let newObj;
        
        if (category === 'primitive') {
            if (!PRIMITIVE_TYPES.has(type)) return;
            newObj = createPrimitive(type);
        } else if (category === 'light') {
            if (!LIGHT_TYPES.has(type)) return;
            newObj = createLight(type);
        } else if (category === 'game') {
            if (!GAME_TYPES.has(type)) return;
            
            if (type === 'player_start') {
                const existing = this.scene.children.find(c => c.userData.isPlayerStart);
                if (existing) {
                    alert('На сцене уже есть Player Start. Может быть только один.');
                    this.setSelected(existing);
                    return;
                }
                newObj = createPlayerStart();
            }
        }

        if (!newObj) return;

        this.scene.add(newObj);
        this.cacheOriginalMaterials(newObj);

        if (!suppressHistory) {
            newObj.name = this._generateUniqueName(sanitizeName(newObj.name || newObj.type || 'Object'));
            this.registerSceneObject(newObj);
            this.setSelected(newObj);

            const action = {
                undo: () => this.remove(newObj, true),
                redo: () => {
                    this.scene.add(newObj);
                    this.registerSceneObject(newObj);
                    this.setSelected(newObj);
                }
            };
            this.editor && this.editor.addHistory && this.editor.addHistory(action);
        }

        return newObj;
    }

    remove(obj, suppressHistory = false) {
        if (!obj) return;
        if (!suppressHistory) {
            const action = {
                undo: () => {
                    this.scene.add(obj);
                    this.registerSceneObject(obj);
                    this.setSelected(obj);
                },
                redo: () => this.remove(obj, true)
            };
            this.editor && this.editor.addHistory && this.editor.addHistory(action);
        }

        try { if (obj.parent) obj.parent.remove(obj); } catch (e) {}
        const stored = this.sceneItems.get(obj.uuid);
        if (stored && stored.el && stored.el.parentNode) stored.el.parentNode.removeChild(stored.el);
        this.sceneItems.delete(obj.uuid);

        if (this.selected === obj) this.setSelected(null);
    }
    
    // --- SCENE SERIALIZATION & DESERIALIZATION ---

    serializeScene() {
        return this.scene.children
            .filter(obj => obj.userData.isEditorObject)
            .map(obj => {
                const data = {
                    uuid: obj.uuid,
                    name: obj.name,
                    type: obj.type,
                    position: obj.position.clone(),
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: obj.scale.clone(),
                    isModel: obj.userData.isModel || false,
                    isLight: obj.isLight,
                    isPlayerStart: obj.userData.isPlayerStart || false,
                    physics: obj.userData.physics, // Save physics properties
					 playerSettings: obj.userData.playerSettings
                };

                if (data.isModel) data.modelPath = obj.userData.modelPath;
                if (obj.userData.primitiveType) data.geometryType = obj.userData.primitiveType;
                if (obj.isLight) {
                    data.lightType = obj.userData.lightType;
                    data.color = obj.color.getHex();
                    data.intensity = obj.intensity;
                    data.castShadow = obj.castShadow;
                }
                return data;
            });
    }

    async deserializeScene(objectsData) {
        // Clear existing objects first
        const toRemove = [...this.scene.children.filter(c => c.userData.isEditorObject)];
        toRemove.forEach(o => this.remove(o, true));
        
        if (!Array.isArray(objectsData)) return;

        for (const objData of objectsData) {
            let newObject;

            if (objData.isModel && objData.modelPath) {
                try {
                    newObject = await this.loadModel(objData.modelPath, true);
                } catch (e) {
                    console.error(`Failed to load model from path ${objData.modelPath}`, e);
                    continue;
                }
            } else if (objData.isPlayerStart) {
                 newObject = this.add('player_start', 'game', true);
            } else {
                let category = objData.isLight ? 'light' : 'primitive';
                let type = objData.lightType || objData.geometryType;
                newObject = this.add(type, category, true);
            }

            if (!newObject) continue;
			if (objData.playerSettings) newObject.userData.playerSettings = objData.playerSettings;

            // Apply saved properties
            newObject.uuid = objData.uuid;
            newObject.name = objData.name;
            if (objData.position) newObject.position.set(objData.position.x, objData.position.y, objData.position.z);
            if (objData.rotation) newObject.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
            if (objData.scale) newObject.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
            if (objData.physics) newObject.userData.physics = objData.physics; // Restore physics properties
            
            if (objData.isLight) {
                if (objData.color) newObject.color.setHex(objData.color);
                if (objData.intensity !== undefined) newObject.intensity = objData.intensity;
                if (objData.castShadow !== undefined) newObject.castShadow = objData.castShadow;
            }
        }
        this.rebuildSceneListUI();
    }


    cacheOriginalMaterials(object) {
        object.traverse(node => {
            if (node.isMesh && !this.originalMaterials.has(node.uuid)) {
                this.originalMaterials.set(node.uuid, node.material);
            }
        });
    }

    rebuildSceneListUI() {
        if (!this.sceneListContainer) return;
        this.sceneListContainer.innerHTML = '';
        this.sceneItems.clear();
        this.nameCounters = Object.create(null);

        this.scene.children.forEach(child => {
            if (child.userData && child.userData.isHelper) return;
            if (child.userData && (child.userData.isEditorObject || child.userData.isPlayerStart)) {
                child.name = this._generateUniqueName(sanitizeName(child.name || child.type || 'Object'));
                this.registerSceneObject(child);
            }
        });
    }

    _generateUniqueName(base) {
        base = sanitizeName(base || 'Object');
        const namesInUse = new Set(Array.from(this.sceneItems.values()).map(v => v.obj.name));
        if (!namesInUse.has(base)) {
            if (!this.nameCounters[base]) this.nameCounters[base] = 1;
            return base;
        }

        let idx = this.nameCounters[base] || 1;
        let candidate = `${base}_${idx}`;
        while (namesInUse.has(candidate)) {
            idx++;
            candidate = `${base}_${idx}`;
        }
        this.nameCounters[base] = idx + 1;
        return candidate;
    }

    registerSceneObject(obj) {
        if (!this.sceneListContainer || !obj || !obj.uuid) return;

        if (this.sceneItems.has(obj.uuid)) {
            const existing = this.sceneItems.get(obj.uuid);
            if (existing && existing.el) {
                const titleEl = existing.el.querySelector('.vs-tree-item-title');
                if (titleEl) titleEl.textContent = obj.name || titleEl.textContent;
            }
            return;
        }

        obj.userData.isEditorObject = true; // Mark all managed objects this way

        const el = document.createElement('div');
        el.className = 'vs-tree-item';
        el.dataset.uuid = obj.uuid;

        const icon = document.createElement('div');
        icon.className = 'vs-icon';
        icon.textContent = (obj.type || 'OB').slice(0, 2).toUpperCase();

        const title = document.createElement('div');
        title.className = 'vs-tree-item-title';
        title.textContent = obj.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vs-btn';
        deleteBtn.innerHTML = '&#x2715;';
        deleteBtn.title = 'Удалить';
        deleteBtn.onclick = (e) => { e.stopPropagation(); this.remove(obj); };

        el.append(icon, title, deleteBtn);
        el.addEventListener('click', () => this.setSelected(obj));
        title.addEventListener('dblclick', (e) => { e.stopPropagation(); this._beginRename(obj, title); });

        this.sceneListContainer.appendChild(el);
        this.sceneItems.set(obj.uuid, { obj, el });

        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
    }


    _beginRename(obj, titleEl) {
        if (!titleEl) return;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'vs-input';
        input.value = obj.name || '';
        input.style.width = '100%';
        titleEl.textContent = '';
        titleEl.appendChild(input);
        input.focus();
        input.select();

        const finish = (commit) => {
            const newValRaw = input.value.trim();
            if (commit && newValRaw) {
                let candidateBase = sanitizeName(newValRaw);
                const otherNames = new Set(Array.from(this.sceneItems.values()).filter(v => v.obj.uuid !== obj.uuid).map(v => v.obj.name));
                let finalName = candidateBase;
                if (otherNames.has(finalName)) {
                    let idx = this.nameCounters[candidateBase] || 1;
                    while (otherNames.has(`${candidateBase}_${idx}`)) idx++;
                    finalName = `${candidateBase}_${idx}`;
                    this.nameCounters[candidateBase] = idx + 1;
                }
                obj.name = finalName;
            }
            titleEl.removeChild(input);
            titleEl.textContent = obj.name || '';
            const stored = this.sceneItems.get(obj.uuid);
            if (stored) stored.obj = obj;
        };

        const onKey = (ev) => {
            if (ev.key === 'Enter') {
                finish(true);
            } else if (ev.key === 'Escape') {
                finish(false);
            }
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', onKey);
    }

    highlightSceneListItem(uuid) {
        this.sceneItems.forEach(({ el }, id) => {
            if (!el) return;
            if (id === uuid) el.classList.add('active'); else el.classList.remove('active');
        });
    }

    setSelected(obj) {
        this.selected = obj || null;
        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
        this.updateInspector();
        window.dispatchEvent(new CustomEvent('selectionChanged', { detail: { selected: this.selected } }));
    }

     updateInspector() {
        const selected = this.selected;

        // Hide all optional panels
        this.lightAccordionItem.style.display = 'none';
        this.physicsAccordionItem.style.display = 'none';
        this.materialAccordionItem.style.display = 'none';
        this.playerSettingsAccordionItem.style.display = 'none'; // Hide new panel

        if (!selected) return;
        
        // Show Material and Physics for any mesh/group that isn't a light
        if (!selected.isLight) {
            this.materialAccordionItem.style.display = 'block';
            this.physicsAccordionItem.style.display = 'block';

            const physics = selected.userData.physics || { isDynamic: false, mass: 0 };
            document.getElementById('physics-dynamic-check').checked = physics.isDynamic;
            document.getElementById('physics-mass-number').value = physics.mass;
            document.getElementById('physics-mass-number').disabled = !physics.isDynamic;
            
            // Player Start has no configurable physics
            if (selected.userData.isPlayerStart) {
                 this.physicsAccordionItem.style.display = 'none';
            }
        }

       // --- SHOW AND POPULATE PLAYER SETTINGS PANEL ---
        if (selected.userData.isPlayerStart) {
            this.playerSettingsAccordionItem.style.display = 'block';
            this.physicsAccordionItem.style.display = 'none'; // Player Start visual marker has no physics component itself

            const settings = selected.userData.playerSettings || {};
            document.getElementById('player-movespeed').value = settings.moveSpeed;
            document.getElementById('player-runspeed').value = settings.runSpeed;
            document.getElementById('player-jumpheight').value = settings.jumpHeight;
            document.getElementById('player-mass').value = settings.playerMass;
            document.getElementById('player-height').value = settings.playerHeight;
            document.getElementById('player-radius').value = settings.playerRadius;
            document.getElementById('player-cam-height').value = settings.cameraHeight;
            document.getElementById('player-cam-fov').value = settings.fov;
        }
    }
}