/* ===================== CONFIGURAÇÃO ===================== */
// ⚠️ EDITE AQUI — troque pelos dados reais da academia
const CONFIG = {
    whatsapp: '5512991859267',    // número da academia (com DDI+DDD)

    // ---- Links do Mercado Pago (um por forma de pagamento) ----
    // Ao criar cada link, configure a URL de retorno no painel do MP como:
    //   https://SEU_DOMINIO/pre-matricula/prematricula.html?status=success
    linkPix:     'https://mpago.li/2ciJmzR',             // ✅ já tem
    linkDebito:  'https://mpago.li/SEU_LINK_DEBITO',     // ⬅️ criar no MP
    linkCredito: 'https://mpago.li/SEU_LINK_CREDITO'     // ⬅️ criar no MP
};

/* ===================== HELPERS ===================== */

/**
 * Formata um número digitado para o padrão brasileiro (12) 99999-9999
 */
function formatarTelefone(valor) {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 10) {
        return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

/**
 * Valida a data de nascimento. Retorna mensagem de erro ou null se OK.
 */
function validarNascimento(dataStr) {
    if (!dataStr) return 'Informe sua data de nascimento.';

    const data = new Date(dataStr);
    if (isNaN(data)) return 'Data inválida.';

    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const m = hoje.getMonth() - data.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < data.getDate())) idade--;

    if (idade < 12)  return 'É necessário ter pelo menos 12 anos.';
    if (idade > 120) return 'Data de nascimento inválida.';
    return null;
}

/**
 * Procura uma opção no <select> que contenha o texto da URL e a seleciona.
 */
function preSelecionarPorURL(selectId, valorURL) {
    if (!valorURL) return;
    const select = document.getElementById(selectId);
    if (!select) return;

    [...select.options].forEach(opt => {
        if (opt.textContent.toLowerCase().includes(valorURL.toLowerCase())) {
            opt.selected = true;
        }
    });
}

/* ===================== REDIRECIONAMENTO PRO PAGAMENTO ===================== */
function redirecionarParaPagamento(dados) {
    // Mapeia forma de pagamento → link do MP
    const links = {
        'PIX':     CONFIG.linkPix,
        'Débito':  CONFIG.linkDebito,
        'Crédito': CONFIG.linkCredito
    };

    const link = links[dados.pagamento];

    // Se o link ainda não foi configurado, avisa
    if (!link || link.includes('SEU_LINK')) {
        alert('O pagamento via ' + dados.pagamento +
              ' ainda não está disponível. Fale com a academia pelo WhatsApp.');
        return;
    }

    // Salva os dados do formulário para recuperar após o retorno do MP
    localStorage.setItem('dadosMatricula', JSON.stringify(dados));

    // Redireciona o usuário para o link do Mercado Pago
    window.location.href = link;
}

/* ===================== INICIALIZAÇÃO ===================== */
const form = document.getElementById('form-matricula');

if (form) {

    // Máscara nos telefones
    ['telefone', 'celular'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => {
            e.target.value = formatarTelefone(e.target.value);
        });
    });

    // Pré-seleção via URL (?plano=...&modalidade=...&unidade=...)
    const params = new URLSearchParams(window.location.search);
    preSelecionarPorURL('plano',      params.get('plano'));
    preSelecionarPorURL('modalidade', params.get('modalidade'));
    preSelecionarPorURL('unidade',    params.get('unidade'));

    // Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fd = new FormData(e.target);
        const dados = {
            nome:       (fd.get('nome') || '').trim(),
            nascimento: fd.get('nascimento'),
            telefone:   (fd.get('telefone') || '').trim() || '—',
            celular:    (fd.get('celular') || '').trim(),
            plano:      fd.get('plano'),
            modalidade: fd.get('modalidade'),
            unidade:    fd.get('unidade'),
            pagamento:  fd.get('pagamento')
        };

        // -------- Validações --------
        const erroNasc = validarNascimento(dados.nascimento);
        if (erroNasc) { alert(erroNasc); return; }

        if (!dados.nome || !dados.celular || !dados.plano || !dados.pagamento) {
            alert('Preencha todos os campos obrigatórios (*).');
            return;
        }

        if (!dados.modalidade || !dados.unidade) {
            alert('Selecione a modalidade e a unidade.');
            return;
        }

        if (dados.celular.replace(/\D/g, '').length < 10) {
            alert('Celular inválido. Use o formato (12) 99999-9999.');
            return;
        }

        // -------- Redireciona pro Mercado Pago --------
        redirecionarParaPagamento(dados);
    });
}

/* ===================== RETORNO DO MERCADO PAGO ===================== */
// Roda quando a página carrega. Se a URL tiver ?status=success,
// significa que o cliente voltou do Mercado Pago após pagar.
const urlParams = new URLSearchParams(window.location.search);
const statusPagamento = urlParams.get('status');

if (statusPagamento === 'success') {

    const formEl = document.getElementById('form-matricula');
    const painelConfirmacao = document.getElementById('painel-confirmacao');
    const btnWhats = document.getElementById('btn-enviar-whatsapp');

    if (!formEl || !painelConfirmacao || !btnWhats) {
        console.warn('Elementos do retorno não encontrados.');
    } else {
        // Recupera os dados salvos antes do redirecionamento
        const dadosSalvosRaw = localStorage.getItem('dadosMatricula');

        if (!dadosSalvosRaw) {
            // Usuário caiu aqui sem ter preenchido o form (ex: link direto)
            painelConfirmacao.hidden = false;
            painelConfirmacao.querySelector('h3').innerHTML =
                '<i class="fa-solid fa-triangle-exclamation"></i> Dados não encontrados';
            painelConfirmacao.querySelector('p').textContent =
                'Não conseguimos recuperar seus dados. Preencha o formulário novamente.';
            btnWhats.style.display = 'none';
        } else {
            const dados = JSON.parse(dadosSalvosRaw);

            // Esconde o formulário
            formEl.style.display = 'none';

            // Monta a mensagem pro WhatsApp
            const [a, m, d] = dados.nascimento.split('-');
            const dataFmt = `${d}/${m}/${a}`;

            const msg =
                `*PRÉ-MATRÍCULA — Muskel Fit*\n\n` +
                `*Nome:* ${dados.nome}\n` +
                `*Nascimento:* ${dataFmt}\n` +
                `*Telefone:* ${dados.telefone}\n` +
                `*Celular:* ${dados.celular}\n` +
                `*Plano:* ${dados.plano}\n` +
                `*Modalidade:* ${dados.modalidade}\n` +
                `*Unidade:* ${dados.unidade}\n` +
                `*Pagamento:* ${dados.pagamento}\n` +
                `*Status:* ✅ Pagamento aprovado\n\n` +
                `Aguardo contato para confirmar a matrícula!`;

            // Mostra o painel de confirmação
            painelConfirmacao.hidden = false;
            painelConfirmacao.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Configura o botão do WhatsApp
            btnWhats.addEventListener('click', () => {
                window.open(
                    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
                    '_blank'
                );
            });

            // Limpa o localStorage (já foi usado)
            localStorage.removeItem('dadosMatricula');
        }
    }
}