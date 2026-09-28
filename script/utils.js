export function formatarHora(h) {
    return String(h).padStart(2, '0') + ':00';
}

export function formatarCronometro(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}