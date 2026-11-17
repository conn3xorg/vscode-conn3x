# Conn3x for VS Code

Write [Conn3x](https://conn3x.org) circuits with the editor doing its share. Open a `.circuit.hcl` file and you get:

- **Syntax highlighting** for circuits, steps, handlers, `rescue`, `always` and `prereq` blocks, references such as `var.`, `each.` and `step.`, provider functions, and the `${ }` and `%{ }` templates inside strings.
- **Snippets** for every step module. Type `step-` and pick one, such as `step-package` or `step-firewalld`. You get the step with its required arguments in place, and you tab through them. `circuit`, `handler`, `rescue`, `always` and `prereq` have snippets too, and so do `task`, `plan` and `param` for the `.task.hcl` and `.plan.hcl` files `conn3x run` reads.
- **Completion** inside a step: the step modules, then each module's arguments, required ones first, with their types. Arguments already set aren't offered again.
- **Hover docs** on a module or an argument, from the same text as the [module reference](https://docs.conn3x.org/modules), with a link to the module's page.
- **Errors in place.** When you save a circuit, the extension runs `conn3x validate` in its directory and marks what it finds, such as a missing required argument. It runs only where `conn3x init` has, and only in directories with a circuit. Set `conn3x.path` if `conn3x` isn't on your `PATH`, or turn it off with `conn3x.validateOnSave`.
- **Comment toggling, bracket matching and indentation** that know HCL.

```hcl
circuit "web" {
  hosts = {
    web1 = "203.0.113.10"
  }

  ssh {
    user = "deploy"
  }

  step "nginx" {
    package {
      name = "nginx"
    }
  }
}
```

The step modules and what each argument does are in the [module reference](https://docs.conn3x.org/modules). `rescue`, `always` and `prereq` blocks need Conn3x v0.16.0 or later.

Files that end in plain `.tf` aren't circuits, so this extension leaves them to the HashiCorp Terraform or OpenTofu extension.

## Not yet

The completion and hover data comes from the Conn3x release named in its hover text, currently v0.23.0, so arguments added in a later release appear with the next version of this extension. Errors appear when you save, not as you type. A language server would do both live: [conn3x#543](https://github.com/conn3xorg/conn3x/issues/543).

## Contributing

Issues and pull requests are welcome at [conn3xorg/vscode-conn3x](https://github.com/conn3xorg/vscode-conn3x). The step snippets and `data/modules.json` are generated from the Conn3x provider's own schemas (`npm run modules`, see `scripts/gen-modules.mjs`), so a new module shows up here with the next release.

Licensed under the [Mozilla Public License 2.0](LICENSE).
