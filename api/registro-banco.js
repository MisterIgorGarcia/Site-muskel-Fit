// api/registro-banco.js
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
        // Recebe os dados do frontend (os nomes batem com as colunas do Supabase)
        const { nome, data_nascimento, celular, unidade, modalidade, plano, preco, pagamento, tipo } = req.body;

        // Define a tabela correta baseada no tipo
        const tabelaDestino = tipo === 'pre-matricula' ? 'prematriculas' : 'matriculas';

        // Insere no banco de dados na tabela correta
        const { data, error } = await supabase
            .from(tabelaDestino) // ⬅️ Agora usa a variável em vez do nome fixo
            .insert([
                {
                    nome,
                    data_nascimento,
                    celular,
                    unidade,
                    modalidade,
                    plano,
                    preco,
                    pagamento,
                    tipo
                }
            ]);

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