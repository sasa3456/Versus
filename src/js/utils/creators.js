// js/utils/creators.js
import * as THREE from 'three';
import { PointLightHelper, DirectionalLightHelper } from './helpers.js';

function createPrimitive(type) {
  let mesh;
  const mat = new THREE.MeshStandardMaterial({ color: 0xbfbfbf, roughness: 0.7, metalness: 0.0 });

  if (type === 'cube') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  } else if (type === 'sphere') {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), mat);
  } else if (type === 'plane') {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat); // Increased default size
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, 0, 0); 
  } else {
      return undefined;
  }

  mesh.name = type;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isEditorObject = true; // Mark as editor object
  
  // Primitives should have a default y position that's above the grid
  if (type !== 'plane') {
    mesh.position.set(0, 0.5, 0);
  }

  // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
  // Устанавливаем физические свойства по умолчанию
  if (type === 'plane') {
    // Плоскости по умолчанию должны быть статичным полом
    mesh.userData.physics = {
        isDynamic: false,
        mass: 0
    };
  } else {
    // Остальные примитивы по умолчанию динамические
    mesh.userData.physics = {
        isDynamic: true,
        mass: 1
    };
  }

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
    light.userData.isEditorObject = true; // Mark as editor object

    return light;
}

function createPlayerStart() {
    const group = new THREE.Group();
    group.name = 'Player_Start';

    const capsule = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8 })
    );
    capsule.position.y = 0.9; // Height of capsule is 1.2 + 0.3*2 = 1.8, so center is at 0.9
    
    const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1), // direction
        new THREE.Vector3(0, 0.9, 0), // origin
        0.8, // length
        0x00ff88, // color
        0.3,
        0.2
    );

    group.add(capsule);
    group.add(arrow);
    
    group.position.set(0, 0, 3);
    group.userData.isPlayerStart = true;
    group.userData.isEditorObject = true; // Add this flag so it's recognized by the editor
    
    // PlayerStart should not have physics itself, it's a marker
    group.userData.physics = {
        isDynamic: false,
        mass: 0
    };

    // --- ADD PLAYER SETTINGS ---
    group.userData.playerSettings = {
        moveSpeed: 5.0,
        runSpeed: 8.0,
        jumpHeight: 6.0,
        cameraHeight: 1.7,
        fov: 75,
        mouseSensitivity: 0.002,
        playerMass: 70,
        playerHeight: 1.8,
        playerRadius: 0.4,
    };
    
    return group;
}


export { createPrimitive, createLight, createPlayerStart };