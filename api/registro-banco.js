// api/registro-banco.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY // Use a chave secreta para ignorar o RLS
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    try {
        const { nome, data_nascimento, celular, unidade, modalidade, plano, preco, pagamento, tipo } = req.body;

        const tabelaDestino = tipo === 'pre-matricula' ? 'prematriculas' : 'matriculas';

        // Usa 'upsert' para atualizar se já existir, evitando o erro 23505 (duplicata)
        const { data, error } = await supabase
            .from(tabelaDestino)
            .upsert({
                nome,
                data_nascimento,
                celular,
                unidade,
                modalidade,
                plano,
                preco,
                pagamento,
                tipo
            }, {
                onConflict: 'nome,celular' // Avisa o Supabase para usar o índice único que criamos
            });

        if (error) {
            console.error('Erro no Supabase:', error);
            throw error;
        }

        return res.status(200).json({ sucesso: true, mensagem: 'Registro salvo com sucesso!' });
    } catch (erro) {
        console.error('Erro interno:', erro);
        return res.status(500).json({ erro: 'Erro interno ao salvar os dados' });
    }
}