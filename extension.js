'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

// Find the documentable Galacticus classes defined in a source file.
//
// Two forms are recognised:
//
//   * The abstract base class ("family"), declared in a `_class.F90` file:
//
//       !![
//       <functionClass ...>
//        <name>intergalacticMediumFilteringMass</name>
//        ...
//       </functionClass>
//       !!]
//
//   * A concrete implementation, which registers itself against its family by
//     using the family name as the element tag and a `name` attribute that
//     begins with that tag:
//
//       !![
//       <intergalacticMediumFilteringMass name="intergalacticMediumFilteringMassGnedin2000">
//        ...
//       </intergalacticMediumFilteringMass>
//       !!]
//
// Both are documented on the family page `physics/<family>.html`; the family
// section carries the anchor `physics-<family>` and each implementation section
// the anchor `physics-<implementationName>` (see scripts/doc/extractDocsRST.py).
function findTargets(text) {
    const targets = [];
    const seen = new Set();
    const add = (family, name, kind) => {
        const key = family + ' ' + name;
        if (!seen.has(key)) {
            seen.add(key);
            targets.push({ family, name, kind });
        }
    };

    // Abstract base class: <functionClass ...> ... <name>NAME</name>.
    const classRe = /<functionClass\b[^>]*>[\s\S]*?<name>\s*([A-Za-z0-9_]+)\s*<\/name>/g;
    let m;
    while ((m = classRe.exec(text)) !== null) {
        add(m[1], m[1], 'class');
    }

    // Implementation registration: <family name="familyImplementation">, where
    // the name begins with the tag followed by an upper-case letter. This
    // excludes <method name="...">, <eventHook name="...">, <inputParameter
    // name="...">, etc.
    const implRe = /<([a-z][A-Za-z0-9]*)\b[^>]*\bname="([A-Za-z0-9_]+)"/g;
    while ((m = implRe.exec(text)) !== null) {
        const tag = m[1];
        const name = m[2];
        if (name !== tag && name.startsWith(tag) && /[A-Z]/.test(name.charAt(tag.length))) {
            add(tag, name, 'implementation');
        }
    }

    return targets;
}

