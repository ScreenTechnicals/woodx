import chalk from "chalk";
import figlet from "figlet";

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
