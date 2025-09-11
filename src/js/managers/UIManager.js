// js/managers/UIManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { sanitizeName } from '../utils/helpers.js';

export default class UIManager {
    constructor({ sceneManager, objectManager, environmentManager, postprocessingManager, controlsManager }) {
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.environmentManager = environmentManager;
        this.postprocessingManager = postprocessingManager;
        this.controlsManager = controlsManager;
        
        this.gltfLoader = new GLTFLoader();
        this.fbxLoader = new FBXLoader();
        this.objLoader = new OBJLoader();

        this.initAllEventListeners();
    }

    initAllEventListeners() {
        this.initFileLoaders();
        this.initObjectCreation();
        this.initTransformTools();
        this.initWorldSettings();
        this.initPostprocessingSettings();
        this.initViewportSettings();
        this.initInspector();
		this.initSelectionOutline();
    }
	
	initSelectionOutline() {
        window.addEventListener('selectionChanged', (e) => {
            const selectedObject = e.detail.selected;
            if (selectedObject) {
                this.postprocessingManager.outlinePass.selectedObjects = [selectedObject];
            } else {
                this.postprocessingManager.outlinePass.selectedObjects = [];
            }
        });
    }
    
    // --- File I/O ---
    initFileLoaders() {
        const modelInput = document.getElementById('model-loader-input');
        document.getElementById('load-model-btn')?.addEventListener('click', () => modelInput.click());
        modelInput?.addEventListener('change', (e) => this.onModelLoad(e));
        
        const hdriInput = document.getElementById('hdri-loader-input');
        document.getElementById('load-hdri-btn')?.addEventListener('click', () => hdriInput.click());
        hdriInput?.addEventListener('change', (e) => {
             const file = e.target.files?.[0];
             if (file) {
                 const url = URL.createObjectURL(file);
                 this.environmentManager.loadHDRI(url);
                 URL.revokeObjectURL(url);
                 hdriInput.value = '';
             }
        });
    }

    onModelLoad(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const extension = file.name.split('.').pop().toLowerCase();
        
        const onLoad = (object, animations) => {
            object.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            object.name = sanitizeName(file.name);
            
            if (animations && animations.length) {
                const mixer = new THREE.AnimationMixer(object);
                mixer.clipAction(animations[0]).play();
                this.objectManager.mixers.push(mixer);
                object.userData.mixer = mixer;
            }

            this.objectManager.scene.add(object);
            this.objectManager.registerSceneObject(object);
            this.objectManager.cacheOriginalMaterials(object);
            this.objectManager.setSelected(object);
            URL.revokeObjectURL(url);
        };
        const onError = (error) => { console.error(error); alert('Не удалось загрузить модель.'); URL.revokeObjectURL(url); };

        switch (extension) {
            case 'glb': case 'gltf': this.gltfLoader.load(url, (gltf) => onLoad(gltf.scene, gltf.animations), undefined, onError); break;
            case 'fbx': this.fbxLoader.load(url, (fbx) => onLoad(fbx, fbx.animations), undefined, onError); break;
            case 'obj': this.objLoader.load(url, (obj) => onLoad(obj, []), undefined, onError); break;
            default: alert(`Ошибка: неподдерживаемый формат .${extension}`); URL.revokeObjectURL(url); break;
        }
        event.target.value = '';
    }

