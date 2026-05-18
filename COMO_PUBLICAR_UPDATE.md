# Como publicar uma atualização do NEURION OS

## Setup único (fazer uma vez)

### 1. Criar repositório no GitHub
- Acesse github.com e crie um repositório chamado: neurion-os
- Pode ser privado (Private)

### 2. Criar Personal Access Token
- GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Clique "Generate new token"
- Selecione: repo (todos os subitens)
- Copie o token gerado (começa com ghp_...)

---

## Como publicar uma nova versão

### Passo 1 — Altere a versão no package.json
Abra o arquivo `package.json` e mude:
```json
"version": "21.0.0"  →  "version": "21.1.0"
```
Use sempre: MAIOR.MENOR.PATCH (ex: 21.1.0, 21.2.0, 22.0.0)

### Passo 2 — Configure o token (uma vez por sessão do prompt)
Abra o CMD na pasta do projeto e execute:
```
set GH_TOKEN=ghp_seutokenaqui
```

### Passo 3 — Execute o PUBLICAR_UPDATE.bat
Clique duas vezes no arquivo `PUBLICAR_UPDATE.bat`

Ele vai:
1. Compilar o app
2. Gerar o .exe
3. Subir automaticamente para GitHub Releases

### Passo 4 — Pronto!
Da próxima vez que qualquer cliente abrir o app, ele verá:
"Nova versão disponível!" e baixará automaticamente.

---

## O que o cliente vê

1. Abre o app normalmente
2. Após 3 segundos aparece no canto inferior direito:
   "Nova versão disponível — baixando em segundo plano..."
3. Quando terminar de baixar:
   "Pronto para atualizar! [Reiniciar e Atualizar]"
4. Cliente clica no botão → app fecha, instala e abre na versão nova

Sem precisar enviar .exe, sem o cliente fazer nada manual.
