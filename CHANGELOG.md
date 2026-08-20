# Changelog

All notable changes to this project will be documented in this file.

# [0.3.0]

* **Open Documentation for functionClass** now works in Galacticus parameter
  files as well as `.F90` sources, on the same `Ctrl+K Ctrl+G` binding
  (`Cmd+K Cmd+G` on macOS) and the editor context menu. Put the cursor on a
  parameter that selects an implementation — `<darkMatterProfileScaleRadius
  value="johnson2021"/>` — and it opens that implementation's section of the
  documentation. Anywhere inside the element works; if the cursor is on
  something that is not a selection, the command walks out to the enclosing
  class, so a sub-parameter takes you to the class that defines it.
* Valid selections are recognised from the generated `parameters.xsd` when it can
  be found (via `xml.fileAssociations`, `schema/parameters.xsd`, or
  `.vscode/schema/parameters.xsd`), so parameters that have no documentation page
  now say so instead of opening a dead link. Falls back to the naming convention
  when no schema is available.
* The extension now also activates on XML.
* Added a test suite (`npm test`), run on pull requests. It exercises the
  command through its registered handler with a stubbed `vscode` module and
  self-contained fixtures, so it needs neither a running editor nor a Galacticus
  checkout.

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
