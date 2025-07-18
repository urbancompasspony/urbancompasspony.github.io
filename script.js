    // Lista de projetos expandida
    const projects = [
{
    name: 'linuxuniverse',
    title: 'Linux Universe',
    description: 'Site completo sobre notícias, tutoriais e guias do mundo Linux. Uma fonte confiável para entusiastas e profissionais.',
    icon: '🐧',
    category: 'web',
    status: 'online'
},
{
    name: 'p',
    title: 'Publicações Recentes',
    description: 'Central de publicações mais recentes e integração com redes sociais da Linux Universe.',
    icon: '📝',
    category: 'web',
    status: 'online'
},
{
    name: 't',
    title: 'PowerShell',
    description: 'Coleção de ferramentas úteis para Windows.',
    icon: '⚡',
    category: 'tools',
    status: 'online'
},
{
    name: 'apps',
    title: 'Serviços Prestados pela SuitIT',
    description: 'Lista completa de serviços prestados em servidores para diversas necessidades empresariais.',
    icon: '🖥️',
    category: 'services',
    status: 'online'
},
{
    name: 'dns-ping',
    title: 'DNS Ping Tester',
    description: 'Ferramenta para teste de ping e latência em tempo real de diversos provedores DNS.',
    icon: '📡',
    category: 'tools',
    status: 'online'
},
{
    name: 'stress',
    title: 'Estresse de Placas de Vídeo com WebGL 1.0',
    description: 'Ferramenta para estressar Intel HD Graphics ou ainda VideoCore IV (Raspberry Pi)',
    icon: '🧊',
    category: 'tools',
    status: 'online'
},
{
    name: 'stress2',
    title: 'Estresse de Placas de Vídeo com WebGL 2.0',
    description: 'Ferramenta para estressar placas de vídeo medianas!',
    icon: '🔥',
    category: 'tools',
    status: 'online'
},
{
    name: 'stress3',
    title: 'Estresse de Placas de Vídeo com WebGPU',
    description: 'Ferramenta para estressar placas de vídeo topo de linha!',
    icon: '💥',
    category: 'tools',
    status: 'online'
},
{
    name: 'fingerprint',
    title: 'Impressão Digital do Usuário',
    description: 'Tudo que os sites coletam e sabem sobre sua vida Online e você nem imagina!',
    icon: '🆔',
    category: 'tools',
    status: 'online'
},
{
    name: 'domain-webui',
    title: 'WebUI Active Directory (Exemplo)',
    description: 'Interface web unificada que substitui o RSAT no gerenciamento do Active Directory e Domain Controller.',
    icon: '🖥️',
    category: 'examples',
    status: 'exemplo'
},
{
    name: 'system-diagnostic',
    title: 'Diagnóstico do Sistema (Exemplo)',
    description: 'Página que permite executar uma série de testes no servidor!',
    icon: '🖥️',
    category: 'examples',
    status: 'exemplo'
},
{
    name: 'pentest',
    title: 'Project Pandora Pentest (Exemplo)',
    description: 'Sistema automatizado de pentesting com relatórios gerados automaticamente e gerenciado por WebUI!',
    icon: '🔰',
    category: 'examples',
    status: 'exemplo'
},
{
    name: '404',
    title: 'Página de Erro 404',
    description: 'Página de erro personalizada e elegante para quando algo não é encontrado.',
    icon: '❌',
    category: 'web',
    status: 'online'
}
        ];

        let currentFilter = 'all';
        let searchTerm = '';

        // Criar partículas de fundo
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 50;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particlesContainer.appendChild(particle);
            }
        }

        function getFilteredProjects() {
            return projects.filter(project => {
                const matchesFilter = currentFilter === 'all' || project.category === currentFilter;
                const matchesSearch = searchTerm === '' ||
                project.title.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm) ||
                project.name.toLowerCase().includes(searchTerm);
                return matchesFilter && matchesSearch;
            });
        }

        function renderProjects() {
            const grid = document.getElementById('projectsGrid');
            const filteredProjects = getFilteredProjects();

            grid.innerHTML = '';

            filteredProjects.forEach((project, index) => {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card fade-in';
                projectCard.style.animationDelay = `${index * 0.1}s`;
                projectCard.onclick = () => window.open(`./${project.name}/`, '_blank');

                projectCard.innerHTML = `
                <div class="project-header">
                <div class="project-icon">${project.icon}</div>
                <div class="project-info">
                <h3 class="project-title">${project.title}</h3>
                <span class="project-category">${project.category}</span>
                </div>
                </div>
                <p class="project-description">${project.description}</p>
                <div class="project-footer">
                <a href="./${project.name}/" class="project-link" onclick="event.stopPropagation()">
                Acessar →
                </a>
                <div class="project-status">
                <div class="status-dot ${project.status === 'exemplo' ? 'exemplo' : ''}"></div>
                <span>${project.status}</span>
                </div>
                </div>
                `;

                grid.appendChild(projectCard);
            });

            // Atualizar contador de projetos
            document.getElementById('projectCount').textContent = filteredProjects.length;
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', function(e) {
            searchTerm = e.target.value.toLowerCase();
            renderProjects();
        });

        // Filtros
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                renderProjects();
            });
        });

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            createParticles();
            renderProjects();
        });

        // Smooth scroll para links internos
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
