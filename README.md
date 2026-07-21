# Guia Librelato — Visão de Negócio (interativo)

Versão interativa em HTML/CSS/JS do PDF "Guia Librelato — Visão de Negócio",
em formato de **apresentação paginada** (uma página por vez, como um slide),
feita para ser fácil de estudar e fácil de editar.

## Como abrir

Os textos são carregados via `fetch()`, então os navegadores bloqueiam a leitura
se você apenas der duplo clique no `index.html` (protocolo `file://`). Rode um
servidor local na raiz do projeto:

```bash
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

(qualquer outro servidor estático funciona também, ex. `npx serve`, extensão
"Live Server" do VS Code, etc.)

## Navegação

O site é uma sequência de 18 páginas (1 capa + 16 páginas de conteúdo + 1
encerramento). Dá para navegar de várias formas:

- **Scroll / trackpad / mouse wheel** — cada "tela" gruda na página seguinte.
- **Arraste no celular** (swipe).
- **Setas do teclado** (↓ → PageDown / Espaço avança, ↑ ← PageUp volta, Home/End pulam para o início/fim).
- **Setas na tela** (canto inferior direito) + contador "03 / 18".
- **Pontinhos** na lateral direita — cada um é uma página; passe o mouse para ver o título.
- **Menu lateral** (os 10 capítulos do sumário original) — pula direto para o começo de cada assunto.

## Estrutura

```
index.html          # esqueleto da página + os controles de navegação
css/styles.css       # todo o visual (cores, tipografia, layout, animações)
js/app.js            # lê data/content.json, monta o "deck" de páginas e a interatividade
data/content.json    # TODO O CONTEÚDO: textos, listas, tabelas, imagens
assets/img/          # imagens usadas (extraídas do PDF e dos PNG/PSD enviados)
```

## Como editar o conteúdo

Praticamente tudo que aparece na tela vem de **`data/content.json`**. Não é
necessário mexer em HTML/JS para trocar um texto, adicionar um item numa
lista ou trocar uma imagem — basta editar o JSON e recarregar a página.

O conteúdo fica no array `pages`. Cada página pertence a um `group` (1 a 10,
os mesmos capítulos do sumário original — alguns capítulos foram divididos em
duas páginas menores, indicado pelo campo `part`, ex. `"1/2"`). O campo
`"type"` define qual layout/interação é usado:

| type                     | Página (exemplo)                      | Interatividade                                   |
|--------------------------|----------------------------------------|---------------------------------------------------|
| `intro`                  | 01 · Quem Somos                        | —                                                   |
| `cavalo-carroca`         | 02 · Conceito Cavalo/Carroça (1/2)     | —                                                   |
| `backpack`               | 02 · Cada carga tem sua mochila (2/2)  | trocar a carga clicando nos botões                  |
| `portfolio-grid`         | 03 · Tipos de implementos (1/2)        | chips clicáveis                                     |
| `portfolio-table`        | 03 · Mochila certa (2/2)                | trocar o tipo de carga clicando nos botões          |
| `market`                 | 04 · Panorama de Mercado                | cards viram (flip) ao clicar; contador animado      |
| `differentials`          | 05 · Diferenciais                       | cards expandem detalhes ao clicar                   |
| `pinos-calc`             | 06 · Métrica dos Pinos (1/2)            | calculadora: escolha a composição, veja os pinos    |
| `pinos-rodotrem`         | 06 · E o Rodotrem? (2/2)                | passo a passo clicável                               |
| `glossary`               | 07 · Glossário (1/2)                    | cards viram (flip)                                   |
| `checklist`              | 07 · Itens Obrigatórios (2/2)           | itens marcáveis                                      |
| `network-map`            | 08 · Nossa presença nacional (1/2)      | legenda liga/desliga camadas de pinos no mapa       |
| `network-roles`          | 08 · Papel dos representantes (2/2)     | —                                                   |
| `journey`                | 09 · Jornada do Cliente                 | stepper com avançar/voltar                          |
| `association-entities`   | 10 · Entidades (1/2)                    | —                                                   |
| `association-standards`  | 10 · Normas (2/2)                       | —                                                   |

Para adicionar uma nova imagem: coloque o arquivo em `assets/img/` e aponte
para ele no JSON (ex. `"image": "assets/img/minha-foto.jpg"`). Todas as
imagens de um mesmo componente (ex. os 7 cartões do glossário, as 3 fotos do
Rodotrem, o quadro da "mochila") são exibidas em uma caixa de tamanho fixo, então
qualquer imagem que você colocar ali se ajusta automaticamente ao mesmo
tamanho das demais — não precisa recortar a imagem no tamanho exato.

Para reordenar, adicionar ou remover uma página, edite o array `pages` (e o
array `toc`, que gera o menu lateral) — a ordem no array é a ordem de
navegação. Cada página deve ter um `group` (1-10) igual ao de alguma entrada
em `toc` para aparecer corretamente marcada no menu lateral. Ao adicionar
itens numa lista com animação (ex. mais tipos de implemento), a animação de
entrada se ajusta sozinha à quantidade de itens, sem precisar editar o CSS.

O objeto `"ui"` no topo do JSON reúne textos de interface reaproveitados em
várias páginas (dica de rolagem, aviso do checklist obrigatório, "clique para
ver o diferencial", "clique ↻" do glossário) — editar ali muda o texto em
todos os lugares onde ele aparece.

A página "E o Rodotrem?" tem um campo `rulesTitle` (título da seção de regras)
e `rules`, uma lista de `{ "label": "...", "desc": "..." }` — cada regra vira
um cartão com o nome em destaque e a explicação abaixo, mais fácil de ler do
que um parágrafo corrido.

O mapa interativo (página "Nossa presença nacional") usa uma imagem-base do
mapa (`map-base.jpg`) com 4 camadas de pinos transparentes que se ligam/desligam
por cima (`map-pins-*.png`) — os números de Oficinas Homologadas (43), Lojas (31)
e Box (6), e a presença internacional, vieram do arquivo de origem (PSD) enviado.

## Créditos das imagens

As fotos, logotipos, mapa e diagramas usados em `assets/img/` foram extraídos
do PDF original ("Librelato — Guia Visão de Negócio V2"), de imagens PNG
enviadas separadamente (logo Randon, grade de portfólio) e do arquivo de
origem "Rede_Librelato.psd" (mapa de presença nacional/internacional).
