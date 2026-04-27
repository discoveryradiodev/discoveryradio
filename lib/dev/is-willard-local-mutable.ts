export function isWillardLocalMutableEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}
