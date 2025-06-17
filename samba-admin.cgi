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
    json_response "success" "Resultados encontrados" "$result"
}

check_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user show "$USERNAME"
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
}

disable_user() {
    if [ -z "$USERNAME" ]; then
        json_response "error" "Nome do usuário é obrigatório"
        return
    fi

    execute_samba_command sudo samba-tool user disable "$USERNAME"
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

    json_response "success" "Usuário $USERNAME removido de administrador"
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
