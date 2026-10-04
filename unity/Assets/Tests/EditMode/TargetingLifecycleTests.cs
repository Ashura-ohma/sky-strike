using NUnit.Framework;
using SkyStrike.Combat;
using SkyStrike.Targeting;
using UnityEngine;

namespace SkyStrike.Tests
{
    public sealed class TargetingLifecycleTests
    {
        Combatant owner, near, far;
        TargetingSystem targeting;
        [SetUp] public void SetUp()
        {
            owner = Unit("owner", 0, 0);
            near = Unit("near", 1, 2);
            far = Unit("far", 1, 8);
            targeting = owner.gameObject.AddComponent<TargetingSystem>();
            targeting.Configure(owner); targeting.SetPriority(TargetPriority.Nearest, false);
        }
        Combatant Unit(string name, int team, float x)
        {
            var unit = new GameObject(name).AddComponent<Combatant>();
            unit.Configure(team, UnitKind.Hero, 100, 0); unit.transform.position = Vector3.right * x;
            if (!Combatant.Active.Contains(unit)) Combatant.Active.Add(unit);
            return unit;
        }
        [TearDown] public void TearDown()
        {
            foreach (Combatant unit in new[] { owner, near, far })
            { Combatant.Active.Remove(unit); Object.DestroyImmediate(unit.gameObject); }
        }
        [Test] public void ShortRangeSkillQueryPreservesLongRangeManualLock()
        {
            Assert.That(targeting.SetManual(far, 10), Is.True);
            Assert.That(targeting.Query(4.5f), Is.SameAs(near));
            Assert.That(targeting.Current, Is.SameAs(far));
            Assert.That(targeting.Manual, Is.SameAs(far));
            Assert.That(targeting.Acquire(10), Is.SameAs(far));
        }
        [Test] public void EmptySkillQueryDoesNotEraseAttackSelection()
        {
            targeting.SetManual(far, 10);
            Assert.That(targeting.Query(1), Is.Null);
            Assert.That(targeting.Current, Is.SameAs(far));
            Assert.That(targeting.Manual, Is.SameAs(far));
        }
        [Test] public void RespawnedTargetDoesNotInheritPreviousLifeManualLock()
        {
            targeting.SetManual(far, 10);
            far.ReceiveDamage(100, owner); far.Restore();
            Assert.That(targeting.Acquire(10), Is.SameAs(near));
            Assert.That(targeting.Manual, Is.Null);
        }
        [Test] public void RespawnedTargetDoesNotInheritPreviousLifeStickyLock()
        {
            near.transform.position = Vector3.right * 9;
            Assert.That(targeting.Acquire(10), Is.SameAs(far));
            near.transform.position = Vector3.right * 2;
            far.Restore();
            Assert.That(targeting.Acquire(10), Is.SameAs(near));
        }
        [Test] public void CycleVisitsEachEnemyAndWrapsWithoutSelectingFriendly()
        {
            Combatant first = targeting.Cycle(10);
            Combatant second = targeting.Cycle(10);
            Assert.That(first, Is.Not.SameAs(owner));
            Assert.That(second, Is.Not.SameAs(owner));
            Assert.That(second, Is.Not.SameAs(first));
            Assert.That(targeting.Cycle(10), Is.SameAs(first));
        }
        [Test] public void CycleExcludesDeadAndOutOfRangeTargets()
        {
            far.ReceiveDamage(100, owner);
            Assert.That(targeting.Cycle(10), Is.SameAs(near));
            near.transform.position = Vector3.right * 20;
            Assert.That(targeting.Cycle(10), Is.Null);
            Assert.That(targeting.Current, Is.Null);
            Assert.That(targeting.Manual, Is.Null);
        }
    }
}
