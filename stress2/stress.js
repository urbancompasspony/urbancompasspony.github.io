// benchmark.js - WebGL 2.0 Ultra Benchmark (COMPLETO com todas as funcionalidades prometidas)

// === SHADERS COMPLETOS ===

// Vertex Shader WebGL 2.0 (GLSL ES 3.00)
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
    // Aplicar transformações de instância
    vec4 instancePos = aVertexPosition;
    instancePos.xyz *= aInstanceScale;

    // Rotação da instância
    instancePos = rotationMatrix(aInstanceRotation + uTime * 0.1) * instancePos;

    // Translação da instância
    instancePos.xyz += aInstanceOffset;

    gl_Position = uProjectionMatrix * uModelViewMatrix * instancePos;

    vColor = aVertexColor;
    vTextureCoord = aTextureCoord;
    vPosition = aVertexPosition.xyz;
    vWorldPos = instancePos.xyz;
    vInstanceData = vec3(aInstanceScale, length(aInstanceOffset), float(gl_InstanceID));
}
`;

// Fragment Shader WebGL 2.0 (GLSL ES 3.00) - ULTRA SOFISTICADO COMPLETO
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

// Hash functions for better random
vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
}

float hash13(vec3 p3) {
    p3 = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

// 4D Noise for ultra-complex effects
float noise4D(vec4 p) {
    vec4 i = floor(p);
    vec4 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float n = hash13(i.xyz) +
    hash13(i.xyz + vec3(1,0,0)) * f.x +
    hash13(i.xyz + vec3(0,1,0)) * f.y +
    hash13(i.xyz + vec3(0,0,1)) * f.z +
    hash13(i.xyz + vec3(1,1,0)) * f.x * f.y +
    hash13(i.xyz + vec3(1,0,1)) * f.x * f.z +
    hash13(i.xyz + vec3(0,1,1)) * f.y * f.z +
    hash13(i.xyz + vec3(1,1,1)) * f.x * f.y * f.z;

    return n * f.w + hash13(i.xyz + vec3(i.w + 1.0)) * (1.0 - f.w);
}

// Advanced FBM with domain warping
float fbm4D(vec4 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 16; i++) {
        if (i >= octaves) break;

        // Domain warping
        vec4 q = p * frequency + vec4(uTime * 0.1);
        vec4 r = vec4(
            noise4D(q + vec4(1.7, 9.2, 5.3, 2.1)),
                      noise4D(q + vec4(8.3, 2.8, 6.1, 1.7)),
                      noise4D(q + vec4(3.1, 4.7, 9.5, 3.3)),
                      noise4D(q + vec4(5.5, 1.2, 7.8, 4.2))
        );

        value += amplitude * noise4D(p * frequency + r * 0.5);
        amplitude *= 0.5;
        frequency *= 2.07; // Slightly irregular for more natural look
    }
    return value;
}

// Voronoi noise
vec2 voronoi(vec2 uv, float scale) {
    vec2 g = floor(uv * scale);
    vec2 f = fract(uv * scale);

    float minDist = 8.0;
    vec2 minPoint;

    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 neighbor = vec2(x, y);
            vec2 point = hash33(vec3(g + neighbor, uTime * 0.1)).xy;
            point = 0.5 + 0.5 * sin(uTime * 2.0 + 6.2831 * point);

            float dist = length(neighbor + point - f);
            if (dist < minDist) {
                minDist = dist;
                minPoint = point;
            }
        }
    }

    return vec2(minDist, hash13(vec3(minPoint, uTime * 0.1)));
}

// Ultra-detailed checkerboard
vec3 checkerboard(vec2 uv) {
    float scale = (uBenchmarkMode >= 1) ? 128.0 : 16.0;

    vec2 c = floor(uv * scale);
    float checker = mod(c.x + c.y, 2.0);

    if (uBenchmarkMode >= 1) {
        // Multiple detail layers
        float detail1 = fbm4D(vec4(uv * 256.0, uTime * 0.1, vInstanceData.z * 0.01), 8) * 0.4;
        float detail2 = fbm4D(vec4(uv * 512.0, uTime * 0.05, vInstanceData.y * 0.02), 6) * 0.2;
        float detail3 = fbm4D(vec4(uv * 1024.0, uTime * 0.02, vInstanceData.x * 0.03), 4) * 0.1;

        checker += detail1 + detail2 + detail3;

        // Anti-aliased borders
        vec2 grid = fract(uv * scale);
        float border = min(min(grid.x, 1.0 - grid.x), min(grid.y, 1.0 - grid.y));
        border = smoothstep(0.0, 0.01, border);

        // Temporal distortion
        float distortion = sin(uv.x * 200.0 + uTime * 5.0) * sin(uv.y * 200.0 + uTime * 3.0) * 0.1;
        checker += distortion;

        checker *= border;
    }

    return vec3(checker);
}

// Complex wave patterns
vec3 waves(vec2 uv) {
    float scale = (uBenchmarkMode >= 1) ? 120.0 : 30.0;
    int layers = (uBenchmarkMode >= 2) ? 32 : 8;

    float wave1 = sin(uv.x * scale + uTime * 3.0);
    float wave2 = sin(uv.y * scale * 0.8 + uTime * 2.0);

    if (uBenchmarkMode >= 1) {
        for (int i = 1; i < 32; i++) {
            if (i >= layers) break;

            float fi = float(i);
            float freq = fi * 0.3;
            float amp = 0.4 / fi;

            wave1 += sin(uv.x * scale * freq + uTime * (3.0 + fi * 0.2)) * amp;
            wave2 += sin(uv.y * scale * freq + uTime * (2.0 + fi * 0.15)) * amp;

            // Diagonal interference
            wave1 += sin((uv.x + uv.y) * scale * freq * 0.7 + uTime * fi * 0.5) * (amp * 0.6);
            wave2 += sin((uv.x - uv.y) * scale * freq * 0.7 + uTime * fi * 0.3) * (amp * 0.6);

            // Radial waves
            float rad = length(uv - 0.5);
            wave1 += sin(rad * scale * freq + uTime * fi) * (amp * 0.3);
            wave2 += cos(rad * scale * freq + uTime * fi * 1.1) * (amp * 0.3);
        }
    }

    float combined = (wave1 + 1.0) * (wave2 + 1.0) * 0.25;

    if (uBenchmarkMode >= 2) {
        // Phase-based coloring
        float phase = atan(wave2, wave1);
        return vec3(
            combined + sin(phase * 5.0 + uTime) * 0.3,
                    combined * 0.7 + sin(phase * 3.0 + uTime * 1.2) * 0.3,
                    1.0 - combined + cos(phase * 7.0 + uTime * 0.8) * 0.3
        );
    }

    return vec3(combined, combined * 0.6, 1.0 - combined);
}

// Fractal circles
vec3 circles(vec2 uv) {
    vec2 center = vec2(0.5);
    float dist = distance(uv, center);
    float frequency = (uBenchmarkMode >= 1) ? 200.0 : 50.0;

    float circle = sin(dist * frequency - uTime * 5.0);

    if (uBenchmarkMode >= 1) {
        // Multiple animated centers
        for (int i = 0; i < 16; i++) {
            if (i >= (uBenchmarkMode >= 2 ? 16 : 8)) break;

            float fi = float(i);
            vec2 offset = vec2(
                sin(uTime * 0.7 + fi * 2.0) * 0.5,
                               cos(uTime * 0.5 + fi * 1.5) * 0.5
            );

            float d = distance(uv, center + offset);
            circle += sin(d * frequency * 0.4 - uTime * (6.0 + fi)) * (0.5 / (fi + 1.0));

            // Secondary ripples
            circle += sin(d * frequency * 0.8 - uTime * (3.0 + fi * 0.5)) * (0.3 / (fi + 1.0));
            circle += cos(d * frequency * 1.2 - uTime * (4.0 + fi * 0.3)) * (0.2 / (fi + 1.0));
        }

        // Complex radial waves
        for (int j = 0; j < 8; j++) {
            float scale = 100.0 + float(j) * 80.0;
            circle += sin(dist * scale - uTime * (8.0 + float(j) * 2.0)) * (0.15 / (float(j) + 1.0));
        }

        // 4D noise overlay
        circle += fbm4D(vec4(uv * 80.0, uTime * 0.3, vInstanceData.z * 0.1), 6) * 0.3;
    }

    if (uBenchmarkMode >= 2) {
        // Iridescent coloring
        float hue = dist * 15.0 + uTime * 2.0 + vInstanceData.y * 0.1;
        return vec3(
            circle + sin(hue) * 0.4,
                    circle * 0.8 + sin(hue + 2.094) * 0.4,
                    circle * 0.6 + sin(hue + 4.188) * 0.4
        );
    }

    return vec3(circle * 0.5 + 0.5, 0.6, 1.0 - (circle * 0.5 + 0.5));
}

// 3D Marble with domain warping
vec3 marble(vec2 uv) {
    int octaves = (uBenchmarkMode >= 1) ? 12 : 4;
    float scale = (uBenchmarkMode >= 1) ? 40.0 : 8.0;

    vec4 p = vec4(uv * scale, uTime * 0.05, vInstanceData.x * 0.02);
    float n = fbm4D(p, octaves);

    float marble = sin((uv.x + n * 2.0) * 50.0);

    if (uBenchmarkMode >= 1) {
        // Multiple vein systems
        float vein1 = sin((uv.y + n * 4.0) * 40.0) * 0.5;
        float vein2 = sin((uv.x + uv.y + n * 3.0) * 60.0) * 0.4;
        float vein3 = sin((uv.x - uv.y + n * 2.0) * 80.0) * 0.3;
        float vein4 = sin((uv.x * 2.0 + uv.y + n) * 120.0) * 0.2;
        float vein5 = sin((uv.x + uv.y * 2.0 + n * 1.5) * 100.0) * 0.25;

        marble += vein1 + vein2 + vein3 + vein4 + vein5;

        // Turbulence
        float turb = fbm4D(vec4(uv * 150.0, uTime * 0.02, vInstanceData.y * 0.01), 8) * 0.15;
        marble += turb;

        // Color variation
        float colorVar = fbm4D(vec4(uv * 25.0, uTime * 0.01, 0.0), 4);

        marble = (marble + 1.0) * 0.5;
        marble = clamp(marble, 0.0, 1.0);

        return vec3(
            marble * (0.95 + colorVar * 0.1),
                    marble * (0.88 + colorVar * 0.15),
                    marble * (0.82 + colorVar * 0.18)
        );
    }

    marble = (marble + 1.0) * 0.5;
    return vec3(marble * 0.9, marble * 0.85, marble * 0.8);
}

// Organic wood with complex grain
vec3 wood(vec2 uv) {
    float complexity = (uBenchmarkMode >= 1) ? 80.0 : 20.0;
    float scale = (uBenchmarkMode >= 1) ? 250.0 : 60.0;

    vec4 p = vec4(uv * complexity, uTime * 0.01, vInstanceData.z * 0.005);
    float rings = sin(distance(uv, vec2(0.5)) * scale + fbm4D(p, 8) * 8.0);

    if (uBenchmarkMode >= 1) {
        // Multi-scale grain
        float grain1 = fbm4D(vec4(uv.x * 300.0, uv.y * 60.0, uTime * 0.005, 0.0), 8) * 0.2;
        float grain2 = fbm4D(vec4(uv.x * 600.0, uv.y * 120.0, uTime * 0.003, 1.0), 6) * 0.15;
        float grain3 = fbm4D(vec4(uv.x * 1200.0, uv.y * 40.0, uTime * 0.001, 2.0), 4) * 0.1;

        rings += grain1 + grain2 + grain3;

        // Multiple knots with organic shapes
        for (int i = 0; i < 12; i++) {
            if (i >= (uBenchmarkMode >= 2 ? 12 : 6)) break;

            float fi = float(i);
            vec2 knotPos = vec2(
                0.15 + fi * 0.12 + sin(fi * 2.3) * 0.1,
                                0.25 + sin(fi * 1.8) * 0.45 + cos(fi * 2.1) * 0.1
            );

            float knotDist = distance(uv, knotPos);
            float knotSize = 0.08 + sin(fi * 3.0 + uTime * 0.1) * 0.03;
            float knot = smoothstep(knotSize, 0.0, knotDist) * 0.5;

            // Knot turbulence
            float knotTurb = fbm4D(vec4(uv * 100.0, fi, uTime * 0.02), 6) * knot * 0.7;
            rings -= knot - knotTurb;
        }

        // Irregular ring patterns
        float irregularity = fbm4D(vec4(uv * 50.0, uTime * 0.005, vInstanceData.x * 0.01), 6) * 0.15;
        rings += irregularity;

        rings = (rings + 1.0) * 0.5;
        rings = clamp(rings, 0.0, 1.0);

        // Rich wood colors
        float colorShift = fbm4D(vec4(uv * 30.0, uTime * 0.002, 0.0), 4);
        return vec3(
            rings * (0.75 + colorShift * 0.25),
                    rings * (0.45 + colorShift * 0.35),
                    rings * (0.18 + colorShift * 0.22)
        );
    }

    rings = (rings + 1.0) * 0.5;
    return vec3(rings * 0.8, rings * 0.5, rings * 0.2);
}

// Photorealistic fire
vec3 fire(vec2 uv) {
    float intensity = (uBenchmarkMode >= 1) ? 8.0 : 2.0;
    int octaves = (uBenchmarkMode >= 1) ? 12 : 4;

    vec4 p = vec4(uv.x * 20.0, uv.y * 40.0 - uTime * 8.0, uTime * 0.1, vInstanceData.y * 0.01);
    float flame = fbm4D(p, octaves);
    flame = pow(flame * intensity, 3.0) * pow(1.0 - uv.y * 0.9, 2.0);

    if (uBenchmarkMode >= 1) {
        // Multiple flame layers
        for (int i = 1; i < 8; i++) {
            float fi = float(i);
            vec4 p2 = vec4(uv.x * (20.0 + fi * 8.0), uv.y * (40.0 + fi * 12.0) - uTime * (8.0 + fi * 2.0), uTime * 0.05 * fi, fi);
            flame += fbm4D(p2, 8) * pow(intensity / fi, 2.0) * (0.8 / fi);
        }

        // Lateral turbulence
        float turb = fbm4D(vec4(uv.x * 100.0 + uTime * 3.0, uv.y * 60.0, uTime * 0.05, 1.0), 6) * 0.2;
        flame += turb;

        // Flickering effect
        float flicker = sin(uTime * 25.0 + uv.x * 80.0) * sin(uTime * 20.0 + uv.y * 50.0) * 0.08;
        flame += flicker;

        // Complex temperature gradient
        float temperature = flame + uv.y * 0.4 + vInstanceData.x * 0.1;

        // Ultra-realistic fire colors
        float coreHeat = smoothstep(0.85, 1.0, temperature);      // Blue-white core
        float hotFlame = smoothstep(0.6, 0.85, temperature);      // Yellow-white
        float mainFlame = smoothstep(0.3, 0.6, temperature);      // Orange
        float warmFlame = smoothstep(0.15, 0.3, temperature);     // Red
        float edges = smoothstep(0.05, 0.15, temperature);        // Dark red

        vec3 blue = vec3(0.3, 0.5, 1.0);
        vec3 white = vec3(1.0, 0.98, 0.9);
        vec3 yellow = vec3(1.0, 0.95, 0.3);
        vec3 orange = vec3(1.0, 0.6, 0.1);
        vec3 red = vec3(0.9, 0.3, 0.05);
        vec3 darkRed = vec3(0.4, 0.05, 0.0);

        vec3 color = mix(vec3(0.0), darkRed, edges);
        color = mix(color, red, warmFlame);
        color = mix(color, orange, mainFlame);
        color = mix(color, yellow, hotFlame);
        color = mix(color, white, coreHeat * 0.8);
        color = mix(color, blue, coreHeat * temperature * 0.4);

        return color * flame;
    }

    return vec3(flame, flame * 0.6, flame * 0.1);
}

// Plasma energy effect
vec3 plasma(vec2 uv) {
    float scale = (uBenchmarkMode >= 1) ? 100.0 : 30.0;

    vec4 p = vec4(uv * scale, uTime * 0.2, vInstanceData.z * 0.05);
    float plasma1 = fbm4D(p, 8);
    float plasma2 = fbm4D(p + vec4(100.0, 50.0, 25.0, 10.0), 8);

    float energy = sin(plasma1 * 10.0 + uTime * 3.0) * sin(plasma2 * 8.0 + uTime * 2.0);

    if (uBenchmarkMode >= 2) {
        // Multiple energy layers
        for (int i = 1; i < 6; i++) {
            float fi = float(i);
            vec4 pLayer = p * (1.0 + fi * 0.5) + vec4(fi * 20.0);
            float layer = fbm4D(pLayer, 6);
            energy += sin(layer * (8.0 + fi * 2.0) + uTime * (2.0 + fi)) * (0.5 / fi);
        }

        // Electric arcs
        float arc = sin(uv.x * 200.0 + sin(uv.y * 150.0 + uTime * 5.0) * 10.0);
        energy += smoothstep(0.9, 1.0, arc) * 2.0;
    }

    energy = energy * 0.5 + 0.5;

    // Electric colors
    return vec3(
        energy * 0.3 + pow(energy, 3.0) * 0.7,
                energy * 0.8 + pow(energy, 2.0) * 0.2,
                energy + pow(energy, 4.0)
    );
}

// Voronoi noise pattern
vec3 voronoiPattern(vec2 uv) {
    float scale = (uBenchmarkMode >= 1) ? 80.0 : 20.0;

    vec2 vor = voronoi(uv, scale);
    float dist = vor.x;
    float cellValue = vor.y;

    if (uBenchmarkMode >= 1) {
        // Multiple scales
        vec2 vor2 = voronoi(uv, scale * 0.5);
        vec2 vor3 = voronoi(uv, scale * 2.0);

        dist = mix(dist, vor2.x, 0.3);
        dist = mix(dist, vor3.x, 0.2);

        cellValue = mix(cellValue, vor2.y, 0.4);
        cellValue = mix(cellValue, vor3.y, 0.3);

        // Animate cell values
        cellValue += sin(cellValue * 20.0 + uTime * 2.0) * 0.1;
    }

    // Color based on distance and cell value
    return mix(
        vec3(dist, dist * 0.5, 1.0 - dist),
               vec3(cellValue, 1.0 - cellValue, cellValue * 0.7),
               0.6
    );
}

// 4D Turbulence
vec3 turbulence4D(vec2 uv) {
    vec4 p = vec4(uv * 50.0, uTime * 0.1, vInstanceData.x * 0.02);

    float turb1 = fbm4D(p, 8);
    float turb2 = fbm4D(p * 2.0 + vec4(100.0), 6);
    float turb3 = fbm4D(p * 4.0 + vec4(200.0), 4);

    if (uBenchmarkMode >= 2) {
        // Ultra-complex turbulence
        for (int i = 1; i < 8; i++) {
            float fi = float(i);
            vec4 pTurb = p * (1.0 + fi * 0.3) + vec4(fi * 50.0);
            float layer = fbm4D(pTurb, 8);
            turb1 += layer * (0.3 / fi);
        }
    }

    float combined = turb1 * 0.5 + turb2 * 0.3 + turb3 * 0.2;
    combined = combined * 0.5 + 0.5;

    // Psychedelic colors
    return vec3(
        sin(combined * 6.28 + uTime) * 0.5 + 0.5,
                sin(combined * 6.28 + uTime + 2.09) * 0.5 + 0.5,
                sin(combined * 6.28 + uTime + 4.18) * 0.5 + 0.5
    );
}

void main() {
    vec3 color = vec3(1.0);

    // Apply instance-based effects
    float instanceEffect = sin(vInstanceData.z * 0.1 + uTime) * 0.1 + 1.0;

    if (uTextureType == 0) {
        color = vColor.rgb * instanceEffect;
    } else if (uTextureType == 1) {
        color = checkerboard(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 2) {
        color = waves(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 3) {
        color = circles(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 4) {
        color = marble(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 5) {
        color = wood(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 6) {
        color = fire(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 7) {
        color = plasma(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 8) {
        color = voronoiPattern(vTextureCoord) * instanceEffect;
    } else if (uTextureType == 9) {
        color = turbulence4D(vTextureCoord) * instanceEffect;
    }

    // Ultra-extreme benchmark mode effects
    if (uBenchmarkMode >= 3) {
        // Compute-like particle effects
        vec2 screenUV = gl_FragCoord.xy / vec2(1200.0, 800.0);

        for (int i = 0; i < 64; i++) {
            float fi = float(i);
            vec2 particlePos = vec2(
                sin(uTime * 0.5 + fi * 0.1) * 0.5 + 0.5,
                                    cos(uTime * 0.3 + fi * 0.15) * 0.5 + 0.5
            );

            float dist = distance(screenUV, particlePos);
            color += exp(-dist * 50.0) * vec3(
                sin(fi + uTime) * 0.5 + 0.5,
                                              sin(fi + uTime + 2.0) * 0.5 + 0.5,
                                              sin(fi + uTime + 4.0) * 0.5 + 0.5
            ) * 0.02;
        }

        // Screen-space distortion
        vec2 distortion = vec2(
            sin(screenUV.y * 100.0 + uTime * 10.0) * 0.01,
                               cos(screenUV.x * 100.0 + uTime * 8.0) * 0.01
        );

        // Apply distortion effect
        color *= 1.0 + length(distortion) * 10.0;
    }

    // HDR tone mapping
    color = color / (color + 1.0);

    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));

    fragColor = vec4(color, 1.0);
}
`;

