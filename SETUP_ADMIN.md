# NEURION OS — Configuração do Admin

## Como criar sua conta de admin (FAÇA ISSO UMA VEZ)

1. Abra o app e crie uma conta normal com seu email
   (ex: seuemail@gmail.com + senha forte)

2. Acesse o Firebase Console:
   https://console.firebase.google.com/project/neurion-os/firestore/data

3. Clique em "users" → clique no seu email → clique em "plan"
   Altere o valor de "FREE" para "LIFETIME"
   Clique em "Salvar"

4. Pronto! Seu email agora tem acesso de admin ao NEURION OS.

---

## Como criar códigos de licença PRO

1. No Firebase Console → Firestore → clique em "+ Adicionar coleção"
   Nome da coleção: licenses

2. ID do documento = o código de licença (ex: GOAT2026PRO)

3. Adicione os campos:
   - durationDays: 30 (número de dias de acesso PRO)
   - disabled: false
   - usedCount: 0
   - createdAt: (timestamp)

4. Quando um cliente comprar, você cria um documento com o código.
   Quando ele inserir no app, o Firebase valida automaticamente.

---

## Como banir um cliente

Abra o app com sua conta admin → aba ADMIN → clique em banir.
Da próxima vez que ele abrir o app, será bloqueado.

---

## Nenhuma senha ou código está no código do app.
## Tudo fica no Firebase, que só você controla.
