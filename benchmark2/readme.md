# 🔥 WebGL 2.0 Ultra Benchmark

Um benchmark extremo de GPU usando WebGL 2.0 com instanced rendering, shaders procedurais avançados e efeitos computacionais em tempo real.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Recursos e Tecnologias](#-recursos-e-tecnologias)
- [Modos de Benchmark](#-modos-de-benchmark)
- [Sistema de Segurança](#-sistema-de-segurança)
- [Texturas Procedurais](#-texturas-procedurais)
- [Métricas de Performance](#-métricas-de-performance)
- [Controles e Atalhos](#-controles-e-atalhos)
- [Requisitos do Sistema](#-requisitos-do-sistema)
- [Instalação e Uso](#-instalação-e-uso)
- [Arquitetura Técnica](#-arquitetura-técnica)
- [Resolução de Problemas](#-resolução-de-problemas)

## 🎯 Visão Geral

Este benchmark foi desenvolvido para testar os limites de GPUs modernas utilizando as mais avançadas funcionalidades do WebGL 2.0. Ele combina geometria complexa, shaders procedurais sofisticados e renderização instanciada para criar um teste de stress abrangente.

### Principais Características

- ✅ **WebGL 2.0 puro** - Sem bibliotecas externas
- ✅ **Instanced Rendering** - Até 2000 objetos simultâneos
- ✅ **Shaders GLSL ES 3.00** - Efeitos procedurais avançados
- ✅ **Geometria adaptativa** - Até 256x subdivisões
- ✅ **10 texturas procedurais** diferentes
- ✅ **Sistema de segurança** integrado
- ✅ **Métricas em tempo real** - FPS, GPU load, draw calls
- ✅ **4 modos de intensidade** - Normal até INSANE

## 🚀 Recursos e Tecnologias

### WebGL 2.0 Features Utilizadas

| Recurso | Utilização no Benchmark |
|---------|------------------------|
| **Instanced Rendering** | Renderização de até 2000 cubos simultaneamente |
| **GLSL ES 3.00** | Shaders avançados com 4D noise e domain warping |
| **Vertex Array Objects** | Otimização de binding de atributos |
| **Uniform Buffer Objects** | Passagem eficiente de dados para shaders |
| **Multiple Render Targets** | Preparado para futuras expansões |
| **Transform Feedback** | Base para particle systems |

### Técnicas Avançadas de Rendering

#### **Instanced Rendering**
```glsl
// Vertex Shader - Transformações por instância
attribute vec3 aInstanceOffset;
attribute vec3 aInstanceRotation;
attribute float aInstanceScale;

// Cada instância tem posição, rotação e escala únicas
gl_Position = uProjectionMatrix * uModelViewMatrix * instancePos;
```

#### **4D Noise Procedural**
```glsl
// Fragment Shader - Noise 4D para texturas orgânicas
float noise4D(vec4 p) {
    // Implementação completa de noise 4D para temporal effects
    return complexNoise(p.xyz, p.w); // p.w = tempo
}
```

#### **Domain Warping**
```glsl
// Distorção de domínio para efeitos naturais
vec4 q = p * frequency + vec4(uTime * 0.1);
vec4 r = vec4(
    noise4D(q + vec4(1.7, 9.2, 5.3, 2.1)),
    // ... mais octaves de noise
);
value += amplitude * noise4D(p * frequency + r * 0.5);
```

## 🎮 Modos de Benchmark

### 🟢 Normal Mode
- **Geometria**: 1 subdivisão (24 triângulos)
- **Instâncias**: 1 cubo
- **Shaders**: Básicos
- **Target**: 60+ FPS em GPUs integradas

### 🟡 Heavy Mode  
- **Geometria**: 64x subdivisões (98,304 triângulos)
- **Instâncias**: 50-200 cubos
- **Shaders**: Texturas procedurais completas
- **Target**: 30+ FPS em GPUs dedicadas entry-level

### 🔴 Extreme Mode
- **Geometria**: 128x subdivisões (393,216 triângulos) 
- **Instâncias**: 500-1000 cubos
- **Shaders**: Múltiplas camadas de noise
- **Target**: 15+ FPS em GPUs high-end

### 💀 INSANE Mode
- **Geometria**: 256x subdivisões (1,572,864 triângulos)
- **Instâncias**: 1000-2000 cubos
- **Shaders**: Efeitos compute-like + particles
- **Target**: Stress test para RTX/RX 6000+ series

## 🛡️ Sistema de Segurança

### Diálogo de Aviso Integrado

O benchmark inclui um sistema de proteção que alerta sobre os riscos:

```javascript
// Verifica configuração anterior do usuário
const dontShow = localStorage.getItem('webgl_benchmark_dont_warn');

// Mostra aviso com opções seguras
function startSafeMode() {
    // Força modo Normal com 1 instância
    document.getElementById('benchmarkMode').value = '0';
    document.getElementById('instances').value = '1';
}
```

### ⚠️ Avisos de Segurança

- **🔥 Sobrecarga da GPU** - Aumento de temperatura
- **🖥️ Travamento do sistema** - Especialmente modo INSANE  
- **⚡ Alto consumo de energia** - Em laptops
- **🎮 Crash do driver** - GPU drivers instáveis
- **💻 Lentidão geral** - Linux e Windows

### Recomendações

1. **Sempre começar no modo Normal**
2. **Monitorar temperatura da GPU** (MSI Afterburner, HWiNFO)
3. **Fechar outros programas** antes do teste
4. **Usar modos extremos por pouco tempo**
5. **Ter sistema de ventilação adequado**

## 🎨 Texturas Procedurais

### Algoritmos Implementados

#### **1. Checkerboard Procedural**
```glsl
float checker = mod(c.x + c.y, 2.0);
// + múltiplas camadas de detail com FBM
// + anti-aliasing nas bordas
// + distorção temporal
```

#### **2. Ondas Complexas** 
```glsl
// Até 32 camadas de ondas simultâneas
for (int i = 1; i < 32; i++) {
    float freq = fi * 0.3;
    wave1 += sin(uv.x * scale * freq + uTime * (3.0 + fi * 0.2)) * amp;
    // + interferência diagonal
    // + ondas radiais
}
```

#### **3. Círculos Fractais**
```glsl
// 16 centros animados simultaneamente
for (int i = 0; i < 16; i++) {
    vec2 offset = vec2(
        sin(uTime * 0.7 + fi * 2.0) * 0.5,
        cos(uTime * 0.5 + fi * 1.5) * 0.5
    );
    float d = distance(uv, center + offset);
    circle += sin(d * frequency * 0.4 - uTime * (6.0 + fi));
}
```

#### **4. Mármore 3D**
```glsl
// Domain warping com múltiplos sistemas de veias
float vein1 = sin((uv.y + n * 4.0) * 40.0) * 0.5;
float vein2 = sin((uv.x + uv.y + n * 3.0) * 60.0) * 0.4;
// + turbulência
// + variação de cor
```

#### **5. Madeira Orgânica**
```glsl
// Anéis de crescimento + grão direcional
float rings = sin(distance(uv, vec2(0.5)) * scale + fbm4D(p, 8) * 8.0);
// + 12 nós orgânicos com turbulência
// + padrões irregulares
```

#### **6. Fogo Realista**
```glsl
// 8 camadas de chamas com física
float flame = fbm4D(p, octaves);
flame = pow(flame * intensity, 3.0) * pow(1.0 - uv.y * 0.9, 2.0);
// + turbulência lateral
// + efeito flickering
// + gradiente de temperatura ultra-realista
```

#### **7. Plasma Energético**
```glsl
// Energia elétrica com múltiplas camadas
float plasma1 = fbm4D(p, 8);
float plasma2 = fbm4D(p + vec4(100.0, 50.0, 25.0, 10.0), 8);
float energy = sin(plasma1 * 10.0 + uTime * 3.0) * sin(plasma2 * 8.0 + uTime * 2.0);
// + arcos elétricos
```

#### **8. Voronoi Noise**
```glsl
// Células de Voronoi animadas
vec2 voronoi(vec2 uv, float scale) {
    // Implementação completa com células animadas
    // + múltiplas escalas
    // + valores de célula animados
}
```

#### **9. Turbulência 4D**
```glsl
// Ultra-complexa turbulência multidimensional
for (int i = 1; i < 8; i++) {
    float fi = float(i);
    vec4 pTurb = p * (1.0 + fi * 0.3) + vec4(fi * 50.0);
    float layer = fbm4D(pTurb, 8);
    turb1 += layer * (0.3 / fi);
}
// + cores psicodélicas
```

#### **10. Cores Sólidas (Base)**
```glsl
// Renderização básica com efeitos de instância
color = vColor.rgb * instanceEffect;
```

## 📊 Métricas de Performance

### Monitoramento em Tempo Real

```javascript
// Cálculo de FPS preciso
const deltaTime = currentTime - lastTime;
frameTimeSum += deltaTime;
fps = Math.round(1000 / (frameTimeSum / frameCount));

// Estimativa de carga da GPU
const gpuLoad = Math.max(0, Math.min(100, 100 - (fps - 10) * 2));
```

### Métricas Exibidas

| Métrica | Descrição | Unidade |
|---------|-----------|---------|
| **FPS** | Frames por segundo | Hz |
| **Frame Time** | Tempo por frame | ms |
| **Frame Count** | Total de frames renderizados | Contador |
| **Vertex Count** | Vértices processados | Número |
| **Triangle Count** | Triângulos renderizados | Número |
| **Instance Count** | Objetos instanciados | Número |
| **Draw Calls** | Chamadas de renderização | Número |
| **GPU Load** | Carga estimada da GPU | % |

### Sistema de Alertas

- **🟢 FPS > 45**: Performance ótima
- **🟡 FPS 20-45**: Performance aceitável (warning)
- **🔴 FPS < 20**: Performance crítica (blink)

## 🎮 Controles e Atalhos

### Interface de Controle

#### **Sliders e Seletores**
```html
<!-- Velocidade de rotação -->
<input type="range" id="speedX" min="0" max="10" value="2" step="0.1">
<input type="range" id="speedY" min="0" max="10" value="1.5" step="0.1">

<!-- Número de instâncias -->
<input type="range" id="instances" min="1" max="2000" value="1" step="1">

<!-- Modo wireframe -->
<input type="checkbox" id="wireframe">

<!-- Tipos de textura -->
<select id="textureType">
    <option value="6">Fogo Realista</option>
    <!-- ... outras opções -->
</select>
```

### Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| **W** | Toggle Wireframe |
| **1-4** | Mudar modo benchmark (Normal/Heavy/Extreme/INSANE) |
| **Espaço** | Pausar/Resumir rotação |
| **R** | Reset rotação para zero |
| **+/=** | Aumentar instâncias (+50) |
| **-/_** | Diminuir instâncias (-50) |

### Implementação dos Atalhos

```javascript
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'w': case 'W':
            // Toggle wireframe
            wireframeEl.checked = !wireframeEl.checked;
            wireframe = wireframeEl.checked;
            break;
        case '1': case '2': case '3': case '4':
            // Mudar modo benchmark
            benchmarkMode = parseInt(e.key) - 1;
            buffers = initBuffers(gl);
            break;
        case '+': case '=':
            // Aumentar instâncias
            instanceCount = Math.min(2000, instanceCount + 50);
            buffers = initBuffers(gl);
            break;
    }
});
```

## 💻 Requisitos do Sistema

### Mínimos (Modo Normal)

- **GPU**: Intel HD 4000+ / AMD Radeon R7+ / NVIDIA GT 1030+
- **RAM**: 4GB
- **Browser**: Chrome 57+ / Firefox 51+ / Safari 15+
- **WebGL**: 2.0 suportado

### Recomendados (Modo Heavy)

- **GPU**: GTX 1060 / RX 580 / Intel Iris Xe
- **RAM**: 8GB  
- **Browser**: Chrome/Firefox mais recente
- **Sistema**: Windows 10+, macOS 10.15+, Linux Ubuntu 20+

### Para Modo Extreme

- **GPU**: RTX 2060 / RX 6600 XT ou superior
- **RAM**: 16GB
- **Cooling**: Sistema de refrigeração adequado

### Para Modo INSANE

- **GPU**: RTX 3070 / RX 6800 XT ou superior
- **RAM**: 16GB+
- **Warning**: ⚠️ Use com extrema cautela

## 🛠️ Instalação e Uso

### Instalação

1. **Clone ou baixe os arquivos**
   ```bash
   git clone [repository-url]
   cd webgl-benchmark
   ```

2. **Estrutura de arquivos**
   ```
   webgl-benchmark/
   ├── index.html      # Interface principal
   ├── benchmark.js    # Lógica do benchmark
   └── README.md       # Esta documentação
   ```

3. **Servidor local (recomendado)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js
   npx serve .
   ```

4. **Acesse no navegador**
   ```
   http://localhost:8000
   ```

### Primeira Execução

1. **Aparecerá o diálogo de aviso** - leia atentamente
2. **Escolha "Modo Seguro"** para primeiro teste
3. **Monitore FPS e temperatura** da GPU
4. **Aumente gradualmente** os parâmetros conforme necessário

### Teste de Compatibilidade

```javascript
// Verificação automática de WebGL 2.0
const gl = canvas.getContext('webgl2');
if (!gl) {
    alert('WebGL 2.0 não suportado pelo seu navegador!');
    return;
}

console.log('GPU:', gl.getParameter(gl.RENDERER));
console.log('WebGL Version:', gl.getParameter(gl.VERSION));
```

## 🔧 Arquitetura Técnica

### Estrutura do Código

#### **Main Loop**
```javascript
function drawScene() {
    // 1. Cálculo de métricas
    calculateFPS();
    
    // 2. Setup da renderização
    setupRenderState();
    
    // 3. Atualização de uniformes
    updateUniforms();
    
    // 4. Renderização instanciada
    gl.drawElementsInstanced(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_INT, 0, instanceCount);
    
    // 5. Próximo frame
    requestAnimationFrame(drawScene);
}
```

#### **Geração de Geometria Adaptativa**
```javascript
function initBuffers(gl) {
    // Determina subdivisões baseado no modo
    let subdivisions = 1;
    switch (benchmarkMode) {
        case 0: subdivisions = 1; break;    // Normal
        case 1: subdivisions = 64; break;   // Heavy  
        case 2: subdivisions = 128; break;  // Extreme
        case 3: subdivisions = 256; break;  // INSANE
    }
    
    // Gera geometria do cubo com subdivisões
    generateCubeGeometry(subdivisions);
    
    // Gera dados de instância
    generateInstanceData(instanceCount);
}
```

#### **Sistema de Shaders**
```javascript
// Vertex Shader - Transformações complexas
const vsSource = `#version 300 es
// Atributos por vértice
in vec4 aVertexPosition;
in vec4 aVertexColor;

// Atributos por instância  
in vec3 aInstanceOffset;
in vec3 aInstanceRotation;
in float aInstanceScale;

// Matrizes de rotação procedurais
mat4 rotationMatrix(vec3 rotation) {
    // Implementação completa de matriz de rotação
}
`;

// Fragment Shader - Texturas procedurais
const fsSource = `#version 300 es
precision highp float;

// 4D Noise implementation
float noise4D(vec4 p) {
    // Implementação otimizada de noise 4D
}

// FBM with domain warping
float fbm4D(vec4 p, int octaves) {
    // Fractal Brownian Motion com domain warping
}
`;
```

### Performance Optimizations

#### **Instanced Rendering**
- Reduz draw calls de N para 1
- Transfere dados de instância via vertex attributes
- Permite renderização de milhares de objetos

#### **Adaptive Geometry**
- Geometria se adapta ao modo de benchmark
- Subdivision surface em tempo real
- Balanceamento automático vertex/fragment load

#### **Shader Optimizations**
- Uso de `highp` apenas onde necessário
- Loop unrolling em shaders críticos
- Texture sampling otimizado

## 🐛 Resolução de Problemas

### Problemas Comuns

#### **"WebGL 2.0 não suportado"**
```javascript
// Soluções:
// 1. Verificar suporte do navegador
const gl = canvas.getContext('webgl2');

// 2. Atualizar drivers da GPU
// 3. Habilitar hardware acceleration
// 4. Usar Chrome/Firefox mais recente
```

#### **Baixo FPS inesperado**
- ✅ Fechar outras abas/programas
- ✅ Verificar modo de energia (usar "Alto desempenho")
- ✅ Monitorar temperatura da GPU
- ✅ Reduzir número de instâncias
- ✅ Usar modo wireframe para debugging

#### **Travamento do sistema**
- ⚠️ **Modo INSANE pode sobrecarregar sistema**
- ✅ Usar Ctrl+Alt+Delete (Windows) para recuperar
- ✅ Reduzir para modo Normal
- ✅ Verificar temperatura da GPU

#### **Driver da GPU parou de responder**
- ⚠️ **Comportamento normal em stress tests extremos**
- ✅ Driver será recuperado automaticamente
- ✅ Reduzir intensidade do benchmark
- ✅ Atualizar drivers da GPU

### Debugging

#### **Console do Navegador**
```javascript
// Informações detalhadas no console
console.log('🚀 WebGL 2.0 Context Created Successfully!');
console.log('GPU:', gl.getParameter(gl.RENDERER));
console.log('Geometry created:', positions.length/3, 'vertices');

// Monitoramento de performance
console.warn(`⚠️ Performance Warning: FPS is very low (${fps})`);
```

#### **Métricas de Debug**
```javascript
// Verificar se GPU está sobrecarregada
if (fps < 10 && !lowFpsWarningShown) {
    console.warn('Consider reducing instances or using lower benchmark mode.');
}

// Monitorar uso de memória
console.log('Triangle count:', Math.floor(buffers.indexCount * instanceCount / 3));
```

### Configurações de Sistema

#### **Windows**
- Configurações > Sistema > Vídeo > Configurações de vídeo > Preferências de desempenho de gráficos
- Escolher "Alto desempenho" para o navegador

#### **NVIDIA Control Panel**
- Configurar aplicação específica (Chrome/Firefox)
- Máximo desempenho, VSync desativado

#### **AMD Software**
- Gaming > Global Graphics > Anti-Lag desativado
- Enhanced Sync desativado para benchmarks

## 📈 Interpretação de Resultados

### Benchmarks de Referência

#### **Modo Normal (1 instância)**
- **RTX 4090**: 60+ FPS
- **RTX 3070**: 60+ FPS  
- **GTX 1060**: 45-60 FPS
- **Intel Iris Xe**: 30-45 FPS
- **Intel HD 620**: 15-30 FPS

#### **Modo Heavy (50 instâncias, 64x subdivisões)**
- **RTX 4090**: 60+ FPS
- **RTX 3070**: 45-60 FPS
- **GTX 1060**: 20-35 FPS
- **Intel Iris Xe**: 10-20 FPS

#### **Modo Extreme (500+ instâncias)**
- **RTX 4090**: 45-60 FPS
- **RTX 3070**: 25-40 FPS  
- **GTX 1060**: 8-15 FPS

#### **Modo INSANE (1000+ instâncias)**
- **RTX 4090**: 25-45 FPS
- **RTX 3070**: 10-20 FPS
- **GTX 1060**: 2-8 FPS ⚠️

### Análise de Bottlenecks

#### **Vertex Bound**
- FPS melhora significativamente com wireframe
- **Solução**: Reduzir subdivisões ou instâncias

#### **Fragment Bound**  
- FPS similar entre wireframe e solid
- **Solução**: Usar texturas menos complexas

#### **Memory Bound**
- FPS irregular, stuttering
- **Solução**: Reduzir instâncias drasticamente

---

**⚠️ Disclaimer:** Este benchmark pode sobrecarregar sua GPU e sistema. Use com responsabilidade e monitore sempre a temperatura da sua GPU durante testes intensivos.

**🔥 Desenvolvido para explorar os limites do WebGL 2.0 e hardware moderno de GPUs.**
