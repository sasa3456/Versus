// js/renderer.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { createVolumetricClouds } from './VolumetricClouds.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Встроенный код для DirectionalLightHelper и PointLightHelper
class DirectionalLightHelper extends THREE.Object3D {
    constructor( light, size, color ) {
        super();
        this.light = light;
        this.light.updateMatrixWorld();
        this.matrix = light.matrixWorld;
        this.matrixAutoUpdate = false;
        this.color = color;
        const geometry = new THREE.BufferGeometry();
        const positions = [ -1, 1, 0, 1, 1, 0, 1, -1, 0, -1, -1, 0, -1, 1, 0 ];
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        const material = new THREE.LineBasicMaterial( { fog: false } );
        this.add( new THREE.Line( geometry, material ) );
        this.update = function ( color ) {
            if ( color !== undefined ) {
                material.color.set( color );
            } else {
                material.color.copy( this.light.color );
            }
        };
        this.update();
    }
}
class PointLightHelper extends THREE.Object3D {
    constructor( light, sphereSize, color ) {
        super();
        this.light = light;
        this.light.updateMatrixWorld();
        this.matrix = light.matrixWorld;
        this.matrixAutoUpdate = false;
        this.color = color;
        const geometry = new THREE.SphereGeometry( sphereSize, 4, 2 );
        const material = new THREE.MeshBasicMaterial( { wireframe: true, fog: false } );
        this.add( new THREE.Mesh( geometry, material ) );
        this.update = function ( color ) {
            if ( color !== undefined ) {
                material.color.set( color );
            } else {
                material.color.copy( this.light.color );
            }
        };
        this.update();
    }
}


// --- Shaders for new post-processing effects ---
const VignetteShader = {
    uniforms: { 'tDiffuse': { value: null }, 'strength': { value: 0.5 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); vec2 uv = (vUv - 0.5) * 2.0; float dist = dot(uv, uv); float vignette = smoothstep(0.0, 1.0, 1.0 - dist * strength); gl_FragColor = vec4(color.rgb * vignette, color.a); }`
};
const ChromaticAberrationShader = {
    uniforms: { 'tDiffuse': { value: null }, 'amount': { value: 0.0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv; void main() { vec2 uv = vUv; vec4 color; color.r = texture2D(tDiffuse, uv + vec2(-amount, 0.0)).r; color.g = texture2D(tDiffuse, uv).g; color.b = texture2D(tDiffuse, uv + vec2(amount, 0.0)).b; gl_FragColor = vec4(color.rgb, 1.0); }`
};

