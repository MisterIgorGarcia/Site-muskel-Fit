import { HORARIOS, NOMES_DIAS, HORARIO_FERIADO_PADRAO, HORARIOS_FERIADOS_CUSTOMIZADOS } from './config.js';

const CACHE_FERIADOS = new Map();

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
    return feriado ? { ehFeriado: true, nome: feriado.name } : { ehFeriado: false };
}

export function intervalosAbertos(dia) {
    const h = HORARIOS[dia];
    if (h.pausa) {
        return [[h.abertura, h.pausa.inicio], [h.pausa.fim, h.fechamento]];
    }
    return [[h.abertura, h.fechamento]];
}

function formatarHoraLocal(h) {
    return String(h).padStart(2, '0') + ':00';
}

export async function calcularStatusAcademia() {
    const agora = new Date();
    const dia = agora.getDay();
    const dataISO = agora.toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD local

    const { ehFeriado, nome: nomeFeriado } = await verificarFeriado(dataISO);

    if (ehFeriado) {
        const horasDecimais = agora.getHours() + agora.getMinutes() / 60 + agora.getSeconds() / 3600;
        const regraFeriado = HORARIOS_FERIADOS_CUSTOMIZADOS[nomeFeriado] || HORARIO_FERIADO_PADRAO;
        
        let abertura = regraFeriado.abertura;
        let fechamento = regraFeriado.fechamento;
        const fechadoOdiaTodo = (abertura === null || fechamento === null);
        const aberto = !fechadoOdiaTodo && (horasDecimais >= abertura && horasDecimais < fechamento);

        let proximoEvento = new Date(agora);
        let mensagem = '';

        if (fechadoOdiaTodo) {
            const proximoDia = (dia + 1) % 7;
            proximoEvento.setDate(proximoEvento.getDate() + 1);
            proximoEvento.setHours(HORARIOS[proximoDia].abertura, 0, 0, 0);
            mensagem = `Hoje é feriado (<strong>${nomeFeriado}</strong>) e estaremos <strong>fechados</strong>. Abriremos <strong>amanhã</strong> às <strong>${formatarHoraLocal(HORARIOS[proximoDia].abertura)}</strong>.`;
        } else if (aberto) {
            proximoEvento.setHours(fechamento, 0, 0, 0);
            mensagem = `Hoje é feriado (<strong>${nomeFeriado}</strong>). Horário especial: <strong>fecharemos às ${String(fechamento).padStart(2, '0')}:00</strong>.`;
        } else if (horasDecimais < abertura) {
            proximoEvento.setHours(abertura, 0, 0, 0);
            mensagem = `Hoje é feriado (<strong>${nomeFeriado}</strong>). Abriremos às <strong>${String(abertura).padStart(2, '0')}:00</strong>.`;
        } else {
            const proximoDia = (dia + 1) % 7;
            proximoEvento.setDate(proximoEvento.getDate() + 1);
            proximoEvento.setHours(HORARIOS[proximoDia].abertura, 0, 0, 0);
            mensagem = `Hoje é feriado (<strong>${nomeFeriado}</strong>). Academia fechada no momento. Abriremos <strong>amanhã</strong> às <strong>${formatarHoraLocal(HORARIOS[proximoDia].abertura)}</strong>.`;
        }

        return {
            aberto,
            ehFeriado: true,
            nomeFeriado: nomeFeriado,
            fechadoOdiaTodo: fechadoOdiaTodo,
            horarioFeriado: { abertura, fechamento },
            proximoEvento,
            mensagem
        };
    }

    // Lógica original (dias normais)
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

    return { aberto, ehFeriado: false, proximoEvento: proximoEventoData, mensagem };
}