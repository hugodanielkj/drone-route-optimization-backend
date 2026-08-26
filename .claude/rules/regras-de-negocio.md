# Regras de Negócio — Sistema de Otimização de Rotas para Drones de Irrigação

## Visão geral

O sistema calcula a rota de menor custo energético para um drone agrícola percorrer um
conjunto de pontos de irrigação, partindo e retornando sempre a um único ponto de
carregamento, respeitando a capacidade operacional do drone. O núcleo do sistema é um
motor de cálculo determinístico: dado um drone e um mapa, ele sempre produz o mesmo
resultado. O sistema é multiusuário: cada usuário cadastra e gerencia seus próprios
drones, mapas e missões calculadas.

## Escopo desta fase

Este documento descreve exclusivamente as regras de negócio do **backend**. Não há
frontend nesta fase. Autenticação básica faz parte do escopo, com o objetivo específico
de validar conhecimento sobre o mecanismo — não de entregar uma experiência de conta
pronta para produção. Decisões explicitamente fora de escopo neste momento estão
listadas na seção correspondente e devem ser revisitadas conforme o projeto evoluir.

## Glossário (linguagem onipresente)

| Termo | Significado |
|---|---|
| **Usuário** | Dono de seus próprios drones, mapas e missões. Cadastrado apenas com nome e senha. |
| **Drone** | Veículo com características físicas (consumo por irrigação, velocidade média, capacidade de bateria) que determinam sua capacidade operacional. Pertence a um usuário. |
| **Mapa** | Representa uma área de operação: um único ponto de carregamento e uma lista de pontos de irrigação. Pertence a um usuário. |
| **Coordenada** | Um par de posição (x, y). Não tem identidade própria, nem tipo — seu papel (carregamento ou irrigação) é definido por onde ela está referenciada dentro do Mapa. |
| **Ponto de carregamento** | A coordenada de origem e retorno de toda perna de rota dentro de um mapa. |
| **Pontos de irrigação** | As coordenadas que o drone precisa visitar. |
| **Perna de rota** | Um trecho de voo que parte do ponto de carregamento, visita um subconjunto de pontos de irrigação, e retorna ao ponto de carregamento, sem exceder a capacidade operacional do drone. |
| **Missão** | O resultado persistido de um cálculo de rota para um par (drone, mapa): a lista de pernas de rota geradas e o consumo energético total. Única por par (drone, mapa). |
| **Consumo energético total** | Soma dos consumos energéticos (fórmula de `consumo_trecho`, em joules) de todos os trechos de todas as pernas de rota de uma missão. |

## Entidades e objetos de valor

### Usuário (entidade)

- **Atributos:** nome, senha.
- **Invariante:** a senha nunca é armazenada em texto plano — apenas seu hash é
  persistido.
- **Não há recuperação de senha nesta fase.** Se o usuário perder a senha, perde
  acesso permanentemente aos seus dados (drones, mapas e missões associados). Essa é
  uma decisão deliberada de escopo: o objetivo é validar o mecanismo de autenticação
  em si, não construir um fluxo completo de recuperação de conta.
- É o dono de seus Drones e Mapas.

### Drone (entidade)

Possui identidade própria e é reutilizável — o mesmo drone pode ser usado em cálculos
com diferentes mapas do mesmo usuário, em momentos diferentes.

- **Pertence a um Usuário.**
- **Atributos:** nome, consumo por irrigação, velocidade média, capacidade de
  bateria (energia total disponível por carga completa).
- **Invariante:** todos os valores numéricos (consumo, velocidade média, capacidade
  de bateria) devem ser positivos.
- **Modelo de consumo por trecho:** a cada ponto de irrigação já atendido em uma
  perna, o peso da carga restante diminui em uma unidade multiplicada pelo consumo
  por irrigação — ou seja, o peso de carga (`payload`) considerado em um trecho
  específico é o número de entregas ainda não realizadas naquele ponto do percurso,
  multiplicado pelo consumo por irrigação.
  - **Fórmula do consumo de um trecho a→b:**
    `consumo_trecho = (P × payload + alpha) × (distância(a,b) / velocidade_média + tempo_no_ponto)`
    - `payload = entregas_não_realizadas_no_trecho × consumo_por_irrigação` (kg).
    - `velocidade_média` é o atributo do Drone (m/s) — substitui, por drone, a
      constante de velocidade da fórmula original.
    - `P = 238.64` (watts/kg) e `alpha = 4396.1` (watts) são constantes fixas do
      sistema, iguais para todos os drones.
    - `tempo_no_ponto = 8.3` segundos (constante fixa do sistema) é somado **apenas
      quando `b` é um ponto de irrigação**. Quando `b` é o ponto de carregamento,
      `tempo_no_ponto = 0` — chegar lá não consome bateria por tempo parado, pois a
      bateria é recarregada, não consumida, nesse ponto.
    - O resultado é em watts·segundo = joules.
  - **Referência de implementação (idealização fornecida para o cálculo):**
    ```cpp
    float batteryConsumption(const float& payload, const Coordinate& a, const Coordinate& b) {
        float distance = distanceBetweenTwoCoordinates(a, b); // euclidiana
        const float P = 238.64;              // watts/kg
        const float velocidade_media = ...;  // m/s — atributo do Drone, não mais constante
        const float time_in_each_spot = 8.3; // s — só quando b é ponto de irrigação
        const float alpha = 4396.1;          // watts
        float powerConsumption = (P * payload + alpha) * (distance / velocidade_media + time_in_each_spot);
        return powerConsumption; // joules
    }
    ```

