#if UNITY_EDITOR
using System.Collections;
using System.Reflection;
using NUnit.Framework;
using SkyStrike.Character;
using SkyStrike.Combat;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;

namespace SkyStrike.Tests
{
    public sealed class AnimationOwnershipTests
    {
        GameObject model;
        Animator animator;
        AnimationGate gate;
        [UnitySetUp] public IEnumerator SetUp()
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Heroes/ArcCourier.prefab");
            Assert.That(prefab, Is.Not.Null);
            model = Object.Instantiate(prefab.GetComponentInChildren<Animator>(true).gameObject);
            animator = model.GetComponent<Animator>(); animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            animator.Rebind(); animator.Update(0);
            gate = model.AddComponent<AnimationGate>(); gate.Configure(animator);
            yield return null;
        }
        [UnityTearDown] public IEnumerator TearDown()
        { Object.Destroy(model); yield return null; }
        void Freeze()
        { animator.Update(0); animator.speed = 0; }
        void Advance(float fraction)
        {
            AnimationClip clip = animator.GetCurrentAnimatorClipInfo(0)[0].clip;
            animator.speed = 1; animator.Update(clip.length * fraction); animator.speed = 0;
        }
        [UnityTest] public IEnumerator UnrelatedOwnerCannotCancelSkillRelease()
        {
            object skill = new object(), attack = new object(); int releases = 0;
            Assert.That(gate.Play("Skill1", .4f, 1, () => releases++, null, skill), Is.True);
            Freeze(); yield return null;
            Assert.That(gate.CancelOwnedBy(attack), Is.False);
            Assert.That(gate.IsOwnedBy(skill), Is.True);
            Advance(.5f); yield return null;
            Assert.That(releases, Is.EqualTo(1));
            Assert.That(gate.CancelOwnedBy(skill), Is.True);
            Assert.That(gate.Busy, Is.False);
        }
        [UnityTest] public IEnumerator AttackCancellationDoesNotCancelAbilityOwnedGate()
        {
            // Only wire the actual shared gate: no NavMesh/AI is needed for this controller regression.
            AttackController attacks = model.AddComponent<AttackController>();
            typeof(AttackController).GetField("animationGate", BindingFlags.Instance | BindingFlags.NonPublic).SetValue(attacks, gate);
            object skill = new object(); int releases = 0;
            gate.Play("Skill1", .4f, 1, () => releases++, null, skill);
            Freeze(); yield return null;
            attacks.CancelForMovement(); attacks.Cancel();
            Assert.That(attacks.Windup, Is.False);
            Assert.That(gate.IsOwnedBy(skill), Is.True);
            Advance(.5f); yield return null;
            Assert.That(releases, Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator CallbacklessDeathStillOwnsAnimationUntilCompletion()
        {
            Assert.That(gate.Play("Death", 1, 1, null, null), Is.True);
            Freeze(); yield return null;
            Assert.That(gate.Busy, Is.True);
            gate.Locomotion(true); animator.Update(0);
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).IsName("Death"), Is.True);
            Advance(1.1f); yield return null;
            Assert.That(gate.Busy, Is.False);
        }
        [UnityTest] public IEnumerator EndOfClipReleaseCannotBeDroppedByEarlyFinish()
        {
            int releases = 0, finishes = 0;
            gate.Play("Attack1", 1, 1, () => releases++, () => finishes++);
            Freeze(); yield return null;
            Advance(.99f); yield return null;
            Assert.That(gate.Busy, Is.True);
            Assert.That(finishes, Is.Zero);
            Advance(.03f); yield return null;
            Assert.That(releases, Is.EqualTo(1));
            Assert.That(finishes, Is.EqualTo(1));
        }
        [UnityTest] public IEnumerator ReleaseCallbackCanStartNewActionWithoutOldFinishClearingIt()
        {
            object newOwner = new object(); int oldFinishes = 0;
            gate.Play("Attack1", .4f, 1,
                () => gate.Play("Skill1", .4f, 1, null, null, newOwner), () => oldFinishes++);
            Freeze(); yield return null;
            Advance(1.1f); yield return null;
            Assert.That(oldFinishes, Is.Zero);
            Assert.That(gate.IsOwnedBy(newOwner), Is.True);
        }
    }
}
#endif
