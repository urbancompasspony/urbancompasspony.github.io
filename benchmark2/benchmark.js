// benchmark.js - WebGL 2.0 Ultra Benchmark (completo e pronto para uso)
// Este arquivo supõe que você tenha o HTML teste.html correto e preparado!

// === SHADERS ===

// Vertex Shader
const vsSource = `#version 300 es
in vec4 aVertexPosition;
in vec4 aVertexColor;
in vec2 aTextureCoord;
in vec3 aInstanceOffset;
in vec3 aInstanceRotation;
in float aInstanceScale;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform float uTime;

out vec4 vColor;
out vec2 vTextureCoord;
out vec3 vPosition;
out vec3 vWorldPos;
out vec3 vInstanceData;

mat4 rotationMatrix(vec3 rotation) {
    float cx = cos(rotation.x);
    float sx = sin(rotation.x);
    float cy = cos(rotation.y);
    float sy = sin(rotation.y);
    float cz = cos(rotation.z);
    float sz = sin(rotation.z);

    mat4 rx = mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, cx, -sx, 0.0,
        0.0, sx, cx, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    mat4 ry = mat4(
        cy, 0.0, sy, 0.0,
        0.0, 1.0, 0.0, 0.0,
        -sy, 0.0, cy, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    mat4 rz = mat4(
        cz, -sz, 0.0, 0.0,
        sz, cz, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
    return rz * ry * rx;
}

void main() {
    vec4 instancePos = aVertexPosition;
    instancePos.xyz *= aInstanceScale;
    instancePos = rotationMatrix(aInstanceRotation + uTime * 0.1) * instancePos;
    instancePos.xyz += aInstanceOffset;
    gl_Position = uProjectionMatrix * uModelViewMatrix * instancePos;
    vColor = aVertexColor;
    vTextureCoord = aTextureCoord;
    vPosition = aVertexPosition.xyz;
    vWorldPos = instancePos.xyz;
    vInstanceData = vec3(aInstanceScale, length(aInstanceOffset), float(gl_InstanceID));
}
`;

// Fragment Shader - Efeito Ultra Benchmark (realista e performático)
const fsSource = `#version 300 es
precision highp float;
precision highp sampler3D;

in vec4 vColor;
in vec2 vTextureCoord;
in vec3 vPosition;
in vec3 vWorldPos;
in vec3 vInstanceData;

uniform float uTime;
uniform int uTextureType;
uniform int uBenchmarkMode;
uniform float uInstanceCount;

out vec4 fragColor;

// Funções utilitárias para padrões procedurais
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// Texturas procedurais
vec3 checkerboard(vec2 uv) {
    float scale = (uBenchmarkMode >= 1) ? 32.0 : 8.0;
    float checker = mod(floor(uv.x*scale) + floor(uv.y*scale), 2.0);
    return mix(vec3(0.1,0.1,0.1), vec3(0.9,0.9,0.9), checker);
}
vec3 marble(vec2 uv) {
    float v = sin((uv.x + fbm(uv*2.5 + uTime*0.15))*10.0 + fbm(uv*7.0 - uTime*0.15)*4.0);
    return mix(vec3(0.8,0.75,0.7), vec3(0.4,0.3,0.2), v*0.5+0.5);
}
vec3 wood(vec2 uv) {
    float r = length(uv - 0.5);
    float rings = sin((r + fbm(uv*6.0 + uTime*0.07))*30.0);
    return mix(vec3(0.5,0.32,0.13), vec3(0.75,0.46,0.17), rings*0.5+0.5);
}
vec3 fire(vec2 uv) {
    float y = 1.0 - uv.y;
    float flame = pow(y, 1.5) * exp(-10.0*pow(uv.x-0.5,2.0));
    flame *= fbm(uv*6.0+uTime*vec2(0.3,1.4)) * 1.3;
    vec3 color = mix(vec3(1.0,0.7,0.1), vec3(1.0,0.0,0.0), y);
    color = mix(color, vec3(0.0,0.0,1.0), pow(1.0-y,4.0)*flame*0.3);
    return color * flame;
}
vec3 plasma(vec2 uv) {
    float v = sin(uTime+uv.x*12.0) * cos(uTime*0.5+uv.y*22.0)
    + sin(uTime*0.7+uv.x*8.0+uv.y*8.0) * 0.5;
    v = v*0.5 + 0.5;
    return mix(vec3(0.1,0.1,0.7), vec3(1.0,0.6,0.2), v);
}
vec3 voronoi(vec2 uv) {
    uv *= 8.0;
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float d = 1.0;
    for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++) {
        vec2 g = vec2(float(x),float(y));
        vec2 o = vec2(hash(i+g), hash(i+g+1.0));
        vec2 p = g + o - f;
        d = min(d, dot(p,p));
    }
    return mix(vec3(0.1,0.2,1.0), vec3(1.0,0.9,0.2), d);
}

void main() {
    vec3 color;
    float eff = sin(vInstanceData.z * 0.1 + uTime) * 0.1 + 1.0;
    if      (uTextureType == 0) color = vColor.rgb * eff;
    else if (uTextureType == 1) color = checkerboard(vTextureCoord) * eff;
    else if (uTextureType == 2) color = mix(checkerboard(vTextureCoord), marble(vTextureCoord), 0.5) * eff;
    else if (uTextureType == 3) color = wood(vTextureCoord) * eff;
    else if (uTextureType == 4) color = marble(vTextureCoord) * eff;
    else if (uTextureType == 5) color = wood(vTextureCoord) * eff;
    else if (uTextureType == 6) color = fire(vTextureCoord) * eff;
    else if (uTextureType == 7) color = plasma(vTextureCoord) * eff;
    else if (uTextureType == 8) color = voronoi(vTextureCoord) * eff;
    else                        color = vColor.rgb * eff;
    color = color / (color + 1.0);
    color = pow(color, vec3(1.0 / 2.2));
    fragColor = vec4(color, 1.0);
}
`;