// --- DOM elements ---
const viewport = document.getElementById('viewport-container');
const loadModelBtn = document.getElementById('load-model-btn');
const modelInput = document.getElementById('model-loader-input');
const loadHdriBtn = document.getElementById('load-hdri-btn');
const hdriInput = document.getElementById('hdri-loader-input');
const sceneListContainer = document.querySelector('.vs-tree');
const iblIntensitySlider = document.getElementById('ibl-intensity-slider');
const bgBlurSlider = document.getElementById('bg-blur-slider');
const bloomThresholdSlider = document.getElementById('bloom-threshold-slider');
const bloomStrengthSlider = document.getElementById('bloom-strength-slider');
const bloomRadiusSlider = document.getElementById('bloom-radius-slider');
const fogColorInput = document.getElementById('fog-color-input');
const fogDensitySlider = document.getElementById('fog-density-slider');
const skyboxModeSelect = document.getElementById('skybox-mode-select');
const skyboxColorInput = document.getElementById('skybox-color-input');
const skyboxGradientTopInput = document.getElementById('skybox-gradient-top-input');
const skyboxGradientBottomInput = document.getElementById('skybox-gradient-bottom-input');
const cloudEnabledCheck = document.getElementById('cloud-enabled-check');
const cloudSpeedSlider = document.getElementById('cloud-speed-slider');
const cloudDensitySlider = document.getElementById('cloud-density-slider');
const cloudAbsorptionSlider = document.getElementById('cloud-absorption-slider');
const cloudLightAbsorptionSlider = document.getElementById('cloud-light-absorption-slider');
const cloudMinHeightSlider = document.getElementById('cloud-min-height-slider');
const cloudMaxHeightSlider = document.getElementById('cloud-max-height-slider');
const cloudNoiseScaleSlider = document.getElementById('cloud-noise-scale-slider');
const cloudDetailInfluenceSlider = document.getElementById('cloud-detail-influence-slider');
const vignetteStrengthSlider = document.getElementById('vignette-strength-slider');
const chromaticAberrationAmountSlider = document.getElementById('chromatic-aberation-amount-slider');
const outlineEnabledCheck = document.getElementById('outline-enabled-check');
const outlineThicknessSlider = document.getElementById('outline-thickness-slider');
const outlineColorInput = document.getElementById('outline-color-input');
const lensflareEnabledCheck = document.getElementById('lensflare-enabled-check');
const lensflareIntensitySlider = document.getElementById('lensflare-intensity-slider');
const bloomEnabledCheck = document.getElementById('bloom-enabled-check');
const sunXSlider = document.getElementById('sun-x-slider');
const sunYSlider = document.getElementById('sun-y-slider');
const sunZSlider = document.getElementById('sun-z-slider');
const sunIntensitySlider = document.getElementById('sun-intensity-slider');
const sunShadowCheck = document.getElementById('sun-shadow-check');
const lightAccordionItem = document.getElementById('light-accordion-item');
const lightColorInput = document.getElementById('light-color-input');
const lightIntensitySlider = document.getElementById('light-intensity-slider');
const lightIntensityNumber = document.getElementById('light-intensity-number');
const lightShadowCheck = document.getElementById('light-shadow-check');

if (!viewport) throw new Error("Критическая ошибка: элемент #viewport-container не найден!");

// -------------------- 1. Базовая сцена THREE.js --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1e2127');
const fog = new THREE.FogExp2(scene.background.getHex(), 0.0);
scene.fog = fog;
const clock = new THREE.Clock();
const mixers = []; // Массив для всех AnimationMixer'ов

const MAX_NAME_LENGTH = 15;
function sanitizeName(name) {
    const s = (name || 'Object').toString();
    return s.length > MAX_NAME_LENGTH ? s.slice(0, MAX_NAME_LENGTH) : s;
}

// --- FPS Счётчик ---
const stats = new Stats();
document.getElementById('stats-container').appendChild(stats.dom);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 40000);
camera.position.set(6, 4, 8);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;

const pointerLock = new PointerLockControls(camera, renderer.domElement);
const moveState = { forward: 0, right: 0 };
const moveSpeed = 5.0;

const hemi = new THREE.HemisphereLight(0xffffff, 0x586169, 0.2);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(15, 20, 10);
dir.castShadow = true;
dir.shadow.mapSize.width = 2048; dir.shadow.mapSize.height = 2048;
dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 100;
dir.shadow.camera.left = -20; dir.shadow.camera.right = 20;
dir.shadow.camera.top = 20; dir.shadow.camera.bottom = -20;
dir.name = "Sun";
const sunHelper = new DirectionalLightHelper(dir, 2);
sunHelper.userData.isHelper = true;
scene.add(dir, sunHelper);

const textureLoader = new THREE.TextureLoader();
const textureFlare0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
const textureFlare3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');
const lensflare = new Lensflare();
lensflare.addElement(new LensflareElement(textureFlare0, 700, 0, dir.color));
lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
lensflare.addElement(new LensflareElement(textureFlare3, 50, 1));
lensflare.position.copy(dir.position);
scene.add(lensflare);

const grid = new THREE.GridHelper(20, 20, 0xaaaaaa, 0x444444);
grid.name = 'GRID_HELPER';
grid.userData.isHelper = true;
scene.add(grid);

const clouds = createVolumetricClouds(camera, dir);
clouds.visible = false;
scene.add(clouds);

