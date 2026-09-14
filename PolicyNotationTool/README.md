# Policy Notation Tool — split source

This folder contains the tool split into three files for GitHub:

- `index.html` — markup only, links to `styles.css` and `script.js`
- `styles.css` — all CSS (design tokens, layout, components)
- `script.js` — all JavaScript (form logic, theming, note generation)

## Re-merging into a single deployable file

Run the included `merge.js` with Node.js:

```bash
node merge.js
```

This reads `index.html`, `styles.css`, and `script.js` from the current
directory, inlines the CSS into a `<style>` block and the JS into a
`<script>` block, and writes a single self-contained file named
`PolicyNotationTool.html` — ready to deploy or release anywhere a single
HTML file is needed.

You can also specify custom filenames:

```bash
node merge.js index.html styles.css script.js MyBuild.html
```

Re-run this any time you edit the split files and need an updated
single-file build.
