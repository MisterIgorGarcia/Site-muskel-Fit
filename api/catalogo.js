// api/catalogo.js
const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    try {
        // Busca os dados do Edge Config usando a chave 'unidades'
        const dados = await get('unidades'); 
        
        if (!dados) {
            return res.status(404).json({ erro: 'Catálogo não encontrado' });
        }

        // O frontend espera um objeto no formato { unidades: { ... } }
        // Como o Edge Config já extraiu a chave 'unidades', envolvemos os dados novamente.
        const catalogo = { unidades: dados };

        // Permite que o seu site acesse esses dados
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        
        return res.status(200).json(catalogo);
    } catch (erro) {
        console.error('Erro ao ler Edge Config:', erro);
        return res.status(500).json({ erro: 'Erro ao carregar catálogo' });
    }
};