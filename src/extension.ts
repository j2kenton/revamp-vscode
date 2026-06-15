import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawnSync } from "child_process";

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

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating ReVamp project "${name}"…`,
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: "Cloning…" });
          const clone = spawnSync("git", ["clone", REPO_URL, dest], { stdio: "pipe" });
          if (clone.status !== 0) throw new Error(clone.stderr?.toString() || "git clone failed");

          progress.report({ message: "Installing dependencies…" });
          const install = spawnSync("pnpm", ["install"], { cwd: dest, stdio: "pipe" });
          if (install.status !== 0) throw new Error(install.stderr?.toString() || "pnpm install failed");

          const uri = vscode.Uri.file(dest);
          await vscode.commands.executeCommand("vscode.openFolder", uri, {
            forceNewWindow: true,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`ReVamp setup failed: ${msg}`);
        }
      }
    );
  });

  context.subscriptions.push(cmd);
}

export function deactivate() {}
