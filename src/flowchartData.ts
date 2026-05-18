export type NodeId = string;

export interface FlowNode {
  id: NodeId;
  type: 'question' | 'action' | 'choice';
  text: string;
  options?: {
    label: string;
    nextId: NodeId;
  }[];
  details?: string[];
  tips?: string[];
}

export const FLOWCHART_DATA: Record<NodeId, FlowNode> = {
  start: {
    id: 'start',
    type: 'question',
    text: 'O ANÚNCIO JÁ COMEÇOU A RECEBER IMPRESSÕES?',
    options: [
      { label: 'SIM', nextId: 'impressions_yes_24h' },
      { label: 'NÃO', nextId: 'impressions_no_24h' }
    ]
  },
  // Path: Impressions NO
  impressions_no_24h: {
    id: 'impressions_no_24h',
    type: 'question',
    text: 'JÁ SE PASSARAM MAIS DE 24 HORAS?',
    options: [
      { label: 'SIM', nextId: 'budget_small' },
      { label: 'NÃO', nextId: 'wait_impressions' }
    ]
  },
  budget_small: {
    id: 'budget_small',
    type: 'action',
    text: 'O PÚBLICO OU O ORÇAMENTO PODEM ESTAR PEQUENOS. O LANCE MANUAL DE PREÇO PODE ESTAR MUITO BAIXO.',
    tips: ['Verifique o tamanho do público', 'Aumente o orçamento diário', 'Confira se o lance manual não está travando a entrega']
  },
  wait_impressions: {
    id: 'wait_impressions',
    type: 'action',
    text: 'AGUARDE.',
    tips: ['O Facebook pode levar algum tempo para processar e começar a entregar novos anúncios.']
  },
  // Path: Impressions YES
  impressions_yes_24h: {
    id: 'impressions_yes_24h',
    type: 'question',
    text: 'JÁ SE PASSARAM MAIS DE 24 HORAS?',
    options: [
      { label: 'SIM', nextId: 'ctr_check' },
      { label: 'NÃO', nextId: 'wait_ticket_spend' }
    ]
  },
  wait_ticket_spend: {
    id: 'wait_ticket_spend',
    type: 'action',
    text: 'AGUARDE ATÉ GASTAR O VALOR DE 1 TICKET.',
    tips: ['Não tome decisões precipitadas antes de ter dados suficientes de gasto.']
  },
  ctr_check: {
    id: 'ctr_check',
    type: 'question',
    text: 'O CTR DE LINK ESTÁ ACIMA DE 2%?',
    options: [
      { label: 'SIM', nextId: 'any_sale_yes' },
      { label: 'NÃO', nextId: 'any_sale_no_ctr' }
    ]
  },
  // Path: CTR > 2%
  any_sale_yes: {
    id: 'any_sale_yes',
    type: 'question',
    text: 'JÁ HOUVE ALGUMA VENDA?',
    options: [
      { label: 'SIM', nextId: 'roi_check' },
      { label: 'NÃO', nextId: 'spend_ticket_check' }
    ]
  },
  roi_check: {
    id: 'roi_check',
    type: 'question',
    text: 'O CRIATIVO ESTÁ COM ROI POSITIVO CONTANDO SÓ COM AS VENDAS NO CARTÃO ATÉ O MOMENTO?',
    options: [
      { label: 'SIM', nextId: 'scale_action' },
      { label: 'NÃO', nextId: 'options_4' }
    ]
  },
  scale_action: {
    id: 'scale_action',
    type: 'action',
    text: 'ACOMPANHE E ESCALE',
    tips: ['Mantenha a campanha rodando', 'Aumente o orçamento gradualmente (15-20% a cada 24-48h)']
  },
  options_4: {
    id: 'options_4',
    type: 'choice',
    text: 'VOCÊ TEM 4 OPÇÕES:',
    options: [
      { label: 'OPÇÃO 1', nextId: 'opt1' },
      { label: 'OPÇÃO 2', nextId: 'opt2' },
      { label: 'OPÇÃO 3', nextId: 'opt3' },
      { label: 'OPÇÃO 4', nextId: 'opt4' }
    ]
  },
  opt1: {
    id: 'opt1',
    type: 'action',
    text: 'DEIXAR A CAMPANHA RODANDO POR MAIS 2 DIAS E OBSERVE DE FORMA ISOLADA SE O PRIMEIRO DIA IRÁ SE PAGAR DE ACORDO COM AS CONVERSÕES DE BOLETOS QUE CAIREM NO TERCEIRO DIA DE CAMPANHA. SE O TERCEIRO DIA NÃO PAGAR O PRIMEIRO DIA, PAUSE.',
    tips: ['DICA DE OTIMIZAÇÃO AO CHEGAR NO TERCEIRO DIA: Se até o terceiro dia tivermos vendas no cartão, detalhe a campanha em 3 dados demográficos observando o menor CPA de cartão entre eles: 1- Idade; 2- Estado e Região; 3- Posicionamento. Crie um conjunto somente com os 3 dados demográficos de menor CPA no cartão.']
  },
  opt2: {
    id: 'opt2',
    type: 'action',
    text: 'USAR A FERRAMENTA HOTZAPP PARA CONVERTER AS PESSOAS QUE GERARAM BOLETOS VIA WHATSAPP.',
    tips: ['Se você for afiliado, pode fazer isso desde que o produtor te dê autorização.']
  },
  opt3: {
    id: 'opt3',
    type: 'action',
    text: 'DUPLIQUE E PAUSE. O OBJETIVO É RESETAR A OTIMIZAÇÃO PARA UMA NOVA CAMPANHA COM POSSÍVEIS VENDAS NO CARTÃO.'
  },
  opt4: {
    id: 'opt4',
    type: 'action',
    text: 'CRIE UMA BOA CAMPANHA DE REMARKETING NO FACEBOOK PARA IMPULSIONAR SUAS CONVERSÕES E DIMINUIR SEUS CUSTOS COM ANÚNCIOS.',
    tips: ['Crie 2 conjuntos para remarketing nessa ordem: 1- INITIATE CHECKOUT (pessoas do evento de finalização de carrinho); 2- PAGEVIEW (pessoas que visitaram a página de vendas e não compraram).']
  },
  // Path: Spend Ticket Check
  spend_ticket_check: {
    id: 'spend_ticket_check',
    type: 'question',
    text: 'O ANÚNCIO JÁ GASTOU PELO MENOS O VALOR DE 1 TICKET MÍNIMO?',
    options: [
      { label: 'SIM', nextId: 'congruence_check' },
      { label: 'NÃO', nextId: 'wait_ticket_spend' }
    ]
  },
  congruence_check: {
    id: 'congruence_check',
    type: 'question',
    text: 'SEU ANÚNCIO ESTÁ 100% CONGRUENTE COM O QUE O VISITANTE ESPERA VER NA PÁGINA DE DESTINO?',
    options: [
      { label: 'SIM', nextId: 'initiate_checkout_check' },
      { label: 'NÃO', nextId: 'adjust_copy' }
    ]
  },
  adjust_copy: {
    id: 'adjust_copy',
    type: 'action',
    text: 'AJUSTE A COPY DO ANÚNCIO DE ACORDO COM O CONTEÚDO DA PÁGINA DE DESTINO, OU VICE-VERSA.',
    options: [
      { label: 'FIZ O AJUSTE / AJUSTEI', nextId: 'wait_24h_adjust' }
    ]
  },
  wait_24h_adjust: {
    id: 'wait_24h_adjust',
    type: 'action',
    text: 'AGUARDE 24H APÓS O AJUSTE E ANALISE O CTR DE LINK SOMENTE DAS ÚLTIMAS 24H. O CTR DE LINK CHEGOU A 2%?',
    options: [
      { label: 'SIM', nextId: 'any_sale_yes' },
      { label: 'NÃO', nextId: 'creative_test_check' }
    ]
  },
  initiate_checkout_check: {
    id: 'initiate_checkout_check',
    type: 'question',
    text: 'O ANÚNCIO JÁ OBTEVE ALGUM EVENTO DE INITIATE CHECKOUT NO PIXEL?',
    options: [
      { label: 'SIM', nextId: 'strategy_check' },
      { label: 'NÃO', nextId: 'pixel_check' }
    ]
  },
  pixel_check: {
    id: 'pixel_check',
    type: 'question',
    text: 'CONFIRA SE O PIXEL ESTÁ DEVIDAMENTE INSTALADO NA PLATAFORMA DE VENDAS. O PIXEL ESTÁ OK?',
    options: [
      { label: 'ESTÁ', nextId: 'pixel_ok_analysis' },
      { label: 'NÃO ESTAVA', nextId: 'pixel_not_ok_action' }
    ]
  },
  pixel_not_ok_action: {
    id: 'pixel_not_ok_action',
    type: 'action',
    text: 'RECOMENDO DUPLICAR O ANÚNCIO ATUAL E RECOMEÇAR A ANÁLISE DO ZERO. PERDEMOS A OTIMIZAÇÃO.'
  },
  pixel_ok_analysis: {
    id: 'pixel_ok_analysis',
    type: 'action',
    text: 'COM 1 VALOR DE COMISSÃO GASTOS, CTR DE LINK ACIMA DE 2% E ANÚNCIO CONGRUENTE COM A PÁGINA DE VENDAS, TEMOS UM PROBLEMA QUE POSSIVELMENTE ESTÁ ALÉM DO SEU ANÚNCIO.',
    tips: [
      '1 - PROBLEMA NA ESTRUTURA DE DESTINO.',
      '2 - COPY DO PRODUTO MUITO FRACA, SEM PROPOSTA ÚNICA.',
      '3 - SAZONALIDADES COM O NICHO OU PRODUTO ESPECÍFICO.'
    ]
  },
  strategy_check: {
    id: 'strategy_check',
    type: 'choice',
    text: 'QUAL ESTRATÉGIA ESTÁ UTILIZANDO?',
    options: [
      { label: 'MANYCHAT', nextId: 'manychat_action' },
      { label: 'TRÁFEGO DIRETO', nextId: 'direct_traffic_action' }
    ]
  },
  manychat_action: {
    id: 'manychat_action',
    type: 'action',
    text: 'CONFIRA SE NÃO HÁ NENHUM ERRO COM O ENVIO DA PRIMEIRA MENSAGEM. ABRA O LINK PELO CELULAR E FAÇA TODO PROCESSO DE NAVEGAÇÃO DO CLIENTE ATÉ O CHECKOUT. VEJA SE NÃO HÁ NENHUM BUG NAS PÁGINAS OU DEMORA ABSURDA NO TEMPO DE CARREGAMENTO DE ALGUMA PÁGINA. (MAIS DE 4 SEGUNDOS)',
    tips: ['SE TUDO ESTIVER 100% OK, CONSIDERE MUDAR A ESTRATÉGIA OU AUMENTAR O NÚMERO DE MENSAGENS NA SEQUÊNCIA AUTOMÁTICA DO MANYCHAT PARA AUMENTAR O LTV DO FUNIL.']
  },
  direct_traffic_action: {
    id: 'direct_traffic_action',
    type: 'action',
    text: 'AÇÕES PARA TRÁFEGO DIRETO:',
    tips: [
      '1 - CONFIRA O TEMPO DE CARREGAMENTO DA PÁGINA DE DESTINO NO SITE PINGDOM. ELA DEVE TER MENOS DE 4 SEGUNDOS.',
      '2 - SIMULE O EXATO CAMINHO DO CLIENTE DESDE O LINK DO ANÚNCIO ATÉ O CHECKOUT USANDO O SEU CELULAR.',
      '3 - SE HOUVER ALGUMA PRE-SELL ANTES DA PÁGINA DE VENDAS, COMO ADVERTORIAL OU QUIZZ, CONSIDERE TROCÁ-LOS OU AJUSTÁ-LOS DIMINUINDO ETAPAS, MELHORANDO A COPY OU DIMINUINDO TAMANHO DO FUNIL NO PRE-SELL.',
      'OBS: PARA CADA ALTERAÇÃO, DEVE CONSIDERAR UM TESTE 100% NOVO.'
    ]
  },
  // Path: CTR < 2% or No Sales
  any_sale_no_ctr: {
    id: 'any_sale_no_ctr',
    type: 'question',
    text: 'AINDA ASSIM HOUVE ALGUMA VENDA?',
    options: [
      { label: 'SIM', nextId: 'spend_ticket_check' },
      { label: 'NÃO', nextId: 'creative_test_check' }
    ]
  },
  creative_test_check: {
    id: 'creative_test_check',
    type: 'question',
    text: 'JÁ UTILIZOU O MÉTODO DE TESTE DE CRIATIVOS, CRIANDO 5 CONJUNTOS COM 2 CRIATIVOS EM CADA?',
    options: [
      { label: 'SIM', nextId: 'broad_targeting_check' },
      { label: 'NÃO', nextId: 'use_5x10_method' }
    ]
  },
  use_5x10_method: {
    id: 'use_5x10_method',
    type: 'action',
    text: 'UTILIZE O MÉTODO 5X10 PARA TESTE DE CRIATIVOS COM 5 CONJUNTOS DE SEGMENTAÇÕES IGUAIS. CADA CONJUNTO COM 2 CRIATIVOS DE IMAGEM E HEADLINE DIFERENTES. TOTALIZANDO 10 ANÚNCIOS DISTINTOS. O ORÇAMENTO DEVE SER COLOCADO NO CONJUNTO. AQUI VÃO 3 OPÇÕES:',
    tips: [
      '1 - COMEÇAR COM R$ 20,00 E DEIXAR OTIMIZANDO POR 24H',
      '2 - COMEÇAR COM O VALOR DO SEU CPA IDEAL',
      '3 - COMEÇAR COM O VALOR DA SUA COMISSÃO',
      '4 - COMEÇAR COM O VALOR DO TICKET MÍNIMO DO PRODUTO',
      'ASSISTA A AULA O TESTE INFALÍVEL PARA O MELHOR ANÚNCIO NO MÓDULO 2'
    ]
  },
  broad_targeting_check: {
    id: 'broad_targeting_check',
    type: 'question',
    text: 'O PÚBLICO NO SEU CONJUNTO DE ANÚNCIO ESTÁ COM A SEGMENTAÇÃO MAIS ABERTA POSSÍVEL?',
    options: [
      { label: 'SIM', nextId: 'final_alternative' },
      { label: 'NÃO', nextId: 'create_broad_set' }
    ]
  },
  create_broad_set: {
    id: 'create_broad_set',
    type: 'action',
    text: 'CRIE UM CONJUNTO NOVO COM PÚBLICO ABERTO.',
    tips: [
      'IDADE: MÍNIMA A IDADE MÁXIMA COMPRADORA.',
      'GÊNERO: DEPENDENDO DO NICHO, SÓ UM SEXO SELECIONADO, OU OS DOIS AO MESMO TEMPO.',
      'REGIÃO: TODO O BRASIL',
      'INTERESSES: ABERTO',
      'POSICIONAMENTOS: ABERTOS'
    ]
  },
  final_alternative: {
    id: 'final_alternative',
    type: 'action',
    text: 'NESTE CASO, ALTERNATIVA FINAL: VAMOS TESTAR OS PÚBLICOS. SEU NICHO PODE SER PEQUENO E POR ISSO AVANÇAREMOS PRO TESTE DE PÚBLICOS, ESPECIFICANDO O QUE QUEREMOS NA SEGMENTAÇÃO.',
    tips: ['ASSISTA A AULA O TESTE INFALÍVEL PARA O MELHOR PÚBLICO NO MÓDULO 2.']
  }
};
