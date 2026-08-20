'use strict';

// The extension is exercised through its registered command, exactly as VSCode
// invokes it, with `vscode` resolved to the stub in ./stubs. Fixtures under
// ./fixtures stand in for a workspace, so the suite depends on nothing outside
// this repository.

const assert = require('node:assert');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { test, describe, beforeEach } = require('node:test');

const STUB = require.resolve('./stubs/vscode.js');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
    return request === 'vscode' ? STUB : resolveFilename.call(this, request, ...rest);
};

const vscode = require('./stubs/vscode.js');
const extension = require('../extension.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const DOCS = 'https://galacticus.readthedocs.io/en/latest/physics/';

extension.activate({ subscriptions: [] });
const openClassDocs = vscode.__state.commands['galacticus.openClassDocs'];
assert.ok(openClassDocs, 'the command should be registered on activation');

function open(file) {
    const fileName = path.isAbsolute(file) ? file : path.join(FIXTURES, file);
    const text = fs.readFileSync(fileName, 'utf8');
    const lines = text.split('\n');
    return {
        lines,
        document: {
            fileName,
            languageId: path.extname(fileName) === '.F90' ? 'FortranFreeForm' : 'xml',
            uri: { fsPath: fileName },
            getText: () => text,
            offsetAt: ({ line, character }) => {
                let offset = 0;
                for (let i = 0; i < line; i++) {
                    offset += lines[i].length + 1;
                }
                return offset + character;
            }
        }
    };
}

// Place the cursor on the first line containing `needle`. `column` defaults to
// just inside the tag that the needle starts.
async function invokeAt(file, needle, column) {
    const { lines, document } = open(file);
    const line = lines.findIndex((text) => text.includes(needle));
    assert.notStrictEqual(line, -1, `fixture has no line containing ${JSON.stringify(needle)}`);
    const character = column === undefined ? lines[line].indexOf(needle) + 2 : column;
    vscode.window.activeTextEditor = {
        document,
        selection: { active: { line, character } }
    };
    vscode.__state.opened.length = 0;
    vscode.__state.messages.length = 0;
    await openClassDocs();
    return {
        url: vscode.__state.opened[0] || null,
        message: (vscode.__state.messages[0] || {}).message || null
    };
}

function useFixtureWorkspace() {
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: FIXTURES } }];
    vscode.__state.configuration['xml.fileAssociations'] = [
        { pattern: '**/*.xml', systemId: '${workspaceFolder}/schema/parameters.xsd' }
    ];
}

beforeEach(() => {
    vscode.__reset();
    useFixtureWorkspace();
});

