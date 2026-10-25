// MÓDULO DE AVALIAÇÃO NO GOOGLE
// Redireciona os botões de avaliação para o link correto:
//   - Android  -> g.page (link curto, melhor no app do Maps)
//   - Outros   -> search.google.com (universal: iPhone, iPad, desktop)

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
}