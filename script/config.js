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

// Horário PADRÃO para feriados (6h às 18h)
export const HORARIO_FERIADO_PADRAO = {
    abertura: 6,
    fechamento: 18
};

// =========================================================================
// ⚙️ PAINEL DE CONTROLE DE FERIADOS
// =========================================================================
// Coloque o nome EXATO do feriado (como vem da BrasilAPI) e defina os horários.
// Para deixar a academia FECHADA o dia todo, use: abertura: null
// Qualquer feriado que NÃO estiver aqui, usará o HORARIO_FERIADO_PADRAO acima.
export const HORARIOS_FERIADOS_CUSTOMIZADOS = {
    "Confraternização Universal": { abertura: null, fechamento: null }, // 1 de Jan (Fechado)
    "Carnaval": { abertura: 6, fechamento: 18 },                         
    "Sexta-feira Santa": { abertura: 6, fechamento: 18 },           
    "Tiradentes": { abertura: 6, fechamento: 18 },                       
    "Dia do Trabalhador": { abertura: 6, fechamento: 18 },               
    "Corpus Christi": { abertura: 6, fechamento: 18 },                   
    "Independência do Brasil": { abertura: 6, fechamento: 18 },          
    "Nossa Senhora Aparecida": { abertura: 6, fechamento: 18 },
    "Finados": { abertura: 6, fechamento: 18 },                          
    "Proclamação da República": { abertura: 6, fechamento: 18 },
    "Dia Nacional de Zumbi e da Consciência Negra": { abertura: 6, fechamento: 18 },
    "Natal": { abertura: 6, fechamento: 18 }                        
};