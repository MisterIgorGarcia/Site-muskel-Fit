// api/catalogo.js
const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    try {
        // Detecta o tipo, aceitando 'preview' também
        const tipo = ['matricula', 'pre-matricula', 'preview'].includes(req.query.tipo) 
            ? req.query.tipo 
            : 'pre-matricula';

        // Busca a chave ÚNICA 'catalogo' no Edge Config
        const catalogoCompleto = await get('catalogo');

        if (!catalogoCompleto) {
            return res.status(404).json({ erro: 'Catálogo principal não encontrado' });
        }

        // Separa a fatia que o frontend pediu
        const respostaAPI = catalogoCompleto[tipo];

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