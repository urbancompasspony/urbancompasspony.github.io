# 🌐 DNS Tester - Ferramenta de Teste de Latência DNS

Uma ferramenta web moderna para testar a latência real da sua internet com servidores DNS IPv4 e IPv6, usando estratégias inteligentes de conectividade.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Servidores DNS Testados](#-servidores-dns-testados)
- [Como Funcionam os Testes](#-como-funcionam-os-testes)
- [Estratégias de Teste](#-estratégias-de-teste)
- [Timeouts e Performance](#-timeouts-e-performance)
- [Adicionando DNS Customizados](#-adicionando-dns-customizados)
- [Interpretando os Resultados](#-interpretando-os-resultados)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)

## 🎯 Visão Geral

Esta ferramenta realiza testes **reais de conectividade** para medir a latência de servidores DNS, diferente de ferramentas que fazem apenas ping ICMP. Ela utiliza requisições HTTP/HTTPS para endpoints específicos, simulando o comportamento real de navegação na internet.

### Principais Características

- ✅ **Detecção automática** de IPv4 e IPv6
- ✅ **Testes simultâneos** de ambos os protocolos
- ✅ **Estratégias específicas** por provedor e protocolo
- ✅ **Fallbacks inteligentes** para maior confiabilidade
- ✅ **Interface responsiva** com feedback em tempo real
- ✅ **DNS customizados** com validação automática

## 🌍 Servidores DNS Testados

### IPv4 (Internet Protocol version 4)

| Provedor | IP Primário | IP Secundário | Região |
|----------|-------------|---------------|---------|
| **Google** | `8.8.8.8` | `8.8.4.4` | Global |
| **Cloudflare** | `1.1.1.1` | `1.0.0.1` | Global |
| **Quad9** | `9.9.9.9` | `149.112.112.112` | Global |
| **OpenDNS** | `208.67.222.222` | `208.67.220.220` | Global |
| **Level3** | `4.2.2.1` | `4.2.2.2` | Global |
| **Comodo** | `8.26.56.26` | `8.20.247.20` | Global |
| **DNSWATCH** | `84.200.69.80` | `84.200.70.40` | Europa |
| **Algar** | `200.225.197.34` | `200.225.197.37` | Brasil |
| **GigaDNS** | `189.38.95.95` | `189.38.95.96` | Brasil |
| **Claro** | `181.213.132.2` | `181.213.132.3` | Brasil |

### IPv6 (Internet Protocol version 6)

| Provedor | IP Primário | IP Secundário |
|----------|-------------|---------------|
| **Google** | `2001:4860:4860::8888` | `2001:4860:4860::8844` |
| **Cloudflare** | `2606:4700:4700::1111` | `2606:4700:4700::1001` |
| **Quad9** | `2620:fe::fe` | `2620:fe::9` |
| **OpenDNS** | `2620:119:35::35` | `2620:119:53::53` |

## ⚡ Como Funcionam os Testes

### 1. Detecção de Protocolo

A ferramenta detecta automaticamente se o IP inserido é IPv4 ou IPv6:

```javascript
// Exemplos de detecção
192.168.1.1         → IPv4 ✅
2001:db8::1        → IPv6 ✅
invalid.ip         → Inválido ❌
```

### 2. Seleção de Estratégia

Cada provedor e protocolo utiliza uma estratégia específica de teste:

#### **DNS over HTTPS (DoH)**
- **Usado para**: Google, Cloudflare, Quad9
- **Método**: Consultas DNS via HTTPS
- **Vantagem**: Testa a infraestrutura DNS real

#### **Conectividade Brasileira**
- **Usado para**: Algar, GigaDNS, Claro
- **Método**: Requisições para sites brasileiros
- **Vantagem**: Mede latência regional real

#### **Conectividade Global**
- **Usado para**: Outros provedores
- **Método**: Requisições para sites globais com presença no Brasil
- **Vantagem**: Balanceamento entre global e local

## 🔬 Estratégias de Teste

### IPv4 - Estratégias Específicas

#### **Google (`8.8.8.8`, `8.8.4.4`)**
```
Endpoint: https://dns.google/resolve?name=example.com&type=A
Método: DNS over HTTPS
Header: Accept: application/dns-json
Timeout: 1.5s
```

#### **Cloudflare (`1.1.1.1`, `1.0.0.1`)**
```
Endpoint: https://cloudflare-dns.com/dns-query?name=example.com&type=A
Método: DNS over HTTPS
Header: Accept: application/dns-json
Timeout: 1.5s
```

#### **Provedores Brasileiros (Algar, GigaDNS, Claro)**
```
Endpoints: 
- https://www.google.com.br/generate_204
- https://www.uol.com.br/favicon.ico
- https://g1.globo.com/favicon.ico
Método: HEAD request
Timeout: 1.5s
```

#### **Outros Provedores**
```
Endpoints:
- https://www.google.com/generate_204
- https://api.github.com/zen
- https://httpstat.us/200
Método: HEAD request
Timeout: 1.5s
```

### IPv6 - Estratégias Específicas

#### **Google IPv6**
```
Endpoint: https://dns.google/resolve?name=ipv6.google.com&type=AAAA
Método: DNS over HTTPS (consulta AAAA)
Header: Accept: application/dns-json
Timeout: 3s
```

#### **Cloudflare IPv6**
```
Endpoint: https://cloudflare-dns.com/dns-query?name=ipv6.cloudflare.com&type=AAAA
Método: DNS over HTTPS (consulta AAAA)
Header: Accept: application/dns-json
Timeout: 3s
```

#### **Outros Provedores IPv6**
```
Endpoints:
- https://ipv6.google.com/generate_204
- https://test-ipv6.com/json/
- https://ipv6-test.com/api/myip.php
Método: HEAD/GET request
Timeout: 3s
```

## ⏱️ Timeouts e Performance

### Timeouts Otimizados

| Protocolo | Timeout | Razão |
|-----------|---------|--------|
| **IPv4** | 1.5s | DNS queries respondem < 100ms, sites brasileiros < 500ms |
| **IPv6** | 3.0s | Tempo extra para tunneling e detecção de indisponibilidade |

### Sistema de Fallback

Se a estratégia principal falhar, o sistema usa fallbacks:

#### **Fallback IPv4**
```
Endpoint: https://www.google.com.br/generate_204
Método: HEAD request (mode: no-cors)
Timeout: 4s
```

#### **Fallback IPv6**
```
Endpoint: https://ipv6.google.com/generate_204
Método: HEAD request (mode: no-cors)
Timeout: 4s
```

## 🔧 Adicionando DNS Customizados

### Detecção Automática

A ferramenta detecta automaticamente o protocolo ao digitar:

```
Exemplos válidos:
✅ 8.8.8.8                    → IPv4
✅ 2001:4860:4860::8888      → IPv6
✅ 192.168.1.1               → IPv4
✅ ::1                       → IPv6

Exemplos inválidos:
❌ 256.256.256.256           → IPv4 inválido
❌ invalid::format::too      → IPv6 inválido
```

### Validação Visual

- **Verde**: IPv4 válido
- **Vermelho**: IPv6 válido
- **Laranja**: IP inválido

## 📊 Interpretando os Resultados

### Status dos Cards

| Status | Cor | Significado |
|--------|-----|-------------|
| **Online** | 🟢 Verde | DNS respondeu com sucesso |
| **Falha** | 🔴 Vermelho | DNS não conseguiu responder |
| **Aguardando** | 🟡 Amarelo | Teste em andamento |

### Ícones de Método

| Ícone | Significado |
|-------|-------------|
| 🔒 | DNS over HTTPS IPv4 |
| 🔒🆕 | DNS over HTTPS IPv6 |
| 🇧🇷 | Sites brasileiros |
| 🌐 | Sites globais |
| 🌐🆕 | Sites IPv6 |
| ⚙️ | DNS customizado |
| 🚀 | Fallback brasileiro |
| 🚀🆕 | Fallback IPv6 |

### Estatísticas

- **DNS Acessíveis**: Quantidade que respondeu com sucesso
- **DNS Inacessíveis**: Quantidade que falhou
- **Latência Média**: Tempo médio de resposta dos sucessos
- **Top 3 Mais Rápidos**: Ranking com medalhas e protocolos

## 🔍 Por Que Estes Testes?

### DNS over HTTPS vs Ping ICMP

**❌ Ping ICMP tradicional:**
- Muitos servidores bloqueiam ICMP
- Não reflete uso real do DNS
- Não testa a infraestrutura DNS

**✅ DNS over HTTPS:**
- Testa a infraestrutura DNS real
- Funciona através de firewalls
- Reflete performance real de navegação

### Estratégias Regionais

**Sites Brasileiros** para provedores nacionais:
- Mede latência regional real
- Evita roteamento internacional desnecessário
- Testa CDNs locais

**Sites Globais** para provedores internacionais:
- Aproveita presença global com edge no Brasil
- Testa performance de CDNs internacionais
- Simula acesso a conteúdo global

## 💻 Tecnologias Utilizadas

### Frontend
- **HTML5** com estrutura semântica
- **CSS3** com gradientes e animações
- **JavaScript ES6+** com async/await
- **Fetch API** para requisições
- **AbortController** para timeouts

### Funcionalidades Avançadas
- **Regex validation** para IPv4 e IPv6
- **Progressive Enhancement** com fallbacks
- **Responsive Design** para mobile
- **Real-time feedback** com spinners e progress bars

### Padrões Web
- **CORS handling** adequado
- **Content-Type negotiation** para DoH
- **Error handling** robusto
- **Accessibility** com ARIA labels

## 🚀 Como Usar

1. **Abra a ferramenta** no navegador
2. **Teste completo**: Clique em "Teste Completo" para testar todos os DNS
3. **DNS customizado**: Digite um IP e clique "Adicionar" para incluir seu próprio DNS
4. **Teste customizado**: Use "Testar Apenas Customizados" para testar só os seus
5. **Analise resultados**: Veja latência, status e estatísticas

## ⚠️ Limitações

- **CORS**: Alguns endpoints podem ter restrições
- **IPv6**: Nem todos os ISPs suportam IPv6 nativamente
- **Firewall**: Alguns firewalls podem bloquear requisições específicas
- **Browser**: Funcionalidade limitada a capacidades do navegador

## 🤝 Contribuições

Este projeto é open source. Sugestões de melhorias:

- **Novos provedores DNS**: Especialmente brasileiros
- **Otimizações de performance**: Melhores estratégias de teste
- **Funcionalidades**: Exportar resultados, histórico, etc.
- **Interface**: Melhorias de UX/UI

---

**Desenvolvido com ❤️ para a comunidade brasileira de tecnologia**
