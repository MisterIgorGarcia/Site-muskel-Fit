//ESTE ARQUIVO CONTROLA AS CONFIGURAÇÕES GERAIS DE TODO O SITE

// Horários em formato 24h (0–23)
// pausa é opcional: pausa: { inicio: valor, fim:valor }
export const HORARIOS = {
    0: { abertura: 8,  fechamento: 13 },                                 // Domingo
    1: { abertura: 5,  fechamento: 22 },                                 // Segunda
    2: { abertura: 5,  fechamento: 22 },                                 // Terça
    3: { abertura: 5,  fechamento: 22 },                                 // Quarta
    4: { abertura: 5,  fechamento: 22 },                                 // Quinta
    5: { abertura: 5,  fechamento: 22 },                                 // Sexta
    6: { abertura: 6,  fechamento: 18, pausa: { inicio: 12, fim: 14 } }  // Sábado COM pausa
};

//Constante contendo os nomes dos dias da semana
export const NOMES_DIAS = [
    'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado'
];

// Cards e Horários usados apenas pela BADGE (independentes do cronômetro)
export const HORARIOS_BADGE = {
    semana: { abre: 5, fecha: 22 },       // Seg–Sex
    sabado: { manha: [6, 12], tarde: [14, 18] },
    domingo: { abre: 8, fecha: 12 }
};