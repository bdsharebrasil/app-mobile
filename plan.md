# Plano — navegação mobile do plano de voo

## Escopo e abordagem

- Manter a arquitetura atual do repositório (`React 18 + TypeScript + Vite + HashRouter`, com experiência PWA/mobile-first). Não converter o app inteiro para React Native/Expo nem alterar os identificadores/serviços existentes.
- Tornar as áreas do plano de voo acessíveis por caminhos próprios sob `/plano-voo/*`, sincronizando a seção visível com o histórico/URL e preservando o formulário e os resultados enquanto a navegação acontece.
- Preservar os dois fluxos existentes: formulário ICAO persistido no Worker/D1 e planejador/cálculos persistidos no Supabase. Expor as seções operacionais já implementadas (aeródromo, meteorologia, cartas, NOTAM, resultados e listas salvas) sem misturar seus contratos.
- Ligar o planejador à consulta de rota preferencial já suportada por `GET /api/flightplan`, com escolha explícita do usuário e fallback às funções locais quando a consulta externa não estiver disponível.
- Habilitar exportação PDF do plano calculado com `jspdf` (já presente nas dependências), oferecendo compartilhamento nativo do navegador quando suportado e download como alternativa.
- Reutilizar a identidade visual escura existente, aplicando navegação com áreas de toque adequadas, rolagem horizontal acessível e respeito à safe area do telefone.

## Estrutura principal

- `src/App.tsx`: proteger a família de caminhos `/plano-voo/*` com a rota existente.
- `src/pages/PlanoVoo.tsx`: estado do planejador, sincronização URL/seção, operações de cálculo/validação/salvamento e apresentação das abas atuais.
- `src/components/plano-voo/FlightPlanNavigation.tsx`: mapa tipado entre seções e paths, navegação móvel direta para cada função.
- `src/components/plano-voo/PlanoIcaoMobile.tsx`: formulário ICAO e lista D1 existentes, sem alterar o contrato atual do Worker.
- `src/components/plano-voo/InformacoesAerodromoMobile.tsx` e `MeteorologiaMobile.tsx`: consultas AISWEB já fornecidas pelo Worker.
- `src/hooks/useFlightPlans.ts`: persistência Supabase para o planejador calculado e atualização da lista.
- `src/lib/flightPlanPdf.ts`: geração e entrega compartilhável do PDF do cálculo.
- `src/components/mobile/MobileTabBar.tsx`: atalho persistente ao plano de voo no shell mobile.

## Restrições conhecidas

- O repositório não contém React Native/Expo, Capacitor ou projetos Android/iOS; portanto o resultado será uma experiência PWA/web mobile-first com interação de aparência nativa, não um binário nativo.
- O Worker atual oferece rota preferencial, consultas operacionais, cálculos auxiliares e persistência ICAO, mas não possui navlog/segmentos por waypoint nem submissão do FPL ao AIS/DECEA. Não anunciar essas capacidades como implementadas.
- O usuário autorizou commit e push desta alteração. O frontend será enviado a uma branch isolada; o Worker/backend não foi alterado e nenhum deploy foi iniciado.
