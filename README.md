# Conn3x for VS Code

Write [Conn3x](https://conn3x.org) circuits with the editor doing its share. Open a `.circuit.hcl` file and you get:

- **Syntax highlighting** for circuits, steps, handlers, `rescue`, `always` and `prereq` blocks, references such as `var.`, `each.` and `step.`, provider functions, and the `${ }` and `%{ }` templates inside strings.
- **Snippets** for every step module. Type `step-` and pick one, such as `step-package` or `step-firewalld`. You get the step with its required arguments in place, and you tab through them. `circuit`, `handler`, `rescue`, `always` and `prereq` have snippets too.
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

Completion that knows each module's arguments, hover docs and errors as you type need a language server, which is next: [conn3x#543](https://github.com/conn3xorg/conn3x/issues/543).

## Contributing

Issues and pull requests are welcome at [conn3xorg/vscode-conn3x](https://github.com/conn3xorg/vscode-conn3x). The step snippets are generated from the Conn3x provider's own schemas, so a new module shows up here with the next release.

Licensed under the [Mozilla Public License 2.0](LICENSE).
