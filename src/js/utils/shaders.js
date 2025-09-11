// js/utils/shaders.js
const VignetteShader = {
    uniforms: { 'tDiffuse': { value: null }, 'strength': { value: 0.5 } },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - 0.5) * 2.0;
            float dist = dot(uv, uv);
            float vignette = smoothstep(0.0, 1.0, 1.0 - dist * strength);
            gl_FragColor = vec4(color.rgb * vignette, color.a);
        }`
};

const ChromaticAberrationShader = {
    uniforms: { 'tDiffuse': { value: null }, 'amount': { value: 0.0 } },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            vec4 color;
            color.r = texture2D(tDiffuse, uv + vec2(-amount, 0.0)).r;
            color.g = texture2D(tDiffuse, uv).g;
            color.b = texture2D(tDiffuse, uv + vec2(amount, 0.0)).b;
            gl_FragColor = vec4(color.rgb, 1.0);
        }`
};

export { VignetteShader, ChromaticAberrationShader };