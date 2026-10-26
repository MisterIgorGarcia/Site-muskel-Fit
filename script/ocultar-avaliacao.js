// MÓDULO: esconde o botão flutuante de avaliação quando o footer está visível
// Adiciona a classe .oculto (que já tem display: none !important no CSS)

export function iniciarOcultarAvaliacao() {
    const botao = document.querySelector('.btn-avaliar-flutuante');
    const footer = document.querySelector('footer#contato');
    if (!botao || !footer) return;

    // IntersectionObserver: dispara quando o footer entra/sai da viewport
    const observer = new IntersectionObserver(
        ([entry]) => {
            botao.classList.toggle('oculto', entry.isIntersecting);
        },
        {
            // Considera "visível" quando pelo menos 10% do footer aparece
            threshold: 0.1,
        }
    );

    observer.observe(footer);
}