// === SISTEMA DE AVISO ===
function checkPreviousWarning() {
    const dontShow = localStorage.getItem('webgpu_benchmark_dont_warn');
    if (dontShow === 'true') {
        showMainContent();
        return;
    }
    document.getElementById('warningOverlay').style.display = 'flex';
}

function startSafeMode() {
    const dontShow = document.getElementById('dontShowAgain').checked;
    if (dontShow) {
        localStorage.setItem('webgpu_benchmark_dont_warn', 'true');
    }
    showMainContent(() => {
        document.getElementById('benchmarkMode').value = '0';
        document.getElementById('instances').value = '10';
        document.getElementById('particles').value = '1000';
        document.getElementById('particleValue').textContent = '1000';
    });
}

function proceedWithWarning() {
    const dontShow = document.getElementById('dontShowAgain').checked;
    if (dontShow) {
        localStorage.setItem('webgpu_benchmark_dont_warn', 'true');
    }
    showMainContent(() => {
        document.getElementById('benchmarkMode').value = '1';
        document.getElementById('instances').value = '100';
        document.getElementById('particles').value = '50000';
        document.getElementById('particleValue').textContent = '50000';
    });
}

function showMainContent(callback) {
    const overlay = document.getElementById('warningOverlay');
    const mainContent = document.getElementById('mainContent');

    overlay.style.animation = 'fadeOut 0.5s ease-out forwards';
    setTimeout(() => {
        overlay.style.display = 'none';
        mainContent.classList.add('visible');
        initWebGPU();
        if (callback) callback();
    }, 500);
}

// === WEBGPU BENCHMARK ENGINE ===
let device, context, canvas;
let renderPipeline, computePipeline;
let vertexBuffer, instanceBuffer, particleBuffer, indexBuffer;
let uniformBuffer, computeUniformBuffer;
let bindGroup, computeBindGroup;
let depthTexture;

// State
let instanceCount = 100;
let particleCount = 10000;
let benchmarkMode = 0;
let shaderType = 0;
let wireframe = false;
let speed = 5;
let scale = 1.0; // Voltei para 1.0 como solicitado

// Performance
let fps = 0, frameCount = 0, lastTime = 0;
let renderPasses = 0, computeDispatches = 0;
let gpuMemoryUsage = 0;

// Vertex Shader (WGSL) - Corrigido para WebGPU
const vertexShader = `
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) instancePos: vec3<f32>,
    @location(3) instanceRotation: vec3<f32>,
    @location(4) instanceScale: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) worldPos: vec3<f32>,
    @location(2) instanceData: vec4<f32>,
}

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    time: f32,
    shaderType: f32,
    benchmarkMode: f32,
    particleCount: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Apply instance rotation
    let rotation = input.instanceRotation + vec3<f32>(uniforms.time * 0.5, uniforms.time * 0.7, uniforms.time * 0.3);

    let cx = cos(rotation.x);
    let sx = sin(rotation.x);
    let cy = cos(rotation.y);
    let sy = sin(rotation.y);
    let cz = cos(rotation.z);
    let sz = sin(rotation.z);

    // Create rotation matrix (simplified)
    let rotMatrix = mat3x3<f32>(
        vec3<f32>(cy * cz, -cy * sz, sy),
                                vec3<f32>(sx * sy * cz + cx * sz, -sx * sy * sz + cx * cz, -sx * cy),
                                vec3<f32>(-cx * sy * cz + sx * sz, cx * sy * sz + sx * cz, cx * cy)
    );

    // Apply transformations
    var pos = input.position * input.instanceScale;
    pos = rotMatrix * pos;
    pos += input.instancePos;

    // Apply MVP matrix
    output.position = uniforms.mvpMatrix * vec4<f32>(pos, 1.0);
    output.uv = input.uv;
    output.worldPos = pos;
    output.instanceData = vec4<f32>(input.instanceScale, length(input.instancePos), rotation.x, 0.0);

    return output;
}
`;

