// script/admin-dashboard.js

// Verifica se a pessoa tem permissão para ver a página (redundância de segurança)
const cargo = sessionStorage.getItem('adminCargo');
if (!cargo) {
    window.location.href = 'admin.html';
}

async function carregarDados() {
    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    try {
        const resposta = await fetch('/api/admin-dados');
        const dados = await resposta.json();

        if (!resposta.ok) throw new Error('Erro ao buscar');

        let valorTotal = 0;

        // --- TABELA DE MATRÍCULAS ---
        const tbodyMat = document.getElementById('tabela-matriculas-body');
        tbodyMat.innerHTML = '';
        
        if (dados.matriculas.length === 0) {
            const colunas = cargo === 'dono' ? 6 : 5;
            tbodyMat.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
        } else {
            dados.matriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                // Se for dono, mostra a coluna de valor. Se for funcionário, esconde.
                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';

                tbodyMat.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
                        <td>${item.plano}</td>
                        ${colunaValor}
                    </tr>
                `;
            });
        }

        // --- TABELA DE PRÉ-MATRÍCULAS ---
        const tbodyPre = document.getElementById('tabela-prematriculas-body');
        tbodyPre.innerHTML = '';

        if (dados.prematriculas.length === 0) {
            const colunas = cargo === 'dono' ? 6 : 5;
            tbodyPre.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
        } else {
            dados.prematriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';

                tbodyPre.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
                        <td>${item.plano}</td>
                        ${colunaValor}
                    </tr>
                `;
            });
        }

        // --- ATUALIZAR CARDS ---
        document.getElementById('total-registros').innerText = dados.matriculas.length + dados.prematriculas.length;
        
        // O valor total só existe na tela do dono
        const cardArrecadado = document.getElementById('total-arrecadado');
        if (cardArrecadado) {
            cardArrecadado.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
        }

    } catch (erro) {
        console.error('Erro:', erro);
        alert('Erro ao carregar os dados do banco.');
    } finally {
        if (btnAtualizar) btnAtualizar.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Atualizar Dados';
    }
}

// Carrega os dados assim que a página abre
document.addEventListener('DOMContentLoaded', carregarDados);