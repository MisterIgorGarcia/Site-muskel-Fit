// MÓDULO DE AVALIAÇÃO NO GOOGLE
// - Redireciona os botões de avaliação para o link correto (Android vs outros)
// - Esconde o botão flutuante quando o footer estiver visível

const LINK_ANDROID   = 'https://g.page/r/CfP91HTjcLaqEBM/review';
const LINK_UNIVERSAL = 'https://search.google.com/local/writereview?placeid=ChIJnyx1YOb1nQAR8_3UdONwtqo';

// Detecta se o navegador está em um dispositivo Android
function isAndroid() {
    return /android/i.test(navigator.userAgent);
}

// Handler do clique: cancela o href padrão e abre o link adequado
function tratarCliqueAvaliacao(event) {
    event.preventDefault();
    const url = isAndroid() ? LINK_ANDROID : LINK_UNIVERSAL;
    window.open(url, '_blank', 'noopener');
}

// Função chamada pelo main.js no init()
export function iniciarAvaliacao() {
    const botoes = document.querySelectorAll('.btn-avaliar, .btn-avaliar-flutuante');
    if (!botoes.length) return;

    botoes.forEach((btn) => {
        btn.addEventListener('click', tratarCliqueAvaliacao);
    });

    // ---- Esconde o botão flutuante quando o footer estiver visível ----
    const botaoFlutuante = document.querySelector('.btn-avaliar-flutuante');
    const footer = document.querySelector('footer');
    if (!botaoFlutuante || !footer) return;

    // Fallback: se o navegador não suportar IntersectionObserver, não faz nada
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                // Se QUALQUER parte do footer estiver visível, oculta o botão
                botaoFlutuante.classList.toggle('oculto', entry.isIntersecting);
            });
        },
        {
            // Dispara quando 5% do footer estiver na tela (entra cedo, mas só o suficiente)
            threshold: 0.05,
        }
    );

    observer.observe(footer);
}