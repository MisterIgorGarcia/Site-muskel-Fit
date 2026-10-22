// api/adminloginapi.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

    try {
        const { usuario, senha } = req.body;

        // LOG DE DEBUG: Vai aparecer no painel da Vercel
        console.log("Tentando logar com:", usuario, "| Senha:", senha);

        // Busca o usuário ignorando maiúsculas/minúsculas
        const { data: userEncontrado, error } = await supabase
            .from('contas_salvas')
            .select('*')
            .ilike('usuario', usuario) // ilike em vez de eq
            .eq('senha', senha)
            .single();

        if (error || !userEncontrado) {
            console.log("Erro na busca ou usuário não encontrado:", error);
            return res.status(401).json({ sucesso: false, erro: 'Usuário ou senha inválidos' });
        }

        return res.status(200).json({ sucesso: true, cargo: userEncontrado.cargo });

    } catch (erro) {
        console.error('Erro no servidor:', erro);
        return res.status(500).json({ erro: 'Erro interno no servidor' });
    }
}