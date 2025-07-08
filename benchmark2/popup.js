        // === SISTEMA DE AVISO DE SEGURANÇA ===

        function checkPreviousWarning() {
            // Verifica se o usuário já disse para não mostrar o aviso
            const dontShow = localStorage.getItem('webgl_benchmark_dont_warn');
            if (dontShow === 'true') {
                showMainContent();
                return;
            }

            // Mostra o aviso
            document.getElementById('warningOverlay').style.display = 'flex';
        }

        function startSafeMode() {
            // Salva preferência se checkbox marcado
            const dontShow = document.getElementById('dontShowAgain').checked;
            if (dontShow) {
                localStorage.setItem('webgl_benchmark_dont_warn', 'true');
            }

            // Força modo Normal e baixo número de instâncias
            showMainContent(() => {
                document.getElementById('benchmarkMode').value = '0';
                document.getElementById('instances').value = '1';

                // Mostra dica de segurança
                setTimeout(() => {
                    showSafetyTip();
                }, 1000);
            });
        }

        function proceedWithWarning() {
            // Salva preferência se checkbox marcado
            const dontShow = document.getElementById('dontShowAgain').checked;
            if (dontShow) {
                localStorage.setItem('webgl_benchmark_dont_warn', 'true');
            }

            // Inicia no modo Heavy para usuários que entendem os riscos
            showMainContent(() => {
                document.getElementById('benchmarkMode').value = '1'; // Heavy mode
                document.getElementById('instances').value = '50';    // 50 instâncias

                // Mostra dica de modo avançado
                setTimeout(() => {
                    showAdvancedTip();
                }, 1000);
            });
        }

        function showMainContent(callback) {
            const overlay = document.getElementById('warningOverlay');
            const mainContent = document.getElementById('mainContent');

            // Fade out do overlay
            overlay.style.animation = 'fadeOut 0.5s ease-out forwards';

            setTimeout(() => {
                overlay.style.display = 'none';
                mainContent.classList.add('visible');

                // Inicia o benchmark
                if (typeof main === 'function') {
                    main();
                }

                if (callback) callback();
            }, 500);
        }

        function showAdvancedTip() {
            const tip = document.createElement('div');
            tip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #dc3545, #fd7e14);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 0 30px rgba(220, 53, 69, 0.5);
            max-width: 400px;
            animation: slideIn 0.5s ease-out;
            border: 2px solid rgba(255, 255, 255, 0.3);
            `;

            tip.innerHTML = `
            <div style="font-size: 1.3em; margin-bottom: 10px;">🔥 Modo Heavy Ativado!</div>
            <div style="font-size: 0.9em; opacity: 0.9;">
            Iniciando com 64x subdivisões e 50 instâncias.<br>
            <strong>Monitore a temperatura da GPU!</strong><br>
            <span style="font-size: 0.8em; opacity: 0.8;">Você pode ajustar conforme necessário.</span>
            </div>
            <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            margin-top: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
            onmouseout="this.style.background='rgba(255,255,255,0.2)'">Entendi!</button>
            `;

            document.body.appendChild(tip);

            // Remove automaticamente após 6 segundos
            setTimeout(() => {
                if (tip.parentElement) {
                    tip.remove();
                }
            }, 6000);
        }

        function showSafetyTip() {
            const tip = document.createElement('div');
            tip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 9999;
            box-shadow: 0 0 30px rgba(40, 167, 69, 0.5);
            max-width: 400px;
            animation: slideIn 0.5s ease-out;
            `;

            tip.innerHTML = `
            <div style="font-size: 1.3em; margin-bottom: 10px;">✅ Modo Seguro Ativado!</div>
            <div style="font-size: 0.9em; opacity: 0.9;">
            Você está no modo Normal com 1 instância.<br>
            Aumente gradualmente conforme necessário.
            </div>
            <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            margin-top: 15px;
            cursor: pointer;
            ">OK</button>
            `;

            document.body.appendChild(tip);

            // Remove automaticamente após 5 segundos
            setTimeout(() => {
                if (tip.parentElement) {
                    tip.remove();
                }
            }, 5000);
        }

        // Adiciona animação de fadeOut
        const style = document.createElement('style');
        style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        `;
        document.head.appendChild(style);

        // Inicia o sistema de aviso quando a página carrega
        document.addEventListener('DOMContentLoaded', checkPreviousWarning);
