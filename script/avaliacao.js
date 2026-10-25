// MÓDULO DE AVALIAÇÃO NO GOOGLE
// - Redireciona os botões de avaliação para o link correto (Android vs outros)
// - Esconde o botão flutuante quando o footer estiver visível na tela

const LINK_ANDROID   = 'https://g.page/r/CfP91HTjcLaqEBM/review';
const LINK_UNIVERSAL = 'https://search.google.com/local/writereview?placeid=ChIJnyx1YOb1nQAR8_3UdONwtqo';

function isAndroid() {
    return /android/i.test(navigator.userAgent);
}

function tratarCliqueAvaliacao(event) {
    event.preventDefault();
    const url = isAndroid() ? LINK_ANDROID : LINK_UNIVERSAL;
    window.open(url, '_blank', 'noopener');
}

export function iniciarAvaliacao() {
    const botoes = document.querySelectorAll('.btn-avaliar, .btn-avaliar-flutuante');
    if (!botoes.length) return;

    botoes.forEach((btn) => {
        btn.addEventListener('click', tratarCliqueAvaliacao);
    });

    // ---- Esconde o botão flutuante quando o footer estiver visível ----
    const botaoFlutuante = document.querySelector('.btn-avaliar-flutuante');
    const footer = document.querySelector('footer');

    if (!botaoFlutuante || !footer) {
        console.warn('[avaliacao] Botão flutuante ou footer não encontrados.');
        return;
    }

    let framePendente = false;

    function atualizarVisibilidade() {
        const rect = footer.getBoundingClientRect();
        // Footer é considerado "visível" quando o topo dele entra na viewport
        const footerVisivel = rect.top < window.innerHeight;
        botaoFlutuante.classList.toggle('oculto', footerVisivel);
        framePendente = false;
    }

    function aoRolar() {
        // throttle com requestAnimationFrame pra não pesar no celular
        if (!framePendente) {
            framePendente = true;
            requestAnimationFrame(atualizarVisibilidade);
        }
    }

    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });

    // Checa uma vez no carregamento (caso a página já abra no footer,
    // tipo quando o usuário recarrega direto na âncora #contato)
    atualizarVisibilidade();

    // Log só pra debug — remova depois que confirmar que funciona
    console.log('[avaliacao] Observer de footer ativado ✅');
}