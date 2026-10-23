<h1 align="center">🏋️ Muskel Fit - Academia</h1>

<div align="center">
  <img src="imagens/preview.jpg" alt="Preview do site Muskel Fit">
</div>

<div align="center">

![Status](https://img.shields.io/badge/status-conclu%C3%ADdo-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/MisterIgorGarcia/Site-muskel-Fit?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/MisterIgorGarcia/Site-muskel-Fit?style=for-the-badge)
[![Supabase](https://img.shields.io/badge/Supabase-Dashboard-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/dashboard/project/gggpytkkewrmxrkoarvn)

**Site institucional + sistema de matrícula e pré-matrícula online para a academia Muskel Fit, em Cruzeiro - SP.**

[🌐 Visite o site](https://muskelfit-academia.vercel.app/) · [📂 Repositório](https://github.com/MisterIgorGarcia/Site-muskel-Fit) · [🐛 Reportar um problema](https://github.com/MisterIgorGarcia/Site-muskel-Fit/issues) · [🗄️ Banco de Dados (Supabase)](https://supabase.com/dashboard/project/gggpytkkewrmxrkoarvn)

</div>

---

## 📖 Sobre o Projeto

A **Muskel Fit** é uma academia que une treino sério e ambiente acolhedor. Este projeto é composto por quatro partes:

1. **Landing Page institucional** — apresenta a academia, planos, horários e formas de contato.
2. **Sistema de Pré-Matrícula online** — fluxo para o aluno reservar uma vaga nas novas unidades (Queluz - SP e Engenheiro Passos - RJ).
3. **Sistema de Matrícula online** — fluxo completo para o aluno escolher um plano e iniciar o processo de matrícula, com integração de pagamento via API serverless.
4. **Painel Administrativo** — sistema interno para gestão de alunos, controle de acesso da equipe (donos e funcionários), análise de dados com gráficos e exportação de relatórios.

O projeto é construído com **HTML, CSS e JavaScript puros** no front-end, e **funções serverless** na Vercel para lidar com pagamento, catálogo de planos, autenticação e gerenciamento do banco de dados.

---

## ✨ Funcionalidades

### Site Institucional
- **🎨 Design Responsivo:** Layout adaptável para desktop, tablet e celular.
- **📊 Status de Funcionamento em Tempo Real:** Calcula se a academia está aberta ou fechada, com cronômetro regressivo até a próxima abertura ou fechamento.
- **🕐 Seção de Horários:** Cards com destaque automático para o dia atual.
- **🍔 Menu Hambúrguer:** Navegação otimizada para dispositivos móveis.
- **🗺️ Integração com Google Maps:** Mapa incorporado mostrando a localização exata.
- **💬 Links Diretos para WhatsApp e Instagram.**
- **💰 Seção de Planos Completa:** Planos individuais, família e especiais.
- **🏷️ Open Graph Tags:** Preview personalizado ao compartilhar o link.
- **🔘 Botões Premium:** Estilo com gradiente, borda prateada e glow pulsante para destacar promoções.
- **⬆️ Botão "Voltar ao Topo"** e créditos do desenvolvedor no rodapé.

### Sistema de Pré-Matrícula
- **📝 Formulário de Pré-Matrícula:** Página dedicada com coleta de dados do aluno.
- **📦 Catálogo Dinâmico de Planos:** Consumo de API que retorna os planos disponíveis via **Vercel Edge Config**.
- **💳 Integração de Pagamento:** Endpoint serverless que cria a intenção de pagamento no Mercado Pago.
- **🔗 Fluxo Integrado:** Do site → pré-matrícula → pagamento → confirmação no WhatsApp.

### Sistema de Matrícula
- **📝 Formulário de Matrícula:** Página dedicada com blocos organizados (dados pessoais, escolha do plano e forma de pagamento).
- **💡 Preview do Plano em Tempo Real:** Exibe nome e valor do plano selecionado antes do pagamento.
- **📦 Catálogo Dinâmico por Unidade:** Cada unidade tem suas próprias modalidades e planos.
- **💳 Integração de Pagamento:** Mesma API serverless, com suporte a múltiplos tipos (`matricula` e `pre-matricula`).
- **🔒 Selo de Segurança:** Aviso visual de pagamento processado pelo Mercado Pago.
- **🔗 Fluxo Integrado:** Do site → matrícula → pagamento → confirmação no WhatsApp.

### Painel Administrativo (Admin)
- **🔐 Autenticação e Níveis de Acesso:** Login seguro separando as permissões de "Dono" (acesso total) e "Funcionário" (acesso restrito).
- **📊 Dashboard com Gráficos:** Análise de dados em tempo real com integração ao **Chart.js** (agrupamento por plano, unidade, modalidade, etc.).
- **📥 Exportação de Dados:** Botão para baixar as matrículas e pré-matrículas diretamente em formato Excel (`.xlsx`) usando **SheetJS**.
- **👥 Gestão de Equipe:** O dono pode adicionar, editar e remover o acesso de funcionários.
- **📍 Controle de Unidade Rigoroso:** O dono pode alterar a unidade de um funcionário através de um modal interativo. A API valida a unidade no Edge Config e o banco de dados filtra as informações, garantindo que o funcionário veja *apenas* os alunos da sua respectiva unidade.
- **👋 Personalização:** Interface que exibe o nome do usuário logado e a sua unidade atual no cabeçalho.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| **HTML5** | Estruturação semântica das páginas. |
| **CSS3** | Estilização, layout responsivo (Flexbox, Grid) e animações. |
| **JavaScript (ES6+)** | Interatividade, cálculo de horários, validações e consumo de API. |
| **Node.js** | Ambiente de execução para as funções serverless. |
| **Vercel Functions** | API serverless para catálogo, pagamentos, autenticação e gestão de dados. |
| **Vercel Edge Config** | Key-value store para armazenar o catálogo de planos e validar as unidades permitidas. |
| **Mercado Pago API** | Processamento de pagamentos (PIX, Débito e Crédito). |
| **[Supabase](https://supabase.com/dashboard/project/gggpytkkewrmxrkoarvn)** | Banco de dados PostgreSQL para armazenar os dados dos alunos e credenciais de login da equipe. |
| **Chart.js** | Biblioteca de gráficos para a análise de dados do painel administrativo. |
| **SheetJS (xlsx)** | Biblioteca para geração de relatórios e exportação de planilhas Excel. |
| **Font Awesome** | Biblioteca de ícones. |
| **Google Maps Embed** | Mapa de localização. |
| **Vercel** | Hospedagem e deploy contínuo. |
| **Git & GitHub** | Controle de versão. |

---

## 📁 Estrutura do Projeto

```text
Site-muskel-Fit/
├── administracao/                # Páginas do Painel Administrativo
│   ├── admin.html                # Tela de Login
│   ├── admin-dashboard-dono.html # Painel exclusivo do Dono
│   └── admin-dashboard-funcionario.html # Painel restrito do Funcionário
├── api/                          # Funções serverless (Vercel)
│   ├── catalogo.js               # Retorna o catálogo de planos por tipo
│   ├── criar-pagamento.js        # Cria a preferência de pagamento no Mercado Pago
│   ├── registro-banco.js         # Salva os dados de matrícula/pré-matrícula no Supabase
│   ├── adminloginapi.js          # Autenticação de usuários
│   ├── admin-dados.js            # Busca e gerencia matrículas (com filtro de unidade)
│   └── admin-controle-usuarios.js # CRUD de contas da equipe (Dono/Funcionário)
├── matriculas/                   # Páginas de matrícula
│   ├── matricula.html            # Página de matrícula
│   └── prematricula.html         # Página de pré-matrícula
├── node_modules                  # Aqui dentro estão armazenados os dados dos modulos NPM
├── script/                       # Scripts modularizados
│   ├── admin-dashboard.js        # Lógica dos painéis admin (dono e funcionário)
│   ├── badge.js                  # Badge de status (aberto/fechado)
│   ├── config.js                 # Configurações globais
│   ├── cronometro.js             # Cronômetro da seção de horários
│   ├── externos.js               # Abertura de links externos (app Trei.no)
│   ├── matricula.js              # Lógica da página de matrícula
│   ├── menu.js                   # Menu hambúrguer
│   ├── prematricula.js           # Lógica da página de pré-matrícula
│   ├── status.js                 # Status da academia em tempo real
│   └── utils.js                  # Funções auxiliares
├── imagens/                      # Imagens do site
│   ├── avatar.png                # Avatar/logo da academia
│   └── preview.jpg               # Imagem de preview para compartilhamento
├── index.html                    # Página principal do site
├── main.js                       # Ponto de entrada de scripts globais
├── style.css                     # Estilos e layout responsivo
├── package.json                  # Dependências do projeto
├── package-lock.json             # Lockfile de dependências
├── .npmrc                        # Configuração do npm
├── README.md                     # Documentação do projeto
└── license                       # Arquivo de licença