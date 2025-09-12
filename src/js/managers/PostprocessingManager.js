// js/managers/PostprocessingManager.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { VignetteShader, ChromaticAberrationShader } from '../utils/shaders.js';

export default class PostprocessingManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.composer = new EffectComposer(renderer);
        
        // 1. Render Pass
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);
        
        // 2. Bloom
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.3, 1.0);
        this.bloomPass.strength = 0;
        this.bloomPass.radius = 0;
        this.bloomPass.enabled = false;
        this.composer.addPass(this.bloomPass);
        
        // 3. Vignette
        this.vignettePass = new ShaderPass(VignetteShader);
        this.vignettePass.uniforms.strength.value = 0;
        this.composer.addPass(this.vignettePass);

        // 4. Chromatic Aberration
        this.chromaticAberrationPass = new ShaderPass(ChromaticAberrationShader);
        this.chromaticAberrationPass.uniforms.amount.value = 0;
        this.composer.addPass(this.chromaticAberrationPass);

        // 5. Outline
        this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
        this.outlinePass.edgeStrength = 3.0;
        this.outlinePass.edgeGlow = 0.0;
        this.outlinePass.edgeThickness = 1.0;
        this.outlinePass.visibleEdgeColor.set('#74c0fc');
        this.outlinePass.hiddenEdgeColor.set('#190a05');
        this.composer.addPass(this.outlinePass);

        // 6. Anti-Aliasing (SMAA + FXAA)
        this.smaaPass = new SMAAPass(1, 1);
        this.composer.addPass(this.smaaPass);
        
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.composer.addPass(this.fxaaPass);
        
        // --- FIX: Listen for selection changes to update the outline ---
        window.addEventListener('selectionChanged', (e) => {
            const selectedObject = e.detail.selected;
            if (selectedObject) {
                // OutlinePass expects an array of objects
                this.outlinePass.selectedObjects = [selectedObject];
            } else {
                // Clear the outline if nothing is selected
                this.outlinePass.selectedObjects = [];
            }
        });
    }
    
    resize(width, height) {
        const pixelRatio = this.renderer.getPixelRatio();
        this.composer.setSize(width, height);
        
        this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
        this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
        
        this.smaaPass.setSize(width * pixelRatio, height * pixelRatio);
        this.outlinePass.setSize(width, height);
    }
}