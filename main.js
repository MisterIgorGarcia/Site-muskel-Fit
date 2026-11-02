//ESSE ARQUIVO É A MAIN DO SITE, ELE INICIA TODOS OS MODULOS DE JAVASCRIPT DENTRO DA PASTA SCRIPT

import { iniciarBadge } from './script/badge.js';
import { iniciarMenu } from './script/menu.js';
import { iniciarCronometro } from './script/cronometro.js';
import { iniciarOcultarAvaliacao } from './script/ocultar-avaliacao.js'; 
import './script/externos.js';

async function init() {
    // Inicializa os módulos que são síncronos (rápidos)
    iniciarBadge();
    iniciarMenu();
    iniciarOcultarAvaliacao();

    // O cronômetro agora precisa de await, pois busca os feriados na API
    try {
        await iniciarCronometro();
    } catch (erro) {
        console.error("Erro ao iniciar o cronômetro:", erro);
    }
}

if (document.readyState === 'loading') { 
    document.addEventListener('DOMContentLoaded', init);
} else { 
    init(); 
}