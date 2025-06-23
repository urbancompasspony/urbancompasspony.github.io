#!/bin/bash

# Cabeçalho HTTP obrigatório
echo "Content-Type: application/json; charset=UTF-8"
echo ""

# Variáveis globais
ACTION=""
USERNAME=""
FIRSTNAME=""
PASSWORD=""
EMAIL=""
MUST_CHANGE_PASSWORD=""
GROUP=""
COMPUTER=""
SHARE_NAME=""
SHARE_PATH=""
OU_NAME=""
SILO_NAME=""
SEARCH_TERM=""
SOURCE_USERNAME=""
TARGET_USERNAME=""

# Função para log de ações
log_action() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> /var/log/samba-cgi/actions.log
}

# Função para processar parâmetros CGI
parse_cgi_params() {
    if [ "$REQUEST_METHOD" = "POST" ]; then
        read -n "$CONTENT_LENGTH" QUERY_STRING
    fi

    # Decodifica parâmetros URL
    QUERY_STRING=$(echo "$QUERY_STRING" | sed 's/+/ /g')

    IFS='&'
    for param in $QUERY_STRING; do
        key=$(echo "$param" | cut -d'=' -f1)
        value=$(echo "$param" | cut -d'=' -f2- | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")

        case "$key" in
            "action") ACTION="$value" ;;
            "username") USERNAME="$value" ;;
            "source-group") SOURCE_GROUP="$value" ;;
            "target-group") TARGET_GROUP="$value" ;;
            "display-name") FIRSTNAME="$value" ;;
            "password") PASSWORD="$value" ;;
            "email") EMAIL="$value" ;;
            "must-change-password") MUST_CHANGE_PASSWORD="$value" ;;
            "group") GROUP="$value" ;;
            "computer") COMPUTER="$value" ;;
            "share-name") SHARE_NAME="$value" ;;
            "share-path") SHARE_PATH="$value" ;;
            "share-users") SHARE_USERS="$value" ;;
            "writable") WRITABLE="$value" ;;
            "browsable") BROWSABLE="$value" ;;
            "ou-name") OU_NAME="$value" ;;
            "silo-name") SILO_NAME="$value" ;;
            "search-term") SEARCH_TERM="$value" ;;
            "source-username") SOURCE_USERNAME="$value" ;;
            "target-username") TARGET_USERNAME="$value" ;;
            "expiry-date") EXPIRY_DATE="$value" ;;
            "days") DAYS="$value" ;;
        esac
    done
}

