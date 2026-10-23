// script/export-excel.js

async function exportarExcel() {
    // Verifica se há dados (usando a variável global de paginação)
    if (typeof paginacao !== 'undefined' && paginacao.matriculas.total === 0 && paginacao.prematriculas.total === 0) {
        return alert('Não há dados cadastrados para exportar.');
    }

    const btnExcel = document.querySelector('button[onclick="exportarExcel()"]');
    const textoOriginal = btnExcel ? btnExcel.innerHTML : 'Exportar Excel';

    try {
        // Muda o texto do botão para avisar o usuário
        if (btnExcel) btnExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel...';

        // Chama a função do admin-dashboard.js que busca TODOS os dados no banco
        const dados = await buscarTodosOsDados();
        
        const todos = [...dados.matriculas, ...dados.prematriculas];
        
        if (todos.length === 0) {
            return alert('Não há dados para exportar.');
        }

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

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosFormatados);
        XLSX.utils.book_append_sheet(wb, ws, "Registros");

        const agora = new Date();
        const dia = String(agora.getDate()).padStart(2, '0');
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const ano = agora.getFullYear();
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');

        XLSX.writeFile(wb, `DadosMuskelfit-${dia}-${mes}-${ano}-${hora}-${minuto}.xlsx`);

    } catch (erro) {
        console.error('Erro ao exportar:', erro);
        alert('Ocorreu um erro ao gerar a planilha.');
    } finally {
        // Restaura o botão
        if (btnExcel) btnExcel.innerHTML = textoOriginal;
    }
}