// Reproduce Sphinx's standard-label id: lower-case, runs of non-alphanumerics
// collapsed to a single hyphen, leading/trailing hyphens trimmed.
function anchorId(name) {
    return ('physics-' + name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function urlFor(target) {
    const configured = vscode.workspace
        .getConfiguration('galacticus')
        .get('docsBaseUrl', 'https://galacticus.readthedocs.io/en/latest/');
    const base = configured.replace(/\/+$/, '') + '/';
    return base + 'physics/' + encodeURIComponent(target.family) + '.html#' + anchorId(target.name);
}

async function openSourceDocs(editor) {
    const targets = findTargets(editor.document.getText());
    if (targets.length === 0) {
        vscode.window.showInformationMessage(
            'Galacticus: no functionClass or implementation definition found in this file.'
        );
        return;
    }

    let target = targets[0];
    if (targets.length > 1) {
        const pick = await vscode.window.showQuickPick(
            targets.map(t => ({
                label: t.name,
                description: t.kind === 'class' ? 'functionClass' : 'implementation',
                target: t
            })),
            { placeHolder: 'Open Galacticus documentation for which class?' }
        );
        if (!pick) {
            return;
        }
        target = pick.target;
    }

    vscode.env.openExternal(vscode.Uri.parse(urlFor(target)));
}


// ---------------------------------------------------------------------------
// Parameter files
// ---------------------------------------------------------------------------
//
// A parameter file selects a functionClass implementation by using the family
// as the element name and the implementation's short label as `value`:
//
//     <darkMatterProfileScaleRadius value="johnson2021">
//
// The Fortran source registers that same implementation as
// `<darkMatterProfileScaleRadius name="darkMatterProfileScaleRadiusJohnson2021">`,
// and the docs are keyed on that concatenated name -- so a parameter's label
// maps onto a documentation anchor by capitalising its first character and
// appending it to the family. Everything downstream (page, anchor) is then
// exactly as for the Fortran command.
//
// The capitalisation is for fidelity to the registered name, not correctness:
// `anchorId` case-folds, so `...ScaleRadiusJohnson2021` and
// `...ScaleRadiusjohnson2021` produce the same anchor. Keep it anyway -- the
// point is that this reconstructs a name the source really uses.
function implementationName(family, label) {
    return family + label.charAt(0).toUpperCase() + label.slice(1);
}

function isXml(document) {
    return document.languageId === 'xml' || /\.xml$/i.test(document.fileName);
}

// Language alone does not make it ours -- a workspace holds plenty of unrelated
// XML -- so require the `<parameters>` root that every parameter file, and only
// a parameter file, carries.
function isParameterFile(document) {
    return isXml(document) && /<parameters(\s|>)/.test(document.getText());
}

// The generated schema lists every functionClass family, and for most of them
// enumerates the valid implementation labels. It is split into commented
// sections; only the first one describes functionClasses, and we must not stray
// into the second, which enumerates ordinary label-valued parameters such as
// `<adjustElements value="reset"/>` that have no documentation page.
const SCHEMA_SECTION_START = '<!-- functionClass selectors:';
const SCHEMA_SECTION_END = '<!-- Enumeration-valued parameters:';

// Map family name -> Set of implementation labels. The set is empty for a family
// the schema declares without an enumeration (`criticalOverdensity`, for
// example, is typed as a plain string); such a family is still a functionClass,
// so we keep it and simply cannot check the label against a list.
function parseSchema(xsd) {
    const from = xsd.indexOf(SCHEMA_SECTION_START);
    if (from < 0) {
        return null;
    }
    const to = xsd.indexOf(SCHEMA_SECTION_END, from);
    const section = xsd.slice(from, to < 0 ? xsd.length : to);

    const families = new Map();
    const elementRe = /<xs:element name="([A-Za-z_][\w.\-]*)"/g;
    const declarations = [];
    let m;
    while ((m = elementRe.exec(section)) !== null) {
        declarations.push({ name: m[1], from: m.index + m[0].length });
    }
    declarations.forEach((declaration, index) => {
        const next = index + 1 < declarations.length
            ? declarations[index + 1].from
            : section.length;
        const body = section.slice(declaration.from, next);
        const labels = new Set();
        const enumerationRe = /<xs:enumeration value="([^"]*)"/g;
        let e;
        while ((e = enumerationRe.exec(body)) !== null) {
            labels.add(e[1]);
        }
        families.set(declaration.name, labels);
    });
    return families.size > 0 ? families : null;
}

// Locate the schema. Preferred source is whatever `xml.fileAssociations` already
// points this workspace's parameter files at (both the Galacticus repository and
// the tutorials repository configure it), falling back to the two conventional
// locations. Returns null when there is no schema to be had, in which case the
// caller falls back to the naming convention alone.
let schemaCache = null;

function schemaCandidates(document) {
    const candidates = [];
    const associations = vscode.workspace
        .getConfiguration('xml', document.uri)
        .get('fileAssociations', []);
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
        || (vscode.workspace.workspaceFolders || [])[0];
    const root = folder ? folder.uri.fsPath : null;
    for (const association of associations) {
        const systemId = association && association.systemId;
        if (typeof systemId !== 'string' || !/\.xsd$/i.test(systemId)) {
            continue;
        }
        const resolved = root
            ? systemId.replace(/\$\{workspaceFolder\}/g, root)
            : systemId;
        candidates.push(resolved);
    }
    if (root) {
        candidates.push(path.join(root, 'schema', 'parameters.xsd'));
        candidates.push(path.join(root, '.vscode', 'schema', 'parameters.xsd'));
    }
    return candidates;
}

