// js/utils/creators.js
import * as THREE from 'three';
import { PointLightHelper, DirectionalLightHelper } from './helpers.js';

function createPrimitive(type) {
  let mesh;
  // светло-серый материал по умолчанию
  const mat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.7, metalness: 0.0 });

  if (type === 'cube') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  } else if (type === 'sphere') {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), mat);
  } else if (type === 'plane') {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      mesh.rotation.x = -Math.PI / 2;
  } else {
      // неизвестный тип — не создаём
      return undefined;
  }

  // даём простое имя — уникальность обработает ObjectManager
  mesh.name = type;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(0, 1, 0);
  return mesh;
}

function createLight(type) {
    let light;
    let helper;

    if (type === 'point') {
        light = new THREE.PointLight(0xfff0dd, 5, 20, 1);
        helper = new PointLightHelper(light, 0.2);
    } else if (type === 'directional') {
        light = new THREE.DirectionalLight(0xffffff, 1.5);
        helper = new DirectionalLightHelper(light, 0.5);
    } else {
        return undefined;
    }

    helper.userData.isHelper = true;
    light.add(helper);
    light.name = `${type}Light`;
    light.position.set(2, 4, 2);
    light.castShadow = true;

    return light;
}

export { createPrimitive, createLight };
