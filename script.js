/* ===================== BADGE DE STATUS ===================== */
function BadgeAtualizarStatus() { //função que controla a badge
    const agora = new Date(); //objeto construtor new date
    const dia = agora.getDay(); // metodo do newdate para dia
    const hora = agora.getHours() + agora.getMinutes() / 60; //metodo do newdate para hora

    let aberto = false; //flag para controlar aberto e fechado

    //condicionais que controlam quais dias e hora esta aberto ou fechado
    if (dia >= 1 && dia <= 5) {
        // Segunda a sexta: 6h às 22h
        aberto = hora >= 5 && hora < 22;
    } else if (dia === 6) {
        // Sábado: 6h às 12h ou 14h às 18h
        aberto = (hora >= 6 && hora < 12) || (hora >= 14 && hora < 18);
    } else if (dia === 0) {
        // Domingo: 8h às 12h
        aberto = hora >= 8 && hora < 12;
    }

    const badge = document.getElementById('statusatualhtml'); //declara div da badge do html no js
    const texto = document.getElementById('texto-bolinha'); //declara texto do html no js
    const bolinha = badge.querySelector('.bolinha'); //declara bolinha do html no js atraves da classe usando query selector

    if (aberto === true) { //se a flag aberto for true
        texto.textContent = 'ABERTO AGORA';
        bolinha.style.backgroundColor = '#22c55e';
        bolinha.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.8)';
        badge.style.borderColor = '#22c55e';
    } else { //caso contrario
        texto.textContent = 'FECHADO AGORA';
        bolinha.style.backgroundColor = '#ef4444';
        bolinha.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.8)';
        badge.style.borderColor = '#ef4444';
    }
}

BadgeAtualizarStatus(); // roda uma vez ao carregar
setInterval(BadgeAtualizarStatus, 60000); // atualiza a cada 1 minuto

/* ===================== MENU HAMBÚRGUER ===================== */
const btnMenu = document.getElementById('btn-menu');
const menuNav = document.getElementById('menu-nav');

btnMenu.addEventListener('click', () => {
    // Alterna as classes que abrem o menu e animam as barrinhas
    btnMenu.classList.toggle('ativo');
    menuNav.classList.toggle('aberto');

    // Acessibilidade: avisa se está aberto ou fechado
    const aberto = btnMenu.classList.contains('ativo');
    btnMenu.setAttribute('aria-expanded', aberto);
});

// Fecha o menu automaticamente quando clica em um link
const linksMenu = menuNav.querySelectorAll('a');
linksMenu.forEach(link => {
    link.addEventListener('click', () => {
        btnMenu.classList.remove('ativo');
        menuNav.classList.remove('aberto');
        btnMenu.setAttribute('aria-expanded', 'false');
    });
});

// Fecha o menu ao clicar fora dele (opcional, mas recomendado)
document.addEventListener('click', (e) => {
    const clicouFora = !menuNav.contains(e.target) && !btnMenu.contains(e.target);
    if (clicouFora && menuNav.classList.contains('aberto')) {
        btnMenu.classList.remove('ativo');
        menuNav.classList.remove('aberto');
        btnMenu.setAttribute('aria-expanded', 'false');
    }
});

/* ===================== CRONÔMETRO DA SEÇÃO HORÁRIOS ===================== */
// Horários em formato 24h (0–23)
const HORARIOS = {
    0: { abertura: 8,  fechamento: 13 },                                 // Domingo
    1: { abertura: 5,  fechamento: 22 },                                 // Segunda
    2: { abertura: 5,  fechamento: 22 },                                 // Terça
    3: { abertura: 5,  fechamento: 22 },                                 // Quarta
    4: { abertura: 5,  fechamento: 22 },                                 // Quinta
    5: { abertura: 5,  fechamento: 22 },                                 // Sexta
    6: { abertura: 6,  fechamento: 18, pausa: { inicio: 12, fim: 14 } }  // Sábado COM pausa
};

const NOMES_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                    'quinta-feira', 'sexta-feira', 'sábado'];

function formatarHora(h) {
    return String(h).padStart(2, '0') + ':00';
}