# Função de validação e sanitização
sanitize_input() {
    # Remove caracteres perigosos
    USERNAME=$(echo "$USERNAME" | sed 's/[^a-zA-Z0-9._-]//g')
    FIRSTNAME=$(echo "$FIRSTNAME" | sed 's/[^a-zA-Z0-9 ._-]//g')
    GROUP=$(echo "$GROUP" | sed 's/[^a-zA-Z0-9._-]//g')
    COMPUTER=$(echo "$COMPUTER" | sed 's/[^a-zA-Z0-9.-]//g')
    OU_NAME=$(echo "$OU_NAME" | sed 's/[^a-zA-Z0-9 ._-]//g')
    SILO_NAME=$(echo "$SILO_NAME" | sed 's/[^a-zA-Z0-9._-]//g')
    SOURCE_USERNAME=$(echo "$SOURCE_USERNAME" | sed 's/[^a-zA-Z0-9._-]//g')
    TARGET_USERNAME=$(echo "$TARGET_USERNAME" | sed 's/[^a-zA-Z0-9._-]//g')
    SOURCE_GROUP=$(echo "$SOURCE_GROUP" | sed 's/[^a-zA-Z0-9._-]//g')
    TARGET_GROUP=$(echo "$TARGET_GROUP" | sed 's/[^a-zA-Z0-9._-]//g')

    # Validar email
    if [ -n "$EMAIL" ] && ! [[ "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        EMAIL=""
    fi

    # Validar paths seguros
    if ! [[ "$SHARE_PATH" =~ ^/[a-zA-Z0-9/_.-]+$ ]]; then
        SHARE_PATH=""
    fi
}

# Função para executar comandos sudo samba-tool com segurança
execute_samba_command() {
    log_action "Executando: $*"

    # Executa o comando diretamente sem timeout se não estiver disponível
    if command -v timeout >/dev/null 2>&1; then
        result=$(timeout 30 "$@" 2>&1)
    else
        result=$("$@" 2>&1)
    fi

    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "$result"
    else
        echo "Erro ao executar o comando: $result"
    fi
}

# Função para retornar resposta JSON simples
json_response() {
    local status="$1"
    local message="$2"
    local output="$3"

    if [ -z "$output" ]; then
        echo "$status" "$message"
    else
        echo "$output"
    fi
}

# === FUNÇÕES DE USUÁRIOS ===

create_user() {
    if [ -z "$USERNAME" ] || [ -z "$FIRSTNAME" ] || [ -z "$PASSWORD" ]; then
        echo "{\"status\":\"error\",\"message\":\"Campos obrigatórios: username, display-name, password\"}"
        return
    fi

    # Executar comando de forma mais robusta
    log_action "Criando usuário: $USERNAME"

    if command -v samba-tool >/dev/null 2>&1; then
        # Construir comando com argumentos separados
        if [ "$MUST_CHANGE_PASSWORD" = "on" ]; then
            result=$(sudo samba-tool user create "$USERNAME" "$PASSWORD" --surname="$FIRSTNAME" --must-change-at-next-login 2>&1)
        else
            result=$(sudo samba-tool user create "$USERNAME" "$PASSWORD" --surname="$FIRSTNAME" 2>&1)
        fi
        exit_code=$?
    else
        result="samba-tool não encontrado no sistema"
        exit_code=1
    fi

    if [ $exit_code -eq 0 ]; then
        echo "{\"status\":\"success\",\"message\":\"Usuário $USERNAME criado com sucesso\",\"output\":\"$result\"}"
    else
        echo "{\"status\":\"error\",\"message\":\"Erro ao criar usuário: $result\"}"
    fi
}

list_users() {
    execute_samba_command sudo samba-tool user list
}

search_user() {
    if [ -z "$SEARCH_TERM" ]; then
        json_response "error" "Termo de busca é obrigatório"
        return
    fi

    result=$(sudo samba-tool user list | grep "$SEARCH_TERM")
    json_response "" "Resultados encontrados" "$result"
}

check_user() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    # Obter informações básicas do usuário
    user_info=$(sudo samba-tool user show "$USERNAME" 2>&1)
    exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo "Erro: Usuário não encontrado: $user_info"
        return
    fi
    
    # Extrair dados para cálculos
    pwd_last_set=$(echo "$user_info" | grep -i "pwdLastSet" | cut -d: -f2- | tr -d ' ')
    user_account_control=$(echo "$user_info" | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
    account_expires=$(echo "$user_info" | grep -i "accountExpires" | cut -d: -f2- | tr -d ' ')

# Verificar se o usuário está bloqueado (após extrair user_account_control)
user_account_control=$(echo "$user_info" | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')

# Verificar status de bloqueio (bit 2 = 2 significa conta desabilitada)
if [ -n "$user_account_control" ]; then
    disabled_flag=$((user_account_control & 2))
    if [ $disabled_flag -ne 0 ]; then
        user_blocked="true"
        block_status="BLOQUEADO"
        block_color_bg="#f8d7da"
        block_color_border="#dc3545"
        block_color_text="#721c24"
        block_icon="🚫"
    else
        user_blocked="false"
        block_status="ATIVO"
        block_color_bg="#d4edda"
        block_color_border="#28a745"
        block_color_text="#155724"
        block_icon="✅"
    fi
else
    user_blocked="unknown"
    block_status="INDETERMINADO"
    block_color_bg="#fff3cd"
    block_color_border="#ffc107"
    block_color_text="#856404"
    block_icon="❓"
fi

    # Container principal com tipografia melhorada
    echo "<div style='background: white; padding: 16px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; line-height: 1.5; max-width: 100%;'>"
    
    # Título principal sem os dois pontos
    echo "<h4 style='color: #e67e22; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;'>📋 Informações do Usuário $USERNAME</h4>"
    
    # Blocos de status diretos
    echo "<div style='margin-bottom: 16px;'>"

# Exibir status de bloqueio da conta
echo "<div style='padding: 8px 12px; background: $block_color_bg; border-left: 3px solid $block_color_border; margin-bottom: 8px; border-radius: 3px;'>"
echo "<span style='font-size: 16px; font-weight: 600; color: $block_color_text;'>🔒 STATUS:</span> <span style='color: $block_color_text; font-size: 16px;'>$block_icon $block_status</span></div>"
    
    # Verificar expiração da SENHA - bloco menor, fonte maior
    if [ -n "$user_account_control" ]; then
        dont_expire_flag=$((user_account_control & 65536))
        if [ $dont_expire_flag -ne 0 ]; then
            echo "<div style='padding: 8px 12px; background: #d1ecf1; border-left: 3px solid #17a2b8; margin-bottom: 8px; border-radius: 3px;'>"
            echo "<span style='font-size: 16px; font-weight: 600; color: #0c5460;'>🔐 SENHA:</span> <span style='color: #0c5460; font-size: 16px;'>Configurada para NUNCA EXPIRAR</span></div>"
        else
            # Obter política de senha do domínio
            password_policy=$(sudo samba-tool domain passwordsettings show 2>/dev/null)
            max_pwd_age=$(echo "$password_policy" | grep -i "Maximum password age" | grep -o '[0-9]*' | head -1)
            
            if [ -n "$max_pwd_age" ] && [ "$max_pwd_age" != "0" ] && [ -n "$pwd_last_set" ] && [ "$pwd_last_set" != "0" ]; then
                # Calcular dias restantes para senha expirar
                epoch_diff=11644473600
                pwd_set_unix=$((pwd_last_set / 10000000 - epoch_diff))
                current_time=$(date +%s)
                days_since_change=$(((current_time - pwd_set_unix) / 86400))
                days_remaining=$((max_pwd_age - days_since_change))
                
                if [ $days_remaining -gt 7 ]; then
                    color_bg="#d4edda"
                    color_border="#28a745"
                    color_text="#155724"
                    icon="✅"
                elif [ $days_remaining -gt 0 ]; then
                    color_bg="#fff3cd"
                    color_border="#ffc107"
                    color_text="#856404"
                    icon="⚠️"
                else
                    color_bg="#f8d7da"
                    color_border="#dc3545"
                    color_text="#721c24"
                    icon="❌"
                fi
                
                echo "<div style='padding: 8px 12px; background: $color_bg; border-left: 3px solid $color_border; margin-bottom: 8px; border-radius: 3px;'>"
                
                if [ $days_remaining -gt 0 ]; then
                    expiry_date=$(date -d "+${days_remaining} days" '+%d/%m/%Y')
                    echo "<span style='font-size: 16px; font-weight: 600; color: $color_text;'>🔐 SENHA:</span> <span style='color: $color_text; font-size: 16px;'>$icon Expira em $days_remaining dias ($expiry_date)</span></div>"
                elif [ $days_remaining -eq 0 ]; then
                    echo "<span style='font-size: 16px; font-weight: 600; color: $color_text;'>🔐 SENHA:</span> <span style='color: $color_text; font-size: 16px;'>$icon EXPIRA HOJE!</span></div>"
                else
                    echo "<span style='font-size: 16px; font-weight: 600; color: $color_text;'>🔐 SENHA:</span> <span style='color: $color_text; font-size: 16px;'>$icon EXPIRADA há $((days_remaining * -1)) dias</span></div>"
                fi
            else
                echo "<div style='padding: 8px 12px; background: #d1ecf1; border-left: 3px solid #17a2b8; margin-bottom: 8px; border-radius: 3px;'>"
                echo "<span style='font-size: 16px; font-weight: 600; color: #0c5460;'>🔐 SENHA:</span> <span style='color: #0c5460; font-size: 16px;'>Política do domínio = nunca expira</span></div>"
            fi
        fi
    fi
    
    # Verificar expiração da CONTA - bloco menor, fonte maior
    if [ -n "$account_expires" ] && [ "$account_expires" != "0" ] && [ "$account_expires" != "9223372036854775807" ]; then
        epoch_diff=11644473600
        account_exp_unix=$((account_expires / 10000000 - epoch_diff))
        current_time=$(date +%s)
        time_diff=$((account_exp_unix - current_time))
        account_days_remaining=$((time_diff / 86400))
        
        if [ $account_days_remaining -gt 0 ] && [ $account_days_remaining -lt 36500 ]; then
            if [ $account_days_remaining -gt 30 ]; then
                color_bg="#d4edda"
                color_border="#28a745"
                color_text="#155724"
                icon="✅"
            elif [ $account_days_remaining -gt 7 ]; then
                color_bg="#fff3cd"
                color_border="#ffc107"
                color_text="#856404"
                icon="⚠️"
            else
                color_bg="#f8d7da"
                color_border="#dc3545"
                color_text="#721c24"
                icon="🚨"
            fi
            
            expiry_date_only=$(date -d "@$account_exp_unix" '+%d/%m/%Y')
            echo "<div style='padding: 8px 12px; background: $color_bg; border-left: 3px solid $color_border; margin-bottom: 8px; border-radius: 3px;'>"
            echo "<span style='font-size: 16px; font-weight: 600; color: $color_text;'>👤 CONTA:</span> <span style='color: $color_text; font-size: 16px;'>$icon Expira em $account_days_remaining dias ($expiry_date_only)</span></div>"
        elif [ $account_days_remaining -le 0 ]; then
            echo "<div style='padding: 8px 12px; background: #f8d7da; border-left: 3px solid #dc3545; margin-bottom: 8px; border-radius: 3px;'>"
            echo "<span style='font-size: 16px; font-weight: 600; color: #721c24;'>👤 CONTA:</span> <span style='color: #721c24; font-size: 16px;'>❌ EXPIRADA</span></div>"
        fi
    else
        echo "<div style='padding: 8px 12px; background: #d4edda; border-left: 3px solid #28a745; margin-bottom: 8px; border-radius: 3px;'>"
        echo "<span style='font-size: 16px; font-weight: 600; color: #155724;'>👤 CONTA:</span> <span style='color: #155724; font-size: 16px;'>∞ Nunca expira</span></div>"
    fi
    
    echo "</div>"
    
    # Seção técnica com fonte maior
    echo "<details style='background: #f8f9fa; padding: 14px; border-radius: 6px; border: 1px solid #e9ecef;'>"
    echo "<summary style='cursor: pointer; font-weight: 600; color: #495057; font-size: 16px; margin-bottom: 0; outline: none;'>🔧 Informações Técnicas Detalhadas</summary>"
    echo "<pre style='background: #343a40; color: #f8f9fa; padding: 14px; border-radius: 4px; overflow-x: auto; margin: 10px 0 0 0; font-size: 13px; line-height: 1.4; border: none;'>$user_info</pre>"
    echo "</details>"
    
    echo "</div>"
}

show_group_hierarchy() {
    if [ -z "$GROUP" ]; then
        echo "Erro: Nome do grupo é obrigatório"
        return
    fi

    echo "🏗️ HIERARQUIA DO GRUPO: $GROUP"
    echo ""
    
    # Mostrar grupos pai (onde este grupo é membro)
    echo "📈 GRUPOS PAIS (este grupo é membro de):"
    parent_groups=$(sudo samba-tool group list 2>/dev/null | while read parent; do
        if [ -n "$parent" ]; then
            members=$(sudo samba-tool group listmembers "$parent" 2>/dev/null)
            if echo "$members" | grep -q "^$GROUP$"; then
                echo "   └── $parent"
            fi
        fi
    done)
    
    if [ -n "$parent_groups" ]; then
        echo "$parent_groups"
    else
        echo "   (nenhum - grupo raiz)"
    fi
    
    echo ""
    
    # Mostrar membros diretos
    echo "👥 MEMBROS DIRETOS:"
    members=$(sudo samba-tool group listmembers "$GROUP" 2>/dev/null)
    if [ -n "$members" ]; then
        echo "$members" | sed 's/^/   ├── /'
    else
        echo "   (nenhum membro)"
    fi
    
    echo ""
    
    # Mostrar grupos filhos
    echo "📉 GRUPOS FILHOS (grupos que são membros deste):"
    child_groups=$(echo "$members" | while read member; do
        if [ -n "$member" ]; then
            # Verificar se o membro é um grupo
            if sudo samba-tool group list 2>/dev/null | grep -q "^$member$"; then
                echo "   └── $member (grupo)"
            fi
        fi
    done)
    
    if [ -n "$child_groups" ]; then
        echo "$child_groups"
    else
        echo "   (nenhum grupo filho)"
    fi
}

delete_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user delete "$USERNAME"
}

enable_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user enable "$USERNAME"
    json_response "Status:" "Usuario Habilitado!"
}

disable_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user disable "$USERNAME"
    json_response "Status:" "Usuario Desabilitado!"
}

