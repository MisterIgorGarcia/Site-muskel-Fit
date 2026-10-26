// script/export-csv.js

async function exportarCSV() {
    // Mesma verificação do Excel (usa a variável global de paginação)
    if (typeof paginacao !== 'undefined' && paginacao.matriculas.total === 0 && paginacao.prematriculas.total === 0) {
        return alert('Não há dados cadastrados para exportar.');
    }

    const btnCsv = document.querySelector('button[onclick="exportarCSV()"]');
    const textoOriginal = btnCsv ? btnCsv.innerHTML : 'Exportar CSV';

    try {
        // Mesmo feedback visual do Excel
        if (btnCsv) btnCsv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando CSV...';

        // Mesma chamada — reaproveita a função do admin-dashboard.js
        const dados = await buscarTodosOsDados();

        const todos = [...dados.matriculas, ...dados.prematriculas];

        if (todos.length === 0) {
            return alert('Não há dados para exportar.');
        }

        // Mesma formatação e mesmo sort (recentes primeiro)
        const dadosFormatados = todos.map(item => ({
            Data: new Date(item.created_at).toLocaleDateString('pt-BR'),
            Tipo: item.tipo === 'pre-matricula' ? 'Pré-Matrícula' : 'Matrícula',
            Nome: item.nome,
            Celular: item.celular,
            Unidade: item.unidade,
            Modalidade: item.modalidade,
            Plano: item.plano,
            Valor: item.preco,
            Pagamento: item.pagamento
        })).sort((a, b) => {
            const [dA, mA, aA] = a.Data.split('/');
            const [dB, mB, aB] = b.Data.split('/');
            return new Date(aB, mB - 1, dB) - new Date(aA, mA - 1, dA);
        });

        // Converte para string CSV
        const csv = gerarCsv(dadosFormatados);

        // Mesmo padrão de nome do Excel, só troca a extensão
        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = agora.getFullYear();
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const nomeArquivo = `DadosMuskelfit-${dia}-${mes}-${ano}-${hora}-${minuto}.csv`;

        // BOM UTF-8 (\ufeff) + charset utf-8: garante acentos corretos no Excel pt-BR
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libera memória
        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (erro) {
        console.error('Erro ao exportar CSV:', erro);
        alert('Ocorreu um erro ao gerar o arquivo CSV.');
    } finally {
        // Restaura o botão
        if (btnCsv) btnCsv.innerHTML = textoOriginal;
    }
}

/**
 * Converte um array de objetos em string CSV.
 * - Separador ";" (padrão do Excel brasileiro — vírgula é decimal aqui)
 * - Todos os valores entre aspas (RFC 4180)
 * - Aspas internas duplicadas
 * - Remove quebras de linha dentro das células
 */
function gerarCsv(linhas) {
    if (!linhas.length) return '';

    const colunas = Object.keys(linhas[0]);

    const escapar = (valor) => {
        const texto = String(valor ?? '').replace(/\r?\n/g, ' ').trim();
        return '"' + texto.replace(/"/g, '""') + '"';
    };

    const out = [];

    // Cabeçalho
    out.push(colunas.map(escapar).join(';'));

    // Dados
    linhas.forEach((linha) => {
        out.push(colunas.map((col) => escapar(linha[col])).join(';'));
    });

    return out.join('\r\n');
}