// -------------------- 2. Post-Processing --------------------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.3, 1.0);
bloomPass.strength = 0; bloomPass.radius = 0;
composer.addPass(bloomPass);
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms.strength.value = 0;
composer.addPass(vignettePass);
const chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
chromaticAberrationPass.uniforms.amount.value = 0;
composer.addPass(chromaticAberrationPass);
const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 3.0; outlinePass.edgeGlow = 0.0; outlinePass.edgeThickness = 1.0;
outlinePass.visibleEdgeColor.set('#74c0fc'); outlinePass.hiddenEdgeColor.set('#190a05');
composer.addPass(outlinePass);
const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
composer.addPass(smaaPass);
const fxaaPass = new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);

function resize() {
  const rect = viewport.getBoundingClientRect();
  const width = rect.width; const height = rect.height;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * renderer.getPixelRatio());
  fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * renderer.getPixelRatio());
  smaaPass.setSize(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
  outlinePass.setSize(width, height);
}
window.addEventListener('resize', resize);
resize();

// -------------------- 3. Image-Based Lighting (IBL) & Skybox --------------------
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const rgbeLoader = new RGBELoader();
function loadHDRI(url) {
    rgbeLoader.load(url, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        scene.environmentIntensity = 0.3; 
        scene.background = envMap;
        scene.backgroundBlurriness = 0.5; // Размытие по умолчанию
        texture.dispose();
    });
}
loadHDRI('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_02_1k.hdr');

function setSkyboxMode(mode) {
    if (mode === 'color') {
        scene.environment = null;
        scene.background = new THREE.Color(skyboxColorInput.value);
    } else if (mode === 'gradient') {
        scene.environment = null;
        const gradientCanvas = document.createElement('canvas');
        gradientCanvas.width = 1;
        gradientCanvas.height = 2;
        const ctx = gradientCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 2);
        gradient.addColorStop(0, skyboxGradientTopInput.value);
        gradient.addColorStop(1, skyboxGradientBottomInput.value);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 2);
        const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
        gradientTexture.needsUpdate = true;
        scene.background = gradientTexture;
    } else if (mode === 'hdri') {
        loadHDRI('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_02_1k.hdr');
    }
}


// -------------------- 4. Selection & Transformation --------------------
let selected = null;
const transform = new TransformControls(camera, renderer.domElement);
scene.add(transform);
let selectionOutline = null; 
const OUTLINE_COLOR = 0x74c0fc;

function disposeOutline() {
    if (!outlineEnabledCheck.checked && selectionOutline) {
        if (selectionOutline.parent) selectionOutline.parent.remove(selectionOutline);
        selectionOutline.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
        selectionOutline = null;
    }
}

function createOutlineForObject(obj) {
    if (outlineEnabledCheck.checked) return null;
    const group = new THREE.Group();
    group.name = 'SELECTION_OUTLINE_GROUP';
    group.raycast = () => {};
    const edgeMaterial = new THREE.LineBasicMaterial({ color: OUTLINE_COLOR, toneMapped: false });
    const invParentWorld = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    obj.traverse(child => {
        if (!child.isMesh) return;
        const edgesGeo = new THREE.EdgesGeometry(child.geometry.clone());
        const edges = new THREE.LineSegments(edgesGeo, edgeMaterial.clone());
        edges.matrixAutoUpdate = false;
        edges.matrix.copy(new THREE.Matrix4().multiplyMatrices(invParentWorld, child.matrixWorld));
        edges.renderOrder = 999;
        group.add(edges);
    });
    return group;
}

function updateSelectionOutline() {
    if (outlineEnabledCheck.checked) {
        outlinePass.selectedObjects = selected ? [selected] : [];
        disposeOutline(); 
    } else {
        disposeOutline();
        if (selected) {
            selectionOutline = createOutlineForObject(selected);
            if (selectionOutline) selected.add(selectionOutline);
        }
    }
}

function isDescendantOf(obj, ancestor) {
    let current = obj;
    while (current) {
        if (current === ancestor) return true;
        current = current.parent;
    }
    return false;
}

function updateInspector() {
    if (selected && selected.isLight) {
        lightAccordionItem.style.display = 'block';
        const light = selected;
        lightColorInput.value = '#' + light.color.getHexString();
        lightIntensitySlider.value = light.intensity;
        lightIntensityNumber.value = light.intensity;
        lightShadowCheck.checked = light.castShadow;
    } else {
        lightAccordionItem.style.display = 'none';
    }
}

