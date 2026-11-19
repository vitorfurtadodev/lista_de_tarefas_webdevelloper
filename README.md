# Ordem — gerenciamento de tarefas

Organizador pessoal de tarefas em português, com quadro Kanban, visualização em lista, prioridades e painéis de filtros. Os dados ficam no navegador, sem cadastro ou servidor de aplicação.

Aplicação feita com HTML5, CSS3 e JavaScript puro. Sem frameworks, Bootstrap, bibliotecas de execução, CDN, instalação de pacotes ou etapa de compilação. A estrutura usa a pasta raiz para `index.html` e subpastas `css/` e `js/` para os arquivos de estilo e lógica. Os blocos lógicos e as funções têm comentários em português.

## Sumário

- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Estrutura e arquitetura](#estrutura-e-arquitetura)
- [Funcionalidades](#o-que-está-implementado)
- [Uso das tarefas](#uso-das-tarefas)
- [Painéis](#como-criar-um-painel)
- [Formatação](#como-funciona-a-formatação)
- [Backup e restauração](#backup-e-restauração)
- [Dados e limites](#regras-e-proteção-dos-dados)
- [Atalhos](#atalhos)
- [Privacidade e limitações](#privacidade-e-limitações)
- [Solução de problemas](#solução-de-problemas)
- [Verificação e testes](#verificação-e-testes)
- [Desenvolvimento e contribuição](#desenvolvimento-e-contribuição)
- [Distribuição](#distribuição)
- [Autoria e licença](#autoria-e-licença)

## Requisitos

- Navegador com JavaScript habilitado e suporte às APIs usadas pelo projeto, como `localStorage`, `<dialog>`, `inert`, `File.text()` e `Blob`.
- Todos os arquivos do projeto na estrutura indicada abaixo.
- Armazenamento local permitido para conservar alterações entre sessões.

Não há dependências a instalar, banco de dados externo, chaves de API ou variáveis de ambiente. Node.js é opcional, apenas para a verificação de sintaxe descrita neste documento. O projeto não define versões mínimas de navegadores nem inclui uma matriz de compatibilidade validada.

## Como executar

1. Copie o projeto completo para uma pasta ou extraia o ZIP inteiro, caso tenha recebido um arquivo compactado.
2. Abra `index.html` em um navegador moderno, como Chrome, Edge ou Firefox.
3. Use **Nova tarefa** para começar. **Explorar um exemplo** é opcional e aparece apenas enquanto não há tarefas.

Os scripts são clássicos com `defer`, sem imports de módulos ou requisições de rede. Isso permite abrir a página diretamente pelo sistema de arquivos. Também é possível abrir a mesma pasta com Live Server no VS Code. Use sempre o mesmo endereço para acessar o mesmo conjunto de dados.

Para usar o Live Server, abra a pasta no VS Code e, com a extensão instalada, use **Open with Live Server** em `index.html`. A extensão é opcional. Ao mudar de `file://` para um endereço HTTP, exporte os dados no endereço anterior e importe-os no novo.

## Estrutura e arquitetura

```text
.
├── README.md
├── LICENSE
├── index.html
├── css/
│   ├── layout.css
│   └── style.css
└── js/
    ├── storage.js
    ├── ui.js
    └── app.js
```

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Documento semântico, navegação, filtros, resumo, formulários e diálogos acessíveis. |
| `css/layout.css` | Grid, posicionamento, distribuição dos elementos, dimensões e breakpoints responsivos. |
| `css/style.css` | Paleta, temas, tipografia, estados visuais, cartões, foco, feedback e animações. |
| `js/storage.js` | Schema, normalização, geração de IDs, validação de datas, filtros, leitura, gravação e recuperação. |
| `js/ui.js` | Construção segura do DOM, cartões, contadores, painéis, ícones locais e prévia da formatação. |
| `js/app.js` | Estado da aplicação, eventos, operações CRUD, formulários, atalhos, drag and drop e backups. |

A ordem de carregamento é `storage.js` → `ui.js` → `app.js`. Os arquivos CSS carregam `layout.css` antes de `style.css`. Não é necessário alterar os nomes.

`storage.js` expõe `window.OrdemStorage`; `ui.js` expõe `window.OrdemUI`. O controlador em `app.js` lê o estado, trata os eventos e encaminha alterações para persistência e renderização. Os scripts encapsulam suas funções para limitar variáveis globais. Ícones SVG são definidos no código e a tipografia usa fontes disponíveis no sistema.

## O que está implementado

- Cadastrar, listar, editar, concluir, reabrir e excluir tarefas.
- Três etapas no Kanban: **A fazer**, **Em andamento** e **Concluídas**.
- Movimentar tarefas com arraste no desktop, botão de avanço ou seleção de status no editor.
- Alternar entre quadro e lista.
- Buscar no título e na descrição, sem diferença entre letras maiúsculas/minúsculas e acentos.
- Combinar filtros por status, prioridade e área.
- Salvar uma combinação de filtros como um painel com nome na barra lateral.
- Excluir um painel sem excluir as tarefas correspondentes.
- Prioridade alta, média e baixa, identificada por texto e cor.
- Áreas Geral, Trabalho, Estudos e Pessoal; prazo opcional e sinalização de prazo vencido.
- Contadores globais de total, em andamento e concluídas, além de percentual de conclusão.
- Contagem separada das tarefas que correspondem ao painel atual.
- Temas claro e escuro, salvos junto dos dados.
- Editor lateral com negrito, itálico, sublinhado, tachado e listas.
- Exportação e importação de backup JSON com confirmação antes da substituição.
- Menu móvel, colunas empilhadas, mensagens acessíveis, estado vazio e resultado vazio de busca.

## Uso das tarefas

1. Clique em **Nova tarefa** ou no botão de inclusão de uma coluna.
2. Preencha o título obrigatório. Descrição e prazo são opcionais; escolha status, prioridade e área conforme necessário.
3. Clique em **Salvar tarefa**. Para editar, abra o cartão ou use seu botão de edição.
4. Avance de etapa pelo botão de seta, arrastando o cartão para outra coluna no quadro ou alterando o status no editor.
5. Use o botão de conclusão para concluir ou reabrir uma tarefa. Reabrir a devolve para **A fazer**.
6. Para excluir, use a lixeira e confirme a ação.

**Pendentes** reúne tarefas em **A fazer** e **Em andamento**. Os filtros se combinam: uma tarefa precisa atender a todos os critérios escolhidos. As tarefas aparecem por prioridade (alta, média e baixa) e, em caso de empate, pela data de criação mais recente. O arraste muda a etapa; não define uma ordem manual dos cartões.

Os indicadores superiores consideram todas as tarefas, enquanto a contagem do painel considera os filtros. O progresso corresponde ao percentual arredondado de tarefas concluídas sobre o total. Um prazo anterior ao dia atual é marcado como vencido quando a tarefa ainda não está concluída.

## Como criar um painel

Ajuste a busca, o status, a prioridade e a área. Clique em **Salvar painel**, dê um nome e confirme. O painel aparece em **Meus painéis** na lateral.

O painel guarda os critérios. Ele não contém cópias das tarefas. Quando uma tarefa passa a corresponder aos critérios, aparece automaticamente; quando deixa de corresponder, sai daquele painel, mas continua no conjunto geral. Não existe associação oculta entre tarefa e painel.

Ao criar uma tarefa com um painel selecionado, a área, a prioridade e um status específico são usados como valores iniciais. Se você escolher valores que não correspondem ao filtro atual, a tarefa é salva e um aviso informa que ela está fora dos filtros.

## Como funciona a formatação

A descrição é armazenada como texto com marcações simples. Selecione um trecho e clique na barra de ferramentas. A prévia formatada aparece abaixo do campo.

| Ação | Marcação salva |
| --- | --- |
| Negrito | `**texto**` |
| Itálico | `*texto*` |
| Sublinhado | `__texto__` |
| Tachado | `~~texto~~` |
| Lista | Uma linha começando com `- ` |

As marcações são intencionais; o campo não é um editor WYSIWYG. A prévia suporta este subconjunto de formatação, sem links, imagens ou HTML arbitrário. Reaplicar o mesmo formato ao trecho selecionado dentro das marcações remove esse formato. Não há dependência de `document.execCommand()`.

## Backup e restauração

Para exportar, clique em **Exportar backup** na barra lateral. O navegador baixa um arquivo `ordem-backup-AAAA-MM-DD.json` com tarefas, painéis, tema e modo de visualização salvos no estado atual. Um rascunho ainda aberto no editor não faz parte desse arquivo; salve a tarefa antes de exportar.

Para restaurar:

1. Exporte os dados atuais caso queira preservá-los.
2. Clique em **Importar backup** e selecione um JSON exportado pelo Ordem.
3. Confira a quantidade de tarefas e painéis informada no diálogo.
4. Confirme a importação, que **substitui o estado atual**, sem mesclar os conjuntos de dados.

O arquivo é validado antes da confirmação. JSON inválido ou versão incompatível interrompe a operação; registros individuais inválidos podem ser corrigidos ou ignorados, com aviso. A cópia automática no navegador não substitui um arquivo exportado, pois também depende do armazenamento local.

## Regras e proteção dos dados

### Formato do estado

| Campo | Conteúdo |
| --- | --- |
| `version` | Versão do formato: `1`. Não é a versão do navegador. |
| `tasks` | Tarefas com `id`, `title`, `description`, `status`, `priority`, `area`, `dueDate`, `createdAt` e `updatedAt`. |
| `panels` | Painéis com `id`, `name` e `filters` (`query`, `status`, `priority` e `area`). |
| `theme` | `light` ou `dark`. |
| `view` | `board` ou `list`. |

Status de tarefa: `todo`, `doing` e `done`. Prioridades: `low`, `medium` e `high`. Áreas: `Geral`, `Trabalho`, `Estudos` e `Pessoal`. O prazo usa `AAAA-MM-DD` ou string vazia; criação e atualização usam datas ISO. Filtros também aceitam `all`, e o filtro de status aceita `active` para tarefas pendentes. A busca e a seleção atual de painel são transitórias; os critérios de painéis nomeados são persistidos.

### Persistência e recuperação

A chave principal é `ordem.workspace.v1`; a cópia da versão anterior fica em `ordem.workspace.v1.backup`. O estado tem versão de schema explícita e inclui tarefas, painéis, tema e visualização.

A leitura protege o acesso ao `localStorage`, a conversão de JSON e a validação do envelope. Se o principal não for legível, uma cópia anterior válida é consultada. Essa cópia pode estar uma alteração atrás da versão principal. Um aviso informa a recuperação; não se presume que um JSON corrompido equivale a um espaço vazio normal.

Registros individualmente inválidos são corrigidos ou ignorados sem invalidar os demais. Dados nulos, arrays inesperados e versões desconhecidas não são usados como estado. Quando possível, o conteúdo principal corrompido fica preservado na chave terminada em `.recovery`.

Se o navegador bloquear a gravação ou a quota for excedida, a aplicação continua nesta sessão, mas informa explicitamente que as alterações não foram persistidas. Exporte um backup antes de sair. Um aviso de saída é solicitado quando existem alterações apenas em memória ou um rascunho não salvo; a exibição desse aviso depende das regras do próprio navegador.

O armazenamento pertence ao navegador, perfil e endereço utilizados. Não há sincronização em nuvem. Limpar os dados do site, trocar de navegador, usar outro endereço ou encerrar certas sessões privadas pode remover ou tornar os dados inacessíveis. O comportamento de `localStorage` em `file://` varia entre navegadores; se ele estiver bloqueado, use um servidor local, como Live Server, e importe seu backup. Exportar/importar permite transportar os dados.

### Títulos e limites

Os títulos são normalizados, retirando caracteres invisíveis, espaços repetidos e espaços nas extremidades. Um título vazio é recusado na inclusão e na edição. O formulário mantém os valores e coloca o foco no campo com erro.

Limites: 120 caracteres no título, 5.000 na descrição, 40 no nome de painel, 10.000 tarefas, 100 painéis e 10 MB por arquivo importado. Datas precisam representar um dia real de calendário. O arquivo de importação deve ser um backup da aplicação com `version: 1`; não é um importador de qualquer formato JSON.

### Identidade, segurança e abas

Cada tarefa recebe um UUID quando o navegador oferece `crypto.randomUUID()`. Há fallback com tempo, sequência e componente aleatório. A identificação nunca depende da posição em um array; editar, ordenar ou remover outro cartão não troca o ID. A normalização corrige IDs repetidos ou inválidos de backups.

Títulos, nomes de painéis e descrições são apresentados com `textContent` ou nós de texto. A formatação cria somente elementos conhecidos; conteúdo como `<img onerror=...>` aparece literalmente. O único `innerHTML` da implementação contém caminhos SVG fixos definidos dentro do código, sem dados fornecidos pelo usuário.

O evento `storage` atualiza outras abas no mesmo endereço. Se uma tarefa estiver em edição, o rascunho é mantido, e uma versão alterada ou removida em outra aba é detectada ao salvar. Não existe sistema de colaboração simultânea: `localStorage` não oferece transações entre abas e alterações estritamente simultâneas ainda devem ser evitadas.

### Foco e responsividade

Diálogos nativos mantêm o foco no formulário. O editor pede confirmação antes de descartar alterações. Ao salvar, o foco volta para a tarefa visível ou para um botão de inclusão. Exclusões começam com foco em **Cancelar**. Mensagens usam regiões `aria-live`, erros são associados ao campo, e foco de teclado é visível.

No desktop há três colunas. Em telas de até 800 px a navegação vira um menu com fundo sobreposto e controle de foco; até 600 px as colunas e métricas se reorganizam. O layout define largura mínima de 320 px. O arraste é complementar: celulares e usuários de teclado podem usar os botões e o editor. A preferência `prefers-reduced-motion` desliga animações.

## Atalhos

| Atalho | Ação |
| --- | --- |
| `N` | Nova tarefa, quando não estiver digitando em um campo. |
| `/` | Focar a busca. |
| `Ctrl+B` / `Cmd+B` | Negrito no campo de descrição. |
| `Ctrl+I` / `Cmd+I` | Itálico no campo de descrição. |
| `Ctrl+U` / `Cmd+U` | Sublinhado no campo de descrição. |
| `Esc` | Fechar menu ou diálogo; rascunhos modificados pedem confirmação. |

## Privacidade e limitações

O código atual não envia tarefas a serviços externos e não inclui rastreamento, autenticação ou sincronização em nuvem. Tanto o estado em `localStorage` quanto o backup JSON ficam sem criptografia implementada pela aplicação. Quem tiver acesso ao perfil do navegador ou ao arquivo exportado poderá acessar seu conteúdo.

Não há contas de usuário, compartilhamento entre pessoas, anexos, lembretes, notificações do sistema, tarefas recorrentes ou histórico de versões navegável. O prazo é uma indicação visual. A versão local funciona com os arquivos disponíveis no computador; não há service worker nem instalação como PWA implementada. Os limites de registros não representam uma garantia de desempenho: a cota do navegador e o volume de texto podem limitar o uso antes deles.

## Solução de problemas

| Situação | O que verificar ou fazer |
| --- | --- |
| Página sem estilos ou botões sem ação | Confira se `css/` e `js/` estão junto de `index.html`, com os nomes originais, e se o JavaScript está habilitado. Consulte o console do navegador para identificar arquivos ausentes. |
| Tarefa salva não aparece | Limpe a busca e os filtros ou selecione **Todas as tarefas**. Uma tarefa pode ter sido salva fora dos critérios do painel atual. |
| Dados não aparecem em outro navegador ou endereço | Volte ao perfil e endereço usados originalmente, exporte um backup e importe no novo local. Não existe sincronização automática entre esses ambientes. |
| Aviso de armazenamento bloqueado ou cheio | Exporte imediatamente o estado atual antes de sair. Confira as permissões e o espaço do navegador; se necessário, use um servidor local e importe o backup. |
| Cópia de recuperação carregada | Confira os registros e exporte um backup antes de continuar. A cópia pode não incluir a alteração mais recente. |
| Importação recusada | Use um backup do Ordem com `version: 1`, JSON válido e até 10 MB. Confira os limites de tarefas e painéis. |
| Conflito ao salvar uma edição | Copie o rascunho e reabra a tarefa para editar a versão recebida da outra aba. |
| Tarefa excluída por engano | Não há botão de desfazer. Se existir backup exportado, preserve primeiro o estado atual e restaure o arquivo desejado, lembrando que a importação substitui todos os dados. |

## Referências registradas na documentação original

A documentação original relata a consulta aos dois repositórios abaixo. Os links e as observações foram preservados como registro histórico; o conteúdo externo não foi revalidado nesta revisão:

- [TodoMVC — controller JavaScript ES5](https://github.com/tastejs/todomvc/blob/master/examples/javascript-es5/src/controller.js): separa operações e visualização e utiliza `trim()` na inclusão. Nesta aplicação, a separação permanece explícita nos três arquivos JavaScript. Na edição, título vazio gera erro e preserva a tarefa, em vez de removê-la automaticamente.
- [TodoMVC — store JavaScript ES6](https://github.com/tastejs/todomvc/blob/master/examples/javascript-es6/src/store.js): o exemplo consultado usa armazenamento em memória e um contador de IDs. Aqui, a exigência é persistência real em `localStorage`, com validação de schema, cópia anterior, IDs independentes da sessão e tratamento de bloqueio/quota.
- [MDN DOM examples — to-do notifications](https://github.com/mdn/dom-examples/blob/main/to-do-notifications/scripts/todo.js): cria itens com `createElement()` e `textContent` e comunica erros de persistência. Esse padrão de DOM seguro orienta a renderização local. O exemplo usa IndexedDB e título como chave; esta implementação usa `localStorage` e IDs próprios, permitindo tarefas com o mesmo título e edição do título sem trocar a identidade.

O projeto não depende desses repositórios nem os carrega no navegador. O design usa tons creme, carvão e taupe, tipografia de sistema, divisórias e cores por prioridade e etapa.

## Verificação e testes

### Revisão documental atual

Nesta revisão, a documentação foi confrontada com `index.html`, os dois arquivos CSS e os três arquivos JavaScript. A sintaxe dos três scripts foi verificada com sucesso pelos comandos abaixo. Não foram repetidos testes de interface no navegador ou auditorias de acessibilidade nesta revisão.

Para repetir a verificação de sintaxe, com Node.js disponível, execute na raiz do projeto:

```powershell
node --check js/storage.js
node --check js/ui.js
node --check js/app.js
```

Esses comandos apenas verificam sintaxe; não exercitam DOM, persistência ou fluxos do usuário. O projeto não inclui suíte automatizada de testes, `package.json` ou configuração de integração contínua.

### Roteiro de verificação manual

Use um perfil separado do navegador para evitar substituir dados pessoais durante testes de importação.

1. Crie uma tarefa, edite-a, conclua-a, reabra-a e teste o cancelamento e a confirmação de exclusão.
2. Tente salvar um título vazio ou composto apenas por espaços; confira a mensagem e a preservação dos campos.
3. Combine busca, status, prioridade e área; salve um painel e confira seus resultados após editar uma tarefa.
4. Alterne quadro/lista e tema; recarregue a página e confira tarefas, painéis e preferências.
5. Exporte um backup, faça uma alteração e importe o arquivo; verifique a substituição após confirmação e a preservação dos dados ao cancelar.
6. Teste o menu em tela estreita, navegação por teclado, atalhos, foco e preferência de movimento reduzido.
7. Abra duas abas no mesmo endereço, altere uma tarefa e confira atualização e conflito de edição.

### Histórico informado pelo LEIA-ME original

O documento anterior registrava os resultados abaixo. Os scripts e relatórios correspondentes não estão incluídos nesta pasta, portanto este histórico não equivale a uma nova execução:

- Sintaxe verificada com `node --check` nos três arquivos JavaScript.
- 21 verificações de persistência passaram: início vazio, estado independente, envelopes inválidos, título vazio/invisível, registros nulos, IDs repetidos/estáveis, geração de 1.000 IDs, datas, campos desconhecidos, texto HTML literal, filtros, painéis, gravação/leitura, cópia anterior, JSON corrompido, JSON `null`, ausência de backup válido, armazenamento bloqueado, quota e limites.
- No Chromium: inclusão, recusa de título vazio/apenas espaços, foco no erro, formatação, edição, conclusão, recarga preservando dados, painel salvo, tema persistido, lista, confirmação de exclusão e movimentação de cartão entre etapas.
- Layout inspecionado com larguras CSS equivalentes a 545 px e 340 px por zoom: coluna única, menu móvel e ausência de overflow horizontal.
- Conteúdo HTML de teste permaneceu literal na prévia.
- Exportação e importação JSON verificadas no navegador.

A verificação móvel foi feita com largura CSS reduzida no Chromium; não equivale a teste em um aparelho físico. Não foi executada uma auditoria completa de acessibilidade nem uma bateria em todos os navegadores. As cores principais de texto e as prioridades foram escurecidas para melhorar o contraste no tema claro.

## Desenvolvimento e contribuição

Edite os arquivos diretamente; não há comando de build. Mantenha os arquivos em UTF-8, os comentários em português e a separação entre regras/persistência, apresentação e eventos. Preserve a ordem dos scripts e use nós de texto para conteúdo fornecido pelo usuário.

Para propor uma alteração:

1. Descreva o problema, o comportamento esperado e os passos para reproduzi-lo.
2. Faça a mudança na camada responsável e atualize este README quando alterar o uso ou o formato dos dados.
3. Execute a verificação de sintaxe e os cenários manuais afetados.
4. Informe navegador, sistema operacional e resultados das verificações ao enviar a alteração ao responsável pelo projeto.

Para ajustes visuais, a paleta está nas variáveis CSS de `css/style.css`; a organização e os breakpoints estão em `css/layout.css`. Mudanças no formato persistido exigem planejar compatibilidade com os backups existentes, pois versões diferentes de `1` são rejeitadas hoje.

## Distribuição

Para distribuir a aplicação, mantenha `index.html`, `css/` e `js/` na mesma estrutura. Ela pode ser servida como arquivos estáticos, sem backend ou compilação. Inclua este README para orientar quem receber o projeto e preserve o aviso de copyright e o texto da licença em `LICENSE`.

Publicar os arquivos não publica nem transfere as tarefas de um navegador. Cada endereço e perfil mantém seu armazenamento; mudanças de domínio, protocolo ou porta exigem exportação e importação para transportar os dados. Não há configuração de hospedagem ou URL pública registrada nesta pasta.

## Autoria e licença

Desenvolvido por **João Vitor dos Santos Furtado**, estudante de Ciência da Computação na Estácio, via Corpvs, no Ceará.

Este projeto utiliza a [licença MIT](LICENSE), conforme o [texto publicado pela Open Source Initiative](https://opensource.org/license/mit). Ela permite uso, modificação e distribuição, inclusive comercial, desde que sejam preservados o aviso de copyright e o aviso de permissão. O software é fornecido sem garantias, conforme os termos completos da licença.

Copyright (c) 2026 João Vitor dos Santos Furtado.