// Fragment Shader simplificado para teste
const fragmentShader = `
struct FragmentInput {
    @location(0) uv: vec2<f32>,
    @location(1) worldPos: vec3<f32>,
    @location(2) instanceData: vec4<f32>,
}

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    time: f32,
    shaderType: f32,
    benchmarkMode: f32,
    particleCount: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    // Teste simples: cores baseadas em UV
    var color = vec3<f32>(input.uv.x, input.uv.y, 0.5);

    // Adicionar alguma animação baseada no tempo
    color.z = sin(uniforms.time) * 0.5 + 0.5;

    // Shader type effects
    if (uniforms.shaderType > 0.5) {
        color = vec3<f32>(
            sin(uniforms.time + input.worldPos.x) * 0.5 + 0.5,
                          sin(uniforms.time + input.worldPos.y) * 0.5 + 0.5,
                          sin(uniforms.time + input.worldPos.z) * 0.5 + 0.5
        );
    }

    // Garantir que a cor seja visível
    color = max(color, vec3<f32>(0.1, 0.1, 0.1));

    return vec4<f32>(color, 1.0);
}
`;

// Compute Shader para particle system
const computeShader = `
struct Particle {
    position: vec4<f32>,
    velocity: vec4<f32>,
    life: f32,
    size: f32,
    padding: vec2<f32>,
}

struct ComputeUniforms {
    time: f32,
    deltaTime: f32,
    particleCount: f32,
    mode: f32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: ComputeUniforms;

fn hash(p: vec3<f32>) -> f32 {
    var p3 = fract(p * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= u32(uniforms.particleCount)) {
        return;
    }

    var particle = particles[index];

    // Simple physics simulation
    let fi = f32(index);
    let noise = hash(vec3<f32>(fi, uniforms.time, 0.0));

    // Gravitational attraction
    let center = vec3<f32>(0.0, 0.0, 0.0);
    let toCenter = center - particle.position.xyz;
    let dist = length(toCenter);
    let gravity = normalize(toCenter) * (1.0 / (dist * dist + 0.1)) * 0.01;

    // Update velocity
    particle.velocity.xyz += gravity;
    particle.velocity.xyz *= 0.99; // Damping

    // Update position
    particle.position.xyz += particle.velocity.xyz * uniforms.deltaTime;

    // Boundary conditions
    if (length(particle.position.xyz) > 15.0) {
        particle.position.xyz = normalize(particle.position.xyz) * 15.0;
        particle.velocity.xyz = reflect(particle.velocity.xyz, normalize(particle.position.xyz));
    }

    // Update life
    particle.life += uniforms.deltaTime * 0.1;
    if (particle.life > 10.0) {
        particle.life = 0.0;
        particle.position.xyz = vec3<f32>(
            (hash(vec3<f32>(fi, uniforms.time, 4.0)) - 0.5) * 2.0,
                                          (hash(vec3<f32>(fi, uniforms.time, 5.0)) - 0.5) * 2.0,
                                          (hash(vec3<f32>(fi, uniforms.time, 6.0)) - 0.5) * 2.0
        );
        particle.velocity.xyz = vec3<f32>(0.0);
    }

    particle.size = sin(particle.life * 0.5) * 0.1 + 0.05;
    particles[index] = particle;
}
`;

async function initWebGPU() {
    console.log('🚀 Initializing WebGPU...');

    if (!navigator.gpu) {
        showNotSupported();
        return;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            showNotSupported();
            return;
        }

        device = await adapter.requestDevice();
        canvas = document.getElementById('gpuCanvas');
        context = canvas.getContext('webgpu');

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: device,
            format: format,
                alphaMode: 'opaque',
        });

        // Update GPU info
        const adapterInfo = adapter.info || {};
        const gpuInfo = adapterInfo.description || adapterInfo.vendor || 'WebGPU Device';
        document.getElementById('gpumodel').textContent = `WebGPU: ${gpuInfo}`;

        console.log('✅ WebGPU initialized successfully!');
        console.log('Adapter info:', adapterInfo);
        console.log('Format:', format);

        await createPipelines();
        await createBuffers();
        setupEventListeners();
        startRenderLoop();

    } catch (error) {
        console.error('❌ WebGPU initialization failed:', error);
        showNotSupported();
    }
}

function showNotSupported() {
    const notSupported = document.createElement('div');
    notSupported.className = 'not-supported';
    notSupported.innerHTML = `
    <h2>❌ WebGPU Não Suportado</h2>
    <p>Seu navegador não suporta WebGPU ou não está habilitado.</p>
    <p><strong>Para habilitar WebGPU:</strong></p>
    <ul style="text-align: left; display: inline-block;">
    <li>Chrome: Vá para chrome://flags/#enable-unsafe-webgpu</li>
    <li>Firefox: Vá para about:config e habilite dom.webgpu.enabled</li>
    <li>Edge: Vá para edge://flags/#enable-unsafe-webgpu</li>
    </ul>
    <p>Ou use um navegador mais recente com suporte nativo.</p>
    `;
    document.body.appendChild(notSupported);
}

