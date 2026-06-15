"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
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
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ReVamp project "${name}"…`,
            cancellable: false,
        }, async (progress) => {
            try {
                progress.report({ message: "Cloning…" });
                const clone = (0, child_process_1.spawnSync)("git", ["clone", REPO_URL, dest], { stdio: "pipe" });
                if (clone.status !== 0)
                    throw new Error(clone.stderr?.toString() || "git clone failed");
                const uri = vscode.Uri.file(dest);
                await vscode.commands.executeCommand("vscode.openFolder", uri, {
                    forceNewWindow: true,
                });
                // Open a terminal so the user can run pnpm install in the new window
                const terminal = vscode.window.createTerminal({ name: "ReVamp Setup", cwd: dest });
                terminal.show();
                terminal.sendText("pnpm install");
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`ReVamp setup failed: ${msg}`);
            }
        });
    });
    context.subscriptions.push(cmd);
}
function deactivate() { }
