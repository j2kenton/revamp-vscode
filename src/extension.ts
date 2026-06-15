import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const TEMPLATE_DIR = "template";

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
      const templatePath = path.join(context.extensionPath, TEMPLATE_DIR);
      if (!fs.existsSync(templatePath)) {
        vscode.window.showErrorMessage("The bundled ReVamp template is missing. Reinstall the extension and try again.");
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating ReVamp project "${name}"...`,
          cancellable: false,
        },
        async () => {
          await fs.promises.cp(templatePath, dest, {
            recursive: true,
            force: false,
            errorOnExist: true,
          });
          await updatePackageName(dest, name);
        }
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

async function updatePackageName(projectPath: string, name: string) {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) return;

  const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, "utf8"));
  packageJson.name = name.toLowerCase().replace(/_/g, "-");
  await fs.promises.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

export function deactivate() {}