// === WEBGL2 BENCHMARK LOGIC ===

let gl, shaderProgram, programInfo, buffers;
let rotationX = 0, rotationY = 0, speedX = 2, speedY = 1.5, wireframe = false;
let textureType = 0, benchmarkMode = 0, instanceCount = 1;
let fps = 0, frameCount = 0, lastTime = 0, fpsUpdateTime = 0, frameTimeSum = 0, drawCalls = 0;

function main() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2.0 não suportado pelo seu navegador!\nPor favor, use um navegador mais recente.');
        return;
    }
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) return;
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            instanceOffset: gl.getAttribLocation(shaderProgram, 'aInstanceOffset'),
            instanceRotation: gl.getAttribLocation(shaderProgram, 'aInstanceRotation'),
            instanceScale: gl.getAttribLocation(shaderProgram, 'aInstanceScale'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            time: gl.getUniformLocation(shaderProgram, 'uTime'),
            textureType: gl.getUniformLocation(shaderProgram, 'uTextureType'),
            benchmarkMode: gl.getUniformLocation(shaderProgram, 'uBenchmarkMode'),
            instanceCount: gl.getUniformLocation(shaderProgram, 'uInstanceCount'),
        },
    };
    buffers = initBuffers(gl);
    setupControls();
    requestAnimationFrame(drawScene);
}

function setupControls() {
    document.getElementById('speedX').addEventListener('input', (e) => speedX = parseFloat(e.target.value));
    document.getElementById('speedY').addEventListener('input', (e) => speedY = parseFloat(e.target.value));
    document.getElementById('wireframe').addEventListener('change', (e) => wireframe = e.target.checked);
    document.getElementById('textureType').addEventListener('change', (e) => textureType = parseInt(e.target.value));
    document.getElementById('instances').addEventListener('input', (e) => {
        instanceCount = parseInt(e.target.value);
        buffers = initBuffers(gl);
    });
    document.getElementById('benchmarkMode').addEventListener('change', (e) => {
        benchmarkMode = parseInt(e.target.value);
        buffers = initBuffers(gl);
    });
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return null;
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader Program Link Error:', gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader Compile Error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initBuffers(gl) {
    // Generate cube geometry (24 vertices, 36 indices)
    const positions = [
        // Front
        -1,-1, 1,  1,-1, 1,  1, 1, 1, -1, 1, 1,
        // Back
        -1,-1,-1, -1, 1,-1,  1, 1,-1,  1,-1,-1,
        // Top
        -1, 1,-1, -1, 1, 1,  1, 1, 1,  1, 1,-1,
        // Bottom
        -1,-1,-1,  1,-1,-1,  1,-1, 1, -1,-1, 1,
        // Right
        1,-1,-1,  1, 1,-1,  1, 1, 1,  1,-1, 1,
        // Left
        -1,-1,-1, -1,-1, 1, -1, 1, 1, -1, 1,-1
    ];
    const indices = [
        0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11,
        12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23
    ];
    const colors = [];
    for (let i = 0; i < 24; i++) {
        colors.push(0.7+0.3*Math.random(), 0.7+0.3*Math.random(), 0.7+0.3*Math.random(), 1.0);
    }
    const textureCoords = [];
    for (let i = 0; i < 6; i++) {
        textureCoords.push(0,0, 1,0, 1,1, 0,1);
    }
    // Instance data
    const instanceOffsets = [], instanceRotations = [], instanceScales = [];
    for (let i = 0; i < instanceCount; i++) {
        const angle = (i / instanceCount) * Math.PI * 2;
        const radius = Math.sqrt(i) * 0.5 + 0.1;
        const height = (Math.sin(i * 0.1) * 1.1);
        instanceOffsets.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        instanceRotations.push(i * 0.1, i * 0.15, i * 0.2);
        instanceScales.push(0.3 + (i % 10) * 0.04);
    }
    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const instanceOffsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceOffsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceOffsets), gl.STATIC_DRAW);
    const instanceRotationBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceRotationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceRotations), gl.STATIC_DRAW);
    const instanceScaleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceScaleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceScales), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
        instanceOffset: instanceOffsetBuffer,
        instanceRotation: instanceRotationBuffer,
        instanceScale: instanceScaleBuffer,
        indexCount: indices.length,
        vertexCount: positions.length / 3,
    };
}

