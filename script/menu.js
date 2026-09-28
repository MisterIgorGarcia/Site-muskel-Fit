export function iniciarMenu() {
    const btnMenu = document.getElementById('btn-menu');
    const menuNav = document.getElementById('menu-nav');
    if (!btnMenu || !menuNav) return;

    const fechar = () => {
        btnMenu.classList.remove('ativo');
        menuNav.classList.remove('aberto');
        btnMenu.setAttribute('aria-expanded', 'false');
    };

    btnMenu.addEventListener('click', () => {
        btnMenu.classList.toggle('ativo');
        menuNav.classList.toggle('aberto');
        btnMenu.setAttribute('aria-expanded', btnMenu.classList.contains('ativo'));
    });

    menuNav.querySelectorAll('a').forEach(link => link.addEventListener('click', fechar));

    document.addEventListener('click', (e) => {
        const clicouFora = !menuNav.contains(e.target) && !btnMenu.contains(e.target);
        if (clicouFora && menuNav.classList.contains('aberto')) fechar();
    });
}