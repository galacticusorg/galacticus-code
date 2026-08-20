# Galacticus Code

VSCode support for working on [Galacticus](https://github.com/galacticusorg/galacticus).

## Features

* **Embedded syntax highlighting** inside `.F90` source files:
  * XML directive blocks — `!![ ... !!]`
  * reStructuredText docstrings — `!!{RST ... !!}`
* **Open Documentation for functionClass** — a command (also on the editor
  right-click menu for `.F90` files) that deep-links to the online documentation
  for the class defined in the current file. It works both on a `functionClass`
  base class (`_class.F90`) and on a concrete implementation, opening the family
  page at the correct `physics-<name>` anchor. Run it from the Command Palette
  (`Galacticus: Open Documentation for functionClass`), the context menu, or the
  keybinding `Ctrl+K Ctrl+G` (`Cmd+K Cmd+G` on macOS) while a `.F90` file is
  focused. If a file defines more than one class, you are prompted to choose.
* **The same command in parameter files.** With the cursor on a parameter that
  selects a functionClass implementation — say
  `<darkMatterProfileScaleRadius value="johnson2021"/>` — `Ctrl+K Ctrl+G` opens
  that implementation's section of the docs. The element is the family and the
  `value` is the implementation, which together give the same
  `physics/<family>.html#physics-<name>` target the source-file command uses.

  The cursor does not have to be on the selector itself: anywhere inside the
  element works, and if what is under the cursor is not a selection — a
  sub-parameter such as `<massResolution value="3.0e7"/>`, or a comment — the
  command walks outwards to the enclosing class, which is the one whose
  documentation describes that sub-parameter.

  Which parameters are functionClass selections is read from the generated
  `parameters.xsd`, found via the workspace's `xml.fileAssociations` setting or
  at `schema/parameters.xsd` or `.vscode/schema/parameters.xsd`. Without a
  schema the command falls back to the naming convention alone, which is right
  for real selections but cannot tell you when a parameter has no docs page.

## Installation

Install it from the Marketplace in VSCode.

Depends on:

* [Modern Fortran](https://marketplace.visualstudio.com/items?itemName=fortran-lang.linter-gfortran) — provides the Fortran grammar the highlighting injects into.
* [reStructuredText Syntax highlighting](https://marketplace.visualstudio.com/items?itemName=trond-snekvik.simple-rst) — provides the RST grammar used for docstring blocks.

Both are installed automatically as dependencies.

## Settings

* `galacticus.docsBaseUrl` (default `https://galacticus.readthedocs.io/en/latest/`)
  — base URL used by the documentation command. Point it at a different build
  (e.g. a local or versioned docs build) if needed. The command constructs
  `<base>/physics/<family>.html#physics-<name>`.

## Development

The test suite runs on node's built-in runner, with no dependencies to install:

```bash
npm test
```

It drives the extension through its registered command with a stubbed `vscode`
module (`test/stubs/`) against fixtures in `test/fixtures/`, so it needs neither
a running editor nor a Galacticus checkout.

**Enjoy!**
