import { calcularStatusAcademia } from './status.js';
import { formatarCronometro } from './utils.js';

export function atualizarCronometroHorarios() {
    const status = calcularStatusAcademia();
    const agora = new Date();

    const diffSegundos = Math.max(0, Math.floor((status.proximoEvento - agora) / 1000));

    const cronometroEl = document.getElementById('cronometro');
    const textoEl      = document.getElementById('cronometro-texto');
    const cardEl       = document.getElementById('horario-status-card');

    if (cronometroEl) cronometroEl.textContent = formatarCronometro(diffSegundos);
    if (textoEl)      textoEl.innerHTML = status.mensagem;
    if (cardEl)       cardEl.classList.toggle('fechado', !status.aberto);

    const dia = agora.getDay();
    document.querySelectorAll('.card-horario').forEach(card => {
        const dias = card.dataset.dia.split(',').map(Number);
        card.classList.toggle('hoje', dias.includes(dia));
    });
}

export function iniciarCronometro() {
    atualizarCronometroHorarios();
    setInterval(atualizarCronometroHorarios, 1000);
}