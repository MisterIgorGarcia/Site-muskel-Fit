import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

const normalizarTexto = (str) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { nome, celular } = req.body;

        if (!nome || nome.trim().length < 3) {
            return res.status(400).json({ erro: 'Nome inválido.' });
        }

        const nomeDigitado = nome.trim();

        // 1ª TENTATIVA: Busca exata pelo nome inteiro
        const { data: exato, error: errExato } = await supabase
            .from('alunos_matriculados')
            .select('nome')
            .ilike('nome', nomeDigitado)
            .limit(1);

        if (exato && exato.length > 0) {
            return res.status(200).json({ existe: true, nome_sugerido: exato[0].nome });
        }

        // 2ª TENTATIVA: Fallback por Telefone + Primeiro Nome
        if (celular) {
            const celularLimpo = celular.replace(/\D/g, '');
            
            // Como o banco salva formatado (ex: (12) 99999-9999), 
            // buscamos apenas os últimos 4 dígitos para não ter erro de formatação
            const sufixo = celularLimpo.slice(-4); 

            const { data: porTelefone, error: errTel } = await supabase
                .from('alunos_matriculados')
                .select('nome, celular')
                .ilike('celular', `%${sufixo}`);

            if (porTelefone && porTelefone.length > 0) {
                const primeiroNomeDigitado = normalizarTexto(nomeDigitado.split(' ')[0]);
                
                const match = porTelefone.find(reg => {
                    // Limpa a formatação do telefone do banco para comparar
                    const telBancoLimpo = (reg.celular || '').replace(/\D/g, '');
                    
                    // Verifica se o número é o mesmo (lida com DDD, formatações e o 9 extra)
                    const telMatches = telBancoLimpo.includes(celularLimpo) || celularLimpo.includes(telBancoLimpo);
                    
                    const primeiroNomeBanco = normalizarTexto(reg.nome.split(' ')[0]);
                    const nomeMatches = primeiroNomeBanco === primeiroNomeDigitado;

                    return telMatches && nomeMatches;
                });

                if (match) {
                    return res.status(200).json({ 
                        existe: true, 
                        nome_sugerido: match.nome,
                        match_aproximado: true
                    });
                }
            }
        }

        return res.status(200).json({ existe: false });

    } catch (erro) {
        console.error('Erro na checagem:', erro);
        return res.status(500).json({ erro: 'Erro interno' });
    }
}