#!/bin/bash

# Script de Instalação do Sistema de Diagnóstico WebUI
# install-diagnostic-webui.sh
# Versão: 1.0

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Verificar se está rodando como root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script deve ser executado como root (sudo)"
        exit 1
    fi
}

# Detectar servidor web
detect_webserver() {
    if systemctl is-active --quiet apache2 2>/dev/null; then
        WEBSERVER="apache2"
        WEBROOT="/var/www/html"
        CGI_DIR="/usr/lib/cgi-bin"
    elif systemctl is-active --quiet nginx 2>/dev/null; then
        WEBSERVER="nginx"
        WEBROOT="/var/www/html"
        CGI_DIR="/usr/lib/cgi-bin"
        log_warning "Nginx detectado. Será necessário configuração manual do CGI."
    elif systemctl is-active --quiet lighttpd 2>/dev/null; then
        WEBSERVER="lighttpd"
        WEBROOT="/var/www/html"
        CGI_DIR="/usr/lib/cgi-bin"
    else
        log_warning "Nenhum servidor web ativo detectado. Tentando instalar Apache..."
        install_apache
        WEBSERVER="apache2"
        WEBROOT="/var/www/html"
        CGI_DIR="/usr/lib/cgi-bin"
    fi
    
    log_success "Servidor web detectado: $WEBSERVER"
    log "Diretório web: $WEBROOT"
    log "Diretório CGI: $CGI_DIR"
}

# Instalar Apache
install_apache() {
    log "Instalando Apache..."
    
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        apt-get install -y apache2
        a2enmod cgi
        systemctl enable apache2
        systemctl start apache2
    elif command -v yum >/dev/null 2>&1; then
        yum install -y httpd
        systemctl enable httpd
        systemctl start httpd
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y httpd
        systemctl enable httpd
        systemctl start httpd
    else
        log_error "Gerenciador de pacotes não suportado"
        exit 1
    fi
    
    log_success "Apache instalado e configurado"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        apt-get install -y bc curl dnsutils smartmontools
    elif command -v yum >/dev/null 2>&1; then
        yum install -y bc curl bind-utils smartmontools
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y bc curl bind-utils smartmontools
    else
        log_warning "Gerenciador de pacotes não suportado. Instale manualmente: bc, curl, bind-utils/dnsutils, smartmontools"
    fi
    
    log_success "Dependências instaladas"
}

# Criar diretórios necessários
create_directories() {
    log "Criando diretórios necessários..."
    
    mkdir -p "$WEBROOT"
    mkdir -p "$CGI_DIR"
    mkdir -p "/usr/local/bin"
    mkdir -p "/var/log/diagnostic-webui"
    
    log_success "Diretórios criados"
}

