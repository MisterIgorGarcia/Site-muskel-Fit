import { HORARIOS, NOMES_DIAS } from './config.js';

/**
 * Retorna os intervalos abertos de um dia.
 * Se tiver pausa, vira dois intervalos.
 * @param {number} dia - 0 (dom) a 6 (sáb)
 * @returns {Array<[number, number]>}
 */
export function intervalosAbertos(dia) {
    const h = HORARIOS[dia];
    if (h.pausa) {
        return [
            [h.abertura, h.pausa.inicio],
            [h.pausa.fim, h.fechamento]
        ];
    }
    return [[h.abertura, h.fechamento]];
}

/**
 * Calcula o status atual da academia.
 * @returns {{ aberto: boolean, proximoEvento: Date, mensagem: string }}
 */
export function calcularStatusAcademia() {
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
    const h = HORARIOS[dia];

    if (aberto) {
        const [, fimAtual] = intervalos.find(([ini, fim]) => horasDecimais >= ini && horasDecimais < fim);
        const ehPausa = h.pausa && fimAtual === h.pausa.inicio;

        proximoEventoData = new Date(agora);
        proximoEventoData.setHours(fimAtual, 0, 0, 0);

        mensagem = ehPausa
            ? `Academia <strong>aberta</strong>. Pausa para almoço às <strong>${formatarHoraLocal(fimAtual)}</strong>.`
            : `Academia <strong>aberta</strong>. Fecharemos às <strong>${formatarHoraLocal(fimAtual)}</strong>.`;

    } else if (proximoHoje) {
        proximoEventoData = new Date(agora);
        proximoEventoData.setHours(proximoHoje.hora, 0, 0, 0);

        const emPausa = h.pausa && horasDecimais >= h.pausa.inicio && horasDecimais < h.pausa.fim;

        mensagem = emPausa
            ? `Academia em <strong>pausa para almoço</strong>. Reabriremos às <strong>${formatarHoraLocal(proximoHoje.hora)}</strong>.`
            : `Academia fechada no momento. Abrirá <strong>hoje</strong> às <strong>${formatarHoraLocal(proximoHoje.hora)}</strong>.`;

    } else {
        const offset = 1;
        const proximoDia = (dia + offset) % 7;
        proximoEventoData = new Date(agora);
        proximoEventoData.setDate(proximoEventoData.getDate() + offset);
        proximoEventoData.setHours(HORARIOS[proximoDia].abertura, 0, 0, 0);

        const quando = offset === 1 ? 'amanhã' : `na ${NOMES_DIAS[proximoDia]}`;
        mensagem = `Academia fechada no momento. Abrirá <strong>${quando}</strong> às <strong>${formatarHoraLocal(HORARIOS[proximoDia].abertura)}</strong>.`;
    }

    return { aberto, proximoEvento: proximoEventoData, mensagem };
}

// helper local pra não criar dependência circular com utils
function formatarHoraLocal(h) {
    return String(h).padStart(2, '0') + ':00';
}