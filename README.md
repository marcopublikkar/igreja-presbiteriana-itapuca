# Site e área de publicações — Igreja Presbiteriana de Itapuca

Esta pasta é o projeto para um repositório GitHub conectado à Cloudflare Pages. A pasta `public/` contém o site; `functions/` contém a publicação de artigos. **Ainda não foi publicado nem conectado a contas externas.** O pacote está preparado para implantação após a configuração de Cloudflare, domínio e usuários.

## O que o autor faz

1. Acessa `https://presbiterianadeitapuca.com.br/formulario/` e entra com seu usuário e senha.
2. Preenche título, resumo, tema e texto. O site apresenta parágrafos longos em blocos mais curtos sem mudar palavras ou pontuação. Se quiser, ele usa os botões de subtítulo e lista e confere a prévia.
3. Clica em “Copiar instrução para gerar a imagem”, cola no ChatGPT, salva a imagem e a escolhe no formulário.
4. Clica em “Publicar artigo”. O artigo aparece imediatamente no blog. Não há etapa de aprovação.
5. No mesmo painel, pode editar e substituir a imagem, tirar do ar, publicar novamente, mover para lixeira ou desfazer a última alteração.

O navegador reduz a imagem para até 1600 × 1000 px, preservando a proporção, e a converte para WebP com qualidade 82%. A imagem otimizada deve ter até 5 MB. O servidor confere o tipo real do arquivo antes de guardá-lo.

## Infraestrutura

- GitHub: guarda o código e os arquivos estáticos, sem senhas ou artigos enviados pelo formulário.
- Cloudflare Pages: publica o site a partir do GitHub e executa as funções do formulário.
- Cloudflare D1: guarda usuários, sessões, artigos e versões anteriores.
- Cloudflare R2: guarda as imagens enviadas.
- Hostinger: pode continuar com o registro do domínio e o e-mail. O tráfego do site passará a ser servido pela Cloudflare após a troca de DNS. Não cancele o serviço atual antes de validar o novo site, o e-mail e as URLs antigas.

O endereço do formulário não aparece no menu e solicita senha. Ele não é “seguro por ser escondido”; toda leitura e alteração privada é verificada no servidor. Cada autor vê e altera apenas os próprios artigos; o administrador vê todos. Artigos fora do ar deixam de aparecer no blog imediatamente. Artigos antigos incluídos no HTML permanecem estáticos.

## Passos para implantação

1. Criar um repositório GitHub com **o conteúdo desta pasta na raiz**. Não enviar senhas, arquivos `.dev.vars` nem SQL de usuários ao repositório.
2. Criar um projeto Cloudflare Pages ligado a esse repositório. Sem comando de build; diretório de saída `public`.
3. Criar uma base D1 e executar `schema.sql` nela. Criar um bucket R2 privado.
4. Adicionar os bindings do projeto Pages: `DB` para a base D1 e `IMAGES` para o bucket R2. Aplicar em produção e no ambiente de testes. Publicar novamente após adicionar os bindings.
5. Criar dois usuários: um `admin` para o responsável pelo site e um `author` para o presbítero. Em um terminal local, defina `SITE_USER_PASSWORD` temporariamente, execute `node scripts/create-user.mjs nome admin` ou `author`, guarde a saída SQL fora do repositório e execute-a na base D1. Use senhas diferentes. Apague o SQL temporário depois.
6. Testar login, publicação, imagem, edição, retirada do ar, restauração e versão anterior no endereço de testes da Cloudflare.
7. Antes de apontar o domínio, revisar as URLs antigas do WordPress, fazer cópia integral e decidir redirecionamentos. Conectar o domínio à Cloudflare Pages e validar que o e-mail hospedado na Hostinger continua funcionando.

Não há geração automática da imagem no servidor: ela vem do arquivo enviado pelo autor. O ChatGPT pode gerar uma imagem horizontal conforme a instrução copiada; o formato final WebP é garantido pelo formulário, não pelo texto do pedido. O texto **não é reescrito por IA**. A apresentação do artigo usa parágrafos, subtítulos e listas para facilitar a leitura.

## Limitações antes da implantação

O painel depende de Cloudflare Pages Functions, D1 e R2. Abrir `public/index.html` em um servidor estático permite visualizar o site e o formulário, mas login e publicação só funcionam após a configuração desses serviços. A função de busca do blog acrescenta artigos novos por uma requisição ao servidor. A página de cada artigo novo é gerada no servidor; os nove artigos antigos continuam como HTML estático.

## Atualizações visuais incluídas

A versão pública inclui programação rotativa com quatro encontros, arte do tema Avivamento 2026, entradas suaves, links externos em nova aba, ícones sociais, crédito da Agência Publikkar e sete perguntas frequentes nas páginas que exibem FAQ. As três opções de arte estão em `public/assets/images/tema-avivamento-opcao-*.webp`; a opção 3 está aplicada.