function setSelected(object) {
  if (object && isDescendantOf(object, transform)) return;
  selected = object || null;
  if (selected) {
    transform.attach(selected);
  } else {
    transform.detach();
  }
  updateSelectionOutline();
  highlightSceneListItem(selected ? selected.uuid : null);
  updateInspector();
}

transform.addEventListener('dragging-changed', (e) => {
    orbit.enabled = !e.value;
    if (!e.value) updateSelectionOutline();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
    if (transform.dragging) { return; }
    if (pointerLock.isLocked) return;
    if (e.button !== 0 || e.target.closest('.vs-viewport-tools, .dropdown, .vs-btn, .vs-tree-item, .viewcube-container')) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    let hit = null;
    for (const i of intersects) {
        if (i.object.userData.isHelper || i.object === grid || isDescendantOf(i.object, transform) || isDescendantOf(i.object, selectionOutline)) continue;
        let top = i.object;
        while (top.parent && top.parent !== scene) top = top.parent;
        if(top !== clouds && !isDescendantOf(top, lensflare)) {
             hit = top;
             break;
        }
    }
    setSelected(hit);
});


// -------------------- 5. Object Creation & Caching Materials --------------------
const originalMaterials = new Map();
const defaultShadedMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

function cacheOriginalMaterials(object) {
    object.traverse(node => {
        if (node.isMesh && !originalMaterials.has(node.uuid)) {
            originalMaterials.set(node.uuid, node.material);
        }
    });
}

function createPrimitive(type) {
  let mesh;
  const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.7 });
  if (type === 'cube') mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
  else if (type === 'sphere') mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), mat);
  else { mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat); mesh.rotation.x = -Math.PI/2; }
  mesh.name = `${type}_${Date.now()}`.slice(0, 15);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(0, 1, 0);
  cacheOriginalMaterials(mesh);
  return mesh;
}

function createLight(type) {
    let light;
    if (type === 'point') {
        light = new THREE.PointLight(0xfff0dd, 5, 20, 1);
        const helper = new PointLightHelper(light, 0.2);
        helper.userData.isHelper = true;
        light.add(helper);
    } else {
        light = new THREE.DirectionalLight(0xffffff, 1.5);
        const helper = new DirectionalLightHelper(light, 0.5);
        helper.userData.isHelper = true;
        light.add(helper);
    }
    light.name = `${type}Light_${Date.now()}`.slice(0, 15);
    light.position.set(2, 4, 2);
    light.castShadow = true;
    return light;
}

// -------------------- 6. Scene List UI Management --------------------
const sceneItems = new Map();

function createSceneListItem(obj) {
    if (!sceneListContainer) return null;
    const item = document.createElement('div');
    item.className = 'vs-tree-item';
    item.dataset.uuid = obj.uuid;
    const icon = document.createElement('div');
    icon.className = 'vs-icon';
    icon.style.marginRight = '10px';
    icon.textContent = (obj.type || obj.name || 'OB').toString().slice(0,2).toUpperCase();
    const meta = document.createElement('div');
    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';
    const title = document.createElement('div');
    title.className = 'vs-tree-item-title';
    title.textContent = obj.name || obj.type || 'Object';
    title.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.className = 'vs-input'; input.value = obj.name || ''; input.style.minWidth = '120px';
        titleWrap.replaceChild(input, title);
        input.focus(); input.select();
        function commit() {
            const newName = sanitizeName(input.value.trim() || obj.name || 'Object');
            obj.name = newName; title.textContent = newName;
            titleWrap.replaceChild(title, input);
        }
        input.addEventListener('blur', commit, { once: true });
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); else if (ev.key === 'Escape') titleWrap.replaceChild(title, input); });
    });
    const subtitle = document.createElement('div');
    subtitle.className = 'vs-muted'; subtitle.style.fontSize = '12px'; subtitle.textContent = obj.type || 'Mesh';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'vs-btn'; deleteBtn.style.cssText = 'margin-left:auto; padding:2px 6px;'; deleteBtn.title = 'Удалить объект'; deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); removeSceneObject(obj); });
    titleWrap.appendChild(title);
    meta.appendChild(titleWrap); meta.appendChild(subtitle);
    item.appendChild(icon); item.appendChild(meta); item.appendChild(deleteBtn);
    item.addEventListener('click', (e) => { e.stopPropagation(); setSelected(obj); });
    return item;
}

