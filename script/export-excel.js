// script/export-excel.js

async function exportarExcel() {
    // Verifica se há dados (usando a variável global de paginação)
    if (typeof paginacao !== 'undefined' && paginacao.matriculas.total === 0 && paginacao.prematriculas.total === 0 && paginacao.alunos.total === 0) {
        return alert('Não há dados cadastrados para exportar.');
    }

    const btnExcel = document.querySelector('button[onclick="exportarExcel()"]');
    const textoOriginal = btnExcel ? btnExcel.innerHTML : 'Exportar Excel';

    try {
        if (btnExcel) btnExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando Excel...';

        const dados = await buscarTodosOsDados();
        
        // Junta as 3 tabelas (garante que alunos exista usando || [])
        const todos = [
            ...dados.matriculas, 
            ...dados.prematriculas, 
            ...(dados.alunos || [])
        ];
        
        if (todos.length === 0) {
            return alert('Não há dados para exportar.');
        }

        const dadosFormatados = todos.map(item => {
            // Lógica para identificar o Tipo corretamente
            let tipoExibicao = 'Matrícula';
            if (item.tipo === 'pre-matricula') tipoExibicao = 'Pré-Matrícula';
            else if (item.tipo === 'matricula-aluno' || item.tipo === 'aluno') tipoExibicao = 'Aluno Novo';

            // Lógica para formatar o Endereço e Dependentes (se existirem)
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
                Endereço: end,          // NOVO
                Dependentes: deps       // NOVO
            };
        }).sort((a, b) => {
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
        if (btnExcel) btnExcel.innerHTML = textoOriginal;
    }
}