// js/managers/SceneManager.js
import * as THREE from 'three';
import { createVolumetricClouds } from '../VolumetricClouds.js';

export default class SceneManager {
    constructor(container) {
        // --- Рендерер ---
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // --- Сцена ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#1e2127');
		this.scene.backgroundBlurriness = 1.0;

        // --- Камера ---
        const rect = container.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 40000);
        this.camera.position.set(6, 4, 8);
        
        this.setupBaseScene();
    }
    
    setupBaseScene() {
        // --- Свет ---
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x586169, 0.2);
        this.scene.add(hemiLight);

        // --- Сетка ---
        const grid = new THREE.GridHelper(20, 20, 0xaaaaaa, 0x444444);
        grid.name = 'GRID_HELPER';
        grid.userData.isHelper = true; // Помечаем, чтобы не выбирать
        this.scene.add(grid);
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}