function formatarCronometro(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/* Retorna os intervalos abertos de um dia.
   Se tiver pausa, vira dois intervalos. */
function intervalosAbertos(dia) {
    const h = HORARIOS[dia];
    if (h.pausa) {
        return [
            [h.abertura, h.pausa.inicio],
            [h.pausa.fim, h.fechamento]
        ];
    }
    return [[h.abertura, h.fechamento]];
}

function atualizarCronometroHorarios() {
    const agora = new Date();
    const dia = agora.getDay();
    const horasDecimais = agora.getHours() + agora.getMinutes() / 60 + agora.getSeconds() / 3600;

    const intervalos = intervalosAbertos(dia);
    const aberto = intervalos.some(([ini, fim]) => horasDecimais >= ini && horasDecimais < fim);

    // Monta a lista de eventos do dia (aberturas e fechamentos)
    const eventosHoje = [];
    intervalos.forEach(([ini, fim]) => {
        eventosHoje.push({ hora: ini, tipo: 'abertura' });
        eventosHoje.push({ hora: fim, tipo: 'fechamento' });
    });
    eventosHoje.sort((a, b) => a.hora - b.hora);

    const proximoHoje = eventosHoje.find(e => e.hora > horasDecimais);

    let proximoEventoData;
    let mensagem;

    if (aberto) {
        // Acha o fim do intervalo atual
        const [, fimAtual] = intervalos.find(([ini, fim]) => horasDecimais >= ini && horasDecimais < fim);
        const h = HORARIOS[dia];
        const ehPausa = h.pausa && fimAtual === h.pausa.inicio;

        proximoEventoData = new Date(agora);
        proximoEventoData.setHours(fimAtual, 0, 0, 0);

        mensagem = ehPausa
            ? `Academia <strong>aberta</strong>. Pausa para almoço às <strong>${formatarHora(fimAtual)}</strong>.`
            : `Academia <strong>aberta</strong>. Fecharemos às <strong>${formatarHora(fimAtual)}</strong>.`;
    } else if (proximoHoje) {
        proximoEventoData = new Date(agora);
        proximoEventoData.setHours(proximoHoje.hora, 0, 0, 0);

        const h = HORARIOS[dia];
        const emPausa = h.pausa && horasDecimais >= h.pausa.inicio && horasDecimais < h.pausa.fim;

        mensagem = emPausa
            ? `Academia em <strong>pausa</strong>. Reabriremos às <strong>${formatarHora(proximoHoje.hora)}</strong>.`
            : `Academia fechada no momento. Abrirá <strong>hoje</strong> às <strong>${formatarHora(proximoHoje.hora)}</strong>.`;
    } else {
        let offset = 1;
        let proximoDia = (dia + offset) % 7;
        proximoEventoData = new Date(agora);
        proximoEventoData.setDate(proximoEventoData.getDate() + offset);
        proximoEventoData.setHours(HORARIOS[proximoDia].abertura, 0, 0, 0);

        const quando = offset === 1 ? 'amanhã' : `na ${NOMES_DIAS[proximoDia]}`;
        mensagem = `Academia fechada no momento. Abrirá <strong>${quando}</strong> às <strong>${formatarHora(HORARIOS[proximoDia].abertura)}</strong>.`;
    }

    const diffSegundos = Math.max(0, Math.floor((proximoEventoData - agora) / 1000));

    const cronometroEl = document.getElementById('cronometro');
    const textoEl = document.getElementById('cronometro-texto');
    const cardEl = document.getElementById('horario-status-card');

    if (cronometroEl) cronometroEl.textContent = formatarCronometro(diffSegundos);
    if (textoEl) textoEl.innerHTML = mensagem;
    if (cardEl) cardEl.classList.toggle('fechado', !aberto);

    document.querySelectorAll('.card-horario').forEach(card => {
        const dias = card.dataset.dia.split(',').map(Number);
        card.classList.toggle('hoje', dias.includes(dia));
    });
}

atualizarCronometroHorarios();
setInterval(atualizarCronometroHorarios, 1000);