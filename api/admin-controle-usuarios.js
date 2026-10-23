// api/admin-controle-usuarios.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    try {
        // ================= LISTAR (READ) =================
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('contas_salvas')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            return res.status(200).json(data);
        }

        // ================= CRIAR (CREATE) =================
        if (req.method === 'POST') {
            const { usuario, senha, cargo, unidade } = req.body; 

            if (!usuario || !senha) {
                return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
            }

            const { data, error } = await supabase
                .from('contas_salvas')
                .insert([{ usuario, senha, cargo: cargo || 'funcionario' }])
                .select();

            if (error) {
                if (error.code === '23505') throw new Error('Este nome de usuário já existe.');
                throw error;
            }
            return res.status(201).json({ sucesso: true, dados: data[0] });
        }

        // ================= ATUALIZAR (UPDATE) =================
        if (req.method === 'PUT') {
            const { id, usuario, senha } = req.body;
            
            if (!id) return res.status(400).json({ erro: 'ID é obrigatório' });
            
            // Monta o objeto apenas com o que foi enviado para atualizar
            const updates = {};
            if (usuario) updates.usuario = usuario;
            if (senha) updates.senha = senha;

            const { data, error } = await supabase
                .from('contas_salvas')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) {
                if (error.code === '23505') throw new Error('Este nome de usuário já está em uso.');
                throw error;
            }
            return res.status(200).json({ sucesso: true, dados: data[0] });
        }

        // ================= DELETAR (DELETE) =================
        if (req.method === 'DELETE') {
            const { id } = req.body;
            
            if (id === 1) {
                return res.status(403).json({ erro: 'Não é possível excluir o administrador principal.' });
            }

            const { error } = await supabase
                .from('contas_salvas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return res.status(200).json({ sucesso: true, mensagem: 'Usuário removido!' });
        }

        return res.status(405).json({ erro: 'Método não permitido' });

    } catch (erro) {
        console.error('Erro na API de usuários:', erro);
        return res.status(500).json({ erro: erro.message || 'Erro interno no servidor' });
    }
}