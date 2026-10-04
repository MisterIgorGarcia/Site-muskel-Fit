/* ===================== CONFIGURAÇÃO ===================== */
// ⚠️ EDITE AQUI — troque pelos dados reais da academia
const CONFIG = {
    whatsapp:  '5512991859267',              // número da academia (com DDI+DDD)
    pixChave:  '12.345.678/0001-90',         // sua chave PIX (CNPJ, telefone, email ou aleatória)
    pixNome:   'MUSKEL FIT ACADEMIA',        // nome do beneficiário (sem acentos)
    pixCidade: 'CRUZEIRO',                   // cidade do beneficiário (sem acentos)
    // Link de pagamento do gateway (Mercado Pago, InfinitePay, etc.)
    // Deixe como está se ainda não tiver — o painel mostra mensagem alternativa
    linkCartao: 'https://mpago.la/SEU_LINK_AQUI'
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
 * Extrai o valor em reais de uma string tipo "Mensal — R$ 90,00"
 */
function extrairValor(plano) {
    const match = plano.match(/R\$\s*([\d.,]+)/);
    if (!match) return 0;
    return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
}

/* ===================== GERA PIX (EMV) ===================== */
// Gera o payload "copia e cola" do PIX seguindo o padrão EMV do Banco Central
function gerarPayloadPix(chave, nome, cidade, valor = 0, txid = '***') {
    const tlv = (id, valor) => {
        const len = String(valor.length).padStart(2, '0');
        return id + len + valor;
    };

    const gui = tlv('00', 'br.gov.bcb.pix');
    const chaveFmt = tlv('01', chave);
    const merchantAccount = tlv('26', gui + chaveFmt);

    const nomeFmt = nome
        .substring(0, 25)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const cidadeFmt = cidade
        .substring(0, 15)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    let payload =
        tlv('00', '01') +
        merchantAccount +
        tlv('52', '0000') +
        tlv('53', '986') +
        (valor > 0 ? tlv('54', valor.toFixed(2)) : '') +
        tlv('58', 'BR') +
        tlv('59', nomeFmt) +
        tlv('60', cidadeFmt) +
        tlv('62', tlv('05', txid));

    // CRC16-CCITT
    payload += '6304';
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

/* ===================== PAINEL DE PAGAMENTO ===================== */
function mostrarPainelPagamento(dados) {
    const painel = document.getElementById('painel-pagamento');
    if (!painel) return;

    painel.hidden = false;
    painel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (dados.pagamento === 'PIX') {
        const valor = extrairValor(dados.plano);
        const payload = gerarPayloadPix(
            CONFIG.pixChave,
            CONFIG.pixNome,
            CONFIG.pixCidade,
            valor
        );

        painel.innerHTML = `
            <h3><i class="fa-brands fa-pix"></i> Pagamento via PIX</h3>
            <p>Escaneie o QR Code ou copie o código abaixo:</p>
            <div id="qrcode-pix" class="qrcode-pix"></div>
            <div class="pix-copia-cola">
                <input type="text" readonly value="${payload}" id="pix-input">
                <button type="button" class="btn-amarelo" onclick="copiarPix()">
                    <i class="fa-solid fa-copy"></i> Copiar
                </button>
            </div>
            <p class="aviso-pix">
                Após o pagamento, envie o comprovante no WhatsApp.
            </p>
        `;

        // Renderiza o QR Code (API pública — sem instalar nada)
        const qr = document.getElementById('qrcode-pix');
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
        img.alt = 'QR Code PIX';
        qr.appendChild(img);

    } else if (!CONFIG.linkCartao || CONFIG.linkCartao.includes('SEU_LINK')) {
        // Ainda não configurou o link do gateway
        painel.innerHTML = `
            <h3><i class="fa-solid fa-credit-card"></i> Pagamento com cartão</h3>
            <p>Nossa equipe enviará o link de pagamento pelo WhatsApp.</p>
        `;

    } else {
        // Débito ou Crédito com link configurado
        painel.innerHTML = `
            <h3><i class="fa-solid fa-credit-card"></i> Pagamento com ${dados.pagamento}</h3>
            <p>Clique no botão abaixo para ir para o checkout seguro:</p>
            <a href="${CONFIG.linkCartao}" target="_blank" rel="noopener" class="btn-amarelo">
                <i class="fa-solid fa-lock"></i> Ir para o pagamento
            </a>
            <p class="aviso-pix">
                Após o pagamento, envie o comprovante no WhatsApp.
            </p>
        `;
    }
}

/* ===================== COPIAR PIX ===================== */
// Exposto no window porque é chamado via onclick no HTML gerado
window.copiarPix = async function () {
    const input = document.getElementById('pix-input');
    if (!input) return;

    try {
        // API moderna (funciona em HTTPS — Vercel serve em HTTPS ✅)
        await navigator.clipboard.writeText(input.value);
        alert('Código PIX copiado! Cole no app do seu banco.');
    } catch {
        // Fallback pra navegadores antigos ou contexto não-seguro (file://)
        input.select();
        document.execCommand('copy');
        alert('Código PIX copiado!');
    }
};

/* ===================== PRÉ-SELEÇÃO VIA URL ===================== */
/**
 * Procura uma opção no <select> que contenha o texto da URL e a seleciona.
 * Útil para links tipo: prematricula.html?plano=Mensal&modalidade=Crossfit
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

/* ===================== INICIALIZAÇÃO ===================== */
// Só roda o resto se o formulário existir na página (guard clause)
const form = document.getElementById('form-matricula');

if (form) {

    /* Máscara automática nos campos de telefone */
    ['telefone', 'celular'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', e => {
            e.target.value = formatarTelefone(e.target.value);
        });
    });

    /* Pré-seleção via URL (?plano=...&modalidade=...&unidade=...) */
    const params = new URLSearchParams(window.location.search);
    preSelecionarPorURL('plano',      params.get('plano'));
    preSelecionarPorURL('modalidade', params.get('modalidade'));
    preSelecionarPorURL('unidade',    params.get('unidade'));

    /* Submit do formulário */
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

        // -------- Validação --------
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

        // -------- Formata data como DD/MM/AAAA --------
        const [a, m, d] = dados.nascimento.split('-');
        const dataFmt = `${d}/${m}/${a}`;

        // -------- Monta mensagem pro WhatsApp --------
        const msg =
            `*PRÉ-MATRÍCULA — Muskel Fit*\n\n` +
            `*Nome:* ${dados.nome}\n` +
            `*Nascimento:* ${dataFmt}\n` +
            `*Telefone:* ${dados.telefone}\n` +
            `*Celular:* ${dados.celular}\n` +
            `*Plano:* ${dados.plano}\n` +
            `*Modalidade:* ${dados.modalidade}\n` +
            `*Unidade:* ${dados.unidade}\n` +
            `*Pagamento:* ${dados.pagamento}\n\n` +
            `Aguardo contato para confirmar!`;

        // -------- Abre WhatsApp --------
        window.open(
            `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
            '_blank'
        );

        // -------- Mostra painel de pagamento --------
        mostrarPainelPagamento(dados);
    });
}