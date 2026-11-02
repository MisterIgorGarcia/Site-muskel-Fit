import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Função para remover acentos e deixar minúsculo
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
            // Pega os últimos 8 dígitos para buscar (ignora DDD e formatação)
            const sufixo = celularLimpo.slice(-8); 

            const { data: porTelefone, error: errTel } = await supabase
                .from('alunos_matriculados')
                .select('nome, celular')
                .ilike('celular', `%${sufixo}%`);

            if (porTelefone && porTelefone.length > 0) {
                const primeiroNomeDigitado = normalizarTexto(nomeDigitado.split(' ')[0]);
                
                // Acha o registro cujo primeiro nome bata (ignorando acentos)
                const match = porTelefone.find(reg => {
                    const primeiroNomeBanco = normalizarTexto(reg.nome.split(' ')[0]);
                    return primeiroNomeBanco === primeiroNomeDigitado;
                });

                if (match) {
                    return res.status(200).json({ 
                        existe: true, 
                        nome_sugerido: match.nome,
                        match_aproximado: true // Avisa o front que o nome não era idêntico
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