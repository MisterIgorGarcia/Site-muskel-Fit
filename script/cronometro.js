import { calcularStatusAcademia } from './status.js';
import { formatarCronometro } from './utils.js';
import { HORARIO_FERIADO } from './config.js'; // Importando o horário

export async function atualizarCronometroHorarios() {
    const status = await calcularStatusAcademia();
    const agora = new Date();
    const diffSegundos = Math.max(0, Math.floor((status.proximoEvento - agora) / 1000));

    const cronometroEl = document.getElementById('cronometro');
    const textoEl      = document.getElementById('cronometro-texto');
    const cardEl       = document.getElementById('horario-status-card');

    if (cronometroEl) cronometroEl.textContent = formatarCronometro(diffSegundos);
    if (textoEl)      textoEl.innerHTML = status.mensagem;
    if (cardEl) {
        cardEl.classList.toggle('fechado', !status.aberto);
        cardEl.classList.toggle('aberto', status.aberto);
    }

    const badgeHero = document.getElementById('texto-bolinha');
    if (badgeHero) {
        badgeHero.textContent = status.aberto ? 'ABERTO AGORA' : 'FECHADO AGORA';
        badgeHero.parentElement.classList.toggle('aberto', status.aberto);
        badgeHero.parentElement.classList.toggle('fechado', !status.aberto);
    }

    const dia = agora.getDay();
    document.querySelectorAll('.card-horario').forEach(card => {
        const dias = card.dataset.dia.split(',').map(Number);
        const isHoje = dias.includes(dia);
        card.classList.toggle('hoje', isHoje);

        // ==========================================
        // LÓGICA DE PINTAR O FERIADO NO CARD
        // ==========================================
        if (isHoje && status.ehFeriado) {
            card.classList.add('card-feriado');
            
            // Muda o ícone
            const iconeEl = card.querySelector('.horario-icone i');
            if (iconeEl) iconeEl.className = 'fa-solid fa-calendar-day';
            
            // Altera o texto das horas para mostrar o horário de feriado
            const linhas = card.querySelectorAll('.horario-linha');
            if (linhas.length > 0) {
                linhas[0].innerHTML = `<i class="fa-regular fa-clock"></i> ${HORARIO_FERIADO.abertura.toString().padStart(2, '0')}h — ${HORARIO_FERIADO.fechamento}h`;
                for(let i = 1; i < linhas.length; i++) linhas[i].style.display = 'none'; // Esconde a pausa de sábado
            }

            // Altera a tag para amarelo (se aberto) ou vermelho (se fechado)
            const tagEl = card.querySelector('.horario-tag');
            if (tagEl) {
                if (status.aberto) {
                    tagEl.className = 'horario-tag atencao';
                    tagEl.textContent = `Feriado - Aberto até ${HORARIO_FERIADO.fechamento}h`;
                } else {
                    tagEl.className = 'horario-tag fechado';
                    tagEl.textContent = `Feriado - Fechado`;
                }
            }
        }
    });
}