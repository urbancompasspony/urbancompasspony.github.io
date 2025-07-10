        // Dados globais
        let browserFingerprint = '';
        let privacyScore = 0;
        let detectedInfo = {};

        // Inicializar quando a página carrega
        document.addEventListener('DOMContentLoaded', function() {
            loadAllInformation();
        });

        // Função principal para carregar todas as informações
        async function loadAllInformation() {
            try {
                await Promise.all([
                    loadIPInfo(),
                                  loadBasicInfo(),
                                  loadScreenInfo(),
                                  loadBrowserInfo(),
                                  loadHardwareInfo(),
                                  loadPluginsInfo(),
                                  loadSecurityInfo(),
                                  loadFontsInfo(),
                                  loadCanvasInfo(),
                                  loadWebGLInfo(),
                                  loadSensorsInfo(),
                                  loadNetworkInfo(),
                                  detectArchitecture(),
                                  getGPUDetails(),
                                  detectIPv6(),
                                  getAudioFingerprint(),
                                  detectPrivateMode()
                ]);

                // Pequena pausa para garantir que tudo carregou
                setTimeout(() => {
                    calculateFingerprint();
                    calculatePrivacyScore();
                }, 500);

            } catch (error) {
                console.error('Erro ao carregar informações:', error);
            }
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

                container.innerHTML = `
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

                detectedInfo.ipv6 = ipv6Info;

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">IPv6:</span>
                <span class="info-value">Erro na detecção: ${error.message}</span>
                </div>
                `;
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

        async function detectPrivateMode() {
            const container = document.getElementById('private-mode-info');

            let isPrivate = false;
            let detectionMethod = 'Unknown';

            try {
                // Método 1: Teste de storage
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    if (estimate.quota < 120000000) { // Menos que ~120MB indica modo privado
                        isPrivate = true;
                        detectionMethod = 'Storage Quota';
                    }
                }

                // Método 2: IndexedDB test
                if (!isPrivate) {
                    try {
                        const db = indexedDB.open('test', 1);
                        db.onerror = () => {
                            isPrivate = true;
                            detectionMethod = 'IndexedDB Error';
                        };
                    } catch (e) {
                        isPrivate = true;
                        detectionMethod = 'IndexedDB Exception';
                    }
                }

                // Método 3: RequestFileSystem (Chrome específico)
                if (!isPrivate && 'webkitRequestFileSystem' in window) {
                    window.webkitRequestFileSystem(0, 1,
                                                   () => {},
                                                   () => {
                                                       isPrivate = true;
                                                       detectionMethod = 'FileSystem API';
                                                   }
                    );
                }

                // Método 4: Safari specific
                if (!isPrivate && 'safari' in window) {
                    try {
                        localStorage.setItem('test', '1');
                        localStorage.removeItem('test');
                    } catch (e) {
                        isPrivate = true;
                        detectionMethod = 'Safari LocalStorage';
                    }
                }

                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Modo Privado:</span>
                <span class="info-value">${isPrivate ? 'Detectado' : 'Não detectado'}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Método:</span>
                <span class="info-value">${detectionMethod}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Storage Estimate:</span>
                <span class="info-value">${navigator.storage ? 'Disponível' : 'Não disponível'}</span>
                </div>
                `;

                detectedInfo.privateMode = {
                    isPrivate,
                    detectionMethod,
                    storageAvailable: 'storage' in navigator
                };

            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Modo Privado:</span>
                <span class="info-value">Erro na detecção</span>
                </div>
                `;
            }
        }



        // ===== FUNÇÕES DE LOCALIZAÇÃO E MAPA =====

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

                // Atualizar informações de localização
                const preciseLocationHTML = `
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

                // Atualizar dados globais
                detectedInfo.preciseLocation = {
                    latitude,
                    longitude,
                    accuracy: position.coords.accuracy,
                    address: address
                };

            } catch (error) {
                console.error('Erro ao obter localização:', error);

                if (locationBtn) {
                    locationBtn.innerHTML = '❌ Permissão negada';
                    locationBtn.disabled = false;
                }

                if (locationContainer) {
                    locationContainer.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">Erro:</span>
                    <span class="info-value">${getLocationErrorMessage(error.code)}</span>
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

        // 4. Função para carregar mapa do Google Maps
        function loadGoogleMap(latitude, longitude) {
            const mapContainer = document.getElementById('map-container');

            if (!mapContainer) {
                console.error('Container do mapa não encontrado');
                return;
            }

            // Criar iframe do Google Maps
            const mapIframe = document.createElement('iframe');
            mapIframe.width = '100%';
            mapIframe.height = '200';
            mapIframe.style.border = '2px solid #576879';
            mapIframe.style.borderRadius = '8px';
            mapIframe.style.marginTop = '10px';
            mapIframe.loading = 'lazy';
            mapIframe.referrerPolicy = 'no-referrer-when-downgrade';

            // URL do Google Maps com marcador
            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO_TqXYSKr0p5A&q=${latitude},${longitude}&zoom=16&maptype=roadmap`;

            // Fallback para OpenStreetMap se Google Maps não funcionar
            const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`;

            mapIframe.src = mapUrl;

            // Adicionar tratamento de erro para fallback
            mapIframe.onerror = () => {
                mapIframe.src = osmUrl;
            };

            // Limpar container e adicionar mapa
            mapContainer.innerHTML = '';
            mapContainer.appendChild(mapIframe);

            // Adicionar links úteis
            const linksDiv = document.createElement('div');
            linksDiv.style.marginTop = '10px';
            linksDiv.style.fontSize = '0.8em';
            linksDiv.innerHTML = `
            <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" style="color: #00f000; text-decoration: none; margin-right: 15px;">
            🌍 Abrir no Google Maps
            </a>
            <a href="https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16" target="_blank" style="color: #00f000; text-decoration: none;">
            🗺️ Abrir no OpenStreetMap
            </a>
            `;

            mapContainer.appendChild(linksDiv);
        }

        // 5. Função para verificar permissão de localização
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

        // 6. Função para obter mensagem de erro amigável
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

        // ===== FUNÇÕES DE LOCALIZAÇÃO E MAPA =====

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

                // Atualizar informações de localização
                const preciseLocationHTML = `
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

                // Atualizar dados globais
                detectedInfo.preciseLocation = {
                    latitude,
                    longitude,
                    accuracy: position.coords.accuracy,
                    address: address
                };

            } catch (error) {
                console.error('Erro ao obter localização:', error);

                if (locationBtn) {
                    locationBtn.innerHTML = '❌ Permissão negada';
                    locationBtn.disabled = false;
                }

                if (locationContainer) {
                    locationContainer.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">Erro:</span>
                    <span class="info-value">${getLocationErrorMessage(error.code)}</span>
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

        // 4. Função para carregar área de mapas (apenas links)
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

        // 5. Função para verificar permissão de localização
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

        // 6. Função para obter mensagem de erro amigável
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

        // 7. Função modificada para loadIPInfo (substituir a existente)
        async function loadIPInfo() {
            const container = document.getElementById('ip-info');

            try {
                // Tentar múltiplas APIs para obter informações de IP
                const apis = [
                    'https://api.ipify.org?format=json',
                    'https://ipapi.co/json/',
                    'https://ipinfo.io/json'
                ];

                let ipData = null;
                for (const api of apis) {
                    try {
                        const response = await fetch(api);
                        ipData = await response.json();
                        break;
                    } catch (e) {
                        continue;
                    }
                }

                if (ipData) {
                    // Verificar permissão de localização
                    const locationPermission = await checkLocationPermission();

                    let locationButton = '';
                    if (locationPermission !== 'granted') {
                        locationButton = `
                        <button id="location-btn" class="location-btn" onclick="requestLocationPermission()">
                        📍 Descobrir Localização Precisa
                        </button>
                        `;
                    }

                    container.innerHTML = `
                    <div class="info-item">
                    <span class="info-label">IP Público:</span>
                    <span class="info-value">${ipData.ip || 'Não disponível'}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Cidade:</span>
                    <span class="info-value">${ipData.city || 'Não disponível'}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Região:</span>
                    <span class="info-value">${ipData.region || 'Não disponível'}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">País:</span>
                    <span class="info-value">${ipData.country || 'Não disponível'}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">ISP:</span>
                    <span class="info-value">${ipData.org || ipData.isp || 'Não disponível'}</span>
                    </div>
                    <div class="info-item">
                    <span class="info-label">Timezone:</span>
                    <span class="info-value">${ipData.timezone || 'Não disponível'}</span>
                    </div>
                    ${locationButton}
                    <div id="location-details"></div>
                    <div id="map-container"></div>
                    `;

                    detectedInfo.ip = ipData;

                    // Se já tem permissão, carregar automaticamente
                    if (locationPermission === 'granted') {
                        setTimeout(() => {
                            requestLocationPermission();
                        }, 1000);
                    }

                } else {
                    throw new Error('Nenhuma API de IP disponível');
                }
            } catch (error) {
                container.innerHTML = `
                <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value">Erro ao carregar informações de IP</span>
                </div>
                <div class="info-item">
                <span class="info-label">IP Local:</span>
                <span class="info-value">${getLocalIP()}</span>
                </div>
                `;
            }
        }

        // 8. Função para criar mapa alternativo com Canvas (se APIs falharem)
        function createCanvasMap(latitude, longitude) {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 200;
            canvas.style.border = '2px solid #576879';
            canvas.style.borderRadius = '8px';
            canvas.style.marginTop = '10px';

            const ctx = canvas.getContext('2d');

            // Fundo
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grid
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;

            // Linhas verticais
            for (let x = 0; x <= canvas.width; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            // Linhas horizontais
            for (let y = 0; y <= canvas.height; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Marcador central
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fill();

            // Texto de coordenadas
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, centerX, centerY - 15);

            return canvas;
        }

        // 8. Função para criar mapa alternativo com Canvas (se APIs falharem)
        function createCanvasMap(latitude, longitude) {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 200;
            canvas.style.border = '2px solid #576879';
            canvas.style.borderRadius = '8px';
            canvas.style.marginTop = '10px';

            const ctx = canvas.getContext('2d');

            // Fundo
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grid
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;

            // Linhas verticais
            for (let x = 0; x <= canvas.width; x += 30) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }

            // Linhas horizontais
            for (let y = 0; y <= canvas.height; y += 30) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Marcador central
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fill();

            // Texto de coordenadas
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, centerX, centerY - 15);

            return canvas;
        }

        // Obter IP local (aproximado)
        function getLocalIP() {
            try {
                const pc = new RTCPeerConnection({iceServers: []});
                pc.onicecandidate = (ice) => {
                    if (ice.candidate) {
                        const localIP = ice.candidate.candidate.split(' ')[4];
                        if (localIP.includes('192.168') || localIP.includes('10.0')) {
                            return localIP;
                        }
                    }
                };
                pc.createDataChannel('');
                pc.createOffer().then(pc.setLocalDescription.bind(pc));
                return 'Detectando...';
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
            <span class="info-value">${navigator.connection ? navigator.connection.effectiveType : 'Não disponível'}</span>
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

            container.innerHTML = sensorInfo || '<div class="info-item"><span class="info-label">Status:</span><span class="info-value">Nenhum sensor detectado</span></div>';
        }

        // Carregar informações de rede
        function loadNetworkInfo() {
            const container = document.getElementById('network-info');

            let networkInfo = `
            <div class="info-item">
            <span class="info-label">URL Atual:</span>
            <span class="info-value">${window.location.href}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Protocolo:</span>
            <span class="info-value">${window.location.protocol}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Host:</span>
            <span class="info-value">${window.location.host}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Porta:</span>
            <span class="info-value">${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}</span>
            </div>
            <div class="info-item">
            <span class="info-label">Referrer:</span>
            <span class="info-value">${document.referrer || 'Direto'}</span>
            </div>
            `;

            // Informações de conexão
            if (navigator.connection) {
                networkInfo += `
                <div class="info-item">
                <span class="info-label">Tipo de Conexão:</span>
                <span class="info-value">${navigator.connection.effectiveType}</span>
                </div>
                <div class="info-item">
                <span class="info-label">Velocidade Download:</span>
                <span class="info-value">${navigator.connection.downlink} Mbps</span>
                </div>
                <div class="info-item">
                <span class="info-label">RTT:</span>
                <span class="info-value">${navigator.connection.rtt} ms</span>
                </div>
                `;
            }

            // Testar conexões WebRTC
            testWebRTCConnections().then(connections => {
                if (connections.length > 0) {
                    networkInfo += `
                    <div class="connection-list">
                    <strong>Conexões WebRTC Detectadas:</strong>
                    ${connections.map(conn => `
                        <div class="connection-item">${conn}</div>
                        `).join('')}
                        </div>
                        `;
                        container.innerHTML = networkInfo;
                }
            });

            container.innerHTML = networkInfo;
        }

        // Testar conexões WebRTC
        async function testWebRTCConnections() {
            return new Promise((resolve) => {
                const connections = [];
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        connections.push(event.candidate.candidate);
                    }
                };

                pc.createDataChannel('test');
                pc.createOffer().then(offer => {
                    pc.setLocalDescription(offer);
                    setTimeout(() => {
                        pc.close();
                        resolve(connections);
                    }, 2000);
                });
            });
        }

        // Calcular fingerprint do navegador
        function calculateFingerprint() {
            const container = document.getElementById('fingerprint-info');

            // Combinar todas as informações coletadas
            const fingerprintData = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                languages: navigator.languages,
                platform: navigator.platform,
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                plugins: detectedInfo.plugins ? detectedInfo.plugins.map(p => p.name).join(',') : '',
                fonts: detectedInfo.fonts ? detectedInfo.fonts.join(',') : '',
                canvas: detectedInfo.canvas ? detectedInfo.canvas.hash : '',
                webgl: detectedInfo.webgl ? detectedInfo.webgl.renderer : '',
                hardware: `${navigator.hardwareConcurrency}-${navigator.deviceMemory}`,
                connection: navigator.connection ? navigator.connection.effectiveType : ''
            };

            const fingerprintString = JSON.stringify(fingerprintData);
            browserFingerprint = hashCode(fingerprintString);

            container.innerHTML = `
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
            <div class="fingerprint-hash">
            Fingerprint completo: ${fingerprintString}
            </div>
            `;
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

        // Calcular pontuação de privacidade
        function calculatePrivacyScore() {
            const container = document.getElementById('privacy-score');

            let score = 100;
            let risks = [];

            // Verificar riscos
            if (detectedInfo.canvas) {
                score -= 15;
                risks.push('Canvas Fingerprinting detectado');
            }

            if (detectedInfo.webgl) {
                score -= 10;
                risks.push('WebGL Fingerprinting detectado');
            }

            if (detectedInfo.fonts && detectedInfo.fonts.length > 20) {
                score -= 10;
                risks.push('Muitas fontes detectadas');
            }

            if (detectedInfo.plugins && detectedInfo.plugins.length > 0) {
                score -= 8;
                risks.push('Plugins detectados');
            }

            if (!navigator.doNotTrack) {
                score -= 5;
                risks.push('Do Not Track desabilitado');
            }

            if (navigator.cookieEnabled) {
                score -= 5;
                risks.push('Cookies habilitados');
            }

            if (location.protocol !== 'https:') {
                score -= 15;
                risks.push('Conexão não segura (HTTP)');
            }

            if (detectedInfo.ip) {
                score -= 12;
                risks.push('IP público exposto');
            }

            score = Math.max(score, 0);
            privacyScore = score;

            let riskLevel = 'risk-high';
            let riskText = 'Alto Risco';

            if (score > 70) {
                riskLevel = 'risk-low';
                riskText = 'Baixo Risco';
            } else if (score > 40) {
                riskLevel = 'risk-medium';
                riskText = 'Médio Risco';
            }

            container.innerHTML = `
            <div class="privacy-score">${score}/100</div>
            <div class="risk-indicator ${riskLevel}">
            🛡️ ${riskText}
            </div>
            <div style="margin-top: 20px;">
            <strong>Vulnerabilidades encontradas:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
            ${risks.map(risk => `<li>${risk}</li>`).join('')}
            </ul>
            </div>
            <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
            <strong>Dicas para melhorar sua privacidade:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
            <li>Use extensões anti-tracking (uBlock Origin, Privacy Badger)</li>
            <li>Desabilite JavaScript para sites não confiáveis</li>
            <li>Use VPN para mascarar seu IP</li>
            <li>Configure seu navegador para bloquear fingerprinting</li>
            <li>Desabilite plugins desnecessários</li>
            </ul>
            </div>
            `;
        }

        // Função para atualizar todas as informações
        function refreshAllInfo() {
            // Mostrar loading em todos os containers
            const containers = [
                'ip-info', 'basic-info', 'screen-info', 'browser-info',
                'hardware-info', 'plugins-info', 'security-info', 'fonts-info',
                'canvas-info', 'webgl-info', 'sensors-info', 'network-info',
                'fingerprint-info', 'privacy-score'
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
