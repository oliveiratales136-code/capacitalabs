# CapacitaLab — Backend

Backend real para o portal CapacitaLab: login com senha criptografada e
cadastro de alunos gravados em um **arquivo JSON** (`data/db.json`).
Diferente da versão só-front-end, agora os dados **persistem** mesmo depois
de fechar o navegador ou reiniciar o computador — só se perdem se você
apagar o arquivo do banco.

> **Zero dependências externas.** Este backend usa só o que já vem embutido
> no Node.js (`http`, `crypto`, `fs`) — nenhum pacote para baixar, nenhuma
> compilação nativa, nenhum risco de erro de instalação. `npm install` roda
> instantâneo (não tem nada para instalar) e serve só para deixar o projeto
> no formato padrão.

## O que mudou em relação à versão só-front-end

- Login deixou de comparar usuário/senha no JavaScript do navegador e passa a
  chamar `POST /api/login`, que verifica a senha (com hash + salt, via
  `crypto.scrypt`) no arquivo de dados.
- A sessão fica salva no navegador (`localStorage`) e é revalidada no
  servidor a cada carregamento da página (`GET /api/me`), então dar F5 não
  desloga mais ninguém.
- Cadastrar um aluno em "Cadastrar Aluno" grava no arquivo `data/db.json`
  (`POST /api/students`) e **já cria o login desse aluno automaticamente**,
  usando a matrícula (em minúsculo) como usuário e a senha inicial informada
  no formulário.
- "Alunos Cadastrados" busca a lista direto do arquivo de dados
  (`GET /api/students`).
- Os campos de senha (login e cadastro de aluno) têm um botão de "olho" para
  mostrar/ocultar o que foi digitado.

## Pré-requisitos

- [Node.js](https://nodejs.org) versão 18 ou mais recente instalado no seu
  computador. Só isso — sem mais nada.

## Como rodar

```bash
cd capacitalab-backend
npm install
npm start
```

Depois abra **http://localhost:3000** no navegador — o próprio backend serve
a página (pasta `public/`), então não precisa abrir o HTML separadamente.

Na primeira execução, o arquivo `data/db.json` é criado automaticamente
com três usuários já cadastrados:

| Perfil | Usuário | Senha |
|---|---|---|
| Professor (Tácio Macedo) | `tacio.macedo` | `Professor@123` |
| Administrador (Tales Oliveira) | `tales.oliveira` | `Admin@123` |
| Aluno (Eduardo Rodrigues) | `eduardo.rodrigues` | `Aluno@123` |

### Deu erro "execução de scripts foi desabilitada" no PowerShell?

É uma política do Windows, não um erro do projeto. Duas soluções:
- **Mais simples:** no terminal do VS Code, troque de "powershell" para
  "Command Prompt" (seta ao lado do "+" no painel do terminal) e rode os
  comandos de novo.
- **Ou:** rode no PowerShell
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
  e confirme com `S`.

## Estrutura do projeto

```
capacitalab-backend/
├── server.js       # Servidor HTTP: rotas de login, sessão, cadastro de alunos
├── auth.js         # Hash de senha e tokens de sessão (usando "crypto" nativo)
├── db.js           # Armazenamento em JSON + criação dos usuários padrão
├── package.json
├── data/
│   └── db.json     # criado automaticamente na primeira execução
└── public/
    └── index.html  # o site (front-end), servido pelo próprio backend
```

## Segurança — importante antes de publicar na internet

Este backend está pronto para **uso local / demonstração / sala de aula**.
Antes de colocar em um servidor acessível pela internet, ajuste:

1. **Troque o segredo do token.** Hoje ele está fixo no código
   (`troque-este-segredo-em-producao`, em `auth.js`). Defina a variável de
   ambiente `JWT_SECRET` com um valor longo e aleatório:
   ```bash
   JWT_SECRET="um-valor-bem-longo-e-aleatorio" npm start
   ```
2. **Sirva com HTTPS** (ex.: atrás de um Nginx/Caddy ou em um provedor como
   Render/Railway/Fly.io), para que a senha não trafegue em texto puro.
3. **Faça backup do arquivo `data/db.json`** periodicamente — é ele
   que guarda todos os alunos e senhas (com hash). Para uma quantidade maior
   de alunos ou múltiplos servidores ao mesmo tempo, migrar para um banco de
   dados de verdade (Postgres, MySQL) é recomendável.
4. Se quiser permitir que o próprio aluno redefina a senha ou recupere o
   acesso, isso ainda não existe aqui — é um próximo passo possível.

## Próximos passos possíveis

- Ligar as abas de **Notas/Boletim** e **Diploma** ao banco de dados (hoje
  ainda usam os dados de exemplo fixos no HTML).
- Tela de "editar/excluir aluno" na aba Alunos Cadastrados.
- Recuperação de senha por e-mail.
