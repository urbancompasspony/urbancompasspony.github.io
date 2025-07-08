        // Vertex shader (processa cada vértice)
        const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        attribute vec2 aTextureCoord;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;
        varying vec2 vTextureCoord;
        varying vec3 vPosition;

        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
            vTextureCoord = aTextureCoord;
            vPosition = aVertexPosition.xyz;
        }
        `;

        // Fragment shader (processa cada pixel)
        const fsSource = `
        precision mediump float;

        varying lowp vec4 vColor;
        varying vec2 vTextureCoord;
        varying vec3 vPosition;

        uniform float uTime;
        uniform int uTextureType;
        uniform bool uBenchmarkMode;

        // Função de ruído pseudo-aleatório
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // Ruído suave
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) +
            (c - a) * u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
        }

        // Ruído fractal browniano (FBM)
        float fbm(vec2 st, int octaves) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;

            for (int i = 0; i < 8; i++) {
                if (i >= octaves) break;
                value += amplitude * noise(st * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }

        // Padrão xadrez
        vec3 checkerboard(vec2 uv) {
            float scale = uBenchmarkMode ? 64.0 : 8.0;
            vec2 c = abs(floor(uv * scale));
            float checker = mod(c.x + c.y, 2.0);

            if (uBenchmarkMode) {
                // Múltiplas camadas de detalhes
                float detail1 = fbm(uv * 128.0, 6) * 0.3;
                float detail2 = fbm(uv * 256.0, 4) * 0.15;
                float detail3 = fbm(uv * 512.0, 3) * 0.1;
                checker += detail1 + detail2 + detail3;

                // Bordas suaves com anti-aliasing
                vec2 grid = fract(uv * scale);
                float border = min(min(grid.x, 1.0 - grid.x), min(grid.y, 1.0 - grid.y));
                border = smoothstep(0.0, 0.02, border);

                // Efeito de distorção temporal
                float distortion = sin(uv.x * 100.0 + uTime * 3.0) * sin(uv.y * 100.0 + uTime * 2.0) * 0.05;
                checker += distortion;

                checker *= border;
            }

            return vec3(checker);
        }

        // Padrão de ondas
        vec3 waves(vec2 uv) {
            float scale = uBenchmarkMode ? 80.0 : 20.0;

            float wave1 = sin(uv.x * scale + uTime * 2.0) * 0.5 + 0.5;
            float wave2 = sin(uv.y * (scale * 0.75) + uTime * 1.5) * 0.5 + 0.5;

            if (uBenchmarkMode) {
                // Múltiplas camadas de ondas complexas
                for (int i = 1; i < 16; i++) {
                    float fi = float(i);
                    float freq = fi * 0.5;
                    float amp = 0.3 / fi;

                    wave1 += sin(uv.x * scale * freq + uTime * (2.0 + fi * 0.3)) * amp;
                    wave2 += sin(uv.y * scale * freq + uTime * (1.5 + fi * 0.2)) * amp;

                    // Ondas diagonais
                    wave1 += sin((uv.x + uv.y) * scale * freq * 0.7 + uTime * fi) * (amp * 0.5);
                    wave2 += sin((uv.x - uv.y) * scale * freq * 0.7 + uTime * fi * 1.1) * (amp * 0.5);
                }

                // Interferência complexa
                float interference = sin(uv.x * 200.0 + uTime * 5.0) * sin(uv.y * 150.0 + uTime * 3.0) * 0.1;
                wave1 += interference;
                wave2 += interference;

                wave1 /= 16.0;
                wave2 /= 16.0;
            }

            float combined = wave1 * wave2;

            if (uBenchmarkMode) {
                // Cores mais complexas baseadas em fase
                float phase = atan(wave2, wave1);
                return vec3(
                    combined,
                    combined * 0.5 + sin(phase * 3.0) * 0.3,
                            1.0 - combined + cos(phase * 5.0) * 0.2
                );
            }

            return vec3(combined, combined * 0.5, 1.0 - combined);
        }

        // Padrão de círculos
        vec3 circles(vec2 uv) {
            vec2 center = vec2(0.5);
            float dist = distance(uv, center);
            float frequency = uBenchmarkMode ? 120.0 : 30.0;

            float circle = sin(dist * frequency - uTime * 3.0) * 0.5 + 0.5;

            if (uBenchmarkMode) {
                // Múltiplos centros de círculos animados
                for (int i = 0; i < 8; i++) {
                    float fi = float(i);
                    vec2 offset = vec2(
                        sin(uTime * 0.7 + fi * 2.0) * 0.4,
                                       cos(uTime * 0.5 + fi * 1.5) * 0.4
                    );
                    float d = distance(uv, center + offset);
                    circle += sin(d * frequency * 0.3 - uTime * (4.0 + fi)) * (0.4 / (fi + 1.0));

                    // Círculos secundários
                    circle += sin(d * frequency * 0.7 - uTime * (2.0 + fi * 0.5)) * (0.2 / (fi + 1.0));
                }

                // Ondas radiais complexas
                float radial1 = sin(dist * 80.0 - uTime * 6.0) * 0.15;
                float radial2 = sin(dist * 160.0 - uTime * 8.0) * 0.1;
                float radial3 = sin(dist * 320.0 - uTime * 12.0) * 0.05;

                circle += radial1 + radial2 + radial3;

                // Textura de ruído para mais detalhes
                circle += fbm(uv * 50.0 + vec2(uTime * 0.5), 4) * 0.2;

                circle /= 6.0;
            }

            if (uBenchmarkMode) {
                // Cores iridescentes baseadas na distância
                float hue = dist * 10.0 + uTime;
                return vec3(
                    circle + sin(hue) * 0.3,
                            circle * 0.7 + sin(hue + 2.0) * 0.3,
                            circle * 0.5 + sin(hue + 4.0) * 0.3
                );
            }

            return vec3(circle, 0.5, 1.0 - circle);
        }

        // Mármore procedural
        vec3 marble(vec2 uv) {
            int octaves = uBenchmarkMode ? 8 : 3;
            float scale = uBenchmarkMode ? 25.0 : 5.0;

            float n = fbm(uv * scale, octaves);
            float marble = sin((uv.x + n) * 30.0);
            marble = marble * 0.5 + 0.5;

            if (uBenchmarkMode) {
                // Múltiplas camadas de veios
                float vein1 = sin((uv.y + n * 3.0) * 25.0) * 0.4;
                float vein2 = sin((uv.x + uv.y + n * 2.0) * 40.0) * 0.3;
                float vein3 = sin((uv.x - uv.y + n * 1.5) * 60.0) * 0.2;
                float vein4 = sin((uv.x * 2.0 + uv.y + n) * 80.0) * 0.15;

                marble += vein1 + vein2 + vein3 + vein4;

                // Turbulência adicional
                float turbulence = fbm(uv * 100.0 + vec2(uTime * 0.1), 4) * 0.1;
                marble += turbulence;

                // Variações de cor baseadas na posição
                float colorVar = fbm(uv * 15.0, 3);

                marble = clamp(marble, 0.0, 1.0);

                // Cores mais realistas do mármore
                return vec3(
                    marble * (0.9 + colorVar * 0.1),
                            marble * (0.85 + colorVar * 0.15),
                            marble * (0.8 + colorVar * 0.2)
                );
            }

            return vec3(marble * 0.9, marble * 0.8, marble * 0.7);
        }

        // Madeira procedural
        vec3 wood(vec2 uv) {
            float complexity = uBenchmarkMode ? 40.0 : 10.0;
            float scale = uBenchmarkMode ? 150.0 : 40.0;

            float rings = sin(distance(uv, vec2(0.5)) * scale + fbm(uv * complexity, 6) * 6.0);
            rings = rings * 0.5 + 0.5;

            if (uBenchmarkMode) {
                // Grãos da madeira em múltiplas escalas
                float grain1 = fbm(vec2(uv.x * 200.0, uv.y * 40.0), 6) * 0.15;
                float grain2 = fbm(vec2(uv.x * 400.0, uv.y * 80.0), 4) * 0.1;
                float grain3 = fbm(vec2(uv.x * 800.0, uv.y * 20.0), 3) * 0.05;

                rings += grain1 + grain2 + grain3;

                // Múltiplos nós na madeira
                for (int i = 0; i < 6; i++) {
                    float fi = float(i);
                    vec2 knotPos = vec2(
                        0.2 + fi * 0.15,
                        0.3 + sin(fi * 2.0) * 0.4
                    );
                    float knotDist = distance(uv, knotPos);
                    float knot = smoothstep(0.15, 0.0, knotDist) * 0.4;

                    // Turbulência ao redor do nó
                    float knotTurb = fbm(uv * 50.0 + knotPos * 100.0, 4) * knot * 0.5;
                    rings -= knot - knotTurb;
                }

                // Anéis irregulares
                float irregularity = fbm(uv * 30.0 + vec2(uTime * 0.02), 4) * 0.1;
                rings += irregularity;

                rings = clamp(rings, 0.0, 1.0);

                // Cores mais variadas da madeira
                float colorShift = fbm(uv * 20.0, 3);
                return vec3(
                    rings * (0.7 + colorShift * 0.2),
                            rings * (0.4 + colorShift * 0.3),
                            rings * (0.15 + colorShift * 0.15)
                );
            }

            return vec3(rings * 0.8, rings * 0.5, rings * 0.2);
        }

        // Fogo procedural
        vec3 fire(vec2 uv) {
            float intensity = uBenchmarkMode ? 5.0 : 1.0;
            int octaves = uBenchmarkMode ? 8 : 3;

            // Chama principal
            float flame = fbm(vec2(uv.x * 12.0, uv.y * 24.0 - uTime * 6.0), octaves);
            flame = pow(flame * intensity, 2.5) * (1.0 - uv.y * 0.8);

            if (uBenchmarkMode) {
                // Múltiplas camadas de fogo em diferentes escalas
                float flame2 = fbm(vec2(uv.x * 18.0, uv.y * 30.0 - uTime * 8.0), 6) * 0.7;
                float flame3 = fbm(vec2(uv.x * 24.0, uv.y * 36.0 - uTime * 10.0), 5) * 0.5;
                float flame4 = fbm(vec2(uv.x * 36.0, uv.y * 48.0 - uTime * 12.0), 4) * 0.3;
                float flame5 = fbm(vec2(uv.x * 48.0, uv.y * 60.0 - uTime * 15.0), 3) * 0.2;

                flame += flame2 + flame3 + flame4 + flame5;

                // Turbulência lateral
                float turbulence = fbm(vec2(uv.x * 60.0 + uTime * 2.0, uv.y * 40.0), 4) * 0.15;
                flame += turbulence;

                // Efeito de cintilação
                float flicker = sin(uTime * 20.0 + uv.x * 50.0) * sin(uTime * 15.0 + uv.y * 30.0) * 0.05;
                flame += flicker;

                // Gradiente de intensidade mais complexo
                float gradient = pow(1.0 - uv.y, 1.5);
                flame *= gradient;

                // Cores ultra-realistas do fogo
                float temperature = flame + uv.y * 0.3;

                // Núcleo azul-branco (muito quente)
                float coreHeat = smoothstep(0.8, 1.0, temperature);

                // Chama laranja-vermelha
                float mainFlame = smoothstep(0.3, 0.8, temperature);

                // Bordas vermelhas escuras
                float edges = smoothstep(0.1, 0.4, temperature);

                vec3 blue = vec3(0.4, 0.6, 1.0);
                vec3 white = vec3(1.0, 1.0, 0.9);
                vec3 yellow = vec3(1.0, 0.9, 0.3);
                vec3 orange = vec3(1.0, 0.5, 0.1);
                vec3 red = vec3(0.8, 0.2, 0.0);
                vec3 darkRed = vec3(0.3, 0.0, 0.0);

                // Mistura complexa de cores
                vec3 color = mix(darkRed, red, edges);
                color = mix(color, orange, mainFlame * 0.8);
                color = mix(color, yellow, mainFlame * temperature);
                color = mix(color, white, coreHeat * 0.7);
                color = mix(color, blue, coreHeat * temperature * 0.3);

                return color * flame;
            }

            return vec3(flame, flame * 0.5, flame * 0.1);
        }

        void main() {
            vec3 color = vec3(1.0);

            if (uTextureType == 0) {
                color = vColor.rgb;
            } else if (uTextureType == 1) {
                color = checkerboard(vTextureCoord);
            } else if (uTextureType == 2) {
                color = waves(vTextureCoord);
            } else if (uTextureType == 3) {
                color = circles(vTextureCoord);
            } else if (uTextureType == 4) {
                color = marble(vTextureCoord);
            } else if (uTextureType == 5) {
                color = wood(vTextureCoord);
            } else if (uTextureType == 6) {
                color = fire(vTextureCoord);
            }

            gl_FragColor = vec4(color, 1.0);
        }
        `;

        let gl;
        let shaderProgram;
        let programInfo;
        let buffers;
        let rotationX = 0;
        let rotationY = 0;
        let speedX = 1;
        let speedY = 1;
        let wireframe = false;
        let textureType = 0;
        let benchmarkMode = false;
        let scale = 1.0;

        // Variáveis para FPS
        let fps = 0;
        let frameCount = 0;
        let lastTime = 0;
        let fpsUpdateTime = 0;
        let frameTimeSum = 0;

        function main() {
            const canvas = document.getElementById('glCanvas');
            gl = canvas.getContext('webgl');

            if (!gl) {
                alert('WebGL não suportado pelo seu navegador');
                return;
            }

            // Inicializar shaders
            shaderProgram = initShaderProgram(gl, vsSource, fsSource);
            if (!shaderProgram) {
                return;
            }

            programInfo = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                    vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
                    textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
                },
                uniformLocations: {
                    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                    time: gl.getUniformLocation(shaderProgram, 'uTime'),
                    textureType: gl.getUniformLocation(shaderProgram, 'uTextureType'),
                    benchmarkMode: gl.getUniformLocation(shaderProgram, 'uBenchmarkMode'),
                },
            };

            buffers = initBuffers(gl);

            // Configurar controles
            document.getElementById('speedX').addEventListener('input', (e) => {
                speedX = parseFloat(e.target.value);
            });

            document.getElementById('speedY').addEventListener('input', (e) => {
                speedY = parseFloat(e.target.value);
            });

            document.getElementById('wireframe').addEventListener('change', (e) => {
                wireframe = e.target.checked;
            });

            document.getElementById('textureType').addEventListener('change', (e) => {
                textureType = parseInt(e.target.value);
            });

            document.getElementById('benchmark').addEventListener('change', (e) => {
                benchmarkMode = e.target.checked;
                buffers = initBuffers(gl);
            });

            document.getElementById('scale').addEventListener('input', (e) => {
                scale = parseFloat(e.target.value);
                document.getElementById('scaleValue').textContent = scale.toFixed(1);
            });

            // Iniciar o loop de renderização
            requestAnimationFrame(drawScene);
        }

        function initShaderProgram(gl, vsSource, fsSource) {
            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

            if (!vertexShader || !fragmentShader) {
                return null;
            }

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                console.error('Erro ao inicializar shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }

            return shaderProgram;
        }

        function loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Erro ao compilar shader: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        function initBuffers(gl) {
            const subdivisions = benchmarkMode ? 64 : 1; // 64x mais vértices no modo benchmark

            const positions = [];
            const colors = [];
            const textureCoords = [];
            const indices = [];

            const faceColors = [
                [1.0, 0.0, 0.0, 1.0], // Vermelho
                [0.0, 1.0, 0.0, 1.0], // Verde
                [0.0, 0.0, 1.0, 1.0], // Azul
                [1.0, 1.0, 0.0, 1.0], // Amarelo
                [1.0, 0.0, 1.0, 1.0], // Magenta
                [0.0, 1.0, 1.0, 1.0], // Ciano
            ];

            const faces = [
                { normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0], offset: [0, 0, 1] },
                { normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0], offset: [0, 0, -1] },
                { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1], offset: [0, 1, 0] },
                { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1], offset: [0, -1, 0] },
                { normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0], offset: [1, 0, 0] },
                { normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0], offset: [-1, 0, 0] },
            ];

            let vertexCount = 0;

            faces.forEach((face, faceIndex) => {
                const color = faceColors[faceIndex];

                for (let i = 0; i <= subdivisions; i++) {
                    for (let j = 0; j <= subdivisions; j++) {
                        const u = i / subdivisions;
                        const v = j / subdivisions;

                        const x = face.offset[0] + face.right[0] * (u - 0.5) * 2 + face.up[0] * (v - 0.5) * 2;
                        const y = face.offset[1] + face.right[1] * (u - 0.5) * 2 + face.up[1] * (v - 0.5) * 2;
                        const z = face.offset[2] + face.right[2] * (u - 0.5) * 2 + face.up[2] * (v - 0.5) * 2;

                        positions.push(x, y, z);
                        colors.push(...color);
                        textureCoords.push(u, v);

                        if (i < subdivisions && j < subdivisions) {
                            const current = vertexCount + i * (subdivisions + 1) + j;
                            const next = current + 1;
                            const below = current + (subdivisions + 1);
                            const belowNext = below + 1;

                            indices.push(current, next, below);
                            indices.push(next, belowNext, below);
                        }
                    }
                }

                vertexCount += (subdivisions + 1) * (subdivisions + 1);
            });

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

            return {
                position: positionBuffer,
                color: colorBuffer,
                textureCoord: textureCoordBuffer,
                indices: indexBuffer,
                indexCount: indices.length,
            };
        }

        function drawScene() {
            const currentTime = performance.now();

            // Calcular FPS
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

                    // Atualizar informações de geometria (verificar se elementos existem)
                    const vertexCountEl = document.getElementById('vertexCount');
                    const triangleCountEl = document.getElementById('triangleCount');

                    if (vertexCountEl && triangleCountEl) {
                        const vertexCount = buffers.indexCount;
                        const triangleCount = Math.floor(vertexCount / 3);
                        vertexCountEl.textContent = vertexCount.toLocaleString();
                        triangleCountEl.textContent = triangleCount.toLocaleString();
                    }

                    frameTimeSum = 0;
                    frameCount = 0;
                    fpsUpdateTime = currentTime;
                }
            }
            lastTime = currentTime;

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const fieldOfView = 45 * Math.PI / 180;
            const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
            const zNear = 0.1;
            const zFar = 100.0;
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

            const modelViewMatrix = mat4.create();
            mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
            mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
            mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
            mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
            gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

            gl.useProgram(programInfo.program);

            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.uniform1f(programInfo.uniformLocations.time, currentTime * 0.001);
            gl.uniform1i(programInfo.uniformLocations.textureType, textureType);
            gl.uniform1i(programInfo.uniformLocations.benchmarkMode, benchmarkMode);

            const indexCount = buffers.indexCount;
            if (wireframe) {
                for (let i = 0; i < indexCount; i += 3) {
                    gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, i * 2);
                }
            } else {
                gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
            }

            rotationX += speedX * 0.01;
            rotationY += speedY * 0.01;

            requestAnimationFrame(drawScene);
        }

        // Biblioteca matemática corrigida para matrizes 4x4
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

                out[0] = f / aspect;
                out[1] = 0;
                out[2] = 0;
                out[3] = 0;
                out[4] = 0;
                out[5] = f;
                out[6] = 0;
                out[7] = 0;
                out[8] = 0;
                out[9] = 0;
                out[10] = (far + near) * nf;
                out[11] = -1;
                out[12] = 0;
                out[13] = 0;
                out[14] = (2 * far * near) * nf;
                out[15] = 0;
            },

            translate: function(out, a, v) {
                // Copiar matriz original primeiro
                if (out !== a) {
                    for (let i = 0; i < 16; i++) {
                        out[i] = a[i];
                    }
                }

                const x = v[0], y = v[1], z = v[2];
                out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
                out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
                out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
                out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
            },

            rotate: function(out, a, rad, axis) {
                // Copiar matriz original primeiro
                if (out !== a) {
                    for (let i = 0; i < 16; i++) {
                        out[i] = a[i];
                    }
                }

                const x = axis[0], y = axis[1], z = axis[2];
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const t = 1 - c;

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

                // Manter a última linha intacta (posição)
                if (out !== a) {
                    out[12] = a[12];
                    out[13] = a[13];
                    out[14] = a[14];
                    out[15] = a[15];
                }
            },
            scale: function(out, a, v) {
                // Copiar matriz original primeiro
                if (out !== a) {
                    for (let i = 0; i < 16; i++) {
                        out[i] = a[i];
                    }
                }

                const x = v[0], y = v[1], z = v[2];
                out[0] = a[0] * x;
                out[1] = a[1] * x;
                out[2] = a[2] * x;
                out[3] = a[3] * x;
                out[4] = a[4] * y;
                out[5] = a[5] * y;
                out[6] = a[6] * y;
                out[7] = a[7] * y;
                out[8] = a[8] * z;
                out[9] = a[9] * z;
                out[10] = a[10] * z;
                out[11] = a[11] * z;
            }
        };

        // Inicializar quando a página carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', main);
        } else {
            main();
        }
