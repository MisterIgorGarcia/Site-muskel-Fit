import { calcularStatusAcademia, obterFeriadosDoAno } from './status.js';
import { formatarCronometro } from './utils.js';
import { HORARIOS, HORARIO_FERIADO_PADRAO, HORARIOS_FERIADOS_CUSTOMIZADOS } from './config.js';

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

// ==========================================
// LÓGICA DO MODAL DE HORÁRIOS (SEGUNDA A SEXTA)
// ==========================================
async function abrirModalDiasSemana() {
    // 1. Remove modal antigo se existir
    const modalAntigo = document.getElementById('modal-dias-semana');
    if (modalAntigo) modalAntigo.remove();

    // 2. Cria a estrutura do Modal
    const overlay = document.createElement('div');
    overlay.id = 'modal-dias-semana';
    overlay.className = 'mf-modal-overlay';

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const feriadosAno = await obterFeriadosDoAno(anoAtual);

    // Descobre a data da Segunda-feira desta semana
    const diaSemanaAtual = agora.getDay();
    const diffParaSegunda = diaSemanaAtual === 0 ? 1 : 1 - diaSemanaAtual;
    const segunda = new Date(agora);
    segunda.setDate(agora.getDate() + diffParaSegunda);

    const nomesDias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
    let listaHTML = '';

    // Monta a lista de segunda a sexta
    for (let i = 0; i < 5; i++) {
        const dataDia = new Date(segunda);
        dataDia.setDate(segunda.getDate() + i);
        
        // Pega a data no formato YYYY-MM-DD
        const dataISO = dataDia.toLocaleDateString('sv-SE');
        
        // Verifica se este dia específico é feriado
        const feriadoDoDia = feriadosAno.find(f => f.date === dataISO);
        
        let horarioTexto = '';
        let tagHTML = '';
        let classeItem = 'mf-dia-item';

        if (feriadoDoDia) {
            // Se for feriado, aplica o estilo customizado
            const regra = HORARIOS_FERIADOS_CUSTOMIZADOS[feriadoDoDia.name] || HORARIO_FERIADO_PADRAO;
            if (regra.abertura === null) {
                horarioTexto = 'Fechado o dia todo';
                tagHTML = `<span class="mf-tag fechado">${feriadoDoDia.name}</span>`;
            } else {
                horarioTexto = `${String(regra.abertura).padStart(2, '0')}h — ${String(regra.fechamento).padStart(2, '0')}h`;
                tagHTML = `<span class="mf-tag feriado">${feriadoDoDia.name}</span>`;
            }
            classeItem += ' mf-dia-feriado'; // Pinta o item do modal
        } else {
            // Se for dia normal, pega do config normal
            const diaIndex = i + 1; // 1 a 5
            const regraNormal = HORARIOS[diaIndex];
            horarioTexto = `${String(regraNormal.abertura).padStart(2, '0')}h — ${String(regraNormal.fechamento).padStart(2, '0')}h`;
            tagHTML = `<span class="mf-tag normal">Normal</span>`;
        }

        listaHTML += `
            <div class="${classeItem}">
                <div class="mf-dia-info">
                    <strong>${nomesDias[i]}</strong>
                    <span>${dataDia.getDate().toString().padStart(2, '0')}/${(dataDia.getMonth() + 1).toString().padStart(2, '0')}</span>
                </div>
                <div class="mf-dia-horario">
                    <span><i class="fa-regular fa-clock"></i> ${horarioTexto}</span>
                    ${tagHTML}
                </div>
            </div>
        `;
    }

    overlay.innerHTML = `
        <div class="mf-modal-card">
            <div class="mf-modal-header">
                <h3><i class="fa-solid fa-calendar-week"></i> Horários da Semana</h3>
                <button class="mf-modal-fechar" id="btn-fechar-modal"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="mf-modal-body">
                ${listaHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Fecha ao clicar no X ou fora do modal
    document.getElementById('btn-fechar-modal').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

export async function iniciarCronometro() {
    await atualizarCronometroHorarios();
    setInterval(atualizarCronometroHorarios, 1000);

    // Adiciona o evento de clique no card "Segunda a Sexta"
    const cardSegundaSexta = document.querySelector('.card-horario[data-dia="1,2,3,4,5"]');
    if (cardSegundaSexta) {
        cardSegundaSexta.style.cursor = 'pointer';
        
        // Adiciona um ícone sutil de "clique" no card (opcional, mas ajuda o usuário)
        const titulo = cardSegundaSexta.querySelector('h3');
        if (titulo && !titulo.innerHTML.includes('fa-up-right-and-down-left')) {
            titulo.innerHTML += ' <i class="fa-solid fa-up-right-and-down-left-from-center" style="font-size: 0.8rem; opacity: 0.5; margin-left: 5px;"></i>';
        }

        cardSegundaSexta.addEventListener('click', abrirModalDiasSemana);
    }
}