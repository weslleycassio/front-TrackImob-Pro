# Documentacao Funcional

## 1. Visao geral

O `Front TrackImob Pro` e a interface web da operacao imobiliaria multi-imobiliaria. O projeto foi construido em `React + TypeScript + Vite` e hoje cobre os fluxos principais de autenticacao, cadastro da imobiliaria, gestao de usuarios, dashboard e gestao de imoveis.

Esta documentacao descreve o comportamento funcional atual do frontend, considerando as regras e ajustes implantados ate o momento.

## 2. Objetivo do produto

O sistema foi pensado para que cada imobiliaria opere sua propria carteira dentro de um ambiente autenticado, com:

- acesso por perfis
- controle de usuarios da equipe
- cadastro, consulta, edicao e visualizacao de imoveis
- controle de fotos, links externos e dados de captacao
- indicadores basicos da operacao no dashboard

## 3. Perfis de usuario

Atualmente o frontend trabalha com dois perfis:

- `ADMIN`
  - gerencia equipe
  - pode cadastrar usuarios
  - pode alterar corretor captador de um imovel
  - pode editar, ativar, inativar, adicionar foto, excluir foto e ver dados de captacao de qualquer imovel da propria imobiliaria
- `CORRETOR`
  - acessa a area autenticada
  - pode operar imoveis quando for o corretor captador do registro
  - nao pode cadastrar usuarios
  - nao pode alterar corretor captador de um imovel ja existente

## 4. Estrutura de acesso

### 4.1 Rotas publicas

- `/login`
  - autentica o usuario
- `/register`
  - cadastra a imobiliaria e o usuario administrador inicial
  - a rota continua ativa por URL direta, mesmo sem botao visivel na tela de login
- `/esqueci-senha`
  - inicio do fluxo de recuperacao de senha
- `/redefinir-senha`
  - conclusao do fluxo de redefinicao de senha

### 4.2 Rotas autenticadas

Todas as rotas abaixo dependem de autenticacao:

- `/app`
  - dashboard inicial
- `/imoveis`
  - consulta da carteira
- `/imoveis/cadastrar`
  - cadastro de imovel
- `/imoveis/:id`
  - visualizacao detalhada do imovel
- `/imoveis/:id/editar`
  - edicao do imovel
- `/app/usuarios`
  - listagem da equipe
- `/app/usuarios/cadastrar`
  - cadastro de usuario
  - acesso apenas para `ADMIN`

## 5. Modulos funcionais

### 5.1 Autenticacao e sessao

#### Login

Na tela de login o usuario informa `email` e `senha`. Em caso de sucesso, o token e os dados do usuario sao armazenados na sessao da aplicacao e o usuario e redirecionado para `/app`.

#### Cadastro da imobiliaria

O fluxo de cadastro permite criar:

- dados da imobiliaria
  - nome
  - telefone
  - email opcional
  - CNPJ opcional
- dados do administrador inicial
  - nome
  - telefone
  - email
  - senha

Se o backend devolver `token` e `user`, o sistema ja autentica automaticamente o administrador. Caso contrario, exibe sucesso e redireciona para login.

#### Sessao e expiracao

O frontend ja possui gerenciamento basico de sessao com:

- leitura de expiracao do JWT
- logout automatico por expiracao
- logout automatico por inatividade
- sincronizacao de logout entre abas
- encerramento automatico quando a API retorna `401`

Mensagens de encerramento da sessao sao exibidas no login para informar o motivo:

- sessao expirada
- inatividade
- autenticacao invalida
- logout sincronizado entre abas

Observacao: o frontend ainda nao renova token por atividade, porque isso depende de endpoint de refresh no backend.

### 5.2 Layout autenticado

A area autenticada usa um layout comum com:

- sidebar de navegacao
- header com contexto da imobiliaria e usuario
- rodape
- modal para editar perfil
- modal para alterar senha
- acao de logout

O layout tambem busca os dados da imobiliaria logada para compor a experiencia visual.

### 5.3 Dashboard

O dashboard apresenta uma visao inicial da operacao com:

- total de imoveis
- total de imoveis ativos
- total de imoveis inativos
- total de usuarios

Tambem oferece atalhos para:

- cadastrar imovel
- consultar carteira
- gerenciar equipe

Quando ainda nao existem dados suficientes, a interface mostra estado vazio orientando o primeiro cadastro.

### 5.4 Usuarios

#### Listagem de usuarios

A tela `/app/usuarios` exibe:

- nome
- email
- telefone
- funcao
- status

Comportamento por perfil:

- `ADMIN`
  - visualiza a listagem
  - pode abrir modal de edicao
  - ve o botao para cadastrar usuario
- `CORRETOR`
  - visualiza a listagem
  - nao ve botao de cadastro
  - nao ve a acao de editar

#### Cadastro de usuario

Disponivel apenas para `ADMIN`, com os campos:

- nome
- telefone
- email
- senha
- perfil (`ADMIN` ou `CORRETOR`)

#### Edicao de usuario

A edicao acontece em modal na propria listagem e permite ajustar:

- funcao
- telefone
- status ativo/inativo

### 5.5 Imoveis

O modulo de imoveis concentra o nucleo da operacao do sistema.

#### Consulta da carteira

A tela `/imoveis` permite:

- listar imoveis com paginacao
- filtrar por busca, cidade, bairro, tipo, finalidade, status e faixa de preco
- visualizar um imovel
- editar um imovel
- ativar um imovel
- inativar um imovel

Quando nao ha registros, a tela mostra um estado vazio com convite para cadastrar o primeiro imovel.

#### Cadastro de imovel

O fluxo de cadastro contempla:

- dados principais
  - titulo
  - tipo
  - finalidade