// === WEBGL2 BENCHMARK LOGIC COMPLETO ===

let gl, shaderProgram, programInfo, buffers;
let rotationX = 0, rotationY = 0, speedX = 2, speedY = 1.5, wireframe = false;
let textureType = 0, benchmarkMode = 0, instanceCount = 1;
let scale = 3.0;

// Performance metrics
let fps = 0, frameCount = 0, lastTime = 0, fpsUpdateTime = 0, frameTimeSum = 0, drawCalls = 0;

function main() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl2');

    if (!gl) {
        alert('WebGL 2.0 não suportado pelo seu navegador!\nPor favor, use um navegador mais recente.');
        return;
    }

    console.log('🚀 WebGL 2.0 Context Created Successfully!');
    console.log('GPU:', gl.getParameter(gl.RENDERER));
    console.log('WebGL Version:', gl.getParameter(gl.VERSION));
    console.log('GLSL Version:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));

    // Enable WebGL 2.0 features
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    // Initialize shaders
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

    // Setup controls
    setupControls();

    // Start render loop
    requestAnimationFrame(drawScene);
}

function setupControls() {
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

    document.getElementById('instances').addEventListener('input', (e) => {
        instanceCount = parseInt(e.target.value);
        buffers = initBuffers(gl);
    });

    document.getElementById('benchmarkMode').addEventListener('change', (e) => {
        benchmarkMode = parseInt(e.target.value);
        buffers = initBuffers(gl);
    });

    document.getElementById('scale').addEventListener('input', (e) => {
        scale = parseFloat(e.target.value);
        document.getElementById('scaleValue').textContent = scale.toFixed(1);
    });
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
    // Determine subdivision level based on benchmark mode
    let subdivisions = 1;
    switch (benchmarkMode) {
        case 0: subdivisions = 1; break;    // Normal
        case 1: subdivisions = 64; break;   // Heavy
        case 2: subdivisions = 128; break;  // Extreme
        case 3: subdivisions = 256; break;  // INSANE
    }

    console.log(`Generating geometry: ${subdivisions}x subdivisions, ${instanceCount} instances`);

    const positions = [];
    const colors = [];
    const textureCoords = [];
    const indices = [];

    // Instance data
    const instanceOffsets = [];
    const instanceRotations = [];
    const instanceScales = [];

    const faceColors = [
        [1.0, 0.0, 0.0, 1.0], [0.0, 1.0, 0.0, 1.0], [0.0, 0.0, 1.0, 1.0],
        [1.0, 1.0, 0.0, 1.0], [1.0, 0.0, 1.0, 1.0], [0.0, 1.0, 1.0, 1.0],
    ];

    const faces = [
        { offset: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
        { offset: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
        { offset: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
        { offset: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
        { offset: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
        { offset: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
    ];

    let vertexCount = 0;

    // Generate cube geometry with adaptive subdivision
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

    // Generate instance data
    for (let i = 0; i < instanceCount; i++) {
        const angle = (i / instanceCount) * Math.PI * 2;
        const radius = Math.sqrt(i) * 0.5;
        const height = (Math.sin(i * 0.1) * 2.0);

        instanceOffsets.push(
            Math.cos(angle) * radius,
                             height,
                             Math.sin(angle) * radius
        );

        instanceRotations.push(
            i * 0.1,
            i * 0.15,
            i * 0.2
        );

        instanceScales.push(0.3 + (i % 10) * 0.05);
    }

    // Create buffers
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
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

    // Instance buffers
    const instanceOffsetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceOffsetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceOffsets), gl.STATIC_DRAW);

    const instanceRotationBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceRotationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceRotations), gl.STATIC_DRAW);

    const instanceScaleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceScaleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceScales), gl.STATIC_DRAW);

    console.log(`Geometry created: ${positions.length/3} vertices, ${indices.length/3} triangles`);

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

    // Calculate FPS and metrics
    if (lastTime !== 0) {
        const deltaTime = currentTime - lastTime;
        frameTimeSum += deltaTime;
        frameCount++;

        if (currentTime - fpsUpdateTime > 500) {
            fps = Math.round(1000 / (frameTimeSum / frameCount));
            const avgFrameTime = (frameTimeSum / frameCount).toFixed(2);

            // Update UI
            document.getElementById('fpsValue').textContent = fps;
            document.getElementById('gpumodel').textContent = gl.getParameter(gl.VERSION);
            document.getElementById('frameTime').textContent = avgFrameTime;
            document.getElementById('frameCount').textContent = frameCount;
            document.getElementById('vertexCount').textContent = (buffers.vertexCount * instanceCount).toLocaleString();
            document.getElementById('triangleCount').textContent = Math.floor(buffers.indexCount * instanceCount / 3).toLocaleString();
            document.getElementById('instanceCount').textContent = instanceCount.toLocaleString();
            document.getElementById('drawCalls').textContent = drawCalls;

            // Estimate GPU load based on FPS
            const gpuLoad = Math.max(0, Math.min(100, 100 - (fps - 10) * 2));
            document.getElementById('gpuLoad').textContent = Math.round(gpuLoad);

            // Color code FPS
            const fpsEl = document.getElementById('fpsValue');
            fpsEl.className = fps > 45 ? '' : fps > 20 ? 'warning' : 'critical';

            frameTimeSum = 0;
            frameCount = 0;
            fpsUpdateTime = currentTime;
        }
    }
    lastTime = currentTime;

    // Clear and setup
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create projection matrix
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Create model-view matrix
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -8.0]);
    mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);

    // Setup vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    // Setup instance attributes
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

    // Draw with instancing
    drawCalls = 1;
    if (wireframe) {
        for (let i = 0; i < buffers.indexCount; i += 3) {
            gl.drawElementsInstanced(gl.LINE_LOOP, 3, gl.UNSIGNED_INT, i * 4, instanceCount);
            drawCalls++;
        }
    } else {
        gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_INT, 0, instanceCount);
    }

    // Update rotation
    rotationX += speedX * 0.01;
    rotationY += speedY * 0.01;

    requestAnimationFrame(drawScene);
}

