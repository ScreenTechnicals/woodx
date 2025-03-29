import chalk from "chalk";
import figlet from "figlet";
import fs from 'fs';
import { YAML } from "zx";

export const getUniqueName = (name: string) => {
  return `${name}-${new Date().getTime()}`;
};

export const showBanner = () => {
  console.log(
    "\n",
    chalk.cyan(
      figlet.textSync("woodx", {
        font: "ANSI Shadow",
        horizontalLayout: "full",
        verticalLayout: "default",
      })
    )
  );
};

export const updateYMALConfig = <T extends object>(
  configPath: string,
  config: T,
  updates: Partial<T>
): void => {
  Object.assign(config, updates);
  fs.writeFileSync(configPath, YAML.stringify(config), 'utf8');
  console.log(`✅ Configuration updated in ${configPath}`);
};