function loadSchema(document) {
    for (const candidate of schemaCandidates(document)) {
        let stat;
        try {
            stat = fs.statSync(candidate);
        } catch (error) {
            continue;
        }
        const stamp = candidate + ':' + stat.mtimeMs;
        if (schemaCache && schemaCache.stamp === stamp) {
            return schemaCache.families;
        }
        let families;
        try {
            families = parseSchema(fs.readFileSync(candidate, 'utf8'));
        } catch (error) {
            continue;
        }
        if (families) {
            schemaCache = { stamp, families };
            return families;
        }
    }
    return null;
}

// The element under the cursor, then its ancestors, outermost last. Being inside
// a start tag picks that element; anywhere else (a blank line, a nested value)
// falls through to whatever encloses the cursor, so the shortcut still does
// something sensible when the cursor is not sitting exactly on the selector.
const TAG_RE = /<(\/?)([A-Za-z_][\w.\-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

function valueAttribute(attributes) {
    const m = /\bvalue\s*=\s*("([^"]*)"|'([^']*)')/.exec(attributes);
    if (!m) {
        return null;
    }
    return m[2] !== undefined ? m[2] : m[3];
}

function elementChainAt(text, offset) {
    const stack = [];
    let direct = null;
    let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (start > offset) {
            break;
        }
        const closing = m[1] === '/';
        const element = { tag: m[2], value: closing ? null : valueAttribute(m[3]) };
        if (offset < end) {
            // The cursor is inside this tag, so this is the innermost candidate
            // and must not also be counted as one of its own ancestors.
            direct = element;
            continue;
        }
        if (closing) {
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].tag === element.tag) {
                    stack.length = i;
                    break;
                }
            }
        } else if (m[4] !== '/') {
            stack.push(element);
        }
    }
    const chain = direct ? [direct] : [];
    for (let i = stack.length - 1; i >= 0; i--) {
        chain.push(stack[i]);
    }
    return chain;
}

// Without a schema we cannot tell a functionClass family from any other
// parameter, so fall back to the shape of the value: implementation labels are
// bare identifiers, which rules out the numbers, lists and expressions that make
// up most of a parameter file.
function looksLikeLabel(value) {
    return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value);
}

function resolveParameterTarget(chain, families) {
    for (const element of chain) {
        if (families) {
            if (!families.has(element.tag)) {
                continue;
            }
            const labels = families.get(element.tag);
            if (element.value === null) {
                // A family named with no value selects nothing; the family's own
                // page is still the useful thing to open.
                return { family: element.tag, name: element.tag, kind: 'class' };
            }
            if (labels.size > 0 && !labels.has(element.value)) {
                continue;
            }
        } else if (!looksLikeLabel(element.value)) {
            continue;
        }
        return {
            family: element.tag,
            name: implementationName(element.tag, element.value),
            kind: 'implementation'
        };
    }
    return null;
}

function openParameterDocs(editor) {
    const document = editor.document;
    const chain = elementChainAt(
        document.getText(),
        document.offsetAt(editor.selection.active)
    );
    if (chain.length === 0) {
        vscode.window.showInformationMessage(
            'Galacticus: no parameter under the cursor.'
        );
        return;
    }

    const target = resolveParameterTarget(chain, loadSchema(document));
    if (!target) {
        vscode.window.showInformationMessage(
            `Galacticus: <${chain[0].tag}> does not select a functionClass implementation, `
            + 'so it has no documentation page.'
        );
        return;
    }

    vscode.env.openExternal(vscode.Uri.parse(urlFor(target)));
}

// The one command serves both file kinds: a source file names its class outright,
// while a parameter file selects one, so which of the two we are looking at
// decides how the class is identified.
async function openClassDocs() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Galacticus: no active editor.');
        return;
    }
    const document = editor.document;
    if (isParameterFile(document)) {
        openParameterDocs(editor);
        return;
    }
    if (isXml(document)) {
        // Reaching the source-file path from here would report that the file
        // defines no functionClass, which is true but beside the point.
        vscode.window.showInformationMessage(
            'Galacticus: this XML file is not a parameter file (no <parameters> root).'
        );
        return;
    }
    await openSourceDocs(editor);
}

function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('galacticus.openClassDocs', openClassDocs)
    );
}

function deactivate() {}

module.exports = { activate, deactivate };
