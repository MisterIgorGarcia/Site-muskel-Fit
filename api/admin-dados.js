// api/admin-dados.js
import { createClient } from '@supabase/supabase-js';
import { get } from '@vercel/edge-config';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
    try {
        // ================= LISTAR (READ) =================
        if (req.method === 'GET') {
            const { tipo, unidade, page = 1, limit = 10, all, incompletos } = req.query;

            if (!tipo) {
                return res.status(400).json({ erro: 'Parâmetro "tipo" é obrigatório.' });
            }

            let tabela = 'prematriculas';
            if (tipo === 'matricula') tabela = 'matriculas';
            else if (tipo === 'aluno') tabela = 'alunos_matriculados';
            
            // Inicia a query pedindo a contagem exata de registros
            let query = supabase
                .from(tabela)
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            // Filtro de Unidade
            if (unidade && unidade.trim() !== '') {
                try {
                    const [catalogoMatricula, catalogoPreMatricula] = await Promise.all([
                        get('matricula'), get('pre-matricula')
                    ]);
                    const unidadesMatricula = Object.keys(catalogoMatricula || {});
                    const unidadesPreMatricula = Object.keys(catalogoPreMatricula || {});
                    const todasAsUnidadesValidas = [...new Set([...unidadesMatricula, ...unidadesPreMatricula])];

                    if (!todasAsUnidadesValidas.includes(unidade)) {
                        return res.status(403).json({ erro: 'Acesso negado: Unidade inválida.' });
                    }
                } catch (edgeError) {
                    console.error('Erro Edge Config:', edgeError);
                }
                query = query.eq('unidade', unidade);
            }

            // Filtro de Dados Incompletos (para a tabela de alunos)
            if (tipo === 'aluno' && incompletos === 'true') {
                query = query.or('cep.is.null,data_nascimento.is.null');
            }

            // Se 'all' for true, não aplica paginação
            if (all !== 'true') {
                // CORREÇÃO AQUI: Força page e limit a serem números inteiros
                const pageNum = parseInt(page, 10) || 1;
                const limitNum = parseInt(limit, 10) || 10;
                
                const from = (pageNum - 1) * limitNum;
                const to = from + limitNum - 1;
                query = query.range(from, to);
            }

            const { data, count, error } = await query;
            if (error) throw error;

            return res.status(200).json({
                dados: data || [],
                total: count || 0
            });
        }

        // ================= CRIAR (CREATE) =================
        if (req.method === 'POST') {
            const { tipo, ...dadosAluno } = req.body;
            let tabela = 'prematriculas';
            if (tipo === 'matricula') tabela = 'matriculas';
            else if (tipo === 'aluno') tabela = 'alunos_matriculados';

            if (!dadosAluno.nome || !dadosAluno.celular) {
                return res.status(400).json({ erro: 'Nome e celular são obrigatórios.' });
            }

            const { data, error } = await supabase.from(tabela).insert([dadosAluno]).select();
            if (error) throw error;
            return res.status(201).json({ sucesso: true, dados: data[0] });
        }

        // ================= ATUALIZAR (UPDATE) =================
        if (req.method === 'PUT') {
            const { tipo, id, ...dadosAtualizados } = req.body;
            if (!id) return res.status(400).json({ erro: 'O ID é obrigatório para atualizar.' });
            
            let tabela = 'prematriculas';
            if (tipo === 'matricula') tabela = 'matriculas';
            else if (tipo === 'aluno') tabela = 'alunos_matriculados';

            const { data, error } = await supabase.from(tabela).update(dadosAtualizados).eq('id', id).select();
            if (error) throw error;
            return res.status(200).json({ sucesso: true, dados: data[0] });
        }

        // ================= DELETAR (DELETE) =================
        if (req.method === 'DELETE') {
            const { id, tipo } = req.body;
            let tabela = 'prematriculas';
            if (tipo === 'matricula') tabela = 'matriculas';
            else if (tipo === 'aluno') tabela = 'alunos_matriculados';

            if (!id) return res.status(400).json({ erro: 'ID não fornecido.' });

            const { error } = await supabase.from(tabela).delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ sucesso: true });
        }

        return res.status(405).json({ erro: 'Método não permitido' });

    } catch (erro) {
        console.error('Erro interno na API admin-dados:', erro);
        return res.status(500).json({ erro: erro.message || 'Erro interno no servidor' });
    }
}