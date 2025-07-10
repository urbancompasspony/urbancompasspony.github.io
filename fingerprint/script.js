        // Dados globais
        let browserFingerprint = '';
        let privacyScore = 0;
        let detectedInfo = {};

        // Inicializar quando a página carrega
        document.addEventListener('DOMContentLoaded', function() {
            loadAllInformation();
        });

        async function loadAllInformation() {
            try {
                // Lista de containers com timing mais realista
                const containers = [
                    { id: 'ip-info', type: 'circular', critical: true },
                    { id: 'basic-info', type: 'circular' },
                    { id: 'screen-info', type: 'circular' },
                    { id: 'browser-info', type: 'circular' },
                    { id: 'hardware-info', type: 'circular' },
                    { id: 'plugins-info', type: 'circular' },
                    { id: 'security-info', type: 'circular', critical: true },
                    { id: 'fonts-info', type: 'circular' },
                    { id: 'canvas-info', type: 'circular', critical: true },
                    { id: 'webgl-info', type: 'circular' },
                    { id: 'sensors-info', type: 'circular' },
                    { id: 'architecture-info', type: 'circular' },
                    { id: 'gpu-details-info', type: 'circular' },
                    { id: 'ipv6-info', type: 'circular', critical: true },
                    { id: 'audio-info', type: 'circular', critical: true },
                    { id: 'webrtc-comprehensive-info', type: 'circular', critical: true },
                    { id: 'extensions-info', type: 'circular', critical: true },
                    { id: 'adblocker-info', type: 'circular', critical: true },
                    { id: 'dns-leak-info', type: 'circular', critical: true },
                    { id: 'proxy-vpn-info', type: 'circular', critical: true },
                    { id: 'fingerprint-info', type: 'circular', critical: true },
                    { id: 'privacy-score', type: 'circular', critical: true }
                ];

                // Inicializar barras de progresso
                containers.forEach(container => {
                    progressManager.createProgressBar(container.id, container.type, container.critical);
                });

                // Simular progresso com timing mais rápido
                containers.forEach((container, index) => {
                    setTimeout(() => {
                        progressManager.simulateProgress(container.id, 800 + (index * 50)); // Reduzido de 1500 para 800
                    }, index * 30); // Reduzido de 50 para 30
                });

                // Executar testes básicos primeiro (necessários para fingerprint)
                const basicPromises = [
                    loadBasicInfo(),
                    loadScreenInfo(),
                    loadBrowserInfo(),
                    loadHardwareInfo(),
                    detectArchitecture()
                ];

                await Promise.all(basicPromises);

                // Iniciar fingerprint assim que dados básicos estiverem prontos
                calculateFingerprint();

                // Executar testes mais complexos em paralelo
                const complexPromises = [
                    loadIPInfo(),
                    loadPluginsInfo(),
                    loadSecurityInfo(),
                    loadFontsInfo(),
                    loadCanvasInfo(),
                    loadWebGLInfo(),
                    loadSensorsInfo(),
                    getGPUDetails(),
                    detectIPv6(),
                    getAudioFingerprint(),
                    detectExtensions(),
                    detectAdBlocker(),
                    comprehensiveWebRTCTest(),
                    testDNSLeak(),
                    detectProxyVPN()
                ];

                // Executar em background
                Promise.all(complexPromises).then(() => {
                    // Calcular privacy score quando todos os dados estiverem prontos
                    setTimeout(() => {
                        calculatePrivacyScore();
                    }, 500);
                });

            } catch (error) {
                console.error('Erro ao carregar informações:', error);
            }
        }

        // Sistema de progresso
        class ProgressManager {
            constructor() {
                this.progressData = {};
            }

            createProgressBar(containerId, type = 'linear', isCritical = false) {
                const container = document.getElementById(containerId);
                if (!container) return;

                const progressClass = isCritical ? 'critical' : '';

                if (type === 'circular') {
                    container.innerHTML = `
                    <div class="circular-progress ${progressClass}" id="progress-${containerId}">
                    <span class="circular-progress-text">0%</span>
                    </div>
                    <div style="text-align: center; color: #ccc; font-size: 0.9em; margin-top: 5px;">
                    Analisando...
                    </div>
                    `;
                } else {
                    container.innerHTML = `
                    <div class="progress-container">
                    <div class="progress-bar ${progressClass}" id="progress-${containerId}">
                    <span class="progress-text">0%</span>
                    </div>
                    </div>
                    <div style="text-align: center; color: #ccc; font-size: 0.9em; margin-top: 5px;">
                    Carregando dados...
                    </div>
                    `;
                }

                this.progressData[containerId] = { current: 0, total: 100, type: type };
            }

            updateProgress(containerId, current, total = 100, text = null) {
                const progressElement = document.getElementById(`progress-${containerId}`);
                if (!progressElement) return;

                const percentage = Math.round((current / total) * 100);
                this.progressData[containerId].current = current;
                this.progressData[containerId].total = total;

                if (this.progressData[containerId].type === 'circular') {
                    const degrees = (percentage / 100) * 360;
                    progressElement.style.background = `conic-gradient(${progressElement.classList.contains('critical') ? '#ff6600' : '#00f000'} ${degrees}deg, #1a1a1a ${degrees}deg)`;
                    progressElement.querySelector('.circular-progress-text').textContent = `${percentage}%`;
                } else {
                    progressElement.style.width = `${percentage}%`;
                    const textElement = progressElement.querySelector('.progress-text');
                    if (textElement) {
                        textElement.textContent = text || `${percentage}%`;
                    }
                }
            }

            completeProgress(containerId, finalContent) {
                const container = document.getElementById(containerId);
                if (!container) return;

                // Remover delay - aplicar conteúdo imediatamente
                container.innerHTML = finalContent;
            }

            simulateProgress(containerId, duration = 1000, steps = null) { // Reduzido de 2000 para 1000
                if (!steps) {
                    const stepCount = 10; // Reduzido de 20 para 10
                    const stepDuration = duration / stepCount;
                    let currentStep = 0;

                    const interval = setInterval(() => {
                        currentStep++;
                        const progress = (currentStep / stepCount) * 100;
                        this.updateProgress(containerId, progress, 100);

                        if (currentStep >= stepCount) {
                            clearInterval(interval);
                        }
                    }, stepDuration);
                } else {
                    let currentStep = 0;
                    const stepDuration = duration / steps.length;

                    const interval = setInterval(() => {
                        if (currentStep < steps.length) {
                            this.updateProgress(containerId, currentStep + 1, steps.length, steps[currentStep]);
                            currentStep++;
                        } else {
                            clearInterval(interval);
                        }
                    }, stepDuration);
                }
            }
        }

        const progressManager = new ProgressManager();

        async function testDNSLeak() {
            const container = document.getElementById('dns-leak-info');

            progressManager.createProgressBar('dns-leak-info', 'circular', true);

            try {
                const dnsResults = {
                    resolvers: [],
                    realLeaks: [], // Apenas vazamentos DNS reais
                    testErrors: [], // Erros de teste separados
                    isVPNSafe: true,
                    dnssecSupport: false,
                    dohSupport: false,
                    geographicConsistency: 'unknown'
                };

                const testDomains = ['example.com', 'google.com']; // Domains confiáveis
                const dnsResolvers = [
                    { name: 'Cloudflare', server: 'https://cloudflare-dns.com/dns-query' },
                    { name: 'Google', server: 'https://dns.google/resolve' },
                    { name: 'Quad9', server: 'https://dns.quad9.net:5053/dns-query' }
                ];

                const totalSteps = 6;
                let currentStep = 0;

                const updateProgress = (step) => {
                    currentStep = step;
                    progressManager.updateProgress('dns-leak-info', currentStep, totalSteps);
                };

                updateProgress(1);

                // Teste 1: Resolução DNS básica (paralelo para velocidade)
                const resolverPromises = dnsResolvers.map(async (resolver) => {
                    try {
                        const testPromises = testDomains.map(async (domain) => {
                            const response = await fetch(`${resolver.server}?name=${domain}&type=A`, {
                                headers: { 'Accept': 'application/dns-json' },
                                signal: AbortSignal.timeout(3000)
                            });

                            if (response.ok) {
                                const data = await response.json();
                                return {
                                    resolver: resolver.name,
                                    domain: domain,
                                    success: true,
                                    answers: data.Answer ? data.Answer.length : 0,
                                    status: data.Status,
                                    server: data.Server || 'unknown'
                                };
                            }
                            return null;
                        });

                        const results = await Promise.allSettled(testPromises);
                        const successfulResults = results
                        .filter(r => r.status === 'fulfilled' && r.value)
                        .map(r => r.value);

                        if (successfulResults.length > 0) {
                            dnsResults.resolvers.push({
                                name: resolver.name,
                                server: resolver.server,
                                responses: successfulResults
                            });
                        }

                    } catch (error) {
                        dnsResults.testErrors.push(`Erro ao testar ${resolver.name}: ${error.message}`);
                    }
                });

                await Promise.allSettled(resolverPromises);
                updateProgress(2);

                // Teste 2: DNSSEC (domains que sabidamente têm DNSSEC)
                try {
                    const dnssecDomains = ['cloudflare.com', 'google.com'];

                    for (const domain of dnssecDomains) {
                        try {
                            const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A&do=1`, {
                                headers: { 'Accept': 'application/dns-json' },
                                signal: AbortSignal.timeout(2000)
                            });

                            if (response.ok) {
                                const data = await response.json();
                                // Verificar flag AD (Authenticated Data)
                                if (data.AD === true) {
                                    dnsResults.dnssecSupport = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Continuar testando outros domains
                        }
                    }
                } catch (e) {
                    dnsResults.testErrors.push('Erro no teste DNSSEC');
                }

                updateProgress(3);

                // Teste 3: DNS-over-HTTPS
                try {
                    const dohTest = await fetch('https://cloudflare-dns.com/dns-query?name=example.com&type=A', {
                        headers: { 'Accept': 'application/dns-json' },
                        signal: AbortSignal.timeout(2000)
                    });
                    dnsResults.dohSupport = dohTest.ok;
                } catch (e) {
                    dnsResults.dohSupport = false;
                }

                updateProgress(4);

                // Teste 4: Consistência entre resolvers (detectar manipulação DNS)
                if (dnsResults.resolvers.length >= 2) {
                    const responses = {};

                    // Agrupar respostas por domain
                    dnsResults.resolvers.forEach(resolver => {
                        resolver.responses.forEach(response => {
                            if (!responses[response.domain]) {
                                responses[response.domain] = [];
                            }
                            responses[response.domain].push({
                                resolver: resolver.name,
                                answers: response.answers,
                                status: response.status
                            });
                        });
                    });

                    // Verificar inconsistências
                    for (const [domain, resolverResponses] of Object.entries(responses)) {
                        if (resolverResponses.length >= 2) {
                            const answerCounts = resolverResponses.map(r => r.answers);
                            const statusCodes = resolverResponses.map(r => r.status);

                            // Se respostas muito diferentes entre resolvers
                            if (Math.max(...answerCounts) - Math.min(...answerCounts) > 2) {
                                dnsResults.realLeaks.push(`Inconsistência DNS para ${domain}: diferentes resolvers retornaram respostas muito diferentes`);
                                dnsResults.isVPNSafe = false;
                            }

                            // Se status codes diferentes (possível bloqueio/manipulação)
                            if (new Set(statusCodes).size > 1) {
                                dnsResults.realLeaks.push(`Possível manipulação DNS para ${domain}: status codes diferentes entre resolvers`);
                                dnsResults.isVPNSafe = false;
                            }
                        }
                    }
                }

                updateProgress(5);

                // Teste 5: Verificação geográfica MELHORADA (múltiplas APIs)
                try {
                    const geoAPIs = [
                        'https://ipapi.co/json/',
                        'https://ipinfo.io/json'
                    ];

                    const geoPromises = geoAPIs.map(async (api) => {
                        try {
                            const response = await fetch(api, {
                                signal: AbortSignal.timeout(2000)
                            });
                            if (response.ok) {
                                const data = await response.json();
                                return {
                                    country: data.country || data.country_code || data.countryCode,
                                    source: api
                                };
                            }
                        } catch (e) {
                            return null;
                        }
                    });

                    const geoResults = await Promise.allSettled(geoPromises);
                    const validGeoResults = geoResults
                    .filter(r => r.status === 'fulfilled' && r.value)
                    .map(r => r.value);

                    if (validGeoResults.length >= 2) {
                        const countries = validGeoResults.map(r => r.country);
                        const uniqueCountries = new Set(countries);

                        if (uniqueCountries.size > 1) {
                            // Múltiplas APIs discordam = possível problema
                            dnsResults.realLeaks.push(`Inconsistência geográfica: APIs reportam países diferentes (${Array.from(uniqueCountries).join(', ')})`);
                            dnsResults.isVPNSafe = false;
                            dnsResults.geographicConsistency = 'inconsistent';
                        } else {
                            dnsResults.geographicConsistency = 'consistent';
                        }
                    } else if (validGeoResults.length === 1) {
                        dnsResults.geographicConsistency = 'limited_data';
                    } else {
                        dnsResults.testErrors.push('Não foi possível verificar consistência geográfica');
                        dnsResults.geographicConsistency = 'test_failed';
                    }

                } catch (e) {
                    dnsResults.testErrors.push('Erro no teste geográfico');
                    dnsResults.geographicConsistency = 'test_failed';
                }

                updateProgress(6);

                // Preparar resultado final
                const totalIssues = dnsResults.realLeaks.length;
                const hasTestErrors = dnsResults.testErrors.length > 0;

                const finalContent = `
                <div class="info-item">
                <span class="info-label">Vazamentos DNS:</span>
                <span class="info-value">${totalIssues > 0 ? `${totalIssues} detectado(s)` : 'Nenhum detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">VPN Segura:</span>
                <span class="info-value">${dnsResults.isVPNSafe ? 'Sim' : 'Não'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Resolvers Testados:</span>
                <span class="info-value">${dnsResults.resolvers.map(r => r.name).join(', ') || 'Nenhum'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">DNSSEC:</span>
                <span class="info-value">${dnsResults.dnssecSupport ? 'Suportado' : 'Não detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">DNS-over-HTTPS:</span>
                <span class="info-value">${dnsResults.dohSupport ? 'Suportado' : 'Não suportado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Consistência Geográfica:</span>
                <span class="info-value">${getGeographicStatusText(dnsResults.geographicConsistency)}</span>
                </div>
                ${totalIssues > 0 ? `
                    <div style="margin-top: 15px; padding: 10px; background: #2d1810; border: 1px solid #ff6600; border-radius: 5px;">
                    <strong style="color: #ff6600;">⚠️ Vazamentos DNS Reais:</strong><br>
                    ${dnsResults.realLeaks.map(leak => `• ${leak}`).join('<br>')}
                    </div>` : ''}
                    ${hasTestErrors ? `
                        <div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border: 1px solid #666; border-radius: 5px;">
                        <strong style="color: #feca57;">ℹ️ Erros de Teste (não são vazamentos):</strong><br>
                        ${dnsResults.testErrors.map(error => `• ${error}`).join('<br>')}
                        </div>` : ''}
                        `;

                        progressManager.completeProgress('dns-leak-info', finalContent);
                        detectedInfo.dnsLeak = dnsResults;

            } catch (error) {
                const errorContent = `
                <div class="info-item">
                <span class="info-label">DNS Leak Test:</span>
                <span class="info-value">Erro crítico: ${error.message}</span>
                </div>
                `;
                progressManager.completeProgress('dns-leak-info', errorContent);
            }
        }

        // Função auxiliar para status geográfico
        function getGeographicStatusText(status) {
            switch (status) {
                case 'consistent': return 'Consistente ✅';
                case 'inconsistent': return 'Inconsistente ⚠️';
                case 'limited_data': return 'Dados limitados';
                case 'test_failed': return 'Teste falhou';
                default: return 'Desconhecido';
            }
        }

        async function detectProxyVPN() {
            const container = document.getElementById('proxy-vpn-info');

            const steps = [
                'Verificando ISP...',
                'Testando latência...',
                'Consultando APIs...',
                'Analisando inconsistências...',
                'Calculando score...'
            ];

            progressManager.simulateProgress('proxy-vpn-info', 3500, steps);

            try {
                const vpnIndicators = {
                    suspiciousISP: false,
                    datacenterIP: false,
                    multipleCountries: false,
                    suspiciousLatency: false,
                    knownVPNRanges: false,
                    anonymityScore: 0
                };

                const detectionMethods = [];

                // Verificar ISP suspeito (datacenters comuns)
                if (detectedInfo.ip && detectedInfo.ip.org) {
                    const suspiciousISPs = [
                        'digitalocean', 'amazon', 'google cloud', 'microsoft azure',
                        'vultr', 'linode', 'ovh', 'hetzner', 'cloudflare',
                        'expressvpn', 'nordvpn', 'surfshark', 'cyberghost',
                        'privateinternetaccess', 'ipvanish', 'tunnelbear'
                    ];

                    const isp = detectedInfo.ip.org.toLowerCase();
                    if (suspiciousISPs.some(suspicious => isp.includes(suspicious))) {
                        vpnIndicators.suspiciousISP = true;
                        detectionMethods.push('ISP suspeito de datacenter/VPN');
                        vpnIndicators.anonymityScore += 40;
                    }
                }

                // Testar latência inconsistente
                const latencyTests = [];
                const testServers = [
                    'https://www.google.com/favicon.ico',
                    'https://www.github.com/favicon.ico',
                    'https://www.stackoverflow.com/favicon.ico'
                ];

                for (const server of testServers) {
                    try {
                        const startTime = performance.now();
                        await fetch(server, {
                            method: 'HEAD',
                            mode: 'no-cors',
                            cache: 'no-cache'
                        });
                        const endTime = performance.now();
                        latencyTests.push(endTime - startTime);
                    } catch (e) {
                        latencyTests.push(999); // Timeout/erro
                    }
                }

                const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
                const maxLatency = Math.max(...latencyTests);
                const minLatency = Math.min(...latencyTests);

                // Latência muito inconsistente pode indicar VPN
                if (maxLatency - minLatency > 500 || avgLatency > 1000) {
                    vpnIndicators.suspiciousLatency = true;
                    detectionMethods.push('Latência inconsistente detectada');
                    vpnIndicators.anonymityScore += 20;
                }

                // Verificar múltiplas APIs para inconsistências
                const ipAPIs = [
                    'https://ipapi.co/json/',
                    'https://ipinfo.io/json',
                    'http://ip-api.com/json/'
                ];

                const locationResults = [];
                for (const api of ipAPIs) {
                    try {
                        const response = await fetch(api);
                        const data = await response.json();
                        locationResults.push({
                            country: data.country || data.country_code || data.countryCode,
                            city: data.city,
                            region: data.region || data.regionName
                        });
                    } catch (e) {
                        // API falhou
                    }
                }

                // Verificar se todas as APIs retornam a mesma localização
                if (locationResults.length > 1) {
                    const countries = [...new Set(locationResults.map(r => r.country))];
                    const cities = [...new Set(locationResults.map(r => r.city))];

                    if (countries.length > 1 || cities.length > 2) {
                        vpnIndicators.multipleCountries = true;
                        detectionMethods.push('Inconsistência de localização entre APIs');
                        vpnIndicators.anonymityScore += 30;
                    }
                }

                // Teste de WebRTC para vazamentos
                let webrtcLeaks = 0;
                if (detectedInfo.webrtcComprehensive) {
                    if (detectedInfo.webrtcComprehensive.publicIPs.length > 0) {
                        webrtcLeaks = detectedInfo.webrtcComprehensive.publicIPs.length;
                        detectionMethods.push(`${webrtcLeaks} vazamento(s) de IP via WebRTC`);
                        vpnIndicators.anonymityScore += webrtcLeaks * 15;
                    }
                }

                // ✅ LÓGICA CORRIGIDA: Calcular nível de anonimato E detecção VPN
                let anonymityLevel = 'Baixo';
                let anonymityColor = '#00f000';
                let vpnDetectionResult = 'Improvável';

                // Primeiro: definir nível de anonimato baseado no score
                if (vpnIndicators.anonymityScore < 30) {
                    anonymityLevel = 'Baixo';
                    anonymityColor = '#00f000';
                } else if (vpnIndicators.anonymityScore < 60) {
                    anonymityLevel = 'Médio';
                    anonymityColor = '#feca57';
                } else {
                    anonymityLevel = 'Alto';
                    anonymityColor = '#ff6600';
                }

                // Segundo: lógica inteligente para detecção VPN
                if (vpnIndicators.anonymityScore < 30 && webrtcLeaks === 0 && locationResults.length > 0) {
                    // Score baixo + sem vazamentos + APIs consistentes = provavelmente não é VPN
                    vpnDetectionResult = 'Improvável';
                } else if (vpnIndicators.anonymityScore < 60) {
                    vpnDetectionResult = 'Possível';
                } else {
                    vpnDetectionResult = 'Muito Provável';
                }

                const finalContent = `
                <div class="info-item">
                <span class="info-label">Proxy/VPN Detectado:</span>
                <span class="info-value">${vpnDetectionResult}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Nível Anonimato:</span>
                <span class="info-value" style="color: ${anonymityColor}">${anonymityLevel}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Score Anonimato:</span>
                <span class="info-value">${vpnIndicators.anonymityScore}/100</span>
                </div>
                <div class="info-item">
                <span class="info-label">Latência Média:</span>
                <span class="info-value">${avgLatency.toFixed(0)}ms</span>
                </div>
                <div class="info-item">
                <span class="info-label">WebRTC Leaks:</span>
                <span class="info-value">${webrtcLeaks}</span>
                </div>
                <div class="info-item">
                <span class="info-label">APIs Consistentes:</span>
                <span class="info-value">${locationResults.length > 0 ? 'Sim' : 'Erro nos testes'}</span>
                </div>
                ${detectionMethods.length > 0 ? `
                    <div style="margin-top: 15px; padding: 10px; background: #2d1810; border: 1px solid #ff6600; border-radius: 5px;">
                    <strong style="color: #ff6600;">🔍 Indicadores Detectados:</strong><br>
                    ${detectionMethods.map(method => `• ${method}`).join('<br>')}
                    </div>` : ''}
                    `;

                    setTimeout(() => {
                        progressManager.completeProgress('proxy-vpn-info', finalContent);
                        detectedInfo.proxyVPN = {
                            indicators: vpnIndicators,
                            detectionMethods,
                            anonymityScore: vpnIndicators.anonymityScore,
                            latencyTests: {
                                average: avgLatency,
                                max: maxLatency,
                                min: minLatency
                            }
                        };
                    }, 3600);

            } catch (error) {
                const errorContent = `
                <div class="info-item">
                <span class="info-label">Proxy/VPN Detection:</span>
                <span class="info-value">Erro: ${error.message}</span>
                </div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('proxy-vpn-info', errorContent);
                }, 3600);
            }
        }

        function generatePDFReport() {
            try {
                // Criar modal para opções do relatório
                const modal = document.createElement('div');
                modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                background: #111;
                border: 2px solid #576879;
                border-radius: 8px;
                padding: 40px;
                max-width: 600px;
                width: 90%;
                color: #fff;
                max-height: 80vh;
                overflow-y: auto;
                `;

                modalContent.innerHTML = `
                <h3 style="margin-bottom: 25px; color: #00f000; text-align: center;">📋 GERAR RELATÓRIO PDF</h3>

                <div style="margin-bottom: 20px;">
                <h4 style="color: #feca57; margin-bottom: 10px;">Opções do Relatório:</h4>
                <label style="display: block; margin: 8px 0;">
                <input type="checkbox" id="include-summary" checked> Resumo Executivo
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="checkbox" id="include-technical" checked> Detalhes Técnicos
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="checkbox" id="include-privacy" checked> Análise de Privacidade
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="checkbox" id="include-recommendations" checked> Recomendações
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="checkbox" id="include-sensitive-pdf"> Incluir Dados Sensíveis
                </label>
                </div>

                <div style="margin-bottom: 20px;">
                <h4 style="color: #feca57; margin-bottom: 10px;">Formato:</h4>
                <label style="display: block; margin: 8px 0;">
                <input type="radio" name="format" value="professional" checked> Profissional (detalhado)
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="radio" name="format" value="executive"> Executivo (resumido)
                </label>
                <label style="display: block; margin: 8px 0;">
                <input type="radio" name="format" value="technical"> Técnico (completo)
                </label>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                <button id="generate-pdf" style="background: #00f000; color: #000; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">
                📄 Gerar PDF
                </button>
                <button id="close-pdf-modal" style="background: #ff6600; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                Cancelar
                </button>
                </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                document.getElementById('generate-pdf').onclick = () => {
                    const options = {
                        includeSummary: document.getElementById('include-summary').checked,
                        includeTechnical: document.getElementById('include-technical').checked,
                        includePrivacy: document.getElementById('include-privacy').checked,
                        includeRecommendations: document.getElementById('include-recommendations').checked,
                        includeSensitive: document.getElementById('include-sensitive-pdf').checked,
                        format: document.querySelector('input[name="format"]:checked').value
                    };

                    createPDFContent(options);
                    document.body.removeChild(modal);
                };

                document.getElementById('close-pdf-modal').onclick = () => {
                    document.body.removeChild(modal);
                };

            } catch (error) {
                alert('Erro ao abrir opções de PDF: ' + error.message);
            }
        }

        function createPDFContent(options) {
            // Criar HTML formatado para conversão em PDF
            const reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8">
            <title>Browser Fingerprint Report</title>
            <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #576879; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section h2 { color: #576879; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .score { font-size: 2em; font-weight: bold; text-align: center; margin: 20px 0; }
            .risk-high { color: #e74c3c; }
            .risk-medium { color: #f39c12; }
            .risk-low { color: #27ae60; }
            .fingerprint { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 3px; word-break: break-all; }
            .recommendations { background: #f8f9fa; padding: 20px; border-left: 4px solid #576879; }
            .timestamp { color: #666; font-size: 0.9em; }
            ul { line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            </style>
            </head>
            <body>
            <div class="header">
            <h1>🔍 BROWSER FINGERPRINT REPORT</h1>
            <p class="timestamp">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Sistema de Análise de Vulnerabilidades e Privacidade</p>
            </div>

            ${options.includeSummary ? generateSummarySection() : ''}
            ${options.includePrivacy ? generatePrivacySection() : ''}
            ${options.includeTechnical ? generateTechnicalSection(options.includeSensitive) : ''}
            ${options.includeRecommendations ? generateRecommendationsSection() : ''}

            <div class="section">
            <h2>📋 Informações do Relatório</h2>
            <p><strong>Fingerprint Hash:</strong> <span class="fingerprint">${browserFingerprint}</span></p>
            <p><strong>URL de Origem:</strong> ${window.location.href}</p>
            <p><strong>User Agent:</strong> ${navigator.userAgent}</p>
            </div>
            </body>
            </html>
            `;

            // Criar iframe oculto para renderizar o PDF
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '800px';
            iframe.style.height = '600px';
            document.body.appendChild(iframe);

            iframe.contentDocument.open();
            iframe.contentDocument.write(reportHTML);
            iframe.contentDocument.close();

            // Aguardar o carregamento e imprimir
            setTimeout(() => {
                iframe.contentWindow.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 1000);
        }

        function generateSummarySection() {
            const riskLevel = privacyScore > 70 ? 'Baixo' : privacyScore > 40 ? 'Médio' : 'Alto';
            const riskClass = privacyScore > 70 ? 'risk-low' : privacyScore > 40 ? 'risk-medium' : 'risk-high';

            return `
            <div class="section">
            <h2>📊 Resumo Executivo</h2>
            <div class="score ${riskClass}">${privacyScore}/100 - Risco ${riskLevel}</div>
            <div class="info-grid">
            <div class="info-card">
            <h3>Identificação Única</h3>
            <p>Seu navegador possui um fingerprint único que pode ser usado para rastreamento.</p>
            <p><strong>Hash:</strong> ${browserFingerprint}</p>
            </div>
            <div class="info-card">
            <h3>Status de Privacidade</h3>
            <p>Nível de exposição: <span class="${riskClass}">${riskLevel}</span></p>
            <p>Vulnerabilidades encontradas: ${calculateVulnerabilities()}</p>
            </div>
            </div>
            </div>
            `;
        }

        function generatePrivacySection() {
            return `
            <div class="section">
            <h2>🛡️ Análise de Privacidade</h2>
            <table>
            <tr><th>Aspecto</th><th>Status</th><th>Impacto</th></tr>
            <tr><td>Canvas Fingerprinting</td><td>${detectedInfo.canvas ? 'Detectado' : 'Não detectado'}</td><td>${detectedInfo.canvas ? 'Alto' : 'Baixo'}</td></tr>
            <tr><td>WebGL Fingerprinting</td><td>${detectedInfo.webgl ? 'Detectado' : 'Não detectado'}</td><td>${detectedInfo.webgl ? 'Alto' : 'Baixo'}</td></tr>
            <tr><td>Geolocalização</td><td>${detectedInfo.preciseLocation ? 'Exposta' : 'Protegida'}</td><td>${detectedInfo.preciseLocation ? 'Crítico' : 'Baixo'}</td></tr>
            <tr><td>Do Not Track</td><td>${navigator.doNotTrack ? 'Ativo' : 'Inativo'}</td><td>${navigator.doNotTrack ? 'Baixo' : 'Médio'}</td></tr>
            </table>
            </div>
            `;
        }

        function generateTechnicalSection(includeSensitive) {
            let content = `
            <div class="section">
            <h2>⚙️ Detalhes Técnicos</h2>
            <h3>Informações do Sistema</h3>
            <ul>
            <li><strong>Plataforma:</strong> ${navigator.platform}</li>
            <li><strong>Arquitetura:</strong> ${detectedInfo.architecture?.architecture || 'N/A'}</li>
            <li><strong>Cores CPU:</strong> ${navigator.hardwareConcurrency}</li>
            <li><strong>Memória:</strong> ${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A'}</li>
            <li><strong>Tela:</strong> ${screen.width}x${screen.height}</li>
            <li><strong>Timezone:</strong> ${Intl.DateTimeFormat().resolvedOptions().timeZone}</li>
            </ul>
            `;

            if (includeSensitive) {
                content += `
                <h3>Informações de Rede (Sensíveis)</h3>
                <ul>
                <li><strong>IP Público:</strong> ${detectedInfo.ip?.ip || 'N/A'}</li>
                <li><strong>ISP:</strong> ${detectedInfo.ip?.org || 'N/A'}</li>
                <li><strong>Localização:</strong> ${detectedInfo.ip?.city || 'N/A'}, ${detectedInfo.ip?.region || 'N/A'}</li>
                </ul>
                `;
            }

            content += `</div>`;
            return content;
        }

        function generateRecommendationsSection() {
            return `
            <div class="section">
            <h2>💡 Recomendações de Segurança</h2>
            <div class="recommendations">
            <h3>Medidas Recomendadas:</h3>
            <ul>
            <li><strong>Use extensões anti-tracking:</strong> uBlock Origin, Privacy Badger</li>
            <li><strong>Configure seu navegador:</strong> Desabilite JavaScript para sites não confiáveis</li>
            <li><strong>Use VPN:</strong> Para mascarar seu IP e localização</li>
            <li><strong>Modo privado:</strong> Use para navegação sensível</li>
            <li><strong>Limpe dados:</strong> Cookies, cache e histórico regularmente</li>
            <li><strong>Atualize regularmente:</strong> Mantenha navegador e sistema atualizados</li>
            </ul>

            <h3>Configurações Avançadas:</h3>
            <ul>
            <li>Desabilite WebRTC se não precisar de videochamadas</li>
            <li>Use diferentes navegadores para diferentes atividades</li>
            <li>Configure DNS privado (Cloudflare 1.1.1.1, Quad9)</li>
            <li>Considere usar Tor Browser para máxima privacidade</li>
            </ul>
            </div>
            </div>
            `;
        }

        function calculateVulnerabilities() {
            let count = 0;
            if (detectedInfo.canvas) count++;
            if (detectedInfo.webgl) count++;
            if (detectedInfo.preciseLocation) count++;
            if (!navigator.doNotTrack) count++;
            if (navigator.cookieEnabled) count++;
            if (detectedInfo.webrtcComprehensive?.leaks?.length > 0) count++;
            return count;
        }

        function detectArchitecture() {
            const container = document.getElementById('architecture-info');

            // Detectar através de múltiplas fontes
            const platform = navigator.platform.toLowerCase();
            const userAgent = navigator.userAgent.toLowerCase();
            const maxTouchPoints = navigator.maxTouchPoints;

            let architecture = 'Unknown';
            let bits = 'Unknown';
            let deviceType = 'Unknown';

            // Detectar arquitetura
            if (platform.includes('win') && (platform.includes('wow64') || platform.includes('x64') || userAgent.includes('x64'))) {
                architecture = 'x64';
                bits = '64-bit';
            } else if (platform.includes('win')) {
                architecture = 'x86';
                bits = '32-bit';
            } else if (platform.includes('arm') || userAgent.includes('arm')) {
                architecture = 'ARM';
                bits = userAgent.includes('arm64') ? '64-bit' : '32-bit';
            } else if (platform.includes('x86_64') || platform.includes('amd64')) {
                architecture = 'x64';
                bits = '64-bit';
            } else if (platform.includes('i386') || platform.includes('i686')) {
                architecture = 'x86';
                bits = '32-bit';
            }

            // Detectar tipo de dispositivo
            if (maxTouchPoints > 0) {
                deviceType = 'Touch Device';
            } else if (userAgent.includes('mobile')) {
                deviceType = 'Mobile';
            } else if (userAgent.includes('tablet')) {
                deviceType = 'Tablet';
            } else {
                deviceType = 'Desktop';
            }

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">Arquitetura:</span>
            <span class="info-value">${architecture}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Bits:</span>
            <span class="info-value">${bits}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Tipo Device:</span>
            <span class="info-value">${deviceType}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Max Touch Points:</span>
            <span class="info-value">${maxTouchPoints}</span>
            </div>
            `;

            detectedInfo.architecture = {
                architecture,
                bits,
                deviceType,
                maxTouchPoints,
                platform: navigator.platform
            };
        }

        function getGPUDetails() {
            const container = document.getElementById('gpu-details-info');

            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

                if (!gl) {
                    container.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">GPU:</span>
                    <span class="info-value">WebGL não suportado</span>
                    </div>
                    `;
                    return;
                }

                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                const extensions = gl.getSupportedExtensions();

                // Informações detalhadas da GPU
                const gpuInfo = {
                    vendor: gl.getParameter(gl.VENDOR),
                    renderer: gl.getParameter(gl.RENDERER),
                    version: gl.getParameter(gl.VERSION),
                    glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                    unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Não disponível',
                    unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Não disponível',
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                    aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
                    aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
                    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
                    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
                    extensionsCount: extensions.length
                };

                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">GPU Vendor:</span>
                <span class="info-value">${gpuInfo.unmaskedVendor}</span>
                </div>
                <div class="info-item">
                <span class="info-label">GPU Renderer:</span>
                <span class="info-value">${gpuInfo.unmaskedRenderer}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Texture Size:</span>
                <span class="info-value">${gpuInfo.maxTextureSize}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Vertex Attribs:</span>
                <span class="info-value">${gpuInfo.maxVertexAttribs}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Viewport:</span>
                <span class="info-value">${gpuInfo.maxViewportDims[0]}x${gpuInfo.maxViewportDims[1]}</span>
                </div>
                <div class="info-item">
                <span class="info-label">WebGL Extensions:</span>
                <span class="info-value">${gpuInfo.extensionsCount}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Point Size Range:</span>
                <span class="info-value">${gpuInfo.aliasedPointSizeRange[0]} - ${gpuInfo.aliasedPointSizeRange[1]}</span>
                </div>
                `;

                detectedInfo.gpuDetails = gpuInfo;

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">GPU:</span>
                <span class="info-value">Erro ao detectar</span>
                </div>
                `;
            }
        }

        async function detectIPv6() {
            const container = document.getElementById('ipv6-info');

            const steps = [
                'Verificando IPv4 existente...',
                'Testando conectividade IPv6...',
                'Consultando DNS AAAA...',
                'Verificando WebRTC IPv6...',
                'Analisando dual stack...'
            ];

            progressManager.simulateProgress('ipv6-info', 3000, steps);

            try {
                let ipv6Info = {
                    hasIPv6: false,
                    ipv6Address: null,
                    ipv4Address: null,
                    dualStack: false,
                    connectivityTest: 'Testando...'
                };

                // Pegar IPv4 existente
                if (detectedInfo.ip && detectedInfo.ip.ip) {
                    ipv6Info.ipv4Address = detectedInfo.ip.ip;
                }

                // Teste 1: Tentar conectar a serviços IPv6-only
                try {
                    const ipv6Tests = [
                        'https://v6.ipv6-test.com/api/myip.php',
                        'https://ipv6.google.com',
                        'https://ipv6.facebook.com'
                    ];

                    for (const testUrl of ipv6Tests) {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 3000);

                            const response = await fetch(testUrl, {
                                signal: controller.signal,
                                mode: 'no-cors' // Evitar CORS issues
                            });

                            clearTimeout(timeoutId);

                            // Se chegou aqui, conseguiu conectar via IPv6
                            ipv6Info.hasIPv6 = true;
                            ipv6Info.connectivityTest = 'IPv6 conectividade detectada';
                            break;

                        } catch (e) {
                            if (e.name === 'AbortError') {
                                ipv6Info.connectivityTest = 'Timeout - provável ausência de IPv6';
                            }
                            continue;
                        }
                    }
                } catch (e) {
                    ipv6Info.connectivityTest = 'Teste de conectividade falhou';
                }

                // Teste 2: Verificar através de DNS
                if (!ipv6Info.hasIPv6) {
                    try {
                        // Tentar resolver AAAA record (IPv6) via API
                        const dnsResponse = await fetch('https://cloudflare-dns.com/dns-query?name=google.com&type=AAAA', {
                            headers: { 'Accept': 'application/dns-json' }
                        });

                        if (dnsResponse.ok) {
                            const dnsData = await dnsResponse.json();
                            if (dnsData.Answer && dnsData.Answer.length > 0) {
                                ipv6Info.connectivityTest = 'DNS suporta IPv6, mas conectividade local indisponível';
                            }
                        }
                    } catch (e) {
                        // DNS test failed
                    }
                }

                // Teste 3: Verificar suporte do navegador/sistema
                const hasIPv6BrowserSupport = typeof window.RTCPeerConnection !== 'undefined';

                // Teste 4: WebRTC ICE para detectar endereços IPv6 locais
                if (hasIPv6BrowserSupport) {
                    try {
                        const pc = new RTCPeerConnection({
                            iceServers: [
                                { urls: 'stun:stun.l.google.com:19302' }
                            ]
                        });

                        const localIPv6Addresses = [];

                        pc.onicecandidate = (event) => {
                            if (event.candidate) {
                                const candidate = event.candidate.candidate;
                                // Procurar por endereços IPv6 (contém :)
                                const ipMatch = candidate.match(/(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/);
                                if (ipMatch) {
                                    localIPv6Addresses.push(ipMatch[0]);
                                    ipv6Info.hasIPv6 = true;
                                    ipv6Info.ipv6Address = ipMatch[0];
                                }
                            }
                        };

                        pc.createDataChannel('test');
                        await pc.createOffer().then(offer => pc.setLocalDescription(offer));

                        // Aguardar um pouco para coletar candidatos
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        pc.close();

                    } catch (e) {
                        console.log('WebRTC test failed:', e);
                    }
                }

                // Determinar dual stack
                ipv6Info.dualStack = ipv6Info.hasIPv6 && ipv6Info.ipv4Address;

                // Se não tem IPv6 real, corrigir os valores
                if (!ipv6Info.hasIPv6) {
                    ipv6Info.ipv6Address = null;
                    ipv6Info.dualStack = false;
                }

                const finalContent = `
                <div class="info-item">
                <span class="info-label">IPv6 Disponível:</span>
                <span class="info-value">${ipv6Info.hasIPv6 ? 'Sim' : 'Não'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Endereço IPv6:</span>
                <span class="info-value">${ipv6Info.ipv6Address || 'Não detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Endereço IPv4:</span>
                <span class="info-value">${ipv6Info.ipv4Address || 'Não detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Dual Stack:</span>
                <span class="info-value">${ipv6Info.dualStack ? 'Sim' : 'Não'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Teste Conectividade:</span>
                <span class="info-value">${ipv6Info.connectivityTest}</span>
                </div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('ipv6-info', finalContent);
                    detectedInfo.ipv6 = ipv6Info;
                }, 3100);

            } catch (error) {
                const errorContent = `
                <div class="info-item">
                <span class="info-label">IPv6:</span>
                <span class="info-value">Erro na detecção: ${error.message}</span>
                </div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('ipv6-info', errorContent);
                }, 3100);
            }
        }

        async function comprehensiveWebRTCTest() {
            const container = document.getElementById('webrtc-comprehensive-info');

            const steps = [
                'Configurando testes paralelos...',
                'Testando STUN servers...',
                'Coletando candidatos ICE...',
                'Finalizando análise...'
            ];

            progressManager.simulateProgress('webrtc-comprehensive-info', 2000, steps); // Reduzido de 5000 para 2000

            try {
                const webrtcInfo = {
                    localIPs: [],
                    publicIPs: [],
                        stunServers: [],
                        turnSupport: false,
                        dtlsSupport: false,
                        srtpSupport: false,
                        candidateTypes: [],
                        leaks: []
                };

                // Lista reduzida e otimizada de STUN servers
                const stunServers = [
                    'stun:stun.l.google.com:19302',
                    'stun:stun.cloudflare.com:3478'
                    // Removido os outros para acelerar
                ];

                // Executar todos os testes em PARALELO
                const stunPromises = stunServers.map(stunServer => {
                    return new Promise(async (resolve) => {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 800); // Reduzido de 3000 para 800ms

                            const pc = new RTCPeerConnection({
                                iceServers: [{ urls: stunServer }]
                            });

                            const candidatesReceived = [];
                            let resolved = false;

                            pc.onicecandidate = (event) => {
                                if (event.candidate && !resolved) {
                                    const candidate = event.candidate.candidate;
                                    candidatesReceived.push(candidate);

                                    // Extrair IPs
                                    const ipMatch = candidate.match(/(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/);
                                    if (ipMatch) {
                                        const ip = ipMatch[0];

                                        if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
                                            if (!webrtcInfo.localIPs.includes(ip)) {
                                                webrtcInfo.localIPs.push(ip);
                                            }
                                        } else {
                                            if (!webrtcInfo.publicIPs.includes(ip)) {
                                                webrtcInfo.publicIPs.push(ip);
                                                webrtcInfo.leaks.push(`IP público vazado: ${ip}`);
                                            }
                                        }
                                    }

                                    // Classificar tipo de candidato
                                    if (candidate.includes('typ host')) {
                                        webrtcInfo.candidateTypes.push('Host');
                                    } else if (candidate.includes('typ srflx')) {
                                        webrtcInfo.candidateTypes.push('Server Reflexive');
                                    } else if (candidate.includes('typ relay')) {
                                        webrtcInfo.candidateTypes.push('Relay');
                                    } else if (candidate.includes('typ prflx')) {
                                        webrtcInfo.candidateTypes.push('Peer Reflexive');
                                    }
                                }
                            };

                            // Criar data channel para forçar ICE gathering
                            pc.createDataChannel('test');
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            // Aguardar candidatos (reduzido para 1 segundo)
                            setTimeout(() => {
                                clearTimeout(timeoutId);
                                resolved = true;
                                pc.close();

                                if (candidatesReceived.length > 0) {
                                    resolve({ success: true, server: stunServer });
                                } else {
                                    resolve({ success: false, server: stunServer });
                                }
                            }, 1000); // Reduzido de 3000 para 1000ms

                        } catch (e) {
                            resolve({ success: false, server: stunServer, error: e.message });
                        }
                    });
                });

                // Aguardar TODOS os testes em paralelo
                const results = await Promise.all(stunPromises);

                // Processar resultados
                results.forEach(result => {
                    if (result.success) {
                        webrtcInfo.stunServers.push(result.server);
                    }
                });

                // Testar suporte a protocolos rapidamente
                try {
                    const capabilities = RTCRtpSender.getCapabilities ? RTCRtpSender.getCapabilities('video') : null;
                    if (capabilities) {
                        webrtcInfo.dtlsSupport = capabilities.headerExtensions?.some(ext => ext.uri.includes('urn:ietf:params:rtp-hdrext:encrypt')) || false;
                        webrtcInfo.srtpSupport = true;
                    }
                } catch (e) {
                    webrtcInfo.srtpSupport = false;
                }

                // Remover duplicatas
                webrtcInfo.candidateTypes = [...new Set(webrtcInfo.candidateTypes)];

                const finalContent = `
                <div class="info-item">
                <span class="info-label">IPs Locais:</span>
                <span class="info-value">${webrtcInfo.localIPs.length > 0 ? webrtcInfo.localIPs.join(', ') : 'Nenhum detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">IPs Públicos:</span>
                <span class="info-value">${webrtcInfo.publicIPs.length > 0 ? webrtcInfo.publicIPs.join(', ') : 'Nenhum detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">STUN Servers OK:</span>
                <span class="info-value">${webrtcInfo.stunServers.length}/${stunServers.length}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Tipos de Candidato:</span>
                <span class="info-value">${webrtcInfo.candidateTypes.join(', ') || 'Nenhum'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">SRTP Suporte:</span>
                <span class="info-value">${webrtcInfo.srtpSupport ? 'Sim' : 'Não'}</span>
                </div>
                ${webrtcInfo.leaks.length > 0 ? `
                    <div class="info-item" style="color: #ff6600;">
                    <span class="info-label">⚠️ Vazamentos:</span>
                    <span class="info-value">${webrtcInfo.leaks.length}</span>
                    </div>` : ''}
                    `;

                    // Mostrar resultado imediatamente quando terminar
                    progressManager.completeProgress('webrtc-comprehensive-info', finalContent);
                    detectedInfo.webrtcComprehensive = webrtcInfo;

            } catch (error) {
                const errorContent = `
                <div class="info-item">
                <span class="info-label">WebRTC Test:</span>
                <span class="info-value">Erro: ${error.message}</span>
                </div>
                `;
                progressManager.completeProgress('webrtc-comprehensive-info', errorContent);
            }
        }

        async function detectExtensions() {
            const container = document.getElementById('extensions-info');

            const steps = [
                'Configurando testes...',
                'Testando timing de recursos...',
                'Verificando DOM...',
                'Analisando APIs...',
                'Compilando resultados...'
            ];

            progressManager.simulateProgress('extensions-info', 2000, steps);

            try {
                const detectedExtensions = [];
                const suspiciousTimings = [];

                // Lista de extensões comuns para testar
                const extensionsToTest = [
                    { name: 'uBlock Origin', resource: 'chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/web_accessible_resources/1x1.gif' },
                    { name: 'AdBlock', resource: 'chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/web_accessible_resources/transparent.gif' },
                    { name: 'Ghostery', resource: 'chrome-extension://mlomiejdfkolichcflejclcbmpeaniij/web_accessible_resources/click2load.css' },
                    { name: 'Privacy Badger', resource: 'chrome-extension://pkehgijcmpdhfbdbbnkijodmdjhbjlgp/web_accessible_resources/fingerprinting.js' },
                    { name: 'LastPass', resource: 'chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/web_accessible_resources/vault.js' },
                    { name: 'Honey', resource: 'chrome-extension://bmnlcjabgnpnenekpadlanbbkooimhnj/web_accessible_resources/honey.js' },
                    { name: 'Grammarly', resource: 'chrome-extension://kbfnbcaeplbcioakkpcpgfkobkghlhen/web_accessible_resources/editor.css' },
                    { name: 'MetaMask', resource: 'chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/web_accessible_resources/inpage.js' }
                ];

                // Método 1: Timing de recursos
                for (const ext of extensionsToTest) {
                    try {
                        const startTime = performance.now();

                        await fetch(ext.resource, {
                            method: 'HEAD',
                            mode: 'no-cors',
                            cache: 'no-cache'
                        }).catch(() => {});

                        const endTime = performance.now();
                        const loadTime = endTime - startTime;

                        // Se o timing for muito rápido, pode indicar que a extensão está presente
                        if (loadTime < 10) {
                            detectedExtensions.push(ext.name);
                        } else if (loadTime > 100) {
                            suspiciousTimings.push(`${ext.name}: ${loadTime.toFixed(2)}ms`);
                        }

                    } catch (e) {
                        // Extensão não detectada via este método
                    }
                }

                // Método 2: Verificar modificações no DOM conhecidas
                const domSignatures = [
                    { name: 'uBlock Origin', selector: '[data-ublock]' },
                    { name: 'AdBlock Plus', selector: '[data-adblock-key]' },
                    { name: 'Ghostery', selector: '[data-ghostery]' },
                    { name: 'Grammarly', selector: 'grammarly-extension' },
                    { name: 'LastPass', selector: '[data-lastpass-icon-root]' }
                ];

                for (const signature of domSignatures) {
                    if (document.querySelector(signature.selector)) {
                        if (!detectedExtensions.includes(signature.name)) {
                            detectedExtensions.push(signature.name);
                        }
                    }
                }

                // Método 3: Verificar APIs modificadas
                const apiModifications = [];

                // Verificar se XMLHttpRequest foi modificado (comum em ad blockers)
                if (XMLHttpRequest.prototype.open.toString().length > 100) {
                    apiModifications.push('XMLHttpRequest modificado');
                }

                // Verificar se fetch foi modificado
                if (window.fetch.toString().includes('[native code]') === false) {
                    apiModifications.push('Fetch API modificado');
                }

                // Verificar Content Security Policy modifications
                const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
                if (cspMeta && cspMeta.content.includes('extension:')) {
                    apiModifications.push('CSP modificado por extensão');
                }

                // Método 4: Verificar window properties adicionadas
                const knownExtensionProperties = [
                    'grammarly', 'lastpass', 'metamask', 'ethereum',
                    '__uBlock', '__AdBlock', '__ghostery'
                ];

                const foundProperties = knownExtensionProperties.filter(prop =>
                window.hasOwnProperty(prop) || window[prop] !== undefined
                );

                const finalContent = `
                <div class="info-item">
                <span class="info-label">Extensões Detectadas:</span>
                <span class="info-value">${detectedExtensions.length > 0 ? detectedExtensions.join(', ') : 'Nenhuma detectada'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">APIs Modificadas:</span>
                <span class="info-value">${apiModifications.length > 0 ? apiModifications.join(', ') : 'Nenhuma'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Window Properties:</span>
                <span class="info-value">${foundProperties.length > 0 ? foundProperties.join(', ') : 'Nenhuma'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Timings Suspeitos:</span>
                <span class="info-value">${suspiciousTimings.length}</span>
                </div>
                ${suspiciousTimings.length > 0 ? `
                    <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
                    ${suspiciousTimings.slice(0, 3).join('<br>')}
                    </div>` : ''}
                    `;

                    setTimeout(() => {
                        progressManager.completeProgress('extensions-info', finalContent);
                        detectedInfo.extensions = {
                            detected: detectedExtensions,
                            apiModifications,
                            windowProperties: foundProperties,
                            suspiciousTimings
                        };
                    }, 2100);

            } catch (error) {
                const errorContent = `
                <div class="info-item">
                <span class="info-label">Extensões:</span>
                <span class="info-value">Erro na detecção</span>
                </div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('extensions-info', errorContent);
                }, 2100);
            }
        }

        function detectAdBlocker() {
            const container = document.getElementById('adblocker-info');

            try {
                const adBlockTests = {
                    basicTest: false,
                    baitElement: false,
                    fetchTest: false,
                    cssTest: false,
                    scriptTest: false
                };

                let adBlockerDetected = false;
                let detectionMethods = [];

                // Teste 1: Elemento "isca" comum
                const baitElement = document.createElement('div');
                baitElement.className = 'ad ads advertisement banner-ad popup-ad';
                baitElement.style.position = 'absolute';
                baitElement.style.left = '-9999px';
                baitElement.style.width = '1px';
                baitElement.style.height = '1px';
                document.body.appendChild(baitElement);

                setTimeout(() => {
                    const rect = baitElement.getBoundingClientRect();
                    if (rect.height === 0 || rect.width === 0 ||
                        window.getComputedStyle(baitElement).display === 'none' ||
                        window.getComputedStyle(baitElement).visibility === 'hidden') {
                        adBlockTests.baitElement = true;
                    adBlockerDetected = true;
                    detectionMethods.push('Elemento isca bloqueado');
                        }
                        document.body.removeChild(baitElement);
                }, 100);

                // Teste 2: Tentar carregar scripts de ad networks conhecidos
                const adNetworks = [
                    'https://googleads.g.doubleclick.net/pagead/ads',
                    'https://googlesyndication.com/pagead/show_ads.js',
                    'https://amazon-adsystem.com/aax2/amzn_ads.js'
                ];

                let blockedNetworks = 0;

                let networkTestAdded = false;
                adNetworks.forEach(url => {
                    fetch(url, { method: 'HEAD', mode: 'no-cors' })
                    .catch(() => {
                        blockedNetworks++;
                        if (blockedNetworks >= 2 && !networkTestAdded) {
                            adBlockTests.fetchTest = true;
                            adBlockerDetected = true;
                            detectionMethods.push('Redes de anúncio bloqueadas');
                            networkTestAdded = true; // ← PREVINE DUPLICAÇÃO
                        }
                    });
                });

                // Teste 3: CSS classes comuns de ad blockers
                const testCSS = document.createElement('style');
                testCSS.textContent = `
                .ad-test-element {
                    display: block !important;
                    width: 100px !important;
                    height: 100px !important;
                }
                `;
                document.head.appendChild(testCSS);

                const cssTestElement = document.createElement('div');
                cssTestElement.className = 'ad-test-element adsbox';
                cssTestElement.style.position = 'absolute';
                cssTestElement.style.left = '-9999px';
                document.body.appendChild(cssTestElement);

                setTimeout(() => {
                    const computedStyle = window.getComputedStyle(cssTestElement);
                    if (computedStyle.display === 'none' ||
                        computedStyle.width === '0px' ||
                        computedStyle.height === '0px') {
                        adBlockTests.cssTest = true;
                    adBlockerDetected = true;
                    detectionMethods.push('CSS bloqueado');
                        }
                        document.body.removeChild(cssTestElement);
                        document.head.removeChild(testCSS);
                }, 100);

                // Teste 4: Verificar se APIs foram modificadas
                if (typeof window.addEventListener.toString !== 'function' ||
                    window.addEventListener.toString().indexOf('[native code]') === -1) {
                    adBlockTests.scriptTest = true;
                adBlockerDetected = true;
                detectionMethods.push('APIs modificadas');
                    }

                    // Teste 5: Verificar filtros conhecidos
                    const filterTests = [
                        '##.ads',
                        '##.advertisement',
                        '###ad-banner',
                        '##[id*="google_ads"]'
                    ];

                    let filtersDetected = 0;
                    filterTests.forEach(filter => {
                        try {
                            const testEl = document.createElement('div');
                            testEl.id = 'google_ads_test';
                            testEl.className = 'ads advertisement';
                            document.body.appendChild(testEl);

                            setTimeout(() => {
                                if (window.getComputedStyle(testEl).display === 'none') {
                                    filtersDetected++;
                                }
                                document.body.removeChild(testEl);
                            }, 50);
                        } catch (e) {}
                    });

                    if (filtersDetected > 0) {
                        adBlockerDetected = true;
                        detectionMethods.push('Filtros CSS detectados');
                    }

                    // Aguardar todos os testes assíncronos
                    setTimeout(() => {
                        container.innerHTML = `
                        <div class="info-item">
                        <span class="info-label">Ad Blocker:</span>
                        <span class="info-value">${adBlockerDetected ? 'Detectado' : 'Não detectado'}</span>
                        </div>
                        <div class="info-item">
                        <span class="info-label">Métodos Ativados:</span>
                        <span class="info-value">${detectionMethods.length}</span>
                        </div>
                        <div class="info-item">
                        <span class="info-label">Elemento Isca:</span>
                        <span class="info-value">${adBlockTests.baitElement ? 'Bloqueado' : 'OK'}</span>
                        </div>
                        <div class="info-item">
                        <span class="info-label">Redes de Anúncio:</span>
                        <span class="info-value">${adBlockTests.fetchTest ? 'Bloqueadas' : 'Acessíveis'}</span>
                        </div>
                        <div class="info-item">
                        <span class="info-label">CSS Filtros:</span>
                        <span class="info-value">${adBlockTests.cssTest ? 'Ativos' : 'Inativos'}</span>
                        </div>
                        ${detectionMethods.length > 0 ? `
                            <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
                            <strong>Detecções:</strong><br>
                            ${detectionMethods.join('<br>')}
                            </div>` : ''}
                            `;

                            detectedInfo.adBlocker = {
                                detected: adBlockerDetected,
                                methods: detectionMethods,
                                tests: adBlockTests
                            };
                    }, 500);

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Ad Blocker:</span>
                <span class="info-value">Erro na detecção</span>
                </div>
                `;
            }
        }

        function exportResults() {
            try {
                // Preparar dados para export
                const exportData = {
                    timestamp: new Date().toISOString(),
                    fingerprint: browserFingerprint,
                    privacyScore: privacyScore,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    data: detectedInfo
                };

                // Criar modal de export
                const modal = document.createElement('div');
                modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                background: #111;
                border: 2px solid #576879;
                border-radius: 8px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: #fff;
                `;

                modalContent.innerHTML = `
                <h3 style="margin-bottom: 20px; color: #00f000;">📊 Exportar Resultados</h3>
                <div style="margin-bottom: 20px;">
                <button id="export-json" class="export-btn">📄 JSON</button>
                <button id="export-csv" class="export-btn">📊 CSV</button>
                <button id="export-txt" class="export-btn">📝 TXT</button>
                </div>
                <div style="margin-bottom: 20px;">
                <label>
                <input type="checkbox" id="include-sensitive" checked>
                Incluir dados sensíveis (IPs, localização)
                </label>
                </div>
                <button id="close-modal" style="background: #ff6600; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Fechar</button>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                // Estilo para botões de export
                const style = document.createElement('style');
                style.textContent = `
                .export-btn {
                    background: #00f000;
                    color: #000;
                    border: none;
                    padding: 12px 20px;
                    margin: 5px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .export-btn:hover {
                    background: #00d000;
                    transform: scale(1.05);
                }
                `;
                document.head.appendChild(style);

                // Event listeners
                document.getElementById('export-json').onclick = () => exportAsJSON(exportData);
                document.getElementById('export-csv').onclick = () => exportAsCSV(exportData);
                document.getElementById('export-txt').onclick = () => exportAsTXT(exportData);
                document.getElementById('close-modal').onclick = () => {
                    document.body.removeChild(modal);
                    document.head.removeChild(style);
                };

                // Função para limpar dados sensíveis se necessário
                function sanitizeData(data) {
                    const sensitive = document.getElementById('include-sensitive').checked;
                    if (sensitive) return data;

                    const sanitized = JSON.parse(JSON.stringify(data));
                    if (sanitized.data.ip) delete sanitized.data.ip;
                    if (sanitized.data.preciseLocation) delete sanitized.data.preciseLocation;
                    if (sanitized.data.webrtcComprehensive) {
                        sanitized.data.webrtcComprehensive.localIPs = [];
                        sanitized.data.webrtcComprehensive.publicIPs = [];
                    }
                    return sanitized;
                }

                function exportAsJSON(data) {
                    const sanitizedData = sanitizeData(data);
                    const blob = new Blob([JSON.stringify(sanitizedData, null, 2)], {type: 'application/json'});
                    downloadFile(blob, `fingerprint_${Date.now()}.json`);
                }

                function exportAsCSV(data) {
                    const sanitizedData = sanitizeData(data);
                    let csv = 'Campo,Valor\n';

                    function flattenObject(obj, prefix = '') {
                        for (const key in obj) {
                            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                                flattenObject(obj[key], prefix + key + '.');
                            } else {
                                csv += `"${prefix + key}","${Array.isArray(obj[key]) ? obj[key].join(';') : String(obj[key]).replace(/"/g, '""')}"\n`;
                            }
                        }
                    }

                    flattenObject(sanitizedData);
                    const blob = new Blob([csv], {type: 'text/csv'});
                    downloadFile(blob, `fingerprint_${Date.now()}.csv`);
                }

                function exportAsTXT(data) {
                    const sanitizedData = sanitizeData(data);
                    let txt = '=== BROWSER FINGERPRINT REPORT ===\n\n';
                    txt += `Timestamp: ${sanitizedData.timestamp}\n`;
                    txt += `Fingerprint: ${sanitizedData.fingerprint}\n`;
                    txt += `Privacy Score: ${sanitizedData.privacyScore}/100\n\n`;

                    function objectToText(obj, indent = 0) {
                        let result = '';
                        for (const key in obj) {
                            const spaces = '  '.repeat(indent);
                            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                                result += `${spaces}${key}:\n`;
                                result += objectToText(obj[key], indent + 1);
                            } else {
                                result += `${spaces}${key}: ${Array.isArray(obj[key]) ? obj[key].join(', ') : obj[key]}\n`;
                            }
                        }
                        return result;
                    }

                    txt += objectToText(sanitizedData.data);
                    const blob = new Blob([txt], {type: 'text/plain'});
                    downloadFile(blob, `fingerprint_${Date.now()}.txt`);
                }

                function downloadFile(blob, filename) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

            } catch (error) {
                alert('Erro ao exportar: ' + error.message);
            }
        }

        function getAudioFingerprint() {
            const container = document.getElementById('audio-info');

            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;

                if (!AudioContext) {
                    container.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">Audio:</span>
                    <span class="info-value">AudioContext não suportado</span>
                    </div>
                    `;
                    return;
                }

                const audioCtx = new AudioContext();

                // Criar oscillator para fingerprinting
                const oscillator = audioCtx.createOscillator();
                const analyser = audioCtx.createAnalyser();
                const gainNode = audioCtx.createGain();
                const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);

                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

                oscillator.connect(analyser);
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start(0);

                const audioData = new Float32Array(analyser.frequencyBinCount);
                analyser.getFloatFrequencyData(audioData);

                // Gerar hash do audio data
                const audioHash = hashCode(audioData.toString());

                const audioInfo = {
                    sampleRate: audioCtx.sampleRate,
                    state: audioCtx.state,
                    maxChannelCount: audioCtx.destination.maxChannelCount,
                    numberOfInputs: audioCtx.destination.numberOfInputs,
                    numberOfOutputs: audioCtx.destination.numberOfOutputs,
                    baseLatency: audioCtx.baseLatency || 'Não disponível',
                    outputLatency: audioCtx.outputLatency || 'Não disponível',
                    audioHash: audioHash
                };

                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Sample Rate:</span>
                <span class="info-value">${audioInfo.sampleRate} Hz</span>
                </div>
                <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">${audioInfo.state}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Channels:</span>
                <span class="info-value">${audioInfo.maxChannelCount}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Base Latency:</span>
                <span class="info-value">${audioInfo.baseLatency}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Audio Hash:</span>
                <span class="info-value">${audioInfo.audioHash}</span>
                </div>
                `;

                // Cleanup
                oscillator.stop(audioCtx.currentTime + 0.1);
                audioCtx.close();

                detectedInfo.audio = audioInfo;

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Audio:</span>
                <span class="info-value">Erro ao detectar</span>
                </div>
                `;
            }
        }

        // 1. Função para solicitar permissão de localização
        async function requestLocationPermission() {
            const locationBtn = document.getElementById('location-btn');
            const locationContainer = document.getElementById('location-details');

            if (locationBtn) {
                locationBtn.innerHTML = '📍 Obtendo localização...';
                locationBtn.disabled = true;
            }

            try {
                const position = await getCurrentPosition();
                const { latitude, longitude } = position.coords;

                // Obter endereço completo
                const address = await getAddressFromCoords(latitude, longitude);

                // Salvar dados de localização precisa
                detectedInfo.preciseLocation = {
                    latitude,
                    longitude,
                    accuracy: position.coords.accuracy,
                    address: address
                };

                console.log('Localização precisa obtida:', detectedInfo.preciseLocation);

                // Atualizar apenas a seção de detalhes de localização
                const preciseLocationHTML = `
                <div style="border-top: 1px solid #576879; margin-top: 15px; padding-top: 15px;">
                <div class="info-item">
                <span class="info-label">Latitude:</span>
                <span class="info-value">${latitude.toFixed(6)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Longitude:</span>
                <span class="info-value">${longitude.toFixed(6)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Precisão:</span>
                <span class="info-value">${position.coords.accuracy.toFixed(0)}m</span>
                </div>
                <div class="info-item">
                <span class="info-label">Endereço:</span>
                <span class="info-value">${address}</span>
                </div>
                </div>
                `;

                if (locationContainer) {
                    locationContainer.innerHTML = preciseLocationHTML;
                }

                // Carregar mapa
                loadGoogleMap(latitude, longitude);

                // Remover botão após sucesso
                if (locationBtn) {
                    locationBtn.remove();
                }

                // **IMPORTANTE**: Atualizar todo o card de IP com informações completas
                await updateLocationInfo();

                console.log('Card de IP atualizado com localização precisa');

            } catch (error) {
                console.error('Erro ao obter localização:', error);

                if (locationBtn) {
                    locationBtn.innerHTML = '❌ Permissão negada';
                    locationBtn.disabled = false;
                }

                if (locationContainer) {
                    locationContainer.innerHTML = `
                    <div style="border-top: 1px solid #576879; margin-top: 15px; padding-top: 15px;">
                    <div class="info-item">
                    <span class="info-label">Erro:</span>
                    <span class="info-value">${getLocationErrorMessage(error.code)}</span>
                    </div>
                    </div>
                    `;
                }
            }
        }

        // 2. Função para obter posição atual (Promise wrapper)
        function getCurrentPosition() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocalização não suportada'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutos
                    }
                );
            });
        }

        // 3. Função para obter endereço por geocodificação reversa
        async function getAddressFromCoords(lat, lng) {
            try {
                // Usando API gratuita do OpenStreetMap Nominatim
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
                );

                if (!response.ok) {
                    throw new Error('Erro na geocodificação');
                }

                const data = await response.json();

                if (data.display_name) {
                    return data.display_name;
                }

                // Fallback: construir endereço manualmente
                const address = data.address || {};
                const parts = [
                    address.road || address.pedestrian || address.path,
                    address.house_number,
                    address.suburb || address.neighbourhood,
                    address.city || address.town || address.village,
                    address.state,
                    address.country
                ].filter(Boolean);

                return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            } catch (error) {
                console.error('Erro na geocodificação:', error);
                return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        }

        // 4. Função para verificar permissão de localização
        async function checkLocationPermission() {
            if (!navigator.permissions) {
                return 'unavailable';
            }

            try {
                const permission = await navigator.permissions.query({name: 'geolocation'});
                return permission.state; // 'granted', 'denied', 'prompt'
            } catch (error) {
                return 'unknown';
            }
        }

        // 5. Função para obter mensagem de erro amigável
        function getLocationErrorMessage(errorCode) {
            switch (errorCode) {
                case 1:
                    return 'Permissão de localização negada pelo usuário';
                case 2:
                    return 'Localização indisponível';
                case 3:
                    return 'Tempo limite para obter localização';
                default:
                    return 'Erro desconhecido ao obter localização';
            }
        }

        // 6. Função para obter posição atual (Promise wrapper)
        function getCurrentPosition() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocalização não suportada'));
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutos
                    }
                );
            });
        }

        // 7. Função para obter endereço por geocodificação reversa
        async function getAddressFromCoords(lat, lng) {
            try {
                // Usando API gratuita do OpenStreetMap Nominatim
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
                );

                if (!response.ok) {
                    throw new Error('Erro na geocodificação');
                }

                const data = await response.json();

                if (data.display_name) {
                    return data.display_name;
                }

                // Fallback: construir endereço manualmente
                const address = data.address || {};
                const parts = [
                    address.road || address.pedestrian || address.path,
                    address.house_number,
                    address.suburb || address.neighbourhood,
                    address.city || address.town || address.village,
                    address.state,
                    address.country
                ].filter(Boolean);

                return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

            } catch (error) {
                console.error('Erro na geocodificação:', error);
                return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        }

        // 8. Função para carregar área de mapas (apenas links)
        function loadGoogleMap(latitude, longitude) {
            const mapContainer = document.getElementById('map-container');

            if (!mapContainer) {
                console.error('Container do mapa não encontrado');
                return;
            }

            // Criar container visual para as coordenadas
            const coordsDisplay = document.createElement('div');
            coordsDisplay.style.background = '#0a0a0a';
            coordsDisplay.style.border = '2px solid #576879';
            coordsDisplay.style.borderRadius = '8px';
            coordsDisplay.style.padding = '20px';
            coordsDisplay.style.marginTop = '10px';
            coordsDisplay.style.textAlign = 'center';
            coordsDisplay.style.color = '#00f000';
            coordsDisplay.style.fontFamily = 'Courier New, monospace';

            coordsDisplay.innerHTML = `
            <div style="font-size: 1.2em; margin-bottom: 10px;">📍 Localização Detectada</div>
            <div style="font-size: 0.9em; color: #ccc;">
            <strong>Latitude:</strong> ${latitude.toFixed(6)}<br>
            <strong>Longitude:</strong> ${longitude.toFixed(6)}
            </div>
            `;

            // Adicionar links úteis
            const linksDiv = document.createElement('div');
            linksDiv.style.marginTop = '15px';
            linksDiv.style.fontSize = '0.9em';
            linksDiv.innerHTML = `
            <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" style="color: #00f000; text-decoration: none; margin-right: 15px; display: inline-block; padding: 8px 16px; border: 1px solid #00f000; border-radius: 5px; transition: all 0.3s ease;">
            🌍 Abrir no Google Maps
            </a>
            <a href="https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16" target="_blank" style="color: #00f000; text-decoration: none; display: inline-block; padding: 8px 16px; border: 1px solid #00f000; border-radius: 5px; transition: all 0.3s ease;">
            🗺️ Abrir no OpenStreetMap
            </a>
            `;

            // Limpar container e adicionar elementos
            mapContainer.innerHTML = '';
            mapContainer.appendChild(coordsDisplay);
            mapContainer.appendChild(linksDiv);

            // Adicionar hover effects via JavaScript
            const links = linksDiv.querySelectorAll('a');
            links.forEach(link => {
                link.addEventListener('mouseenter', () => {
                    link.style.backgroundColor = '#00f000';
                    link.style.color = '#000';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.backgroundColor = 'transparent';
                    link.style.color = '#00f000';
                });
            });
        }

        // 9. Função para verificar permissão de localização
        async function checkLocationPermission() {
            if (!navigator.permissions) {
                return 'unavailable';
            }

            try {
                const permission = await navigator.permissions.query({name: 'geolocation'});
                return permission.state; // 'granted', 'denied', 'prompt'
            } catch (error) {
                return 'unknown';
            }
        }

        // 10. Função para obter mensagem de erro amigável
        function getLocationErrorMessage(errorCode) {
            switch (errorCode) {
                case 1:
                    return 'Permissão de localização negada pelo usuário';
                case 2:
                    return 'Localização indisponível';
                case 3:
                    return 'Tempo limite para obter localização';
                default:
                    return 'Erro desconhecido ao obter localização';
            }
        }

        async function loadIPInfo() {
            const container = document.getElementById('ip-info');

            const steps = [
                'Testando API Ipify...',
                'Testando API Ipapi...',
                'Testando API Ipinfo...',
                'Verificando permissões...',
                'Preparando localização...'
            ];

            progressManager.simulateProgress('ip-info', 3000, steps);

            try {
                // Tentar múltiplas APIs para obter informações de IP
                const apis = [
                    { url: 'https://ipapi.co/json/', priority: 1 },
                    { url: 'https://ipinfo.io/json', priority: 2 },
                    { url: 'https://api.ipify.org?format=json', priority: 3 }
                ];

                let ipData = null;

                // Testar APIs em ordem de prioridade
                for (const api of apis) {
                    try {
                        console.log(`Testando API: ${api.url}`);
                        const response = await fetch(api.url, {
                            signal: AbortSignal.timeout(5000) // 5 segundos timeout
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log(`Dados recebidos da API ${api.url}:`, data);

                            // Normalizar dados de diferentes APIs
                            ipData = normalizeIPData(data, api.url);

                            if (ipData && ipData.ip) {
                                console.log('IP Data normalizado:', ipData);
                                break;
                            }
                        }
                    } catch (e) {
                        console.error(`Erro na API ${api.url}:`, e);
                        continue;
                    }
                }

                // Se nenhuma API funcionou, usar dados básicos
                if (!ipData) {
                    ipData = {
                        ip: 'Não disponível',
                        city: 'Não disponível',
                        region: 'Não disponível',
                        country: 'Não disponível',
                        org: 'Não disponível',
                        timezone: 'Não disponível'
                    };
                }

                // Verificar permissão de localização
                const locationPermission = await checkLocationPermission();

                // Construir o HTML com os dados disponíveis
                let locationButton = '';
                if (locationPermission !== 'granted') {
                    locationButton = `
                    <button id="location-btn" class="location-btn" onclick="requestLocationPermission()">
                    📍 Descobrir Localização Precisa
                    </button>
                    `;
                }

                const finalContent = `
                <div class="info-item">
                <span class="info-label">IP Público:</span>
                <span class="info-value">${ipData.ip}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Cidade:</span>
                <span class="info-value">${ipData.city}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Região:</span>
                <span class="info-value">${ipData.region}</span>
                </div>
                <div class="info-item">
                <span class="info-label">País:</span>
                <span class="info-value">${ipData.country}</span>
                </div>
                <div class="info-item">
                <span class="info-label">ISP:</span>
                <span class="info-value">${ipData.org}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Timezone:</span>
                <span class="info-value">${ipData.timezone}</span>
                </div>
                ${locationButton}
                <div id="location-details"></div>
                <div id="map-container"></div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('ip-info', finalContent);

                    // Salvar dados globalmente
                    detectedInfo.ip = ipData;
                    console.log('detectedInfo.ip atualizado:', detectedInfo.ip);

                    // Se já tem permissão, carregar automaticamente
                    if (locationPermission === 'granted') {
                        setTimeout(() => {
                            requestLocationPermission();
                        }, 1000);
                    }
                }, 3100);

            } catch (error) {
                console.error('Erro geral em loadIPInfo:', error);

                const errorContent = `
                <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">Erro ao carregar informações de IP</span>
                </div>
                <div class="info-item">
                <span class="info-label">IP Local:</span>
                <span class="info-value">${getLocalIP()}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Erro:</span>
                <span class="info-value">${error.message}</span>
                </div>
                `;

                setTimeout(() => {
                    progressManager.completeProgress('ip-info', errorContent);
                }, 3100);
            }
        }

        function normalizeIPData(data, apiUrl) {
            console.log('Normalizando dados da API:', apiUrl, data);

            const normalized = {
                ip: data.ip || data.query || 'Não disponível',
                city: data.city || 'Não disponível',
                region: data.region || data.regionName || data.state || 'Não disponível',
                country: data.country || data.country_name || data.countryCode || 'Não disponível',
                org: data.org || data.isp || data.as || 'Não disponível',
                timezone: data.timezone || 'Não disponível'
            };

            // Corrigir campos específicos por API
            if (apiUrl.includes('ipapi.co')) {
                normalized.country = data.country_name || data.country || 'Não disponível';
                normalized.org = data.org || 'Não disponível';
            } else if (apiUrl.includes('ipinfo.io')) {
                normalized.country = data.country || 'Não disponível';
                normalized.org = data.org || 'Não disponível';
            } else if (apiUrl.includes('ip-api.com')) {
                normalized.country = data.country || 'Não disponível';
                normalized.region = data.regionName || 'Não disponível';
                normalized.org = data.isp || data.as || 'Não disponível';
            }

            console.log('Dados normalizados:', normalized);
            return normalized;
        }

        async function updateLocationInfo() {
            const container = document.getElementById('ip-info');

            if (!container || !detectedInfo.ip || !detectedInfo.preciseLocation) {
                return;
            }

            // Construir HTML atualizado com localização precisa
            const updatedContent = `
            <div class="info-item">
            <span class="info-label">IP Público:</span>
            <span class="info-value">${detectedInfo.ip.ip}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Cidade:</span>
            <span class="info-value">${detectedInfo.ip.city}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Região:</span>
            <span class="info-value">${detectedInfo.ip.region}</span>
            </div>
            <div class="info-item">
            <span class="info-label">País:</span>
            <span class="info-value">${detectedInfo.ip.country}</span>
            </div>
            <div class="info-item">
            <span class="info-label">ISP:</span>
            <span class="info-value">${detectedInfo.ip.org}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Timezone:</span>
            <span class="info-value">${detectedInfo.ip.timezone}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Latitude:</span>
            <span class="info-value">${detectedInfo.preciseLocation.latitude.toFixed(6)}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Longitude:</span>
            <span class="info-value">${detectedInfo.preciseLocation.longitude.toFixed(6)}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Precisão:</span>
            <span class="info-value">${detectedInfo.preciseLocation.accuracy.toFixed(0)}m</span>
            </div>
            <div class="info-item">
            <span class="info-label">Endereço:</span>
            <span class="info-value">${detectedInfo.preciseLocation.address}</span>
            </div>
            <div id="location-details"></div>
            <div id="map-container"></div>
            `;

            container.innerHTML = updatedContent;

            // Recarregar o mapa
            if (detectedInfo.preciseLocation) {
                loadGoogleMap(detectedInfo.preciseLocation.latitude, detectedInfo.preciseLocation.longitude);
            }
        }

        function getLocalIP() {
            try {
                // Tentar detectar IP local via WebRTC
                return new Promise((resolve) => {
                    const pc = new RTCPeerConnection({ iceServers: [] });

                    pc.onicecandidate = (ice) => {
                        if (ice.candidate) {
                            const localIP = ice.candidate.candidate.split(' ')[4];
                            if (localIP && (localIP.includes('192.168') || localIP.includes('10.0') || localIP.includes('172.'))) {
                                resolve(localIP);
                                pc.close();
                                return;
                            }
                        }
                    };

                    pc.createDataChannel('');
                    pc.createOffer().then(pc.setLocalDescription.bind(pc));

                    setTimeout(() => {
                        resolve('Não detectado');
                        pc.close();
                    }, 2000);
                });
            } catch (e) {
                return 'Não disponível';
            }
        }

        // Carregar informações básicas
        function loadBasicInfo() {
            const container = document.getElementById('basic-info');

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">User Agent:</span>
            <span class="info-value">${navigator.userAgent}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Plataforma:</span>
            <span class="info-value">${navigator.platform}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Idioma:</span>
            <span class="info-value">${navigator.language}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Idiomas:</span>
            <span class="info-value">${navigator.languages.join(', ')}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Timezone:</span>
            <span class="info-value">${Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Data/Hora:</span>
            <span class="info-value">${new Date().toLocaleString('pt-BR')}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Cookies:</span>
            <span class="info-value">${navigator.cookieEnabled ? 'Habilitados' : 'Desabilitados'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Do Not Track:</span>
            <span class="info-value">${navigator.doNotTrack || 'Não configurado'}</span>
            </div>
            `;

            detectedInfo.basic = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                cookies: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack
            };
        }

        // Carregar informações de tela
        function loadScreenInfo() {
            const container = document.getElementById('screen-info');

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">Resolução:</span>
            <span class="info-value">${screen.width}x${screen.height}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Resolução Disponível:</span>
            <span class="info-value">${screen.availWidth}x${screen.availHeight}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Profundidade de Cor:</span>
            <span class="info-value">${screen.colorDepth} bits</span>
            </div>
            <div class="info-item">
            <span class="info-label">Densidade de Pixels:</span>
            <span class="info-value">${window.devicePixelRatio}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Janela:</span>
            <span class="info-value">${window.innerWidth}x${window.innerHeight}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Orientação:</span>
            <span class="info-value">${screen.orientation ? screen.orientation.type : 'Não disponível'}</span>
            </div>
            `;

            detectedInfo.screen = {
                resolution: `${screen.width}x${screen.height}`,
                available: `${screen.availWidth}x${screen.availHeight}`,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio,
                window: `${window.innerWidth}x${window.innerHeight}`,
                orientation: screen.orientation ? screen.orientation.type : 'unknown'
            };
        }

        // Carregar informações detalhadas do navegador
        function loadBrowserInfo() {
            const container = document.getElementById('browser-info');

            // Detectar navegador
            const getBrowser = () => {
                const ua = navigator.userAgent;
                if (ua.includes('Chrome')) return 'Chrome';
                if (ua.includes('Firefox')) return 'Firefox';
                if (ua.includes('Safari')) return 'Safari';
                if (ua.includes('Edge')) return 'Edge';
                if (ua.includes('Opera')) return 'Opera';
                return 'Desconhecido';
            };

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">Navegador:</span>
            <span class="info-value">${getBrowser()}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Versão:</span>
            <span class="info-value">${navigator.appVersion}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Vendor:</span>
            <span class="info-value">${navigator.vendor}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Online:</span>
            <span class="info-value">${navigator.onLine ? 'Sim' : 'Não'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Java Habilitado:</span>
            <span class="info-value">${navigator.javaEnabled ? navigator.javaEnabled() : 'Não'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">PDF Viewer:</span>
            <span class="info-value">${navigator.pdfViewerEnabled ? 'Sim' : 'Não'}</span>
            </div>
            `;

            detectedInfo.browser = {
                name: getBrowser(),
                version: navigator.appVersion,
                vendor: navigator.vendor,
                online: navigator.onLine,
                javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
                pdfViewer: navigator.pdfViewerEnabled || false
            };
        }

        // Carregar informações de hardware
        function loadHardwareInfo() {
            const container = document.getElementById('hardware-info');

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">Cores do Processador:</span>
            <span class="info-value">${navigator.hardwareConcurrency || 'Não disponível'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Memória (estimada):</span>
            <span class="info-value">${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Não disponível'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Conexão:</span>
            <span class="info-value">${navigator.connection ? navigator.connection.effectiveType + ' (aproximado)' : 'Não disponível'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Velocidade de Conexão:</span>
            <span class="info-value">${navigator.connection ? navigator.connection.downlink + ' Mbps' : 'Não disponível'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Economia de Dados:</span>
            <span class="info-value">${navigator.connection ? (navigator.connection.saveData ? 'Ativada' : 'Desativada') : 'Não disponível'}</span>
            </div>
            `;

            detectedInfo.hardware = {
                cores: navigator.hardwareConcurrency,
                memory: navigator.deviceMemory,
                connection: navigator.connection ? navigator.connection.effectiveType : null,
                downlink: navigator.connection ? navigator.connection.downlink : null,
                saveData: navigator.connection ? navigator.connection.saveData : null
            };
        }

        // Carregar informações de plugins
        function loadPluginsInfo() {
            const container = document.getElementById('plugins-info');

            let pluginsList = '';
            if (navigator.plugins.length > 0) {
                for (let i = 0; i < navigator.plugins.length; i++) {
                    const plugin = navigator.plugins[i];
                    pluginsList += `
                    <div class="info-item">
                    <span class="info-label">${plugin.name}:</span>
                    <span class="info-value">${plugin.version || 'Sem versão'}</span>
                    </div>
                    `;
                }
            } else {
                pluginsList = '<div class="info-item"><span class="info-label">Status:</span><span class="info-value">Nenhum plugin detectado</span></div>';
            }

            container.innerHTML = pluginsList;

            detectedInfo.plugins = Array.from(navigator.plugins).map(p => ({
                name: p.name,
                version: p.version,
                description: p.description
            }));
        }

        // Carregar informações de segurança
        function loadSecurityInfo() {
            const container = document.getElementById('security-info');

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">HTTPS:</span>
            <span class="info-value">${location.protocol === 'https:' ? 'Sim' : 'Não'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Referrer Policy:</span>
            <span class="info-value">${document.referrerPolicy || 'Padrão'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Secure Context:</span>
            <span class="info-value">${window.isSecureContext ? 'Sim' : 'Não'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Cross-Origin:</span>
            <span class="info-value">${window.crossOriginIsolated ? 'Isolado' : 'Não isolado'}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Storage Access:</span>
            <span class="info-value">${navigator.storage ? 'Disponível' : 'Não disponível'}</span>
            </div>
            `;

            detectedInfo.security = {
                https: location.protocol === 'https:',
                referrerPolicy: document.referrerPolicy,
                secureContext: window.isSecureContext,
                crossOrigin: window.crossOriginIsolated,
                storageAccess: !!navigator.storage
            };
        }

        // Detectar fontes
        function loadFontsInfo() {
            const container = document.getElementById('fonts-info');

            const commonFonts = [
                'Arial', 'Arial Black', 'Arial Narrow', 'Arial Unicode MS',
                'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS',
                'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica',
                'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
                'Palatino', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
                'Verdana', 'Wingdings', 'Segoe UI', 'Roboto', 'Open Sans'
            ];

            const detectedFonts = [];

            commonFonts.forEach(font => {
                if (isFontAvailable(font)) {
                    detectedFonts.push(font);
                }
            });

            container.innerHTML = `
            <div class="info-item">
            <span class="info-label">Fontes Detectadas:</span>
            <span class="info-value">${detectedFonts.length}</span>
            </div>
            <div style="margin-top: 10px; font-size: 0.8em; line-height: 1.4;">
            ${detectedFonts.join(', ')}
            </div>
            `;

            detectedInfo.fonts = detectedFonts;
        }

        // Verificar se uma fonte está disponível
        function isFontAvailable(font) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const text = 'abcdefghijklmnopqrstuvwxyz0123456789';
            context.font = '72px monospace';
            const baselineSize = context.measureText(text).width;

            context.font = `72px ${font}, monospace`;
            const fontSize = context.measureText(text).width;

            return fontSize !== baselineSize;
        }

        // Carregar informações de canvas
        function loadCanvasInfo() {
            const container = document.getElementById('canvas-info');
            let canvas = document.getElementById('fingerprint-canvas');

            // Se o canvas não existir, criar um novo
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'fingerprint-canvas';
                canvas.width = 200;
                canvas.height = 50;

                // Inserir o canvas no container
                const canvasContainer = container.querySelector('.canvas-container');
                if (canvasContainer) {
                    canvasContainer.appendChild(canvas);
                }
            }

            try {
                const ctx = canvas.getContext('2d');

                // Desenhar padrão único para fingerprinting
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('Canvas fingerprint test 🔒', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText('Canvas fingerprint test 🔒', 4, 17);

                // Obter dados do canvas
                const canvasData = canvas.toDataURL();
                const canvasHash = hashCode(canvasData);

                container.innerHTML = `
                <div class="canvas-container">
                <canvas id="fingerprint-canvas" width="200" height="50"></canvas>
                </div>
                <div class="info-item">
                <span class="info-label">Canvas Hash:</span>
                <span class="info-value">${canvasHash}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Canvas Data Length:</span>
                <span class="info-value">${canvasData.length} chars</span>
                </div>
                <div class="fingerprint-hash">
                Canvas Fingerprint: ${canvasData.slice(0, 100)}...
                </div>
                `;

                // Redesenhar o canvas (já que o innerHTML foi alterado)
                const newCanvas = document.getElementById('fingerprint-canvas');
                const newCtx = newCanvas.getContext('2d');
                newCtx.textBaseline = 'top';
                newCtx.font = '14px Arial';
                newCtx.fillStyle = '#f60';
                newCtx.fillRect(125, 1, 62, 20);
                newCtx.fillStyle = '#069';
                newCtx.fillText('Canvas fingerprint test 🔒', 2, 15);
                newCtx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                newCtx.fillText('Canvas fingerprint test 🔒', 4, 17);

                detectedInfo.canvas = {
                    hash: canvasHash,
                    dataLength: canvasData.length,
                    data: canvasData
                };

            } catch (error) {
                console.error('Erro ao carregar canvas:', error);
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Canvas:</span>
                <span class="info-value">Erro ao carregar</span>
                </div>
                <div class="info-item">
                <span class="info-label">Erro:</span>
                <span class="info-value">${error.message}</span>
                </div>
                `;
            }
        }

        // Função hash simples
        function hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(16);
        }

        // Carregar informações WebGL
        function loadWebGLInfo() {
            const container = document.getElementById('webgl-info');

            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

                if (!gl) {
                    container.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">WebGL:</span>
                    <span class="info-value">Não suportado</span>
                    </div>
                    `;
                    return;
                }

                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">WebGL Version:</span>
                <span class="info-value">${gl.getParameter(gl.VERSION)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">GLSL Version:</span>
                <span class="info-value">${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Vendor:</span>
                <span class="info-value">${gl.getParameter(gl.VENDOR)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Renderer:</span>
                <span class="info-value">${gl.getParameter(gl.RENDERER)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Unmasked Vendor:</span>
                <span class="info-value">${debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Não disponível'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Unmasked Renderer:</span>
                <span class="info-value">${debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Não disponível'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Texture Size:</span>
                <span class="info-value">${gl.getParameter(gl.MAX_TEXTURE_SIZE)}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Max Viewport:</span>
                <span class="info-value">${gl.getParameter(gl.MAX_VIEWPORT_DIMS)}</span>
                </div>
                `;

                detectedInfo.webgl = {
                    version: gl.getParameter(gl.VERSION),
                    glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                    vendor: gl.getParameter(gl.VENDOR),
                    renderer: gl.getParameter(gl.RENDERER),
                    unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
                    unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxViewport: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
                };

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">WebGL:</span>
                <span class="info-value">Erro ao carregar</span>
                </div>
                `;
            }
        }

        // Carregar informações de sensores
        async function loadSensorsInfo() {
            const container = document.getElementById('sensors-info');

            const steps = [
                'Verificando geolocalização...',
                'Testando acelerômetro...',
                'Verificando bateria...',
                'Enumerando dispositivos...',
                'Verificando gamepads...'
            ];

            progressManager.simulateProgress('sensors-info', 2500, steps);

            let sensorInfo = '';

            // Verificar geolocalização
            if ('geolocation' in navigator) {
                sensorInfo += `
                <div class="info-item">
                <span class="info-label">Geolocalização:</span>
                <span class="info-value">Suportada</span>
                </div>
                `;
            }

            // Verificar acelerômetro
            if ('DeviceMotionEvent' in window) {
                sensorInfo += `
                <div class="info-item">
                <span class="info-label">Acelerômetro:</span>
                <span class="info-value">Suportado</span>
                </div>
                `;
            }

            // Verificar giroscópio
            if ('DeviceOrientationEvent' in window) {
                sensorInfo += `
                <div class="info-item">
                <span class="info-label">Giroscópio:</span>
                <span class="info-value">Suportado</span>
                </div>
                `;
            }

            // Verificar bateria
            if ('getBattery' in navigator) {
                try {
                    const battery = await navigator.getBattery();
                    sensorInfo += `
                    <div class="info-item">
                    <span class="info-label">Bateria:</span>
                    <span class="info-value">${Math.round(battery.level * 100)}%</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Carregando:</span>
                    <span class="info-value">${battery.charging ? 'Sim' : 'Não'}</span>
                    </div>
                    `;
                } catch (e) {
                    sensorInfo += `
                    <div class="info-item">
                    <span class="info-label">Bateria:</span>
                    <span class="info-value">Não disponível</span>
                    </div>
                    `;
                }
            }

            // Verificar câmera e microfone
            if ('mediaDevices' in navigator) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const cameras = devices.filter(device => device.kind === 'videoinput');
                    const microphones = devices.filter(device => device.kind === 'audioinput');

                    sensorInfo += `
                    <div class="info-item">
                    <span class="info-label">Câmeras:</span>
                    <span class="info-value">${cameras.length}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Microfones:</span>
                    <span class="info-value">${microphones.length}</span>
                    </div>
                    `;
                } catch (e) {
                    sensorInfo += `
                    <div class="info-item">
                    <span class="info-label">Mídia:</span>
                    <span class="info-value">Acesso negado</span>
                    </div>
                    `;
                }
            }

            // Verificar gamepads
            if ('getGamepads' in navigator) {
                const gamepads = navigator.getGamepads();
                const activeGamepads = Array.from(gamepads).filter(gamepad => gamepad !== null);
                sensorInfo += `
                <div class="info-item">
                <span class="info-label">Gamepads:</span>
                <span class="info-value">${activeGamepads.length}</span>
                </div>
                `;
            }

            const finalContent = sensorInfo || '<div class="info-item"><span class="info-label">Status:</span><span class="info-value">Nenhum sensor detectado</span></div>';

            setTimeout(() => {
                progressManager.completeProgress('sensors-info', finalContent);
            }, 2600);
        }

        // Calcular fingerprint do navegador
        function calculateFingerprint() {
            const container = document.getElementById('fingerprint-info');

            progressManager.createProgressBar('fingerprint-info', 'circular', true);

            let currentStep = 0;
            const totalSteps = 100;

            const updateProgress = (step, text) => {
                progressManager.updateProgress('fingerprint-info', step, totalSteps, text);
            };

            updateProgress(10, 'Aguardando dados...');

            // Função para verificar se dados essenciais estão prontos
            const checkDataReady = () => {
                const essentialData = [
                    'basic', 'screen', 'browser', 'hardware',
                    'canvas', 'webgl', 'fonts', 'plugins'
                ];

                let readyCount = 0;
                essentialData.forEach(key => {
                    if (detectedInfo[key]) readyCount++;
                });

                    return readyCount;
            };

            // Monitorar progresso dos dados
            const monitorDataCollection = () => {
                const interval = setInterval(() => {
                    const readyCount = checkDataReady();
                    const progressPercent = Math.min((readyCount / 8) * 80, 80); // Máximo 80% até dados prontos

                    updateProgress(10 + progressPercent, `Coletando dados (${readyCount}/8)...`);

                    // Quando a maioria dos dados estiver pronta, prosseguir
                    if (readyCount >= 6) {
                        clearInterval(interval);

                        updateProgress(90, 'Calculando hash...');

                        setTimeout(() => {
                            // Fazer o cálculo real com dados disponíveis
                            const fingerprintData = {
                                userAgent: navigator.userAgent,
                                language: navigator.language,
                                languages: navigator.languages,
                                platform: navigator.platform,
                                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                   plugins: detectedInfo.plugins ? detectedInfo.plugins.map(p => p.name).join(',') : 'loading',
                                   fonts: detectedInfo.fonts ? detectedInfo.fonts.join(',') : 'loading',
                                   canvas: detectedInfo.canvas ? detectedInfo.canvas.hash : 'loading',
                                   webgl: detectedInfo.webgl ? detectedInfo.webgl.renderer : 'loading',
                                   hardware: `${navigator.hardwareConcurrency}-${navigator.deviceMemory}`,
                                   connection: navigator.connection ? navigator.connection.effectiveType : 'unknown'
                            };

                            const fingerprintString = JSON.stringify(fingerprintData);
                            browserFingerprint = hashCode(fingerprintString);

                            updateProgress(100, 'Finalizando...');

                            const finalContent = `
                            <div class="info-item">
                            <span class="info-label">Fingerprint Hash:</span>
                            <span class="info-value">${browserFingerprint}</span>
                            </div>
                            <div class="info-item">
                            <span class="info-label">Unicidade:</span>
                            <span class="info-value">${calculateUniqueness()}%</span>
                            </div>
                            <div class="info-item">
                            <span class="info-label">Entropia:</span>
                            <span class="info-value">${calculateEntropy(fingerprintString).toFixed(2)} bits</span>
                            </div>
                            <div class="info-item">
                            <span class="info-label">Dados Coletados:</span>
                            <span class="info-value">${readyCount}/8 módulos</span>
                            </div>
                            <div class="fingerprint-hash">
                            Fingerprint: ${fingerprintString.length > 200 ? fingerprintString.substring(0, 200) + '...' : fingerprintString}
                            </div>
                            `;

                            // Mostrar resultado imediatamente
                            progressManager.completeProgress('fingerprint-info', finalContent);

                        }, 300);
                    }
                }, 200); // Verificar a cada 200ms

                // Timeout de segurança - forçar conclusão após 10 segundos
                setTimeout(() => {
                    clearInterval(interval);

                    // Se chegou ao timeout, calcular com dados disponíveis
                    const readyCount = checkDataReady();
                    updateProgress(100, 'Finalizando (timeout)...');

                    const fingerprintData = {
                        userAgent: navigator.userAgent,
                        language: navigator.language,
                        languages: navigator.languages,
                        platform: navigator.platform,
                        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                           plugins: detectedInfo.plugins ? detectedInfo.plugins.map(p => p.name).join(',') : 'timeout',
                           fonts: detectedInfo.fonts ? detectedInfo.fonts.join(',') : 'timeout',
                           canvas: detectedInfo.canvas ? detectedInfo.canvas.hash : 'timeout',
                           webgl: detectedInfo.webgl ? detectedInfo.webgl.renderer : 'timeout',
                           hardware: `${navigator.hardwareConcurrency}-${navigator.deviceMemory}`,
                           connection: navigator.connection ? navigator.connection.effectiveType : 'unknown'
                    };

                    const fingerprintString = JSON.stringify(fingerprintData);
                    browserFingerprint = hashCode(fingerprintString);

                    const finalContent = `
                    <div class="info-item">
                    <span class="info-label">Fingerprint Hash:</span>
                    <span class="info-value">${browserFingerprint}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Unicidade:</span>
                    <span class="info-value">${calculateUniqueness()}%</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="info-value">Calculado com ${readyCount}/8 módulos</span>
                    </div>
                    <div class="fingerprint-hash">
                    Fingerprint: ${fingerprintString.length > 200 ? fingerprintString.substring(0, 200) + '...' : fingerprintString}
                    </div>
                    `;

                    progressManager.completeProgress('fingerprint-info', finalContent);

                }, 10000); // 10 segundos timeout
            };

            // Iniciar monitoramento
            monitorDataCollection();
        }

        // Calcular unicidade do fingerprint
        function calculateUniqueness() {
            // Simulação baseada na quantidade de informações coletadas
            let uniqueness = 0;

            if (detectedInfo.canvas) uniqueness += 30;
            if (detectedInfo.webgl) uniqueness += 25;
            if (detectedInfo.fonts && detectedInfo.fonts.length > 10) uniqueness += 20;
            if (detectedInfo.plugins && detectedInfo.plugins.length > 0) uniqueness += 15;
            if (detectedInfo.hardware) uniqueness += 10;

            return Math.min(uniqueness, 99.9);
        }

        // Calcular entropia
        function calculateEntropy(str) {
            const freq = {};
            for (let char of str) {
                freq[char] = (freq[char] || 0) + 1;
            }

            let entropy = 0;
            const length = str.length;

            for (let char in freq) {
                const p = freq[char] / length;
                entropy -= p * Math.log2(p);
            }

            return entropy;
        }

        function calculatePrivacyScore() {
            const container = document.getElementById('privacy-score');

            progressManager.createProgressBar('privacy-score', 'circular', true);

            let currentStep = 0;
            const totalSteps = 3;

            const updateProgress = (step, text) => {
                progressManager.updateProgress('privacy-score', step, totalSteps, text);
            };

            updateProgress(1, 'Analisando dados...');

            // Começar com score alto e deduzir baseado em riscos REAIS
            let score = 100;
            let risks = [];
            let criticalIssues = 0;
            let mediumIssues = 0;
            let minorIssues = 0;

            // === RISCOS CRÍTICOS (Vazamentos reais) ===

            // Localização precisa exposta
            if (detectedInfo.preciseLocation) {
                score -= 20;
                risks.push('🔴 Localização precisa exposta');
                criticalIssues++;
            }

            // Vazamentos WebRTC reais
            if (detectedInfo.webrtcComprehensive && detectedInfo.webrtcComprehensive.leaks && detectedInfo.webrtcComprehensive.leaks.length > 0) {
                score -= 15;
                risks.push(`🔴 ${detectedInfo.webrtcComprehensive.leaks.length} vazamento(s) WebRTC detectado(s)`);
                criticalIssues++;
            }

            // Vazamentos DNS reais
            if (detectedInfo.dnsLeak && detectedInfo.dnsLeak.realLeaks && detectedInfo.dnsLeak.realLeaks.length > 0) {
                score -= 12;
                risks.push(`🔴 ${detectedInfo.dnsLeak.realLeaks.length} vazamento(s) DNS detectado(s)`);
                criticalIssues++;
            }

            // Conexão não segura (apenas se não for localhost/teste)
            const isLocalhost = location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1' ||
            location.hostname.includes('192.168.') ||
            location.protocol === 'file:';

            if (location.protocol !== 'https:' && !isLocalhost) {
                score -= 12;
                risks.push('🔴 Conexão não segura (HTTP)');
                criticalIssues++;
            }

            updateProgress(2, 'Verificando fingerprinting...');

            // === RISCOS MÉDIOS (Fingerprinting) ===

            // Canvas Fingerprinting
            if (detectedInfo.canvas) {
                score -= 8;
                risks.push('🟡 Canvas Fingerprinting detectado');
                mediumIssues++;
            }

            // WebGL Fingerprinting
            if (detectedInfo.webgl) {
                score -= 7;
                risks.push('🟡 WebGL Fingerprinting detectado');
                mediumIssues++;
            }

            // Audio Fingerprinting
            if (detectedInfo.audio) {
                score -= 6;
                risks.push('🟡 Audio Fingerprinting detectado');
                mediumIssues++;
            }

            // Muitas fontes únicas
            if (detectedInfo.fonts && detectedInfo.fonts.length > 25) {
                score -= 5;
                risks.push(`🟡 Muitas fontes detectadas (${detectedInfo.fonts.length})`);
                mediumIssues++;
            }

            // Plugins detectados
            if (detectedInfo.plugins && detectedInfo.plugins.length > 0) {
                score -= 4;
                risks.push(`🟡 ${detectedInfo.plugins.length} plugin(s) detectado(s)`);
                mediumIssues++;
            }

            // === RISCOS MENORES (Configurações padrão) ===

            // IP público exposto (normal para 99% dos usuários)
            if (detectedInfo.ip) {
                score -= 3;
                risks.push('🔵 IP público visível (normal)');
                minorIssues++;
            }

            // Do Not Track desabilitado (padrão na maioria)
            if (!navigator.doNotTrack) {
                score -= 2;
                risks.push('🔵 Do Not Track desabilitado');
                minorIssues++;
            }

            // Cookies habilitados (necessário para 99% dos sites)
            if (navigator.cookieEnabled) {
                score -= 2;
                risks.push('🔵 Cookies habilitados (necessário para a web)');
                minorIssues++;
            }

            // Falta de extensões de privacidade detectada
            if (detectedInfo.adBlocker && !detectedInfo.adBlocker.detected) {
                score -= 3;
                risks.push('🔵 Ad Blocker não detectado');
                minorIssues++;
            }

            updateProgress(3, 'Finalizando...');

            // Garantir que score não seja negativo
            score = Math.max(score, 0);
            privacyScore = score;

            // Classificação mais realista
            let riskLevel = 'risk-high';
            let riskText = 'Alto Risco';
            let riskIcon = '🔴';
            let riskDescription = '';

            if (score >= 85) {
                riskLevel = 'risk-low';
                riskText = 'Baixo Risco';
                riskIcon = '🟢';
                riskDescription = 'Sua privacidade está bem protegida!';
            } else if (score >= 70) {
                riskLevel = 'risk-medium';
                riskText = 'Risco Baixo-Médio';
                riskIcon = '🟡';
                riskDescription = 'Boa privacidade, com pequenos pontos de melhoria.';
            } else if (score >= 50) {
                riskLevel = 'risk-medium';
                riskText = 'Médio Risco';
                riskIcon = '🟠';
                riskDescription = 'Privacidade moderada, algumas melhorias recomendadas.';
            } else if (score >= 30) {
                riskLevel = 'risk-high';
                riskText = 'Risco Médio-Alto';
                riskIcon = '🔴';
                riskDescription = 'Várias vulnerabilidades detectadas.';
            } else {
                riskLevel = 'risk-high';
                riskText = 'Alto Risco';
                riskIcon = '🔴';
                riskDescription = 'Muitas vulnerabilidades críticas encontradas!';
            }

            // Gerar dicas personalizadas baseadas nos problemas encontrados
            const personalizedTips = generatePersonalizedTips(criticalIssues, mediumIssues, minorIssues, detectedInfo);

            const finalContent = `
            <div class="privacy-score">${score}/100</div>
            <div class="risk-indicator ${riskLevel}">
            ${riskIcon} ${riskText}
            </div>
            <div style="text-align: center; margin: 10px 0; font-style: italic; color: #ccc;">
            ${riskDescription}
            </div>

            <div style="margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 10px;">
            <span>🔴 Críticos: ${criticalIssues}</span>
            <span>🟡 Médios: ${mediumIssues}</span>
            <span>🔵 Menores: ${minorIssues}</span>
            </div>
            </div>

            <div style="margin-top: 20px;">
            <strong>Problemas encontrados (${risks.length}):</strong>
            <div style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
            ${risks.map(risk => `<div style="margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;">• ${risk}</div>`).join('')}
            </div>
            </div>

            <div style="margin-top: 20px; font-size: 0.9em;">
            <strong>💡 Dicas personalizadas para você:</strong>
            <ul style="margin-top: 10px; padding-left: 20px; line-height: 1.6;">
            ${personalizedTips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
            </div>
            `;

            progressManager.completeProgress('privacy-score', finalContent);

            // Recalcular se novos dados chegarem
            setTimeout(() => {
                if (detectedInfo.webrtcComprehensive || detectedInfo.dnsLeak) {
                    calculatePrivacyScore();
                }
            }, 3000);
        }

        // Função para gerar dicas personalizadas
        function generatePersonalizedTips(criticalIssues, mediumIssues, minorIssues, detectedInfo) {
            const tips = [];

            // Dicas baseadas em problemas críticos
            if (criticalIssues > 0) {
                if (detectedInfo.preciseLocation) {
                    tips.push('<strong style="color: #ff6600;">Desabilite geolocalização</strong> para sites não confiáveis');
                }
                if (detectedInfo.webrtcComprehensive?.leaks?.length > 0) {
                    tips.push('<strong style="color: #ff6600;">Configure WebRTC</strong> - use extensão para desabilitar ou VPN');
                }
                if (detectedInfo.dnsLeak?.realLeaks?.length > 0) {
                    tips.push('<strong style="color: #ff6600;">Configure DNS seguro</strong> - use 1.1.1.1 ou Quad9');
                }
            }

            // Dicas baseadas em problemas médios
            if (mediumIssues > 0) {
                tips.push('Use <strong>uBlock Origin</strong> ou <strong>Privacy Badger</strong> para bloquear fingerprinting');
                if (detectedInfo.canvas || detectedInfo.webgl) {
                    tips.push('Configure seu navegador para <strong>bloquear canvas/WebGL</strong> em sites não confiáveis');
                }
            }

            // Dicas baseadas em problemas menores
            if (minorIssues > 0 && !detectedInfo.adBlocker?.detected) {
                tips.push('Instale um <strong>ad blocker</strong> para melhor privacidade');
            }

            // Dicas gerais
            if (criticalIssues === 0 && mediumIssues <= 2) {
                tips.push('Sua privacidade está <strong>bem configurada</strong>! Continue assim.');
            } else if (criticalIssues >= 3) {
                tips.push('<strong style="color: #ff6600;">Considere usar Tor Browser</strong> para máxima privacidade');
            }

            tips.push('Mantenha seu <strong>navegador atualizado</strong>');
            tips.push('Use <strong>HTTPS</strong> sempre que possível');

            return tips;
        }

        // Função para atualizar todas as informações
        function refreshAllInfo() {
            // Mostrar loading em todos os containers
            const containers = [
                'ip-info', 'basic-info', 'screen-info', 'browser-info',
                'hardware-info', 'plugins-info', 'security-info', 'fonts-info',
                'canvas-info', 'webgl-info', 'sensors-info', 'network-info',
                'fingerprint-info', 'privacy-score', 'architecture-info',
                'gpu-details-info', 'ipv6-info', 'audio-info', 'private-mode-info',
                'webrtc-comprehensive-info', 'extensions-info', 'adblocker-info',
                'dns-leak-info', 'proxy-vpn-info'
            ];

            containers.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = '<div class="loading">Recarregando...</div>';
                }
            });

            // Limpar dados anteriores
            detectedInfo = {};

            // Recarregar todas as informações
            setTimeout(() => {
                loadAllInformation();
            }, 100);
        }

        // Adicionar event listeners para detectar mudanças
        window.addEventListener('resize', () => {
            setTimeout(loadScreenInfo, 100);
        });

        window.addEventListener('online', () => {
            setTimeout(loadBrowserInfo, 100);
        });

        window.addEventListener('offline', () => {
            setTimeout(loadBrowserInfo, 100);
        });

        // Detectar mudanças na orientação
        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                setTimeout(loadScreenInfo, 100);
            });
        }

        // Monitorar mudanças na conexão
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                setTimeout(loadHardwareInfo, 100);
            });
        }

        console.log('🔍 SYSTEM INTRUSION ANALYZER initialized!');
        console.log('[ SCANNING FOR BROWSER VULNERABILITIES ]');
        console.log('> All data streams intercepted and analyzed');
        console.log('> Use collected intelligence to enhance security protocols');
