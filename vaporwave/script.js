        // === WEBGL VAPORWAVE SCENE ===

        let gl, shaderProgram, programInfo;
        let sceneBuffers = {};
        let lightIntensity = 1.0, cameraSpeed = 1.0, cameraHeight = 4.0, cameraZoom = 12.0;
        let cameraAngle = 0;
        let mouseX = 0, mouseY = 0, isDragging = false;
        let userRotationX = 0, userRotationY = 0;

        // Vertex Shader
        const vsSource = `#version 300 es
        in vec4 aVertexPosition;
        in vec4 aVertexColor;
        in vec2 aTextureCoord;
        in vec3 aNormal;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        uniform float uTime;

        out vec4 vColor;
        out vec2 vTextureCoord;
        out vec3 vPosition;
        out vec3 vNormal;
        out vec3 vWorldPos;

        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;

            vColor = aVertexColor;
            vTextureCoord = aTextureCoord;
            vPosition = aVertexPosition.xyz;
            vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
            vWorldPos = (uModelViewMatrix * aVertexPosition).xyz;
        }
        `;

        // Fragment Shader
        const fsSource = `#version 300 es
        precision highp float;

        in vec4 vColor;
        in vec2 vTextureCoord;
        in vec3 vPosition;
        in vec3 vNormal;
        in vec3 vWorldPos;

        uniform float uTime;
        uniform float uLightIntensity;
        uniform int uObjectType; // 0: floor, 1: pool, 2: palm, 3: lights

        out vec4 fragColor;

        // Noise function for procedural textures
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);

            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));

            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // Checkerboard pattern for tiles
        vec3 checkerboard(vec2 uv, float scale) {
            vec2 c = floor(uv * scale);
            float checker = mod(c.x + c.y, 2.0);

            // Add subtle noise for variation
            float n = noise(uv * scale * 4.0) * 0.1;
            checker += n;

            // 80s blue/cyan tiles
            vec3 color1 = vec3(0.1, 0.3, 0.8); // Deep blue
            vec3 color2 = vec3(0.0, 0.6, 0.9); // Cyan

            return mix(color1, color2, checker);
        }

        // Water effect for pool
        vec3 waterEffect(vec2 uv) {
            float wave1 = sin(uv.x * 20.0 + uTime * 3.0) * 0.1;
            float wave2 = sin(uv.y * 15.0 + uTime * 2.5) * 0.1;
            float wave3 = sin((uv.x + uv.y) * 25.0 + uTime * 4.0) * 0.05;

            float waves = wave1 + wave2 + wave3;

            // Animated water colors
            vec3 deepWater = vec3(0.0, 0.2, 0.8);
            vec3 shallowWater = vec3(0.0, 0.6, 1.0);
            vec3 highlight = vec3(0.3, 0.8, 1.0);

            float depth = 0.5 + waves;
            vec3 water = mix(deepWater, shallowWater, depth);

            // Add highlights
            float highlight_factor = pow(max(0.0, waves + 0.3), 3.0);
            water = mix(water, highlight, highlight_factor * 0.4);

            return water;
        }

        // Palm tree colors
        vec3 palmColor() {
            if (vPosition.y > 2.0) {
                // Leaves - green with variation
                float leafNoise = noise(vTextureCoord * 10.0 + uTime * 0.1);
                vec3 darkGreen = vec3(0.1, 0.4, 0.1);
                vec3 lightGreen = vec3(0.2, 0.7, 0.2);
                return mix(darkGreen, lightGreen, leafNoise);
            } else {
                // Trunk - brown
                float trunkNoise = noise(vTextureCoord * 20.0);
                vec3 darkBrown = vec3(0.3, 0.2, 0.1);
                vec3 lightBrown = vec3(0.5, 0.3, 0.15);
                return mix(darkBrown, lightBrown, trunkNoise);
            }
        }

        // Neon light effect
        vec3 neonLight() {
            float pulse = sin(uTime * 5.0) * 0.3 + 0.7;

            if (vPosition.x > 0.0) {
                // Pink/Magenta lights
                return vec3(1.0, 0.2, 0.8) * pulse;
            } else {
                // Cyan lights
                return vec3(0.2, 0.8, 1.0) * pulse;
            }
        }

        void main() {
            vec3 normal = normalize(vNormal);
            vec3 color = vec3(1.0);

            // Lighting setup
            vec3 lightDir1 = normalize(vec3(1.0, 2.0, 1.0)); // Main light (pink side)
            vec3 lightDir2 = normalize(vec3(-1.0, 2.0, 1.0)); // Secondary light (cyan side)

            float NdotL1 = max(dot(normal, lightDir1), 0.0);
            float NdotL2 = max(dot(normal, lightDir2), 0.0);

            // Different materials based on object type
            if (uObjectType == 0) {
                // Floor tiles
                color = checkerboard(vTextureCoord, 8.0);

                // Add lighting with colored lights
                vec3 pinkLight = vec3(1.0, 0.3, 0.6) * NdotL1;
                vec3 cyanLight = vec3(0.3, 0.8, 1.0) * NdotL2;
                color = color * (0.3 + (pinkLight + cyanLight) * uLightIntensity);

            } else if (uObjectType == 1) {
                // Pool water
                color = waterEffect(vTextureCoord);

                // Subtle lighting for water
                float waterLight = (NdotL1 + NdotL2) * 0.5;
                color = color * (0.6 + waterLight * uLightIntensity * 0.4);

            } else if (uObjectType == 2) {
                // Palm trees
                color = palmColor();

                // Natural lighting for vegetation
                float palmLight = (NdotL1 + NdotL2) * 0.5;
                color = color * (0.4 + palmLight * uLightIntensity * 0.6);

            } else if (uObjectType == 3) {
                // Neon lights
                color = neonLight();
                color = color * uLightIntensity * 2.0; // Lights are emissive
            }

            // Add atmospheric glow
            float dist = length(vWorldPos);
            float atmosphere = exp(-dist * 0.1);
            vec3 atmosphereColor = vec3(0.1, 0.05, 0.2);
            color = mix(atmosphereColor, color, atmosphere);

            // Add fog for depth
            float fogFactor = exp(-dist * 0.05);
            vec3 fogColor = vec3(0.05, 0.1, 0.3);
            color = mix(fogColor, color, fogFactor);

            fragColor = vec4(color, 1.0);
        }
        `;

        function main() {
            const canvas = document.getElementById('glCanvas');
            gl = canvas.getContext('webgl2');

            if (!gl) {
                alert('WebGL 2.0 não suportado!');
                return;
            }

            // Resize canvas to full window
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);

            // Initialize shaders
            shaderProgram = initShaderProgram(gl, vsSource, fsSource);
            if (!shaderProgram) return;

            programInfo = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                    vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
                    textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
                    normal: gl.getAttribLocation(shaderProgram, 'aNormal'),
                },
                uniformLocations: {
                    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                    normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
                    time: gl.getUniformLocation(shaderProgram, 'uTime'),
                    lightIntensity: gl.getUniformLocation(shaderProgram, 'uLightIntensity'),
                    objectType: gl.getUniformLocation(shaderProgram, 'uObjectType'),
                },
            };

            // Initialize scene geometry
            initScene();

            // Setup controls
            setupControls();

            // Setup mouse interaction
            setupMouseControls(canvas);

            // Start render loop
            requestAnimationFrame(drawScene);
        }

        function resizeCanvas() {
            const canvas = document.getElementById('glCanvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (gl) {
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        }

        function setupControls() {
            const lightSlider = document.getElementById('lightIntensity');
            const speedSlider = document.getElementById('cameraSpeed');
            const heightSlider = document.getElementById('cameraHeight');
            const zoomSlider = document.getElementById('cameraZoom');

            lightSlider.addEventListener('input', (e) => {
                lightIntensity = parseFloat(e.target.value);
                document.getElementById('lightValue').textContent = lightIntensity.toFixed(1);
            });

            speedSlider.addEventListener('input', (e) => {
                cameraSpeed = parseFloat(e.target.value);
                document.getElementById('speedValue').textContent = cameraSpeed.toFixed(1);
            });

            heightSlider.addEventListener('input', (e) => {
                cameraHeight = parseFloat(e.target.value);
                document.getElementById('heightValue').textContent = cameraHeight.toFixed(1);
            });

            zoomSlider.addEventListener('input', (e) => {
                cameraZoom = parseFloat(e.target.value);
                document.getElementById('zoomValue').textContent = zoomSlider.value;
            });
        }

        function setupMouseControls(canvas) {
            canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                mouseX = e.clientX;
                mouseY = e.clientY;
            });

            canvas.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const deltaX = e.clientX - mouseX;
                    const deltaY = e.clientY - mouseY;

                    userRotationY += deltaX * 0.01;
                    userRotationX += deltaY * 0.01;

                    // Limit vertical rotation
                    userRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, userRotationX));

                    mouseX = e.clientX;
                    mouseY = e.clientY;
                }
            });

            canvas.addEventListener('mouseup', () => {
                isDragging = false;
            });

            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                cameraZoom += e.deltaY * 0.01;
                cameraZoom = Math.max(5.0, Math.min(20.0, cameraZoom));
                document.getElementById('cameraZoom').value = cameraZoom;
                document.getElementById('zoomValue').textContent = cameraZoom.toFixed(1);
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
                console.error('Shader link error:', gl.getProgramInfoLog(shaderProgram));
                return null;
            }

            return shaderProgram;
        }

        function loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        function initScene() {
            // Create floor
            sceneBuffers.floor = createFloor();

            // Create pool
            sceneBuffers.pool = createPool();

            // Create palm trees
            sceneBuffers.palms = createPalmTrees();

            // Create neon lights
            sceneBuffers.lights = createNeonLights();
        }

        function createFloor() {
            const size = 20;
            const positions = [];
            const colors = [];
            const textureCoords = [];
            const normals = [];
            const indices = [];

            // Create a grid floor
            for (let x = -size; x <= size; x += 2) {
                for (let z = -size; z <= size; z += 2) {
                    const baseIndex = positions.length / 3;

                    // Vertices for a tile
                    positions.push(x, 0, z);
                    positions.push(x + 2, 0, z);
                    positions.push(x + 2, 0, z + 2);
                    positions.push(x, 0, z + 2);

                    // Colors (will be overridden by shader)
                    for (let i = 0; i < 4; i++) {
                        colors.push(0.5, 0.5, 1.0, 1.0);
                    }

                    // Texture coordinates
                    textureCoords.push(0, 0, 1, 0, 1, 1, 0, 1);

                    // Normals (pointing up)
                    for (let i = 0; i < 4; i++) {
                        normals.push(0, 1, 0);
                    }

                    // Indices for two triangles
                    indices.push(
                        baseIndex, baseIndex + 1, baseIndex + 2,
                        baseIndex, baseIndex + 2, baseIndex + 3
                    );
                }
            }

            return createBuffers(positions, colors, textureCoords, normals, indices);
        }

        function createPool() {
            const positions = [];
            const colors = [];
            const textureCoords = [];
            const normals = [];
            const indices = [];

            // Create a curved pool shape
            const segments = 32;
            const centerX = 0, centerZ = 0;
            const radius = 6;

            // Pool bottom
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const z = centerZ + Math.sin(angle) * radius;

                positions.push(x, -0.5, z);
                colors.push(0.0, 0.5, 1.0, 1.0);
                textureCoords.push((x + radius) / (radius * 2), (z + radius) / (radius * 2));
                normals.push(0, 1, 0);
            }

            // Center point
            positions.push(centerX, -0.5, centerZ);
            colors.push(0.0, 0.5, 1.0, 1.0);
            textureCoords.push(0.5, 0.5);
            normals.push(0, 1, 0);

            const centerIndex = segments + 1;

            // Create triangles
            for (let i = 0; i < segments; i++) {
                indices.push(centerIndex, i, (i + 1) % (segments + 1));
            }

            return createBuffers(positions, colors, textureCoords, normals, indices);
        }

        function createPalmTrees() {
            const trees = [];
            const treePositions = [
                [-8, 0, -8], [8, 0, -8], [-8, 0, 8], [8, 0, 8],
                [-12, 0, 0], [12, 0, 0], [0, 0, -12], [0, 0, 12]
            ];

            treePositions.forEach(pos => {
                trees.push(createSinglePalmTree(pos[0], pos[1], pos[2]));
            });

            return trees;
        }

        function createSinglePalmTree(x, y, z) {
            const positions = [];
            const colors = [];
            const textureCoords = [];
            const normals = [];
            const indices = [];

            // Trunk
            const trunkHeight = 4;
            const trunkRadius = 0.3;
            const trunkSegments = 8;

            for (let i = 0; i <= trunkSegments; i++) {
                const angle = (i / trunkSegments) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                // Bottom
                positions.push(x + cos * trunkRadius, y, z + sin * trunkRadius);
                colors.push(0.4, 0.2, 0.1, 1.0);
                textureCoords.push(i / trunkSegments, 0);
                normals.push(cos, 0, sin);

                // Top
                positions.push(x + cos * trunkRadius, y + trunkHeight, z + sin * trunkRadius);
                colors.push(0.4, 0.2, 0.1, 1.0);
                textureCoords.push(i / trunkSegments, 1);
                normals.push(cos, 0, sin);
            }

            // Trunk indices
            for (let i = 0; i < trunkSegments; i++) {
                const base = i * 2;
                indices.push(
                    base, base + 1, base + 2,
                    base + 1, base + 3, base + 2
                );
            }

            // Simple leaves (as triangular fronds)
            const leafCount = 6;
            const leafLength = 2;

            for (let i = 0; i < leafCount; i++) {
                const angle = (i / leafCount) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const baseIndex = positions.length / 3;

                // Leaf base (at top of trunk)
                positions.push(x, y + trunkHeight, z);
                colors.push(0.2, 0.6, 0.2, 1.0);
                textureCoords.push(0.5, 0.5);
                normals.push(0, 1, 0);

                // Leaf tip
                positions.push(x + cos * leafLength, y + trunkHeight + 0.5, z + sin * leafLength);
                colors.push(0.1, 0.4, 0.1, 1.0);
                textureCoords.push(1, 1);
                normals.push(cos, 0.5, sin);

                // Leaf side
                positions.push(x + cos * leafLength * 0.3, y + trunkHeight, z + sin * leafLength * 0.3);
                colors.push(0.15, 0.5, 0.15, 1.0);
                textureCoords.push(0.3, 0.8);
                normals.push(cos * 0.3, 0.8, sin * 0.3);

                // Leaf triangle
                indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            }

            return createBuffers(positions, colors, textureCoords, normals, indices);
        }

        function createNeonLights() {
            const lights = [];

            // Create vertical neon strips
            const lightPositions = [
                [-15, 0, -5], [15, 0, -5], [-15, 0, 5], [15, 0, 5]
            ];

            lightPositions.forEach((pos, index) => {
                lights.push(createNeonStrip(pos[0], pos[1], pos[2], index % 2));
            });

            return lights;
        }

        function createNeonStrip(x, y, z, colorType) {
            const positions = [];
            const colors = [];
            const textureCoords = [];
            const normals = [];
            const indices = [];

            const height = 6;
            const width = 0.2;

            // Create a vertical rectangle
            const vertices = [
                [x - width, y, z], [x + width, y, z],
                [x + width, y + height, z], [x - width, y + height, z]
            ];

            vertices.forEach((vertex, i) => {
                positions.push(vertex[0], vertex[1], vertex[2]);

                if (colorType === 0) {
                    colors.push(1.0, 0.2, 0.8, 1.0); // Pink/Magenta
                } else {
                    colors.push(0.2, 0.8, 1.0, 1.0); // Cyan
                }

                textureCoords.push(i % 2, Math.floor(i / 2));
                normals.push(0, 0, 1);
            });

            indices.push(0, 1, 2, 0, 2, 3);

            return createBuffers(positions, colors, textureCoords, normals, indices);
        }

        function createBuffers(positions, colors, textureCoords, normals, indices) {
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            const colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

            const textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

            const normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

            return {
                position: positionBuffer,
                color: colorBuffer,
                textureCoord: textureCoordBuffer,
                normal: normalBuffer,
                indices: indexBuffer,
                indexCount: indices.length,
            };
        }

        function drawScene() {
            const currentTime = performance.now() * 0.001;

            // Clear the scene
            gl.clearColor(0.05, 0.05, 0.2, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // Create projection matrix
            const canvas = gl.canvas;
            const fieldOfView = 45 * Math.PI / 180;
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const zNear = 0.1;
            const zFar = 100.0;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

            // Camera position with user interaction
            cameraAngle += cameraSpeed * 0.01;

            const radius = cameraZoom;
            const cameraX = Math.cos(cameraAngle + userRotationY) * radius;
            const cameraZ = Math.sin(cameraAngle + userRotationY) * radius;
            const cameraY = cameraHeight + userRotationX * 3;

            // Create view matrix
            const modelViewMatrix = mat4.create();
            mat4.lookAt(modelViewMatrix,
                        [cameraX, cameraY, cameraZ],
                        [0, 0, 0],
                        [0, 1, 0]
            );

            // Normal matrix for lighting
            const normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelViewMatrix);
            mat4.transpose(normalMatrix, normalMatrix);

            // Use shader program
            gl.useProgram(programInfo.program);

            // Set global uniforms
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
            gl.uniform1f(programInfo.uniformLocations.time, currentTime);
            gl.uniform1f(programInfo.uniformLocations.lightIntensity, lightIntensity);

            // Draw floor
            gl.uniform1i(programInfo.uniformLocations.objectType, 0);
            drawObject(sceneBuffers.floor);

            // Draw pool
            gl.uniform1i(programInfo.uniformLocations.objectType, 1);
            drawObject(sceneBuffers.pool);

            // Draw palm trees
            gl.uniform1i(programInfo.uniformLocations.objectType, 2);
            sceneBuffers.palms.forEach(palm => {
                drawObject(palm);
            });

            // Draw neon lights
            gl.uniform1i(programInfo.uniformLocations.objectType, 3);
            sceneBuffers.lights.forEach(light => {
                drawObject(light);
            });

            requestAnimationFrame(drawScene);
        }

        function drawObject(buffers) {
            // Position attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            // Color attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

            // Texture coordinate attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
            gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

            // Normal attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
            gl.vertexAttribPointer(programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.normal);

            // Draw
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_INT, 0);
        }

        // Matrix library functions
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

                out[0] = f / aspect;  out[1] = 0;  out[2] = 0;   out[3] = 0;
                out[4] = 0;           out[5] = f;  out[6] = 0;   out[7] = 0;
                out[8] = 0;           out[9] = 0;  out[10] = (far + near) * nf; out[11] = -1;
                out[12] = 0;          out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
            },

            lookAt: function(out, eye, center, up) {
                const eyex = eye[0], eyey = eye[1], eyez = eye[2];
                const upx = up[0], upy = up[1], upz = up[2];
                const centerx = center[0], centery = center[1], centerz = center[2];

                if (Math.abs(eyex - centerx) < 0.000001 &&
                    Math.abs(eyey - centery) < 0.000001 &&
                    Math.abs(eyez - centerz) < 0.000001) {
                    return mat4.identity(out);
                    }

                    let z0 = eyex - centerx, z1 = eyey - centery, z2 = eyez - centerz;
                let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
                z0 *= len; z1 *= len; z2 *= len;

                let x0 = upy * z2 - upz * z1;
                let x1 = upz * z0 - upx * z2;
                let x2 = upx * z1 - upy * z0;
                len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
                if (!len) {
                    x0 = 0; x1 = 0; x2 = 0;
                } else {
                    len = 1 / len;
                    x0 *= len; x1 *= len; x2 *= len;
                }

                let y0 = z1 * x2 - z2 * x1;
                let y1 = z2 * x0 - z0 * x2;
                let y2 = z0 * x1 - z1 * x0;

                out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
                out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
                out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
                out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
                out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
                out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
                out[15] = 1;

                return out;
            },

            invert: function(out, a) {
                const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
                const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
                const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
                const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

                const b00 = a00 * a11 - a01 * a10;
                const b01 = a00 * a12 - a02 * a10;
                const b02 = a00 * a13 - a03 * a10;
                const b03 = a01 * a12 - a02 * a11;
                const b04 = a01 * a13 - a03 * a11;
                const b05 = a02 * a13 - a03 * a12;
                const b06 = a20 * a31 - a21 * a30;
                const b07 = a20 * a32 - a22 * a30;
                const b08 = a20 * a33 - a23 * a30;
                const b09 = a21 * a32 - a22 * a31;
                const b10 = a21 * a33 - a23 * a31;
                const b11 = a22 * a33 - a23 * a32;

                let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

                if (!det) return null;
                det = 1.0 / det;

                out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
                out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
                out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
                out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
                out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
                out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
                out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
                out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
                out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
                out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

                return out;
            },

            transpose: function(out, a) {
                if (out === a) {
                    const a01 = a[1], a02 = a[2], a03 = a[3];
                    const a12 = a[6], a13 = a[7];
                    const a23 = a[11];

                    out[1] = a[4];
                    out[2] = a[8];
                    out[3] = a[12];
                    out[4] = a01;
                    out[6] = a[9];
                    out[7] = a[13];
                    out[8] = a02;
                    out[9] = a12;
                    out[11] = a[14];
                    out[12] = a03;
                    out[13] = a13;
                    out[14] = a23;
                } else {
                    out[0] = a[0];
                    out[1] = a[4];
                    out[2] = a[8];
                    out[3] = a[12];
                    out[4] = a[1];
                    out[5] = a[5];
                    out[6] = a[9];
                    out[7] = a[13];
                    out[8] = a[2];
                    out[9] = a[6];
                    out[10] = a[10];
                    out[11] = a[14];
                    out[12] = a[3];
                    out[13] = a[7];
                    out[14] = a[11];
                    out[15] = a[15];
                }

                return out;
            },

            identity: function(out) {
                out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
                out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
                out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
                out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
                return out;
            }
        };

        // Initialize when page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', main);
        } else {
            main();
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'r':
                    // Reset camera
                    userRotationX = 0;
                    userRotationY = 0;
                    cameraAngle = 0;
                    break;
                case ' ':
                    e.preventDefault();
                    // Toggle camera movement
                    cameraSpeed = cameraSpeed > 0 ? 0 : 1.0;
                    document.getElementById('cameraSpeed').value = cameraSpeed;
                    document.getElementById('speedValue').textContent = cameraSpeed.toFixed(1);
                    break;
            }
        });

        console.log('🌴 Vaporwave Scene loaded! Use mouse to rotate, scroll to zoom.');
