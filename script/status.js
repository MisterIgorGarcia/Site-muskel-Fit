// status.js
import { HORARIOS, NOMES_DIAS } from './config.js';

// ===================== CACHE DE FERIADOS =====================
const CACHE_FERIADOS = new Map(); // ano -> array de feriados

async function obterFeriadosDoAno(ano) {
    if (CACHE_FERIADOS.has(ano)) return CACHE_FERIADOS.get(ano);
    try {
        const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
        if (!resp.ok) throw new Error('Falha ao buscar feriados');
        const feriados = await resp.json();
        CACHE_FERIADOS.set(ano, feriados);
        return feriados;
    } catch (erro) {
        console.error('Erro ao buscar feriados:', erro);
        return [];
    }
}

async function verificarFeriado(dataISO) {
    const ano = parseInt(dataISO.slice(0, 4), 10);
    const feriados = await obterFeriadosDoAno(ano);
    const feriado = feriados.find(f => f.date === dataISO);
    return feriado
        ? { ehFeriado: true, nome: feriado.name }
        : { ehFeriado: false };
}

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

function formatarHoraLocal(h) {
    return String(h).padStart(2, '0') + ':00';
}

export async function calcularStatusAcademia() {
    const agora = new Date();
    const dia = agora.getDay();
    const dataISO = agora.toISOString().slice(0, 10);

    // 1. Verifica se hoje é feriado
    const { ehFeriado, nome: nomeFeriado } = await verificarFeriado(dataISO);

    if (ehFeriado) {
        const proximoDia = (dia + 1) % 7;
        const proximoEvento = new Date(agora);
        proximoEvento.setDate(proximoEvento.getDate() + 1);
        proximoEvento.setHours(HORARIOS[proximoDia].abertura, 0, 0, 0);

        const quando = 'amanhã';
        return {
            aberto: false,
            ehFeriado: true,           // <-- ADICIONADO (Para o cronometro saber)
            nomeFeriado: nomeFeriado,  // <-- ADICIONADO (Para o card mostrar o nome)
            proximoEvento,
            mensagem: `Academia <strong>fechada</strong> hoje por ser feriado: <strong>${nomeFeriado}</strong>. Abriremos <strong>${quando}</strong> às <strong>${formatarHoraLocal(HORARIOS[proximoDia].abertura)}</strong>.`
        };
    }

    // 2. Lógica original (dias normais)
    const horasDecimais = agora.getHours() + agora.getMinutes() / 60 + agora.getSeconds() / 3600;
    const intervalos = intervalosAbertos(dia);
    const aberto = intervalos.some(([ini, fim]) => horasDecimais >= ini && horasDecimais < fim);

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

    // <-- ADICIONADO ehFeriado: false no retorno normal
    return { aberto, ehFeriado: false, proximoEvento: proximoEventoData, mensagem };
}