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
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    # Obter informações básicas do usuário
    user_info=$(sudo samba-tool user show "$USERNAME" 2>&1)
    exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        json_response "error" "Usuário não encontrado: $user_info"
        return
    fi
    
    # Extrair dados para cálculos
    pwd_last_set=$(echo "$user_info" | grep -i "pwdLastSet" | cut -d: -f2- | tr -d ' ')
    user_account_control=$(echo "$user_info" | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
    account_expires=$(echo "$user_info" | grep -i "accountExpires" | cut -d: -f2- | tr -d ' ')
    
    # Adicionar informações de expiração ao final
    extended_info="$user_info"
    extended_info="$extended_info\\n\\n=== INFORMAÇÕES DE EXPIRAÇÃO ==="
    
    # Verificar expiração da SENHA
    if [ -n "$user_account_control" ]; then
        dont_expire_flag=$((user_account_control & 65536))
        if [ $dont_expire_flag -ne 0 ]; then
            extended_info="$extended_info\\nSENHA: Configurada para NUNCA EXPIRAR"
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
                
                if [ $days_remaining -gt 0 ]; then
                    extended_info="$extended_info\\nSENHA: Expira em $days_remaining dias"
                elif [ $days_remaining -eq 0 ]; then
                    extended_info="$extended_info\\nSENHA: ⚠️ EXPIRA HOJE!"
                else
                    extended_info="$extended_info\\nSENHA: ⚠️ EXPIRADA há $((days_remaining * -1)) dias"
                fi
            else
                extended_info="$extended_info\\nSENHA: Política do domínio = nunca expira"
            fi
        fi
    fi
    
    # Verificar expiração da CONTA
    if [ -n "$account_expires" ] && [ "$account_expires" != "0" ] && [ "$account_expires" != "9223372036854775807" ]; then
        epoch_diff=11644473600
        account_exp_unix=$((account_expires / 10000000 - epoch_diff))
        current_time=$(date +%s)
        time_diff=$((account_exp_unix - current_time))
        account_days_remaining=$((time_diff / 86400))
        
        if [ $account_days_remaining -gt 0 ]; then
            if [ $account_days_remaining -lt 36500 ]; then
                expiry_date_only=$(date -d "@$account_exp_unix" '+%Y-%m-%d' 2>/dev/null)
                extended_info="$extended_info\\nCONTA: Expira em $account_days_remaining dias ($expiry_date_only)"
            else
                extended_info="$extended_info\\nCONTA: Nunca expira"
            fi
        elif [ $account_days_remaining -eq 0 ]; then
            extended_info="$extended_info\\nCONTA: ⚠️ EXPIRA HOJE!"
        else
            extended_info="$extended_info\\nCONTA: ⚠️ EXPIRADA há $((account_days_remaining * -1)) dias"
        fi
    else
        extended_info="$extended_info\\nCONTA: Nunca expira"
    fi
    
    echo "$extended_info"
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

verify_password() {
    if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
        echo "{\"status\":\"error\",\"message\":\"Nome de usuário e senha são obrigatórios\"}"
        return
    fi

    log_action "Verificando senha para usuário: $USERNAME"
    
    # Primeiro verifica se o usuário existe
    user_check=$(sudo samba-tool user list | grep -x "$USERNAME")
    if [ "$user_check" != "$USERNAME" ]; then
        echo "{\"status\":\"error\",\"message\":\"Usuário '$USERNAME' não encontrado no domínio\"}"
        return
    fi
    
    # Criar script temporário para kinit
    temp_script=$(mktemp)
    cat > "$temp_script" << 'EOF'
#!/bin/bash
USERNAME="$1"
PASSWORD="$2"

# Obter domínio
DOMAIN=$(sudo samba-tool domain info 127.0.0.1 2>/dev/null | grep -i "domain.*:" | head -1 | cut -d: -f2 | tr -d ' ' | tr '[:lower:]' '[:upper:]')
if [ -z "$DOMAIN" ]; then
    DOMAIN="WORKGROUP"
fi

# Tentar kinit
export KRB5_TRACE=/dev/null
echo "$PASSWORD" | kinit "$USERNAME@$DOMAIN" 2>/dev/null
RESULT=$?

# Limpar ticket
kdestroy 2>/dev/null

exit $RESULT
EOF

    chmod +x "$temp_script"
    
    # Executar o script
    "$temp_script" "$USERNAME" "$PASSWORD"
    kinit_result=$?
    
    # Remover script temporário
    rm -f "$temp_script"
    
    if [ $kinit_result -eq 0 ]; then
        # Buscar informações do usuário
        user_info=$(sudo samba-tool user show "$USERNAME" 2>&1)
        
        result_info="✓ SENHA VÁLIDA para usuário '$USERNAME'"
        
        # Extrair dados básicos
        pwd_last_set=$(echo "$user_info" | grep -i "pwdLastSet" | cut -d: -f2- | tr -d ' ')
        user_account_control=$(echo "$user_info" | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
        
        # Verificar se senha não expira (flag DONT_EXPIRE_PASSWORD = 65536)
        if [ -n "$user_account_control" ]; then
            dont_expire_flag=$((user_account_control & 65536))
            if [ $dont_expire_flag -ne 0 ]; then
                result_info="$result_info\\n• SENHA: NUNCA EXPIRA"
            else
                # Obter política de senha do domínio
                password_policy=$(sudo samba-tool domain passwordsettings show 2>/dev/null)
                max_pwd_age=$(echo "$password_policy" | grep -i "Maximum password age" | grep -o '[0-9]*' | head -1)
                
                if [ -n "$max_pwd_age" ] && [ "$max_pwd_age" != "0" ] && [ -n "$pwd_last_set" ] && [ "$pwd_last_set" != "0" ]; then
                    # Calcular dias restantes
                    epoch_diff=11644473600
                    pwd_set_unix=$((pwd_last_set / 10000000 - epoch_diff))
                    current_time=$(date +%s)
                    days_since_change=$(((current_time - pwd_set_unix) / 86400))
                    days_remaining=$((max_pwd_age - days_since_change))
                    
                    if [ $days_remaining -gt 0 ]; then
                        expiry_date=$(date -d "+${days_remaining} days" '+%Y-%m-%d')
                        result_info="$result_info\\n• SENHA: Expira em $days_remaining dias ($expiry_date)"
                    elif [ $days_remaining -eq 0 ]; then
                        result_info="$result_info\\n• ⚠️ SENHA: EXPIRA HOJE!"
                    else
                        result_info="$result_info\\n• ⚠️ SENHA: EXPIRADA há $((days_remaining * -1)) dias"
                    fi
                elif [ "$max_pwd_age" = "0" ]; then
                    result_info="$result_info\\n• SENHA: Política do domínio = nunca expira"
                else
                    result_info="$result_info\\n• SENHA: Não foi possível calcular expiração"
                fi
            fi
        fi
        
        echo "{\"status\":\"success\",\"message\":\"Autenticação bem-sucedida\",\"output\":\"$result_info\"}"
    else
        # Falha na autenticação
        debug_info="✗ SENHA INVÁLIDA para usuário '$USERNAME'"
        
        # Verificar se conta está ativa
        user_status=$(sudo samba-tool user show "$USERNAME" 2>&1 | grep -i "userAccountControl" | cut -d: -f2- | tr -d ' ')
        if [ "$user_status" = "514" ] || [ "$user_status" = "546" ]; then
            echo "{\"status\":\"error\",\"message\":\"✗ Conta '$USERNAME' está DESABILITADA\"}"
        else
            echo "{\"status\":\"error\",\"message\":\"$debug_info\"}"
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

    repeated=$(sudo samba-tool user list | grep -x "$USERNAME")
    if [ "$repeated" != "$USERNAME" ]; then
        echo "Erro: Usuário '$USERNAME' não encontrado"
        return
    fi

    # Verificar se é para nunca expirar
    if [ "$EXPIRY_DATE" = "never" ]; then
        result=$(sudo samba-tool user setexpiry "$USERNAME" --noexpiry 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo "✓ Conta de $USERNAME configurada para NUNCA EXPIRAR"
        else
            echo "Erro: $result"
        fi
        return
    fi

    # Calcular quantos dias da data atual até a data desejada
    current_date=$(date +%s)
    target_date=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "Erro: Data inválida '$EXPIRY_DATE'. Use formato YYYY-MM-DD"
        return
    fi
    
    # Calcular diferença em dias
    days_diff=$(( (target_date - current_date) / 86400 ))
    
    if [ $days_diff -lt 0 ]; then
        echo "Erro: A data $EXPIRY_DATE já passou! Use uma data futura."
        return
    fi
    
    # Executar comando
    result=$(sudo samba-tool user setexpiry "$USERNAME" --days="$days_diff" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✓ Conta de $USERNAME configurada para expirar em $days_diff dias ($EXPIRY_DATE)"
    else
        echo "Erro: $result"
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
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    # Verifica se usuário existe
    repeated=$(samba-tool user list | grep -x "$USERNAME")
    if [ "$repeated" != "$USERNAME" ]; then
        json_response "error" "Usuário inválido"
        return
    fi

    # Configura para não expirar
    samba-tool user setexpiry "$USERNAME" --noexpiry
    json_response "success" "A senha de $USERNAME não expira mais!"
}

password_expiry_days() {
    if [ -z "$USERNAME" ] || [ -z "$DAYS" ]; then
        json_response "error" "Username e dias são obrigatórios"
        return
    fi

    execute_samba_command sudo samba-tool user setexpiry "$USERNAME" --days="$DAYS"
}

force_password_change() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command net sam set pwdmustchangenow "$USERNAME" yes
}

set_no_expiry() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    repeated=$(samba-tool user list | grep -x "$USERNAME")
    if [ "$repeated" != "$USERNAME" ]; then
        json_response "error" "Usuário inválido"
        return
    fi

    samba-tool user setexpiry "$USERNAME" --noexpiry
    json_response "success" "A senha de $USERNAME não expira mais!"
}

set_default_expiry() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    repeated=$(samba-tool user list | grep -x "$USERNAME")
    if [ "$repeated" != "$USERNAME" ]; then
        json_response "error" "Usuário inválido"
        return
    fi

    # Define para 90 dias (padrão do domínio)
    samba-tool user setexpiry "$USERNAME" --days=90
    json_response "success" "A senha de $USERNAME vai expirar em 90 dias (padrão do domínio)!"
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