// Matrix library for WebGL 2.0
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

    translate: function(out, a, v) {
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
    },
};

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// Performance monitoring
let performanceStart = performance.now();

window.addEventListener('load', () => {
    console.log(`🚀 WebGL 2.0 Ultra Benchmark loaded in ${(performance.now() - performanceStart).toFixed(2)}ms`);
    console.log('💡 Tips:');
    console.log('  • Start with Normal mode to test compatibility');
    console.log('  • Heavy mode: 64x geometry subdivision');
    console.log('  • Extreme mode: 128x subdivision + up to 2000 instances');
    console.log('  • INSANE mode: 256x subdivision + compute-like effects');
    console.log('  • Monitor GPU load and adjust accordingly');
    console.log('  • Use wireframe mode to reduce fragment load');
});

// Keyboard shortcuts for better user experience
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 's':
        case 'S':
            // Reset scale to 1.0
            scale = 1.0;
            document.getElementById('scale').value = scale;
            document.getElementById('scaleValue').textContent = scale.toFixed(1);
            break;
        case 'w':
        case 'W':
            const wireframeEl = document.getElementById('wireframe');
            wireframeEl.checked = !wireframeEl.checked;
            wireframe = wireframeEl.checked;
            break;
        case '1':
        case '2':
        case '3':
        case '4':
            benchmarkMode = parseInt(e.key) - 1;
            document.getElementById('benchmarkMode').value = benchmarkMode;
            if (gl && buffers) {
                buffers = initBuffers(gl);
            }
            break;
        case ' ':
            e.preventDefault();
            const speedXEl = document.getElementById('speedX');
            const speedYEl = document.getElementById('speedY');
            if (speedX > 0 || speedY > 0) {
                speedX = 0;
                speedY = 0;
            } else {
                speedX = 2;
                speedY = 1.5;
            }
            speedXEl.value = speedX;
            speedYEl.value = speedY;
            break;
        case 'r':
        case 'R':
            // Reset to default values
            rotationX = 0;
            rotationY = 0;
            break;
        case '+':
        case '=':
            const instancesEl = document.getElementById('instances');
            const newCount = Math.min(2000, parseInt(instancesEl.value) + 50);
            instancesEl.value = newCount;
            instanceCount = newCount;
            if (gl && buffers) {
                buffers = initBuffers(gl);
            }
            break;
        case '-':
        case '_':
            const instancesElMinus = document.getElementById('instances');
            const newCountMinus = Math.max(1, parseInt(instancesElMinus.value) - 50);
            instancesElMinus.value = newCountMinus;
            instanceCount = newCountMinus;
            if (gl && buffers) {
                buffers = initBuffers(gl);
            }
            break;
    }
});

// Error handling and WebGL context recovery
window.addEventListener('error', (e) => {
    console.error('WebGL 2.0 Benchmark Error:', e.error);
});

// WebGL context lost/restored handling
const canvas = document.getElementById('glCanvas');
if (canvas) {
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        console.warn('WebGL context lost! Attempting to restore...');
    });

    canvas.addEventListener('webglcontextrestored', () => {
        console.log('WebGL context restored! Reinitializing...');
        main();
    });
}

// Performance warning system
let lowFpsWarningShown = false;
setInterval(() => {
    if (fps > 0 && fps < 10 && !lowFpsWarningShown) {
        lowFpsWarningShown = true;
        console.warn(`⚠️ Performance Warning: FPS is very low (${fps}). Consider reducing instances or using lower benchmark mode.`);
    }
}, 3000);