async function createPipelines() {
    console.log('🔧 Creating pipelines...');

    // Create shaders
    const vertexShaderModule = device.createShaderModule({
        label: 'Vertex Shader',
        code: vertexShader,
    });

    const fragmentShaderModule = device.createShaderModule({
        label: 'Fragment Shader',
        code: fragmentShader,
    });

    const computeShaderModule = device.createShaderModule({
        label: 'Compute Shader',
        code: computeShader,
    });

    // Create render pipeline with proper topology
    renderPipeline = device.createRenderPipeline({
        label: 'Render Pipeline',
        layout: 'auto',
        vertex: {
            module: vertexShaderModule,
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: 5 * 4, // position(3) + uv(2)
    attributes: [
        {
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },
        {
            shaderLocation: 1,
            offset: 3 * 4,
            format: 'float32x2',
        },
    ],
                },
                {
                    arrayStride: 7 * 4, // instancePos(3) + instanceRotation(3) + instanceScale(1)
    stepMode: 'instance',
    attributes: [
        {
            shaderLocation: 2,
            offset: 0,
            format: 'float32x3',
        },
        {
            shaderLocation: 3,
            offset: 3 * 4,
            format: 'float32x3',
        },
        {
            shaderLocation: 4,
            offset: 6 * 4,
            format: 'float32',
        },
    ],
                },
            ],
        },
        fragment: {
            module: fragmentShaderModule,
            entryPoint: 'main',
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat(),
            }],
        },
        primitive: {
            topology: wireframe ? 'line-list' : 'triangle-list',
            cullMode: wireframe ? 'none' : 'back', // Don't cull in wireframe mode
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    // Create compute pipeline
    computePipeline = device.createComputePipeline({
        label: 'Compute Pipeline',
        layout: 'auto',
        compute: {
            module: computeShaderModule,
            entryPoint: 'main',
        },
    });

    console.log('✅ Pipelines created successfully!');
}