function registerSceneObject(obj) {
    if (!sceneListContainer || sceneItems.has(obj.uuid)) return;
    obj.userData.isEditorObject = true;
    obj.name = sanitizeName(obj.name || obj.type || 'Object');
    const el = createSceneListItem(obj);
    if (!el) return;
    sceneListContainer.appendChild(el);
    sceneItems.set(obj.uuid, { obj, el });
    highlightSceneListItem(selected ? selected.uuid : null);
}

function removeSceneObject(obj) {
    if (!obj) return;
    
    // Удаляем микшер анимации, если он есть
    if (obj.userData.mixer) {
        const index = mixers.indexOf(obj.userData.mixer);
        if (index > -1) {
            mixers.splice(index, 1);
        }
    }

    if (obj.parent) obj.parent.remove(obj);
    const entry = sceneItems.get(obj.uuid);
    if (entry) { entry.el.remove(); sceneItems.delete(obj.uuid); }
    if (selected === obj) setSelected(null);
    obj.traverse((c) => {
        if(c.isMesh) originalMaterials.delete(c.uuid);
        if (c.geometry?.dispose) c.geometry.dispose();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose?.());
            else if (c.material.dispose) c.material.dispose();
        }
    });
}

function highlightSceneListItem(uuid) {
    sceneItems.forEach(({ el }, id) => el.classList.toggle('active', id === uuid));
}

function rebuildSceneList() {
    if (!sceneListContainer) return;
    sceneListContainer.innerHTML = '';
    sceneItems.clear();
    scene.children.forEach(child => {
        if ([grid, transform, selectionOutline, clouds, lensflare].includes(child) || child.userData.isHelper) return;
        registerSceneObject(child);
        cacheOriginalMaterials(child);
    });
}


