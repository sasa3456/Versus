// js/VolumetricClouds.js
import * as THREE from 'three';

const vertexShader = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec3 vWorldPosition;

uniform vec3 u_camera_pos;
uniform vec3 u_sun_direction;
uniform vec3 u_cloud_color_light;
uniform vec3 u_cloud_color_dark;
uniform float u_time;
uniform float u_speed;

// Новые параметры для реалистичности
uniform float u_density;
uniform float u_absorption;
uniform float u_light_absorption_factor;
uniform float u_cloud_min_height;
uniform float u_cloud_max_height;
uniform float u_noise_scale;
uniform float u_detail_influence;

// 3D simplex noise function (оставлена без изменений)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Фрактальное броуновское движение для более сложного шума
float fbm(vec3 p) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        total += snoise(p * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

// Новая функция для создания формы облаков
float map(vec3 p) {
    vec3 q = p * u_noise_scale;
    q.x += u_time;
    
    // Базовый шум
    float base_noise = snoise(q * 0.5) * 0.5 + 0.5;
    
    // Шум с большим количеством деталей, смешанный с базовым
    float detail_noise = fbm(q * 1.5);
    
    float n = mix(base_noise, detail_noise, u_detail_influence);

    // Фактор, который убирает облака в зависимости от высоты
    float height_factor = smoothstep(u_cloud_min_height, u_cloud_min_height + 500.0, p.y) * (1.0 - smoothstep(u_cloud_max_height - 500.0, u_cloud_max_height, p.y));
    n *= height_factor;
    
    return smoothstep(1.0 - u_density, 1.0, n);
}

// Трассировка лучей для поглощения света
float march_light(vec3 pos, vec3 dir) {
    float light_density = 0.0;
    float light_step_size = 50.0;
    for (int i = 0; i < 5; i++) {
        pos += dir * light_step_size;
        light_density += map(pos);
    }
    return exp(-light_density * u_light_absorption_factor);
}

void main() {
    vec3 ray_dir = normalize(vWorldPosition - u_camera_pos);
    vec3 ray_pos = u_camera_pos;

    vec3 final_color = vec3(0.0);
    float total_alpha = 0.0;
    
    const float MARCH_STEP_SIZE = 250.0;
    const int MARCH_STEPS = 32;

    for (int i=0; i < MARCH_STEPS; i++) {
        ray_pos += ray_dir * MARCH_STEP_SIZE;
        
        // Пропускаем, если вне слоя облаков
        if (ray_pos.y < u_cloud_min_height || ray_pos.y > u_cloud_max_height) continue;

        float density = map(ray_pos) * u_absorption;
        if (density <= 0.001) continue;

        // Расчет света внутри облака
        float light_transparency = march_light(ray_pos, u_sun_direction);
        
        // Рассчет прямого света от солнца
        float sun_factor = pow(max(0.0, dot(ray_dir, u_sun_direction)), 2.0);
        vec3 color = mix(u_cloud_color_dark, u_cloud_color_light, sun_factor) * light_transparency;
        
        // Композитинг цвета и плотности
        final_color += color * density * (1.0 - total_alpha);
        total_alpha += density * (1.0 - total_alpha);
        
        if (total_alpha > 0.99) break;
    }

    if (total_alpha <= 0.0) {
        discard;
    }
    
    gl_FragColor = vec4(final_color, total_alpha);
}
`;


export function createVolumetricClouds(camera, sun) {
    const geometry = new THREE.SphereGeometry(10000, 64, 32);
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            u_camera_pos: { value: camera.position },
            u_sun_direction: { value: new THREE.Vector3().copy(sun.position).normalize() },
            u_cloud_color_light: { value: new THREE.Color(0xffffff) },
            u_cloud_color_dark: { value: new THREE.Color(0x738290) },
            u_time: { value: 0.0 },
            u_speed: { value: 0.02 },
            
            // Новые униформы для облаков
            u_density: { value: 0.8 },
            u_absorption: { value: 0.8 },
            u_light_absorption_factor: { value: 0.2 },
            u_cloud_min_height: { value: 1000.0 },
            u_cloud_max_height: { value: 5000.0 },
            u_noise_scale: { value: 0.0005 },
            u_detail_influence: { value: 0.25 },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "VolumetricClouds";
    mesh.raycast = () => {}; // Сделать невыбираемым

    // Обновляем направление солнца
    mesh.userData.updateSunDirection = () => {
         material.uniforms.u_sun_direction.value.copy(sun.position).normalize();
    };

    return mesh;
}