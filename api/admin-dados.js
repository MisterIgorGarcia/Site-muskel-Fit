// api/admin-dados.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    try {
        // Busca as matrículas
        const { data: matriculas, error: err1 } = await supabase
            .from('matriculas')
            .select('*')
            .order('created_at', { ascending: false });

        // Busca as pré-matrículas
        const { data: prematriculas, error: err2 } = await supabase
            .from('prematriculas')
            .select('*')
            .order('created_at', { ascending: false });

        if (err1) console.error('Erro ao buscar matrículas:', err1);
        if (err2) console.error('Erro ao buscar pré-matrículas:', err2);

        // Retorna os dois arrays para o front-end
        return res.status(200).json({
            matriculas: matriculas || [],
            prematriculas: prematriculas || []
        });

    } catch (erro) {
        console.error('Erro interno:', erro);
        return res.status(500).json({ erro: 'Erro interno ao buscar dados' });
    }
}