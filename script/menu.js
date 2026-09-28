export function iniciarMenu() {
    const btnMenu = document.getElementById('btn-menu');
    const menuNav = document.getElementById('menu-nav');
    if (btnMenu === null || menuNav === null) return; // Clausula de guarda (Guard clausule) retorna se os elementos não existem, ja que pode existir momentos onde dependendo do sistema em que o site abrir, os elementos do HTML podem ser carregados DEPOIS do JS que é codigo puro e geralmente é mais rapido

    //trecho cerebro do hamburguer (menu)
    const fechar = () => {
        btnMenu.classList.remove('ativo'); //remove o estado ativo (3 traço vira x)
        menuNav.classList.remove('aberto'); //remove o menu da tela
        btnMenu.setAttribute('aria-expanded', 'false');
    };

    btnMenu.addEventListener('click', () => { //listener para aguardar o clique do usuario no botao
        btnMenu.classList.toggle('ativo'); //ativa o estado ativo (3 traço vira x)
        menuNav.classList.toggle('aberto'); //ativa o menu na tela
        btnMenu.setAttribute('aria-expanded', btnMenu.classList.contains('ativo'));
    });

    menuNav.querySelectorAll('a').forEach(link => link.addEventListener('click', fechar)); //fecha ao clicar em um link

    document.addEventListener('click', (e) => { //fecha ao clicar fora
        const clicouFora = !menuNav.contains(e.target) && !btnMenu.contains(e.target);
        if (clicouFora && menuNav.classList.contains('aberto')) fechar();
    });
}