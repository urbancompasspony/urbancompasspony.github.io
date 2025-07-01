# Sistema de Diagnóstico WebUI

Uma interface web moderna e intuitiva para executar diagnósticos completos do sistema Linux, baseada no script original de diagnóstico.

## 🚀 Características

- **Interface Web Responsiva**: Design moderno com gradientes e animações
- **Diagnóstico Completo**: Execução de todos os testes de uma vez
- **Testes Individuais**: Execução de testes específicos por categoria
- **Análise Inteligente**: Interpretação automática dos resultados
- **Relatórios**: Exportação em TXT e HTML
- **Informações do Sistema**: Painel com dados em tempo real
- **Compatibilidade**: Funciona com Apache, Nginx e Lighttpd

## 📋 Pré-requisitos

- Sistema Linux (Ubuntu, Debian, CentOS, RHEL, etc.)
- Servidor web (Apache, Nginx ou Lighttpd)
- Sudo/root para instalação
- Dependências: `bc`, `curl`, `dnsutils`/`bind-utils`, `smartmontools`

## 🔧 Instalação Rápida

### 1. Download e Execução do Instalador

```bash
# Baixar o script de instalação
curl -O https://raw.githubusercontent.com/seu-usuario/diagnostic-webui/main/install-diagnostic-webui.sh

# Dar permissão de execução
chmod +x install-diagnostic-webui.sh

# Executar como root
sudo ./install-diagnostic-webui.sh
```

### 2. Instalação Manual

Se preferir instalar manualmente, siga estes passos:

#### Passo 1: Instalar Dependências

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y apache2 bc curl dnsutils smartmontools
sudo a2enmod cgi
sudo systemctl enable apache2
sudo systemctl start apache2
```

**CentOS/RHEL:**
```bash
sudo yum install -y httpd bc curl bind-utils smartmontools
sudo systemctl enable httpd
sudo systemctl start httpd
```

#### Passo 2: Criar Diretórios
```bash
sudo mkdir -p /usr/local/bin
sudo mkdir -p /var/log/diagnostic-webui
```

#### Passo 3: Copiar Arquivos
```bash
# Copiar o script de diagnóstico
sudo cp diagnostic-system.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/diagnostic-system.sh

# Copiar o script CGI
sudo cp system-diagnostic.cgi /usr/lib/cgi-bin/
sudo chmod +x /usr/lib/cgi-bin/system-diagnostic.cgi

# Copiar a página HTML
sudo cp system-diagnostic.html /var/www/html/
```

#### Passo 4: Configurar Permissões
```bash
# Configurar sudoers
sudo tee /etc/sudoers.d/diagnostic-webui << EOF
www-data ALL=(root) NOPASSWD: /usr/local/bin/diagnostic-system.sh
www-data ALL=(root) NOPASSWD: /bin/mount
www-data ALL=(root) NOPASSWD: /usr/sbin/smartctl
www-data ALL=(root) NOPASSWD: /usr/bin/virsh
EOF

sudo chmod 440 /etc/sudoers.d/diagnostic-webui
```

## 🌐 Acesso ao Sistema

Após a instalação, acesse:
- **Local**: http://localhost/system-diagnostic.html
- **Rede**: http://SEU_IP/system-diagnostic.html

## 📊 Funcionalidades

### 1. Diagnóstico Completo
- Executa todos os testes sequencialmente
- Análise de armazenamento, rede, serviços e sistema
- Relatório completo com resumo executivo

### 2. Informações do Sistema
- Hardware (CPU, memória, armazenamento)
- Sistema operacional
- Interfaces de rede
- Serviços principais
- Uptime e carga do sistema

### 3. Testes Específicos (versão completa)
- **Armazenamento**: Integridade, SMART, uso de disco
- **Rede**: Conectividade, DNS, interfaces  
- **Serviços**: SSH, Docker, LibVirt, serviços críticos
- **Sistema**: Carga, memória, processos, logs

### 4. Relatórios
- **Download TXT**: Arquivo de texto simples
- **Download HTML**: Relatório formatado
- **Impressão**: Versão otimizada para impressão

## 🔧 Configuração Avançada

### Personalização do Script de Diagnóstico

O script principal está em `/usr/local/bin/diagnostic-system.sh` e pode ser personalizado:

```bash
sudo nano /usr/local/bin/diagnostic-system.sh
```

**Principais seções personalizáveis:**
- Lista de serviços críticos
- Servidores DNS para teste
- Limites de alerta (uso de disco, memória, CPU)
- Timeouts de comandos

### Configuração do Servidor Web

#### Apache
```bash
# Verificar se CGI está habilitado
sudo a2enmod cgi
sudo systemctl restart apache2

# Configuração adicional em /etc/apache2/sites-available/000-default.conf
<Directory "/usr/lib/cgi-bin">
    AllowOverride None
    Options +ExecCGI
    AddHandler cgi-script .cgi
    Require all granted
</Directory>
```

#### Nginx
```bash
# Instalar fcgiwrap para CGI
sudo apt install fcgiwrap

# Configuração no site (/etc/nginx/sites-available/default)
location ~ \.cgi$ {
    gzip off;
    root /usr/lib/cgi-bin;
    fastcgi_pass unix:/var/run/fcgiwrap.socket;
    include /etc/nginx/fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /usr/lib/cgi-bin$fastcgi_script_name;
}
```

### Logs e Monitoramento

**Logs do sistema:**
- `/var/log/diagnostic-webui/debug.log` - Debug do CGI
- `/var/log/apache2/error.log` - Erros do Apache
- `/var/log/nginx/error.log` - Erros do Nginx

**Monitoramento:**
```bash
# Verificar status dos serviços
sudo systemctl status apache2
sudo systemctl status nginx

