# Segredos locais

Crie um arquivo chamado `openai-key.txt` nesta pasta e coloque somente a chave da OpenAI:

```txt
sk-...
```

Esse arquivo e ignorado pelo Git. Ao rodar `npm run build` ou `npm run dist`, o script `scripts/prepare-openai-key.cjs` gera `electron/openai-key.bundle.json` para o Electron usar internamente.

Nao coloque chaves reais em arquivos versionados.
