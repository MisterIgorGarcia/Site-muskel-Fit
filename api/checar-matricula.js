// api/checar-matricula.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { nome } = req.body;

        if (!nome || nome.trim().length < 3) {
            return res.status(400).json({ erro: 'Nome inválido ou muito curto.' });
        }

        // Busca o aluno ignorando maiúsculas/minúsculas
        const { data, error } = await supabase
            .from('alunos_matriculados')
            .select('id')
            .ilike('nome', nome.trim()) 
            .limit(1);

        if (error) {
            console.error('Erro no Supabase (checar-matricula):', error);
            return res.status(500).json({ erro: 'Erro interno ao verificar cadastro.' });
        }

        // Se o array vier com algum item, o aluno existe
        if (data && data.length > 0) {
            return res.status(200).json({ existe: true });
        } else {
            return res.status(200).json({ existe: false });
        }

    } catch (erro) {
        console.error('Erro inesperado na checagem:', erro);
        return res.status(500).json({ erro: 'Erro interno no servidor' });
    }
}