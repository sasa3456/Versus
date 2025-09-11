// js/managers/EnvironmentManager.js
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { createVolumetricClouds } from '../VolumetricClouds.js';
import { DirectionalLightHelper } from '../utils/helpers.js';

export default class EnvironmentManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
		  this.renderer = renderer; 
        this.pmremGenerator = null;
        this.rgbeLoader = new RGBELoader();

        this.initFog();
        this.initSun();
        this.initClouds();
        this.loadHDRI('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_02_1k.hdr');
    }

    initFog() {
        this.fog = new THREE.FogExp2(this.scene.background.getHex(), 0.0);
        this.scene.fog = this.fog;
    }

    initSun() {
        this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sun.position.set(15, 20, 10);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 100;
        this.sun.shadow.camera.left = -20;
        this.sun.shadow.camera.right = 20;
        this.sun.shadow.camera.top = 20;
        this.sun.shadow.camera.bottom = -20;
        this.sun.name = "Sun";

        const sunHelper = new DirectionalLightHelper(this.sun, 2);
        sunHelper.userData.isHelper = true;
        this.scene.add(this.sun, sunHelper);

        this.initLensflare();
    }
    
    initLensflare() {
        const textureLoader = new THREE.TextureLoader();
        const textureFlare0 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare0.png');
        const textureFlare3 = textureLoader.load('https://threejs.org/examples/textures/lensflare/lensflare3.png');

        this.lensflare = new Lensflare();
        this.lensflare.addElement(new LensflareElement(textureFlare0, 700, 0, this.sun.color));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
        this.lensflare.addElement(new LensflareElement(textureFlare3, 50, 1));
        
        this.lensflare.position.copy(this.sun.position);
        this.scene.add(this.lensflare);
    }
    
    initClouds() {
        this.clouds = createVolumetricClouds(this.camera, this.sun);
        this.clouds.visible = false;
        this.scene.add(this.clouds);
    }

     loadHDRI(url) {
        if (!this.pmremGenerator) {
            // ИСПРАВЛЕНО: Используем основной рендерер, а не временный
            this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            this.pmremGenerator.compileEquirectangularShader();
        }

        this.rgbeLoader.load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;
            this.scene.background = envMap;
            texture.dispose();
        });
    }

    setSkyboxMode(mode, values) {
        if (mode === 'color') {
            this.scene.environment = null;
            this.scene.background = new THREE.Color(values.color);
        } else if (mode === 'gradient') {
            this.scene.environment = null;
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 2;
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 2);
            gradient.addColorStop(0, values.top);
            gradient.addColorStop(1, values.bottom);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 2);
            this.scene.background = new THREE.CanvasTexture(canvas);
        } else if (mode === 'hdri') {
            this.loadHDRI('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_02_1k.hdr');
        }
    }
    
    update(delta) {
        if (this.clouds.visible && this.clouds.material) {
            this.clouds.material.uniforms.u_time.value += delta * this.clouds.material.uniforms.u_speed.value;
        }
        if(this.clouds.userData.updateSunDirection){
            this.clouds.userData.updateSunDirection();
        }
    }
}