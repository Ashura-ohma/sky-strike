# First vertical slice acceptance (all native/device items pending)

## Required native gate
- [ ] Package import and project compilation complete without errors
- [ ] Scene generator creates Battle, URP assets, Animator, prefabs, ScriptableObjects and baked NavMesh
- [ ] Real model imports at ~1.81 m, is visible, animated and faces intended forward direction
- [ ] All 26 EditMode and 3 PlayMode tests pass in Unity
- [ ] Genuine ARM64 IL2CPP APK generated, artifact downloaded and installed

## Device flow
- [ ] APK launch → battle → left joystick → target/chase → attack animation → projectile → damage/particles
- [ ] Two touches move and aim concurrently; release/focus loss zeroes movement
- [ ] Deadzone, half/full speed, diagonal clamp, camera-relative direction and smooth facing
- [ ] Target priority modes, sticky lock/cycle, death/range reacquisition without target jitter
- [ ] Attack windup/recovery cadence; move and stun cancel cleanly; old-life shots cannot hit respawn
- [ ] Four skills tap or hold/drag/release; cancel zone cancels without mana/cooldown consumption
- [ ] Capacitor pickup, dash collision, snare, long-range projectile and cooldown/mana UI
- [ ] AI hero, minion waves, tower/base damage, hero death/respawn, victory/defeat

## Known incomplete features / polish
- Bootstrap/Lobby folder boundaries exist, but the first scene recipe currently launches directly into Battle
- Manual target lock is exposed through a system API; world-tap enemy picking/UI target outline is not yet wired
- Several skill states share a licensed shoot clip; original production animation, hit/recall behavior and weapons require visual iteration
- Ability castTime/backswing metadata does not yet drive clip timing; release uses configured normalized animation points
- Generic TargetPoint/AOE support needs dedicated preview/animation tests; the four hero abilities are projectile/dash based
- Hit sparks are basic; crit/shield/heal/tower-specific VFX/audio and custom ShaderGraph are unfinished
- Map is an editor-authored primitive environment blockout, not final fantasy art; character is a real licensed skinned placeholder
- UI text refresh allocates every 0.2 s; zero-GC combat/per-frame allocation and draw-call budgets require profiling
- No addressables, production asset streaming, shop, 5v5, fog or campaign
- No measured Android FPS/thermals/memory. Target is midrange 60 FPS; budgets are goals, not results

## Profiling targets, not measurements
Target frame budget 16.67 ms; 60 FPS at 0.85 render scale; 2× MSAA; one directional light; one shadow cascade, 25 m distance; bounded 18 minions and 128 projectiles. Profile CPU/GPU/GC/draw calls and thermal behavior on a named physical device before changing quality automatically.
