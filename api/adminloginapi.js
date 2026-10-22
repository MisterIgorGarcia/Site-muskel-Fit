// api/login.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    try {
        const { usuario, senha } = req.body;

        // Procura o usuário no banco de dados
        const { data: userEncontrado, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuario)
            .eq('senha', senha)
            .single();

        // Se deu erro ou não achou ninguém, login negado
        if (error || !userEncontrado) {
            return res.status(401).json({ sucesso: false, erro: 'Usuário ou senha inválidos' });
        }

        // Se achou, retorna o sucesso e o cargo que está no banco
        return res.status(200).json({ 
            sucesso: true, 
            cargo: userEncontrado.cargo 
        });

    } catch (erro) {
        console.error('Erro no servidor de login:', erro);
        return res.status(500).json({ erro: 'Erro interno no servidor' });
    }
}