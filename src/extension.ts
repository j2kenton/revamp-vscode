import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const REPO_URL = "https://github.com/j2kenton/revamp.git";

export function activate(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand("revamp.newProject", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "Project name",
      placeHolder: "my-app",
      validateInput: (v) =>
        /^[a-z0-9-_]+$/i.test(v) ? null : "Use only letters, numbers, - or _",
    });
    if (!name) return;

    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Choose parent folder",
    });
    if (!picked?.length) return;

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

      vscode.window.showInformationMessage(
        `Created ReVamp project "${name}". Install dependencies in the new window before starting development.`
      );

      const uri = vscode.Uri.file(dest);
      await vscode.commands.executeCommand("vscode.openFolder", uri, {
        forceNewWindow: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`ReVamp setup failed: ${msg}`);
    }
  });

  context.subscriptions.push(cmd);
}

export function deactivate() {}
