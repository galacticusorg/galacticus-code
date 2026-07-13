# Changelog

All notable changes to this project will be documented in this file.

# [0.2.0]

* Embedded docstring blocks (`!!{RST ... !!}`) are now highlighted as
  reStructuredText, replacing the previous LaTeX highlighting (docstrings were
  migrated from LaTeX to RST).
* Added the **Galacticus: Open Documentation for functionClass** command, on the
  Command Palette and the `.F90` editor context menu. It deep-links to the
  family page (`physics/<family>.html`) at the `physics-<name>` anchor, for both
  `functionClass` base classes and concrete implementations. Bound to
  `Ctrl+K Ctrl+G` (`Cmd+K Cmd+G` on macOS), scoped to focused `.F90` editors.
* Added the `galacticus.docsBaseUrl` setting.
* Bumped the minimum VSCode version to 1.60.0.

# [0.1.0] - 2023/12/15

The first release of this project.