- endereco
  - estado
  - cidade
  - bairro
- valores
  - preco
  - status
  - corretor captador
- caracteristicas
  - quartos
  - metragem
  - vagas de garagem
  - banheiros
  - suites
- midia
  - link externo de fotos
  - link externo de videos
  - upload de imagens
- observacoes
  - descricao
  - nome do proprietario
  - telefone do proprietario
  - endereco da captacao

Comportamentos relevantes:

- o campo de `corretor captador` e obrigatorio no cadastro
- se o usuario logado for `CORRETOR`, o sistema fixa esse usuario como captador no cadastro
- estados e cidades sao carregados dinamicamente
- o upload de imagens valida quantidade, formato e tamanho

#### Edicao de imovel

Na edicao, o sistema carrega o imovel e permite atualizar os dados do formulario mantendo o layout atual da tela.

Regras relevantes:

- a alteracao do `corretor captador` fica disponivel somente para `ADMIN`
- a gestao de fotos atuais segue permissao de interface
- o frontend trata `403` com mensagem amigavel para o usuario

#### Visualizacao do imovel

A tela de detalhe apresenta:

- carrossel de imagens
- dados principais do imovel
- descricao
- informacoes de cadastro
  - criado em
  - atualizado em
  - quem atualizou
  - corretor captador
- quando inativo
  - motivo
  - corretor do fechamento
  - quem inativou
  - descricao da inativacao

Tambem pode exibir o painel de `Informacoes extras`, reunindo:

- links externos
- dados de captacao, quando permitidos

#### Inativacao de imovel

O sistema usa modal para inativar imoveis. O fluxo permite selecionar dados de fechamento e registra o motivo informado pelo backend.

#### Ativacao de imovel

Quando o imovel esta inativo e o usuario tem permissao, a interface permite reativacao.

#### Fotos do imovel

No cadastro e na edicao existem acoes para:

- adicionar fotos
- excluir fotos

Na edicao, as fotos atuais podem ser gerenciadas sem sair da pagina do formulario.

## 6. Regras de permissao refletidas no frontend

As regras abaixo ja foram ajustadas na interface. O backend continua sendo a fonte real de seguranca, mas o frontend agora reflete melhor o que o usuario pode fazer.

### 6.1 Editar imovel

Mostrar apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.2 Inativar imovel

Mostrar apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.3 Ativar imovel

Mostrar apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.4 Ver dados de captacao

Exibir apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.5 Adicionar foto

Mostrar apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.6 Excluir foto

Mostrar apenas para:

- `ADMIN`
- `CORRETOR` que seja o `corretor captador` do imovel

### 6.7 Alterar corretor captador

Permitir apenas para:

- `ADMIN`

### 6.8 Tratamento de negacao pelo backend

Quando a API devolve `403` em acoes de imovel, o frontend apresenta a mensagem:

`Voce nao tem permissao para realizar esta acao neste imovel.`

## 7. Contratos de dados de imovel no frontend

O frontend ja foi preparado para trabalhar com dois contratos distintos de detalhe de imovel:

- DTO interno
  - usado no fluxo autenticado
  - consumo de `GET /imoveis/:id`
- DTO publico
  - preparado para `GET /public/imoveis/:id`
  - mapeado por whitelist no frontend

Importante:

- o frontend nao deve depender de um unico retorno para cenarios internos e publicos
- o contrato publico nao deve expor campos administrativos ou sensiveis
- ate aqui, a aplicacao ja possui servico preparado para consumo publico, mas ainda nao existe uma tela publica pronta no projeto

## 8. Regras de seguranca ja refletidas no frontend

### 8.1 Multi-tenant

O frontend foi ajustado considerando que cada usuario opera apenas a propria imobiliaria. A seguranca real desse isolamento pertence ao backend, mas a interface foi organizada para trabalhar com esse modelo sem sugerir acoes indevidas.

### 8.2 Sessao

Ja existe controle de:

- expiracao de token
- inatividade
- logout sincronizado entre abas

### 8.3 Permissoes de interface

As acoes de imoveis passaram a respeitar:

- papel do usuario
- relacionamento do usuario com o imovel via `corretorCaptadorId`

### 8.4 Tratamento de erros

O projeto possui funcoes utilitarias para transformar erros tecnicos da API em mensagens amigaveis na interface.

## 9. Integracoes esperadas do backend

O frontend depende de alguns comportamentos do backend para manter a experiencia consistente:

- autenticacao com JWT
- retorno do usuario autenticado
- endpoints de usuarios
- endpoints de imoveis
- endpoints de upload e exclusao de foto
- endpoints de localidades para estados e cidades
- regras reais de seguranca no servidor

Pontos importantes:

- o frontend nao deve ser considerado camada de seguranca
- toda permissao deve ser validada tambem no backend
- a renovacao silenciosa da sessao ainda depende da existencia de endpoint de refresh

## 10. Estado atual do produto

Neste momento, o frontend ja entrega:

- fluxo de cadastro da imobiliaria
- login e controle de sessao
- dashboard com indicadores
- cadastro, consulta, visualizacao e edicao de imoveis
- upload e exclusao de fotos
- inativacao e ativacao de imoveis
- gestao basica de usuarios
- regras de permissao na interface para imoveis
- base preparada para separacao entre detalhe interno e detalhe publico de imovel

## 11. Proximos temas naturais de evolucao

Alguns temas que fazem sentido para a proxima etapa do produto:

- endpoint de refresh token para renovar sessao por atividade
- tela publica consumindo `GET /public/imoveis/:id`
- testes automatizados de comportamento de sessao e permissoes
- documentacao tecnica complementar de APIs e contratos
