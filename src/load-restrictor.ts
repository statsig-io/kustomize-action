export const appendLoadRestrictor = (args: string[], loadRestrictor: string): string[] => {
  if (
    loadRestrictor === '' ||
    args.some((arg) => arg === '--load-restrictor' || arg.startsWith('--load-restrictor='))
  ) {
    return args
  }
  return [...args, '--load-restrictor', loadRestrictor]
}
