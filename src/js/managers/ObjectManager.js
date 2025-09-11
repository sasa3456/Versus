// js/managers/ObjectManager.js
import * as THREE from 'three';
import { sanitizeName } from '../utils/helpers.js';
import { createPrimitive, createLight } from '../utils/creators.js';

export default class ObjectManager {
    constructor(scene, mixers) {
        this.scene = scene;
        this.mixers = mixers;
        this.selected = null;
        
        this.originalMaterials = new Map();
        this.defaultShadedMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

        this.sceneListContainer = document.querySelector('.vs-tree');
        this.sceneItems = new Map();
        this.lightAccordionItem = document.getElementById('light-accordion-item');
    }

    // --- Object Creation / Deletion ---
    
    add(type, category) {
        const newObj = (category === 'primitive') ? createPrimitive(type) : createLight(type);
        if (newObj) {
            this.scene.add(newObj);
            this.cacheOriginalMaterials(newObj);
            this.registerSceneObject(newObj);
            this.setSelected(newObj);
        }
    }

    remove(obj) {
        if (!obj) return;
        
        if (obj.userData.mixer) {
            const index = this.mixers.indexOf(obj.userData.mixer);
            if (index > -1) this.mixers.splice(index, 1);
        }

        if (obj.parent) obj.parent.remove(obj);
        
        const entry = this.sceneItems.get(obj.uuid);
        if (entry) {
            entry.el.remove();
            this.sceneItems.delete(obj.uuid);
        }

        if (this.selected === obj) this.setSelected(null);
        
        obj.traverse((c) => {
            if (c.isMesh) this.originalMaterials.delete(c.uuid);
            if (c.geometry?.dispose) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose?.());
                else if (c.material.dispose) c.material.dispose();
            }
        });
    }

    // --- Selection ---

    setSelected(object) {
        this.selected = object || null;
        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
        this.updateInspector();
        
        // Отправляем событие, чтобы другие менеджеры (ControlsManager) могли отреагировать
        window.dispatchEvent(new CustomEvent('selectionChanged', { detail: { selected: this.selected } }));
    }

    // --- Material & View Modes ---
    
    cacheOriginalMaterials(object) {
        object.traverse(node => {
            if (node.isMesh && !this.originalMaterials.has(node.uuid)) {
                this.originalMaterials.set(node.uuid, node.material);
            }
        });
    }
    
    setViewMode(mode) {
        this.scene.traverse(node => {
            if (node.isMesh && this.originalMaterials.has(node.uuid)) {
                const originalMaterial = this.originalMaterials.get(node.uuid);
                if (mode === 'final') {
                    node.material = originalMaterial;
                    return;
                }
                
                const newMaterial = originalMaterial.clone();
                newMaterial.wireframe = false;
                newMaterial.transparent = originalMaterial.transparent;
                newMaterial.opacity = originalMaterial.opacity;
                
                switch (mode) {
                    case 'shaded': node.material = this.defaultShadedMaterial; break;
                    case 'wireframe':
                        newMaterial.wireframe = true;
                        node.material = newMaterial;
                        break;
                    case 'transparent':
                        newMaterial.transparent = true;
                        newMaterial.opacity = 0.5;
                        node.material = newMaterial;
                        break;
                }
            }
        });
    }

    // --- UI Management ---
    
    rebuildSceneListUI() {
        if (!this.sceneListContainer) return;
        this.sceneListContainer.innerHTML = '';
        this.sceneItems.clear();
        this.scene.children.forEach(child => {
            if (child.userData.isHelper || child.isTransformControls || child.name === 'GRID_HELPER' || child.isLensflare) return;
             // Проверяем, не является ли объект облаком (у него нет userData)
            if (child.type === "Mesh" && child.geometry?.type === "BoxGeometry" && child.material?.isShaderMaterial) return;

            this.registerSceneObject(child);
            this.cacheOriginalMaterials(child);
        });
    }
    
    registerSceneObject(obj) {
        if (!this.sceneListContainer || this.sceneItems.has(obj.uuid)) return;
        
        obj.userData.isEditorObject = true;
        obj.name = sanitizeName(obj.name || obj.type || 'Object');
        
        const el = this.createSceneListItem(obj);
        if (!el) return;
        
        this.sceneListContainer.appendChild(el);
        this.sceneItems.set(obj.uuid, { obj, el });
        this.highlightSceneListItem(this.selected ? this.selected.uuid : null);
    }
    
    createSceneListItem(obj) {
        const item = document.createElement('div');
        item.className = 'vs-tree-item';
        item.dataset.uuid = obj.uuid;
        
        const icon = document.createElement('div');
        icon.className = 'vs-icon';
        icon.textContent = (obj.type || 'OB').slice(0, 2).toUpperCase();
        
        const title = document.createElement('div');
        title.className = 'vs-tree-item-title';
        title.textContent = obj.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'vs-btn';
        deleteBtn.innerHTML = '&#x2715;'; // Крестик
        deleteBtn.onclick = (e) => { e.stopPropagation(); this.remove(obj); };
        
        item.append(icon, title, deleteBtn);
        item.onclick = () => this.setSelected(obj);
        
        return item;
    }
    
    highlightSceneListItem(uuid) {
        this.sceneItems.forEach(({ el }, id) => el.classList.toggle('active', id === uuid));
    }
    
    updateInspector() {
        if (this.selected && this.selected.isLight) {
            this.lightAccordionItem.style.display = 'block';
            const light = this.selected;
            document.getElementById('light-color-input').value = '#' + light.color.getHexString();
            document.getElementById('light-intensity-slider').value = light.intensity;
            document.getElementById('light-intensity-number').value = light.intensity;
            document.getElementById('light-shadow-check').checked = light.castShadow;
        } else {
            this.lightAccordionItem.style.display = 'none';
        }
    }
}