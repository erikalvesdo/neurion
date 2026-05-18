# NEURION OS — Regras de Segurança do Firebase

## Passo obrigatório após criar o projeto Firebase

Acesse: https://console.firebase.google.com/project/neurion-os/firestore/rules

Cole estas regras e clique em PUBLICAR:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Somente o admin pode ler TODOS os usuários
    // O próprio usuário pode ler e atualizar seus dados
    match /users/{email} {
      allow read, write: if false; // Bloqueado para acesso direto do browser
    }
    // Permite acesso apenas via SDK Admin (server-side)
    // O app usa as credenciais do Firebase Web SDK com regras específicas
  }
}
```

## Regra de produção recomendada (mais segura):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

## IMPORTANTE
No console Firebase, vá em Authentication > Sign-in methods e DESATIVE
Email/Password caso não queira que usuários criem conta diretamente pelo Firebase.
O NEURION OS já gerencia o cadastro via Firestore diretamente.