// -------------------- 7. UI Event Listeners --------------------
(function setupUIListeners() {
    // Tools
    const [moveBtn, rotBtn, scaleBtn] = [...document.querySelectorAll('.vs-viewport-tools .vs-btn')];
    function setActiveTool(btn) { [moveBtn, rotBtn, scaleBtn].forEach(b => b?.classList.remove('active')); btn?.classList.add('active'); }
    moveBtn?.addEventListener('click', () => { transform.setMode('translate'); setActiveTool(moveBtn); });
    rotBtn?.addEventListener('click', () => { transform.setMode('rotate'); setActiveTool(rotBtn); });
    scaleBtn?.addEventListener('click', () => { transform.setMode('scale'); setActiveTool(scaleBtn); });
    
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (pointerLock.isLocked) {
             switch (e.key.toLowerCase()) {
                case 'w': moveState.forward = 1; break; case 's': moveState.forward = -1; break;
                case 'a': moveState.right = -1; break; case 'd': moveState.right = 1; break;
            }
            return;
        }
        switch(e.key.toLowerCase()) {
            case 'w': transform.setMode('translate'); setActiveTool(moveBtn); break;
            case 'e': transform.setMode('rotate'); setActiveTool(rotBtn); break;
            case 'r': transform.setMode('scale'); setActiveTool(scaleBtn); break;
            case 'delete': case 'backspace': if (selected) removeSceneObject(selected); break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (pointerLock.isLocked) {
            switch (e.key.toLowerCase()) {
                case 'w': case 's': moveState.forward = 0; break;
                case 'a': case 'd': moveState.right = 0; break;
            }
        }
    });
    
    transform.setMode('translate'); setActiveTool(moveBtn);

    document.querySelectorAll('.add-primitive-btn, .add-light-btn').forEach(btn => {
        btn?.addEventListener('click', (e) => {
            e.preventDefault();
            const primType = e.currentTarget.dataset.primitiveType;
            const lightType = e.currentTarget.dataset.lightType;
            let newObj = primType ? createPrimitive(primType) : (lightType ? createLight(lightType) : null);
            if (newObj) { scene.add(newObj); registerSceneObject(newObj); setSelected(newObj); }
        });
    });

    // File Loaders
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    const objLoader = new OBJLoader();
    loadModelBtn?.addEventListener('click', (e) => { e.preventDefault(); modelInput.click(); });
    modelInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const fileName = file.name.toLowerCase();
        const extension = fileName.split('.').pop();
        
        const onModelLoad = (object, animations) => {
            object.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            object.name = sanitizeName(file.name || `Model_${Date.now()}`);

            // --- Animation Handling ---
            if (animations && animations.length) {
                const mixer = new THREE.AnimationMixer(object);
                const action = mixer.clipAction(animations[0]);
                action.play();
                mixers.push(mixer);
                object.userData.mixer = mixer; // Сохраняем микшер для последующего удаления
            }

            scene.add(object);
            registerSceneObject(object);
            cacheOriginalMaterials(object);
            setSelected(object);
            URL.revokeObjectURL(url);
        };
        const onError = (error) => { console.error(error); alert('Не удалось загрузить модель.'); URL.revokeObjectURL(url); };

        switch (extension) {
            case 'glb': case 'gltf': gltfLoader.load(url, (gltf) => onModelLoad(gltf.scene, gltf.animations), undefined, onError); break;
            case 'fbx': fbxLoader.load(url, (fbx) => onModelLoad(fbx, fbx.animations), undefined, onError); break;
            case 'obj': objLoader.load(url, (obj) => onModelLoad(obj, []), undefined, onError); break; // OBJ не поддерживает анимацию
            default: alert(`Ошибка: неподдерживаемый формат .${extension}`); URL.revokeObjectURL(url); break;
        }
        modelInput.value = '';
    });
    
    loadHdriBtn?.addEventListener('click', (e) => { e.preventDefault(); hdriInput.click(); });
    hdriInput?.addEventListener('change', (e) => {
         const file = e.target.files?.[0];
         if (file) {
             const url = URL.createObjectURL(file);
             loadHDRI(url);
             URL.revokeObjectURL(url);
             hdriInput.value = '';
         }
    });

    // World Settings Listeners
    iblIntensitySlider?.addEventListener('input', e => scene.environmentIntensity = parseFloat(e.target.value));
    bgBlurSlider?.addEventListener('input', e => scene.backgroundBlurriness = parseFloat(e.target.value));
    bloomThresholdSlider?.addEventListener('input', e => bloomPass.threshold = parseFloat(e.target.value));
    bloomStrengthSlider?.addEventListener('input', e => bloomPass.strength = parseFloat(e.target.value));
    bloomRadiusSlider?.addEventListener('input', e => bloomPass.radius = parseFloat(e.target.value));
    if (skyboxModeSelect) { 
        skyboxModeSelect.addEventListener('change', (e) => setSkyboxMode(e.target.value)); 
        skyboxColorInput?.addEventListener('input', () => setSkyboxMode('color')); 
        skyboxGradientTopInput?.addEventListener('input', () => setSkyboxMode('gradient')); 
        skyboxGradientBottomInput?.addEventListener('input', () => setSkyboxMode('gradient')); 
    }
     if (clouds && clouds.material) {
        cloudEnabledCheck?.addEventListener('change', e => clouds.visible = e.target.checked);
        cloudSpeedSlider?.addEventListener('input', e => clouds.material.uniforms.u_speed.value = parseFloat(e.target.value));
        cloudDensitySlider?.addEventListener('input', e => clouds.material.uniforms.u_density.value = parseFloat(e.target.value));
        cloudAbsorptionSlider?.addEventListener('input', e => clouds.material.uniforms.u_absorption.value = parseFloat(e.target.value));
        cloudLightAbsorptionSlider?.addEventListener('input', e => clouds.material.uniforms.u_light_absorption_factor.value = parseFloat(e.target.value));
        cloudMinHeightSlider?.addEventListener('input', e => clouds.material.uniforms.u_cloud_min_height.value = parseFloat(e.target.value));
        cloudMaxHeightSlider?.addEventListener('input', e => clouds.material.uniforms.u_cloud_max_height.value = parseFloat(e.target.value));
        cloudNoiseScaleSlider?.addEventListener('input', e => clouds.material.uniforms.u_noise_scale.value = parseFloat(e.target.value));
        cloudDetailInfluenceSlider?.addEventListener('input', e => clouds.material.uniforms.u_detail_influence.value = parseFloat(e.target.value));
    }
    vignetteStrengthSlider?.addEventListener('input', e => vignettePass.uniforms.strength.value = parseFloat(e.target.value));
    chromaticAberrationAmountSlider?.addEventListener('input', e => chromaticAberrationPass.uniforms.amount.value = parseFloat(e.target.value));
    outlineEnabledCheck?.addEventListener('change', e => { outlinePass.enabled = e.target.checked; updateSelectionOutline(); });
    outlineThicknessSlider?.addEventListener('input', e => outlinePass.edgeThickness = parseFloat(e.target.value));
    outlineColorInput?.addEventListener('input', e => outlinePass.visibleEdgeColor.set(e.target.value));
    lensflareEnabledCheck?.addEventListener('change', e => lensflare.visible = e.target.checked);
    lensflareIntensitySlider?.addEventListener('input', e => { if (lensflare.lensflares.length > 0) lensflare.lensflares[0].scale = 700 * parseFloat(e.target.value); });
	bloomPass.enabled = false;
    bloomEnabledCheck?.addEventListener('change', e => bloomPass.enabled = e.target.checked);
    sunXSlider?.addEventListener('input', e => { dir.position.x = parseFloat(e.target.value); lensflare.position.copy(dir.position); });
    sunYSlider?.addEventListener('input', e => { dir.position.y = parseFloat(e.target.value); lensflare.position.copy(dir.position); });
    sunZSlider?.addEventListener('input', e => { dir.position.z = parseFloat(e.target.value); lensflare.position.copy(dir.position); });
    sunIntensitySlider?.addEventListener('input', e => dir.intensity = parseFloat(e.target.value));
    sunShadowCheck?.addEventListener('change', e => dir.castShadow = e.target.checked);
    fogColorInput?.addEventListener('input', e => fog.color = new THREE.Color(e.target.value));
    fogDensitySlider?.addEventListener('input', e => fog.density = parseFloat(e.target.value) || 0);
    lightColorInput?.addEventListener('input', e => { if (selected?.isLight) selected.color.set(e.target.value); });
    lightIntensitySlider?.addEventListener('input', e => { if (selected?.isLight) { selected.intensity = parseFloat(e.target.value); lightIntensityNumber.value = e.target.value; } });
    lightIntensityNumber?.addEventListener('input', e => { if (selected?.isLight) { selected.intensity = parseFloat(e.target.value); lightIntensitySlider.value = e.target.value; } });
    lightShadowCheck?.addEventListener('change', e => { if (selected?.isLight) selected.castShadow = e.target.checked; });
    
    setupViewportSettings();
})();

