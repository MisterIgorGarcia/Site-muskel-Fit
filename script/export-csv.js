// script/export-csv.js

async function exportarCSV() {
    if (typeof paginacao !== 'undefined' && paginacao.matriculas.total === 0 && paginacao.prematriculas.total === 0 && paginacao.alunos.total === 0) {
        return alert('Não há dados cadastrados para exportar.');
    }

    const btnCsv = document.querySelector('button[onclick="exportarCSV()"]');
    const textoOriginal = btnCsv ? btnCsv.innerHTML : 'Exportar CSV';

    try {
        if (btnCsv) btnCsv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando CSV...';

        const dados = await buscarTodosOsDados();

        // Junta as 3 tabelas
        const todos = [
            ...dados.matriculas, 
            ...dados.prematriculas, 
            ...(dados.alunos || [])
        ];

        if (todos.length === 0) {
            return alert('Não há dados para exportar.');
        }

        const dadosFormatados = todos.map(item => {
            let tipoExibicao = 'Matrícula';
            if (item.tipo === 'pre-matricula') tipoExibicao = 'Pré-Matrícula';
            else if (item.tipo === 'matricula-aluno' || item.tipo === 'aluno') tipoExibicao = 'Aluno Cadastrado';

            const end = item.rua ? `${item.rua}, ${item.numero_casa || 'S/N'} - ${item.bairro}` : '';
            const deps = Array.isArray(item.dependentes) && item.dependentes.length > 0 
                         ? item.dependentes.map(d => d.nome).join(', ') 
                         : '';

            return {
                Data: new Date(item.created_at).toLocaleDateString('pt-BR'),
                Tipo: tipoExibicao,
                Nome: item.nome,
                Celular: item.celular,
                Unidade: item.unidade,
                Modalidade: item.modalidade,
                Plano: item.plano,
                Valor: item.preco || '',
                Pagamento: item.pagamento || '',
                Endereço: end,
                Dependentes: deps
            };
        }).sort((a, b) => {
            const [dA, mA, aA] = a.Data.split('/');
            const [dB, mB, aB] = b.Data.split('/');
            return new Date(aB, mB - 1, dB) - new Date(aA, mA - 1, dA);
        });

        const csv = gerarCsv(dadosFormatados);

        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = agora.getFullYear();
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const nomeArquivo = `DadosMuskelfit-${dia}-${mes}-${ano}-${hora}-${minuto}.csv`;

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (erro) {
        console.error('Erro ao exportar CSV:', erro);
        alert('Ocorreu um erro ao gerar o arquivo CSV.');
    } finally {
        if (btnCsv) btnCsv.innerHTML = textoOriginal;
    }
}

function gerarCsv(linhas) {
    if (!linhas.length) return '';
    const colunas = Object.keys(linhas[0]);
    const escapar = (valor) => {
        const texto = String(valor ?? '').replace(/\r?\n/g, ' ').trim();
        return '"' + texto.replace(/"/g, '""') + '"';
    };
    const out = [];
    out.push(colunas.map(escapar).join(';'));
    linhas.forEach((linha) => {
        out.push(colunas.map((col) => escapar(linha[col])).join(';'));
    });
    return out.join('\r\n');
}