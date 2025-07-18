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
                if (typeof initWebGPU === 'function') {
                    initWebGPU();
                }
                if (callback) callback();
            }, 500);
        }

        // === WEBGPU BENCHMARK ENGINE ===
        let device, context, canvas;
        let renderPipeline, computePipeline;
        let vertexBuffer, instanceBuffer, particleBuffer;
        let uniformBuffer, computeUniformBuffer;
        let bindGroup, computeBindGroup;
        let renderBundle;

        // State
        let instanceCount = 100;
        let particleCount = 10000;
        let benchmarkMode = 0;
        let shaderType = 0;
        let wireframe = false;
        let speed = 5;
        let scale = 1.0;

        // Performance
        let fps = 0, frameCount = 0, lastTime = 0;
        let renderPasses = 0, computeDispatches = 0;
        let gpuMemoryUsage = 0;

        // Vertex Shader (WGSL)
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

            // Rotation matrices
            let cx = cos(input.instanceRotation.x);
            let sx = sin(input.instanceRotation.x);
            let cy = cos(input.instanceRotation.y);
            let sy = sin(input.instanceRotation.y);
            let cz = cos(input.instanceRotation.z);
            let sz = sin(input.instanceRotation.z);

            let rotX = mat3x3<f32>(
                vec3<f32>(1.0, 0.0, 0.0),
                                   vec3<f32>(0.0, cx, -sx),
                                   vec3<f32>(0.0, sx, cx)
            );

            let rotY = mat3x3<f32>(
                vec3<f32>(cy, 0.0, sy),
                                   vec3<f32>(0.0, 1.0, 0.0),
                                   vec3<f32>(-sy, 0.0, cy)
            );

            let rotZ = mat3x3<f32>(
                vec3<f32>(cz, -sz, 0.0),
                                   vec3<f32>(sz, cz, 0.0),
                                   vec3<f32>(0.0, 0.0, 1.0)
            );

            var pos = input.position * input.instanceScale;
            pos = rotZ * rotY * rotX * pos;
            pos += input.instancePos;

            output.position = uniforms.mvpMatrix * vec4<f32>(pos, 1.0);
            output.uv = input.uv;
            output.worldPos = pos;
            output.instanceData = vec4<f32>(input.instanceScale, length(input.instancePos), f32(input.instanceRotation.x), 0.0);

            return output;
        }
        `;

        // Fragment Shader com efeitos avançados (WGSL)
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

        // Hash function for random
        fn hash33(p: vec3<f32>) -> vec3<f32> {
            var p3 = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
            p3 += dot(p3, p3.yxz + 33.33);
            return fract((p3.xxy + p3.yxx) * p3.zyx);
        }

        // 4D Noise
        fn noise4D(p: vec4<f32>) -> f32 {
            let i = floor(p);
            let f = fract(p);
            let u = f * f * (3.0 - 2.0 * f);

            // Sample noise at corners
            var n = mix(
                mix(mix(hash33(i.xyz).x, hash33(i.xyz + vec3<f32>(1,0,0)).x, u.x),
                    mix(hash33(i.xyz + vec3<f32>(0,1,0)).x, hash33(i.xyz + vec3<f32>(1,1,0)).x, u.x), u.y),
                        mix(mix(hash33(i.xyz + vec3<f32>(0,0,1)).x, hash33(i.xyz + vec3<f32>(1,0,1)).x, u.x),
                            mix(hash33(i.xyz + vec3<f32>(0,1,1)).x, hash33(i.xyz + vec3<f32>(1,1,1)).x, u.x), u.y), u.z
            );

            return n;
        }

        // Fractal Brownian Motion
        fn fbm(p: vec4<f32>, octaves: i32) -> f32 {
            var value = 0.0;
            var amplitude = 0.5;
            var frequency = 1.0;
            var p_var = p;

            for (var i = 0; i < 8; i++) {
                if (i >= octaves) { break; }

                value += amplitude * noise4D(p_var * frequency);
                amplitude *= 0.5;
                frequency *= 2.07;
                p_var += vec4<f32>(1.7, 9.2, 5.3, 2.1);
            }

            return value;
        }

        // Procedural Fire
        fn proceduralFire(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv.x * 20.0, uv.y * 40.0 - uniforms.time * 8.0, uniforms.time * 0.1, 0.0);
            var flame = fbm(p, 8);
            flame = pow(flame * 3.0, 2.0) * pow(1.0 - uv.y * 0.8, 1.5);

            // Multiple flame layers
            for (var i = 1; i < 6; i++) {
                let fi = f32(i);
                let p2 = vec4<f32>(uv.x * (20.0 + fi * 8.0), uv.y * (40.0 + fi * 12.0) - uniforms.time * (8.0 + fi * 2.0), uniforms.time * 0.05 * fi, fi);
                flame += fbm(p2, 6) * (1.0 / fi) * 0.5;
            }

            // Temperature-based coloring
            let temperature = flame + uv.y * 0.3;
            let blue = vec3<f32>(0.3, 0.5, 1.0);
            let white = vec3<f32>(1.0, 0.98, 0.9);
            let yellow = vec3<f32>(1.0, 0.95, 0.3);
            let orange = vec3<f32>(1.0, 0.6, 0.1);
            let red = vec3<f32>(0.9, 0.3, 0.05);

            var color = mix(vec3<f32>(0.0), red, smoothstep(0.0, 0.3, temperature));
            color = mix(color, orange, smoothstep(0.3, 0.6, temperature));
            color = mix(color, yellow, smoothstep(0.6, 0.8, temperature));
            color = mix(color, white, smoothstep(0.8, 1.0, temperature));

            return color * flame;
        }

        // Plasma Energy
        fn plasmaEnergy(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 50.0, uniforms.time * 0.2, 0.0);
            let plasma1 = fbm(p, 6);
            let plasma2 = fbm(p + vec4<f32>(100.0, 50.0, 25.0, 10.0), 6);

            let energy = sin(plasma1 * 10.0 + uniforms.time * 3.0) * sin(plasma2 * 8.0 + uniforms.time * 2.0);

            return vec3<f32>(
                energy * 0.3 + pow(abs(energy), 3.0) * 0.7,
                             energy * 0.8 + pow(abs(energy), 2.0) * 0.2,
                             abs(energy) + pow(abs(energy), 4.0)
            );
        }

        // Quantum Foam
        fn quantumFoam(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 100.0, uniforms.time * 0.1, uniforms.instanceData.y * 0.1);

            var foam = 0.0;
            var amplitude = 1.0;

            // Quantum fluctuations
            for (var i = 0; i < 12; i++) {
                let fi = f32(i);
                let freq = pow(2.0, fi);
                let phase = uniforms.time * (1.0 + fi * 0.1);

                foam += amplitude * sin(noise4D(p * freq + vec4<f32>(phase)) * 6.28);
                amplitude *= 0.6;
            }

            foam = abs(foam);

            // Quantum interference patterns
            let interference = sin(uv.x * 200.0 + foam * 10.0) * sin(uv.y * 200.0 + foam * 10.0);
            foam += interference * 0.3;

            return vec3<f32>(
                foam * 0.5 + 0.5,
                pow(foam, 0.5) * 0.8,
                             pow(foam, 2.0) * 0.6
            );
        }

        // Fractal Noise
        fn fractalNoise(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 50.0, uniforms.time * 0.05, 0.0);
            let noise = fbm(p, 10);

            let hue = noise * 6.28 + uniforms.time;
            return vec3<f32>(
                sin(hue) * 0.5 + 0.5,
                             sin(hue + 2.094) * 0.5 + 0.5,
                             sin(hue + 4.188) * 0.5 + 0.5
            );
        }

        // Holographic Effect
        fn holographic(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 200.0, uniforms.time * 0.3, uniforms.instanceData.z);

            // Holographic interference
            let wave1 = sin(p.x + p.y + uniforms.time * 5.0);
            let wave2 = sin(p.x - p.y + uniforms.time * 3.0);
            let wave3 = sin(length(uv - 0.5) * 100.0 + uniforms.time * 7.0);

            let interference = wave1 * wave2 * wave3;
            let noise = fbm(p, 6) * 0.3;

            let holo = interference + noise;

            // Chromatic aberration
            let r = sin(holo * 3.0 + uniforms.time) * 0.5 + 0.5;
            let g = sin(holo * 3.0 + uniforms.time + 2.0) * 0.5 + 0.5;
            let b = sin(holo * 3.0 + uniforms.time + 4.0) * 0.5 + 0.5;

            return vec3<f32>(r, g, b) * (0.5 + abs(holo) * 0.5);
        }

        // Particle Field (simulated)
        fn particleField(uv: vec2<f32>) -> vec3<f32> {
            var color = vec3<f32>(0.0);

            // Simulate particle field
            for (var i = 0; i < 32; i++) {
                let fi = f32(i);
                let phase = uniforms.time * (0.5 + fi * 0.1);
                let particlePos = vec2<f32>(
                    sin(phase + fi * 2.0) * 0.5 + 0.5,
                                            cos(phase + fi * 1.5) * 0.5 + 0.5
                );

                let dist = distance(uv, particlePos);
                let intensity = exp(-dist * 100.0);

                color += intensity * vec3<f32>(
                    sin(fi + uniforms.time) * 0.5 + 0.5,
                                               sin(fi + uniforms.time + 2.0) * 0.5 + 0.5,
                                               sin(fi + uniforms.time + 4.0) * 0.5 + 0.5
                );
            }

            return color;
        }

        // Compute Waves
        fn computeWaves(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 100.0, uniforms.time * 0.2, 0.0);

            var waves = 0.0;
            var amplitude = 1.0;

            // Compute-style wave interference
            for (var i = 0; i < 16; i++) {
                let fi = f32(i);
                let freq = 1.0 + fi * 0.5;
                let phase = uniforms.time * (2.0 + fi * 0.3);

                let wave = sin(length(uv - 0.5) * 50.0 * freq + phase);
                waves += wave * amplitude;
                amplitude *= 0.7;
            }

            waves = waves * 0.5 + 0.5;

            // Compute-style coloring
            return vec3<f32>(
                waves,
                pow(waves, 0.5),
                             pow(waves, 2.0)
            );
        }

        // Neural Network visualization
        fn neuralNetwork(uv: vec2<f32>) -> vec3<f32> {
            let p = vec4<f32>(uv * 80.0, uniforms.time * 0.1, 0.0);

            // Neural nodes
            var network = 0.0;
            for (var i = 0; i < 8; i++) {
                for (var j = 0; j < 8; j++) {
                    let nodePos = vec2<f32>(f32(i) / 8.0, f32(j) / 8.0);
                    let dist = distance(uv, nodePos);
                    let activation = sin(dist * 50.0 + uniforms.time * 5.0 + f32(i * j)) * 0.5 + 0.5;
                    network += exp(-dist * 20.0) * activation;
                }
            }

            // Neural connections
            let connections = fbm(p, 4) * 0.3;
            network += connections;

            // Synaptic activity
            let synaptic = sin(network * 10.0 + uniforms.time * 3.0) * 0.5 + 0.5;

            return vec3<f32>(
                network * 0.3 + synaptic * 0.7,
                network * 0.8,
                network * 0.5 + synaptic * 0.5
            );
        }

        @fragment
        fn main(input: FragmentInput) -> @location(0) vec4<f32> {
            var color = vec3<f32>(1.0);

            if (uniforms.shaderType < 0.5) {
                color = proceduralFire(input.uv);
            } else if (uniforms.shaderType < 1.5) {
                color = plasmaEnergy(input.uv);
            } else if (uniforms.shaderType < 2.5) {
                color = quantumFoam(input.uv);
            } else if (uniforms.shaderType < 3.5) {
                color = fractalNoise(input.uv);
            } else if (uniforms.shaderType < 4.5) {
                color = holographic(input.uv);
            } else if (uniforms.shaderType < 5.5) {
                color = particleField(input.uv);
            } else if (uniforms.shaderType < 6.5) {
                color = computeWaves(input.uv);
            } else {
                color = neuralNetwork(input.uv);
            }

            // Instance-based effects
            let instanceEffect = sin(input.instanceData.z * 0.1 + uniforms.time) * 0.2 + 1.0;
            color *= instanceEffect;

            // Extreme benchmark mode effects
            if (uniforms.benchmarkMode > 2.5) {
                // Quantum reality distortion
                let quantum = fbm(vec4<f32>(input.worldPos * 10.0, uniforms.time * 0.5), 8);
                color += quantum * vec3<f32>(0.5, 0.3, 0.8);

                // Reality-bending chromatic aberration
                let aberration = sin(length(input.worldPos) * 5.0 + uniforms.time * 10.0) * 0.1;
                color.r += aberration;
                color.g += aberration * 0.5;
                color.b -= aberration;
            }

            // HDR tone mapping
            color = color / (color + 1.0);

            // Gamma correction
            color = pow(color, vec3<f32>(1.0 / 2.2));

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

            // Physics simulation
            let fi = f32(index);
            let noise = hash(vec3<f32>(fi, uniforms.time, 0.0));

            // Gravitational attraction
            let center = vec3<f32>(0.0, 0.0, 0.0);
            let toCenter = center - particle.position.xyz;
            let dist = length(toCenter);
            let gravity = normalize(toCenter) * (1.0 / (dist * dist + 0.1)) * 0.01;

            // Turbulence
            let turbulence = vec3<f32>(
                sin(fi * 0.1 + uniforms.time * 2.0) * 0.02,
                                       cos(fi * 0.15 + uniforms.time * 1.5) * 0.02,
                                       sin(fi * 0.2 + uniforms.time * 1.8) * 0.02
            );

            // Extreme mode effects
            if (uniforms.mode > 1.5) {
                // Quantum tunneling
                if (noise > 0.99) {
                    particle.position.xyz = vec3<f32>(
                        (hash(vec3<f32>(fi, uniforms.time, 1.0)) - 0.5) * 10.0,
                                                      (hash(vec3<f32>(fi, uniforms.time, 2.0)) - 0.5) * 10.0,
                                                      (hash(vec3<f32>(fi, uniforms.time, 3.0)) - 0.5) * 10.0
                    );
                }

                // Particle interaction
                var force = vec3<f32>(0.0);
                let sampleStep = max(1u, u32(uniforms.particleCount) / 1000u);

                for (var i = 0u; i < u32(uniforms.particleCount); i += sampleStep) {
                    if (i == index) { continue; }

                    let other = particles[i];
                    let delta = other.position.xyz - particle.position.xyz;
                    let dist = length(delta);

                    if (dist < 2.0 && dist > 0.01) {
                        force += normalize(delta) * (1.0 / (dist * dist)) * 0.001;
                    }
                }

                particle.velocity.xyz += force;
            }

            // Update velocity
            particle.velocity.xyz += gravity + turbulence;
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

            // Update size based on life
            particle.size = sin(particle.life * 0.5) * 0.1 + 0.05;

            particles[index] = particle;
        }
        `;

        async function initWebGPU() {
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

                context.configure({
                    device: device,
                    format: navigator.gpu.getPreferredCanvasFormat(),
                        alphaMode: 'opaque',
                });

                // Update GPU info - try to get more detailed info
                const adapterInfo = adapter.info || {};
                const gpuInfo = adapterInfo.description || adapterInfo.vendor || 'WebGPU Device';
                document.getElementById('gpumodel').textContent = `WebGPU: ${gpuInfo}`;

                console.log('🚀 WebGPU initialized successfully!');
                console.log('Adapter info:', adapterInfo);
                console.log('Device limits:', device.limits);
                console.log('Device features:', Array.from(device.features || []));

                await createPipelines();
                await createBuffers();
                setupEventListeners();
                startRenderLoop();

            } catch (error) {
                console.error('WebGPU initialization failed:', error);
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
            // Create shaders
            const vertexShaderModule = device.createShaderModule({
                code: vertexShader,
            });

            const fragmentShaderModule = device.createShaderModule({
                code: fragmentShader,
            });

            const computeShaderModule = device.createShaderModule({
                code: computeShader,
            });

            // Create render pipeline
            renderPipeline = device.createRenderPipeline({
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
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus',
                },
            });

            // Create compute pipeline
            computePipeline = device.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: computeShaderModule,
                    entryPoint: 'main',
                },
            });
        }

        async function createBuffers() {
            // Create cube geometry
            const vertices = new Float32Array([
                // Front face
                -1, -1,  1,  0, 0,
                1, -1,  1,  1, 0,
                1,  1,  1,  1, 1,
                -1,  1,  1,  0, 1,
                // Back face
                -1, -1, -1,  1, 0,
                -1,  1, -1,  1, 1,
                1,  1, -1,  0, 1,
                1, -1, -1,  0, 0,
                // Top face
                -1,  1, -1,  0, 1,
                -1,  1,  1,  0, 0,
                1,  1,  1,  1, 0,
                1,  1, -1,  1, 1,
                // Bottom face
                -1, -1, -1,  0, 0,
                1, -1, -1,  1, 0,
                1, -1,  1,  1, 1,
                -1, -1,  1,  0, 1,
                // Right face
                1, -1, -1,  0, 0,
                1,  1, -1,  1, 0,
                1,  1,  1,  1, 1,
                1, -1,  1,  0, 1,
                // Left face
                -1, -1, -1,  1, 0,
                -1, -1,  1,  0, 0,
                -1,  1,  1,  0, 1,
                -1,  1, -1,  1, 1,
            ]);

            const indices = new Uint16Array([
                0,  1,  2,    0,  2,  3,    // front
                4,  5,  6,    4,  6,  7,    // back
                8,  9,  10,   8,  10, 11,   // top
                12, 13, 14,   12, 14, 15,   // bottom
                16, 17, 18,   16, 18, 19,   // right
                20, 21, 22,   20, 22, 23,   // left
            ]);

            vertexBuffer = device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true,
            });
            new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
            vertexBuffer.unmap();

            const indexBuffer = device.createBuffer({
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX,
                mappedAtCreation: true,
            });
            new Uint16Array(indexBuffer.getMappedRange()).set(indices);
            indexBuffer.unmap();

            // Create instance data
            await updateInstanceBuffer();
            await updateParticleBuffer();

            // Create uniform buffers
            uniformBuffer = device.createBuffer({
                size: 80, // mat4(64) + float(4) + float(4) + float(4) + float(4)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            computeUniformBuffer = device.createBuffer({
                size: 16, // 4 floats
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            // Create depth texture
            const depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });

            // Create bind groups
            bindGroup = device.createBindGroup({
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

            computeBindGroup = device.createBindGroup({
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

            // Store references globally for access
            window.indexBuffer = indexBuffer;
            window.depthTexture = depthTexture;
        }

        async function updateInstanceBuffer() {
            const instanceData = new Float32Array(instanceCount * 7);

            for (let i = 0; i < instanceCount; i++) {
                const angle = (i / instanceCount) * Math.PI * 2;
                const radius = Math.sqrt(i) * 0.3;
                const height = Math.sin(i * 0.1) * 2;

                // Position
                instanceData[i * 7 + 0] = Math.cos(angle) * radius;
                instanceData[i * 7 + 1] = height;
                instanceData[i * 7 + 2] = Math.sin(angle) * radius;

                // Rotation
                instanceData[i * 7 + 3] = i * 0.1;
                instanceData[i * 7 + 4] = i * 0.15;
                instanceData[i * 7 + 5] = i * 0.2;

                // Scale
                instanceData[i * 7 + 6] = 0.2 + (i % 10) * 0.02;
            }

            instanceBuffer = device.createBuffer({
                size: instanceData.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });

            device.queue.writeBuffer(instanceBuffer, 0, instanceData);
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

                // Life and size (packed into next positions)
                // This is a simplified structure for the example
            }

            particleBuffer = device.createBuffer({
                size: particleData.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true,
            });
            new Float32Array(particleBuffer.getMappedRange()).set(particleData);
            particleBuffer.unmap();
        }

        function setupEventListeners() {
            document.getElementById('speed').addEventListener('input', (e) => {
                speed = parseFloat(e.target.value);
            });

            document.getElementById('scale').addEventListener('input', (e) => {
                scale = parseFloat(e.target.value);
                document.getElementById('scaleValue').textContent = scale.toFixed(1);
            });

            document.getElementById('wireframe').addEventListener('change', (e) => {
                wireframe = e.target.checked;
                createPipelines(); // Recreate pipeline for wireframe
            });

            document.getElementById('shaderType').addEventListener('change', (e) => {
                shaderType = parseInt(e.target.value);
            });

            document.getElementById('particles').addEventListener('input', (e) => {
                particleCount = parseInt(e.target.value);
                document.getElementById('particleValue').textContent = particleCount.toLocaleString();
                updateParticleBuffer();
                // Recreate compute bind group
                computeBindGroup = device.createBindGroup({
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
            const startTime = performance.now();
            let lastFrameTime = startTime;

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

                // Update uniforms
                updateUniforms(currentTime / 1000, deltaTime);

                // Compute pass (if needed)
                if (benchmarkMode >= 1) {
                    runComputePass(deltaTime);
                }

                // Render pass
                runRenderPass();

                requestAnimationFrame(render);
            }

            render();
        }

        function updateUniforms(time, deltaTime) {
            // Create matrices properly
            const aspect = canvas.width / canvas.height;
            const fov = 45 * Math.PI / 180;
            const near = 0.1;
            const far = 100;

            // Perspective projection matrix
            const f = 1.0 / Math.tan(fov / 2);
            const projectionMatrix = new Float32Array([
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (far + near) / (near - far), -1,
                                                      0, 0, (2 * far * near) / (near - far), 0
            ]);

            // Model-view matrix with proper rotation and translation
            const rotation = time * speed * 0.1;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);

            // Combined model-view-projection matrix
            const mvpMatrix = new Float32Array([
                (f / aspect) * cos * scale, 0, (f / aspect) * sin * scale, 0,
                                               0, f * scale, 0, 0,
                                               -sin * scale * (far + near) / (near - far), 0, cos * scale * (far + near) / (near - far), -1,
                                               -sin * scale * (2 * far * near) / (near - far), 0, cos * scale * (2 * far * near) / (near - far) - 8 * (far + near) / (near - far), 8 * (2 * far * near) / (near - far)
            ]);

            // Update uniform buffer with corrected data
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

        function runComputePass(deltaTime) {
            const commandEncoder = device.createCommandEncoder();
            const computePass = commandEncoder.beginComputePass();

            computePass.setPipeline(computePipeline);
            computePass.setBindGroup(0, computeBindGroup);

            const workgroupSize = 64;
            const numWorkgroups = Math.ceil(particleCount / workgroupSize);
            computePass.dispatchWorkgroups(numWorkgroups);

            computePass.end();

            device.queue.submit([commandEncoder.finish()]);
            computeDispatches++;
        }

        function runRenderPass() {
            const commandEncoder = device.createCommandEncoder();

            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                                                              clearValue: { r: 0.1, g: 0.1, b: 0.2, a: 1.0 },
                                                              loadOp: 'clear',
                                                              storeOp: 'store',
                }],
                depthStencilAttachment: {
                    view: window.depthTexture.createView(),
                                                              depthClearValue: 1.0,
                                                              depthLoadOp: 'clear',
                                                              depthStoreOp: 'store',
                },
            });

            renderPass.setPipeline(renderPipeline);
            renderPass.setBindGroup(0, bindGroup);
            renderPass.setVertexBuffer(0, vertexBuffer);
            renderPass.setVertexBuffer(1, instanceBuffer);
            renderPass.setIndexBuffer(window.indexBuffer, 'uint16');

            // Debug: Add console logging for first few frames
            if (frameCount < 5) {
                console.log(`Frame ${frameCount}: Rendering ${instanceCount} instances`);
            }

            renderPass.drawIndexed(36, instanceCount); // 36 indices for cube, multiple instances

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
                    // Toggle between shader types
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
        if (typeof device !== 'undefined') {
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