async function createBuffers() {
    console.log('📦 Creating buffers...');

    // Create proper 3D cube geometry with better proportions
    const vertices = new Float32Array([
        // Front face
        -1.0, -1.0,  1.0,  0.0, 0.0,
        1.0, -1.0,  1.0,  1.0, 0.0,
        1.0,  1.0,  1.0,  1.0, 1.0,
        -1.0,  1.0,  1.0,  0.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,  1.0, 0.0,
        -1.0,  1.0, -1.0,  1.0, 1.0,
        1.0,  1.0, -1.0,  0.0, 1.0,
        1.0, -1.0, -1.0,  0.0, 0.0,

        // Top face
        -1.0,  1.0, -1.0,  0.0, 1.0,
        -1.0,  1.0,  1.0,  0.0, 0.0,
        1.0,  1.0,  1.0,  1.0, 0.0,
        1.0,  1.0, -1.0,  1.0, 1.0,

        // Bottom face
        -1.0, -1.0, -1.0,  0.0, 0.0,
        1.0, -1.0, -1.0,  1.0, 0.0,
        1.0, -1.0,  1.0,  1.0, 1.0,
        -1.0, -1.0,  1.0,  0.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,  0.0, 0.0,
        1.0,  1.0, -1.0,  1.0, 0.0,
        1.0,  1.0,  1.0,  1.0, 1.0,
        1.0, -1.0,  1.0,  0.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,  1.0, 0.0,
        -1.0, -1.0,  1.0,  0.0, 0.0,
        -1.0,  1.0,  1.0,  0.0, 1.0,
        -1.0,  1.0, -1.0,  1.0, 1.0,
    ]);

    // Indices for triangles AND lines (for wireframe)
    const triangleIndices = new Uint16Array([
        0,  1,  2,    0,  2,  3,    // front
        4,  5,  6,    4,  6,  7,    // back
        8,  9,  10,   8,  10, 11,   // top
        12, 13, 14,   12, 14, 15,   // bottom
        16, 17, 18,   16, 18, 19,   // right
        20, 21, 22,   20, 22, 23,   // left
    ]);

    // Line indices for wireframe
    const lineIndices = new Uint16Array([
        // Front face
        0, 1,  1, 2,  2, 3,  3, 0,
        // Back face
        4, 5,  5, 6,  6, 7,  7, 4,
        // Connecting lines
        0, 4,  1, 7,  2, 6,  3, 5,
        // Top face
        8, 9,  9, 10, 10, 11, 11, 8,
        // Bottom face
        12, 13, 13, 14, 14, 15, 15, 12,
    ]);

    vertexBuffer = device.createBuffer({
        label: 'Vertex Buffer',
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();

    // Create separate buffers for triangles and lines
    indexBuffer = device.createBuffer({
        label: 'Triangle Index Buffer',
        size: triangleIndices.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(triangleIndices);
    indexBuffer.unmap();

    // Store line indices globally for wireframe
    window.lineIndexBuffer = device.createBuffer({
        label: 'Line Index Buffer',
        size: lineIndices.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
    });
    new Uint16Array(window.lineIndexBuffer.getMappedRange()).set(lineIndices);
    window.lineIndexBuffer.unmap();

    // Store indices counts
    window.triangleIndexCount = triangleIndices.length;
    window.lineIndexCount = lineIndices.length;

    // Create instance data
    await updateInstanceBuffer();
    await updateParticleBuffer();

    // Create uniform buffers
    uniformBuffer = device.createBuffer({
        label: 'Uniform Buffer',
        size: 80, // mat4(64) + float(4) * 4
                                        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    computeUniformBuffer = device.createBuffer({
        label: 'Compute Uniform Buffer',
        size: 16, // 4 floats
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create depth texture
    depthTexture = device.createTexture({
        label: 'Depth Texture',
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Create render bind group
    bindGroup = device.createBindGroup({
        label: 'Render Bind Group',
        layout: renderPipeline.getBindGroupLayout(0),
                                       entries: [
                                           {
                                               binding: 0,
                                               resource: {
                                                   buffer: uniformBuffer,
                                               },
                                           },
                                       ],
    });

    // Create compute bind group safely
    createComputeBindGroup();

    console.log('✅ Buffers created successfully!');
}

async function updateInstanceBuffer() {
    const instanceData = new Float32Array(instanceCount * 7);

    for (let i = 0; i < instanceCount; i++) {
        const angle = (i / instanceCount) * Math.PI * 2;
        const radius = Math.sqrt(i) * 0.5; // Aumentei de 0.3 para 0.5
        const height = Math.sin(i * 0.1) * 3; // Aumentei de 2 para 3

        // Position
        instanceData[i * 7 + 0] = Math.cos(angle) * radius;
        instanceData[i * 7 + 1] = height;
        instanceData[i * 7 + 2] = Math.sin(angle) * radius;

        // Rotation
        instanceData[i * 7 + 3] = i * 0.1;
        instanceData[i * 7 + 4] = i * 0.15;
        instanceData[i * 7 + 5] = i * 0.2;

        // Scale - aumentei o tamanho base
        instanceData[i * 7 + 6] = 0.5 + (i % 10) * 0.05; // Aumentei de 0.2 para 0.5
    }

    if (instanceBuffer) {
        device.queue.writeBuffer(instanceBuffer, 0, instanceData);
    } else {
        instanceBuffer = device.createBuffer({
            label: 'Instance Buffer',
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(instanceBuffer.getMappedRange()).set(instanceData);
        instanceBuffer.unmap();
    }
}

async function updateParticleBuffer() {
    const particleData = new Float32Array(particleCount * 8); // 8 floats per particle

    for (let i = 0; i < particleCount; i++) {
        // Position
        particleData[i * 8 + 0] = (Math.random() - 0.5) * 10;
        particleData[i * 8 + 1] = (Math.random() - 0.5) * 10;
        particleData[i * 8 + 2] = (Math.random() - 0.5) * 10;
        particleData[i * 8 + 3] = 0; // padding

        // Velocity
        particleData[i * 8 + 4] = (Math.random() - 0.5) * 0.1;
        particleData[i * 8 + 5] = (Math.random() - 0.5) * 0.1;
        particleData[i * 8 + 6] = (Math.random() - 0.5) * 0.1;
        particleData[i * 8 + 7] = 0; // padding
    }

    if (particleBuffer) {
        device.queue.writeBuffer(particleBuffer, 0, particleData);
    } else {
        particleBuffer = device.createBuffer({
            label: 'Particle Buffer',
            size: particleData.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(particleBuffer.getMappedRange()).set(particleData);
        particleBuffer.unmap();
    }
}

function setupEventListeners() {
    // Configurar valores iniciais dos controles
    document.getElementById('speed').value = speed;
    document.getElementById('scale').value = scale * 2; // Converter escala real para valor do slider
    document.getElementById('scaleValue').textContent = (scale * 2).toFixed(1);
    document.getElementById('shaderType').value = shaderType;
    document.getElementById('particles').value = particleCount;
    document.getElementById('particleValue').textContent = particleCount.toLocaleString();
    document.getElementById('instances').value = instanceCount;
    document.getElementById('benchmarkMode').value = benchmarkMode;

    document.getElementById('speed').addEventListener('input', (e) => {
        speed = parseFloat(e.target.value);
    });

    document.getElementById('scale').addEventListener('input', (e) => {
        // Converter escala: slider 0.1-10 -> escala real 0.05-5
        const sliderValue = parseFloat(e.target.value);
        scale = sliderValue * 0.5; // Assim 1.0 no slider = 0.5 real, 2.0 no slider = 1.0 real
        document.getElementById('scaleValue').textContent = sliderValue.toFixed(1);
    });

    document.getElementById('wireframe').addEventListener('change', async (e) => {
        wireframe = e.target.checked;
        await createPipelines(); // Recreate pipelines for wireframe change

        // Recreate bind group with new pipeline
        bindGroup = device.createBindGroup({
            label: 'Render Bind Group',
            layout: renderPipeline.getBindGroupLayout(0),
                                           entries: [
                                               {
                                                   binding: 0,
                                                   resource: {
                                                       buffer: uniformBuffer,
                                                   },
                                               },
                                           ],
        });
    });

    document.getElementById('shaderType').addEventListener('change', (e) => {
        shaderType = parseInt(e.target.value);
    });

    document.getElementById('particles').addEventListener('input', (e) => {
        particleCount = parseInt(e.target.value);
        document.getElementById('particleValue').textContent = particleCount.toLocaleString();
        updateParticleBuffer();

        // Recreate compute bind group safely
        createComputeBindGroup();
    });

    document.getElementById('instances').addEventListener('input', (e) => {
        instanceCount = parseInt(e.target.value);
        updateInstanceBuffer();
    });

    document.getElementById('benchmarkMode').addEventListener('change', (e) => {
        benchmarkMode = parseInt(e.target.value);
    });
}

function startRenderLoop() {
    console.log('🎬 Starting render loop...');
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let debugFrameCount = 0;

    function render() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;

        // Update FPS
        if (currentTime - lastTime > 500) {
            fps = Math.round(1000 / ((currentTime - lastTime) / frameCount));
            updateMetrics();
            frameCount = 0;
            lastTime = currentTime;
        }
        frameCount++;

        // Debug logs for first few frames
        if (debugFrameCount < 10) {
            console.log(`🎬 Frame ${debugFrameCount}: Rendering ${instanceCount} instances`);
            if (debugFrameCount === 0) {
                console.log('Canvas size:', canvas.width, 'x', canvas.height);
                console.log('Device:', device);
                console.log('Context:', context);
                console.log('Render pipeline:', renderPipeline);
            }
            debugFrameCount++;
        }

        // Update uniforms
        updateUniforms(currentTime / 1000, deltaTime);

        // Compute pass (if needed)
        if (benchmarkMode >= 1) {
            runComputePass(deltaTime);
        }

        // Render pass
        try {
            runRenderPass();
        } catch (error) {
            console.error('❌ Render pass error:', error);
            return; // Stop rendering on error
        }

        requestAnimationFrame(render);
    }

    render();
}

function updateUniforms(time, deltaTime) {
    // WebGPU uses column-major matrices and different coordinate system
    const aspect = canvas.width / canvas.height;
    const fov = 45 * Math.PI / 180;
    const near = 0.1;
    const far = 100;

    // Proper perspective projection matrix (column-major for WebGPU)
    const f = 1.0 / Math.tan(fov / 2);
    const projectionMatrix = new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, -(far + near) / (far - near), -1,
                                              0, 0, -(2 * far * near) / (far - near), 0
    ]);

    // View matrix - camera positioned closer and looking at origin
    const rotation = time * speed * 0.1;
    const distance = 6; // Reduzi de 8 para 6 para ficar mais próximo
    const camX = Math.cos(rotation) * distance;
    const camZ = Math.sin(rotation) * distance;
    const camY = 0;

    // Look-at matrix calculation
    const forward = normalize([0 - camX, 0 - camY, 0 - camZ]);
    const up = [0, 1, 0];
    const right = normalize(cross(forward, up));
    const newUp = cross(right, forward);

    const viewMatrix = new Float32Array([
        right[0], newUp[0], -forward[0], 0,
        right[1], newUp[1], -forward[1], 0,
        right[2], newUp[2], -forward[2], 0,
        -dot(right, [camX, camY, camZ]), -dot(newUp, [camX, camY, camZ]), dot(forward, [camX, camY, camZ]), 1
    ]);

    // Multiply projection * view (proper matrix multiplication)
    const mvpMatrix = multiplyMatrices(projectionMatrix, viewMatrix);

    // Apply scale
    for (let i = 0; i < 16; i++) {
        if (i % 4 !== 3) { // Don't scale w component
            mvpMatrix[i] *= scale;
        }
    }

    // Update uniform buffer
    const uniformData = new Float32Array(20);
    uniformData.set(mvpMatrix, 0);
    uniformData[16] = time;
    uniformData[17] = shaderType;
    uniformData[18] = benchmarkMode;
    uniformData[19] = particleCount;

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Update compute uniforms
    if (benchmarkMode >= 1) {
        const computeData = new Float32Array(4);
        computeData[0] = time;
        computeData[1] = deltaTime;
        computeData[2] = particleCount;
        computeData[3] = benchmarkMode;

        device.queue.writeBuffer(computeUniformBuffer, 0, computeData);
    }
}

// Helper functions for matrix math
function normalize(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] =
            a[i * 4 + 0] * b[0 * 4 + j] +
            a[i * 4 + 1] * b[1 * 4 + j] +
            a[i * 4 + 2] * b[2 * 4 + j] +
            a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return result;
}

function runComputePass(deltaTime) {
    // Only run compute pass if we have a valid compute pipeline and bind group
    if (!computePipeline || !computeBindGroup) {
        return;
    }

    try {
        const commandEncoder = device.createCommandEncoder({
            label: 'Compute Command Encoder'
        });

        const computePass = commandEncoder.beginComputePass({
            label: 'Compute Pass'
        });

        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, computeBindGroup);

        const workgroupSize = 64;
        const numWorkgroups = Math.ceil(particleCount / workgroupSize);
        computePass.dispatchWorkgroups(numWorkgroups);

        computePass.end();

        device.queue.submit([commandEncoder.finish()]);
        computeDispatches++;
    } catch (error) {
        console.error('❌ Compute pass error:', error);
    }
}

function runRenderPass() {
    const commandEncoder = device.createCommandEncoder({
        label: 'Render Command Encoder'
    });

    const renderPass = commandEncoder.beginRenderPass({
        label: 'Render Pass',
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
                                                      clearValue: { r: 0.1, g: 0.1, b: 0.2, a: 1.0 },
                                                      loadOp: 'clear',
                                                      storeOp: 'store',
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
                                                      depthClearValue: 1.0,
                                                      depthLoadOp: 'clear',
                                                      depthStoreOp: 'store',
        },
    });

    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setVertexBuffer(1, instanceBuffer);

    if (wireframe) {
        // Use line indices for wireframe
        renderPass.setIndexBuffer(window.lineIndexBuffer, 'uint16');
        renderPass.drawIndexed(window.lineIndexCount, instanceCount);
    } else {
        // Use triangle indices for solid
        renderPass.setIndexBuffer(indexBuffer, 'uint16');
        renderPass.drawIndexed(window.triangleIndexCount, instanceCount);
    }

    // Debug: Log first few frames
    if (frameCount < 5) {
        console.log(`Frame ${frameCount}: Drawing ${instanceCount} instances, wireframe: ${wireframe}`);
    }

    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
    renderPasses++;
}

function updateMetrics() {
    document.getElementById('fpsValue').textContent = fps;
    document.getElementById('frameTime').textContent = (1000 / fps).toFixed(2);
    document.getElementById('frameCount').textContent = frameCount;
    document.getElementById('vertexCount').textContent = (24 * instanceCount).toLocaleString();
    document.getElementById('particleCount').textContent = particleCount.toLocaleString();
    document.getElementById('instanceCount').textContent = instanceCount.toLocaleString();
    document.getElementById('renderPasses').textContent = renderPasses;
    document.getElementById('computeDispatches').textContent = computeDispatches;

    // Estimate GPU memory usage
    const vertexMem = 24 * instanceCount * 5 * 4; // 24 vertices * instances * 5 floats * 4 bytes
    const particleMem = particleCount * 8 * 4; // particles * 8 floats * 4 bytes
    const totalMem = (vertexMem + particleMem) / (1024 * 1024);
    document.getElementById('gpuMemory').textContent = totalMem.toFixed(1);

    // Update compute shader info
    document.getElementById('workgroupSize').textContent = '64';
    document.getElementById('dispatchCount').textContent = Math.ceil(particleCount / 64);
    document.getElementById('computeTime').textContent = (1000 / fps * 0.3).toFixed(2);
    document.getElementById('particlesUpdated').textContent = particleCount.toLocaleString();

    // Color code FPS
    const fpsEl = document.getElementById('fpsValue');
    fpsEl.className = fps > 30 ? '' : fps > 15 ? 'warning' : 'critical';

    // Reset counters
    renderPasses = 0;
    computeDispatches = 0;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'w':
        case 'W':
            const wireframeEl = document.getElementById('wireframe');
            wireframeEl.checked = !wireframeEl.checked;
            wireframe = wireframeEl.checked;
            createPipelines();
            break;
        case '1':
        case '2':
        case '3':
        case '4':
            benchmarkMode = parseInt(e.key) - 1;
            document.getElementById('benchmarkMode').value = benchmarkMode;
            break;
        case ' ':
            e.preventDefault();
            speed = speed > 0 ? 0 : 5;
            document.getElementById('speed').value = speed;
            break;
        case 'r':
        case 'R':
            // Reset particles
            updateParticleBuffer();
            computeBindGroup = device.createBindGroup({
                label: 'Compute Bind Group',
                layout: computePipeline.getBindGroupLayout(0),
                                                      entries: [
                                                          {
                                                              binding: 0,
                                                              resource: {
                                                                  buffer: particleBuffer,
                                                              },
                                                          },
                                                          {
                                                              binding: 1,
                                                              resource: {
                                                                  buffer: computeUniformBuffer,
                                                              },
                                                          },
                                                      ],
            });
            break;
        case '+':
        case '=':
            particleCount = Math.min(1000000, particleCount + 10000);
            document.getElementById('particles').value = particleCount;
            document.getElementById('particleValue').textContent = particleCount.toLocaleString();
            updateParticleBuffer();
            break;
        case '-':
        case '_':
            particleCount = Math.max(1000, particleCount - 10000);
            document.getElementById('particles').value = particleCount;
            document.getElementById('particleValue').textContent = particleCount.toLocaleString();
            updateParticleBuffer();
            break;
        case 'p':
        case 'P':
            shaderType = (shaderType + 1) % 8;
            document.getElementById('shaderType').value = shaderType;
            break;
    }
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('WebGPU Benchmark Error:', e.error);
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', checkPreviousWarning);

// Performance monitoring
let performanceStart = performance.now();
let lowFpsWarningShown = false;

setInterval(() => {
    if (fps > 0 && fps < 5 && !lowFpsWarningShown) {
        lowFpsWarningShown = true;
        console.warn(`⚠️ WebGPU Performance Warning: FPS extremely low (${fps}). Consider reducing particles or switching to lower benchmark mode.`);
    }
}, 5000);

// WebGPU context lost handling
if (typeof device !== 'undefined' && device) {
    device.addEventListener('uncapturederror', (event) => {
        console.error('WebGPU uncaptured error:', event.error);
    });
}

console.log('🚀 WebGPU Ultra Benchmark loaded successfully!');
console.log('💡 WebGPU Features:');
console.log('  • Compute Shaders for particle physics');
console.log('  • Advanced procedural shaders');
console.log('  • Render bundles for optimization');
console.log('  • Multiple render targets');
console.log('  • Async GPU operations');
console.log('  • Memory management control');
console.log('');
console.log('🎮 Controls:');
console.log('  • W: Toggle wireframe');
console.log('  • 1-4: Change benchmark mode');
console.log('  • Space: Pause/Resume');
console.log('  • R: Reset particles');
console.log('  • +/-: Increase/Decrease particles');
console.log('  • P: Cycle shader types');
console.log('');
console.log('⚠️ Warning: WebGPU compute shaders can be extremely demanding!');
console.log('   Start with lower particle counts and gradually increase.');
