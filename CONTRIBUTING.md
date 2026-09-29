# Contributing to aws-nuke-all

Thanks for helping improve `aws-nuke-all`.

## Safety first

This tool deletes real cloud resources. Only test against a disposable AWS account that holds nothing you care about. Never develop or test against production credentials.

## Setup

```bash
bun install
bun run dev      # runs bin/index.ts with file watching
```

## Pull requests

- Keep changes focused; one topic per PR.
- New resource types must keep the existing confirmation prompt before anything is deleted.
- Describe how you tested the change and in which regions/services.
- Do not commit credentials or `.env` files.

For security issues see [SECURITY.md](SECURITY.md).
