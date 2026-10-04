# Alpha3 repair checkpoint

This source checkpoint is not a released APK. Native scene regeneration, engine tests, rendering and Android packaging are still pending on the restored build host. Run BuildProject.Create before testing or building these changes; the checked-in alpha2 scene does not yet contain the new HUD references.

## Confirmed defects addressed in source
- Holding movement cancelled committed skills and attacks before their animation release
- Attack cancellation could cancel another component's skill animation
- End-of-animation releases and replacement actions started inside release callbacks could be lost
- Skill targeting could erase the manual attack lock; old-life locks could survive target respawn
- Death/focus loss/pause left stale input gestures or action state
- Aim indicators lagged moving heroes and unrelated fingers could hide them
- Dead agents and destroyed tower obstacles continued blocking the lane
- Respawn and minion reuse retained stun/death state
- Attacks and skills could release while the model still faced away
- Match end froze without an in-game restart
- HUD lacked safe-area handling, team/health identity, target health and per-skill availability

## Verification
- C# compilation against real Unity engine/editor/test reference assemblies: passed
- Expanded native tests: written, not run yet
- Added production-scene checks for every ability, held joystick plus skill/attack, cancellation, stun/pickup, death/respawn/wave reuse, match restart and bounded multi-wave stability
- Added bounded offscreen URP capture entrypoint for visual inspection at 16:9 and wide aspect ratios
- Physical Android touch/rendering/FPS: not measured

Input policy: a committed attack or skill owns its brief windup; drag-to-cancel applies before skill commitment, held movement resumes during recovery.
