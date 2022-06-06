# IndieLisboa - Product Management App - Web API

Instituto Superior de Engenharia de Lisboa  
2021/2022 Semestre de Verão

Grupo 37

Alunos:
- Fábio Alexandre Pereira do Carmo - nº 39230
- Pedro Daniel Diz Pinela - nº 48084

Orientador:
- ISEL - Professor Nuno Leite

## Introdução

O presente projeto é apenas parte de um todo. Aqui encontra definida a componente da Web API. Esta aplicação tenta seguir o padrão de arquitetura REST.

## Instalação

Esta aplicação é para correr no ambiente [NodeJs](https://nodejs.org/en/about/).

Antes de começar a instalação, [descarregue e instale NodeJs](https://nodejs.org/en/download/). É necessária a versão 16 ou maior.  

Pode descarregar o repositório através do [Git](https://git-scm.com/downloads)
```
git clone https://github.com/conta0/indielisboa-webapi
```
Ou pela funcionalidade de download do GitHub.

Depois de ter o repositório, siga os seguintes passos:
```
cd indielisboa-webapi
npm install
```
Estes comandos irão instalar as dependências necessárias para compilar, executar e testar a aplicação.

## Estrutura da Aplicação

A organização é a seguinte:
- `src/server.ts` - O ponto de entrada da aplicação.
- `src/app.ts` - Inicia os módulos.
- `src/router.ts` - Regista as rotas.
- `src/model.ts` - Contém as entidades de domínio.
- `src/errors.ts` - Contém os diferentes tipos de erro.
- `src/openapi.json` - A especificação OpenAPI para as rotas desta aplicação.

Além destes, também são incluídos ficheiros de configuração na raíz do repositório.

## Compilar, Executar e Testar

Antes de correr a aplicação, verifique que definiu as seguintes variáveis de ambiente:
```
PORT={número da porta}
```
Se esta variável não estiver definida, a aplicação tentará usar a porta `8080`.

---

Para iniciar a aplicação em modo de desenvolvedor, utilize o comando
```
npm run dev
```
O projeto está configurado para compilar e reiniciar a aplicação, automaticamente, sempre que o código fonte em `src/` é alterado. Está a ser utilizado o módulo `nodemon` em combinação com `ts-node` para este fim. O ficheiro `nodemon.json` contém as configurações necessárias.

Se apenas pretende compilar o código, utilize o comando
```
npm run build
```
Que cria a pasta `build/` com o código fonte compilado para JavaScript.

Para iniciar a aplicação em modo normal, deve utilizar o comando
```
npm start
```
Que compila e inicia a aplicação.

---

## Documentação da Web API

Para aceder à documentação das rotas, pode copiar o ficheiro com a especificação para um editor de OpenApi. Recomendamos o [Swagger Editor](https://editor.swagger.io/).  

Também é possível aceder à documentação em tempo de execução. Para isso, aceda ao URI `/api-docs` no host em que o servidor estiver a correr. Alternativamente, pode descarregar o ficheiro através do URI `/api-docs/openapi.json`.