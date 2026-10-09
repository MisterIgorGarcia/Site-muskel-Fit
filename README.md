<h1 align="center">🏋️ Muskel Fit - Academia</h1>

<div align="center">
  <img src="imagens/preview.jpg" alt="Preview do site Muskel Fit">
</div>

<div align="center">

![Status](https://img.shields.io/badge/status-conclu%C3%ADdo-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red?style=for-the-badge)
![GitHub repo size](https://img.shields.io/github/repo-size/MisterIgorGarcia/Site-muskel-Fit?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/MisterIgorGarcia/Site-muskel-Fit?style=for-the-badge)

**Site institucional + sistema de pré-matrícula online para a academia Muskel Fit, em Cruzeiro - SP.**

[🌐 Visite o site](https://muskelfit-academia.vercel.app/) · [📂 Repositório](https://github.com/MisterIgorGarcia/Site-muskel-Fit) · [🐛 Reportar um problema](https://github.com/MisterIgorGarcia/Site-muskel-Fit/issues)

</div>

---

## 📖 Sobre o Projeto

A **Muskel Fit** é uma academia que une treino sério e ambiente acolhedor. Este projeto é composto por duas partes:

1. **Landing Page institucional** — apresenta a academia, planos, horários e formas de contato.
2. **Sistema de pré-matrícula online** — fluxo completo para o aluno escolher um plano e iniciar o processo de matrícula, com integração de pagamento via API serverless.

O projeto é construído com **HTML, CSS e JavaScript puros** no front-end, e **funções serverless** na Vercel para lidar com pagamento e catálogo de planos.

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
- **⬆️ Botão "Voltar ao Topo"** e créditos do desenvolvedor no rodapé.

### Sistema de Pré-Matrícula
- **📝 Formulário de Pré-Matrícula:** Página dedicada com coleta de dados do aluno.
- **📦 Catálogo Dinâmico de Planos:** Consumo de API que retorna os planos disponíveis.
- **💳 Integração de Pagamento:** Endpoint serverless que cria a intenção de pagamento.
- **🔗 Fluxo Integrado:** Do site → pré-matrícula → pagamento em poucos cliques.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| **HTML5** | Estruturação semântica das páginas. |
| **CSS3** | Estilização, layout responsivo (Flexbox, Grid) e animações. |
| **JavaScript (ES6+)** | Interatividade, cálculo de horários, validações e consumo de API. |
| **Node.js** | Ambiente de execução para as funções serverless. |
| **Vercel Functions** | API serverless para catálogo e criação de pagamento. |
| **Font Awesome** | Biblioteca de ícones. |
| **Google Maps Embed** | Mapa de localização. |
| **Vercel** | Hospedagem e deploy contínuo. |
| **Git & GitHub** | Controle de versão. |

---

## 📁 Estrutura do Projeto

```text
Site-muskel-Fit/
├── api/                          # Funções serverless (Vercel)
│   ├── catalogo.js               # Retorna o catálogo de planos
│   └── criar-pagamento.js        # Cria a intenção de pagamento
├── pre-matricula/
│   └── prematricula.html         # Página de pré-matrícula
├── script/                       # Scripts modularizados
│   ├── badge.js                  # Badge de status (aberto/fechado)
│   ├── config.js                 # Configurações globais
│   ├── cronometro.js             # Cronômetro da seção de horários
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
├── README.md                     # Documentação do projeto
└── license                       # Arquivo de licença