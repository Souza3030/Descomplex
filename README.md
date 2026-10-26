# Descomplex — Procrastinação

Aplicação React, TypeScript e Firebase para entender padrões de procrastinação e converter tarefas em primeiros passos concretos. O ZIP original foi preservado no repositório; o código-fonte desta versão está em `src/`.

## Executar

1. Use Node.js 20 ou superior. Execute `npm ci`.
2. Copie `.env.example` para `.env` e preencha os valores da configuração Web do **seu** projeto Firebase. Esses identificadores Web não são senhas; não inclua chaves administrativas.
3. No Firebase Console, habilite **Authentication** com e-mail/senha e, se desejar, Google. Adicione o domínio do aplicativo à lista de domínios autorizados.
4. Crie o **Cloud Firestore** e publique `firestore.rules` com `npx firebase-tools deploy --only firestore:rules --project SEU_PROJECT_ID`. Antes de publicar, revise as regras para o seu projeto.
5. Execute `npm run dev`. Para conferir a compilação, execute `npm run build`.

Sem a configuração Firebase, o aplicativo mostra uma tela de configuração. As tarefas e os diagnósticos são gravados em `users/{uid}/tasks` e `users/{uid}/diagnoses`. A sessão de foco usa um temporizador local.

## Como usar

- **Visão geral:** acompanha tarefas abertas e concluídas e o último diagnóstico.
- **Minhas tarefas:** registra, conclui, reabre ou exclui tarefas; o campo “primeiro passo” ajuda a começar.
- **Diagnóstico:** nove afirmações, três para cada dimensão da Tríade do Tempo (Urgente, Importante e Circunstancial). A escala vai de 1 (nunca) a 5 (sempre). Cada resposta compõe apenas a própria dimensão. O subtotal dividido pela soma dos subtotais produz a participação relativa, arredondada pelo método dos maiores restos para somar 100%. O resultado não é uma avaliação clínica.
- **Foco:** sessão de 25 minutos com pausa e reinício.

## Limites de validação

`npm run build` valida o código e a geração dos arquivos estáticos. Para verificar login, sincronização e regras de acesso, é necessário configurar um projeto Firebase. Nenhuma configuração de projeto veio com o ZIP original.