# Testar CGI manualmente
curl -X POST http://localhost/cgi-bin/system-diagnostic.cgi -d "action=ping"
```

## 🐛 Solução de Problemas

### Erro 500 - Internal Server Error

**Possíveis causas:**
1. Permissões incorretas no script CGI
2. Módulo CGI não habilitado
3. Erro de sintaxe no script

**Soluções:**
```bash
# Verificar permissões
ls -la /usr/lib/cgi-bin/system-diagnostic.cgi

# Corrigir permissões
sudo chmod +x /usr/lib/cgi-bin/system-diagnostic.cgi
sudo chown www-data:www-data /usr/lib/cgi-bin/system-diagnostic.cgi

# Verificar logs
sudo tail -f /var/log/apache2/error.log
```

### Script de Diagnóstico Não Executa

**Verificar sudoers:**
```bash
sudo visudo -c -f /etc/sudoers.d/diagnostic-webui
```

**Testar manualmente:**
```bash
sudo -u www-data /usr/local/bin/diagnostic-system.sh
```

### Interface Não Carrega

**Verificar arquivos:**
```bash
ls -la /var/www/html/system-diagnostic.html
```

**Verificar servidor web:**
```bash
sudo systemctl status apache2
curl -I http://localhost/system-diagnostic.html
```

### Timeout nos Testes

**Ajustar timeouts no CGI:**
```bash
sudo nano /usr/lib/cgi-bin/system-diagnostic.cgi

# Procurar por "timeout 300" e ajustar conforme necessário
```

## 🛡️ Segurança

### Controle de Acesso

**Restringir por IP (Apache):**
```apache
<Directory "/var/www/html">
    <RequireAll>
        Require ip 192.168.1.0/24
        Require ip 10.0.0.0/8
    </RequireAll>
</Directory>
```

**Autenticação básica:**
```bash
# Criar arquivo de senhas
sudo htpasswd -c /etc/apache2/.htpasswd admin

# Configurar no VirtualHost
<Directory "/var/www/html">
    AuthType Basic
    AuthName "Sistema de Diagnóstico"
    AuthUserFile /etc/apache2/.htpasswd
    Require valid-user
</Directory>
```

### HTTPS

**Certificado SSL gratuito com Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d seu-dominio.com
```

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Sistemas Operacionais Testados
- Ubuntu 18.04, 20.04, 22.04
- Debian 9, 10, 11
- CentOS 7, 8
- RHEL 7, 8
- Amazon Linux 2

### Servidores Web
- Apache 2.4+
- Nginx 1.14+
- Lighttpd 1.4+

## 🔄 Atualizações

### Atualizar o Sistema
```bash
# Re-executar o instalador
sudo ./install-diagnostic-webui.sh

# Ou atualizar manualmente
sudo cp novos-arquivos/* /destino/
sudo systemctl restart apache2
```

### Backup da Configuração
```bash
# Fazer backup
sudo tar -czf diagnostic-webui-backup.tar.gz \
    /usr/local/bin/diagnostic-system.sh \
    /usr/lib/cgi-bin/system-diagnostic.cgi \
    /var/www/html/system-diagnostic.html \
    /etc/diagnostic-webui.conf \
    /etc/sudoers.d/diagnostic-webui

# Restaurar backup
sudo tar -xzf diagnostic-webui-backup.tar.gz -C /
```

## 📈 Performance

### Otimizações Recomendadas

**Cache de resultados:**
```bash
# Adicionar cache no CGI (exemplo)
CACHE_DIR="/tmp/diagnostic-cache"
CACHE_TIME=300  # 5 minutos
```

**Compressão de logs:**
```bash
# Configurar logrotate
sudo tee /etc/logrotate.d/diagnostic-webui << EOF
/var/log/diagnostic-webui/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
}
EOF
```

## 🤝 Contribuindo

### Estrutura do Projeto
```
diagnostic-webui/
├── install-diagnostic-webui.sh     # Script de instalação
├── diagnostic-system.sh            # Script principal de diagnóstico
├── system-diagnostic.cgi           # Interface CGI
├── system-diagnostic.html          # Interface web
├── README.md                       # Documentação
└── examples/                       # Exemplos de configuração
```

### Como Contribuir
1. Fork do projeto
2. Criar branch para feature (`git checkout -b feature/nova-feature`)
3. Commit das mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para branch (`git push origin feature/nova-feature`)
5. Criar Pull Request

## 📝 Changelog

### v1.0.0 (2025-01-07)
- Lançamento inicial
- Interface web completa
- Diagnóstico de armazenamento, rede, serviços e sistema
- Suporte a Apache, Nginx e Lighttpd
- Instalador automático
- Exportação de relatórios
- Painel de informações do sistema

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Autores

- **Desenvolvedor Principal** - Criação do sistema WebUI baseado no script original

## 🙏 Agradecimentos

- Baseado no script de diagnóstico original v3.7
- Inspirado na interface do domain-webui
- Comunidade Linux pela contribuição contínua

## 📞 Suporte

### Canais de Suporte
- **Issues GitHub**: Para bugs e feature requests
- **Documentação**: Wiki do projeto
- **Fórum**: Discussões da comunidade

### Informações de Debug
Para solicitar suporte, inclua:
1. Versão do sistema operacional
2. Servidor web utilizado
3. Logs de erro relevantes
4. Passos para reproduzir o problema

---

**Sistema de Diagnóstico WebUI** - Uma ferramenta moderna para administradores de sistema Linux.
