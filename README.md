# 🌟 Zoio The Green Eye - Portfolio

> **Portfólio Pessoal de Projetos Diversos** - Uma showcase moderna e interativa de projetos web, ferramentas e serviços.

## 🎯 Sobre o Projeto

Este é um portfólio web moderno e responsivo que apresenta uma coleção diversificada de projetos pessoais e profissionais. O site oferece uma experiência visual rica com design glassmorphism, animações suaves e interface intuitiva.

## ✨ Características

- **🎨 Design Moderno**: Interface com efeito glassmorphism e gradientes elegantes
- **📱 Responsivo**: Otimizado para desktop, tablet e mobile
- **🔍 Busca Inteligente**: Sistema de pesquisa em tempo real
- **🏷️ Filtros por Categoria**: Organização por tipo de projeto (Web, Ferramentas, Serviços)
- **✨ Animações Fluidas**: Transições suaves e partículas animadas de fundo
- **⚡ Performance**: Carregamento rápido e otimizado

## 🚀 Demonstração

Acesse o portfolio online: [Link do Portfolio](#)

## 📂 Estrutura de Projetos

### Categorias Disponíveis

#### 🌐 **Web**
- **Linux Universe** - Site completo sobre notícias e tutoriais Linux
- **Publicações Recentes** - Central de publicações e integração com redes sociais
- **Página de Erro 404** - Página de erro personalizada e elegante

#### 🛠️ **Ferramentas**
- **PowerShell Tools** - Coleção de ferramentas úteis para Windows
- **DNS Ping Tester** - Teste de ping e latência em tempo real
- **WebUI Active Directory** - Interface web para gerenciamento do AD
- **Diagnóstico do Sistema** - Página para testes no servidor
- **Project Pandora Pentest** - Sistema automatizado de pentesting

#### 🏢 **Serviços**
- **Serviços SuitIT** - Lista completa de serviços em servidores

## 🔧 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica moderna
- **CSS3** - Design avançado com:
  - Flexbox & Grid Layout
  - Gradientes e glassmorphism
  - Animações CSS personalizadas
  - Media queries para responsividade
- **JavaScript ES6+** - Funcionalidades interativas:
  - Sistema de busca dinâmica
  - Filtros por categoria
  - Animações de partículas
  - Renderização dinâmica de projetos

## 📋 Funcionalidades

### 🔍 **Sistema de Busca**
- Busca em tempo real nos títulos, descrições e nomes dos projetos
- Interface limpa com ícone de pesquisa
- Resultados instantâneos conforme digitação

### 🏷️ **Filtros**
- **Todos**: Visualizar todos os projetos
- **Web**: Sites e aplicações web
- **Ferramentas**: Utilitários e scripts
- **Serviços**: Serviços corporativos

### 📊 **Estatísticas**
- Contador dinâmico de projetos
- Indicador de projetos ativos
- Status em tempo real

### 🎨 **Interface Visual**
- Avatar personalizado com efeito shimmer
- Cards com hover effects 3D
- Partículas animadas de fundo
- Tema escuro com acentos verdes

## 🚀 Como Usar

### Instalação Local

1. **Clone o repositório**
   ```bash
   git clone https://github.com/usuario/portfolio.git
   cd portfolio
   ```

2. **Abra o arquivo index.html**
   ```bash
   # Método 1: Abrir diretamente no navegador
   open index.html
   
   # Método 2: Usar servidor local (recomendado)
   python -m http.server 8000
   # ou
   npx serve .
   ```

3. **Acesse no navegador**
   ```
   http://localhost:8000
   ```

### Estrutura de Arquivos

```
portfolio/
├── index.html              # Página principal
├── images/
│   └── untitled.png        # Avatar do perfil
├── linuxuniverse/          # Projeto Linux Universe
├── p/                      # Publicações Recentes
├── t/                      # PowerShell Tools
├── apps/                   # Serviços SuitIT
├── dns-ping/              # DNS Ping Tester
├── domain-webui/          # WebUI Active Directory
├── system-diagnostic/     # Diagnóstico do Sistema
├── pentest/               # Project Pandora
├── 404/                   # Página de Erro 404
└── README.md              # Este arquivo
```

## 🔧 Personalização

### Adicionar Novo Projeto

1. **Edite o array `projects` no JavaScript**:
   ```javascript
   const projects = [
       // ... projetos existentes
       {
           name: 'novo-projeto',           // Nome da pasta
           title: 'Título do Projeto',    // Nome exibido
           description: 'Descrição...',   // Descrição do projeto
           icon: '🚀',                    // Emoji do ícone
           category: 'web',               // Categoria (web/tools/services)
           status: 'online'               // Status (online/development)
       }
   ];
   ```

2. **Crie a pasta do projeto**:
   ```bash
   mkdir novo-projeto
   # Adicione os arquivos do projeto na pasta
   ```

### Personalizar Cores

Edite as variáveis CSS no `:root`:

```css
:root {
    --primary-gradient: linear-gradient(135deg, #2d5a4b 0%, #4a7c63 100%);
    --secondary-gradient: linear-gradient(135deg, #6ba085 0%, #4a7c63 100%);
    --accent-gradient: linear-gradient(135deg, #2d5a4b 0%, #6ba085 100%);
    /* ... outras variáveis */
}
```

### Personalizar Avatar

Substitua o arquivo `images/untitled.png` pela sua foto ou logo.

## 📱 Responsividade

O site é totalmente responsivo e otimizado para:

- **Desktop**: Layout em grid com múltiplas colunas
- **Tablet**: Adaptação automática do grid
- **Mobile**: Layout single-column com navegação touch-friendly

### Breakpoints

- `max-width: 768px` - Mobile e tablet
- Cards se adaptam automaticamente ao tamanho da tela
- Texto responsivo usando `clamp()`

## 🎨 Customização de Tema

### Cores Principais
- **Verde Escuro**: `#2d5a4b` (Cor primária)
- **Verde Claro**: `#6ba085` (Cor secundária)
- **Transparências**: Efeito glassmorphism
- **Texto**: Branco com opacidades variadas

### Tipografia
- **Fonte**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700
- **Fallback**: System fonts (-apple-system, BlinkMacSystemFont)

## 🔧 Configurações Avançadas

### Partículas de Fundo
```javascript
const particleCount = 50; // Ajustar quantidade de partículas
```

### Animações
```css
/* Ajustar velocidade das animações */
@keyframes float {
    /* Duração: 6s */
}
```

## 📈 Performance

- **Carregamento**: < 2 segundos
- **Imagens**: Otimizadas e comprimidas
- **CSS**: Minificado em produção
- **JavaScript**: Vanilla JS (sem frameworks pesados)
- **Acessibilidade**: Semântica HTML adequada

## 🤝 Contribuição

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/nova-feature`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. **Push** para a branch (`git push origin feature/nova-feature`)
5. Abra um **Pull Request**

## 📝 License

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

- **Desenvolvedor**: José Humberto (Zoio The Green Eye)
- **Portfolio**: [Link do Site](#)
- **Email**: [email@exemplo.com](#)

---

<div align="center">

**💻 Desenvolvido com ❤️ por Zoio The Green Eye**

</div>
