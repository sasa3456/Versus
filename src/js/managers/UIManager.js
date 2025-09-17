export default class UIManager {
    constructor({ sceneManager, objectManager, environmentManager, postprocessingManager, controlsManager, physicsManager, editor }) {
        this.sceneManager = sceneManager;
        this.objectManager = objectManager;
        this.environmentManager = environmentManager;
        this.postprocessingManager = postprocessingManager;
        this.controlsManager = controlsManager;
        this.physicsManager = physicsManager; // Store physics manager
        this.editor = editor;

        this.assetTreeContainer = document.getElementById('asset-tree-container');
        this.assetGridContainer = document.getElementById('asset-grid');
        this.assetBreadcrumbsContainer = document.getElementById('asset-breadcrumbs');
        this.currentAssetPath = null;
        this.assetsRootPath = null;
		
		this.assetRefreshDebounce = null;

        this.initUI();
        this.setupAssetChangeListener();
    }

    initUI() {
        this.bindSceneObjectControls();
        this.bindWorldControls();
        this.bindViewportControls();
        this.bindInspector();
        this.bindUndoRedo();
        this.bindAssetExplorer();
        this.bindPlayControls(); // New binding for play/stop

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
    }
    
    bindPlayControls() {
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        
        this.playBtn.addEventListener('click', () => this.editor.play());
        this.stopBtn.addEventListener('click', () => this.editor.stop());
    }
    
    setPlayMode(isPlaying) {
        if (isPlaying) {
            this.playBtn.style.display = 'none';
            this.stopBtn.style.display = 'block';
            // Keep all panels visible during play mode
            
            // Create simple HUD overlay if missing
            if (!this._playHud) {
                const hud = document.createElement('div');
                hud.className = 'vs-play-hud';
                hud.style.position = 'fixed';
                hud.style.top = '10px';
                hud.style.left = '50%';
                hud.style.transform = 'translateX(-50%)';
                hud.style.padding = '6px 10px';
                hud.style.background = 'rgba(0,0,0,0.5)';
                hud.style.color = '#fff';
                hud.style.borderRadius = '6px';
                hud.style.zIndex = '1060';
                hud.style.fontSize = '12px';
                hud.style.pointerEvents = 'none';
                hud.textContent = 'PLAY MODE — Esc: разблокировать курсор, F: переключить захват, WASD/Space: движение';
                document.body.appendChild(hud);
                this._playHud = hud;
            } else {
                this._playHud.style.display = '';
            }
        } else {
            this.playBtn.style.display = 'block';
            this.stopBtn.style.display = 'none';
            // Hide HUD when stopping play
            
            if (this._playHud) this._playHud.style.display = 'none';
        }
        // Ensure renderer and postprocessing resize to the new layout
        try { this.editor.onResize && this.editor.onResize(); } catch (e) {}
    }
	
	setupAssetChangeListener() {
        window.electronAPI.onAssetChange((data) => {
            console.log('File system change received by UI:', data);
            
            // Debounce the refresh to avoid spamming on multiple quick events
            clearTimeout(this.assetRefreshDebounce);
            
            this.assetRefreshDebounce = setTimeout(() => {
                console.log('Debounced refresh triggered.');
                // A simple and robust way to handle any change is to refresh the whole explorer
                this.refreshAssetExplorer();
            }, 250); // Refresh after 250ms of no new events
        });
    }
    
    // --- UPDATED AND NEW ASSET EXPLORER METHODS ---

    /**
     * Refreshes the entire asset explorer, rebuilding the tree and navigating to the root.
     * Should be called after a project is loaded.
     */
 async refreshAssetExplorer() {
        if (!this.editor.projectPath) return;

        // Store the currently viewed path to restore it after refresh
        const currentPathToRestore = this.currentAssetPath || `${this.editor.projectPath}\\Assets`;
        
        this.assetsRootPath = `${this.editor.projectPath}\\Assets`;
        
        const treeData = await window.electronAPI.getAssetsTree(this.editor.projectPath);
        this.renderAssetTree(treeData, this.assetTreeContainer);
        
        // Navigate to the last known path
        this.navigateToAssetPath(currentPathToRestore);
    }

    /**
     * Recursively renders the directory tree view.
     */
    renderAssetTree(nodes, parentElement) {
        parentElement.innerHTML = '';
        if (!nodes) return;

        nodes.forEach(node => {
            if (!node.isDirectory) return; // Only show directories in the tree

            const item = document.createElement('div');
            item.className = 'vs-asset-tree-item';
            item.textContent = node.name;
            item.dataset.path = node.path;
            
            item.addEventListener('click', () => this.navigateToAssetPath(node.path));

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'vs-asset-tree-children';
            
            parentElement.appendChild(item);
            parentElement.appendChild(childrenContainer);

            if (node.children && node.children.length > 0) {
                this.renderAssetTree(node.children, childrenContainer);
            }
        });
    }
    
    /**
     * Navigates to a specific path, updating the grid and breadcrumbs.
     */
    async navigateToAssetPath(dirPath) {
        this.currentAssetPath = dirPath;

        // Update active state in tree
        document.querySelectorAll('.vs-asset-tree-item').forEach(el => {
            el.classList.toggle('active', el.dataset.path === dirPath);
        });

        const items = await window.electronAPI.readDir(dirPath);
        this.renderAssetGrid(items);
        this.renderBreadcrumbs(dirPath);
    }
    
    /**
     * Renders the file and folder icons in the main grid view.
     */
    renderAssetGrid(items) {
        this.assetGridContainer.innerHTML = '';
        if (!items) return;

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'vs-asset-item';
            el.dataset.path = item.path;
            el.dataset.isDirectory = item.isDirectory;

            // Simple icon logic based on type
            const icon = document.createElement('div');
            icon.className = 'icon';
            if (item.isDirectory) {
                icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7H12L10 5H6C4.89543 5 4 5.89543 4 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                el.addEventListener('dblclick', () => this.navigateToAssetPath(item.path));
            } else {
                icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                el.draggable = true;
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', item.path);
                    el.classList.add('dragging');
                });
                el.addEventListener('dragend', () => el.classList.remove('dragging'));
            }

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = item.name;

            el.appendChild(icon);
            el.appendChild(name);
            this.assetGridContainer.appendChild(el);
        });
    }

    /**
     * Renders the breadcrumb navigation.
     */
    renderBreadcrumbs(currentPath) {
        this.assetBreadcrumbsContainer.innerHTML = '';
        if (!currentPath || !this.assetsRootPath) return;

        const ep = (window.electronAPI && window.electronAPI.path) ? window.electronAPI.path : null;
        if (!ep) {
            // Fallback: cannot render breadcrumbs without path helpers in Electron
            const current = document.createElement('span');
            current.className = 'current';
            current.textContent = currentPath;
            this.assetBreadcrumbsContainer.appendChild(current);
            return;
        }

        const relativePath = ep.relative(this.assetsRootPath, currentPath);
        const parts = relativePath.split(ep.sep).filter(p => p);
        
        let cumulativePath = this.assetsRootPath;

        const rootLink = document.createElement('a');
        rootLink.href = '#';
        rootLink.textContent = 'Assets';
        rootLink.onclick = (e) => { e.preventDefault(); this.navigateToAssetPath(this.assetsRootPath); };
        this.assetBreadcrumbsContainer.appendChild(rootLink);

        parts.forEach((part, index) => {
            cumulativePath = ep.join(cumulativePath, part);

            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.textContent = '/';
            this.assetBreadcrumbsContainer.appendChild(separator);
            
            if (index === parts.length - 1 && relativePath !== '') {
                const current = document.createElement('span');
                current.className = 'current';
                current.textContent = part;
                this.assetBreadcrumbsContainer.appendChild(current);
            } else {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = part;
                const path_to_navigate = cumulativePath;
                link.onclick = (e) => { e.preventDefault(); this.navigateToAssetPath(path_to_navigate); };
                this.assetBreadcrumbsContainer.appendChild(link);
            }
        });
    }


    /**
     * Initializes drag-and-drop functionality for the asset explorer and viewport.
     */
    bindAssetExplorer() {
        const viewport = document.getElementById('viewport-container');
        const assetExplorerBody = document.querySelector('.vs-asset-explorer-body'); // <-- Целимся в тело проводника
        const supportedModelExtensions = ['obj', 'fbx', 'glb', 'gltf', 'dae'];

        // --- ОБРАБОТКА DRAG-AND-DROP ДЛЯ ВСЕГО ПРОВОДНИКА АССЕТОВ ---
        if (assetExplorerBody) {
            assetExplorerBody.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Визуальный отклик только при перетаскивании файлов извне
                if (Array.from(e.dataTransfer.types).includes('Files')) {
                    assetExplorerBody.classList.add('drag-over');
                }
            });

            assetExplorerBody.addEventListener('dragleave', () => {
                assetExplorerBody.classList.remove('drag-over');
            });

            assetExplorerBody.addEventListener('drop', async (e) => {
                e.preventDefault();
                assetExplorerBody.classList.remove('drag-over');
                
                if (e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files);
                    console.log(`Importing ${files.length} external file(s) to: ${this.currentAssetPath}`);
                    
                    for (const file of files) {
                        const result = await window.electronAPI.importAssetToPath(this.currentAssetPath, file.path);
                        if (!result.success) {
                            console.error(`Failed to import ${file.name}:`, result.error);
                        }
                    }
                    // После импорта файловый наблюдатель автоматически обновит UI.
                }
            });
        }
        
        // --- ОБРАБОТКА DRAG-AND-DROP ДЛЯ ВЬЮПОРТА ---
        if (viewport) {
             viewport.addEventListener('dragover', (e) => {
                e.preventDefault();
                viewport.classList.add('drag-over');
            });
            
            viewport.addEventListener('dragleave', () => {
                viewport.classList.remove('drag-over');
            });

            viewport.addEventListener('drop', async (e) => {
                e.preventDefault();
                viewport.classList.remove('drag-over');
                
                // 1. Обработка перетаскивания из файлового менеджера Versus
                const assetPath = e.dataTransfer.getData('text/plain');
                if (assetPath) {
                    const extension = assetPath.split('.').pop().toLowerCase();
                    if (supportedModelExtensions.includes(extension)) {
                        console.log('Loading model from internal asset:', assetPath);
                        // Загружаем модель. Путь должен быть относительным или абсолютным.
                        // Для Electron проще работать с абсолютными путями.
                        this.objectManager.loadModel(assetPath);
                    }
                    return; // Завершаем обработку
                }

                // 2. Обработка перетаскивания из проводника Windows
                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    const extension = file.name.split('.').pop().toLowerCase();

                    if (supportedModelExtensions.includes(extension)) {
                        console.log('Importing and loading external model:', file.path);
                        const result = await window.electronAPI.importAssetToPath(this.currentAssetPath, file.path);
                        
                        if (result.success) {
                            console.log('Import successful, loading into scene from:', result.path);
                            this.objectManager.loadModel(result.path);
                        } else {
                            console.error('Import failed:', result.error);
                        }
                    }
                }
            });
        }
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
        
        // --- Add Player Start Button Listener ---
        document.getElementById('add-player-start-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.objectManager.add('player_start', 'game');
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
        addListener('lensflare-intensity-slider', 'input', el => {
            const lf = this.environmentManager.lensflare;
            if (!lf) return;
            if (!lf.userData.baseSizes) {
                lf.userData.baseSizes = lf.elements ? lf.elements.map(e => e.size) : (lf.children || []).map(e => e.size || 0);
            }
            const val = parseFloat(el.value);
            if (lf.elements && lf.elements.length) {
                lf.elements.forEach((elem, i) => { if (lf.userData.baseSizes[i] != null) elem.size = lf.userData.baseSizes[i] * (0.5 + val); });
            } else if (lf.children && lf.children.length) {
                lf.children.forEach((elem, i) => { if (lf.userData.baseSizes[i] != null) elem.size = lf.userData.baseSizes[i] * (0.5 + val); });
            }
        });
        
        // Clouds
        addListener('cloud-enabled-check', 'change', el => this.environmentManager.clouds.visible = el.checked);
        addListener('cloud-speed-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_speed.value = parseFloat(el.value));
        addListener('cloud-density-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_density.value = parseFloat(el.value));
        addListener('cloud-absorption-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_absorption.value = parseFloat(el.value));
        addListener('cloud-light-absorption-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_light_absorption_factor.value = parseFloat(el.value));
        addListener('cloud-min-height-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_cloud_min_height.value = parseFloat(el.value));
        addListener('cloud-max-height-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_cloud_max_height.value = parseFloat(el.value));
        addListener('cloud-noise-scale-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_noise_scale.value = parseFloat(el.value));
        addListener('cloud-detail-influence-slider', 'input', el => this.environmentManager.clouds.material.uniforms.u_detail_influence.value = parseFloat(el.value));
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

        // Light controls
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

        // Physics controls
        addDirtyListener('physics-dynamic-check', 'change', el => {
            const phys = this.objectManager.selected.userData.physics || { isDynamic: false, mass: 0 };
            phys.isDynamic = el.checked;
            if (!el.checked) phys.mass = 0;
            this.objectManager.selected.userData.physics = phys;
            const massEl = document.getElementById('physics-mass-number');
            if (massEl) massEl.disabled = !el.checked;
        });
        addDirtyListener('physics-mass-number', 'input', el => {
            const phys = this.objectManager.selected.userData.physics || { isDynamic: false, mass: 0 };
            const m = parseFloat(el.value);
            phys.mass = isNaN(m) ? 0 : m;
            phys.isDynamic = phys.mass > 0 ? true : phys.isDynamic;
            this.objectManager.selected.userData.physics = phys;
        });

        // Player settings (only when Player Start selected)
        const updatePlayerSetting = (key, val) => {
            const sel = this.objectManager.selected;
            if (!sel) return;
            if (!sel.userData.playerSettings) sel.userData.playerSettings = {};
            sel.userData.playerSettings[key] = val;
        };
        addDirtyListener('player-movespeed', 'input', el => updatePlayerSetting('moveSpeed', parseFloat(el.value)));
        addDirtyListener('player-runspeed', 'input', el => updatePlayerSetting('runSpeed', parseFloat(el.value)));
        addDirtyListener('player-jumpheight', 'input', el => updatePlayerSetting('jumpHeight', parseFloat(el.value)));
        addDirtyListener('player-mass', 'input', el => updatePlayerSetting('playerMass', parseFloat(el.value)));
        addDirtyListener('player-height', 'input', el => updatePlayerSetting('playerHeight', parseFloat(el.value)));
        addDirtyListener('player-radius', 'input', el => updatePlayerSetting('playerRadius', parseFloat(el.value)));
        addDirtyListener('player-cam-height', 'input', el => updatePlayerSetting('cameraHeight', parseFloat(el.value)));
        addDirtyListener('player-cam-fov', 'input', el => {
            updatePlayerSetting('fov', parseFloat(el.value));
            if (this.objectManager.selected?.userData?.isPlayerStart) {
                this.sceneManager.camera.fov = parseFloat(el.value);
                this.sceneManager.camera.updateProjectionMatrix();
            }
        });
    }
}