//ESSE ARQUIVO É A MAIN DO SITE, ELE INICIA TODOS OS MODULOS DE JAVASCRIPT DENTRO DA PASTA SCRIPT

import { iniciarBadge } from './script/badge.js';
import { iniciarMenu } from './script/menu.js';
import { iniciarCronometro } from './script/cronometro.js';

function init() {
    iniciarBadge();
    iniciarMenu();
    iniciarCronometro();
}

if (document.readyState === 'loading') { //if para impedir que o JS rode antes do HTML carregar
    document.addEventListener('DOMContentLoaded', init);
} else { //caso documento readyState seja 'complete' ou 'interactive'
    init(); //inicializa o javascript
}