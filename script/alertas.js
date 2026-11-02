/* /script/alertas.js — Sistema de alertas estilizados Muskel Fit */
(function () {
    'use strict';

    const ICONES = {
        sucesso: 'fa-solid fa-circle-check',
        erro:    'fa-solid fa-circle-xmark',
        aviso:   'fa-solid fa-triangle-exclamation',
        info:    'fa-solid fa-circle-info'
    };

    function criarEl(tag, classe, html) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (html !== undefined) el.innerHTML = html;
        return el;
    }

    function fechar(overlay, resolver, valor) {
        overlay.classList.add('mf-fechando');
        setTimeout(() => {
            overlay.remove();
            if (resolver) resolver(valor);
        }, 200);
    }

    function mostrar(tipo, titulo, mensagem, opcoes = {}) {
        return new Promise((resolve) => {
            const overlay = criarEl('div', 'mf-alerta-overlay');
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            const card = criarEl('div', `mf-alerta-card mf-tipo-${tipo}`);
            const icone = criarEl('div', 'mf-alerta-icone');
            icone.innerHTML = `<i class="${ICONES[tipo] || ICONES.info}"></i>`;
            const tituloEl = criarEl('div', 'mf-alerta-titulo');
            tituloEl.textContent = titulo || '';
            const msgEl = criarEl('div', 'mf-alerta-mensagem');
            msgEl.textContent = mensagem || '';

            const botoes = criarEl('div', 'mf-alerta-botoes');
            const btnConfirma = criarEl('button', 'mf-alerta-btn mf-alerta-btn-confirma');
            btnConfirma.textContent = opcoes.textoConfirma || 'OK';

            if (opcoes.confirmar) {
                const btnCancela = criarEl('button', 'mf-alerta-btn mf-alerta-btn-cancela');
                btnCancela.textContent = opcoes.textoCancela || 'Cancelar';
                btnCancela.onclick = () => {
                    fechar(overlay, resolve, false);
                    if (opcoes.onCancel) opcoes.onCancel();
                };
                botoes.appendChild(btnCancela);
            }

            btnConfirma.onclick = () => {
                fechar(overlay, resolve, true);
                if (opcoes.onConfirm) opcoes.onConfirm();
            };
            botoes.appendChild(btnConfirma);

            card.append(icone, tituloEl, msgEl, botoes);
            overlay.appendChild(card);
            document.body.appendChild(overlay);

            setTimeout(() => btnConfirma.focus(), 100);

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    fechar(overlay, resolve, opcoes.confirmar ? false : true);
                    if (opcoes.onCancel) opcoes.onCancel();
                }
            };
            document.addEventListener('keydown', escHandler);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && !opcoes.confirmar) {
                    fechar(overlay, resolve, true);
                }
            });
        });
    }

    window.Alerta = {
        sucesso:   (t, m, o) => mostrar('sucesso', t, m, o),
        erro:      (t, m, o) => mostrar('erro',    t, m, o),
        aviso:     (t, m, o) => mostrar('aviso',   t, m, o),
        info:      (t, m, o) => mostrar('info',    t, m, o),
        confirmar: (t, m, o = {}) => mostrar('aviso', t, m, { ...o, confirmar: true })
    };
})();