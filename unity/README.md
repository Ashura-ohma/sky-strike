# Sky Strike · Arc Courier (Unity migration checkpoint)

**Status: native scene authored and 34 Unity tests passed. Android APK build and visual/device validation remain incomplete.**

This independent Unity 6/C# project lives under `unity/` on `unity-moba`. The old WebView game is retained byte-for-byte as a design reference; it is not loaded or embedded by the new game. `offline-moba` remains at `7ac6fc248cb3c67b19fba0c4b320255699c6840c`.

## Included source

- New Input System uGUI independent touch pointers; floating radial-deadzone joystick and separate tap/hold/drag/release/cancel skill controls
- Separate targeting registry with hero priority, nearest/lowest HP/lowest HP percentage, sticky selection, manual lock API, cycle and invalid-target reacquisition
- NavMesh movement, camera-relative analog magnitude, immediate input release stop, facing, short attack chase, movement cancellation
- Actual Animator normalized-time release gates for attack and abilities; projectile hit applies damage after travel
- Fixed projectile pool, health/mana, stun, death/respawn, one AI hero, bounded minion waves, towers/bases and one small lane
- Ilyra, an original dual-capacitor courier: Capacitor Volley leaves a retrievable charge, Slipstream Step dashes, Tether Spark briefly immobilizes, Horizon Lance is a long-range shot
- CC0 real skinned Quaternius FBX, 79 bones and 24 source clips. SWAT appearance and shared skill clips are visibly provisional, not final fantasy character art
- URP mobile configuration, scene/prefab/Animator/ScriptableObject authoring command, 26 EditMode and 8 PlayMode tests
- Isolated Unity Android workflow; no WebView, Three.js, JavaScript gameplay, old heroes or old APK fallback

## Open in Unity

Use **Unity 6000.0.58f2** with Android Build Support. Open this `unity` directory. After a successful package import, run **Sky Strike → Create vertical slice**, then open `Assets/Scenes/Battle/Battle.unity` and press Play. The scene, prefabs, data assets and controller were generated and saved by Unity 6000.0.58f2. They are included in this branch. The recipe also supports separate `CreateAssets` and `CreateScene` stages, reusing imported clips and saving durable checkpoints.

Controls: left floating joystick; ATTACK taps select/chase/fire; TARGET cycles enemies; four ability buttons tap smartcast or hold/drag/release to aim; drag into CANCEL to discard. Editor WASD/Space convenience controls are included.

## Verification

- PASS: native Unity asset authoring and scene authoring, each exit 0 (2026-10-03)
- PASS: persisted real-rig prefab/controller reload with 11 states and all animation motions present; NavMesh baked and Battle scene saved
- PASS: 26/26 EditMode tests and 8/8 PlayMode tests, native Unity Test Runner, zero failures
- PASS: actual Battle scene startup, both teams, 18 pooled minions, 128 pooled projectiles, towers/bases and AI navigation
- PASS: joystick handler → player movement → Attack button → real Animator release → pooled projectile travel → exact damage
- PASS: source asset skeletal weights, animation deformation and CC0 license audit
- INCOMPLETE: graphical editor preview stopped repainting and native desktop control timed out; no valid visual-QA screenshot was captured
- NOT RUN: Android APK build, phone installation, physical multitouch and frame-time/GC/thermal tests
- No 60 FPS or finished-art claim. SWAT rig, reused clips and primitive map remain prototype placeholders

Test reports: [EditMode](Validation/EditMode.xml), [PlayMode](Validation/PlayMode.xml). These reports establish native editor tests, not Android/device acceptance.

See [build setup](Documentation/BUILD.md), [acceptance checklist](Documentation/ACCEPTANCE.md), and [asset provenance](Assets/Art/Characters/Quaternius/Swat/README.md).
