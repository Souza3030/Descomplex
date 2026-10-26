# Descomplex — Procrastinação

Aplicação React, TypeScript e Firebase para entender padrões de procrastinação e converter tarefas em primeiros passos concretos. O ZIP original foi preservado no repositório; o código-fonte desta versão está em `src/`.

## Executar

1. Use Node.js 22. Execute `npm ci` na raiz e `npm ci` em `functions/`.
2. Copie `.env.example` para `.env` e preencha os valores da configuração Web do **seu** projeto Firebase. Esses identificadores Web não são senhas; não inclua chaves administrativas.
3. No Firebase Console, habilite **Authentication** com e-mail/senha e, se desejar, Google. Adicione o domínio do aplicativo à lista de domínios autorizados.
4. Crie o **Cloud Firestore**. Para notificações diárias, ative **Cloud Messaging**, gere uma chave Web Push (VAPID) e preencha `VITE_FIREBASE_VAPID_KEY`. O navegador precisa de HTTPS ou `localhost` e o usuário deve autorizar notificações. A função agendada usa Cloud Functions e Cloud Scheduler, que podem exigir faturamento no Firebase.
5. Revise as regras e publique regras, função e hospedagem com `npm run build` e `npx firebase-tools deploy --only firestore:rules,functions,hosting --project SEU_PROJECT_ID`. É necessário estar autenticado no Firebase CLI e ter permissão para publicar no projeto. A configuração de Hosting inclui as rotas `/tarefas`, `/diagnostico`, `/foco` e `/perfil`.
6. Execute `npm run dev`. Para conferir as compilações, execute `npm run build` na raiz e `npm --prefix functions run build`.

Sem a configuração Firebase, o aplicativo mostra uma tela de configuração. As tarefas e os diagnósticos são gravados em `users/{uid}/tasks` e `users/{uid}/diagnoses`. A sessão de foco usa um temporizador local.

## Como usar

- **Visão geral:** acompanha tarefas abertas e concluídas e o último diagnóstico.
- **Minhas tarefas:** registra, conclui, reabre ou exclui tarefas; o campo “primeiro passo” ajuda a começar. Cada tarefa tem data de início e prazo. Tarefas antigas permanecem visíveis sem essas datas.
- **Diagnóstico:** nove afirmações, três para cada dimensão da Tríade do Tempo (Urgente, Importante e Circunstancial). A escala vai de 1 (nunca) a 5 (sempre). Cada resposta compõe apenas a própria dimensão. O subtotal dividido pela soma dos subtotais produz a participação relativa, arredondada pelo método dos maiores restos para somar 100%. A resposta de maior frequência gera uma recomendação prática. O resultado não é uma avaliação clínica.
- **Foco:** sessão ajustável de 5 a 120 minutos, com pausa e reinício.
- **Perfil:** altera nome, duração padrão do foco e horário de notificação. Após ativação, uma função agendada verifica o fuso horário do perfil a cada 15 minutos e envia no máximo um lembrete por dia pelo Firebase Cloud Messaging. A entrega depende da permissão do navegador, de um token FCM válido e da função publicada.

## Limites de validação

`npm run build` valida o código e a geração dos arquivos estáticos. Para verificar login, sincronização, regras de acesso e entrega das notificações, é necessário configurar e publicar em um projeto Firebase. Nenhuma configuração de projeto veio com o ZIP original.