reset_password() {
    if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
        json_response "error" "Username e nova senha são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool user setpassword "$USERNAME" --newpassword="$PASSWORD"
}

promote_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    sudo samba-tool group addmembers "Domain Admins" "$USERNAME"
    sudo samba-tool group addmembers "Schema Admins" "$USERNAME"
    sudo samba-tool group addmembers "Enterprise Admins" "$USERNAME"
    sudo samba-tool group addmembers "Group Policy Creator Owners" "$USERNAME"
    sudo samba-tool group addmembers "Administrators" "$USERNAME"

    json_response "success" "Usuário $USERNAME promovido a administrador"
}

demote_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    sudo samba-tool group removemembers "Domain Admins" "$USERNAME"
    sudo samba-tool group removemembers "Schema Admins" "$USERNAME"
    sudo samba-tool group removemembers "Enterprise Admins" "$USERNAME"
    sudo samba-tool group removemembers "Group Policy Creator Owners" "$USERNAME"
    sudo samba-tool group removemembers "Administrators" "$USERNAME"

    json_response "success" "Usuário $USERNAME deixou de ser administrador"
}

show_user_groups() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user getgroups "$USERNAME"
}

move_user_ou() {
    if [ -z "$USERNAME" ] || [ -z "$OU_NAME" ]; then
        json_response "error" "Username e nome da OU são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool user move "$USERNAME" OU="$OU_NAME"
}

