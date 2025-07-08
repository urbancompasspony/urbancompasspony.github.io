        // Redirecionamento via JavaScript (método 2)
        setTimeout(function() {
            window.location.href = 'https://linuxuniverse.com.br';
        }, 100);

        // Redirecionamento imediato via JavaScript (método 3)
        // Descomente a linha abaixo se quiser redirecionamento instantâneo
        // window.location.replace('https://linuxuniverse.com.br');

        // Fallback: se após 3 segundos ainda estiver na página,
        // destaca o link manual
        setTimeout(function() {
            const link = document.getElementById('manualLink');
            link.style.background = 'rgba(255, 255, 255, 0.4)';
            link.style.animation = 'pulse 1s infinite';
        }, 3000);

        // Adiciona animação de pulso
        const style = document.createElement('style');
        style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        `;
        document.head.appendChild(style);

        // Log para debug
        console.log('Redirecionando...');

        // Opcional: analytics ou tracking antes do redirecionamento
        // gtag('event', 'redirect', { 'destination': 'linuxuniverse.com.br' });