function drawScene() {
    const currentTime = performance.now();

    // FPS & metrics
    if (lastTime !== 0) {
        const deltaTime = currentTime - lastTime;
        frameTimeSum += deltaTime;
        frameCount++;
        if (currentTime - fpsUpdateTime > 500) {
            fps = Math.round(1000 / (frameTimeSum / frameCount));
            const avgFrameTime = (frameTimeSum / frameCount).toFixed(2);
            document.getElementById('fpsValue').textContent = fps;
            document.getElementById('frameTime').textContent = avgFrameTime;
            document.getElementById('frameCount').textContent = frameCount;
            document.getElementById('vertexCount').textContent = (buffers.vertexCount * instanceCount).toLocaleString();
            document.getElementById('triangleCount').textContent = Math.floor(buffers.indexCount * instanceCount / 3).toLocaleString();
            document.getElementById('instanceCount').textContent = instanceCount.toLocaleString();
            document.getElementById('drawCalls').textContent = drawCalls;
            const gpuLoad = Math.max(0, Math.min(100, 100 - (fps - 10) * 2));
            document.getElementById('gpuLoad').textContent = Math.round(gpuLoad);
            const fpsEl = document.getElementById('fpsValue');
            fpsEl.className = fps > 45 ? '' : fps > 20 ? 'warning' : 'critical';
            frameTimeSum = 0;
            frameCount = 0;
            fpsUpdateTime = currentTime;
        }
    }
    lastTime = currentTime;

    // Clear
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Projection/ModelView
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1, zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -8.0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);

    // Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceOffset);
    gl.vertexAttribPointer(programInfo.attribLocations.instanceOffset, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.instanceOffset);
    gl.vertexAttribDivisor(programInfo.attribLocations.instanceOffset, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceRotation);
    gl.vertexAttribPointer(programInfo.attribLocations.instanceRotation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.instanceRotation);
    gl.vertexAttribDivisor(programInfo.attribLocations.instanceRotation, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.instanceScale);
    gl.vertexAttribPointer(programInfo.attribLocations.instanceScale, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.instanceScale);
    gl.vertexAttribDivisor(programInfo.attribLocations.instanceScale, 1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Use shader program
    gl.useProgram(programInfo.program);

    // Set uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniform1f(programInfo.uniformLocations.time, currentTime * 0.001);
    gl.uniform1i(programInfo.uniformLocations.textureType, textureType);
    gl.uniform1i(programInfo.uniformLocations.benchmarkMode, benchmarkMode);
    gl.uniform1f(programInfo.uniformLocations.instanceCount, instanceCount);

    // Draw
    drawCalls = 1;
    if (wireframe) {
        for (let i = 0; i < buffers.indexCount; i += 3) {
            gl.drawElementsInstanced(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, i * 2, instanceCount);
            drawCalls++;
        }
    } else {
        gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0, instanceCount);
    }

    // Update rotation
    rotationX += speedX * 0.01;
    rotationY += speedY * 0.01;
    requestAnimationFrame(drawScene);
}

// mat4 library (mínimo necessário)
const mat4 = {
    create: function() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    perspective: function(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
        out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
    },
    translate: function(out, a, v) {
        if (out !== a) for (let i = 0; i < 16; i++) out[i] = a[i];
        const x = v[0], y = v[1], z = v[2];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    },
    rotate: function(out, a, rad, axis) {
        if (out !== a) for (let i = 0; i < 16; i++) out[i] = a[i];
        const x = axis[0], y = axis[1], z = axis[2];
        const s = Math.sin(rad), c = Math.cos(rad), t = 1 - c;
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
        const b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
        const b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    }
};

// Inicializa tudo ao carregar a página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
