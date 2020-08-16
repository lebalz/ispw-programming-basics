// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join } from "path";
import { readFileSync } from "fs";

interface PipPackage {
  package: string;
  version: string;
}

const PIP_PACKAGES: PipPackage[] = [
  { package: "pytest", version: "6.0.1" },
  { package: "matplotlib", version: "3.3.1" },
  { package: "ipython", version: "7.17.0" },
  { package: "jupyter", version: "1.0.0" },
  { package: "numpy", version: "1.19.1" },
  { package: "scipy", version: "1.5.2" },
  { package: "pandas", version: "1.1.0" },
  { package: "openpyxl", version: "3.0.4" },
  { package: "xlrd", version: "1.2.0" },
];

const DEFAULT_USER_SETTINGS = {
  "workbench.colorTheme": "One Dark Pro",
  "editor.suggestSelection": "first",
  "vsintellicode.modify.editor.suggestSelection":
    "automaticallyOverrodeDefaultValue",
  "keyboard.dispatch": "keyCode",
  "editor.mouseWheelZoom": true,
  "python.languageServer": "Microsoft",
  "workbench.activityBar.visible": true,
  "python.linting.pylintEnabled": true,
  "python.linting.enabled": true,
  "python.dataScience.alwaysTrustNotebooks": true,
  "python.dataScience.askForKernelRestart": false,
  "python.dataScience.stopOnFirstLineWhileDebugging": false,
  "python.formatting.autopep8Args": ["--select=E,W", "--max-line-length=120"],
  "editor.minimap.enabled": false,
  "workbench.settings.useSplitJSON": true,
  "python.linting.pylintArgs": ["--load-plugin", "pylint_protobuf"],
  "pythonTestExplorer.testFramework": "pytest",
};

function setConfig() {
  const configuration = vscode.workspace.getConfiguration();
  return Object.entries(DEFAULT_USER_SETTINGS).map(async ([key, value]) => {
    try {
      return await configuration.update(
        key as any,
        value,
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      return await setTimeout(() => {}, 0);
    }
  });
}

function configure() {
  const configuration = vscode.workspace.getConfiguration();
  const skip = configuration.get("ispw.ignore_configurations", false);
  if (skip) {
    vscode.window.showInformationMessage(
      "ISPW Configuration is ignored. Edit your settings"
    );
    return new Promise((resolve) => resolve());
  }
  vscode.window.showInformationMessage(`Configure vs code`);
  return Promise.all(setConfig()).then(() => {
    vscode.window.showInformationMessage(`configuration done`);
  });
}

function extensionVersion(context: vscode.ExtensionContext) {
  var extensionPath = join(context.extensionPath, "package.json");
  var packageFile = JSON.parse(readFileSync(extensionPath, "utf8"));

  return packageFile?.version ?? "0.0.1";
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const configuration = vscode.workspace.getConfiguration();
  vscode.commands
    .executeCommand("python2go.isPythonInstalled")
    .then((isInstalled) => {
      if (isInstalled) {
        vscode.commands
          .executeCommand("python2go.pipPackages")
          .then((pkgs: any) => {
            const packages = pkgs as PipPackage[];
            const toUninstall = PIP_PACKAGES.filter((pkg) =>
              packages.some(
                (installed) =>
                  installed.package === pkg.package &&
                  installed.version !== pkg.version
              )
            );
            console.log(toUninstall);
            return new Promise((resolve) => {
              if (toUninstall.length === 0) {
                return resolve(true);
              }
              return resolve(
                vscode.commands.executeCommand(
                  "python2go.pip",
                  `uninstall -y ${toUninstall.map((p) => p.package).join(" ")}`
                )
              );
            }).then(() => {
              const toInstall = PIP_PACKAGES.filter(
                (pkg) =>
                  !packages.some(
                    (installed) => installed.package === pkg.package && installed.version === pkg.version
                  )
              );
              if (toInstall.length > 0) {
                const target = process.platform === "win32" ? "--user" : "";
                const toInstallPkgs = toInstall.map((pkg) => `${pkg.package}==${pkg.version}`);
                return vscode.commands.executeCommand(
                  "python2go.pip",
                  `install ${target} ${toInstallPkgs.join(" ")}`
                );
              }
              return new Promise((resolve) => resolve());
            });
          })
          .then(() => {
            if (configuration.get("ispw.ignore_configurations", false)) {
              return;
            }
            const configVersion = context.globalState.get("configVersion");
            const pluginVersion = extensionVersion(context);
            if (configVersion !== pluginVersion) {
              return configure().then(() => {
                context.globalState.update("configVersion", pluginVersion);
              });
            }
          });
      }
    });

  let configureDisposer = vscode.commands.registerCommand(
    "ispw.configure",
    () => {
      return configure().then(() => {
        vscode.window.showInformationMessage("Configured ISPW settings");
      });
    }
  );
  context.subscriptions.push(configureDisposer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