### Mapa (entidade, agregado raiz)

Representa uma área de operação. É o "dono" de suas coordenadas — nenhuma coordenada
existe ou é modificada fora do contexto de um mapa específico.

- **Pertence a um Usuário.**
- **Atributos:** um único ponto de carregamento (coordenada), uma lista de um ou mais
  pontos de irrigação (coordenadas).
- **Invariante:** a lista de pontos de irrigação nunca pode ficar vazia. Um mapa sem
  nenhum ponto de irrigação não tem propósito — não há o que calcular.
- **Encapsulamento:** alterações nos pontos de irrigação ou no ponto de carregamento
  acontecem através de operações do próprio mapa, nunca por manipulação direta de uma
  lista externa a ele.

### Coordenada (objeto de valor)

- **Atributos:** posição (x, y).
- Não possui identidade própria, não é consultada isoladamente, e não carrega um campo
  de "tipo" — seu papel é inteiramente definido pela posição estrutural em que aparece
  dentro do Mapa (o campo de ponto de carregamento vs. a lista de pontos de irrigação).
- Imutável: qualquer alteração produz uma nova coordenada, nunca modifica a existente
  no lugar.
- **Métrica de distância:** a distância entre duas coordenadas é sempre a distância
  euclidiana (linha reta), usada em todas as etapas do cálculo de rota (ordenação
  inicial, 2-opt, divisão em pernas, `move`).

### Perna de rota (objeto de valor)

- **Atributos:** sequência ordenada de coordenadas visitadas (sempre iniciando e
  terminando no ponto de carregamento do mapa) e a distância total percorrida nesse
  trecho.
- Não possui identidade própria. Existe embutida dentro de uma Missão — não é
  consultada nem referenciada isoladamente, nem persistida em uma tabela própria.

### Missão (entidade)

- **Associada a um Drone e a um Mapa.** A combinação (drone, mapa) é única: não pode
  existir mais de uma missão persistida para o mesmo par.
- **Atributos:** lista de pernas de rota, consumo energético total, status (ativa |
  desativada).
- **Invariante de autorização:** o Drone e o Mapa referenciados por uma missão devem
  pertencer ao mesmo Usuário que solicitou o cálculo.
- **Status:** toda missão nasce com status ativa. Editar o Mapa ou o Drone
  associados desativa a missão — e qualquer outra missão que também referencie o
  mesmo Mapa ou o mesmo Drone editado, já que ambos podem ser reutilizados em mais
  de uma missão.

## Processo de cálculo de rota

Dado um Drone e um Mapa, o cálculo de uma missão segue cinco etapas:

1. **Ordenação inicial** — os pontos de irrigação são ordenados a partir do ponto de
   carregamento, usando uma heurística de vizinho mais próximo, formando um trajeto
   guloso que visita todos os pontos.
2. **2-opt no trajeto completo** — antes de dividir em pernas, o trajeto inteiro
   passa por 2-opt (revertendo segmentos que reduzem a distância total), repetido
   até não haver mais melhoria possível.
3. **Divisão em pernas de rota** — esse trajeto já otimizado é dividido em uma ou
   mais pernas, cada uma partindo e retornando ao ponto de carregamento, de forma
   que nenhuma perna exceda a capacidade de bateria do drone.
4. **`move` entre pernas** — realoca pontos de irrigação de uma perna para outra
   quando isso reduz o consumo energético combinado das duas pernas envolvidas.
   Repetido até não haver mais realocação que produza melhoria.
5. **2-opt por perna** — cada perna, individualmente, passa novamente por 2-opt,
   repetido até não haver mais melhoria, da mesma forma que na etapa 2 — necessário
   porque a etapa 4 pode ter alterado a composição de pontos de cada perna.

**Nota sobre `move`:** a variante adotada prioriza reduzir o consumo de bateria
combinado das duas pernas envolvidas na troca, não a distância bruta. Por decisão
deliberada, ela não recalcula se as duas pernas resultantes continuam
operacionalmente viáveis depois da troca.

