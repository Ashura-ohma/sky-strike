# Native build path and blockers

## Supported build environment

Unity 6000.0.58f2 (revision 92dee566b325), Android Build Support, OpenJDK 17, NDK r27c and Android SDK. This patched Unity version avoids the security issue present in the initial 6000.0.38f1 candidate.

A legitimate activated Unity license is required. The account owner must sign in through Unity and confirm license eligibility on the chosen build host. Never commit `.ulf`, passwords, tokens, signing keys, or license files.

Official account instructions: https://docs.unity.com/en-us/cloud/accounts/create-account
Official Unity terms: https://unity.com/legal/editor-terms-of-service/software
Official Android tools terms: https://developer.android.com/studio/terms

## Option A: licensed local/editor runner

1. Install/activate the matching editor through the supported Unity flow.
2. Open the project and resolve package import errors.
3. Run `SkyStrike.Editor.BuildProject.Create` (menu: Sky Strike/Create vertical slice).
4. Run EditMode and PlayMode tests through Test Runner.
5. Build via `SkyStrike.Editor.BuildProject.Android`.
6. Verify `Builds/Android/sky-strike-unity.apk`, install on an ARM64 phone, and complete ACCEPTANCE.md.

The Android build is a separate development/debug-signed app, package `com.skystrike.arccourier.unity`; it does not update the old WebView app or migrate its saves.

## Option B: GitHub Actions / GameCI

The committed workflow only runs on `unity-moba`. Current GameCI Personal-license setup is documented at https://game.ci/docs/github/activation/ and requires local Hub activation followed by user-managed repository Actions secrets named UNITY_LICENSE, UNITY_EMAIL and UNITY_PASSWORD. Enter sensitive values directly into GitHub's secure settings, never chat or source. Creating persistent access or uploading credentials requires the user's own secure action/approval. Do not weaken a password to satisfy tooling.

The workflow deliberately fails early if licensing is missing, before Unity tests/build, instead of creating a fake artifact. Once a supported license is configured, it runs native tests, executes the custom Android build method and uploads the genuine APK. Container image availability and native import are not verified yet; failures still need diagnosis on the exact source commit.

## Checks already performed

`python3 Tools/reference_compile.py /path/to/Unity/Editor/Data` compiles runtime and editor C# against real Unity engine/reference/template DLLs. This is a useful syntax/API check only. It cannot load the game engine, import FBX, bake NavMesh, execute tests, create scenes or build an APK.

No 60 FPS, device compatibility, final art, or successful native-build claims are made.

## Native validation checkpoint (2026-10-03)

The official licensed desktop Unity CLI successfully imported packages, compiled the project, authored assets, saved the Battle scene/NavMesh, and ran all native tests: 26 EditMode and 8 PlayMode passed, zero failures.

Splitting `CreateAssets` and `CreateScene`, preserving imported clips, and saving the controller before prefab authoring recovered the earlier repeated authoring stall. Each stage completed with exit 0. This does not prove a unique root cause for the earlier resource contention.

A subsequent full graphical editor preview stopped repainting and cloud desktop control calls timed out. Valid graphical QA has not completed. Android build has not yet started, and no APK exists at this checkpoint. Resume with the supported headless `SkyStrike.Editor.BuildProject.Android` command only after confirming no other Unity process owns the project. Do not launch overlapping editor/build instances.

The successful headless runs used `BEE_BUILD_THREADS=1`, `DOTNET_PROCESSOR_COUNT=2`, two-CPU affinity, `-job-worker-count 2`, `-batchmode` and `-nographics`. Do not delete the import cache unnecessarily. Test runs omit `-quit` so the native runner can finish and write XML.