// -------------------- 8. Viewport Settings & ViewCube --------------------
let cameraTargetPos = new THREE.Vector3();
let cameraTargetLookAt = new THREE.Vector3();
let isAnimatingCamera = false;
const VIEW_DISTANCE = 10;

function setCameraView(view) {
    const currentLookAt = orbit.target.clone();
    switch (view) {
        case 'front':  cameraTargetPos.set(currentLookAt.x, currentLookAt.y, currentLookAt.z + VIEW_DISTANCE); break;
        case 'back':   cameraTargetPos.set(currentLookAt.x, currentLookAt.y, currentLookAt.z - VIEW_DISTANCE); break;
        case 'right':  cameraTargetPos.set(currentLookAt.x + VIEW_DISTANCE, currentLookAt.y, currentLookAt.z); break;
        case 'left':   cameraTargetPos.set(currentLookAt.x - VIEW_DISTANCE, currentLookAt.y, currentLookAt.z); break;
        case 'top':    cameraTargetPos.set(currentLookAt.x, currentLookAt.y + VIEW_DISTANCE, currentLookAt.z); break;
        case 'bottom': cameraTargetPos.set(currentLookAt.x, currentLookAt.y - VIEW_DISTANCE, currentLookAt.z); break;
    }
    cameraTargetLookAt.copy(currentLookAt);
    isAnimatingCamera = true;
}

