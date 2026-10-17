// api/catalogo.js
const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    try {
        // Detecta o tipo: 'matricula', 'pre-matricula' ou 'preview'
        const tipo = ['matricula', 'pre-matricula', 'preview'].includes(req.query.tipo) 
            ? req.query.tipo 
            : 'pre-matricula';

        // Busca DIRETAMENTE a chave do tipo escolhido no Edge Config
        const respostaAPI = await get(tipo);

        if (!respostaAPI) {
            return res.status(404).json({ erro: `Catálogo '${tipo}' não encontrado` });
        }

        const catalogo = { respostaAPI };

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

        return res.status(200).json(catalogo);
    } catch (erro) {
        console.error('Erro ao ler Edge Config:', erro);
        return res.status(500).json({ erro: 'Erro ao carregar catálogo' });
    }
};