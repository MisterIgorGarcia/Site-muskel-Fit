// api/admin-dados.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    try {
        // ================= LISTAR (READ) =================
        if (req.method === 'GET') {
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

            return res.status(200).json({
                matriculas: matriculas || [],
                prematriculas: prematriculas || []
            });
        }

        // ================= CRIAR (CREATE) =================
        if (req.method === 'POST') {
            const { tipo, ...dadosAluno } = req.body;

            // Define em qual tabela vai salvar (matriculas ou prematriculas)
            const tabela = tipo === 'matricula' ? 'matriculas' : 'prematriculas';

            if (!dadosAluno.nome || !dadosAluno.celular) {
                return res.status(400).json({ erro: 'Nome e celular são obrigatórios.' });
            }

            const { data, error } = await supabase
                .from(tabela)
                .insert([dadosAluno])
                .select();

            if (error) throw error;
            return res.status(201).json({ sucesso: true, dados: data[0] });
        }

        // ================= ATUALIZAR (UPDATE) =================
        if (req.method === 'PUT') {
            const { tipo, id, ...dadosAtualizados } = req.body;

            if (!id) return res.status(400).json({ erro: 'O ID é obrigatório para atualizar.' });
            
            const tabela = tipo === 'matricula' ? 'matriculas' : 'prematriculas';

            const { data, error } = await supabase
                .from(tabela)
                .update(dadosAtualizados)
                .eq('id', id)
                .select();

            if (error) throw error;
            return res.status(200).json({ sucesso: true, dados: data[0] });
        }

        // ================= DELETAR (DELETE) =================
        if (req.method === 'DELETE') {
            const { id, tipo } = req.body;
            const tabela = tipo === 'matricula' ? 'matriculas' : 'prematriculas';

            if (!id) return res.status(400).json({ erro: 'ID não fornecido.' });

            const { error } = await supabase
                .from(tabela)
                .delete()
                .eq('id', id);

            if (error) throw error;
            return res.status(200).json({ sucesso: true });
        }

        // Se tentar usar um método não mapeado (ex: PATCH)
        return res.status(405).json({ erro: 'Método não permitido' });

    } catch (erro) {
        console.error('Erro interno na API admin-dados:', erro);
        return res.status(500).json({ erro: erro.message || 'Erro interno no servidor' });
    }
}