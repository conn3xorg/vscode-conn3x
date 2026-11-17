# Changelog

## 0.3.0

- Completion inside a step: the step modules, then each module's arguments, required ones first, with types and descriptions.
- Hover docs for modules and arguments, linking to each module's page.
- `conn3x validate` runs when you save a circuit, and its errors and warnings appear in the file. Where the circuit needs a provider that `conn3x init` hasn't installed yet, it stays quiet. Settings: `conn3x.path` and `conn3x.validateOnSave`.
- Module data from Conn3x v0.23.0, generated with `npm run modules`.

## 0.2.0

- Snippets for `alternatives`, `debconf`, `flatpak`, `npm` and `snap`, new in Conn3x v0.21.0.
- Snippets for the 32 step modules added since 0.1.0, through Conn3x v0.20.0, such as `nftables`, `partition`, `swap`, `ios_config` and the Junos and VyOS steps.
- `.task.hcl` and `.plan.hcl` files open as circuits, with `task`, `plan` and `param` snippets.
- CI fails when a module documented on docs.conn3x.org has no snippet.

## 0.1.0

First release: syntax highlighting for `.circuit.hcl` files, and snippets for circuits, handlers, rescue, always and prereq blocks, and a step for each module.
