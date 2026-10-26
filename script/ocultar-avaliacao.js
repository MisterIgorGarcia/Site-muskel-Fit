// MÓDULO: esconde o botão flutuante de avaliação quando
// o footer OU o botão principal da seção #avaliacao estão visíveis.
// Usa a classe .oculto (que já tem display: none !important no CSS).

export function iniciarOcultarAvaliacao() {
    const botaoFlutuante = document.querySelector('.btn-avaliar-flutuante');

    // Elementos que, ao aparecerem na tela, escondem o botão flutuante
    const alvos = [
        document.querySelector('footer#contato'),          // rodapé
        document.querySelector('#avaliacao .btn-avaliar'), // botão "Avalie já a MUSKEL FIT"
    ].filter(Boolean); // remove nulls se algum não existir

    if (!botaoFlutuante || alvos.length === 0) return;

    // Conjunto com os alvos que estão visíveis no momento
    const visiveis = new Set();

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    visiveis.add(entry.target);
                } else {
                    visiveis.delete(entry.target);
                }
            });

            // Se QUALQUER alvo estiver visível, esconde o flutuante
            botaoFlutuante.classList.toggle('oculto', visiveis.size > 0);
        },
        {
            threshold: 0.1, // considera "visível" quando 10% do elemento aparece
        }
    );

    alvos.forEach((alvo) => observer.observe(alvo));
}