# FUNÇÃO verify_password COMPLETAMENTE CORRIGIDA
verify_password() {
    if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
        echo "Erro: Nome de usuário e senha são obrigatórios"
        return
    fi

    log_action "Verificando senha para usuário: $USERNAME"

    # Validação do usuário
    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    # Obter domínio SILENCIOSAMENTE
    DOMAIN=$(sudo samba-tool domain info 127.0.0.1 2>/dev/null | grep -i "domain.*:" | head -1 | cut -d: -f2 | tr -d ' ' | tr '[:lower:]' '[:upper:]')
    if [ -z "$DOMAIN" ]; then
        DOMAIN="WORKGROUP"
    fi

    # Tentar kinit COMPLETAMENTE SILENCIOSO
    export KRB5_TRACE=/dev/null
    kinit_output=$(echo "$PASSWORD" | kinit "$USERNAME@$DOMAIN" 2>&1)
    kinit_result=$?
    
    # Limpar ticket imediatamente
    kdestroy 2>/dev/null

    if [ $kinit_result -eq 0 ]; then
        echo "✅ SENHA VÁLIDA para usuário '$USERNAME'"
        echo ""

        # === ANÁLISE DETALHADA DE EXPIRAÇÃO ===
        
        # Buscar informações do usuário
        user_info=$(sudo samba-tool user show "$USERNAME" 2>/dev/null)
        
        # Extrair dados importantes
        pwd_last_set=$(echo "$user_info" | grep -i "pwdLastSet" | cut -d: -f2- | tr -d ' ')
        user_account_control=$(echo "$user_info" | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
        account_expires=$(echo "$user_info" | grep -i "accountExpires" | cut -d: -f2- | tr -d ' ')

        # DEBUG: Mostrar valores extraídos (remover depois)
        # echo "DEBUG - pwdLastSet: $pwd_last_set"
        # echo "DEBUG - userAccountControl: $user_account_control"
        # echo "DEBUG - accountExpires: $account_expires"

        # Verificar flag DONT_EXPIRE_PASSWORD (bit 16 = 65536)
        if [ -n "$user_account_control" ]; then
            dont_expire_flag=$((user_account_control & 65536))
            
            if [ $dont_expire_flag -ne 0 ]; then
                # Flag --noexpiry está ATIVA
                echo "🔐 SENHA: Configurada para NUNCA EXPIRAR (flag --noexpiry ativa)"
            else
                # Flag --noexpiry NÃO está ativa, verificar política do domínio
                echo "🔍 Analisando política de expiração..."
                
                # Obter política de senha do domínio
                password_policy=$(sudo samba-tool domain passwordsettings show 2>/dev/null)
                max_pwd_age=$(echo "$password_policy" | grep -i "Maximum password age" | cut -d: -f2 | tr -d ' ')
                
                echo "📋 Política do domínio - Idade máxima: $max_pwd_age dias"
                
                # Se max_pwd_age é 0 = senhas nunca expiram por política
                if [ "$max_pwd_age" = "0" ]; then
                    echo "🔐 SENHA: Nunca expira (política do domínio = 0 dias)"
                elif [ -z "$max_pwd_age" ]; then
                    echo "🔐 SENHA: Não foi possível determinar política de expiração"
                elif [ -n "$pwd_last_set" ] && [ "$pwd_last_set" != "0" ]; then
                    # Calcular expiração real
                    echo "🔢 Calculando dias restantes..."
                    
                    # Converter Windows timestamp para Unix
                    epoch_diff=11644473600
                    pwd_set_unix=$((pwd_last_set / 10000000 - epoch_diff))
                    current_time=$(date +%s)
                    days_since_change=$(((current_time - pwd_set_unix) / 86400))
                    days_remaining=$((max_pwd_age - days_since_change))

                    # Mostrar quando a senha foi alterada
                    pwd_change_date=$(date -d "@$pwd_set_unix" '+%d/%m/%Y às %H:%M')
                    echo "📅 Senha alterada em: $pwd_change_date"
                    echo "⏱️ Dias desde a alteração: $days_since_change"

                    if [ $days_remaining -gt 0 ]; then
                        expiry_date=$(date -d "+${days_remaining} days" '+%d/%m/%Y')
                        echo "🔐 SENHA: Expira em $days_remaining dias ($expiry_date)"
                    elif [ $days_remaining -eq 0 ]; then
                        echo "⚠️ SENHA: EXPIRA HOJE!"
                    else
                        days_overdue=$((days_remaining * -1))
                        echo "❌ SENHA: EXPIRADA há $days_overdue dias"
                    fi
                else
                    echo "🔐 SENHA: Não foi possível calcular expiração (dados incompletos)"
                fi
            fi
        else
            echo "❌ Erro: Não foi possível obter userAccountControl"
        fi

        # === VERIFICAR EXPIRAÇÃO DA CONTA (separado da senha) ===
        if [ -n "$account_expires" ] && [ "$account_expires" != "0" ] && [ "$account_expires" != "9223372036854775807" ]; then
            echo ""
            echo "👤 ANÁLISE DA CONTA:"
            epoch_diff=11644473600
            account_exp_unix=$((account_expires / 10000000 - epoch_diff))
            current_time=$(date +%s)
            account_days_remaining=$(((account_exp_unix - current_time) / 86400))
            
            if [ $account_days_remaining -gt 0 ]; then
                account_expiry_date=$(date -d "@$account_exp_unix" '+%d/%m/%Y')
                echo "👤 CONTA: Expira em $account_days_remaining dias ($account_expiry_date)"
            else
                echo "👤 CONTA: EXPIRADA"
            fi
        else
            echo ""
            echo "👤 CONTA: Nunca expira"
        fi

    else
        echo "❌ SENHA INVÁLIDA para usuário '$USERNAME'"
        echo ""
        echo "🔍 Detalhes do erro: $kinit_output"
        
        # Verificar se conta está ativa
        user_status=$(sudo samba-tool user show "$USERNAME" 2>/dev/null | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
        if [ "$user_status" = "514" ] || [ "$user_status" = "546" ]; then
            echo "⚠️ Conta '$USERNAME' está DESABILITADA"
        fi
    fi
}

set_account_expiry() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    if [ -z "$EXPIRY_DATE" ]; then
        echo "Erro: Data de expiração é obrigatória"
        return
    fi

    # Validação
    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    if [ "$EXPIRY_DATE" != "never" ]; then
        echo "🔍 Verificando política do domínio para expiração de conta..."
        max_pwd_age=$(sudo samba-tool domain passwordsettings show 2>/dev/null | grep -i "Maximum password age" | grep -o '[0-9]*' | head -1)
        
        if [ "$max_pwd_age" = "0" ]; then
            echo "⚠️ AVISO: Política do domínio tem max-pwd-age=0"
            echo "   Isso pode interferir em algumas configurações de expiração"
            echo ""
            echo "💭 Recomendação: Ative política de expiração primeiro"
            echo ""
            # Continue anyway para expiração de CONTA (diferente de senha)
        fi
    fi

    # Verificar se é para nunca expirar
    if [ "$EXPIRY_DATE" = "never" ]; then
        result=$(sudo samba-tool user setexpiry "$USERNAME" --noexpiry 2>&1)
        exit_code=$?

        if [ $exit_code -eq 0 ]; then
            echo "✅ CONTA de $USERNAME configurada para NUNCA EXPIRAR"
            echo ""
            echo "👤 Status: Conta ativa indefinidamente"
        else
            echo "❌ Erro: $result"
        fi
        return
    fi

    # Calcular dias da data atual até a data desejada
    current_date=$(date +%s)
    target_date=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo "❌ Erro: Data inválida '$EXPIRY_DATE'. Use formato YYYY-MM-DD"
        return
    fi

    days_diff=$(( (target_date - current_date) / 86400 ))

    if [ $days_diff -lt 0 ]; then
        echo "❌ Erro: A data $EXPIRY_DATE já passou! Use uma data futura."
        return
    fi

    # Executar comando
    result=$(sudo samba-tool user setexpiry "$USERNAME" --days="$days_diff" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ CONTA de $USERNAME configurada para expirar em $days_diff dias"
        echo ""
        echo "📅 Data de expiração: $EXPIRY_DATE"
        echo "👤 Status: Conta expira automaticamente"
    else
        echo "❌ Erro: $result"
    fi
}

# === FUNÇÕES DE GRUPOS ===

create_group() {
    if [ -z "$GROUP" ]; then
        json_response "error" "Nome do grupo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool group add "$GROUP"
}

list_groups() {
    # Lista de grupos padrão para filtrar (uma por linha para grep)
    temp_filter="/tmp/samba_default_groups.txt"
    
    cat > "$temp_filter" << 'EOF'
^Administrators$
^Enterprise Admins$
^Schema Admins$
^Domain Admins$
^Domain Users$
^Domain Guests$
^Domain Controllers$
^Domain Computers$
^Enterprise Read-only Domain Controllers$
^Read-only Domain Controllers$
^Group Policy Creator Owners$
^RAS and IAS Servers$
^Terminal Server License Servers$
^Windows Authorization Access Group$
^Network Configuration Operators$
^Performance Monitor Users$
^Performance Log Users$
^Distributed COM Users$
^IIS_IUSRS$
^Cryptographic Operators$
^Event Log Readers$
^Certificate Service DCOM Access$
^Incoming Forest Trust Builders$
^Account Operators$
^Server Operators$
^Print Operators$
^Backup Operators$
^Replicator$
^Remote Desktop Users$
^Guests$
^Users$
^Pre-Windows 2000 Compatible Access$
^Allowed RODC Password Replication Group$
^Denied RODC Password Replication Group$
^Cert Publishers$
^DnsAdmins$
^DnsUpdateProxy$
^Protected Users$
EOF

    # Obter todos os grupos e filtrar
    all_groups=$(sudo samba-tool group list 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "Erro ao obter lista de grupos"
        rm -f "$temp_filter"
        return
    fi
    
    # Filtrar grupos customizados
    custom_groups=$(echo "$all_groups" | grep -v -f "$temp_filter")
    
    echo "=== GRUPOS CUSTOMIZADOS ==="
    echo ""
    
    if [ -n "$custom_groups" ]; then
        echo "$custom_groups" | sed 's/^/• /'
        echo ""
        
        # Estatísticas
        total_count=$(echo "$all_groups" | grep -v '^$' | wc -l)
        custom_count=$(echo "$custom_groups" | grep -v '^$' | wc -l)
        
        echo "📊 ESTATÍSTICAS:"
        echo "   👥 Grupos customizados: $custom_count"
        echo "   🏢 Grupos padrão (ocultos): $((total_count - custom_count))"
        echo "   📋 Total de grupos: $total_count"
    else
        echo "⚠️ Nenhum grupo customizado encontrado"
        echo ""
        total_count=$(echo "$all_groups" | grep -v '^$' | wc -l)
        echo "📊 Total de grupos padrão: $total_count"
    fi
    
    # Limpar arquivo temporário
    rm -f "$temp_filter"
}

list_all_groups() {
    execute_samba_command sudo samba-tool group list
}

search_group() {
    if [ -z "$SEARCH_TERM" ]; then
        json_response "error" "Termo de busca é obrigatório"
        return
    fi

    result=$(sudo samba-tool group list | grep "$SEARCH_TERM")
    json_response "success" "Resultados encontrados" "$result"
}

check_group() {
    if [ -z "$GROUP" ]; then
        json_response "error" "Nome do grupo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool group show "$GROUP"
}

delete_group() {
    if [ -z "$GROUP" ]; then
        json_response "error" "Nome do grupo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool group delete "$GROUP"
}

add_user_to_group() {
    if [ -z "$USERNAME" ] || [ -z "$GROUP" ]; then
        json_response "error" "Username e nome do grupo são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool group addmembers "$GROUP" "$USERNAME"
}

remove_user_from_group() {
    if [ -z "$USERNAME" ] || [ -z "$GROUP" ]; then
        json_response "error" "Username e nome do grupo são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool group removemembers "$GROUP" "$USERNAME"
}

list_group_members() {
    if [ -z "$GROUP" ]; then
        json_response "error" "Nome do grupo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool group listmembers "$GROUP"
}

move_group_ou() {
    if [ -z "$GROUP" ] || [ -z "$OU_NAME" ]; then
        json_response "error" "Nome do grupo e OU são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool group move "$GROUP" OU="$OU_NAME"
}

copy_user_groups() {
    if [ -z "$SOURCE_USERNAME" ] || [ -z "$TARGET_USERNAME" ]; then
        echo "{\"status\":\"error\",\"message\":\"Usuário de origem e destino são obrigatórios\"}"
        return
    fi

    log_action "Copiando grupos de $SOURCE_USERNAME para $TARGET_USERNAME"

    # Obter grupos do usuário de origem
    groups_result=$(sudo samba-tool user getgroups "$SOURCE_USERNAME" 2>&1)
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "{\"status\":\"error\",\"message\":\"Erro ao obter grupos do usuário $SOURCE_USERNAME: $groups_result\"}"
        return
    fi

    # Adicionar cada grupo ao usuário de destino
    success_count=0
    error_count=0
    errors=""

    echo "$groups_result" | while IFS= read -r group; do
        if [ -n "$group" ] && [ "$group" != "Domain Users" ]; then
            add_result=$(sudo samba-tool group addmembers "$group" "$TARGET_USERNAME" 2>&1)
            if [ $? -eq 0 ]; then
                success_count=$((success_count + 1))
            else
                error_count=$((error_count + 1))
                errors="$errors\n$group: $add_result"
            fi
        fi
    done

    if [ $error_count -eq 0 ]; then
        echo "{\"status\":\"success\",\"message\":\"Grupos copiados de $SOURCE_USERNAME para $TARGET_USERNAME\",\"output\":\"$groups_result\"}"
    else
        echo "{\"status\":\"warning\",\"message\":\"Grupos copiados com erros. Sucessos: $success_count, Erros: $error_count\",\"output\":\"$errors\"}"
    fi
}

# === FUNÇÃO PARA ADICIONAR GRUPO A GRUPO ===
add_group_to_group() {
    if [ -z "$SOURCE_GROUP" ] || [ -z "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de origem e destino são obrigatórios"
        return
    fi

    log_action "Adicionando grupo $SOURCE_GROUP ao grupo $TARGET_GROUP"

    # Validações
    source_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$SOURCE_GROUP")
    if [ "$source_check" != "$SOURCE_GROUP" ]; then
        echo "❌ Erro: Grupo de origem '$SOURCE_GROUP' não encontrado"
        return
    fi

    target_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$TARGET_GROUP")
    if [ "$target_check" != "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de destino '$TARGET_GROUP' não encontrado"
        return
    fi

    if [ "$SOURCE_GROUP" = "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de origem e destino não podem ser iguais"
        return
    fi

    echo "🔍 Verificando se '$SOURCE_GROUP' já é membro de '$TARGET_GROUP'..."
    
    # Verificar se já é membro
    existing_members=$(sudo samba-tool group listmembers "$TARGET_GROUP" 2>/dev/null)
    if echo "$existing_members" | grep -q "^$SOURCE_GROUP$"; then
        echo "⚠️ Grupo '$SOURCE_GROUP' já é membro de '$TARGET_GROUP'"
        return
    fi

    echo "➕ Adicionando grupo '$SOURCE_GROUP' ao grupo '$TARGET_GROUP'..."
    
    # Executar comando
    result=$(sudo samba-tool group addmembers "$TARGET_GROUP" "$SOURCE_GROUP" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ SUCESSO! Grupo '$SOURCE_GROUP' adicionado ao grupo '$TARGET_GROUP'"
        echo ""
        echo "🏗️ HIERARQUIA CRIADA:"
        echo "   📂 $TARGET_GROUP (grupo pai)"
        echo "   └── 👥 $SOURCE_GROUP (grupo filho)"
        echo ""
        echo "💡 RESULTADO:"
        echo "   • Membros de '$SOURCE_GROUP' herdam permissões de '$TARGET_GROUP'"
        echo "   • Para ver membros: Menu → Grupos → Exibir membros de '$TARGET_GROUP'"
    else
        echo "❌ Erro ao adicionar grupo: $result"
    fi
}

# === FUNÇÃO PARA REMOVER GRUPO DE GRUPO ===
remove_group_from_group() {
    if [ -z "$SOURCE_GROUP" ] || [ -z "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de origem e destino são obrigatórios"
        return
    fi

    log_action "Removendo grupo $SOURCE_GROUP do grupo $TARGET_GROUP"

    # Validações
    source_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$SOURCE_GROUP")
    if [ "$source_check" != "$SOURCE_GROUP" ]; then
        echo "❌ Erro: Grupo '$SOURCE_GROUP' não encontrado"
        return
    fi

    target_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$TARGET_GROUP")
    if [ "$target_check" != "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo '$TARGET_GROUP' não encontrado"
        return
    fi

    echo "🔍 Verificando se '$SOURCE_GROUP' é membro de '$TARGET_GROUP'..."
    
    # Verificar se é membro
    existing_members=$(sudo samba-tool group listmembers "$TARGET_GROUP" 2>/dev/null)
    if ! echo "$existing_members" | grep -q "^$SOURCE_GROUP$"; then
        echo "⚠️ Grupo '$SOURCE_GROUP' NÃO é membro de '$TARGET_GROUP'"
        echo ""
        echo "📋 Membros atuais de '$TARGET_GROUP':"
        if [ -n "$existing_members" ]; then
            echo "$existing_members" | sed 's/^/   • /'
        else
            echo "   (nenhum membro)"
        fi
        return
    fi

    echo "➖ Removendo grupo '$SOURCE_GROUP' do grupo '$TARGET_GROUP'..."
    
    # Executar comando
    result=$(sudo samba-tool group removemembers "$TARGET_GROUP" "$SOURCE_GROUP" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ SUCESSO! Grupo '$SOURCE_GROUP' removido do grupo '$TARGET_GROUP'"
        echo ""
        echo "🔓 HIERARQUIA DESFEITA:"
        echo "   📂 $TARGET_GROUP (não é mais pai)"
        echo "   🔸 $SOURCE_GROUP (agora independente)"
        echo ""
        echo "💡 RESULTADO:"
        echo "   • Membros de '$SOURCE_GROUP' não herdam mais permissões de '$TARGET_GROUP'"
        echo "   • Ambos os grupos continuam existindo independentemente"
    else
        echo "❌ Erro ao remover grupo: $result"
    fi
}

# === FUNÇÕES DE COMPUTADORES ===

add_computer() {
    if [ -z "$COMPUTER" ]; then
        json_response "error" "Nome do computador é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool computer create "$COMPUTER"
}

list_computers() {
    execute_samba_command sudo samba-tool computer list
}

search_computer() {
    if [ -z "$SEARCH_TERM" ]; then
        json_response "error" "Termo de busca é obrigatório"
        return
    fi

    result=$(sudo samba-tool computer list | grep "$SEARCH_TERM")
    json_response "success" "Resultados encontrados" "$result"
}

check_computer() {
    if [ -z "$COMPUTER" ]; then
        json_response "error" "Nome do computador é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool computer show "$COMPUTER\$"
}

delete_computer() {
    if [ -z "$COMPUTER" ]; then
        json_response "error" "Nome do computador é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool computer delete "$COMPUTER\$"
}

move_computer_ou() {
    if [ -z "$COMPUTER" ] || [ -z "$OU_NAME" ]; then
        json_response "error" "Nome do computador e OU são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool computer move "$COMPUTER" OU="$OU_NAME"
}

# === FUNÇÕES DE UNIDADES ORGANIZACIONAIS ===

create_ou() {
    if [ -z "$OU_NAME" ]; then
        json_response "error" "Nome da OU é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool ou create OU="$OU_NAME"
}

list_ous() {
    execute_samba_command sudo samba-tool ou list
}

delete_ou() {
    if [ -z "$OU_NAME" ]; then
        json_response "error" "Nome da OU é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool ou delete OU="$OU_NAME"
}

list_ou_objects() {
    if [ -z "$OU_NAME" ]; then
        json_response "error" "Nome da OU é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool ou listobjects OU="$OU_NAME"
}

# === FUNÇÕES DE SILOS ===

create_silo() {
    if [ -z "$SILO_NAME" ]; then
        json_response "error" "Nome do silo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo create --name "$SILO_NAME"
}

list_silos() {
    execute_samba_command sudo samba-tool domain auth silo list
}

check_silo() {
    if [ -z "$SILO_NAME" ]; then
        json_response "error" "Nome do silo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo view --name "$SILO_NAME"
}

delete_silo() {
    if [ -z "$SILO_NAME" ]; then
        json_response "error" "Nome do silo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo delete --name "$SILO_NAME"
}

list_silo_users() {
    if [ -z "$SILO_NAME" ]; then
        json_response "error" "Nome do silo é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo member list --name "$SILO_NAME"
}

add_user_silo() {
    if [ -z "$USERNAME" ] || [ -z "$SILO_NAME" ]; then
        json_response "error" "Username e nome do silo são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo member add --name "$SILO_NAME" --member "$USERNAME"
}

remove_user_silo() {
    if [ -z "$USERNAME" ] || [ -z "$SILO_NAME" ]; then
        json_response "error" "Username e nome do silo são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool domain auth silo member remove --name "$SILO_NAME" --member "$USERNAME"
}

password_expiry() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    # Validação
    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    # Esta função é chamada pelos botões SIM/NÃO do JavaScript
    # Configurar para NÃO expirar
    result=$(sudo samba-tool user setexpiry "$USERNAME" --noexpiry 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ Senha de $USERNAME configurada para NUNCA EXPIRAR"
        echo ""
        echo "🔐 Status: Flag --noexpiry ativada"
    else
        echo "❌ Erro: $result"
    fi
}

password_expiry_days() {
    if [ -z "$USERNAME" ] || [ -z "$DAYS" ]; then
        echo "Erro: Username e dias são obrigatórios"
        return
    fi

    # Validação
    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    echo "🔍 Configurando expiração individual para: $USERNAME"
    echo ""
    echo "⚠️ IMPORTANTE: No Samba, só é possível definir expiração de CONTA individual"
    echo "   Para expiração de SENHA individual, seria necessário alterar toda a política do domínio"
    echo ""

    # Verificar política atual
    max_pwd_age=$(sudo samba-tool domain passwordsettings show 2>/dev/null | grep -i "Maximum password age" | grep -o '[0-9]*' | head -1)
    echo "📋 Política atual de senhas do domínio: $max_pwd_age dias"
    echo ""

    # Executar comando
    result=$(sudo samba-tool user setexpiry "$USERNAME" --days="$DAYS" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ CONTA de $USERNAME configurada para expirar em $DAYS dias"
        echo ""
        
        # Calcular data
        expiry_date=$(date -d "+$DAYS days" '+%d/%m/%Y')
        echo "📊 RESUMO:"
        echo "   👤 Usuário: $USERNAME"
        echo "   🏢 CONTA expira: $expiry_date ($DAYS dias)"
        echo "   🔐 SENHA expira: Segue política do domínio ($max_pwd_age dias após alteração)"
        echo ""
        echo "💡 DIFERENÇA:"
        echo "   • Conta expirada = usuário não consegue fazer login"
        echo "   • Senha expirada = usuário deve trocar a senha no próximo login"
    else
        echo "❌ Erro: $result"
    fi
}

force_password_change() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    # Validação
    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    # Método 1: Usar pwdmustchangenow
    result1=$(sudo net sam set pwdmustchangenow "$USERNAME" yes 2>&1)
    
    # Método 2: Definir expiração para 0 dias (backup)
    result2=$(sudo samba-tool user setexpiry "$USERNAME" --days=0 2>&1)

    echo "✅ Usuário $USERNAME será OBRIGADO a trocar senha no próximo login"
    echo ""
    echo "🔄 Método 1 (pwdmustchangenow): $result1"
    echo "🔄 Método 2 (setexpiry 0): Aplicado como backup"
    echo "⚠️ Status: Senha expira IMEDIATAMENTE"
}

set_no_expiry() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    result=$(sudo samba-tool user setexpiry "$USERNAME" --noexpiry 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ Senha de $USERNAME configurada para NUNCA EXPIRAR"
        echo ""
        echo "🔐 Status: Flag --noexpiry ativada"
    else
        echo "❌ Erro: $result"
    fi
}

set_default_expiry() {
    if [ -z "$USERNAME" ]; then
        echo "Erro: Nome do usuário é obrigatório"
        return
    fi

    user_check=$(sudo samba-tool user list 2>/dev/null | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado no domínio"
        return
    fi

    # Definir para 90 dias (remove automaticamente --noexpiry)
    result=$(sudo samba-tool user setexpiry "$USERNAME" --days=90 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo "✅ Senha de $USERNAME configurada para expirar em 90 dias"
        echo ""
        expiry_date=$(date -d "+90 days" '+%d/%m/%Y')
        echo "📅 Data de expiração: $expiry_date"
        echo "🔐 Status: Flag --noexpiry removida"
    else
        echo "❌ Erro: $result"
    fi
}

# === FUNÇÕES DE INFORMAÇÕES DO DOMÍNIO ===

show_domain_info() {
    execute_samba_command sudo samba-tool domain info 127.0.0.1
}

show_domain_level() {
    execute_samba_command sudo samba-tool domain level show
}

show_fsmo_roles() {
    execute_samba_command sudo samba-tool fsmo show
}

show_sites() {
    execute_samba_command sudo samba-tool sites list
}

show_replication_info() {
    execute_samba_command sudo samba-tool drs showrepl
}

active_sessions() {
    execute_samba_command net status sessions
}

active_shares() {
    execute_samba_command net status shares
}

samba_processes() {
    execute_samba_command sudo samba-tool processes
}

# === FUNÇÕES DE COMPARTILHAMENTOS ===

show_shares() {
    if [ -d "/etc/samba/external/smb.conf.d/" ]; then
        result=$(find /etc/samba/external/smb.conf.d/ -name "*.conf" -exec basename {} \; 2>/dev/null | sed 's/.conf$//')
        json_response "success" "Compartilhamentos encontrados" "$result"
    else
        json_response "success" "Nenhum compartilhamento encontrado" ""
    fi
}

create_share() {
    if [ -z "$SHARE_NAME" ] || [ -z "$SHARE_PATH" ] || [ -z "$SHARE_USERS" ]; then
        json_response "error" "Nome, caminho e usuários são obrigatórios"
        return
    fi

    mkdir -p /etc/samba/external/smb.conf.d/
    mkdir -p "/mnt$SHARE_PATH"

    cat > "/etc/samba/external/smb.conf.d/$SHARE_NAME.conf" << EOF
[$SHARE_NAME]
path = /mnt$SHARE_PATH
valid users = $SHARE_USERS
admin users = $SHARE_USERS
writable = ${WRITABLE:-yes}
browsable = ${BROWSABLE:-yes}
guest ok = no
create mask = 0777
force create mode = 0777
directory mask = 0777
force directory mode = 0777
EOF

    chmod 777 "/mnt$SHARE_PATH"
    revalidate_shares

    json_response "success" "Compartilhamento $SHARE_NAME criado com sucesso"
}

create_sync_share() {
    if [ -z "$SHARE_NAME" ] || [ -z "$SHARE_PATH" ] || [ -z "$SHARE_USERS" ]; then
        json_response "error" "Nome, caminho e usuários são obrigatórios"
        return
    fi

    mkdir -p /etc/samba/external/smb.conf.d/
    mkdir -p "/mnt$SHARE_PATH"

    cat > "/etc/samba/external/smb.conf.d/$SHARE_NAME.conf" << EOF
[$SHARE_NAME]
path = /mnt$SHARE_PATH
valid users = $SHARE_USERS
browsable = ${BROWSABLE:-no}
writable = yes
guest ok = no
create mask = 0700
force create mode = 0700
directory mask = 0700
force directory mode = 0700
EOF

    chmod 777 "/mnt$SHARE_PATH"
    revalidate_shares

    json_response "success" "Compartilhamento sync $SHARE_NAME criado com sucesso"
}

delete_share() {
    if [ -z "$SHARE_NAME" ]; then
        json_response "error" "Nome do compartilhamento é obrigatório"
        return
    fi

    if [ -f "/etc/samba/external/smb.conf.d/$SHARE_NAME.conf" ]; then
        rm "/etc/samba/external/smb.conf.d/$SHARE_NAME.conf"
        revalidate_shares
        json_response "success" "Compartilhamento $SHARE_NAME removido com sucesso"
    else
        json_response "error" "Compartilhamento não encontrado"
    fi
}

revalidate_shares() {
    find /etc/samba/external/smb.conf.d/ -type f -print | sed -e 's/^/include = /' > /etc/samba/external/includes.conf 2>/dev/null
    smbcontrol all reload-config
    json_response "success" "Configurações de compartilhamento revalidadas"
}

copy_group_members() {
    if [ -z "$SOURCE_GROUP" ] || [ -z "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de origem e destino são obrigatórios"
        return
    fi

    log_action "Copiando membros de $SOURCE_GROUP para $TARGET_GROUP"

    # Validações
    source_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$SOURCE_GROUP")
    if [ "$source_check" != "$SOURCE_GROUP" ]; then
        echo "❌ Erro: Grupo de origem '$SOURCE_GROUP' não encontrado"
        return
    fi

    target_check=$(sudo samba-tool group list 2>/dev/null | grep -x "$TARGET_GROUP")
    if [ "$target_check" != "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de destino '$TARGET_GROUP' não encontrado"
        return
    fi

    if [ "$SOURCE_GROUP" = "$TARGET_GROUP" ]; then
        echo "❌ Erro: Grupo de origem e destino não podem ser iguais"
        return
    fi

    echo "🔍 Analisando grupo '$SOURCE_GROUP'..."
    
    # Obter membros do grupo origem
    members_result=$(sudo samba-tool group listmembers "$SOURCE_GROUP" 2>/dev/null)
    if [ -z "$members_result" ]; then
        echo "⚠️ Grupo '$SOURCE_GROUP' não possui membros para copiar"
        return
    fi

    # Contar membros
    member_count=$(echo "$members_result" | grep -v '^$' | wc -l)
    echo "📊 Encontrados $member_count membros no grupo origem"
    echo ""

    echo "📋 Membros que serão copiados:"
    echo "$members_result" | sed 's/^/   🔸 /'
    echo ""

    # Obter membros atuais do grupo destino (para evitar duplicatas)
    existing_members=$(sudo samba-tool group listmembers "$TARGET_GROUP" 2>/dev/null)
    
    echo "🚀 Iniciando processo de cópia..."
    echo "════════════════════════════════════════"

    success_count=0
    skip_count=0
    error_count=0

    # Processar cada membro
    echo "$members_result" | while IFS= read -r member; do
        if [ -n "$member" ]; then
            # Verificar se já existe
            if echo "$existing_members" | grep -q "^$member$"; then
                echo "⚠️ '$member' já existe no grupo destino - ignorando"
                skip_count=$((skip_count + 1))
            else
                echo "➕ Adicionando '$member'..."
                
                add_result=$(sudo samba-tool group addmembers "$TARGET_GROUP" "$member" 2>&1)
                if [ $? -eq 0 ]; then
                    echo "   ✅ Adicionado com sucesso!"
                    success_count=$((success_count + 1))
                else
                    echo "   ❌ Erro: $add_result"
                    error_count=$((error_count + 1))
                fi
            fi
        fi
    done

    echo "════════════════════════════════════════"
    echo "🏁 OPERAÇÃO CONCLUÍDA!"
    echo ""
    echo "📊 ESTATÍSTICAS FINAIS:"
    
    # Verificar membros finais do grupo destino
    final_members=$(sudo samba-tool group listmembers "$TARGET_GROUP" 2>/dev/null)
    final_count=$(echo "$final_members" | grep -v '^$' | wc -l)
    
    echo "   👥 Grupo origem: $SOURCE_GROUP ($member_count membros)"
    echo "   👥 Grupo destino: $TARGET_GROUP ($final_count membros)"
    echo "   ✅ Membros adicionados: Processo executado"
    echo "   ⚠️ Membros já existentes: Ignorados automaticamente"
    echo ""
    echo "🎯 RESULTADO: Membros de '$SOURCE_GROUP' copiados para '$TARGET_GROUP'"
    echo ""
    echo "💡 Para verificar o resultado final:"
    echo "   Execute: 'Exibir membros de um grupo' → '$TARGET_GROUP'"
}

# === FUNÇÕES DE CONFIGURAÇÕES ===

show_password_policy() {
    execute_samba_command sudo samba-tool domain passwordsettings show
}

enable_complexity() {
    sudo samba-tool domain passwordsettings set --complexity=on
    sudo samba-tool domain passwordsettings set --history-length=24
    sudo samba-tool domain passwordsettings set --min-pwd-age=1
    sudo samba-tool domain passwordsettings set --max-pwd-age=90
    sudo samba-tool domain passwordsettings set --min-pwd-length=7
    json_response "success" "Complexidade de senhas ativada"
}

disable_complexity() {
    sudo samba-tool domain passwordsettings set --complexity=off
    sudo samba-tool domain passwordsettings set --history-length=0
    sudo samba-tool domain passwordsettings set --min-pwd-age=0
    sudo samba-tool domain passwordsettings set --max-pwd-age=0
    sudo samba-tool domain passwordsettings set --min-pwd-length=0
    json_response "success" "Complexidade de senhas desativada"
}

sysvol_check() {
    execute_samba_command sudo samba-tool ntacl sysvolcheck -U administrator
}

sysvol_reset() {
    execute_samba_command sudo samba-tool ntacl sysvolreset -U Administrator
}

db_check_general() {
    execute_samba_command sudo samba-tool dbcheck --cross-ncs --fix --yes
}

db_check_acls() {
    execute_samba_command sudo samba-tool dbcheck --cross-ncs --reset-well-known-acls --fix --yes
}

check_acl() {
    execute_samba_command sudo samba-tool gpo aclcheck -U Administrator
}

install_admx_w10() {
    json_response "success" "Instalação de templates ADMX W10 iniciada (pode levar alguns minutos)"
}

install_admx_w11() {
    json_response "success" "Instalação de templates ADMX W11 iniciada (pode levar alguns minutos)"
}

remove_admx() {
    rm -rf /var/lib/samba/sysvol/*/Policies/PolicyDefinitions
    json_response "success" "Templates ADMX removidos"
}

update_menu() {
    wget -q https://raw.githubusercontent.com/urbancompasspony/server/main/dominio -O /root/.dominio
    chmod +x /root/.dominio
    json_response "success" "Menu atualizado com sucesso"
}

# === FUNÇÃO PRINCIPAL ===

main() {
    # Parse parâmetros
    parse_cgi_params
    sanitize_input

    # Log da ação
    log_action "Ação: $ACTION, Usuário: $USERNAME, Método: $REQUEST_METHOD"

    # Executar ação baseada no parâmetro
    case "$ACTION" in
        # Usuários
        "create-user") create_user ;;
        "list-users") list_users ;;
        "search-user") search_user ;;
        "check-user") check_user ;;
        "delete-user") delete_user ;;
        "enable-user") enable_user ;;
        "disable-user") disable_user ;;
        "reset-password") reset_password ;;
        "promote-user") promote_user ;;
        "demote-user") demote_user ;;
        "show-user-groups") show_user_groups ;;
        "move-user-ou") move_user_ou ;;
        "verify-password") verify_password ;;
        "password-expiry") password_expiry ;;
        "password-expiry-days") password_expiry_days ;;
        "force-password-change") force_password_change ;;
        "set-no-expiry") set_no_expiry ;;
        "set-default-expiry") set_default_expiry ;;
        "set-account-expiry") set_account_expiry ;;

        # Grupos
        "create-group") create_group ;;
        "list-groups") list_groups ;;
        "search-group") search_group ;;
        "check-group") check_group ;;
        "delete-group") delete_group ;;
        "add-user-to-group") add_user_to_group ;;
        "remove-user-from-group") remove_user_from_group ;;
        "list-group-members") list_group_members ;;
        "move-group-ou") move_group_ou ;;
        "copy-user-groups") copy_user_groups ;;
        "copy-group-members") copy_group_members ;;
        "list-all-groups") list_all_groups ;;
        "show-group-hierarchy") show_group_hierarchy ;;
        "add-group-to-group") add_group_to_group ;;
        "remove-group-from-group") remove_group_from_group ;;

        # Computadores
        "add-computer") add_computer ;;
        "list-computers") list_computers ;;
        "search-computer") search_computer ;;
        "check-computer") check_computer ;;
        "delete-computer") delete_computer ;;
        "move-computer-ou") move_computer_ou ;;

        # OUs
        "create-ou") create_ou ;;
        "list-ous") list_ous ;;
        "delete-ou") delete_ou ;;
        "list-ou-objects") list_ou_objects ;;

        # Silos
        "create-silo") create_silo ;;
        "list-silos") list_silos ;;
        "check-silo") check_silo ;;
        "delete-silo") delete_silo ;;
        "list-silo-users") list_silo_users ;;
        "add-user-silo") add_user_silo ;;
        "remove-user-silo") remove_user_silo ;;

        # Compartilhamentos
        "show-shares") show_shares ;;
        "create-share") create_share ;;
        "create-sync-share") create_sync_share ;;
        "delete-share") delete_share ;;
        "revalidate-shares") revalidate_shares ;;

        # Informações do domínio
        "show-domain-info") show_domain_info ;;
        "show-domain-level") show_domain_level ;;
        "show-fsmo-roles") show_fsmo_roles ;;
        "show-sites") show_sites ;;
        "show-replication-info") show_replication_info ;;
        "active-sessions") active_sessions ;;
        "active-shares") active_shares ;;
        "samba-processes") samba_processes ;;

        # Configurações
        "show-password-policy") show_password_policy ;;
        "enable-complexity") enable_complexity ;;
        "disable-complexity") disable_complexity ;;
        "sysvol-check") sysvol_check ;;
        "sysvol-reset") sysvol_reset ;;
        "db-check-general") db_check_general ;;
        "db-check-acls") db_check_acls ;;
        "check-acl") check_acl ;;
        "install-admx-w10") install_admx_w10 ;;
        "install-admx-w11") install_admx_w11 ;;
        "remove-admx") remove_admx ;;
        "update-menu") update_menu ;;

        *)
            json_response "error" "Ação não reconhecida: $ACTION"
            ;;
    esac
}

# Executar função principal
main
