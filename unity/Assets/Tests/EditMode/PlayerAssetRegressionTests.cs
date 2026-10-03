using System.IO;
using NUnit.Framework;
using SkyStrike.Core;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace SkyStrike.Tests
{
    public sealed class PlayerAssetRegressionTests
    {
        [Test]
        public void SidearmsStayHandSizedInImportedRigWorldSpace()
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Heroes/ArcCourier.prefab");
            GameObject hero = Object.Instantiate(prefab);
            try
            {
                int count = 0;
                foreach (MeshRenderer renderer in hero.GetComponentsInChildren<MeshRenderer>(true))
                {
                    if (renderer.name != "Arc capacitor sidearm") continue;
                    count++;
                    Assert.That(renderer.bounds.size.magnitude, Is.InRange(.1f, .65f), "Bone unit conversion must not enlarge the weapon.");
                    Assert.That(Vector3.Distance(renderer.bounds.center, renderer.transform.parent.position), Is.LessThan(.3f));
                }
                Assert.That(count, Is.EqualTo(2));
                GameObject model = hero.GetComponentInChildren<Animator>().gameObject;
                foreach (AnimationClip clip in model.GetComponent<Animator>().runtimeAnimatorController.animationClips)
                {
                    foreach (float fraction in new[] { 0f, .25f, .6f, .95f })
                    {
                        clip.SampleAnimation(model, clip.length * fraction);
                        foreach (MeshRenderer renderer in hero.GetComponentsInChildren<MeshRenderer>(true))
                        {
                            if (renderer.name != "Arc capacitor sidearm") continue;
                            Assert.That(renderer.bounds.size.magnitude, Is.InRange(.1f, .65f), clip.name);
                            Assert.That(Vector3.Distance(renderer.bounds.center, renderer.transform.parent.position), Is.LessThan(.3f), clip.name);
                        }
                    }
                }
                foreach (ParticleSystemRenderer renderer in hero.GetComponentsInChildren<ParticleSystemRenderer>(true))
                {
                    Assert.That(renderer.sharedMaterial, Is.Not.Null);
                    Assert.That(renderer.sharedMaterial.shader.name, Is.EqualTo("Universal Render Pipeline/Particles/Unlit"));
                }
            }
            finally { Object.DestroyImmediate(hero); }
        }

        [Test]
        public void BattleSerializesEveryRuntimeMeshAndShaderDependency()
        {
            Scene scene = EditorSceneManager.OpenScene("Assets/Scenes/Battle/Battle.unity", OpenSceneMode.Additive);
            try
            {
                BattleRuntime battle = null;
                foreach (GameObject root in scene.GetRootGameObjects())
                    if (root.TryGetComponent(out BattleRuntime candidate)) battle = candidate;
                Assert.That(battle, Is.Not.Null);
                Assert.That(battle.CylinderMesh, Is.Not.Null);
                Assert.That(battle.CubeMesh, Is.Not.Null);
                Assert.That(battle.WorldMaterial.shader.name, Is.EqualTo("Universal Render Pipeline/Lit"));
                Assert.That(battle.IndicatorMaterial.shader.name, Is.EqualTo("Universal Render Pipeline/Particles/Unlit"));
            }
            finally { EditorSceneManager.CloseScene(scene, true); }
        }

        [Test]
        public void PlayerRuntimeDoesNotDependOnDynamicBuiltinLookup()
        {
            foreach (string path in Directory.GetFiles("Assets/Scripts", "*.cs", SearchOption.AllDirectories))
            {
                string source = File.ReadAllText(path);
                Assert.That(source, Does.Not.Contain("GameObject.CreatePrimitive("), path);
                Assert.That(source, Does.Not.Contain("Shader.Find("), path);
            }
        }
    }
}