    // --- Scene & Objects ---
    initObjectCreation() {
        document.querySelectorAll('.add-primitive-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.objectManager.add(e.currentTarget.dataset.primitiveType, 'primitive');
            });
        });
        document.querySelectorAll('.add-light-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.objectManager.add(e.currentTarget.dataset.lightType, 'light');
            });
        });
         window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.objectManager.remove(this.objectManager.selected);
            }
        });
    }
    
    initTransformTools() {
        const [moveBtn, rotBtn, scaleBtn] = [...document.querySelectorAll('.vs-viewport-tools .vs-btn')];
        const setActiveTool = (btn) => { [moveBtn, rotBtn, scaleBtn].forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
        
        moveBtn?.addEventListener('click', () => { this.controlsManager.transform.setMode('translate'); setActiveTool(moveBtn); });
        rotBtn?.addEventListener('click', () => { this.controlsManager.transform.setMode('rotate'); setActiveTool(rotBtn); });
        scaleBtn?.addEventListener('click', () => { this.controlsManager.transform.setMode('scale'); setActiveTool(scaleBtn); });

        window.addEventListener('keydown', (e) => {
             if (e.target.tagName === 'INPUT' || this.controlsManager.pointerLock.isLocked) return;
             switch(e.key.toLowerCase()) {
                case 'w': moveBtn.click(); break;
                case 'e': rotBtn.click(); break;
                case 'r': scaleBtn.click(); break;
            }
        });
        
        moveBtn.click(); // Устанавливаем по умолчанию
    }
    
    initInspector() {
        // Мы не можем объявить `light` здесь, так как `selected` меняется.
        // Вместо этого мы будем получать актуальный выбранный объект внутри обработчика.
        const getSelectedLight = () => {
            const selected = this.objectManager.selected;
            return (selected && selected.isLight) ? selected : null;
        };

        document.getElementById('light-color-input')?.addEventListener('input', e => {
            const light = getSelectedLight();
            if (light) light.color.set(e.target.value);
        });
        document.getElementById('light-intensity-slider')?.addEventListener('input', e => {
            const light = getSelectedLight();
            if (light) {
                light.intensity = parseFloat(e.target.value);
                document.getElementById('light-intensity-number').value = e.target.value;
            }
        });
        document.getElementById('light-intensity-number')?.addEventListener('input', e => {
            const light = getSelectedLight();
            if (light) {
                light.intensity = parseFloat(e.target.value);
                document.getElementById('light-intensity-slider').value = e.target.value;
            }
        });
        document.getElementById('light-shadow-check')?.addEventListener('change', e => {
            const light = getSelectedLight();
            if (light) light.castShadow = e.target.checked;
        });
    }

    // --- World & Environment ---
    initWorldSettings() {
        const scene = this.sceneManager.scene;
        const sun = this.environmentManager.sun;
        const lensflare = this.environmentManager.lensflare;
        const fog = this.environmentManager.fog;
        const clouds = this.environmentManager.clouds;

        document.getElementById('ibl-intensity-slider')?.addEventListener('input', e => scene.environmentIntensity = parseFloat(e.target.value));
      const bgBlurSlider = document.getElementById('bg-blur-slider');
        if (bgBlurSlider) {
            bgBlurSlider.value = scene.backgroundBlurriness; // Устанавливаем значение из сцены
            bgBlurSlider.addEventListener('input', e => scene.backgroundBlurriness = parseFloat(e.target.value));
        }
        
        document.getElementById('sun-x-slider')?.addEventListener('input', e => { sun.position.x = parseFloat(e.target.value); lensflare.position.copy(sun.position); });
        document.getElementById('sun-y-slider')?.addEventListener('input', e => { sun.position.y = parseFloat(e.target.value); lensflare.position.copy(sun.position); });
        document.getElementById('sun-z-slider')?.addEventListener('input', e => { sun.position.z = parseFloat(e.target.value); lensflare.position.copy(sun.position); });
        document.getElementById('sun-intensity-slider')?.addEventListener('input', e => sun.intensity = parseFloat(e.target.value));
        document.getElementById('sun-shadow-check')?.addEventListener('change', e => sun.castShadow = e.target.checked);
        
        document.getElementById('fog-color-input')?.addEventListener('input', e => fog.color.set(e.target.value));
        document.getElementById('fog-density-slider')?.addEventListener('input', e => fog.density = parseFloat(e.target.value));
        
        const skyboxModeSelect = document.getElementById('skybox-mode-select');
        skyboxModeSelect?.addEventListener('change', (e) => this.updateSkybox(e.target.value));
        document.getElementById('skybox-color-input')?.addEventListener('input', () => this.updateSkybox('color'));
        document.getElementById('skybox-gradient-top-input')?.addEventListener('input', () => this.updateSkybox('gradient'));
        document.getElementById('skybox-gradient-bottom-input')?.addEventListener('input', () => this.updateSkybox('gradient'));
        
        if (clouds && clouds.material) {
            document.getElementById('cloud-enabled-check')?.addEventListener('change', e => clouds.visible = e.target.checked);
            document.getElementById('cloud-speed-slider')?.addEventListener('input', e => clouds.material.uniforms.u_speed.value = parseFloat(e.target.value));
            // ... и так далее для всех слайдеров облаков
        }
    }
    
    updateSkybox(mode) {
        const values = {
            color: document.getElementById('skybox-color-input').value,
            top: document.getElementById('skybox-gradient-top-input').value,
            bottom: document.getElementById('skybox-gradient-bottom-input').value
        };
        this.environmentManager.setSkyboxMode(mode, values);
    }

    // --- Post-Processing ---
    initPostprocessingSettings() {
        const pp = this.postprocessingManager;
        document.getElementById('bloom-enabled-check')?.addEventListener('change', e => pp.bloomPass.enabled = e.target.checked);
        document.getElementById('bloom-threshold-slider')?.addEventListener('input', e => pp.bloomPass.threshold = parseFloat(e.target.value));
        document.getElementById('bloom-strength-slider')?.addEventListener('input', e => pp.bloomPass.strength = parseFloat(e.target.value));
        document.getElementById('bloom-radius-slider')?.addEventListener('input', e => pp.bloomPass.radius = parseFloat(e.target.value));
        
        document.getElementById('vignette-strength-slider')?.addEventListener('input', e => pp.vignettePass.uniforms.strength.value = parseFloat(e.target.value));
        document.getElementById('chromatic-aberation-amount-slider')?.addEventListener('input', e => pp.chromaticAberrationPass.uniforms.amount.value = parseFloat(e.target.value));
        
        document.getElementById('outline-enabled-check')?.addEventListener('change', e => pp.outlinePass.enabled = e.target.checked);
        document.getElementById('outline-thickness-slider')?.addEventListener('input', e => pp.outlinePass.edgeThickness = parseFloat(e.target.value));
        document.getElementById('outline-color-input')?.addEventListener('input', e => pp.outlinePass.visibleEdgeColor.set(e.target.value));
        
        document.getElementById('lensflare-enabled-check')?.addEventListener('change', e => this.environmentManager.lensflare.visible = e.target.checked);
    }
    
    // --- Viewport ---
    initViewportSettings() {
        document.getElementById('controls-orbit-btn')?.addEventListener('click', () => this.controlsManager.setControlType('orbit'));
        document.getElementById('controls-game-btn')?.addEventListener('click', () => this.controlsManager.setControlType('game'));
        
        document.getElementById('view-mode-final-btn')?.addEventListener('click', () => this.objectManager.setViewMode('final'));
        document.getElementById('view-mode-shaded-btn')?.addEventListener('click', () => this.objectManager.setViewMode('shaded'));
        document.getElementById('view-mode-wireframe-btn')?.addEventListener('click', () => this.objectManager.setViewMode('wireframe'));
        document.getElementById('view-mode-transparent-btn')?.addEventListener('click', () => this.objectManager.setViewMode('transparent'));
    }
}