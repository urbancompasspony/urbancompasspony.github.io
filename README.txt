
sudo apt install apache

# Habilitar módulo CGI
sudo a2enmod cgi

# Habilitar outros módulos úteis
sudo a2enmod headers
sudo a2enmod rewrite
sudo a2enmod ssl

# Verificar módulos habilitados
apache2ctl -M | grep cgi

Criar arquivo: /etc/apache2/sites-available/samba-admin.conf

# /etc/apache2/sites-available/samba-admin.conf

<VirtualHost *:80>
    ServerName localhost
    DocumentRoot /var/www/samba-admin
    
    # Configuração CGI
    ScriptAlias /cgi-bin/ "/var/www/samba-admin/cgi-bin/"
    
    # Diretório CGI
    <Directory "/var/www/samba-admin/cgi-bin/">
        # Permitir execução de CGI
        Options +ExecCGI -MultiViews +SymLinksIfOwnerMatch
        
        # Definir handlers para scripts CGI
        AddHandler cgi-script .cgi .sh .pl .py
        
        # Controle de acesso
        Require all granted
        
        # Desabilitar .htaccess
        AllowOverride None
        
        # Configurações de segurança
        <Files "*.conf">
            Require all denied
        </Files>
        
        <Files "*.log">
            Require all denied
        </Files>
    </Directory>
    
    # Diretório raiz da aplicação
    <Directory "/var/www/samba-admin">
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        
        # Página padrão
        DirectoryIndex index.html index.php
    </Directory>
    
    # Logs específicos
    ErrorLog ${APACHE_LOG_DIR}/samba-admin_error.log
    CustomLog ${APACHE_LOG_DIR}/samba-admin_access.log combined
    
    # Headers de segurança
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Compressão
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \
            \.(?:gif|jpe?g|png)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \
            \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
    </Location>
</VirtualHost>

# HTTPS (opcional mas recomendado para produção)
<VirtualHost *:443>
    ServerName localhost
    DocumentRoot /var/www/samba-admin
    
    # SSL
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
    SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
    
    # Mesmas configurações do HTTP
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
    
    ErrorLog ${APACHE_LOG_DIR}/samba-admin_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/samba-admin_ssl_access.log combined
    
    # Configurações SSL seguras
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder off
    SSLSessionTickets off
    
    # Headers de segurança para HTTPS
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>

Criar arquivo: /etc/sudoers.d/samba-cgi

# Permitir que www-data execute comandos samba-tool
www-data ALL=(root) NOPASSWD: /usr/bin/samba-tool
www-data ALL=(root) NOPASSWD: /usr/bin/net
www-data ALL=(root) NOPASSWD: /usr/sbin/smbcontrol

Estrutura:

# Criar diretórios necessários
sudo mkdir -p /var/www/samba-admin/cgi-bin
sudo mkdir -p /var/log/samba-cgi

# Definir permissões
sudo chown -R www-data:www-data /var/www/samba-admin
sudo chmod 755 /var/www/samba-admin/cgi-bin

# Criar log do CGI
sudo touch /var/log/samba-cgi/actions.log
sudo chown www-data:www-data /var/log/samba-cgi/actions.log
sudo chmod 644 /var/log/samba-cgi/actions.log

# Habilitar o site
sudo a2ensite samba-admin.conf

# Desabilitar site padrão (opcional)
sudo a2dissite 000-default.conf

# Testar configuração
sudo apache2ctl configtest

# Se OK, reiniciar Apache
sudo systemctl restart apache2
sudo systemctl enable apache2

# Verificar status
sudo systemctl status apache2

