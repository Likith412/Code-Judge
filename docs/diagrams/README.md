# Diagrams

Each picture is a Mermaid `.mmd` file next to the `.svg` rendered from it. The
`.md` documents link to the `.svg`, because GitHub will not render a `.mmd`
inside a table or next to other text reliably.

| Source | Picture | Used in |
|--------|---------|---------|
| `architecture.mmd` | `architecture.svg` | dev plan |
| `submission-flow.mmd` | `submission-flow.svg` | dev plan |
| `db-erd.mmd` | `db-erd.svg` | database design |
| `auth-register.mmd` | `auth-register.svg` | authentication |
| `auth-login.mmd` | `auth-login.svg` | authentication |
| `auth-refresh-rotation.mmd` | `auth-refresh-rotation.svg` | authentication |
| `auth-token-lifecycle.mmd` | `auth-token-lifecycle.svg` | authentication |

## Rendering again after an edit

The `.svg` is not generated automatically. After changing a `.mmd`, render it:

```
npx -y @mermaid-js/mermaid-cli -i auth-login.mmd -o auth-login.svg -b transparent
```

All of them at once, from this folder:

```
for f in *.mmd; do npx -y @mermaid-js/mermaid-cli -i "$f" -o "${f%.mmd}.svg" -b transparent; done
```

`mermaid-cli` downloads a headless Chromium the first time, which takes a
minute or two. `-b transparent` keeps the picture readable on both a light and
a dark GitHub theme.

**A `.mmd` and its `.svg` must be committed together.** An edited source with a
stale picture is worse than no picture, because the document then shows
something that is not true any more.
