#!/bin/bash

# setup-apache-cgi.sh - Configuração automática do Apache para Samba CGI

set -e

echo "=== Configurando Apache para Samba CGI ==="

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
   echo "Este script deve ser executado como root"
   exit 1
fi

# Instalar Apache se não estiver instalado
if ! command -v apache2 &> /dev/null; then
    echo "Instalando Apache2..."
    apt update
    apt install -y apache2 apache2-utils
fi

# Instalar dependências
echo "Instalando dependências..."
apt install -y python3 python3-urllib3 sudo

# Habilitar módulos Apache
echo "Habilitando módulos Apache..."
a2enmod cgi
a2enmod headers
a2enmod rewrite
a2enmod ssl
a2enmod deflate

# Criar estrutura de diretórios
echo "Criando estrutura de diretórios..."
mkdir -p /var/www/samba-admin/cgi-bin
mkdir -p /var/log/samba-cgi

# Configurar permissões
echo "Configurando permissões..."
chown -R www-data:www-data /var/www/samba-admin
chmod 755 /var/www/samba-admin/cgi-bin

# Criar logs
touch /var/log/samba-cgi/actions.log
chown www-data:www-data /var/log/samba-cgi/actions.log
chmod 644 /var/log/samba-cgi/actions.log

# Configurar sudoers
echo "Configurando sudoers..."
cat > /etc/sudoers.d/samba-cgi << 'EOF'
# Permitir que www-data execute comandos samba-tool
www-data ALL=(root) NOPASSWD: /usr/bin/samba-tool
www-data ALL=(root) NOPASSWD: /usr/bin/net
www-data ALL=(root) NOPASSWD: /usr/bin/smbcontrol


# Comandos adicionais para compartilhamentos
www-data ALL=(root) NOPASSWD: /bin/mkdir -p /etc/samba/external*
www-data ALL=(root) NOPASSWD: /bin/mkdir -p /mnt/*
www-data ALL=(root) NOPASSWD: /bin/chmod * /mnt/*
www-data ALL=(root) NOPASSWD: /usr/bin/tee /etc/samba/external/smb.conf.d/*.conf
www-data ALL=(root) NOPASSWD: /usr/bin/tee /etc/samba/external/includes.conf
www-data ALL=(root) NOPASSWD: /bin/rm /etc/samba/external/smb.conf.d/*.conf
www-data ALL=(root) NOPASSWD: /usr/bin/find /etc/samba/external* -name "*.conf"
EOF

chmod 440 /etc/sudoers.d/samba-cgi

# Criar configuração do VirtualHost
echo "Criando configuração do VirtualHost..."
cat > /etc/apache2/sites-available/samba-admin.conf << 'EOF'
<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/samba-admin
    
    ScriptAlias /cgi-bin/ "/var/www/samba-admin/cgi-bin/"
    
    <Directory "/var/www/samba-admin/cgi-bin/">
        Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
        AddHandler cgi-script .cgi .sh .pl .py
        Require all granted
        AllowOverride None
    </Directory>
    
    <Directory "/var/www/samba-admin">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        DirectoryIndex index.html
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/samba-admin_error.log
    CustomLog ${APACHE_LOG_DIR}/samba-admin_access.log combined
    
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
EOF

# Habilitar site
echo "Habilitando site..."
a2ensite samba-admin.conf

# Perguntar se deve desabilitar site padrão
read -p "Desabilitar site padrão do Apache? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    a2dissite 000-default.conf
fi

# Testar configuração
echo "Testando configuração..."
if apache2ctl configtest; then
    echo "Configuração OK!"
    
    # Reiniciar Apache
    echo "Reiniciando Apache..."
    service apache2 restart
    
    echo ""
    echo "=== CONFIGURAÇÃO CONCLUÍDA ==="
    echo ""
    echo "Apache configurado com sucesso!"
    echo ""
    echo "Próximos passos:"
    echo "1. Script CGI para: /var/www/samba-admin/cgi-bin/samba-admin.cgi"
    mkdir -p /var/www/samba-admin/cgi-bin
    curl -sSL https://raw.githubusercontent.com/urbancompasspony/urbancompasspony.github.io/refs/heads/main/samba-admin.cgi | tee /var/www/samba-admin/cgi-bin/samba-admin.cgi
    echo "2. Index.html para: /var/www/samba-admin/index.html"
    mkdir -p /var/www/samba-admin
    curl -sSL https://raw.githubusercontent.com/urbancompasspony/urbancompasspony.github.io/refs/heads/main/index.html | tee /var/www/samba-admin/index.html
    echo "3. Permissões: chmod 755 /var/www/samba-admin/cgi-bin/samba-admin.cgi"
    chmod +x /var/www/samba-admin/cgi-bin/samba-admin.cgi
    chmod 755 /var/www/samba-admin/cgi-bin/samba-admin.cgi
    echo "4. Acesse: http://localhost/"
    echo ""
    echo "Logs:"
    echo "- Apache: /var/log/apache2/samba-admin_error.log"
    echo "- CGI: /var/log/samba-cgi/actions.log"
    
else
    echo "ERRO na configuração do Apache!"
    echo "Verifique os logs: /var/log/apache2/error.log"
    exit 1
fi
