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

**Enjoy!**
