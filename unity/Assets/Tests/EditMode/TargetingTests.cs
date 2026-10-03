using NUnit.Framework;
using SkyStrike.Combat;
using SkyStrike.Targeting;
using UnityEngine;
namespace SkyStrike.Tests
{
    public sealed class TargetingTests
    {
        GameObject ownerObject, aObject, bObject;
        Combatant owner, a, b; TargetingSystem targeting;
        [SetUp] public void SetUp()
        {
            ownerObject = new GameObject("owner"); owner = ownerObject.AddComponent<Combatant>(); owner.Configure(0, UnitKind.Hero, 100, 100);
            targeting = ownerObject.AddComponent<TargetingSystem>(); targeting.Configure(owner);
            aObject = new GameObject("a"); a = aObject.AddComponent<Combatant>(); a.Configure(1, UnitKind.Minion, 100, 0); a.transform.position = Vector3.right;
            bObject = new GameObject("b"); b = bObject.AddComponent<Combatant>(); b.Configure(1, UnitKind.Hero, 500, 0); b.transform.position = Vector3.right * 4;
            // EditMode does not dispatch MonoBehaviour.OnEnable for runtime-only components.
            // Seed the selection fixture explicitly; PlayMode scene tests cover registration.
            Combatant.Active.Add(owner); Combatant.Active.Add(a); Combatant.Active.Add(b);
        }
        [TearDown] public void TearDown()
        {
            Combatant.Active.Remove(owner); Combatant.Active.Remove(a); Combatant.Active.Remove(b);
            Object.DestroyImmediate(ownerObject); Object.DestroyImmediate(aObject); Object.DestroyImmediate(bObject);
        }
        [Test] public void HeroPriorityWinsOverNearMinion() { Assert.That(targeting.Acquire(6), Is.SameAs(b)); }
        [Test] public void StickyTargetDoesNotJitterWhenCloserEnemyAppears()
        { targeting.SetPriority(TargetPriority.Nearest, false); Assert.That(targeting.Acquire(6), Is.SameAs(a)); b.transform.position = Vector3.right * .1f; Assert.That(targeting.Acquire(6), Is.SameAs(a)); }
        [Test] public void DeadLockReacquires()
        { targeting.SetManual(b, 6); b.ReceiveDamage(500, owner); Assert.That(targeting.Acquire(6), Is.SameAs(a)); Assert.That(targeting.Manual, Is.Null); }
        [Test] public void OutOfRangeLockReacquires()
        { targeting.SetManual(b, 6); b.transform.position = Vector3.right * 30; Assert.That(targeting.Acquire(6), Is.SameAs(a)); }
        [Test] public void LowestAbsoluteAndPercentDiffer()
        {
            b.ReceiveDamage(350, owner);
            targeting.SetPriority(TargetPriority.LowestHealth, false); Assert.That(targeting.Acquire(6), Is.SameAs(a));
            targeting.SetPriority(TargetPriority.LowestHealthPercent, false); Assert.That(targeting.Acquire(6), Is.SameAs(b));
        }
        [Test] public void FriendlyCannotBeManuallyLocked() { Assert.That(targeting.SetManual(owner, 6), Is.False); }
        [Test] public void RestoreIncrementsLifeVersion() { int prior = b.LifeVersion; b.Restore(); Assert.That(b.LifeVersion, Is.EqualTo(prior + 1)); }
        [Test] public void DeathEventOccursOnce()
        { int deaths = 0; b.Died += _ => deaths++; b.ReceiveDamage(999, owner); b.ReceiveDamage(999, owner); Assert.That(deaths, Is.EqualTo(1)); }
    }
}
