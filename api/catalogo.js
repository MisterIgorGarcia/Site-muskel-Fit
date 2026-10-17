// api/catalogo.js
const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    try {
        // Detecta o tipo (pre-matricula, matricula ou preview)
        const tipo = ['matricula', 'pre-matricula', 'preview'].includes(req.query.tipo) 
            ? req.query.tipo 
            : 'pre-matricula';

        // Tenta buscar a chave direta (como a Vercel autocriou)
        let respostaAPI = await get(tipo);

        // Se não achar a chave direta, tenta buscar dentro de uma chave única 'catalogo'
        if (!respostaAPI) {
            const catalogoCompleto = await get('catalogo');
            if (catalogoCompleto && catalogoCompleto[tipo]) {
                respostaAPI = catalogoCompleto[tipo];
            }
        }

        if (!respostaAPI) {
            return res.status(404).json({ erro: `Catálogo '${tipo}' não encontrado` });
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

        return res.status(200).json({ respostaAPI });
    } catch (erro) {
        console.error('Erro ao ler Edge Config:', erro);
        return res.status(500).json({ erro: 'Erro ao carregar catálogo' });
    }
};