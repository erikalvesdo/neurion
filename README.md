# NEURION OS

## Rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Rode o app:

```bash
npm run dev
```

## Chave OpenAI interna do setup

Para embutir a chave no app instalado, coloque a chave real em:

```txt
secrets/openai-key.txt
```

Esse arquivo e ignorado pelo Git. Ao rodar `npm run build` ou `npm run dist`, o script `scripts/prepare-openai-key.cjs` gera `electron/openai-key.bundle.json`, tambem ignorado pelo Git, para o Electron usar internamente.

Nao coloque chaves reais em arquivos versionados.
