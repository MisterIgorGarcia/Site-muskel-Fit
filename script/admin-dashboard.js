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
            const colunas = cargo === 'dono' ? 7 : 6; // Mudou de 6:5 para 7:6
            tbodyMat.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma matrícula registrada.</td></tr>`;
        } else {
            dados.matriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                // Se for dono, mostra a coluna de valor. Se for funcionário, esconde.
                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                
                // NOVO: Botão de excluir (só aparece para o dono)
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'matricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

                tbodyMat.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
                        <td>${item.plano}</td>
                        ${colunaValor}
                        ${colunaAcao}
                    </tr>
                `;
            });
        }

        // --- TABELA DE PRÉ-MATRÍCULAS ---
        const tbodyPre = document.getElementById('tabela-prematriculas-body');
        tbodyPre.innerHTML = '';

        if (dados.prematriculas.length === 0) {
            const colunas = cargo === 'dono' ? 7 : 6; // Mudou de 6:5 para 7:6
            tbodyPre.innerHTML = `<tr><td colspan="${colunas}" style="text-align:center;">Nenhuma pré-matrícula registrada.</td></tr>`;
        } else {
            dados.prematriculas.forEach(item => {
                const data = new Date(item.created_at).toLocaleDateString('pt-BR');
                const valor = Number(item.preco) || 0;
                valorTotal += valor;

                const colunaValor = cargo === 'dono' ? `<td class="destaque-valor">R$ ${valor.toFixed(2).replace('.', ',')}</td>` : '';
                
                // NOVO: Botão de excluir (só aparece para o dono)
                const colunaAcao = cargo === 'dono' 
                    ? `<td><button onclick="removerRegistro(${item.id}, 'prematricula')" style="background: transparent; border: none; color: #ef4444; cursor: pointer;" title="Excluir"><i class="fa-solid fa-trash"></i></button></td>` 
                    : '';

                tbodyPre.innerHTML += `
                    <tr>
                        <td>${data}</td>
                        <td><strong>${item.nome}</strong></td>
                        <td>${item.celular}</td>
                        <td>${item.unidade}</td>
                        <td>${item.plano}</td>
                        ${colunaValor}
                        ${colunaAcao}
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

/* ===================== REMOVER REGISTRO INDIVIDUAL ===================== */

async function removerRegistro(id, tipo) {
    if (!confirm('Tem certeza que deseja apagar este registro? Essa ação não pode ser desfeita.')) {
        return;
    }

    try {
        const resposta = await fetch('/api/admin-dados', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tipo })
        });

        if (!resposta.ok) throw new Error('Erro ao excluir registro');

        carregarDados(); // Recarrega a tabela para o registro sumir da tela

    } catch (erro) {
        alert(erro.message);
    }
}

/* ===================== GERENCIAR FUNCIONÁRIOS ===================== */

// Assim que a página carregar, busca a lista de funcionários (apenas se os elementos existirem na tela)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tabela-usuarios-body')) {
        carregarUsuarios();
    }
});

// FUNÇÃO 1: Buscar e Listar
async function carregarUsuarios() {
    try {
        const resposta = await fetch('/api/admin-controle-usuarios');
        const usuarios = await resposta.json();
        const tbody = document.getElementById('tabela-usuarios-body');
        
        if (!tbody) return;
        tbody.innerHTML = '';

        usuarios.forEach(user => {
            // O dono principal (id 1) não pode ser excluído pela interface
            let acoes = `<span style="color: #666; font-size: 0.8rem;"><i class="fa-solid fa-lock"></i> Protegido</span>`;
            
            if (user.id !== 1) {
                acoes = `
                    <button onclick="deletarUsuario(${user.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 5px;" title="Remover Acesso">
                        <i class="fa-solid fa-trash"></i> Remover
                    </button>
                `;
            }

            tbody.innerHTML += `
                <tr>
                    <td>#${user.id}</td>
                    <td><strong>${user.usuario}</strong></td>
                    <td><span style="background: ${user.cargo === 'dono' ? '#ffd60a' : '#333'}; color: ${user.cargo === 'dono' ? '#000' : '#fff'}; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">${user.cargo}</span></td>
                    <td>${acoes}</td>
                </tr>
            `;
        });
    } catch (erro) {
        console.error('Erro ao carregar usuários:', erro);
    }
}

// FUNÇÃO 2: Adicionar Funcionário
async function adicionarFuncionario() {
    const usuario = document.getElementById('novo-user').value.trim();
    const senha = document.getElementById('nova-senha').value.trim();

    if (!usuario || !senha) {
        return alert('Preencha o nome de usuário e a senha para adicionar.');
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, senha, cargo: 'funcionario' })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao adicionar funcionário');

        alert('Funcionário adicionado com sucesso!');
        
        // Limpa os campos após adicionar
        document.getElementById('novo-user').value = '';
        document.getElementById('nova-senha').value = '';
        
        // Atualiza a tabela na tela
        carregarUsuarios(); 

    } catch (erro) {
        alert(erro.message);
    }
}

// FUNÇÃO 3: Remover Funcionário
async function deletarUsuario(id) {
    if (!confirm('Tem certeza que deseja remover o acesso deste funcionário? Ele não conseguirá mais fazer login.')) {
        return;
    }

    try {
        const resposta = await fetch('/api/admin-controle-usuarios', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) throw new Error(resultado.erro || 'Erro ao deletar usuário');

        // Atualiza a tabela na tela
        carregarUsuarios(); 

    } catch (erro) {
        alert(erro.message);
    }
}

// Carrega os dados assim que a página abre
document.addEventListener('DOMContentLoaded', carregarDados);