using System.Collections;
using NUnit.Framework;
using SkyStrike.Combat;
using UnityEngine;
using UnityEngine.TestTools;
namespace SkyStrike.Tests
{
    public sealed class ProjectileTests
    {
        [UnityTest] public IEnumerator ProjectileAppliesDamageOnTravelNotLaunch()
        {
            GameObject sourceObject = new GameObject("source"); Combatant source = sourceObject.AddComponent<Combatant>(); source.Configure(0, UnitKind.Hero, 100, 0);
            GameObject targetObject = new GameObject("target"); Combatant target = targetObject.AddComponent<Combatant>(); target.Configure(1, UnitKind.Hero, 100, 0); target.transform.position = Vector3.right * 4;
            GameObject shot = new GameObject("shot"); PooledProjectile projectile = shot.AddComponent<PooledProjectile>();
            projectile.Launch(source, target, Vector3.up, Vector3.right, 20, 20, 8, .2f, 0, false);
            Assert.That(target.Health, Is.EqualTo(100));
            yield return new WaitForSeconds(.3f);
            Assert.That(target.Health, Is.EqualTo(80)); Assert.That(shot.activeSelf, Is.False);
            Object.Destroy(sourceObject); Object.Destroy(targetObject); Object.Destroy(shot);
        }
        [UnityTest] public IEnumerator ManualShotCanHitElevatedTowerRoot()
        {
            GameObject a = new GameObject("source"), b = new GameObject("tower"), shot = new GameObject("shot");
            Combatant source = a.AddComponent<Combatant>(); source.Configure(0, UnitKind.Hero, 100, 0);
            Combatant tower = b.AddComponent<Combatant>(); tower.Configure(1, UnitKind.Tower, 100, 0); tower.transform.position = new Vector3(4, 1, 0);
            shot.AddComponent<PooledProjectile>().Launch(source, null, Vector3.up, Vector3.right, 20, 20, 8, .3f, 0, false);
            yield return new WaitForSeconds(.3f);
            Assert.That(tower.Health, Is.EqualTo(80));
            Object.Destroy(a); Object.Destroy(b); Object.Destroy(shot);
        }
        [UnityTest] public IEnumerator OldProjectileCannotDamageRespawnedTarget()
        {
            GameObject a = new GameObject("source"), b = new GameObject("target"), shot = new GameObject("shot");
            Combatant source = a.AddComponent<Combatant>(); source.Configure(0, UnitKind.Hero, 100, 0);
            Combatant target = b.AddComponent<Combatant>(); target.Configure(1, UnitKind.Hero, 100, 0); target.transform.position = Vector3.right * 4;
            shot.AddComponent<PooledProjectile>().Launch(source, target, Vector3.up, Vector3.right, 20, 20, 8, .2f, 0, false);
            target.Restore(); yield return null;
            Assert.That(target.Health, Is.EqualTo(100)); Assert.That(shot.activeSelf, Is.False);
            Object.Destroy(a); Object.Destroy(b); Object.Destroy(shot);
        }
        [UnityTest] public IEnumerator DestroyedTargetDoesNotConvertHomingShotToFreeShot()
        {
            GameObject a = new GameObject("source"), b = new GameObject("target"), c = new GameObject("bystander"), shot = new GameObject("shot");
            Combatant source = a.AddComponent<Combatant>(); source.Configure(0, UnitKind.Hero, 100, 0);
            Combatant target = b.AddComponent<Combatant>(); target.Configure(1, UnitKind.Hero, 100, 0); target.transform.position = Vector3.right * 4;
            Combatant bystander = c.AddComponent<Combatant>(); bystander.Configure(1, UnitKind.Minion, 100, 0); bystander.transform.position = Vector3.right * 2;
            shot.AddComponent<PooledProjectile>().Launch(source, target, Vector3.up, Vector3.right, 20, 20, 8, .2f, 0, false);
            Object.Destroy(b); yield return new WaitForSeconds(.3f);
            Assert.That(bystander.Health, Is.EqualTo(100)); Assert.That(shot.activeSelf, Is.False);
            Object.Destroy(a); Object.Destroy(c); Object.Destroy(shot);
        }
    }
}
