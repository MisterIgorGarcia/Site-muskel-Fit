// api/catalogo.js
const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    try {
        // ← NOVO: detecta o tipo (pre-matricula ou matricula)
        const tipo = req.query.tipo === 'matricula' ? 'matricula' : 'pre-matricula';

        // ← NOVO: escolhe a chave do Edge Config conforme o tipo
        const chave = tipo === 'matricula' ? 'unidades-matricula' : 'unidades';

        const dados = await get(chave);

        if (!dados) {
            return res.status(404).json({ erro: `Catálogo '${chave}' não encontrado` });
        }

        const catalogo = { unidades: dados };

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

        return res.status(200).json(catalogo);
    } catch (erro) {
        console.error('Erro ao ler Edge Config:', erro);
        return res.status(500).json({ erro: 'Erro ao carregar catálogo' });
    }
};