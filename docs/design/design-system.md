# RunUp — Design System

**Data:** 2026-07-04
**Status:** Validado — fonte da verdade para `packages/ui`
**Referências visuais:** design sheet fintech (Finzed) adaptado de verde→laranja · dashboard dark premium (Fintrixity) para harmonia de tons escuros

> Regra de ouro: **sempre consultar este documento antes de construir qualquer UI** (mobile ou web).

---

## 1. Fundamentos da identidade

- **Tema escuro é a identidade principal** do RunUp (modo claro é secundário).
- **Poppins** é a fonte única, em 5 pesos.
- **Laranja é a única cor da marca** — tudo o mais é neutro. O laranja funciona como *farol*: ilumina apenas onde a atenção deve ir.
- Linguagem gráfica de **velocidade**: faixas diagonais, barras inclinadas (skew -24°), grades de pontos.

---

## 1.1 Logo e marca

Arquivos oficiais em [`assets/brand/`](../../assets/brand/):

| Arquivo | Conteúdo | Quando usar |
|---|---|---|
| `icon-lar.svg` | Símbolo (corredor) em `#FF5500` | Ícone do app, avatar, favicon, contextos onde a marca já é conhecida |
| `icon-branco.svg` | Símbolo em `#EEEEEE` | Sobre fundos laranja/foto escura, marca d'água |
| `logo-1.svg` | Símbolo laranja + wordmark "runup" em `#EEEEEE` | **Principal** — fundos escuros (identidade dark do app) |
| `logo-2.svg` | Símbolo laranja + wordmark em gradiente `#FDE6D3 → #CC3F04` | Momentos hero/premium (splash, onboarding, marketing) |
| `logo-3.svg` | Símbolo laranja + wordmark em `#FF6902` | Fundos claros ou neutros |

Regras:
- Nunca recolorir o símbolo fora das duas versões (laranja `#FF5500` / branco `#EEEEEE`).
- Sobre fundo escuro, preferir `logo-1`; a versão gradiente (`logo-2`) segue a regra do farol — no máximo uma por tela.
- Área de respiro mínima: a altura do "pé" do símbolo em todos os lados.

---

## 2. Sistema de cores

### Cores da marca

O laranja oficial vem da logo: **`#FF5500`**. Todos os tons derivam dele; o gradiente do wordmark (`logo-2`) fornece as âncoras clara e escura.

| Token | Hex | Uso |
|---|---|---|
| `orange.500` (Laranja RunUp) | `#FF5500` | Acento principal: CTAs, item ativo, destaques (cor do símbolo da logo) |
| `orange.400` | `#FF7A38` | Tom claro do gradiente, ícones de acento em fundo escuro |
| `orange.600` | `#CC3F04` | Tom profundo do gradiente; **texto laranja sobre fundo claro** (âncora escura do wordmark) |
| `orange.glow` | `#FDE6D3` | Ponta clara de gradientes "acesos" (âncora clara do wordmark) |
| `orange.dim` | `#331A08` | Fundo de pills/tints laranja sobre superfície escura |
| `orange.wordmark` | `#FF6902` | Exclusivo do wordmark da `logo-3` — não usar em UI |

### Escada de superfícies — modo escuro (harmonia premium)

Degraus de ~4% de luminosidade, quase neutros (resquício quente, saturação baixíssima). **Nunca usar preto puro.**

| Token | Hex | Uso |
|---|---|---|
| `surface.0` | `#121110` | Fundo do app, sidebar, tab bar |
| `surface.1` | `#171514` | Fundo da área de conteúdo |
| `surface.2` | `#1D1B19` | Card padrão |
| `surface.3` | `#242220` | Card aninhado, input, pill neutra |
| `surface.4` | `#2B2825` | Hover, elemento elevado, barra inativa de gráfico |

### Texto sobre escuro

| Token | Hex | Uso |
|---|---|---|
| `text.primary` | `#FFFFFF` | Títulos, números, dados |
| `text.secondary` | `#A5A6A6` | Texto de apoio (Cinza frio da marca) |
| `text.muted` | `#6E6B67` / `#8B8884` | Labels, legendas, placeholders |

### Neutros claros (modo claro / superfícies claras)

| Token | Hex | Uso |
|---|---|---|
| `light.bg` | `#F7F6F4` | Fundo claro |
| `light.surface` | `#FFFFFF` | Card claro |
| `dark.ink` | `#120E09` | Texto sobre claro; texto sobre laranja preenchido |

### Bordas e luz

- Hairline padrão: `rgba(255,255,255,0.07)` (1px)
- **Aresta superior iluminada:** `border-top-color: rgba(255,255,255,0.13)` — todo card escuro parece "iluminado de cima". É o detalhe que torna o dark premium.
- Borda forte/hover: `rgba(255,255,255,0.10)`

