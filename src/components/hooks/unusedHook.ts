// This is just a sample file to have the env key detected
export const unusedHook = () => {
  const hook = process.env.MY_HOOK_ENV
  console.log(hook)
  return 'unusedHook'
}