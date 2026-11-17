// Respect the workspace rule: never start the owner's local browser by accident.
if(process.platform==='win32'||process.env.GAME_TESTS_REMOTE!=='1'){
  throw new Error('Browser checks run only in the remote Linux environment with GAME_TESTS_REMOTE=1. No browser was started.');
}
