        function copyCommand(button, command) {
            // Copia o comando para a área de transferência
            navigator.clipboard.writeText(command).then(function() {
                // Mostra feedback visual no botão
                const originalText = button.textContent;
                button.textContent = 'Copiado!';
                button.classList.add('copied');

                // Mostra toast de confirmação
                showToast();

                // Restaura o botão após 2 segundos
                setTimeout(function() {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                // Fallback para navegadores mais antigos
                const textarea = document.createElement('textarea');
                textarea.value = command;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                button.textContent = 'Copiado!';
                button.classList.add('copied');
                showToast();

                setTimeout(function() {
                    button.textContent = 'Copiar';
                    button.classList.remove('copied');
                }, 2000);
            });
        }

        // Função específica para o comando complexo do debloat
        function copyDebloatCommand(button) {
            const command = '& ([scriptblock]::Create((irm "https://debloat.raphi.re/")))';

            navigator.clipboard.writeText(command).then(function() {
                const originalText = button.textContent;
                button.textContent = 'Copiado!';
                button.classList.add('copied');
                showToast();

                setTimeout(function() {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                // Fallback para navegadores mais antigos
                const textarea = document.createElement('textarea');
                textarea.value = command;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                button.textContent = 'Copiado!';
                button.classList.add('copied');
                showToast();

                setTimeout(function() {
                    button.textContent = 'Copiar';
                    button.classList.remove('copied');
                }, 2000);
            });
        }

        function showToast() {
            const toast = document.getElementById('toast');
            toast.classList.add('show');

            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }

        // Permite copiar clicando no código também
        document.querySelectorAll('.command-code').forEach(function(codeBlock) {
            codeBlock.addEventListener('click', function() {
                const command = this.textContent.trim();
                const button = this.parentElement.querySelector('.copy-btn');

                // Verifica se é o comando complexo do debloat
                if (command.includes('scriptblock')) {
                    copyDebloatCommand(button);
                } else {
                    copyCommand(button, command);
                }
            });
        });
