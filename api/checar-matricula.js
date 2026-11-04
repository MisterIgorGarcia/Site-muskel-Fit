// api/checar-matricula.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { nome, celular } = req.body;
    if (!nome) {
        return res.status(400).json({ erro: 'O nome é obrigatório.' });
    }

    try {
        const nomeLimpo = nome.trim();

        // =========================================================
        // 1ª REGRA: BUSCA EXATA (Case-Insensitive com ilike)
        // Isso faz "joao silva", "JOAO SILVA" e "Joao Silva" 
        // encontrarem o registro "João Silva" no banco.
        // =========================================================
        let query = supabase.from('alunos_matriculados').select('nome, celular').ilike('nome', nomeLimpo);
        
        // Se o usuário digitou o celular, usamos ele para refinar a busca e evitar homônimos
        if (celular) {
            // O seu banco formata o celular com trigger, então comparamos exatamente como chega.
            query = query.eq('celular', celular.trim());
        }

        const { data: matchExato, error: erroExato } = await query;

        if (matchExato && matchExato.length > 0) {
            // Se achou o nome exato (mesmo que com maiúsculas diferentes), libera o pagamento.
            return res.status(200).json({
                existe: true,
                match_aproximado: false,
                nome_sugerido: matchExato[0].nome // Devolve o nome formatado bonitinho
            });
        }

        // =========================================================
        // 2ª REGRA: BUSCA APROXIMADA (A Mágica de Correção)
        // Se não achou o nome exato, tenta achar pelo primeiro nome + final do celular.
        // =========================================================
        if (celular) {
            const numsCelular = celular.replace(/\D/g, '');
            const finalCelular = numsCelular.slice(-4); // Pega os últimos 4 dígitos
            const primeiroNome = nomeLimpo.split(' ')[0];

            // Só tenta a mágica se o primeiro nome for válido e tivermos o final do tel
            if (primeiroNome.length >= 3 && finalCelular.length === 4) {
                
                // Busca qualquer um que comece com aquele primeiro nome (ignorando maiúsculas)
                const { data: matchAprox } = await supabase
                    .from('alunos_matriculados')
                    .select('nome, celular')
                    .ilike('nome', `${primeiroNome}%`);

                if (matchAprox && matchAprox.length > 0) {
                    // Encontra qual desses tem o final do celular igual
                    const encontrado = matchAprox.find(a => 
                        a.celular.replace(/\D/g, '').endsWith(finalCelular)
                    );
                    
                    if (encontrado) {
                        return res.status(200).json({
                            existe: true,
                            match_aproximado: true, // Avisa o front que o nome não bateu 100%
                            nome_sugerido: encontrado.nome // Dá a dica do nome correto
                        });
                    }
                }
            }
        }

        // Se passou por tudo e não achou nada
        return res.status(200).json({ existe: false });

    } catch (error) {
        console.error('Erro interno na checagem:', error);
        return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
}