### Semânticas

| Papel | Hex |
|---|---|
| Sucesso | `#4ADE80` |
| Erro | `#F87171` |
| Aviso | usa o próprio laranja `#FF7A38` |

---

## 3. Tipografia

**Fonte:** Poppins (Google Fonts) — Light 300, Regular 400, Medium 500, SemiBold 600, Bold 700.

| Papel | Peso | Tamanho (mobile) |
|---|---|---|
| Display (números hero: km, tempo) | Bold 700 | 28–34 |
| Título de tela | SemiBold 600 | 20–24 |
| Título de card | SemiBold 600 | 15–17 |
| Corpo | Regular 400 | 13–14 |
| Apoio/label | Regular 400 | 11–12 |
| Overline (labels de seção) | Medium 500, caps, letter-spacing 1.2px | 10 |
| Dados em métrica | SemiBold 600 | 13–15 |

Números grandes sempre com unidade menor e em `text.secondary` (ex.: **482** km).

---

## 4. Iconografia

- Estilo **outline**, traço **1.5px**, cantos arredondados (referência: Tabler Icons).
- Tamanhos: 14–16 inline, 20–22 navegação, 24 máx decorativo.
- Cor padrão `text.secondary`/`text.muted`; **laranja apenas no item ativo ou no acento da tela** — nunca todos coloridos.
- Set base: painel (layout-grid), calendário, treino (run), estatísticas (chart-bar), meta (target), chat (message-circle), perfil (user), ajustes (settings), streak (flame), alerta (alert-triangle).

---

## 5. Elementos gráficos

- **Faixas diagonais** (skew -24°) alternando `surface.0`/laranja — energia/velocidade. Uso decorativo pontual, **nunca atrás de texto**.
- **Grade de pontos** — textura sutil; pontos `#A5A6A6`, com 2–3 acesos em laranja.
- **Tiles sólidos** laranja/preto e **barras inclinadas** `//` como assinatura visual.

---

## 6. Gradientes

### Da marca

| Nome | Definição | Uso |
|---|---|---|
| **Wordmark** | `linear · #FDE6D3 → #CC3F04` (o gradiente oficial da `logo-2`) | Referência-mãe dos degradês; texto/título premium pontual |
| **Brasa** | `linear 135° · #FF7A38 0% → #FF5500 55% → #CC3F04 100%` | CTAs primários, barras de progresso, pílula de streak |
| **Asfalto** | `linear 135° · #120E09 0% → #1C1208 45% → #732F03 78% → #FF5500 100%` | Fundos hero de marketing, card da meta/prova |

### De componente (estudo Fintrixity)

| Nome | Definição | Uso |
|---|---|---|
| **Brasa Radiante** | `radial 130% 140% at 18% 0% · #FF8A47 0% → #FF5500 48% → #B83A00 100%` | O card hero da tela (hotspot de luz no canto superior esquerdo) |
| **Elevação** | `linear 180° · #22201D 0% → #1B1917 100%` | Cards escuros em destaque (topo sutilmente mais claro) |
| **Barra Acesa** | `linear 180° · #FF5500 0% → #FF8A47 62% → #FDE6D3 100%` | Elemento selecionado em gráficos (barra do dia, ponto ativo) |

### Regras de uso

1. **Regra do farol:** no máximo **1 elemento hero em gradiente laranja por tela** + micro-acentos (pills, status, item ativo, barra selecionada). Todo o resto fica na escada neutra.
2. Brasa nunca como fundo de texto longo — só elementos pequenos.
3. Asfalto/Brasa Radiante aceitam texto apenas na zona escura (branco) ou branco sobre laranja com peso ≥600.
4. Em fundo claro, texto laranja usa `orange.600 #CC3F04` (contraste), nunca `#FF5500`.

---

## 7. Anatomia de componentes

### Card escuro (padrão)
- Fundo `surface.2` (ou gradiente Elevação em destaque)
- Raio **12–14px** · padding 14–16
- Borda 1px `rgba(255,255,255,0.07)` + aresta superior `0.13`
- Conteúdo aninhado sempre **um degrau acima** na escada (`surface.3`)

### Botões (pílula, raio 99px)
- **Primário:** gradiente Brasa (ou `#FF5500` sólido), texto `#120E09` SemiBold — em telas de app; branco sobre laranja no hero de marketing
- **Secundário:** transparente, borda `rgba(255,255,255,0.10)`, texto `#F7F6F4`
- **Terciário/ghost:** sem borda, texto `text.secondary`

### Pills de status/metadados
- Fundo `surface.3` (neutra) ou `orange.dim #331A08` com texto `#FF7A38` (acento)
- Ex.: streak `🔥 7 dias` = flame + `orange.dim`/`#FF7A38`, SemiBold 600