O resultado final agrega todas as pernas otimizadas e o consumo energético total
(soma dos consumos energéticos ponderados — fórmula de `consumo_trecho` — de todos os
trechos de todas as pernas).

Se o drone não conseguir alcançar sequer o ponto de irrigação mais próximo do ponto de
carregamento, considerando ida e volta, dentro de sua capacidade de bateria (RN05), o
cálculo não é executado até o fim: a API responde com erro, e nenhuma Missão é criada
ou atualizada para aquele par (drone, mapa).

**Determinismo:** este cálculo não possui nenhuma etapa aleatória. Para o mesmo par
(drone, mapa), o resultado é sempre idêntico, em qualquer execução.

## Missão — reaproveitamento, desativação e reativação

- Ao solicitar o cálculo para um par (Drone, Mapa), o sistema verifica se já existe
  uma Missão persistida para esse par exato.
- Se não existir, o cálculo é executado e uma nova Missão é criada, com status
  ativa.
- Se existir e estiver **ativa**, o resultado já persistido é retornado
  diretamente, sem recalcular.
- Se existir e estiver **desativada**, o sistema recalcula a rota, atualiza essa
  mesma missão (mesma identidade, novas pernas de rota e novo consumo energético) e
  reativa seu status.
- Editar o Mapa ou o Drone associados a uma missão desativa essa missão — e
  qualquer outra que também referencie o mesmo Mapa ou o mesmo Drone editado.
- Essa lógica continua segura porque o cálculo é determinístico (RN06): recalcular
  e reativar sempre produz o resultado correto para o par no seu estado mais
  recente, sem precisar de invalidação em cascata mais elaborada.

## Regras de negócio

- **RN01** — Um Mapa deve conter exatamente um ponto de carregamento e ao menos um
  ponto de irrigação.
- **RN02** — Os atributos numéricos de um Drone (consumo por irrigação, velocidade
  média, capacidade de bateria) devem ser valores positivos.
- **RN03** — Toda perna de rota inicia e termina no ponto de carregamento do mapa ao
  qual pertence.
- **RN04** — O consumo energético total de uma perna de rota (do ponto de
  carregamento, pelos pontos de irrigação visitados, de volta ao ponto de
  carregamento) não pode exceder a capacidade de bateria do drone usado no cálculo.
- **RN05** — Se o drone não conseguir alcançar sequer o ponto de irrigação mais
  próximo do ponto de carregamento (considerando ida e volta) dentro de sua
  capacidade de bateria, o cálculo deve reportar que nenhuma rota viável existe para
  aquele par (drone, mapa).
- **RN06** — O cálculo de rota é determinístico: para o mesmo par (drone, mapa), o
  resultado é sempre o mesmo.
- **RN07** — Um mesmo Drone pode ser usado em cálculos com múltiplos Mapas
  diferentes, desde que pertencentes ao mesmo usuário; ele não pertence a um único
  mapa.
- **RN08** — Pontos de irrigação e o ponto de carregamento só podem ser criados,
  alterados ou removidos através de operações do Mapa ao qual pertencem.
- **RN09** — Um usuário se cadastra apenas com nome e senha. A senha é armazenada
  exclusivamente como hash, nunca em texto plano.
- **RN10** — Não existe mecanismo de recuperação de senha. A perda da senha implica
  perda permanente de acesso aos dados do usuário.
- **RN11** — Drones e Mapas pertencem a um usuário. Um usuário só pode utilizar, em
  um cálculo de missão, drones e mapas que lhe pertencem.
- **RN12** — Para um mesmo par (drone, mapa), existe no máximo uma Missão
  persistida. Uma nova solicitação de cálculo para um par já calculado, com a
  missão **ativa**, retorna a missão existente, sem reprocessar.
- **RN13** — Editar um Mapa ou um Drone desativa toda Missão que os referencie (o
  status muda de ativa para desativada).
- **RN14** — Uma solicitação de cálculo para um par (drone, mapa) cuja Missão
  existente está desativada recalcula a rota, atualiza essa mesma missão (mesma
  identidade, novo resultado) e reativa seu status.
- **RN15** — Um Drone ou Mapa referenciado por qualquer Missão (ativa ou
  desativada) não pode ser excluído. A exclusão só é permitida quando não existe
  nenhuma Missão associada.

## Fora de escopo nesta fase

- **Recuperação de senha** — perda de acesso é aceitável nesta fase; o objetivo da
  autenticação é demonstrar domínio do mecanismo, não fornecer uma experiência de
  produção.
- **Controle de acesso por papéis/permissões (roles)** — apenas posse (ownership)
  simples: um usuário só acessa o que criou.
- **Múltiplos pontos de carregamento por mapa** — o sistema assume um único ponto de
  carregamento por mapa. Suportar múltiplos exigiria decidir, a cada retorno, qual
  ponto de carregamento é o mais vantajoso — um problema mais próximo de um
  roteamento multi-depósito, fora do escopo atual.
