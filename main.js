import { iniciarBadge } from './script/badge.js';
import { iniciarMenu } from './script/menu.js';
import { iniciarCronometro } from './script/cronometro.js';

function init() {
    iniciarBadge();
    iniciarMenu();
    iniciarCronometro();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}