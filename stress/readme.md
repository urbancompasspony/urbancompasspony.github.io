# 🎮 Cubo 3D WebGL com Texturas Procedurais

Um projeto demonstrativo de WebGL que renderiza um cubo 3D com texturas procedurais e modo benchmark para testes de performance.

![WebGL Cube Demo](https://img.shields.io/badge/WebGL-2.0-green) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow) ![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)

## ✨ Características

### 🎨 **Texturas Procedurais**
- **7 tipos diferentes** de texturas geradas matematicamente
- **Sem arquivos de imagem** - tudo renderizado em tempo real
- **Infinitamente escaláveis** e sempre nítidas
- **Animações fluidas** baseadas em tempo

### 📊 **Sistema de Performance**
- **Contador de FPS** em tempo real
- **Frame time** médio em milissegundos
- **Contador de frames** total
- **Modo Benchmark** para stress test

### 🎛️ **Controles Interativos**
- Velocidade de rotação X/Y ajustável
- Seletor de texturas
- Modo wireframe
- Toggle de benchmark

## 🎯 Texturas Disponíveis

| Tipo | Descrição | Complexidade |
|------|-----------|--------------|
| **Cores Sólidas** | Cada face com cor única | Baixa |
| **Xadrez** | Padrão clássico de tabuleiro | Baixa |
| **Ondas** | Ondas senoidais animadas | Média |
| **Círculos** | Círculos concêntricos pulsantes | Média |
| **Mármore** | Textura realista usando ruído | Alta |
| **Madeira** | Anéis de crescimento procedurais | Alta |
| **Fogo** | Chamas animadas que sobem | Muito Alta |

## 🔥 Modo Benchmark

### **Geometria Normal vs Benchmark**
- **Normal**: 36 triângulos (cubo básico)
- **Benchmark**: **9.216 triângulos** (16×16 subdivisões)
- **Vértices**: 24 → **1.734 vértices**

### **Texturas Melhoradas**
- **Resolução 4×** maior nos padrões
- **Múltiplas camadas** de ruído
- **Efeitos complexos** adicionais
- **Carga computacional 10-50× maior**

### **Performance Esperada**
- **Modo Normal**: ~60 FPS
- **Modo Benchmark**: ~5-30 FPS (depende da GPU)

## 🛠️ Tecnologias Utilizadas

### **WebGL & Shaders**
```glsl
// Vertex Shader - processa vértices
attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

// Fragment Shader - processa pixels
varying vec2 vTextureCoord;
uniform float uTime;
uniform bool uBenchmarkMode;
```

### **Técnicas Implementadas**
- **Vertex Buffer Objects (VBO)** para geometria
- **Index Buffer Objects (IBO)** para triângulos
- **Uniform variables** para parâmetros globais
- **Varying variables** para interpolação
- **Procedural noise** para texturas

## 📋 Arquitetura do Código

### **Estrutura Principal**
```
├── Shaders (GLSL)
│   ├── Vertex Shader - transformações 3D
│   └── Fragment Shader - texturas procedurais
├── JavaScript (ES6)
│   ├── Inicialização WebGL
│   ├── Geração de geometria
│   ├── Sistema de renderização
│   └── Controles de interface
└── HTML/CSS
    ├── Canvas WebGL
    ├── Controles interativos
    └── Display de FPS
```

### **Fluxo de Renderização**
1. **Inicialização**: Compilar shaders, criar buffers
2. **Geometria**: Gerar vértices (normal ou subdividido)
3. **Loop Principal**: 
   - Calcular FPS
   - Atualizar uniforms (tempo, parâmetros)
   - Renderizar triângulos
   - Repetir com `requestAnimationFrame`

## 🎮 Como Usar

### **Controles Básicos**
- **Velocidade X/Y**: Ajusta rotação nos eixos
- **Textura**: Seleciona tipo de textura procedural
- **Wireframe**: Mostra estrutura dos triângulos
- **Benchmark**: Ativa modo de stress test

### **Testando Performance**
1. Observe o FPS em modo normal
2. Ative diferentes texturas (fogo é a mais pesada)
3. Enable benchmark mode
4. Compare a queda de performance
5. Use wireframe para ver a geometria complexa

## 💡 Conceitos Demonstrados

### **Gráficos 3D**
- Projeção perspectiva
- Transformações matriciais (rotação, translação)
- Rasterização de triângulos
- Z-buffering para profundidade

### **Texturas Procedurais**
- Funções de ruído (noise functions)
- Coordenadas UV mapping
- Interpolação bilinear
- Animação baseada em tempo

### **Otimização de Performance**
- Vertex/Index buffers
- Uniform variables vs attributes
- Complexidade algorítmica
- GPU vs CPU workload

## 🔧 Requisitos Técnicos

### **Navegador Compatível**
- Chrome 70+
- Firefox 65+
- Safari 14+
- Edge 80+

### **Hardware Mínimo**
- **GPU**: Suporte WebGL 1.0
- **RAM**: 2GB
- **Processador**: Qualquer CPU moderna

### **Hardware Recomendado**
- **GPU**: Dedicada (NVIDIA/AMD)
- **RAM**: 8GB+
- **Processador**: Multi-core

## 📈 Métricas de Performance

### **FPS Targets**
- **60 FPS**: Performance ideal
- **30-60 FPS**: Boa performance
- **15-30 FPS**: Performance aceitável
- **<15 FPS**: GPU limitada

### **Frame Time**
- **16.67ms**: 60 FPS ideal
- **33.33ms**: 30 FPS mínimo
- **>66ms**: Performance crítica

O modo benchmark permite testar os limites da GPU e entender os trade-offs entre qualidade visual e performance.

---

**Desenvolvido com ❤️ usando WebGL puro - sem bibliotecas externas!**