- **Frontend** — este documento cobre exclusivamente as regras de negócio do backend.
- **Peso do drone sem carga e peso máximo da carga como atributos do Drone** —
  removidos por enquanto, já que não são usados pela fórmula de consumo atual.
  Serão reintroduzidos futuramente se o modelo energético precisar deles.

## Decisões de design e justificativas

- **Coordenada não tem campo de tipo.** O papel de cada coordenada (carregamento ou
  irrigação) já é definido por qual atributo do Mapa a referencia. Adicionar um campo
  de tipo criaria uma segunda fonte de verdade para a mesma informação, abrindo
  espaço para inconsistência.
- **Coordenada e Perna de rota são objetos de valor, não entidades.** Nenhuma das
  duas é consultada, referenciada ou faz sentido fora do agregado ao qual pertence
  (Mapa e Missão, respectivamente) — não possuem identidade nem ciclo de vida
  próprios.
- **Drone permanece uma entidade com identidade própria e CRUD dedicado.** Diferente
  de uma coordenada isolada, um drone é genuinamente reutilizado entre diferentes
  mapas e cálculos do mesmo usuário, justificando existência e identidade
  independentes.
- **Missão passou a ser uma entidade persistida, com unicidade por par (drone,
  mapa).** Como o sistema agora possui banco de dados e o objetivo inclui cobertura
  completa de persistência, reaproveitar um resultado já calculado evita
  reprocessamento redundante. Isso é seguro porque o cálculo é determinístico
  (RN06) — não existe risco de servir um resultado desatualizado, porque o status
  da missão trata explicitamente o caso de edição posterior (ver abaixo).
- **Invalidação de Missão via status, não via exclusão.** Editar o Mapa ou o Drone
  não apaga a Missão existente nem cria uma nova — apenas desativa a que já existe.
  O próximo cálculo solicitado para aquele par reaproveita a mesma identidade,
  atualizando seu conteúdo e reativando o status. Isso evita acumular missões
  obsoletas no banco e mantém a garantia de unicidade por par (RN12) intacta mesmo
  depois de edições.
- **Senha armazenada como hash.** Independentemente da ausência de recuperação de
  senha, armazenar a senha em texto plano nunca é aceitável — é um princípio básico
  de segurança que independe do estágio ou escopo do projeto.
- **Ordem do pipeline de otimização confirmada.** 2-opt roda no trajeto completo
  antes da divisão em pernas (repetido até convergência); depois da divisão, `move`
  redistribui pontos entre pernas para reduzir consumo combinado (repetido até
  convergência); por fim, 2-opt roda novamente, agora por perna individual, para
  corrigir ineficiências locais que o `move` possa ter introduzido ao alterar a
  composição de cada perna.
- **Ausência de checagem de viabilidade após `move` é intencional.** A variante
  adotada não recalcula, depois de uma troca, se as duas pernas resultantes
  continuam dentro da capacidade de bateria do drone — isso é uma decisão de
  design, não uma lacuna a ser corrigida.
- **Papel do consumo por irrigação na fórmula de consumo.** O peso da carga
  considerado em cada trecho é o número de entregas ainda não realizadas
  multiplicado pelo consumo por irrigação — não uma contagem bruta de pontos
  restantes.
- **Atributo do Drone renomeado de "velocidade máxima" para "velocidade média".**
  A fórmula de consumo energético por trecho (fornecida como idealização em C++)
  usa uma constante `average_speed`; essa constante foi substituída pelo atributo
  do Drone, e o atributo foi renomeado para refletir seu papel real na fórmula —
  velocidade média de deslocamento, não um limite máximo.
- **`P`, `alpha` e `tempo_no_ponto` são constantes fixas do sistema, não atributos
  do Drone.** Só `velocidade_média` e `consumo_por_irrigação` variam por drone;
  os demais parâmetros da fórmula de consumo são físicos/operacionais e iguais
  para todos os drones do sistema.
- **`tempo_no_ponto` só se aplica a trechos que terminam em ponto de irrigação.**
  Ao retornar ao ponto de carregamento, a bateria é recarregada, não consumida —
  o tempo parado ali não entra na fórmula de consumo.
- **Consumo energético total da Missão usa a mesma fórmula ponderada do RN04,
  agregada por trecho — não a soma bruta de distâncias.** Mantém a métrica
  consistente entre o valor validado contra a capacidade de bateria por perna e o
  valor agregado reportado pela Missão.
- **Rota inviável (RN05) não persiste Missão.** Quando nem o ponto de irrigação
  mais próximo é alcançável dentro da capacidade de bateria, a API retorna erro e
  nenhum registro de Missão é criado ou atualizado — não existe um status de
  "inviável" na entidade Missão, apenas ativa/desativada.