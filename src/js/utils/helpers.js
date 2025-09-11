// js/utils/helpers.js
import * as THREE from 'three';

const MAX_NAME_LENGTH = 20;
function sanitizeName(name) {
    const s = (name || 'Object').toString();
    const baseName = s.substring(0, s.lastIndexOf('.')) || s;
    return baseName.length > MAX_NAME_LENGTH ? baseName.slice(0, MAX_NAME_LENGTH) : baseName;
}

class DirectionalLightHelper extends THREE.Object3D {
    constructor(light, size = 1, color) {
        super();
        this.light = light;
        this.matrix = light.matrixWorld;
        this.matrixAutoUpdate = false;
        this.color = color;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
            -size, size, 0, size, size, 0,
            size, -size, 0, -size, -size, 0,
            -size, size, 0
        ], 3));
        const material = new THREE.LineBasicMaterial({ fog: false });
        this.add(new THREE.Line(geometry, material));
        this.update();
    }
    update() {
        // ИСПРАВЛЕНО: Обращаемся к материалу дочернего элемента
        if (this.children[0] && this.children[0].material) {
            this.children[0].material.color.set(this.color !== undefined ? this.color : this.light.color);
        }
    }
}

class PointLightHelper extends THREE.Object3D {
    constructor(light, sphereSize = 0.2, color) {
        super();
        this.light = light;
        this.matrix = light.matrixWorld;
        this.matrixAutoUpdate = false;
        this.color = color;
        
        const geometry = new THREE.SphereGeometry(sphereSize, 4, 2);
        const material = new THREE.MeshBasicMaterial({ wireframe: true, fog: false });
        this.add(new THREE.Mesh(geometry, material));
        this.update();
    }
    update() {
        if (this.children[0] && this.children[0].material) {
            this.children[0].material.color.set(this.color !== undefined ? this.color : this.light.color);
        }
    }
}

export { sanitizeName, DirectionalLightHelper, PointLightHelper };