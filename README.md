# Guia Librelato — Visão de Negócio (interativo)

Versão interativa em HTML/CSS/JS do PDF "Guia Librelato — Visão de Negócio", feita
para ser fácil de estudar e fácil de editar.

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

## Estrutura

```
index.html          # esqueleto da página (a única página do site)
css/styles.css       # todo o visual (cores, tipografia, layout, animações)
js/app.js            # lê data/content.json e monta a página + interatividade
data/content.json    # TODO O CONTEÚDO: textos, listas, tabelas, imagens
assets/img/          # imagens usadas (extraídas do PDF original)
```

## Como editar o conteúdo

Praticamente tudo que aparece na tela vem de **`data/content.json`**. Não é
necessário mexer em HTML/JS para trocar um texto, adicionar um item numa
lista ou trocar uma imagem — basta editar o JSON e recarregar a página.

Cada capítulo (`sections`) tem um campo `"type"` que define qual layout é
usado:

| type             | Capítulo (exemplo)         | Pontos interativos                          |
|------------------|-----------------------------|----------------------------------------------|
| `intro`          | 01 · Quem Somos             | —                                             |
| `cavalo-carroca` | 02 · O que são Implementos  | trocar a "mochila" (cargo) clicando nos botões|
| `portfolio`      | 03 · Portfólio e Aplicações | chips clicáveis + cards de exemplo            |
| `market`         | 04 · Panorama de Mercado    | cards viram (flip) ao clicar; contador animado|
| `differentials`  | 05 · Diferenciais           | cards expandem detalhes ao clicar             |
| `pinos`          | 06 · Métrica do Setor       | calculadora de pinos + passo a passo do Rodotrem|
| `glossary`       | 07 · Dicionário das Estradas| cards viram (flip); checklist marcável         |
| `network`        | 08 · Modelo de Negócio      | —                                             |
| `journey`        | 09 · Jornada do Cliente     | stepper com avançar/voltar                    |
| `association`    | 10 · Representatividade     | —                                             |

Para adicionar uma nova imagem: coloque o arquivo em `assets/img/` e aponte
para ele no JSON (ex. `"image": "assets/img/minha-foto.jpg"`).

Para reordenar, adicionar ou remover um capítulo inteiro, edite o array
`sections` (e o array `toc`, que gera o menu lateral) — cada item precisa de
um `id` numérico único usado para a navegação (`#chapter-<id>`).

## Créditos das imagens

As fotos, logotipos e diagramas usados em `assets/img/` foram extraídos do
PDF original ("Librelato — Guia Visão de Negócio V2") fornecido pelo usuário.