function setViewMode(mode) {
    scene.traverse(node => {
        if (node.isMesh && originalMaterials.has(node.uuid)) {
            const originalMaterial = originalMaterials.get(node.uuid);
            
            // Сбрасываем все состояния перед применением нового
            const newMaterial = originalMaterial.clone();
            newMaterial.wireframe = false;
            newMaterial.transparent = originalMaterial.transparent;
            newMaterial.opacity = originalMaterial.opacity;
            
            switch (mode) {
                case 'final':
                    node.material = originalMaterial;
                    break;
                case 'shaded':
                    node.material = defaultShadedMaterial;
                    break;
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

function setControlType(type) {
    if (type === 'orbit') {
        pointerLock.unlock();
        orbit.enabled = true;
        transform.enabled = true;
    } else if (type === 'game') {
        orbit.enabled = false;
        transform.enabled = false;
        setSelected(null); // Снимаем выделение в игровом режиме
        pointerLock.lock();
    }
}

function setupViewportSettings() {
    const viewcube = document.getElementById('viewcube');
    let isDragging = false;
    let clickTimeout;

    viewcube.addEventListener('mousedown', (e) => {
        isDragging = false;
        // Задержка перед началом драггинга, чтобы система успела распознать клик
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
            // Клик сработает только если не было драггинга
            if(!isDragging) {
                setCameraView(e.target.dataset.view);
            }
        });
    });

    // Меню
    document.getElementById('controls-orbit-btn')?.addEventListener('click', () => setControlType('orbit'));
    document.getElementById('controls-game-btn')?.addEventListener('click', () => setControlType('game'));
    document.getElementById('view-mode-final-btn')?.addEventListener('click', () => setViewMode('final'));
    document.getElementById('view-mode-shaded-btn')?.addEventListener('click', () => setViewMode('shaded'));
    document.getElementById('view-mode-wireframe-btn')?.addEventListener('click', () => setViewMode('wireframe'));
    document.getElementById('view-mode-transparent-btn')?.addEventListener('click', () => setViewMode('transparent'));
    
    setControlType('orbit');
}

// -------------------- 9. Render Loop --------------------
function animate(){
  requestAnimationFrame(animate);
  stats.begin(); // Начало замера FPS
  const delta = clock.getDelta();

  for(const mixer of mixers) {
      mixer.update(delta);
  }

  if (isAnimatingCamera) {
      camera.position.lerp(cameraTargetPos, 0.1);
      orbit.target.lerp(cameraTargetLookAt, 0.1);
      if (camera.position.distanceTo(cameraTargetPos) < 0.01) {
          isAnimatingCamera = false;
          camera.position.copy(cameraTargetPos);
          orbit.target.copy(cameraTargetLookAt);
      }
  }
  
  if (pointerLock.isLocked) {
      const moveDirection = new THREE.Vector3(moveState.right, 0, moveState.forward).normalize();
      pointerLock.moveRight(moveDirection.x * moveSpeed * delta);
      pointerLock.moveForward(-moveDirection.z * moveSpeed * delta);
  } else {
    orbit.update();
  }
  
  const viewcubeScene = document.getElementById('viewcube-scene');
  if (viewcubeScene) {
      const camInverse = camera.quaternion.clone().invert();
      viewcubeScene.style.transform = `matrix3d(${new THREE.Matrix4().makeRotationFromQuaternion(camInverse).elements.join(',')})`;
  }

  if (clouds.visible) {
    clouds.material.uniforms.u_time.value += delta * clouds.material.uniforms.u_speed.value;
  }
  clouds.userData.updateSunDirection();
  
  composer.render();
  stats.end(); // Конец замера FPS
}

animate();
viewport.focus();
rebuildSceneList();