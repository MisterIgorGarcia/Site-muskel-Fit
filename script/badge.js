//ESTE ARQUIVO CONTROLA TODA FUNCIONALIDADE DAS BADGES DE ABERTO OU FECHADO DO SITE//

import { HORARIOS_BADGE } from './config.js';

export function atualizarBadge() {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours() + agora.getMinutes() / 60;

    let aberto = false;

    if (dia >= 1 && dia <= 5) {
        const { abre, fecha } = HORARIOS_BADGE.semana;
        aberto = hora >= abre && hora < fecha;
    } else if (dia === 6) {
        const [mIni, mFim] = HORARIOS_BADGE.sabado.manha;
        const [tIni, tFim] = HORARIOS_BADGE.sabado.tarde;
        aberto = (hora >= mIni && hora < mFim) || (hora >= tIni && hora < tFim);
    } else if (dia === 0) {
        const { abre, fecha } = HORARIOS_BADGE.domingo;
        aberto = hora >= abre && hora < fecha;
    }

    const badge = document.getElementById('statusatualhtml');
    if (!badge) return;
    const texto = document.getElementById('texto-bolinha');
    const bolinha = badge.querySelector('.bolinha');

    if (aberto) {
        texto.textContent = 'ABERTO AGORA';
        bolinha.style.backgroundColor = '#22c55e';
        bolinha.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.8)';
        badge.style.borderColor = '#22c55e';
    } else {
        texto.textContent = 'FECHADO AGORA';
        bolinha.style.backgroundColor = '#ef4444';
        bolinha.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.8)';
        badge.style.borderColor = '#ef4444';
    }
}

export function iniciarBadge() {
    atualizarBadge();
    setInterval(atualizarBadge, 60000);
}