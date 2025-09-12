// js/managers/UIManager.js
export default class UIManager {
    constructor({ sceneManager, objectManager, environmentManager, postprocessingManager, controlsManager, editor }) {
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.environmentManager = environmentManager;
        this.postprocessingManager = postprocessingManager;
        this.controlsManager = controlsManager;
        this.editor = editor;

        this.initUI();
    }

    initUI() {
        this.bindSceneObjectControls();
        this.bindWorldControls();
        this.bindViewportControls();
        this.bindInspector();
        this.bindUndoRedo();

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }
    
    bindUndoRedo() {
        this.undoBtn = document.getElementById('undo-btn');
        this.redoBtn = document.getElementById('redo-btn');

        this.undoBtn.addEventListener('click', () => this.editor.undo());
        this.redoBtn.addEventListener('click', () => this.editor.redo());
        
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        if (!this.undoBtn || !this.redoBtn) return;
        this.undoBtn.disabled = this.editor.undoStack.length === 0;
        this.redoBtn.disabled = this.editor.redoStack.length === 0;
    }

    bindSceneObjectControls() {
        document.querySelectorAll('.add-primitive-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.objectManager.add(e.target.dataset.primitiveType, 'primitive');
            });
        });
        
        document.querySelectorAll('.add-light-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.objectManager.add(e.target.dataset.lightType, 'light');
            });
        });
    }

    bindWorldControls() {
        const addListener = (id, event, callback) => {
            document.getElementById(id).addEventListener(event, e => {
                callback(e.target);
                this.editor.isDirty = true;
            });
        };

        // Sun
        addListener('sun-x-slider', 'input', el => this.environmentManager.sun.position.x = parseFloat(el.value));
        addListener('sun-y-slider', 'input', el => this.environmentManager.sun.position.y = parseFloat(el.value));
        addListener('sun-z-slider', 'input', el => this.environmentManager.sun.position.z = parseFloat(el.value));
        addListener('sun-intensity-slider', 'input', el => this.environmentManager.sun.intensity = parseFloat(el.value));
        addListener('sun-shadow-check', 'change', el => this.environmentManager.sun.castShadow = el.checked);
        
        // IBL & Background
        addListener('ibl-intensity-slider', 'input', el => this.sceneManager.scene.environmentIntensity = parseFloat(el.value));
        addListener('bg-blur-slider', 'input', el => this.sceneManager.scene.backgroundBlurriness = parseFloat(el.value));
        addListener('skybox-mode-select', 'change', el => this.updateSkyboxMode(el.value));
        addListener('skybox-color-input', 'input', () => this.updateSkyboxMode('color'));
        addListener('skybox-gradient-top-input', 'input', () => this.updateSkyboxMode('gradient'));
        addListener('skybox-gradient-bottom-input', 'input', () => this.updateSkyboxMode('gradient'));
        
        // Fog
        addListener('fog-color-input', 'input', el => this.environmentManager.fog.color.set(el.value));
        addListener('fog-density-slider', 'input', el => this.environmentManager.fog.density = parseFloat(el.value));

        // Bloom
        addListener('bloom-enabled-check', 'change', el => this.postprocessingManager.bloomPass.enabled = el.checked);
        addListener('bloom-threshold-slider', 'input', el => this.postprocessingManager.bloomPass.threshold = parseFloat(el.value));
        addListener('bloom-strength-slider', 'input', el => this.postprocessingManager.bloomPass.strength = parseFloat(el.value));
        addListener('bloom-radius-slider', 'input', el => this.postprocessingManager.bloomPass.radius = parseFloat(el.value));
        
        // Post-processing
        addListener('vignette-strength-slider', 'input', el => this.postprocessingManager.vignettePass.uniforms.strength.value = parseFloat(el.value));
        addListener('chromatic-aberation-amount-slider', 'input', el => this.postprocessingManager.chromaticAberrationPass.uniforms.amount.value = parseFloat(el.value));

        // Outline
        addListener('outline-enabled-check', 'change', el => this.postprocessingManager.outlinePass.enabled = el.checked);
        addListener('outline-thickness-slider', 'input', el => this.postprocessingManager.outlinePass.edgeStrength = parseFloat(el.value));
        addListener('outline-color-input', 'input', el => this.postprocessingManager.outlinePass.visibleEdgeColor.set(el.value));

        // Lensflare
        addListener('lensflare-enabled-check', 'change', el => this.environmentManager.lensflare.visible = el.checked);
        
        // Clouds
        addListener('cloud-enabled-check', 'change', el => this.environmentManager.clouds.visible = el.checked);
        addListener('cloud-speed-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_speed.value = parseFloat(el.value));
        addListener('cloud-density-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_density.value = parseFloat(el.value));
    }
    
    /**
     * Updates all world and post-processing settings and their UI from a saved state object.
     * @param {object} state - The full state object from a project file.
     */
    updateAllFromState(state) {
        if (!state) return;
        
        const { environment, postprocessing } = state;
        const setValue = (id, value, isChecked = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isChecked) el.checked = value;
                else el.value = value;
                el.dispatchEvent(new Event(el.type === 'checkbox' ? 'change' : 'input'));
            }
        };

        if (environment) {
            setValue('sun-x-slider', environment.sunPosX);
            setValue('sun-y-slider', environment.sunPosY);
            setValue('sun-z-slider', environment.sunPosZ);
            setValue('sun-intensity-slider', environment.sunIntensity);
            setValue('sun-shadow-check', environment.sunShadow, true);
            setValue('ibl-intensity-slider', environment.iblIntensity);
            setValue('bg-blur-slider', environment.bgBlur);
            setValue('fog-color-input', `#${environment.fogColor.toString(16).padStart(6, '0')}`);
            setValue('fog-density-slider', environment.fogDensity);
            setValue('lensflare-enabled-check', environment.lensflareEnabled, true);
            setValue('cloud-enabled-check', environment.cloudsEnabled, true);
            setValue('cloud-speed-slider', environment.cloudSpeed);
            setValue('cloud-density-slider', environment.cloudDensity);
        }

        if (postprocessing) {
            setValue('bloom-enabled-check', postprocessing.bloomEnabled, true);
            setValue('bloom-threshold-slider', postprocessing.bloomThreshold);
            setValue('bloom-strength-slider', postprocessing.bloomStrength);
            setValue('bloom-radius-slider', postprocessing.bloomRadius);
            setValue('vignette-strength-slider', postprocessing.vignetteStrength);
            setValue('chromatic-aberation-amount-slider', postprocessing.chromaticAberration);
            setValue('outline-enabled-check', postprocessing.outlineEnabled, true);
            setValue('outline-thickness-slider', postprocessing.outlineThickness);
            setValue('outline-color-input', `#${postprocessing.outlineColor.toString(16).padStart(6, '0')}`);
        }
    }

    updateSkyboxMode(mode) {
        const values = {
            color: document.getElementById('skybox-color-input').value,
            top: document.getElementById('skybox-gradient-top-input').value,
            bottom: document.getElementById('skybox-gradient-bottom-input').value,
        };
        this.environmentManager.setSkyboxMode(mode || 'hdri', values);
        this.editor.isDirty = true;
    }

    bindViewportControls() {
        document.getElementById('controls-orbit-btn').addEventListener('click', () => this.controlsManager.setControlType('orbit'));
        document.getElementById('controls-game-btn').addEventListener('click', () => this.controlsManager.setControlType('game'));
        document.getElementById('view-mode-final-btn').addEventListener('click', () => this.objectManager.setViewMode('final'));
        document.getElementById('view-mode-shaded-btn').addEventListener('click', () => this.objectManager.setViewMode('shaded'));
        document.getElementById('view-mode-wireframe-btn').addEventListener('click', () => this.objectManager.setViewMode('wireframe'));
        document.getElementById('view-mode-transparent-btn').addEventListener('click', () => this.objectManager.setViewMode('transparent'));
    }
    
    bindInspector() {
        window.addEventListener('selectionChanged', (e) => {
            const selected = e.detail.selected;
            if (selected?.isLight) {
                document.getElementById('light-color-input').value = '#' + selected.color.getHexString();
                document.getElementById('light-intensity-slider').value = selected.intensity;
                document.getElementById('light-intensity-number').value = selected.intensity;
                document.getElementById('light-shadow-check').checked = selected.castShadow;
            }
        });
        
        const addDirtyListener = (id, event, callback) => {
             document.getElementById(id).addEventListener(event, e => {
                if (this.objectManager.selected) {
                    callback(e.target);
                    this.editor.isDirty = true;
                }
            });
        };

        addDirtyListener('light-color-input', 'input', el => this.objectManager.selected.color.set(el.value));
        addDirtyListener('light-intensity-slider', 'input', el => {
            const val = parseFloat(el.value);
            this.objectManager.selected.intensity = val;
            document.getElementById('light-intensity-number').value = val;
        });
        addDirtyListener('light-intensity-number', 'input', el => {
            const val = parseFloat(el.value);
            this.objectManager.selected.intensity = val;
            document.getElementById('light-intensity-slider').value = val;
        });
        addDirtyListener('light-shadow-check', 'change', el => this.objectManager.selected.castShadow = el.checked);
    }
}