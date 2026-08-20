'use strict';

// A stand-in for the VSCode API, just large enough to drive the extension's
// command outside a running editor. Everything the command reaches for is
// recorded on `state` so that a test can assert on what it did: `opened` for
// URLs handed to the browser, `messages` for what the user was told.

const state = {
    opened: [],
    messages: [],
    commands: {},
    configuration: {},
    quickPickChoice: 0
};

function reset() {
    state.opened.length = 0;
    state.messages.length = 0;
    state.configuration = {};
    state.quickPickChoice = 0;
    module.exports.window.activeTextEditor = null;
    module.exports.workspace.workspaceFolders = [];
}

module.exports = {
    __state: state,
    __reset: reset,

    window: {
        activeTextEditor: null,
        showWarningMessage: (message) => state.messages.push({ kind: 'warning', message }),
        showInformationMessage: (message) => state.messages.push({ kind: 'information', message }),
        showQuickPick: async (items) => items[state.quickPickChoice]
    },

    workspace: {
        workspaceFolders: [],
        getWorkspaceFolder() {
            return (module.exports.workspace.workspaceFolders || [])[0];
        },
        getConfiguration: (section) => ({
            get(key, fallback) {
                const value = state.configuration[`${section}.${key}`];
                return value === undefined ? fallback : value;
            }
        })
    },

    env: {
        openExternal: (uri) => state.opened.push(String(uri))
    },

    Uri: { parse: (value) => value },

    commands: {
        registerCommand: (id, handler) => {
            state.commands[id] = handler;
            return { dispose() {} };
        }
    }
};