# Criar script de diagnóstico
create_diagnostic_script() {
    log "Criando script de diagnóstico..."
    
    cat > /usr/local/bin/diagnostic-system.sh << 'EOF'
#!/bin/bash

version="v3.7 - 04.06.2025"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores de problemas
WARNINGS=0
ERRORS=0

# Função para log com timestamp
log_message() {
    echo -e "   $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Função para incrementar contadores
add_warning() { ((WARNINGS++)); }
add_error() { ((ERRORS++)); }

echo "============================================"
echo "Diagnóstico do Sistema $version"
echo "============================================"
echo ""

# Solicita senha de administrador
echo "Digite sua senha de administrador:"
echo ""
if sudo -v; then
    echo -e "${GREEN}✅ Autenticação realizada com sucesso!${NC}"
else
    echo -e "${RED}❌ Falha na autenticação!${NC}"
    exit 1
fi
echo ""
sleep 3

# Teste 01 - Verificando armazenamento (melhorado)
echo -e "${BLUE}🔍 Teste 01: Verificando armazenamento...${NC}"

# Verifica fstab vs montagens atuais
log_message "Verificando consistência do /etc/fstab..."
diskmount_output=$(sudo mount -a 2>&1)
diskmount_status=$?

if [ $diskmount_status -eq 0 ]; then
    echo -e "${GREEN}✅ OK: Todos os sistemas de arquivos do fstab estão montados${NC}"
else
    echo -e "${RED}❌ ERRO: Problemas na montagem de sistemas de arquivos!${NC}"
    echo "Detalhes: $diskmount_output"
    add_error
fi

echo ""
sleep 3

# Verifica sistemas de arquivos com erros
log_message "Verificando integridade dos sistemas de arquivos..."
fs_errors=$(dmesg | grep -i "ext[234]\|xfs\|btrfs" | grep -i "error\|corrupt\|remount.*read-only" | tail -10)
if [ -n "$fs_errors" ]; then
    echo -e "${RED}❌ ERRO: Detectados erros no sistema de arquivos!${NC}"
    echo "$fs_errors"
    add_error
else
    echo -e "${GREEN}✅ OK: Nenhum erro de sistema de arquivos detectado${NC}"
fi

echo ""
sleep 3

# Verifica dispositivos com bad blocks
log_message "Verificando armazenamento com possíveis BAD BLOCKS..."
smart_devices=$(lsblk -d -o NAME,TYPE | grep disk | awk '{print $1}')
for device in $smart_devices; do
    if command -v smartctl >/dev/null 2>&1; then
        smart_status=$(sudo smartctl -H /dev/"$device" 2>/dev/null | grep "SMART overall-health")
        if echo "$smart_status" | grep -q "FAILED"; then
            echo -e "${RED}❌ CRÍTICO: Dispositivo /dev/$device com falha SMART!${NC}"
            add_error
        else
            echo -e "${GREEN}✅ OK: Dispositivo /dev/$device sem problemas SMART para relatar.${NC}"
        fi
    fi
done
echo -e "OBSERVAÇÃO: Este assistente não consegue verificar SMART de discos em RAID por Hardware.${NC}"
echo ""
sleep 3

# Teste 02 - Verificando espaço em disco (melhorado)
echo -e "${BLUE}🔍 Teste 02: Verificando utilização de armazenamento...${NC}"

# Verifica 100% de uso
diskfull=$(df -h | awk '$5 == "100%" {print $0}')
if [ -z "$diskfull" ]; then
    echo -e "${GREEN}✅ OK: Nenhum disco com 100% de uso${NC}"
else
    echo -e "${RED}❌ CRÍTICO: Armazenamento(s) lotado(s)!${NC}"
    echo "$diskfull"
    add_error
fi

echo ""
sleep 3

# Verifica uso acima de 90%
log_message "Verificando uso acima de 90%..."
disk_high=$(df -h | awk 'NR>1 && $5 != "-" {gsub(/%/, "", $5); if ($5 > 90) print $0}')
if [ -n "$disk_high" ]; then
    echo -e "${YELLOW}⚠️  AVISO: Armazenamento(s) com mais de 90% de uso:${NC}"
    echo "$disk_high"
    add_warning
else
    echo -e "${GREEN}✅ OK: Nenhum disco com +90% de uso${NC}"
fi

echo ""
sleep 3

# Verifica inodes
log_message "Verificando utilização de inodes..."
inode_full=$(df -i | awk 'NR>1 && $5 != "-" {gsub(/%/, "", $5); if ($5 > 95) print $0}')
if [ -n "$inode_full" ]; then
    echo -e "${RED}❌ ERRO: Sistema(s) de arquivo(s) com inodes esgotados!${NC}"
    echo "$inode_full"
    add_error
else
    echo -e "${GREEN}✅ OK: Nenhum disco com inodes esgotados${NC}"
fi
echo ""
sleep 3

echo -e "${BLUE}🔍 Teste 03: Verificando conectividade de rede...${NC}"

dns_servers=("1.1.1.1" "1.0.0.1" "8.8.8.8" "8.8.4.4" "208.67.222.222" "208.67.220.220")
dns_working=0

for dns in "${dns_servers[@]}"; do
    ping_output=$(ping -c 1 -W 2 "$dns" 2>&1)
    ping_status=$?

    if [ $ping_status -eq 0 ]; then
        echo -e "${GREEN}✅ DNS $dns respondendo!${NC}"
        echo "$ping_output" | grep "time="
        ((dns_working++))
    else
        echo -e "${RED}❌ DNS $dns não está acessível!${NC}"
        echo "$ping_output"
    fi
done

echo ""
sleep 3

# Verifica interfaces de rede
log_message "Verificando interfaces de rede..."
network_down=$(ip -o link show | awk '/state DOWN/ {print $2,$17}')
if [ -n "$network_down" ]; then
    echo -e "${YELLOW}⚠️  AVISO: Interface(s) de rede inativa(s) detectadas (ignore as interfaces BR-xxxxx, VIRBR0 e/ou DOCKER0):${NC}"
    echo "$network_down"
    add_warning
else
    echo -e "${GREEN}✅ Todas as interfaces de rede existentes estão ativas!${NC}"
fi

echo ""
sleep 3

# Verifica resolução DNS
log_message "Verificando resolução DNS..."
if ! nslookup google.com >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  AVISO: Problemas na resolução DNS${NC}"
    add_warning
else
  echo -e "${GREEN}✅ Resolução DNS OK, os seguintes dados foram coletados: ${NC}"
  meuipwan=$(dig @resolver4.opendns.com myip.opendns.com +short)
  meugateway=$(ip route get 1.1.1.1 | grep -oP 'via \K\S+')
  meudevice=$(ip route get 1.1.1.1 | grep -oP 'dev \K\S+')
  meuiplan=$(ip route get 1.1.1.1 | grep -oP 'src \K\S+')
  minhasubnet="${meugateway%.*}.0"
  echo -e "IP WAN   : $meuipwan \nIP LAN   : $meuiplan \nGateway  : $meugateway \nSubnet   : $minhasubnet \nInterface: $meudevice"
fi

echo ""
sleep 3

# Teste 04 - Verificando serviços essenciais (muito melhorado)
echo -e "${BLUE}🔍 Teste 04: Verificando serviços essenciais...${NC}"

# Lista de serviços críticos para verificar
critical_services=("ssh.socket" "systemd-resolved" "NetworkManager" "cron")

# Verifica serviços do sistema
for service in "${critical_services[@]}"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        echo -e "${GREEN}✅ OK: Serviço $service está ativo${NC}"
    else
        if systemctl list-unit-files --type=service | grep -q "^$service"; then
            echo -e "${YELLOW}⚠️  AVISO: Serviço $service está inativo, isso está correto?${NC}"
            add_warning
        fi
    fi
done

# Testando Docker (melhorado)
log_message "Verificando Docker..."
if systemctl is-active --quiet docker 2>/dev/null; then
    echo -e "${GREEN}✅ OK: Docker está ativo${NC}"
    
    # Verifica saúde do Docker
    if ! docker system df >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  AVISO: Docker não está respondendo adequadamente.${NC}"
        add_warning
    else
        echo -e "${GREEN}✅ OK: Docker está respondendo aos comandos normalmente.${NC}"
    fi
    
    # Verifica containers problemáticos
    exited_containers=$(docker ps -f status=exited -q 2>/dev/null)
    if [ -n "$exited_containers" ]; then
        exited_count=$(echo "$exited_containers" | wc -l)
        echo -e "${YELLOW}⚠️  AVISO: $exited_count container(s) em estado de EXITED, isto está correto?${NC}"
        docker ps -f status=exited --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        add_warning
    else
        echo -e "${GREEN}✅ OK: Containers ativos e operando normalmente de acordo com o sistema.${NC}"
    fi
    
    restarting_containers=$(docker ps -f status=restarting -q 2>/dev/null)
    if [ -n "$restarting_containers" ]; then
        echo -e "${RED}❌ ERRO: Container(s) em estado de restart infinito!${NC}"
        docker ps -f status=restarting --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        add_error
    else
        echo -e "${GREEN}✅ OK: Não há containers reiniciando em estado de erro.${NC}"
    fi
    
    # Verifica containers com uso alto de recursos
    high_cpu_containers=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" | awk 'NR>1 {gsub(/%/, "", $2); if ($2 > 80) print $0}')
    if [ -n "$high_cpu_containers" ]; then
        echo -e "${YELLOW}⚠️  AVISO: Container(s) com alto uso de CPU:${NC}"
        echo "$high_cpu_containers"
        add_warning
    else
        echo -e "${GREEN}✅ OK: Não há containers com alto consumo de CPU.${NC}"
    fi
    
elif command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ ERRO: Docker está instalado mas não está executando! Isso está correto?${NC}"
    add_error
else
    echo -e "${GREEN}✅ OK: Docker não está instalado, mas isto está correto?${NC}"
fi

# Testando LibVirt (melhorado)
log_message "Verificando LibVirt..."
if systemctl is-active --quiet libvirtd 2>/dev/null; then
    echo -e "${GREEN}✅ OK: LibVirt está ativo e operando.${NC}"
    
    # Verifica VMs com problemas
    if command -v virsh >/dev/null 2>&1; then
        vm_problems=$(sudo virsh list --all | grep -E "shut off|crashed|paused")
        if [ -n "$vm_problems" ]; then
            echo -e "${YELLOW}⚠️  AVISO: VMs em algum estado de pausa, travado ou desligado:${NC}"
            echo "$vm_problems"
            add_warning
        else
            echo -e "${GREEN}✅ OK: As VMs existentes estão executando.${NC}"
        fi
    fi
elif command -v libvirtd >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  AVISO: LibVirt está instalado mas não está executando!${NC}"
    add_warning
else
    echo -e "${GREEN}✅ OK: LibVirt não está instalado neste servidor. Sem capacidades de virtualização.${NC}"
fi
echo ""
sleep 3

# Teste 05 - Verificações adicionais de sistema
echo -e "${BLUE}🔍 Teste 05: Verificações adicionais do sistema...${NC}"

# Verifica carga do sistema
load_avg=$(uptime | awk '{print $(NF-2)}' | sed 's/,//')
cpu_cores=$(nproc)
if (( $(echo "$load_avg > $cpu_cores * 2" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "${YELLOW}⚠️  AVISO: Carga do sistema alta ($load_avg com $cpu_cores cores)${NC}"
    add_warning
else
    echo -e "${GREEN}✅ OK: Carga do sistema normal ($load_avg)${NC}"
fi

# Verifica memória
mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$mem_usage" -gt 90 ]; then
    echo -e "${RED}❌ ERRO: Uso de memória alto crítico (${mem_usage}%)${NC}"
    add_error
elif [ "$mem_usage" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  AVISO: Uso de memória alto (${mem_usage}%)${NC}"
    add_warning
else
    echo -e "${GREEN}✅ OK: Uso de memória normal (${mem_usage}%)${NC}"
fi

# Verifica processos zumbis
zombies=$(ps aux | awk '$8 ~ /^Z/ { count++ } END { print count+0 }')
if [ "$zombies" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  AVISO: $zombies processo(s) zumbi detectado(s)${NC}"
    add_warning
else
    echo -e "${GREEN}✅ OK: Nenhum processo zumbi detectado.${NC}"
fi

# Verifica logs de erro recentes
log_message "Verificando logs de sistema..."
recent_errors=$(journalctl --since "1 hour ago" -p err -q --no-pager | wc -l)
if [ "$recent_errors" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  AVISO: $recent_errors erros no log da última hora${NC}"
    add_warning
fi

echo ""
echo "============================================"
echo -e "${BLUE}📊 RESUMO DO DIAGNÓSTICO${NC}"
echo "============================================"
log_message "Diagnóstico concluído"
echo -e "Erros críticos encontrados: ${RED}$ERRORS${NC}"
echo -e "Avisos encontrados: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 SISTEMA SAUDÁVEL: Nenhum problema detectado!${NC}"
    echo ""
    sleep 5
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  SISTEMA COM AVISOS: Verificar itens mencionados${NC}"
    echo ""
    sleep 5
    exit 1
else
    echo -e "${RED}🚨 SISTEMA COM PROBLEMAS CRÍTICOS: Ação imediata necessária!${NC}"
    echo ""
    sleep 5
    exit 2
fi
EOF

    chmod +x /usr/local/bin/diagnostic-system.sh
    log_success "Script de diagnóstico criado em /usr/local/bin/diagnostic-system.sh"
}

# Criar script CGI
create_cgi_script() {
    log "Criando script CGI..."
    
    cat > "$CGI_DIR/system-diagnostic.cgi" << 'EOFCGI'
#!/bin/bash

# CGI Script para Sistema de Diagnóstico
# system-diagnostic.cgi
# Versão: 1.0

# Cabeçalhos CGI
echo "Content-Type: text/plain"
echo "Cache-Control: no-cache"
echo ""

# Diretório onde está o script de diagnóstico
DIAGNOSTIC_SCRIPT="/usr/local/bin/diagnostic-system.sh"

# Função para log de debug (opcional)
log_debug() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEBUG: $1" >> /var/log/diagnostic-webui/debug.log 2>/dev/null || true
}

# Função para retornar erro JSON
return_error() {
    echo "{\"status\":\"error\",\"message\":\"$1\"}"
    exit 1
}

# Função para retornar sucesso
return_success() {
    echo "$1"
    exit 0
}

# Verificar se o script de diagnóstico existe
if [ ! -f "$DIAGNOSTIC_SCRIPT" ]; then
    return_error "Script de diagnóstico não encontrado em $DIAGNOSTIC_SCRIPT"
fi

# Verificar se o script é executável
if [ ! -x "$DIAGNOSTIC_SCRIPT" ]; then
    return_error "Script de diagnóstico não é executável"
fi

# Ler dados POST
if [ "$REQUEST_METHOD" = "POST" ]; then
    read -r POST_DATA
else
    return_error "Método não suportado. Use POST."
fi

# Decodificar URL
decode_url() {
    echo -e "$(echo "$1" | sed 's/+/ /g; s/%\([0-9a-fA-F][0-9a-fA-F]\)/\\x\1/g')"
}

# Parsear parâmetros POST
parse_params() {
    local data="$1"
    IFS='&' read -ra PARAMS <<< "$data"
    
    declare -A PARSED
    for param in "${PARAMS[@]}"; do
        IFS='=' read -ra KV <<< "$param"
        if [ ${#KV[@]} -eq 2 ]; then
            key=$(decode_url "${KV[0]}")
            value=$(decode_url "${KV[1]}")
            PARSED["$key"]="$value"
        fi
    done
    
    # Exportar como variáveis globais
    ACTION="${PARSED[action]}"
    TEST_TYPE="${PARSED[test]}"
}

# Parsear dados recebidos
parse_params "$POST_DATA"

log_debug "Ação recebida: $ACTION"
log_debug "Tipo de teste: $TEST_TYPE"

# Executar ação baseada no parâmetro
case "$ACTION" in
    "full-diagnostic")
        log_debug "Executando diagnóstico completo"
        
        # Executar o script completo
        if output=$($DIAGNOSTIC_SCRIPT 2>&1); then
            return_success "$output"
        else
            return_error "Erro ao executar diagnóstico completo: $output"
        fi
        ;;
        
    "ping")
        log_debug "Ping recebido"
        return_success "pong"
        ;;
        
    "system-info")
        log_debug "Coletando informações do sistema"
        
        if output=$(timeout 30 bash -c "
            echo '📊 INFORMAÇÕES DO SISTEMA'
            echo '=========================='
            echo ''
            echo '🖥️  Sistema Operacional:'
            if [ -f /etc/os-release ]; then
                source /etc/os-release
                echo \"   Distro: \$PRETTY_NAME\"
                echo \"   Versão: \$VERSION\"
            else
                echo '   Informações não disponíveis'
            fi
            echo ''
            
            echo '💻 Hardware:'
            echo \"   CPU: \$(nproc) núcleo(s)\"
            echo \"   Modelo: \$(cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d: -f2 | sed 's/^ *//')\"
            echo \"   Memória Total: \$(free -h | awk 'NR==2{print \$2}')\"
            echo \"   Memória Usada: \$(free -h | awk 'NR==2{print \$3}')\"
            echo \"   Memória Livre: \$(free -h | awk 'NR==2{print \$4}')\"
            echo ''
            
            echo '💾 Armazenamento:'
            df -h | grep -E '^/dev/' | while read line; do
                echo \"   \$line\"
            done
            echo ''
            
            echo '🔗 Rede:'
            ip -o link show | grep -E 'state UP' | while read line; do
                interface=\$(echo \$line | awk '{print \$2}' | sed 's/://')
                state=\$(echo \$line | awk '{print \$9}')
                echo \"   Interface \$interface: \$state\"
            done
            echo ''
            
            echo '⏰ Sistema:'
            echo \"   Uptime: \$(uptime -p)\"
            echo \"   Data/Hora: \$(date)\"
            echo \"   Carga: \$(uptime | awk '{print \$(NF-2), \$(NF-1), \$NF}')\"
            echo ''
            
            echo '🔧 Serviços Principais:'
            services=('ssh' 'cron' 'systemd-resolved' 'NetworkManager')
            for service in \"\${services[@]}\"; do
                if systemctl is-active --quiet \$service 2>/dev/null; then
                    echo \"   \$service: ✅ Ativo\"
                else
                    echo \"   \$service: ❌ Inativo\"
                fi
            done
        " 2>&1); then
            return_success "$output"
        else
            return_error "Erro ao coletar informações do sistema"
        fi
        ;;
        
    *)
        return_error "Ação não reconhecida: $ACTION"
        ;;
esac

# Se chegou até aqui, algo deu errado
return_error "Erro interno do script"
EOFCGI

    chmod +x "$CGI_DIR/system-diagnostic.cgi"
    log_success "Script CGI criado em $CGI_DIR/system-diagnostic.cgi"
}

# Criar página HTML
create_html_page() {
    log "Criando página HTML..."
    
    # Copiar o conteúdo HTML do sistema de diagnóstico
    cat > "$WEBROOT/system-diagnostic.html" << 'EOFHTML'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Diagnóstico WebUI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        .header p { font-size: 1.1em; opacity: 0.9;}
        .main-content { padding: 40px; }
        
        .menu-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .menu-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            border: 2px solid transparent;
            text-align: center;
        }
        
        .menu-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            border-color: #3498db;
        }
        
        .menu-card h3 { 
            color: #2c3e50; 
            margin-bottom: 15px; 
            font-size: 1.3em;
        }
        
        .menu-card p { 
            color: #7f8c8d; 
            line-height: 1.6;
        }
        
        .menu-card.full-diagnostic {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
        }
        
        .menu-card.full-diagnostic h3,
        .menu-card.full-diagnostic p {
            color: white;
        }
        
        .btn {
            background: #3498db;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s ease;
            margin: 5px;
        }
        
        .btn:hover { background: #2980b9;}
        .btn-success { background: #27ae60;}
        .btn-success:hover { background: #229954;}
        .btn-danger { background: #e74c3c;}
        .btn-danger:hover { background: #c0392b;}
        .btn-warning { background: #f39c12;}
        .btn-warning:hover { background: #e67e22;}
        
        .loading {
            display: none;
            text-align: center;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 10px;
            margin: 20px 0;
        }
        
        .loading.active { display: block;}
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(360deg);} }
        
        .result-container {
            margin-top: 20px;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #3498db;
            display: none;
        }
        
        .result-container.active { display: block;}
        
        .result-container.success {
            border-left-color: #27ae60;
            background: #d4edda;
        }
        
        .result-container.error {
            border-left-color: #e74c3c;
            background: #f8d7da;
        }
        
        .result-container.warning {
            border-left-color: #f39c12;
            background: #fff3cd;
        }
        
        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .result-header h4 {
            margin: 0;
            color: #2c3e50;
            font-size: 1.2em;
        }
        
        .result-actions {
            display: flex;
            gap: 10px;
        }
        
        .result-content {
            font-family: 'Courier New', monospace;
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            line-height: 1.6;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .system-info {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }
        
        .system-info h4 {
            color: #1976D2;
            margin-bottom: 10px;
        }
        
        .system-info p {
            color: #1976D2;
            margin-bottom: 5px;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
            display: none;
        }
        
        .alert.active { display: block;}
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert-warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Sistema de Diagnóstico</h1>
            <p>Interface Web para Diagnóstico e Monitoramento do Sistema - v3.7</p>
        </div>

        <div class="main-content">
            <div id="main-menu" class="menu-grid">
                <div class="menu-card full-diagnostic" onclick="runFullDiagnostic()">
                    <h3>🚀 Diagnóstico Completo</h3>
                    <p>Executa todos os testes de diagnóstico do sistema de uma vez.</p>
                </div>

                <div class="menu-card" onclick="showSystemInfo()">
                    <h3>ℹ️ Informações do Sistema</h3>
                    <p>Exibe informações detalhadas sobre o sistema.</p>
                </div>
            </div>

            <div id="system-info" class="system-info" style="display: none;">
                <h4>📊 Informações do Sistema</h4>
                <div id="system-details">
                    <p>🔄 Carregando informações...</p>
                </div>
            </div>

            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p id="loading-text">Executando diagnóstico do sistema...</p>
            </div>

            <div id="result-container" class="result-container">
                <div class="result-header">
                    <h4 id="result-title">Resultado do Diagnóstico</h4>
                    <div class="result-actions">
                        <button class="btn btn-success" onclick="downloadResults()">📥 Baixar</button>
                        <button class="btn" onclick="printResults()">🖨️ Imprimir</button>
                        <button class="btn btn-warning" onclick="clearResults()">🗑️ Limpar</button>
                    </div>
                </div>
                
                <div id="result-content" class="result-content"></div>
            </div>

            <div id="alert-container" class="alert"></div>
        </div>
    </div>

    <script>
        const CGI_URL = '/cgi-bin/system-diagnostic.cgi';
        
        async function runFullDiagnostic() {
            showLoading('Executando diagnóstico completo do sistema...');
            
            try {
                const response = await fetch(CGI_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'full-diagnostic'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.text();
                showResults(data, 'Diagnóstico Completo');
                
            } catch (error) {
                hideLoading();
                showAlert('Erro ao executar diagnóstico: ' + error.message, 'error');
            }
        }

        async function showSystemInfo() {
            const infoContainer = document.getElementById('system-info');
            const detailsElement = document.getElementById('system-details');
            
            infoContainer.style.display = 'block';
            detailsElement.innerHTML = '<p>🔄 Carregando informações do sistema...</p>';
            
            try {
                const response = await fetch(CGI_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'system-info'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.text();
                detailsElement.innerHTML = `<pre style="background: white; padding: 15px; border-radius: 8px; color: #2c3e50; font-family: monospace;">${data}</pre>`;
                
            } catch (error) {
                detailsElement.innerHTML = `<p style="color: #e74c3c;">❌ Erro ao carregar informações: ${error.message}</p>`;
            }
        }

        function showLoading(text = 'Processando...') {
            const loading = document.getElementById('loading');
            const loadingText = document.getElementById('loading-text');
            
            loadingText.textContent = text;
            loading.classList.add('active');
        }

        function hideLoading() {
            const loading = document.getElementById('loading');
            loading.classList.remove('active');
        }

        function showResults(output, testName) {
            hideLoading();
            
            const container = document.getElementById('result-container');
            const title = document.getElementById('result-title');
            const content = document.getElementById('result-content');
            
            title.textContent = `${testName} - ${new Date().toLocaleString('pt-BR')}`;
            content.innerHTML = `<pre>${output}</pre>`;
            
            // Analisar resultado para determinar classe CSS
            if (output.includes('SISTEMA SAUDÁVEL')) {
                container.className = 'result-container active success';
                showAlert('Diagnóstico concluído com sucesso! Sistema saudável.', 'success');
            } else if (output.includes('SISTEMA COM AVISOS')) {
                container.className = 'result-container active warning';
                showAlert('Diagnóstico concluído com avisos. Verificar itens mencionados.', 'warning');
            } else if (output.includes('PROBLEMAS CRÍTICOS')) {
                container.className = 'result-container active error';
                showAlert('Diagnóstico concluído com problemas críticos. Ação imediata necessária!', 'error');
            } else {
                container.className = 'result-container active';
                showAlert('Diagnóstico concluído.', 'success');
            }
        }

        function showAlert(message, type = 'success') {
            const alert = document.getElementById('alert-container');
            alert.textContent = message;
            alert.className = `alert alert-${type} active`;

            setTimeout(() => {
                alert.classList.remove('active');
            }, 5000);
        }

        function downloadResults() {
            const content = document.getElementById('result-content');
            if (!content.textContent.trim()) {
                showAlert('Nenhum resultado para baixar', 'warning');
                return;
            }

            const blob = new Blob([content.textContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `diagnostico-sistema-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showAlert('Resultado baixado com sucesso!', 'success');
        }

        function printResults() {
            const content = document.getElementById('result-content');
            if (!content.textContent.trim()) {
                showAlert('Nenhum resultado para imprimir', 'warning');
                return;
            }

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Diagnóstico do Sistema</title>
                        <style>
                            body { font-family: monospace; margin: 20px; }
                            pre { white-space: pre-wrap; font-size: 12px; }
                            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>🔍 Diagnóstico do Sistema</h1>
                            <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
                        </div>
                        <pre>${content.textContent}</pre>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }

        function clearResults() {
            const container = document.getElementById('result-container');
            const content = document.getElementById('result-content');
            
            container.classList.remove('active');
            content.innerHTML = '';
            
            showAlert('Resultados limpos', 'success');
        }

        // Verificar status do servidor CGI na inicialização
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                const response = await fetch(CGI_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'ping'
                    })
                });
                
                if (!response.ok) {
                    showAlert('⚠️ Aviso: Servidor CGI pode não estar disponível. Verifique a configuração.', 'warning');
                }
            } catch (error) {
                showAlert('⚠️ Aviso: Não foi possível conectar ao servidor CGI.', 'warning');
            }
        });
    </script>
</body>
</html>
EOFHTML

    log_success "Página HTML criada em $WEBROOT/system-diagnostic.html"
}

# Configurar permissões
configure_permissions() {
    log "Configurando permissões..."
    
    # Permissões para o script de diagnóstico
    chmod +x /usr/local/bin/diagnostic-system.sh
    
    # Permissões para o CGI
    chmod +x "$CGI_DIR/system-diagnostic.cgi"
    chown www-data:www-data "$CGI_DIR/system-diagnostic.cgi" 2>/dev/null || \
    chown apache:apache "$CGI_DIR/system-diagnostic.cgi" 2>/dev/null || \
    chown nginx:nginx "$CGI_DIR/system-diagnostic.cgi" 2>/dev/null || true
    
    # Permissões para logs
    chmod 755 /var/log/diagnostic-webui
    chown www-data:www-data /var/log/diagnostic-webui 2>/dev/null || \
    chown apache:apache /var/log/diagnostic-webui 2>/dev/null || \
    chown nginx:nginx /var/log/diagnostic-webui 2>/dev/null || true
    
    # Permissões para a página HTML
    chmod 644 "$WEBROOT/system-diagnostic.html"
    chown www-data:www-data "$WEBROOT/system-diagnostic.html" 2>/dev/null || \
    chown apache:apache "$WEBROOT/system-diagnostic.html" 2>/dev/null || \
    chown nginx:nginx "$WEBROOT/system-diagnostic.html" 2>/dev/null || true
    
    log_success "Permissões configuradas"
}

# Configurar Apache (se necessário)
configure_apache() {
    if [ "$WEBSERVER" = "apache2" ]; then
        log "Configurando Apache..."
        
        # Verificar se CGI já está habilitado
        if ! apache2ctl -M 2>/dev/null | grep -q cgi_module; then
            a2enmod cgi
            log "Módulo CGI habilitado no Apache"
        fi
        
        # Reiniciar Apache
        systemctl restart apache2
        log_success "Apache configurado e reiniciado"
    fi
}

# Configurar sudoers para permitir execução sem senha
configure_sudoers() {
    log "Configurando sudoers para execução CGI..."
    
    # Criar arquivo sudoers específico
    cat > /etc/sudoers.d/diagnostic-webui << 'EOFSUDO'
# Permitir que o usuário do servidor web execute comandos necessários para diagnóstico
www-data ALL=(root) NOPASSWD: /usr/local/bin/diagnostic-system.sh
www-data ALL=(root) NOPASSWD: /bin/mount
www-data ALL=(root) NOPASSWD: /usr/sbin/smartctl
www-data ALL=(root) NOPASSWD: /usr/bin/virsh
apache ALL=(root) NOPASSWD: /usr/local/bin/diagnostic-system.sh
apache ALL=(root) NOPASSWD: /bin/mount
apache ALL=(root) NOPASSWD: /usr/sbin/smartctl
apache ALL=(root) NOPASSWD: /usr/bin/virsh
nginx ALL=(root) NOPASSWD: /usr/local/bin/diagnostic-system.sh
nginx ALL=(root) NOPASSWD: /bin/mount
nginx ALL=(root) NOPASSWD: /usr/sbin/smartctl
nginx ALL=(root) NOPASSWD: /usr/bin/virsh
EOFSUDO

    chmod 440 /etc/sudoers.d/diagnostic-webui
    
    # Testar configuração sudoers
    if ! visudo -c -f /etc/sudoers.d/diagnostic-webui; then
        log_error "Erro na configuração do sudoers"
        rm -f /etc/sudoers.d/diagnostic-webui
        exit 1
    fi
    
    log_success "Sudoers configurado"
}

# Criar arquivo de configuração
create_config_file() {
    log "Criando arquivo de configuração..."
    
    cat > /etc/diagnostic-webui.conf << EOFCONFIG
# Configuração do Sistema de Diagnóstico WebUI
# /etc/diagnostic-webui.conf

# Versão
VERSION="1.0"

# Caminhos
DIAGNOSTIC_SCRIPT="/usr/local/bin/diagnostic-system.sh"
CGI_SCRIPT="$CGI_DIR/system-diagnostic.cgi"
HTML_PAGE="$WEBROOT/system-diagnostic.html"
LOG_DIR="/var/log/diagnostic-webui"

# Servidor Web
WEBSERVER="$WEBSERVER"
WEBROOT="$WEBROOT"
CGI_DIR="$CGI_DIR"

# Data de instalação
INSTALL_DATE="$(date)"
EOFCONFIG

    chmod 644 /etc/diagnostic-webui.conf
    log_success "Arquivo de configuração criado em /etc/diagnostic-webui.conf"
}

# Testar instalação
test_installation() {
    log "Testando instalação..."
    
    # Testar script de diagnóstico
    if [ -x /usr/local/bin/diagnostic-system.sh ]; then
        log_success "Script de diagnóstico: OK"
    else
        log_error "Script de diagnóstico: FALHA"
        exit 1
    fi
    
    # Testar script CGI
    if [ -x "$CGI_DIR/system-diagnostic.cgi" ]; then
        log_success "Script CGI: OK"
    else
        log_error "Script CGI: FALHA"
        exit 1
    fi
    
    # Testar página HTML
    if [ -f "$WEBROOT/system-diagnostic.html" ]; then
        log_success "Página HTML: OK"
    else
        log_error "Página HTML: FALHA"
        exit 1
    fi
    
    # Testar servidor web
    if systemctl is-active --quiet "$WEBSERVER" 2>/dev/null; then
        log_success "Servidor web ($WEBSERVER): OK"
    else
        log_warning "Servidor web ($WEBSERVER): Não está rodando"
    fi
    
    log_success "Todos os testes passaram!"
}

# Exibir informações finais
show_final_info() {
    echo ""
    echo "=============================================="
    log_success "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "=============================================="
    echo ""
    echo -e "${GREEN}📋 Informações da Instalação:${NC}"
    echo -e "   🌐 Servidor Web: $WEBSERVER"
    echo -e "   📁 Diretório Web: $WEBROOT"
    echo -e "   🔧 Diretório CGI: $CGI_DIR"
    echo -e "   📄 Página HTML: $WEBROOT/system-diagnostic.html"
    echo ""
    echo -e "${BLUE}🔗 Acesso ao Sistema:${NC}"
    echo -e "   http://localhost/system-diagnostic.html"
    echo -e "   http://$(hostname -I | awk '{print $1}')/system-diagnostic.html"
    echo ""
    echo -e "${YELLOW}📝 Arquivos Criados:${NC}"
    echo -e "   • /usr/local/bin/diagnostic-system.sh"
    echo -e "   • $CGI_DIR/system-diagnostic.cgi"
    echo -e "   • $WEBROOT/system-diagnostic.html"
    echo -e "   • /etc/diagnostic-webui.conf"
    echo -e "   • /etc/sudoers.d/diagnostic-webui"
    echo ""
    echo -e "${GREEN}✅ O sistema está pronto para uso!${NC}"
    echo ""
}

# Função principal
main() {
    echo "=============================================="
    echo "  INSTALADOR DO SISTEMA DE DIAGNÓSTICO WEBUI"
    echo "=============================================="
    echo ""
    
    check_root
    detect_webserver
    install_dependencies
    create_directories
    create_diagnostic_script
    create_cgi_script
    create_html_page
    configure_permissions
    configure_apache
    configure_sudoers
    create_config_file
    test_installation
    show_final_info
}

# Executar instalação
main "$@"