### Gráficos
- Barras inativas: `surface.4`, raio superior 6px
- Barra/ponto selecionado: gradiente **Barra Acesa** + label do eixo em `#FF7A38`
- Tooltip: `surface.4`, hairline, raio 8px

### Navegação
- Item ativo: fundo `surface.2` + hairline + ícone `#FF7A38` + texto branco
- Itens inativos: ícone `#8B8884`, texto `text.secondary`, sem fundo

---

## 8. Espaçamento e forma

- Escala: 4 / 8 / 12 / 16 / 20 / 24 / 32
- Raios: 6 (chips pequenos) · 8 (inputs) · 12 (cards) · 14–16 (cards hero) · 99 (pílulas/botões)
- Densidade: labels pequenos (10–11) + números grandes — cards respiram com padding ≥14

---

## 9. Acessibilidade

- Texto laranja sobre claro: sempre `#CC3F04`+
- Texto sobre laranja preenchido: `#120E09` (app) ou branco ≥600 (marketing) — nunca cinza
- Corpo de texto nunca abaixo de 11
- Contraste mínimo AA nos pares definidos acima; `text.muted` apenas para conteúdo não essencial

---

## 10. Blueprints de telas (app do aluno)

Estruturas validadas. Referências de inspiração: apps fitness (semana com status, métricas com comparativo, anel de meta) e apps de agenda/wellness (saudação compacta, seções "label + ver todas"). Acento sempre laranja (nas referências era verde-neon).

### Home / "Hoje"
Ordem vertical (topo → base):
1. **Cabeçalho:** avatar + saudação ("Bom dia, {nome}") · à direita **pílula de streak** (🔥 N em `orange.dim`) + sino de notificação.
2. **Sua semana:** label overline + pílula "Semana X de Y" (navegação do ciclo do plano). Faixa de 7 dias com ponto de status sob cada um: verde = concluído, vermelho = perdido, sem ponto = descanso; dia atual em pílula `orange.500` cheia.
3. **Treino de hoje (hero/farol):** card em gradiente Brasa Radiante — tipo (overline), título, resumo (dist · pace · duração), botão branco "Iniciar". É o único hero laranja da tela.
4. **Métricas da semana:** 2 cards lado a lado — distância (com delta vs. anterior em verde) e pace médio (com alvo do treinador).
5. **Meta semanal:** card horizontal com anel de progresso (%) + "N de M treinos" + chevron para detalhe.
6. **Próxima prova:** label "+ Ver todas"; card com ícone-alvo, nome/distância/data + estimativa do preditor, badge de countdown (dias).
7. **Treinador:** card com iniciais, "Seu treinador · {nome}", atalho para chat.
8. **Tab bar** (pílula): Hoje · Treinos · Agenda · Evolução. Item ativo em `orange.dim`/`orange.400`.

Fora da home (decisões YAGNI): sem seção social/"amigos"; chat mora na linha do treinador e no detalhe do treino, não na tab bar.

### Treinos (lista da semana)
1. Título "Treinos" + seletor "Semana X de Y".
2. Faixa de dias (igual à home).
3. **Treino de hoje destacado no topo**, acima da lista, em Brasa Radiante ("Iniciar" + "Detalhes").
4. **Lista da semana:** um card por treino com ícone de status (check verde = concluído, X vermelho = perdido, círculo tracejado = futuro). Card concluído expande com faixa interna `surface.3` mostrando o **realizado** (dados do Strava ou check manual: distância/tempo/pace/RPE). Treino perdido oferece atalho "Falar c/ treinador".

### Detalhe do dia
Blocos por `role` (Aquecimento → Principal → Desaquecimento), cada um: label overline + card. Bloco principal mostra estrutura de intervalos (reps @ pace + recuperação) com indicador de repetições. Comentário do treinador (`WorkoutComment`) em `surface.3`. Farol = CTA "Concluir treino" (Brasa); abaixo, atalho para parcial/não realizado.

### Regras transversais de tela
- **Um hero laranja por tela** (regra do farol). O resto na escada neutra.
- Tipo de treino identificado por **texto**, não por cor de borda (identidade mono-acento) — sem as bordas coloridas por categoria das referências.
- Toda seção usa label overline (10px, caps, `text.muted`) + opcional "Ver todas" à direita.

---

## 11. Implementação (`packages/ui`)

- Tokens exportados como objeto TS (`tokens.ts`) consumido por React Native (StyleSheet) e web (Tailwind config / CSS vars)
- Gradientes: `expo-linear-gradient` no mobile; CSS no web — mesmas paradas de cor definidas na seção 6
- Poppins via `expo-font` no mobile e `next/font` no web
- Ícones: `@tabler/icons-react-native` e `@tabler/icons-react`
