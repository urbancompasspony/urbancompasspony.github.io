    document.addEventListener("DOMContentLoaded", function() {
    const rssUrl = 'http://linuxuniverse.com.br/feed'; // Substitua pela URL do seu feed RSS
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const container = document.getElementById('rss-buttons');

    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'ok') {
                const items = data.items;

                items.forEach(item => {
                    const title = item.title;
                    const link = item.link;
                    const imageUrl = item.thumbnail || ''; // Usa a imagem em thumbnail, se disponível

                    const button = document.createElement('a');
                    button.className = 'button button-default';
                    button.href = link;
                    button.target = '_blank';
                    button.rel = 'noopener';
                    button.role = 'button';

                    if (imageUrl) {
                        const img = document.createElement('img');
                        img.className = 'icon';
                        img.src = imageUrl;
                        img.alt = title;
                        button.appendChild(img);
                    }

                    const text = document.createTextNode(title);
                    button.appendChild(text);

                    container.appendChild(button);
                });
            } else {
                console.error('Erro ao carregar o RSS:', data.message);
            }
        })
        .catch(error => console.error('Erro ao carregar o RSS:', error));
});