describe('parameter files', () => {
    test('a functionClass selection opens the implementation section', async () => {
        const { url } = await invokeAt('parameters.xml', '<darkMatterProfileScaleRadius value="johnson2021"');
        assert.strictEqual(
            url,
            DOCS + 'darkMatterProfileScaleRadius.html#physics-darkmatterprofilescaleradiusjohnson2021'
        );
    });

    test('the cursor may be anywhere inside the element', async () => {
        const line = '<darkMatterProfileScaleRadius value="johnson2021"';
        const expected =
            DOCS + 'darkMatterProfileScaleRadius.html#physics-darkmatterprofilescaleradiusjohnson2021';
        // On the element name, on the attribute name, and inside the value.
        for (const column of [6, 35, 44]) {
            const { url } = await invokeAt('parameters.xml', line, column);
            assert.strictEqual(url, expected, `column ${column}`);
        }
    });

    test('a single-quoted value is read', async () => {
        const { url } = await invokeAt('parameters.xml', "<nodeOperator value='multi'");
        assert.strictEqual(url, DOCS + 'nodeOperator.html#physics-nodeoperatormulti');
    });

    test('a family the schema does not enumerate is still resolved', async () => {
        const { url } = await invokeAt('parameters.xml', '<criticalOverdensity');
        assert.strictEqual(
            url,
            DOCS + 'criticalOverdensity.html#physics-criticaloverdensitysphericalcollapseclsnlssmttrcsmlgclcnstnt'
        );
    });

    test('the innermost selection wins over its enclosing one', async () => {
        const { url } = await invokeAt('parameters.xml', '<darkMatterProfileScaleRadius value="johnson2021"');
        assert.match(url, /physics-darkmatterprofilescaleradiusjohnson2021$/);
        assert.doesNotMatch(url, /concentrationlimiter/);
    });

    test('a sub-parameter resolves to the class that defines it', async () => {
        const { url } = await invokeAt('parameters.xml', '<massResolution value="3.0e7"');
        assert.strictEqual(url, DOCS + 'mergerTreeMassResolution.html#physics-mergertreemassresolutionfixed');
    });

    test('a comment inside a class block resolves to that class', async () => {
        const { url } = await invokeAt('parameters.xml', '<!-- Halo angular momentum -->');
        assert.strictEqual(url, DOCS + 'nodeOperator.html#physics-nodeoperatormulti');
    });

    test('a nodeComponent is declined: it looks like a selection but has no page', async () => {
        const { url, message } = await invokeAt('parameters.xml', '<componentSatellite');
        assert.strictEqual(url, null);
        assert.match(message, /componentSatellite/);
        assert.match(message, /does not select a functionClass/);
    });

    test('a plain-valued parameter with no class above it is declined', async () => {
        const { url, message } = await invokeAt('parameters.xml', '<toleranceAbsoluteMass');
        assert.strictEqual(url, null);
        assert.match(message, /does not select a functionClass/);
    });

    test('XML without a <parameters> root is not claimed', async () => {
        const other = path.join(FIXTURES, 'not-a-parameter-file.xml');
        fs.writeFileSync(other, '<project>\n  <target value="build"/>\n</project>\n');
        try {
            const { url, message } = await invokeAt(other, '<target');
            assert.strictEqual(url, null);
            assert.match(message, /not a parameter file/);
        } finally {
            fs.unlinkSync(other);
        }
    });
});

describe('without a reachable schema', () => {
    beforeEach(() => {
        vscode.__state.configuration['xml.fileAssociations'] = [];
        vscode.workspace.workspaceFolders = [{ uri: { fsPath: path.join(FIXTURES, 'nowhere') } }];
    });

    test('a real selection still resolves, on the naming convention alone', async () => {
        const { url } = await invokeAt('parameters.xml', '<darkMatterProfileScaleRadius value="johnson2021"');
        assert.strictEqual(
            url,
            DOCS + 'darkMatterProfileScaleRadius.html#physics-darkmatterprofilescaleradiusjohnson2021'
        );
    });

    test('a numeric value is still declined', async () => {
        const { url } = await invokeAt('parameters.xml', '<toleranceAbsoluteMass');
        assert.strictEqual(url, null);
    });

    test('a nodeComponent can no longer be told apart, and is accepted', async () => {
        // Documents the known limit of the fallback: without the schema there is
        // nothing to distinguish this from a functionClass selection.
        const { url } = await invokeAt('parameters.xml', '<componentSatellite');
        assert.strictEqual(url, DOCS + 'componentSatellite.html#physics-componentsatelliteorbiting');
    });
});

describe('source files', () => {
    test('a concrete implementation opens its own section', async () => {
        const { url } = await invokeAt('implementation.F90', 'module', 0);
        assert.strictEqual(url, DOCS + 'exampleFamily.html#physics-examplefamilyworkedexample');
    });

    test('a base class opens the family section', async () => {
        const { url } = await invokeAt('_class.F90', 'module', 0);
        assert.strictEqual(url, DOCS + 'exampleFamily.html#physics-examplefamily');
    });
});

describe('configuration', () => {
    test('docsBaseUrl is honoured, with or without a trailing slash', async () => {
        for (const base of ['https://example.test/docs', 'https://example.test/docs/']) {
            vscode.__state.configuration['galacticus.docsBaseUrl'] = base;
            const { url } = await invokeAt('parameters.xml', '<criticalOverdensity');
            assert.ok(url.startsWith('https://example.test/docs/physics/'), `base ${base} gave ${url}`);
        }
    });
});
