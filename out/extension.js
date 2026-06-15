"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const REPO_URL = "https://github.com/j2kenton/revamp.git";
function activate(context) {
    const cmd = vscode.commands.registerCommand("revamp.newProject", async () => {
        const name = await vscode.window.showInputBox({
            prompt: "Project name",
            placeHolder: "my-app",
            validateInput: (v) => /^[a-z0-9-_]+$/i.test(v) ? null : "Use only letters, numbers, - or _",
        });
        if (!name)
            return;
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Choose parent folder",
        });
        if (!picked?.length)
            return;
        const dest = path.join(picked[0].fsPath, name);
        if (fs.existsSync(dest)) {
            vscode.window.showErrorMessage(`Folder "${name}" already exists here.`);
            return;
        }
        try {
            const gitExtension = vscode.extensions.getExtension("vscode.git");
            if (!gitExtension) {
                vscode.window.showErrorMessage("The built-in Git extension is required to create a ReVamp project.");
                return;
            }
            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }
            await vscode.commands.executeCommand("_git.cloneRepository", REPO_URL, dest);
            vscode.window.showInformationMessage(`Created ReVamp project "${name}". Run "pnpm install" in the new window to install dependencies.`);
            const uri = vscode.Uri.file(dest);
            await vscode.commands.executeCommand("vscode.openFolder", uri, {
                forceNewWindow: true,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`ReVamp setup failed: ${msg}`);
        }
    });
    context.subscriptions.push(cmd);
}
function deactivate() { }
