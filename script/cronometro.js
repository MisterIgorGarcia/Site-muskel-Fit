//ESSE ARQUIVO CONTROLA A FUNCIONALIDADE DO CRONOMETRO DO SITE

import { calcularStatusAcademia } from './status.js';
import { formatarCronometro } from './utils.js';

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

        if (isHoje && status.ehFeriado) {
            card.classList.add('card-feriado');
            
            const iconeEl = card.querySelector('.horario-icone i');
            const linhas = card.querySelectorAll('.horario-linha');
            const tagEl = card.querySelector('.horario-tag');

            if (status.fechadoOdiaTodo) {
                if (iconeEl) iconeEl.className = 'fa-solid fa-calendar-xmark';
                linhas.forEach(l => l.style.display = 'none');
                if (tagEl) {
                    tagEl.className = 'horario-tag fechado';
                    tagEl.textContent = `Fechado - ${status.nomeFeriado}`;
                }
                const tituloEl = card.querySelector('h3');
                if (tituloEl) tituloEl.style.textDecoration = 'line-through';
            } else {
                if (iconeEl) iconeEl.className = 'fa-solid fa-calendar-day';
                if (linhas.length > 0) {
                    const ab = status.horarioFeriado.abertura.toString().padStart(2, '0');
                    const fe = status.horarioFeriado.fechamento.toString().padStart(2, '0');
                    linhas[0].innerHTML = `<i class="fa-regular fa-clock"></i> ${ab}h — ${fe}h`;
                    for(let i = 1; i < linhas.length; i++) linhas[i].style.display = 'none';
                }
                if (tagEl) {
                    tagEl.className = status.aberto ? 'horario-tag atencao' : 'horario-tag folga';
                    tagEl.textContent = status.aberto ? `Feriado - Aberto` : `Feriado - Fechado`;
                }
            }
        }
    });
}

export async function iniciarCronometro() {
    await atualizarCronometroHorarios();
    setInterval(atualizarCronometroHorarios, 1000);
}