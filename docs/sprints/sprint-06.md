# Sprint 06 — Ciclo de vida e consulta de Missões

## Objetivo

Ao final desta sprint, o ciclo de vida completo de uma Missão está fechado:
reaproveitamento de missão ativa (RN12), recálculo e reativação de missão
desativada (RN14), e as consultas de listagem e detalhe — completando o backlog.

## Histórias

### 1. US-017 — Reaproveitar missão ativa existente

**Justificativa:** é o caso mais simples dos dois de reuso (apenas retornar o
que já está persistido, sem recalcular) — reutiliza a checagem de existência de
Missão para o par já implementada em US-016, sem tocar no pipeline. Vem antes de
US-018 por ter o menor risco dos dois.

### 2. US-018 — Recalcular e reativar missão desativada

**Justificativa:** depende diretamente do pipeline de US-016 (é o mesmo pipeline,
reexecutado) e reutiliza o padrão de verificação de status de US-017 — maior risco
que US-017 porque precisa também tratar o caso RN05 ocorrendo durante um
recálculo (a Missão permanece desativada, sem ser atualizada).

### 3. US-019 — Listar missões do usuário autenticado

**Justificativa:** leitura simples, sem efeitos colaterais — menor risco,
implementada depois que o ciclo de vida (US-016 a US-018) já garante que existem
missões em ambos os status para validar o retorno completo (ativas e
desativadas).

### 4. US-020 — Consultar detalhe de uma missão

**Justificativa:** fecha o backlog. Depende do mesmo padrão de busca por id +
ownership já validado nas demais entidades (Drone, Mapa), aplicado por último por
ser a consulta mais detalhada (pernas completas, consumo total, status).

## Definition of Done da sprint

- Testes automatizados cobrindo os critérios de aceite de US-017 a US-020,
  incluindo: nenhuma alteração de dados ao reaproveitar missão ativa (US-017);
  mesma identidade preservada e status revertido para ativa ao recalcular
  (US-018); Missão permanece desativada se o recálculo cair em RN05 (US-018);
  isolamento por usuário em listagem e consulta.
- Teste de integração adicional cobrindo o fluxo completo ponta a ponta: calcular
  Missão (US-016) → editar o Drone ou Mapa usado → Missão aparece desativada
  (RN13, já implementada com dados reais desde as Sprints 02/04, agora exercitada
  via uma Missão nascida do pipeline real, não de fixture) → excluir esse Drone
  ou Mapa continua bloqueado (RN15).
- Implementação de cada história documentada (`docs/implementation/`).
- `docs/architecture/` atualizado com o diagrama de arquitetura final do sistema
  (skill `diagrama-de-arquitetura`).
- Sem regressão: suíte completa (Sprints 01-06) passando — backlog encerrado.
