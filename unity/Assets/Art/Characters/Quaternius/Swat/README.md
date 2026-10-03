# Quaternius SWAT animated character

Real artist-authored, skinned FBX placeholder for the original Unity mobile shooter. The humanoid is imported artwork, not a collection of code-generated primitives.

## Provenance and redistribution

- Artist: Quaternius
- Pack: Ultimate Modular Men / Ultimate Modular Males, February 2022
- Official pack page: https://quaternius.com/packs/ultimatemodularcharacters.html
- Official download folder linked by that page: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX
- Original animated FBX: https://drive.google.com/file/d/1WPQ4W5iHj_GXuR_DoDEoi3XOkadEMfHO/view
- Original license file: https://drive.google.com/file/d/1TTvylHa1CsiJuHFWWiv6PFGhLM-aAH5z/view
- License: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
- Original FBX retained byte-for-byte, downloaded 2026-10-03
- FBX size: 8,143,196 bytes
- SHA-256: `c4f76953cf9b5b6625e75c92b5cea3e3f5c1420df26c53934b7e55cc05e0813f`

`License.txt` and `Publisher-How-To-Use.txt` are unmodified publisher files. The pack's public-domain dedication permits redistribution, including source art in this project. No account, checkout, new agreement, paid asset, or Mixamo redistribution was involved.

## Verified content

Inspection performed with Blender 4.3.2's FBX importer:

- FBX binary 7400, 79-bone `CharacterArmature`
- Four real skinned meshes: `Swat_Body`, `Swat_Feet`, `Swat_Head`, `Swat_Legs`
- 3,949 vertices, all with skin weights; 7,754 triangles
- Four color materials, no missing texture-image dependency
- 24 animation takes, 30 fps
- Native FBX take names start with `CharacterArmature|`
- Skin deformation verified on Idle_Gun, Run_Shoot, Gun_Shoot and Death. Loop end matches loop start for Idle_Gun and Run_Shoot; Death ends in a fallen pose

Detailed bone, mesh and animation data is in `AssetAudit.json`; sampled skin deformation is in `DeformationAudit.json`. `Preview.png` is an actual render of this imported FBX in its Idle_Gun pose, with material alpha corrected for preview only.

## Unity integration

Use **Generic** animation for the provided rig and baked clips, with `CharacterArmature` / `Root` as appropriate when choosing the root. The publisher's separate "Humanoid Rig" downloads deliberately omit animations and are not this file. The provided mesh is a humanoid character; this does not assert Unity Humanoid-avatar compatibility without retargeting validation.

Measured standing height after Blender FBX unit conversion: **1.81194 meters**; bottom -0.00148 m, top 1.81046 m. FBX global axes are +Y up, +Z front, +X coordinate; source UnitScaleFactor is 1.0 (centimeters). Start Unity import with `useFileScale = true` and `globalScale = 1`, then verify imported aggregate standing bounds are approximately 1.81 Unity units. Do not apply an arbitrary 100x correction or extra 180-degree rotation before checking the Unity-imported model.

Let Unity inspect the source takes and retain their native ranges. Do not assume Blender's display frames are Unity clip frame numbers. Useful suffix matching:

| Game state | Exact FBX take name | Loop |
|---|---|---|
| Idle | CharacterArmature\|Idle_Gun | Yes |
| Run | CharacterArmature\|Run_Shoot | Yes |
| Attack | CharacterArmature\|Gun_Shoot | No |
| Death | CharacterArmature\|Death | No |

Disable root-motion application for movement controlled by gameplay code. Do not loop death or automatically return it to idle.

**Material import caveat:** Blender reads the FBX material shader alpha as zero, although material diffuse colors have alpha one. Replace/remap these source materials with opaque URP/Lit materials or explicitly force alpha to 1. This also permits original game team colors. Do not change the preserved source FBX to correct materials.

The pack does not include a firearm in this FBX. A separate weapon prop can be attached to the wrist; the actual character remains this skinned model.

## Included takes

Death, Gun_Shoot, HitRecieve, HitRecieve_2, Idle, Idle_Gun, Idle_Gun_Pointing, Idle_Gun_Shoot, Idle_Neutral, Idle_Sword, Interact, Kick_Left, Kick_Right, Punch_Left, Punch_Right, Roll, Run, Run_Back, Run_Left, Run_Right, Run_Shoot, Sword_Slash, Walk, Wave.
