// api/admin-controle-usuarios.js
import { createClient } from '@supabase/supabase-js';
import { get } from '@vercel/edge-config';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Função auxiliar corrigida
async function validarUnidadeNoCatalogo(unidade) {
    if (!unidade || unidade.trim() === '') return true;
    
    try {
        // BUSCA CORRETA BASEADA NA SUA API CATALOGO
        const [catalogoMatricula, catalogoPreMatricula] = await Promise.all([
            get('matricula'),
            get('pre-matricula')
        ]);

        const unidadesMatricula = Object.keys(catalogoMatricula || {});
        const unidadesPreMatricula = Object.keys(catalogoPreMatricula || {});
        const todasAsUnidades = [...new Set([...unidadesMatricula, ...unidadesPreMatricula])];

        return todasAsUnidades.includes(unidade.trim());
    } catch (error) {
        console.error("Erro ao ler Edge Config:", error);
        return true; 
    }
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('contas_salvas')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { usuario, senha, cargo, unidade } = req.body; 

            if (!usuario || !senha) {
                return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
            }

            const unidadeValida = await validarUnidadeNoCatalogo(unidade);
            if (!unidadeValida) {
                return res.status(400).json({ erro: 'Unidade não encontrada no catálogo da academia.' });
            }

            const { data, error } = await supabase
                .from('contas_salvas')
                .insert([{ usuario, senha, cargo: cargo || 'funcionario', unidade }])
                .select();

            if (error) {
                if (error.code === '23505') throw new Error('Este nome de usuário já existe.');
                throw error;
            }
            return res.status(201).json({ sucesso: true, dados: data[0] });
        }

        if (req.method === 'PUT') {
            const { id, usuario, senha, unidade } = req.body;
            
            if (!id) return res.status(400).json({ erro: 'ID é obrigatório' });
            
            if (unidade !== undefined) {
                const unidadeValida = await validarUnidadeNoCatalogo(unidade);
                if (!unidadeValida) {
                    return res.status(400).json({ erro: 'Unidade não encontrada no catálogo da academia.' });
                }
            }

            const updates = {};
            if (usuario) updates.usuario = usuario;
            if (senha) updates.senha = senha;
            if (unidade !== undefined) updates.unidade = unidade;

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