#if UNITY_EDITOR
using System.Collections;
using NUnit.Framework;
using SkyStrike.Character;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;

namespace SkyStrike.Tests
{
    public sealed class AnimationGateTests
    {
        const string HeroPrefabPath = "Assets/Prefabs/Heroes/ArcCourier.prefab";
        const float ReleasePoint = .38f;
        GameObject model;
        Animator animator;
        AnimationGate gate;

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(HeroPrefabPath);
            Assert.That(prefab, Is.Not.Null, "Generate the ArcCourier prefab before running PlayMode tests.");
            Animator source = prefab.GetComponentInChildren<Animator>(true);
            Assert.That(source, Is.Not.Null, "The generated hero must contain its real model Animator.");
            Assert.That(source.gameObject, Is.Not.SameAs(prefab), "Instantiate only the model, not the NavMeshAgent hero root.");
            Assert.That(source.runtimeAnimatorController, Is.Not.Null);

            model = Object.Instantiate(source.gameObject);
            animator = model.GetComponent<Animator>();
            animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            animator.speed = 0;
            animator.Rebind();
            animator.Update(0);
            gate = model.AddComponent<AnimationGate>();
            gate.Configure(animator);
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (model != null) Object.Destroy(model);
            yield return null;
        }

        [UnityTest]
        public IEnumerator Attack1ReleasesOnlyWhenRealAnimatorCrossesNormalizedTimeGate()
        {
            int releases = 0, finishes = 0;
            float releaseTime = -1;
            Assert.That(gate.Play("Attack1", ReleasePoint, 1, () =>
            {
                releases++;
                releaseTime = animator.GetCurrentAnimatorStateInfo(0).normalizedTime;
            }, () => finishes++), Is.True);
            Assert.That(releases, Is.Zero, "Play must not release the attack immediately.");

            FreezeAtRequestedState();
            yield return null;
            Assert.That(gate.Busy, Is.True);
            Assert.That(gate.Released, Is.False);
            Assert.That(releases, Is.Zero);

            AdvanceRealAnimation(.2f);
            yield return null;
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).normalizedTime, Is.LessThan(ReleasePoint));
            Assert.That(releases, Is.Zero, "The release must wait for the animation's release point.");

            AdvanceRealAnimation(.25f);
            yield return null;
            Assert.That(releases, Is.EqualTo(1));
            Assert.That(releaseTime, Is.GreaterThanOrEqualTo(ReleasePoint));
            Assert.That(gate.Released, Is.True);
            Assert.That(finishes, Is.Zero);

            AdvanceRealAnimation(.6f);
            yield return null;
            Assert.That(releases, Is.EqualTo(1), "Crossing the release point must fire only once.");
            Assert.That(finishes, Is.EqualTo(1));
            Assert.That(gate.Busy, Is.False);
        }

        [UnityTest]
        public IEnumerator CancelBeforeReleasePreventsCallbacksWhileRealAnimationContinues()
        {
            int releases = 0, finishes = 0;
            Assert.That(gate.Play("Attack1", ReleasePoint, 1, () => releases++, () => finishes++), Is.True);
            FreezeAtRequestedState();
            yield return null;
            AdvanceRealAnimation(.2f);
            yield return null;
            Assert.That(releases, Is.Zero);
            Assert.That(gate.Busy, Is.True);

            gate.Cancel();
            Assert.That(gate.Busy, Is.False);
            Assert.That(gate.Released, Is.False);
            Assert.That(animator.speed, Is.EqualTo(1));

            AdvanceRealAnimation(.3f);
            yield return null;
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).normalizedTime, Is.GreaterThan(ReleasePoint));
            Assert.That(releases, Is.Zero, "Cancellation must suppress release even after the real animation crosses the gate.");

            AdvanceRealAnimation(.6f);
            yield return null;
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).normalizedTime, Is.GreaterThanOrEqualTo(1));
            Assert.That(releases, Is.Zero);
            Assert.That(finishes, Is.Zero, "Cancellation must also suppress the completion callback.");
            Assert.That(gate.Busy, Is.False);
        }

        void FreezeAtRequestedState()
        {
            animator.speed = 0;
            animator.Update(0);
            AnimatorStateInfo state = animator.GetCurrentAnimatorStateInfo(0);
            Assert.That(state.IsName("Attack1"), Is.True);
            Assert.That(state.length, Is.GreaterThan(0), "Attack1 must use a real, non-empty animation clip.");
            Assert.That(state.normalizedTime, Is.EqualTo(0).Within(.001f));
        }

        void AdvanceRealAnimation(float normalizedDelta)
        {
            // Evaluate the generated controller and imported skeletal clip directly. Pausing
            // between evaluations makes the real Update gate independent of editor frame rate.
            animator.speed = 1;
            animator.Update(animator.GetCurrentAnimatorStateInfo(0).length * normalizedDelta);
            animator.speed = 0;
        }
    }
}
#endif
