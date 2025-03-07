import chalk from "chalk";

export class ErrorService {
  public handleError(error: unknown, message: string) {
    console.error(chalk.red(`❌ ${message}`));

    if (error instanceof Error) {
      console.error(chalk.gray(`🔍 Details: ${error.message}`));
    } else {
      console.error(chalk.gray(`🔍 Unknown error occurred.`));
    }
  }
}
