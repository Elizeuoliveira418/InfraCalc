# INFRACALC - Calculadora de Infraestrutura Elétrica

Aplicação web moderna desenvolvida para dimensionamento técnico de condutos e infraestrutura de cabos de força/potência e sinal/controle, conforme as diretrizes das normas **NBR 5410** e **NBR 15465**.

---

## 🚀 Funcionalidades

- **Dimensionamento de Condutos:** Cálculo de taxa de ocupação e dimensionamento de eletrodutos (PVC Rígido, Corrugado, Eletrodutos de Aço, etc.).
- **Cadastros Base (CRUD Dinâmico):** Adição, edição e remoção de cabos e eletrodutos personalizados diretamente na interface, armazenados localmente no navegador.
- **Exportação e Importação de DB:** Backup e restauração de dados customizados via arquivos `.json`.
- **Relatório PDF Profissional:** Geração de relatórios com memória de cálculo detalhada.

---

## 🛠️ Arquitetura do Projeto

O sistema é uma aplicação SPA (Single Page Application) frontend construída em JavaScript Vanilla (ESModules), estilizada com Vanilla CSS e empacotada com **Vite**.

Os dados base padrão de cabos e eletrodutos são gerenciados dinamicamente no navegador via `localStorage`, sendo inicializados a partir de um arquivo estático `db.json`.

---

## 💻 Pré-requisitos

Para executar o projeto localmente, é necessário ter o [Node.js](https://nodejs.org/) (versão 18.x ou superior) instalado.

---

## ⚙️ Instalação e Execução

1. Clone este repositório:
   ```bash
   git clone https://github.com/elizeuoliveira418/InfraCalc.git
   cd InfraCalc
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```

4. O navegador abre automaticamente. Caso não abra, acesse `http://localhost:3000/` (porta definida em `vite.config.js`).

---

## 📦 Build para Produção

Para gerar o pacote estático otimizado para deploy:

```bash
npm run build
```

Os arquivos compilados serão gerados no diretório `dist/` e podem ser hospedados em qualquer provedor web (Vercel, Netlify, GitHub Pages, Nginx, etc.).
