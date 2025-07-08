        const defaultDnsServers = [
            // IPv4 Servers (originais)
            { provider: 'Google 1', ip: '8.8.4.4', protocol: 'ipv4' },
{ provider: 'Google 2', ip: '8.8.8.8', protocol: 'ipv4' },
{ provider: 'OpenDNS 1', ip: '208.67.222.222', protocol: 'ipv4' },
{ provider: 'OpenDNS 2', ip: '208.67.220.220', protocol: 'ipv4' },
{ provider: 'Level3 1', ip: '4.2.2.1', protocol: 'ipv4' },
{ provider: 'Level3 2', ip: '4.2.2.2', protocol: 'ipv4' },
{ provider: 'Comodo 1', ip: '8.26.56.26', protocol: 'ipv4' },
{ provider: 'Comodo 2', ip: '8.20.247.20', protocol: 'ipv4' },
{ provider: 'DNSWATCH 1', ip: '84.200.69.80', protocol: 'ipv4' },
{ provider: 'DNSWATCH 2', ip: '84.200.70.40', protocol: 'ipv4' },
{ provider: 'Quad9 1', ip: '9.9.9.9', protocol: 'ipv4' },
{ provider: 'Quad9 2', ip: '149.112.112.112', protocol: 'ipv4' },
{ provider: 'Cloudflare 1', ip: '1.1.1.1', protocol: 'ipv4' },
{ provider: 'Cloudflare 2', ip: '1.0.0.1', protocol: 'ipv4' },
{ provider: 'Algar 1', ip: '200.225.197.34', protocol: 'ipv4' },
{ provider: 'Algar 2', ip: '200.225.197.37', protocol: 'ipv4' },
{ provider: 'GigaDNS 1', ip: '189.38.95.95', protocol: 'ipv4' },
{ provider: 'GigaDNS 2', ip: '189.38.95.96', protocol: 'ipv4' },
{ provider: 'Claro 1', ip: '181.213.132.2', protocol: 'ipv4' },
{ provider: 'Claro 2', ip: '181.213.132.3', protocol: 'ipv4' },

// IPv6 Servers (adicionados)
{ provider: 'Google 1', ip: '2001:4860:4860::8888', protocol: 'ipv6' },
{ provider: 'Google 2', ip: '2001:4860:4860::8844', protocol: 'ipv6' },
{ provider: 'Cloudflare 1', ip: '2606:4700:4700::1111', protocol: 'ipv6' },
{ provider: 'Cloudflare 2', ip: '2606:4700:4700::1001', protocol: 'ipv6' },
{ provider: 'Quad9 1', ip: '2620:fe::fe', protocol: 'ipv6' },
{ provider: 'Quad9 2', ip: '2620:fe::9', protocol: 'ipv6' },
{ provider: 'OpenDNS 1', ip: '2620:119:35::35', protocol: 'ipv6' },
{ provider: 'OpenDNS 2', ip: '2620:119:53::53', protocol: 'ipv6' }
        ];

        let customDnsServers = [];
        let isTestRunning = false;
        let testResults = [];
        let currentTestType = 'all'; // Armazenar o tipo de teste atual

        // Sistema de cache para resultados por tipo de teste
        let testCache = {
            'ipv4': { results: [], completed: false },
            'ipv6': { results: [], completed: false },
            'custom': { results: [], completed: false },
            'all': { results: [], completed: false }
        };

        // Função original mantida
        function isValidIp(ip) {
            const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            return ipRegex.test(ip);
        }

        // Novas funções para IPv6
        function isValidIpv6(ip) {
            const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
            return ipv6Regex.test(ip);
        }

        function detectIpType(ip) {
            if (isValidIp(ip)) return 'ipv4';
            if (isValidIpv6(ip)) return 'ipv6';
            return 'invalid';
        }

        function validateIpInput() {
            const input = document.getElementById('customDnsIp');
            const indicator = document.getElementById('ipTypeIndicator');
            const ip = input.value.trim();

            input.className = 'dns-input';
            indicator.style.display = 'none';

            if (ip.length > 0) {
                const ipType = detectIpType(ip);
                input.classList.add(ipType);

                if (ipType !== 'invalid') {
                    indicator.style.display = 'inline-block';
                    indicator.className = `ip-type-indicator ${ipType}`;
                    indicator.textContent = ipType.toUpperCase();
                }
            }
        }

        function addCustomDns() {
            const ipInput = document.getElementById('customDnsIp');
            const providerInput = document.getElementById('customDnsProvider');

            const ip = ipInput.value.trim();
            const provider = providerInput.value.trim() || 'Customizado';

            if (!ip) {
                alert('Por favor, digite um IP válido!');
                return;
            }

            const ipType = detectIpType(ip);
            if (ipType === 'invalid') {
                alert('IP inválido! Use o formato IPv4 (192.168.1.1) ou IPv6 (2001:4860:4860::8888)');
                return;
            }

            // Verificar se já existe
            if (customDnsServers.some(dns => dns.ip === ip)) {
                alert('Este DNS já foi adicionado!');
                return;
            }

            // Adicionar à lista
            customDnsServers.push({
                provider,
                ip,
                protocol: ipType,
                custom: true
            });

            // Limpar campos
            ipInput.value = '';
            providerInput.value = '';

            // Atualizar visualização
            updateCustomDnsList();
            validateIpInput(); // Limpar indicador
        }

        function removeCustomDns(ip) {
            customDnsServers = customDnsServers.filter(dns => dns.ip !== ip);
            updateCustomDnsList();
        }

        function updateCustomDnsList() {
            const listContainer = document.getElementById('customDnsList');
            const customTestBtn = document.getElementById('customTestBtn');

            // Habilitar/desabilitar botão de teste customizado
            customTestBtn.disabled = customDnsServers.length === 0;

            if (customDnsServers.length === 0) {
                listContainer.innerHTML = '';
                return;
            }

            listContainer.innerHTML = customDnsServers.map(dns => {
                const protocolClass = dns.protocol === 'ipv6' ? 'ipv6' : '';
                return `
                <div class="custom-dns-tag ${protocolClass}">
                <strong>${dns.provider}</strong> - ${dns.ip}
                <span class="protocol-badge ${dns.protocol}">${dns.protocol.toUpperCase()}</span>
                <button class="remove-dns" onclick="removeCustomDns('${dns.ip}')" title="Remover">
                ×
                </button>
                </div>
                `;
            }).join('');
        }

        function getAllDnsServers(testType = 'all') {
            if (testType === 'custom') {
                return customDnsServers;
            } else if (testType === 'ipv4') {
                return [...defaultDnsServers.filter(dns => dns.protocol === 'ipv4'), ...customDnsServers.filter(dns => dns.protocol === 'ipv4')];
            } else if (testType === 'ipv6') {
                return [...defaultDnsServers.filter(dns => dns.protocol === 'ipv6'), ...customDnsServers.filter(dns => dns.protocol === 'ipv6')];
            }
            return [...defaultDnsServers, ...customDnsServers];
        }

        function createDnsCard(server, index) {
            const customClass = server.custom ? ' custom' : '';
            const protocolClass = server.protocol === 'ipv6' ? ' ipv6' : '';
            const customBadge = server.custom ? '<span class="custom-badge">CUSTOM</span>' : '';
            const protocolBadge = `<span class="protocol-badge ${server.protocol}">${server.protocol.toUpperCase()}</span>`;

            return `
            <div class="dns-card pending${customClass}${protocolClass}" id="card-${index}">
            <div class="dns-header">
            <div class="dns-provider">
            ${server.provider}
            ${protocolBadge}
            ${customBadge}
            </div>
            <div class="dns-status status-pending" id="status-${index}">Aguardando</div>
            </div>
            <div class="dns-ip">${server.ip}</div>
            <div class="dns-ping" id="ping-${index}">
            <span class="spinner"></span> Testando...
            </div>
            </div>
            `;
        }

        function switchTab(tabType) {
            // Bloquear troca de abas durante teste em execução
            if (isTestRunning) {
                return;
            }

            // Remover active de todas as abas
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Adicionar active na aba selecionada
            document.getElementById(`tab-${tabType}`).classList.add('active');
            document.getElementById(`content-${tabType}`).classList.add('active');

            // Carregar resultados do cache para a aba selecionada
            loadCachedResults(tabType);
        }

        function updateProgress(current, total, message) {
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const percentage = (current / total) * 100;

            progressFill.style.width = percentage + '%';
            progressText.textContent = message;
        }

        // Função para salvar resultados no cache
        function saveCacheResults(testType, results) {
            testCache[testType] = {
                results: [...results],
                completed: true,
                timestamp: Date.now()
            };
        }

        // Função para carregar resultados do cache
        function loadCachedResults(testType) {
            currentTestType = testType;

            if (testCache[testType].completed && testCache[testType].results.length > 0) {
                testResults = [...testCache[testType].results];

                // Renderizar os cards dos resultados
                renderCachedResults(testType);

                // Atualizar estatísticas
                updateStats();

                // Mostrar informação de cache
                showCacheInfo(testType);
            } else {
                // Limpar resultados se não há cache
                testResults = [];
                document.getElementById('dnsGrid').innerHTML = '';
                document.getElementById('stats').style.display = 'none';

                // Remover card de detalhes do Top 3
                const existingCard = document.getElementById('top3DetailsCard');
                if (existingCard) {
                    existingCard.remove();
                }

                // Esconder informação de cache
                hideCacheInfo();
            }
        }

        // Função para renderizar resultados do cache
        function renderCachedResults(testType) {
            const dnsGrid = document.getElementById('dnsGrid');
            const allServers = getAllDnsServers(testType);

            // Criar cards baseados nos servidores do tipo de teste atual
            dnsGrid.innerHTML = allServers.map((server, index) => {
                // Encontrar resultado correspondente no cache
                const result = testResults.find(r => r.server.ip === server.ip);

                if (result) {
                    return createCompletedDnsCard(server, result, index);
                } else {
                    return createDnsCard(server, index);
                }
            }).join('');
        }

        // Função para criar card com resultado completo
        function createCompletedDnsCard(server, result, index) {
            const customClass = server.custom ? ' custom' : '';
            const protocolClass = server.protocol === 'ipv6' ? ' ipv6' : '';
            const customBadge = server.custom ? '<span class="custom-badge">CUSTOM</span>' : '';
            const protocolBadge = `<span class="protocol-badge ${server.protocol}">${server.protocol.toUpperCase()}</span>`;

            const statusClass = result.success ? 'success' : 'error';
            const statusText = result.success ? 'Online' : 'Falha';
            const statusBadgeClass = result.success ? 'status-success' : 'status-error';

            let pingContent = '';
            if (result.success) {
                let methodIcon = '';
                switch (result.method) {
                    case 'dns-over-https':
                        methodIcon = '🔒';
                        break;
                    case 'ipv6-doh':
                        methodIcon = '🔒🆕';
                        break;
                    case 'brazil-connectivity':
                        methodIcon = '🇧🇷';
                        break;
                    case 'global-connectivity':
                        methodIcon = '🌐';
                        break;
                    case 'ipv6-connectivity':
                        methodIcon = '🌐🆕';
                        break;
                    case 'custom-connectivity':
                        methodIcon = '⚙️';
                        break;
                }

                let attemptBadge = '';
                if (result.attempts === 1) {
                    attemptBadge = '<span class="attempt-badge first-try">1ª tentativa</span>';
                } else if (result.attempts === 2) {
                    attemptBadge = '<span class="attempt-badge second-try">2ª tentativa</span>';
                } else if (result.attempts === 3) {
                    attemptBadge = '<span class="attempt-badge third-try">3ª tentativa</span>';
                }

                pingContent = `✅ ${result.time}ms ${methodIcon}${attemptBadge}`;
            } else {
                const errorMsg = result.error || 'Sem resposta';
                const protocolWarning = server.protocol === 'ipv6' ? ' (IPv6 pode estar indisponível)' : '';
                const attemptInfo = result.attempts > 1 ? ` após ${result.attempts} tentativas` : '';
                pingContent = `❌ ${errorMsg}${protocolWarning}${attemptInfo}`;
            }

            return `
            <div class="dns-card ${statusClass}${customClass}${protocolClass}" id="card-${index}">
            <div class="dns-header">
            <div class="dns-provider">
            ${server.provider}
            ${protocolBadge}
            ${customBadge}
            </div>
            <div class="dns-status ${statusBadgeClass}" id="status-${index}">${statusText}</div>
            </div>
            <div class="dns-ip">${server.ip}</div>
            <div class="dns-ping" id="ping-${index}">${pingContent}</div>
            </div>
            `;
        }

        // Função para mostrar informação de cache
        function showCacheInfo(testType) {
            // Remover info anterior se existir
            hideCacheInfo();

            const cache = testCache[testType];
            if (!cache.completed) return;

            const timeAgo = Math.round((Date.now() - cache.timestamp) / 1000 / 60); // minutos
            const timeText = timeAgo < 1 ? 'agora mesmo' :
            timeAgo === 1 ? 'há 1 minuto' :
            `há ${timeAgo} minutos`;

            const testTitles = {
                'all': 'Todos os DNS (IPv4 + IPv6)',
                'ipv4': 'DNS IPv4',
                'ipv6': 'DNS IPv6',
                'custom': 'DNS Customizados'
            };

            const cacheInfo = document.createElement('div');
            cacheInfo.id = 'cacheInfo';
            cacheInfo.innerHTML = `
            <div class="cache-info">
            <div class="cache-content">
            <span class="cache-icon">💾</span>
            <span class="cache-text">
            Exibindo resultados salvos de <strong>${testTitles[testType]}</strong>
            (testado ${timeText})
            </span>
            <button class="cache-refresh" onclick="clearCache('${testType}')" title="Limpar cache e testar novamente">
            🔄 Novo Teste
            </button>
            </div>
            </div>
            `;

            // Inserir antes do grid de DNS
            const dnsGrid = document.getElementById('dnsGrid');
            dnsGrid.parentNode.insertBefore(cacheInfo, dnsGrid);
        }

        // Função para esconder informação de cache
        function hideCacheInfo() {
            const existingInfo = document.getElementById('cacheInfo');
            if (existingInfo) {
                existingInfo.remove();
            }
        }

        // Função para limpar cache específico
        function clearCache(testType) {
            testCache[testType] = { results: [], completed: false };
            loadCachedResults(testType);
        }

        // Função para bloquear/desbloquear abas durante teste
        function lockTabs(lock) {
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (lock) {
                    tab.classList.add('disabled');
                    // Não mexer no pointer-events aqui, só visual
                } else {
                    tab.classList.remove('disabled');
                }
            });
        }

        // Nova função de ping com rotação de rotas entre tentativas
        async function pingServerWithRetries(ip, provider, protocol = 'ipv4', maxAttempts = 3) {
            let lastError = null;

            // Definir estratégias de teste por tentativa
            function getTestStrategy(attempt, provider, protocol) {
                if (protocol === 'ipv6') {
                    const ipv6Strategies = [
                        // Tentativa 1: DNS over HTTPS específico do provedor
                        {
                            urls: {
                                'google 1': 'https://dns.google/resolve?name=ipv6.google.com&type=AAAA',
                                'google 2': 'https://dns.google/resolve?name=ipv6.google.com&type=AAAA',
                                'cloudflare 1': 'https://cloudflare-dns.com/dns-query?name=ipv6.cloudflare.com&type=AAAA',
                                'cloudflare 2': 'https://cloudflare-dns.com/dns-query?name=ipv6.cloudflare.com&type=AAAA',
                                'quad9 1': 'https://dns.quad9.net:5053/dns-query?name=ipv6.quad9.net&type=AAAA',
                                'quad9 2': 'https://dns.quad9.net:5053/dns-query?name=ipv6.quad9.net&type=AAAA',
                                'default': 'https://dns.google/resolve?name=test-ipv6.com&type=AAAA'
                            },
                            method: 'ipv6-doh',
                            fetchMethod: 'GET',
                            headers: { 'Accept': 'application/dns-json' }
                        },
                        // Tentativa 2: Conectividade IPv6 direta
                        {
                            urls: {
                                'default': 'https://ipv6.google.com/generate_204'
                            },
                            method: 'ipv6-connectivity',
                            fetchMethod: 'HEAD',
                            headers: {}
                        },
                        // Tentativa 3: Teste IPv6 alternativo
                        {
                            urls: {
                                'default': 'https://test-ipv6.com/json/'
                            },
                            method: 'ipv6-test',
                            fetchMethod: 'GET',
                            headers: {}
                        }
                    ];
                    return ipv6Strategies[attempt - 1] || ipv6Strategies[0];
                } else {
                    // IPv4 strategies
                    const ipv4Strategies = [
                        // Tentativa 1: DNS over HTTPS específico do provedor
                        {
                            urls: {
                                'google 1': 'https://dns.google/resolve?name=example.com&type=A',
                                'google 2': 'https://dns.google/resolve?name=example.com&type=A',
                                'cloudflare 1': 'https://cloudflare-dns.com/dns-query?name=example.com&type=A',
                                'cloudflare 2': 'https://cloudflare-dns.com/dns-query?name=example.com&type=A',
                                'quad9 1': 'https://dns.quad9.net:5053/dns-query?name=example.com&type=A',
                                'quad9 2': 'https://dns.quad9.net:5053/dns-query?name=example.com&type=A',
                                'algar 1': 'https://dns.google/resolve?name=globo.com&type=A',
                                'algar 2': 'https://dns.google/resolve?name=globo.com&type=A',
                                'gigadns 1': 'https://dns.google/resolve?name=uol.com.br&type=A',
                                'gigadns 2': 'https://dns.google/resolve?name=uol.com.br&type=A',
                                'claro 1': 'https://dns.google/resolve?name=terra.com.br&type=A',
                                'claro 2': 'https://dns.google/resolve?name=terra.com.br&type=A',
                                'default': 'https://dns.google/resolve?name=example.com&type=A'
                            },
                            method: 'dns-over-https',
                            fetchMethod: 'GET',
                            headers: { 'Accept': 'application/dns-json' }
                        },
                        // Tentativa 2: Sites brasileiros (boa para ISPs brasileiros)
                        {
                            urls: {
                                'default': ['https://www.google.com.br/generate_204', 'https://www.uol.com.br/favicon.ico', 'https://g1.globo.com/favicon.ico'][Math.floor(Math.random() * 3)]
                            },
                            method: 'brazil-connectivity',
                            fetchMethod: 'HEAD',
                            headers: {}
                        },
                        // Tentativa 3: Sites globais com CDN
                        {
                            urls: {
                                'default': ['https://www.google.com/generate_204', 'https://api.github.com/zen', 'https://httpstat.us/200'][Math.floor(Math.random() * 3)]
                            },
                            method: 'global-connectivity',
                            fetchMethod: 'GET',
                            headers: {}
                        }
                    ];
                    return ipv4Strategies[attempt - 1] || ipv4Strategies[0];
                }
            }

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const startTime = performance.now();

                try {
                    const controller = new AbortController();
                    const timeout = protocol === 'ipv6' ? 4000 : 2500;
                    const timeoutId = setTimeout(() => controller.abort(), timeout);

                    // Obter estratégia para esta tentativa
                    const strategy = getTestStrategy(attempt, provider, protocol);
                    const providerKey = provider.toLowerCase();

                    // Para DNS customizados, sempre usar rota 'default' (sem fallback específico)
                    const isCustomDns = !strategy.urls.hasOwnProperty(providerKey);
                    const testUrl = isCustomDns ? strategy.urls['default'] : (strategy.urls[providerKey] || strategy.urls['default']);
                    const testMethod = isCustomDns ? 'custom-connectivity' : strategy.method;

                    const fetchOptions = {
                        method: strategy.fetchMethod,
                        signal: controller.signal,
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: strategy.headers
                    };

                    const response = await fetch(testUrl, fetchOptions);
                    clearTimeout(timeoutId);

                    const endTime = performance.now();
                    const pingTime = Math.round(endTime - startTime);

                    if (response.ok && response.status < 400) {
                        return {
                            success: true,
                            time: pingTime,
                            status: response.status,
                            method: testMethod,
                            attempts: attempt,
                            route: testUrl
                        };
                    } else {
                        lastError = `HTTP ${response.status}`;
                        if (attempt < maxAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre tentativas
                            continue;
                        }
                    }

                } catch (error) {
                    const endTime = performance.now();
                    const pingTime = Math.round(endTime - startTime);

                    lastError = error.name === 'AbortError' ? 'Timeout' : error.message;

                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre tentativas
                        continue;
                    }

                    return {
                        success: false,
                        time: pingTime,
                        status: 0,
                        method: 'failed',
                        error: lastError,
                        attempts: attempt
                    };
                }
            }

            // Se chegou aqui, todas as tentativas falharam
            return {
                success: false,
                time: 0,
                status: 0,
                method: 'failed',
                error: lastError || 'Falha em todas as tentativas',
                attempts: maxAttempts
            };
        }

        async function testSingleDns(server, index) {
            const card = document.getElementById(`card-${index}`);
            const status = document.getElementById(`status-${index}`);
            const ping = document.getElementById(`ping-${index}`);

            card.className = card.className.replace('pending', 'pending loading');

            try {
                const result = await pingServerWithRetries(server.ip, server.provider, server.protocol);

                if (result.success) {
                    card.className = card.className.replace('pending loading', 'success');
                    status.className = 'dns-status status-success';
                    status.textContent = 'Online';

                    let methodIcon = '';
                    switch (result.method) {
                        case 'dns-over-https':
                            methodIcon = '🔒';
                            break;
                        case 'ipv6-doh':
                            methodIcon = '🔒🆕';
                            break;
                        case 'brazil-connectivity':
                            methodIcon = '🇧🇷';
                            break;
                        case 'global-connectivity':
                            methodIcon = '🌐';
                            break;
                        case 'ipv6-connectivity':
                            methodIcon = '🌐🆕';
                            break;
                        case 'custom-connectivity':
                            methodIcon = '⚙️';
                            break;
                    }

                    // Badge de tentativas
                    let attemptBadge = '';
                    if (result.attempts === 1) {
                        attemptBadge = '<span class="attempt-badge first-try">1ª tentativa</span>';
                    } else if (result.attempts === 2) {
                        attemptBadge = '<span class="attempt-badge second-try">2ª tentativa</span>';
                    } else if (result.attempts === 3) {
                        attemptBadge = '<span class="attempt-badge third-try">3ª tentativa</span>';
                    }

                    ping.innerHTML = `✅ ${result.time}ms ${methodIcon}${attemptBadge}`;
                    testResults.push({
                        server,
                        success: true,
                        time: result.time,
                        method: result.method,
                        attempts: result.attempts,
                        route: result.route
                    });
                } else {
                    card.className = card.className.replace('pending loading', 'error');
                    status.className = 'dns-status status-error';
                    status.textContent = 'Falha';

                    const errorMsg = result.error || 'Sem resposta';
                    const protocolWarning = server.protocol === 'ipv6' ? ' (IPv6 pode estar indisponível)' : '';
                    const attemptInfo = result.attempts > 1 ? ` após ${result.attempts} tentativas` : '';

                    ping.innerHTML = `❌ ${errorMsg}${protocolWarning}${attemptInfo}`;
                    testResults.push({ server, success: false, time: result.time, error: errorMsg, attempts: result.attempts });
                }
            } catch (error) {
                card.className = card.className.replace('pending loading', 'error');
                status.className = 'dns-status status-error';
                status.textContent = 'Erro';
                ping.innerHTML = '❌ Erro crítico';
                testResults.push({ server, success: false, time: 0, error: 'Erro crítico', attempts: 1 });
            }
        }

        function updateStats() {
            const successCount = testResults.filter(r => r.success).length;
            const errorCount = testResults.filter(r => !r.success).length;
            const successfulTests = testResults.filter(r => r.success);
            const avgPing = successfulTests.length > 0
            ? Math.round(successfulTests.reduce((sum, r) => sum + r.time, 0) / successfulTests.length)
            : 0;

            // Calcular DNS mais rápido (apenas o primeiro)
            let fastestDns = '-';
            if (successfulTests.length > 0) {
                const fastest = successfulTests.sort((a, b) => a.time - b.time)[0];
                const protocolIcon = fastest.server.protocol === 'ipv6' ? '🆕' : '';
                fastestDns = `${fastest.server.provider} ${protocolIcon}(${fastest.time}ms)<br><small style="font-size: 0.8rem; color: #666; font-family: 'Courier New', monospace;">${fastest.server.ip}</small>`;
            }

            document.getElementById('successCount').textContent = successCount;
            document.getElementById('errorCount').textContent = errorCount;
            document.getElementById('avgPing').textContent = avgPing + 'ms';
            document.getElementById('top3Dns').innerHTML = fastestDns;

            // Criar card de detalhes do Top 3
            createTop3DetailsCard(successfulTests);

            document.getElementById('stats').style.display = 'block';
        }

        function createTop3DetailsCard(successfulTests) {
            // Remover card anterior se existir
            const existingCard = document.getElementById('top3DetailsCard');
            if (existingCard) {
                existingCard.remove();
            }

            if (successfulTests.length === 0) return;

            // Separar resultados por protocolo
            const ipv4Results = successfulTests.filter(r => r.server.protocol === 'ipv4');
            const ipv6Results = successfulTests.filter(r => r.server.protocol === 'ipv6');

            // Definir quais rankings mostrar baseado no tipo de teste atual
            let showIPv4 = false;
            let showIPv6 = false;
            let isCustomTest = currentTestType === 'custom';

            if (currentTestType === 'ipv4') {
                showIPv4 = ipv4Results.length > 0;
            } else if (currentTestType === 'ipv6') {
                showIPv6 = ipv6Results.length > 0;
            } else if (currentTestType === 'custom') {
                // Para custom, só mostra se tiver 2+ DNS do respectivo protocolo
                showIPv4 = ipv4Results.length >= 2;
                showIPv6 = ipv6Results.length >= 2;
            } else { // 'all'
                showIPv4 = ipv4Results.length > 0;
                showIPv6 = ipv6Results.length > 0;
            }

            // Se não há rankings para mostrar, não criar o card
            if (!showIPv4 && !showIPv6) return;

            const top3IPv4 = ipv4Results.sort((a, b) => a.time - b.time).slice(0, 3);
            const top3IPv6 = ipv6Results.sort((a, b) => a.time - b.time).slice(0, 3);

            function getMethodDescription(method) {
                const descriptions = {
                    'dns-over-https': '🔒 DNS over HTTPS',
                    'ipv6-doh': '🔒🆕 DNS over HTTPS IPv6',
                    'brazil-connectivity': '🇧🇷 Site Brasileiro',
                    'global-connectivity': '🌐 Site Global',
                    'ipv6-connectivity': '🌐🆕 Conectividade IPv6',
                    'ipv6-test': '🆕 Teste IPv6',
                    'custom-connectivity': '⚙️ Conectividade Customizada'
                };
                return descriptions[method] || method;
            }

            function getRouteDescription(route) {
                if (route.includes('dns.google')) return 'Google DNS API';
                if (route.includes('cloudflare-dns.com')) return 'Cloudflare DNS API';
                if (route.includes('dns.quad9.net')) return 'Quad9 DNS API';
                if (route.includes('google.com.br')) return 'Google Brasil';
                if (route.includes('google.com/generate_204')) return 'Google Global';
                if (route.includes('uol.com.br')) return 'UOL Brasil';
                if (route.includes('globo.com')) return 'Globo Brasil';
                if (route.includes('github.com')) return 'GitHub Global';
                if (route.includes('httpstat.us')) return 'HTTPStat.us';
                if (route.includes('ipv6.google.com')) return 'Google IPv6';
                if (route.includes('test-ipv6.com')) return 'Test-IPv6.com';
                return 'Rota Personalizada';
            }

            function createRankingSection(results, title, protocolClass) {
                if (results.length === 0) {
                    return '';
                }

                const rankingHtml = results.map((result, index) => {
                    const medal = ['🥇', '🥈', '🥉'][index];
                    const customBadge = result.server.custom ?
                    '<span class="custom-badge">CUSTOM</span>' : '';

                    const attemptBadge = result.attempts > 1 ?
                    `<span class="attempt-badge ${result.attempts === 2 ? 'second-try' : 'third-try'}">${result.attempts}ª tent.</span>` :
                    '<span class="attempt-badge first-try">1ª tent.</span>';

                    return `
                    <div class="ranking-item ${protocolClass}">
                    <div class="ranking-header">
                    <span class="medal">${medal}</span>
                    <div class="dns-name">
                    <strong>${result.server.provider}</strong>
                    ${customBadge}
                    </div>
                    <div class="ping-time">${result.time}ms</div>
                    </div>
                    <div class="ranking-details">
                    <div class="detail-item">
                    <span class="detail-label">📍 Endereço:</span>
                    <span class="detail-value">${result.server.ip}</span>
                    </div>
                    <div class="detail-item">
                    <span class="detail-label">🛣️ Método:</span>
                    <span class="detail-value">${getMethodDescription(result.method)}</span>
                    </div>
                    <div class="detail-item">
                    <span class="detail-label">🌐 Rota:</span>
                    <span class="detail-value">${getRouteDescription(result.route)}</span>
                    </div>
                    <div class="detail-item">
                    <span class="detail-label">🔄 Tentativas:</span>
                    <span class="detail-value">${attemptBadge}</span>
                    </div>
                    </div>
                    </div>
                    `;
                }).join('');

                return `
                <div class="ranking-section">
                <h4 class="ranking-title ${protocolClass}">${title}</h4>
                <div class="ranking-list">
                ${rankingHtml}
                </div>
                </div>
                `;
            }

            // Construir seções de ranking
            let rankingSections = '';
            if (showIPv4) {
                rankingSections += createRankingSection(top3IPv4, '🌐 Top 3 IPv4', 'ipv4');
            }
            if (showIPv6) {
                rankingSections += createRankingSection(top3IPv6, '🆕 Top 3 IPv6', 'ipv6');
            }

            // Determinar layout (single ou dual column)
            const layoutClass = (showIPv4 && showIPv6) ? 'dual-column' : 'single-column';

            // Construir título personalizado baseado no teste
            let cardTitle = '🏆 Rankings DNS - Detalhes Técnicos';
            if (currentTestType === 'ipv4') {
                cardTitle = '🏆 Ranking IPv4 - Detalhes Técnicos';
            } else if (currentTestType === 'ipv6') {
                cardTitle = '🏆 Ranking IPv6 - Detalhes Técnicos';
            } else if (currentTestType === 'custom') {
                cardTitle = '🏆 Rankings DNS Customizados - Detalhes Técnicos';
            }

            const top3Card = document.createElement('div');
            top3Card.id = 'top3DetailsCard';
            top3Card.innerHTML = `
            <div class="top3-details-card">
            <h3 class="top3-title">${cardTitle}</h3>
            <div class="rankings-container ${layoutClass}">
            ${rankingSections}
            </div>
            </div>
            `;

            // Inserir o card após as estatísticas
            const statsElement = document.getElementById('stats');
            statsElement.parentNode.insertBefore(top3Card, statsElement.nextSibling);
        }

        async function startTest(testType = 'all') {
            if (isTestRunning) return;

            isTestRunning = true;
            testResults = [];
            currentTestType = testType; // Armazenar o tipo de teste atual

            // Bloquear todas as abas durante o teste
            lockTabs(true);

            const allServers = getAllDnsServers(testType);

            // Verificar se há servidores para testar
            if (allServers.length === 0) {
                if (testType === 'custom') {
                    alert('Nenhum DNS customizado foi adicionado!');
                } else {
                    alert('Nenhum servidor DNS encontrado para este tipo de teste!');
                }
                isTestRunning = false;
                lockTabs(false); // Desbloquear abas
                return;
            }

            const startBtn = document.querySelector('.btn-primary');
            const customBtn = document.querySelector('.btn-custom');
            const stopBtn = document.querySelector('.btn-secondary');
            const progressContainer = document.getElementById('progressContainer');
            const dnsGrid = document.getElementById('dnsGrid');

            // Desabilitar todos os botões de teste
            document.querySelectorAll('.btn-primary, .btn-custom').forEach(btn => btn.disabled = true);
            document.querySelectorAll('.btn-secondary').forEach(btn => btn.disabled = false);
            progressContainer.style.display = 'block';

            // Atualizar título do progresso baseado no tipo de teste
            const testTitles = {
                'all': 'Todos os DNS (IPv4 + IPv6)',
                'ipv4': 'DNS IPv4',
                'ipv6': 'DNS IPv6',
                'custom': 'DNS Customizados'
            };
            const testTitle = testTitles[testType] || 'DNS';
            updateProgress(0, allServers.length, `Iniciando teste de ${testTitle}...`);

            // Criar cards para os servidores selecionados
            dnsGrid.innerHTML = allServers.map((server, index) =>
            createDnsCard(server, index)
            ).join('');

            // Testar cada servidor sequencialmente
            for (let i = 0; i < allServers.length && isTestRunning; i++) {
                const serverType = allServers[i].custom ? 'customizado' : 'padrão';
                const protocolLabel = allServers[i].protocol.toUpperCase();
                updateProgress(i, allServers.length, `Testando ${allServers[i].provider} (${serverType} ${protocolLabel}) - ${allServers[i].ip}`);
                await testSingleDns(allServers[i], i);

                // Pequena pausa entre testes para visualização
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (isTestRunning) {
                const completedMessages = {
                    'all': `Teste completo concluído! (${allServers.length} servidores IPv4 + IPv6)`,
                    'ipv4': `Teste IPv4 concluído! (${allServers.length} servidores)`,
                    'ipv6': `Teste IPv6 concluído! (${allServers.length} servidores)`,
                    'custom': `Teste de DNS customizados concluído! (${allServers.length} servidores)`
                };
                const completedMessage = completedMessages[testType] || `Teste concluído! (${allServers.length} servidores)`;
                updateProgress(allServers.length, allServers.length, completedMessage);

                // Salvar resultados no cache
                saveCacheResults(testType, testResults);

                updateStats();
            }

            isTestRunning = false;

            // Desbloquear abas
            lockTabs(false);

            // Habilitar botões de todas as abas
            document.querySelectorAll('.btn-primary, .btn-custom').forEach(btn => btn.disabled = false);
            document.querySelectorAll('.btn-secondary').forEach(btn => btn.disabled = true);

            // Manter estado do botão customizado
            document.getElementById('customTestBtn').disabled = customDnsServers.length === 0;

            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 2000);
        }

        function stopTest() {
            isTestRunning = false;

            // Desbloquear abas
            lockTabs(false);

            // Habilitar botões de todas as abas
            document.querySelectorAll('.btn-primary, .btn-custom').forEach(btn => btn.disabled = false);
            document.querySelectorAll('.btn-secondary').forEach(btn => btn.disabled = true);
            document.getElementById('progressContainer').style.display = 'none';

            // Manter estado do botão customizado
            document.getElementById('customTestBtn').disabled = customDnsServers.length === 0;
        }

        function clearResults() {
            // Limpar apenas o cache do tipo atual
            if (currentTestType && testCache[currentTestType]) {
                testCache[currentTestType] = { results: [], completed: false };
            }

            testResults = [];
            document.getElementById('dnsGrid').innerHTML = '';
            document.getElementById('stats').style.display = 'none';
            document.getElementById('progressContainer').style.display = 'none';

            // Remover card de detalhes do Top 3
            const existingCard = document.getElementById('top3DetailsCard');
            if (existingCard) {
                existingCard.remove();
            }

            // Remover info de cache
            hideCacheInfo();
        }

        // Event listeners para adicionar DNS com Enter
        document.addEventListener('DOMContentLoaded', function() {
            // Desabilitar todos os botões "Parar" inicialmente
            document.querySelectorAll('.btn-secondary').forEach(btn => btn.disabled = true);
            document.getElementById('customTestBtn').disabled = true; // Inicialmente desabilitado

            // Carregar resultados do cache para a aba ativa inicial (IPv4)
            loadCachedResults('ipv4');

            // Adicionar DNS com Enter no campo IP
            document.getElementById('customDnsIp').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addCustomDns();
                }
            });

            // Adicionar DNS com Enter no campo Provider
            document.getElementById('customDnsProvider').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addCustomDns();
                }
            });
        });
