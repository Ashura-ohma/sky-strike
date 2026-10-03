using System;
using System.IO;
using SkyStrike.Abilities;
using SkyStrike.CameraRig;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Core;
using SkyStrike.Data;
using SkyStrike.Input;
using SkyStrike.Targeting;
using Unity.AI.Navigation;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;

namespace SkyStrike.Editor
{
    public static class BuildProject
    {
        const string ModelPath = "Assets/Art/Characters/Quaternius/Swat/Swat.fbx";
        const string ScenePath = "Assets/Scenes/Battle/Battle.unity";
        [MenuItem("Sky Strike/Create vertical slice")]
        public static void Create()
        {
            CreateAssets();
            CreateScene();
        }
        static void Mark(string operation)
        {
            string message = DateTime.UtcNow.ToString("O") + " " + operation;
            Debug.Log("[AUTHOR] " + message);
            Directory.CreateDirectory("Validation");
            File.AppendAllText("Validation/authoring-progress.log", message + Environment.NewLine);
        }
        public static void CreateAssets()
        {
            Mark("assets.begin");
            ConfigureSettings(); ConfigurePipeline();
            Mark("settings.complete");
            ModelImporter importer = AssetImporter.GetAtPath(ModelPath) as ModelImporter;
            if (importer == null) throw new InvalidOperationException("Licensed skinned FBX is missing.");
            if (importer.animationType != ModelImporterAnimationType.Generic || !importer.importAnimation || !importer.useFileScale || importer.globalScale != 1)
            {
                Mark("model.reimport.begin");
                importer.animationType = ModelImporterAnimationType.Generic; importer.importAnimation = true;
                importer.useFileScale = true; importer.globalScale = 1; importer.SaveAndReimport();
                Mark("model.reimport.complete");
            }
            Mark("animator.begin");
            AnimatorController controller = CreateAnimator();
            AssetDatabase.SaveAssets();
            controller = AssetDatabase.LoadAssetAtPath<AnimatorController>("Assets/Art/Animations/ArcCourier.controller");
            if (controller == null || controller.layers.Length != 1 || controller.layers[0].stateMachine.states.Length != 11)
                throw new InvalidOperationException("Saved Animator controller is incomplete.");
            Mark("animator.saved");
            CreateHero(controller); AssetDatabase.SaveAssets(); Mark("hero.saved");
            CreateProjectile(); CreateData(); AssetDatabase.SaveAssets(); Mark("assets.complete");
        }
        public static void CreateScene()
        {
            Mark("scene.begin");
            GameObject hero = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Heroes/ArcCourier.prefab");
            GameObject bolt = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Projectiles/ArcBolt.prefab");
            HeroDefinition data = AssetDatabase.LoadAssetAtPath<HeroDefinition>("Assets/ScriptableObjects/Heroes/Ilyra.asset");
            if (hero == null || bolt == null || data == null) throw new InvalidOperationException("Run CreateAssets successfully before CreateScene.");
            AnimatorController controller = hero.GetComponentInChildren<Animator>().runtimeAnimatorController as AnimatorController;
            if (controller == null || controller.layers.Length != 1 || controller.layers[0].stateMachine.states.Length != 11)
                throw new InvalidOperationException("Persisted hero Animator is incomplete.");
            foreach (ChildAnimatorState state in controller.layers[0].stateMachine.states)
                if (state.state.motion == null) throw new InvalidOperationException("Missing animation for " + state.state.name);
            Mark("scene.dependencies.validated");
            PooledProjectile projectile = bolt.GetComponent<PooledProjectile>();
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            GameObject map = new GameObject("Map · original single lane");
            Piece("Grass", PrimitiveType.Cube, new Vector3(0, -.3f, 0), new Vector3(56, .6f, 26), new Color(.16f, .33f, .23f), map.transform);
            Piece("Stone lane", PrimitiveType.Cube, new Vector3(0, .015f, 0), new Vector3(50, .03f, 6), new Color(.49f, .48f, .40f), map.transform);
            Piece("River north", PrimitiveType.Cube, new Vector3(0, .025f, 8), new Vector3(5, .04f, 8), new Color(.14f, .49f, .6f), map.transform);
            Piece("River south", PrimitiveType.Cube, new Vector3(0, .025f, -8), new Vector3(5, .04f, 8), new Color(.14f, .49f, .6f), map.transform);
            for (int i = 0; i < 12; i++)
            {
                float x = -25 + i * 4.5f; float z = i % 2 == 0 ? 9 : -9;
                Piece("Moss rock", PrimitiveType.Sphere, new Vector3(x, .65f, z), new Vector3(1.8f, 1.3f, 1.5f), new Color(.25f, .32f, .3f), map.transform);
                Piece("Bush", PrimitiveType.Sphere, new Vector3(x + 1.4f, .35f, z), new Vector3(1.7f, .8f, 1.5f), new Color(.18f, .4f, .18f), map.transform);
            }
            NavMeshSurface surface = map.AddComponent<NavMeshSurface>(); surface.collectObjects = CollectObjects.Children;
            surface.useGeometry = NavMeshCollectGeometry.PhysicsColliders; Mark("navmesh.begin"); surface.BuildNavMesh(); Mark("navmesh.complete");
            if (surface.navMeshData == null) throw new InvalidOperationException("NavMesh bake failed.");
            AssetDatabase.DeleteAsset("Assets/Scenes/Battle/SingleLaneNavMesh.asset");
            AssetDatabase.CreateAsset(surface.navMeshData, "Assets/Scenes/Battle/SingleLaneNavMesh.asset");
            GameObject lightObject = new GameObject("Sun"); Light sun = lightObject.AddComponent<Light>(); sun.type = LightType.Directional;
            sun.intensity = 1.1f; sun.shadows = LightShadows.Soft; lightObject.transform.rotation = Quaternion.Euler(50, -25, 0);
            RenderSettings.ambientMode = AmbientMode.Flat; RenderSettings.ambientLight = new Color(.65f, .7f, .8f);
            GameObject cameraObject = new GameObject("Main Camera"); cameraObject.tag = "MainCamera";
            UnityEngine.Camera camera = cameraObject.AddComponent<UnityEngine.Camera>(); camera.fieldOfView = 48; camera.nearClipPlane = .2f; camera.farClipPlane = 90;
            camera.backgroundColor = new Color(.08f, .13f, .19f); camera.clearFlags = CameraClearFlags.SolidColor;
            cameraObject.AddComponent<AudioListener>(); FollowCamera follow = cameraObject.AddComponent<FollowCamera>();
            cameraObject.transform.SetPositionAndRotation(new Vector3(-18, 12, -14), Quaternion.Euler(45, 0, 0));
            BattleRuntime battle = new GameObject("Battle runtime").AddComponent<BattleRuntime>();
            battle.HeroPrefab = hero; battle.Hero = data; battle.ProjectilePrefab = projectile; battle.Camera = follow;
            CreateUI(battle);
            Mark("scene.save.begin");
            if (!EditorSceneManager.SaveScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene(), ScenePath)) throw new InvalidOperationException("Battle scene save failed.");
            Mark("scene.saved");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Vertical slice scene authored; execute PlayMode tests and inspect on device before accepting.");
        }
        static void ConfigureSettings()
        {
            PlayerSettings.companyName = "Sky Strike"; PlayerSettings.productName = "Sky Strike · Arc Courier";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.skystrike.arccourier.unity");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false; PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.useCustomKeystore = false; PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            var settings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            settings.FindProperty("activeInputHandler").intValue = 1; settings.ApplyModifiedPropertiesWithoutUndo();
        }
        static void ConfigurePipeline()
        {
            const string path = "Assets/Art/MobileURP.asset";
            UniversalRenderPipelineAsset pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
            if (pipeline == null)
            {
                UniversalRendererData renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, "Assets/Art/MobileRenderer.asset");
                pipeline = ScriptableObject.CreateInstance<UniversalRenderPipelineAsset>();
                var serialized = new SerializedObject(pipeline); var list = serialized.FindProperty("m_RendererDataList");
                list.arraySize = 1; list.GetArrayElementAtIndex(0).objectReferenceValue = renderer; serialized.ApplyModifiedPropertiesWithoutUndo();
                AssetDatabase.CreateAsset(pipeline, path);
            }
            pipeline.renderScale = .85f; pipeline.msaaSampleCount = 2; pipeline.supportsHDR = false;
            pipeline.shadowDistance = 25; pipeline.shadowCascadeCount = 1;
            GraphicsSettings.defaultRenderPipeline = pipeline; QualitySettings.renderPipeline = pipeline;
        }
        static AnimatorController CreateAnimator()
        {
            const string path = "Assets/Art/Animations/ArcCourier.controller";
            AssetDatabase.DeleteAsset(path);
            AnimatorController controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            UnityEngine.Object[] assets = AssetDatabase.LoadAllAssetsAtPath(ModelPath);
            string[] states = { "Idle", "Run", "Attack1", "Attack2", "Skill1", "Skill2", "Skill3", "Ultimate", "Hit", "Death", "Recall" };
            string[] clips = { "Idle_Gun", "Run_Shoot", "Gun_Shoot", "Gun_Shoot", "Gun_Shoot", "Roll", "Gun_Shoot", "Gun_Shoot", "HitRecieve", "Death", "Idle_Gun" };
            for (int i = 0; i < states.Length; i++)
            {
                AnimationClip clip = FindClip(assets, clips[i]);
                if (clip == null) clip = FindClip(assets, i == 9 ? "Death" : "Gun_Shoot");
                if (clip == null) throw new InvalidOperationException("Required skeletal clip unavailable: " + clips[i]);
                // Native source clips stay untouched; only copy loop flags into a project-owned clip.
                string clipPath = "Assets/Art/Animations/" + states[i] + ".anim";
                AnimationClip copy = AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);
                if (copy == null)
                {
                    copy = UnityEngine.Object.Instantiate(clip); copy.name = states[i];
                    AnimationClipSettings flags = AnimationUtility.GetAnimationClipSettings(copy); flags.loopTime = i < 2 || i == 10;
                    AnimationUtility.SetAnimationClipSettings(copy, flags);
                    AssetDatabase.CreateAsset(copy, clipPath);
                }
                Mark("animator.clip." + states[i]);
                AnimatorState state = controller.layers[0].stateMachine.AddState(states[i]); state.motion = copy;
                if (i == 0) controller.layers[0].stateMachine.defaultState = state;
            }
            return controller;
        }
        static AnimationClip FindClip(UnityEngine.Object[] assets, string suffix)
        { foreach (UnityEngine.Object asset in assets) if (asset is AnimationClip clip && clip.name.EndsWith(suffix, StringComparison.Ordinal)) return clip; return null; }
        static GameObject CreateHero(AnimatorController controller)
        {
            Mark("hero.begin");
            GameObject root = new GameObject("ArcCourier");
            GameObject model = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(ModelPath)); model.transform.SetParent(root.transform, false);
            Mark("hero.model.instantiated");
            Animator animator = model.GetComponent<Animator>(); if (animator == null) animator = model.AddComponent<Animator>();
            animator.runtimeAnimatorController = controller; animator.applyRootMotion = false; animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            foreach (Renderer renderer in model.GetComponentsInChildren<Renderer>())
            {
                Mark("hero.renderer.begin." + renderer.name);
                Material[] mats = renderer.sharedMaterials;
                for (int i = 0; i < mats.Length; i++)
                {
                    Mark("hero.material.begin." + renderer.name + "." + i);
                    Color color = mats[i] != null && mats[i].HasProperty("_Color") ? mats[i].color : new Color(.4f, .65f, .65f);
                    color.a = 1; mats[i] = Material("Courier_" + renderer.name + "_" + i, color);
                    Mark("hero.material.complete." + renderer.name + "." + i);
                }
                Mark("hero.material.assign.begin." + renderer.name);
                renderer.sharedMaterials = mats;
                Mark("hero.material.assign.complete." + renderer.name);
            }
            Mark("hero.bones.begin");
            foreach (Transform bone in model.GetComponentsInChildren<Transform>())
            {
                if (bone.name != "Wrist.L" && bone.name != "Wrist.R") continue;
                Mark("hero.weapon.begin." + bone.name);
                GameObject weapon = GameObject.CreatePrimitive(PrimitiveType.Capsule); weapon.name = "Arc capacitor sidearm";
                UnityEngine.Object.DestroyImmediate(weapon.GetComponent<Collider>()); weapon.transform.SetParent(bone, false);
                weapon.transform.localPosition = new Vector3(0, .04f, .14f); weapon.transform.localRotation = Quaternion.Euler(90, 0, 0);
                weapon.transform.localScale = new Vector3(.08f, .18f, .08f); weapon.GetComponent<Renderer>().sharedMaterial = Material("Capacitor", Color.cyan);
            }
            Mark("hero.components.begin");
            NavMeshAgent agent = root.AddComponent<NavMeshAgent>(); agent.radius = .38f; agent.height = 1.8f; agent.baseOffset = 0;
            root.AddComponent<Combatant>(); root.AddComponent<DeathPresentation>(); root.AddComponent<CharacterMotor>(); root.AddComponent<TargetingSystem>();
            AnimationGate gate = root.AddComponent<AnimationGate>(); gate.Configure(animator);
            root.AddComponent<AttackController>(); root.AddComponent<AbilityController>(); root.AddComponent<WeaponRetrieve>();
            Mark("hero.particles.begin");
            GameObject particles = new GameObject("Hit sparks"); particles.transform.SetParent(root.transform, false); particles.transform.localPosition = Vector3.up;
            ParticleSystem ps = particles.AddComponent<ParticleSystem>(); var main = ps.main; main.playOnAwake = false; main.loop = false; main.duration = .2f; main.startLifetime = .2f; main.startSpeed = 2; main.startSize = .12f; main.maxParticles = 12;
            var emission = ps.emission; emission.rateOverTime = 0; emission.SetBursts(new[] { new ParticleSystem.Burst(0, 8) });
            root.AddComponent<HitFeedback>().HitParticles = ps;
            Mark("hero.prefab.save.begin");
            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, "Assets/Prefabs/Heroes/ArcCourier.prefab", out bool saved);
            if (!saved || prefab == null) throw new InvalidOperationException("Hero prefab save failed.");
            Mark("hero.prefab.save.complete"); UnityEngine.Object.DestroyImmediate(root); return prefab;
        }
        static PooledProjectile CreateProjectile()
        {
            GameObject root = GameObject.CreatePrimitive(PrimitiveType.Sphere); root.name = "ArcBolt"; root.transform.localScale = Vector3.one * .24f;
            UnityEngine.Object.DestroyImmediate(root.GetComponent<Collider>()); root.GetComponent<Renderer>().sharedMaterial = Material("ArcBolt", new Color(.3f, 1, 1));
            root.AddComponent<PooledProjectile>(); GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, "Assets/Prefabs/Projectiles/ArcBolt.prefab");
            UnityEngine.Object.DestroyImmediate(root); return prefab.GetComponent<PooledProjectile>();
        }
        static HeroDefinition CreateData()
        {
            HeroDefinition hero = ScriptableObject.CreateInstance<HeroDefinition>();
            string[] names = { "Capacitor Volley", "Slipstream Step", "Tether Spark", "Horizon Lance" };
            for (int i = 0; i < 4; i++)
            {
                AbilityDefinition ability = ScriptableObject.CreateInstance<AbilityDefinition>(); ability.displayName = names[i];
                ability.type = i == 1 ? AbilityType.Dash : AbilityType.Projectile; ability.effect = (AbilityEffect)i;
                ability.range = new[] { 10f, 4.5f, 11f, 23f }[i]; ability.radius = i == 3 ? .7f : .3f;
                ability.damage = new[] { 78f, 0, 65, 210 }[i]; ability.cooldown = new[] { 6f, 7, 9, 28 }[i];
                ability.manaCost = new[] { 25f, 30, 35, 70 }[i]; ability.animatorState = i == 3 ? "Ultimate" : "Skill" + (i + 1);
                string path = "Assets/ScriptableObjects/Abilities/" + names[i].Replace(" ", "") + ".asset";
                AssetDatabase.DeleteAsset(path); AssetDatabase.CreateAsset(ability, path); hero.abilities[i] = ability;
            }
            const string heroPath = "Assets/ScriptableObjects/Heroes/Ilyra.asset"; AssetDatabase.DeleteAsset(heroPath); AssetDatabase.CreateAsset(hero, heroPath); return hero;
        }
        static Material Material(string name, Color color)
        {
            string path = "Assets/Art/" + name.Replace("|", "_") + ".mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);
            Mark("material.load." + name);
            if (material == null) { material = new Material(Shader.Find("Universal Render Pipeline/Lit")); AssetDatabase.CreateAsset(material, path); }
            Mark("material.configure." + name);
            material.color = color; material.enableInstancing = true; EditorUtility.SetDirty(material); return material;
        }
        static GameObject Piece(string name, PrimitiveType shape, Vector3 pos, Vector3 scale, Color color, Transform parent)
        { GameObject go = GameObject.CreatePrimitive(shape); go.name = name; go.transform.SetParent(parent); go.transform.position = pos; go.transform.localScale = scale; go.GetComponent<Renderer>().sharedMaterial = Material(name, color); go.isStatic = true; return go; }
        static void CreateUI(BattleRuntime battle)
        {
            GameObject canvasObject = new GameObject("Touch HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            Canvas canvas = canvasObject.GetComponent<Canvas>(); canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasScaler scaler = canvasObject.GetComponent<CanvasScaler>(); scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution = new Vector2(1280, 720); scaler.matchWidthOrHeight = .5f;
            RectTransform move = Panel("Floating movement", canvas.transform, new Vector2(0, 0), new Vector2(.48f, .8f), Color.clear);
            RectTransform pad = Panel("Joystick base", move, Vector2.zero, Vector2.zero, new Color(.1f, .2f, .3f, .55f)); pad.sizeDelta = new Vector2(180, 180); pad.GetComponent<Image>().raycastTarget = false;
            RectTransform handle = Panel("Joystick handle", pad, new Vector2(.5f, .5f), new Vector2(.5f, .5f), new Color(.4f, .8f, 1, .8f)); handle.sizeDelta = new Vector2(62, 62); handle.GetComponent<Image>().raycastTarget = false;
            battle.Joystick = move.gameObject.AddComponent<FloatingJoystick>(); battle.Joystick.Configure(pad, handle);
            RectTransform cancel = Panel("Cancel cast", canvas.transform, new Vector2(.78f, .68f), new Vector2(.98f, .84f), new Color(.7f, .15f, .18f, .35f)); cancel.GetComponent<Image>().raycastTarget = false; Label("CANCEL", cancel, 22);
            battle.Skills = new SkillButton[4];
            for (int i = 0; i < 4; i++)
            {
                float left = .55f + i * .105f;
                RectTransform button = Panel("Skill " + (i + 1), canvas.transform, new Vector2(left, .08f), new Vector2(left + .085f, .24f), new Color(.1f, .25f, .35f, .85f));
                battle.Skills[i] = button.gameObject.AddComponent<SkillButton>(); battle.Skills[i].Configure(i, cancel, 100, .18f, 14);
                Label((i + 1) + "\n" + new[] { "VOLLEY", "DASH", "TETHER", "LANCE" }[i], button, 18);
            }
            RectTransform attack = Panel("Attack", canvas.transform, new Vector2(.84f, .3f), new Vector2(.98f, .54f), new Color(.7f, .4f, .12f, .9f)); battle.AttackButton = attack.gameObject.AddComponent<Button>(); Label("ATTACK", attack, 22);
            RectTransform cycle = Panel("Switch target", canvas.transform, new Vector2(.67f, .33f), new Vector2(.8f, .43f), new Color(.2f, .3f, .4f, .8f)); battle.TargetButton = cycle.gameObject.AddComponent<Button>(); Label("TARGET", cycle, 18);
            RectTransform status = Panel("Status", canvas.transform, new Vector2(.02f, .88f), new Vector2(.98f, .99f), new Color(0, 0, 0, .45f)); status.GetComponent<Image>().raycastTarget = false; battle.Status = Label("Loading", status, 20);
        }
        static RectTransform Panel(string name, Transform parent, Vector2 min, Vector2 max, Color color)
        {
            GameObject go = new GameObject(name, typeof(RectTransform), typeof(Image)); go.transform.SetParent(parent, false);
            RectTransform rect = (RectTransform)go.transform; rect.anchorMin = min; rect.anchorMax = max; rect.offsetMin = rect.offsetMax = Vector2.zero;
            go.GetComponent<Image>().color = color; return rect;
        }
        static Text Label(string text, Transform parent, int size)
        {
            GameObject go = new GameObject("Label", typeof(RectTransform), typeof(Text)); go.transform.SetParent(parent, false);
            RectTransform rect = (RectTransform)go.transform; rect.anchorMin = Vector2.zero; rect.anchorMax = Vector2.one; rect.offsetMin = rect.offsetMax = Vector2.zero;
            Text label = go.GetComponent<Text>(); label.text = text; label.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); label.fontSize = size; label.alignment = TextAnchor.MiddleCenter; label.color = Color.white; label.raycastTarget = false; return label;
        }
        [MenuItem("Sky Strike/Preview battle")]
        public static void Preview()
        {
            if (!File.Exists(ScenePath)) throw new InvalidOperationException("Generate the Battle scene first.");
            EditorSceneManager.OpenScene(ScenePath);
            EditorApplication.isPlaying = true;
        }
        public static void Android()
        {
            if (!File.Exists(ScenePath)) Create();
            Directory.CreateDirectory("Builds/Android");
            BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath }, locationPathName = "Builds/Android/sky-strike-unity.apk", target = BuildTarget.Android, options = BuildOptions.Development });
            if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException("Android build failed: " + report.summary.result);
        }
    }
}
