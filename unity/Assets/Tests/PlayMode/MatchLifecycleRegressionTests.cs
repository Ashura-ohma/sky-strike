#if UNITY_EDITOR
using System.Collections;
using NUnit.Framework;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Core;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
namespace SkyStrike.Tests
{
    public sealed class MatchLifecycleRegressionTests
    {
        BattleRuntime battle;
        [UnitySetUp] public IEnumerator Setup()
        {
            Time.timeScale=1;
            yield return EditorSceneManager.LoadSceneAsyncInPlayMode("Assets/Scenes/Battle/Battle.unity",new LoadSceneParameters(LoadSceneMode.Single));
            yield return null; yield return null;
            battle=Object.FindFirstObjectByType<BattleRuntime>();
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            Time.timeScale=1;
            Scene active=SceneManager.GetSceneByName("Battle");
            SceneManager.SetActiveScene(SceneManager.CreateScene("Lifecycle cleanup"));
            if(active.IsValid()&&active.isLoaded) yield return SceneManager.UnloadSceneAsync(active);
        }
        Combatant Find(UnitKind kind,int team)
        {
            foreach(Combatant c in Combatant.Active) if(c.Kind==kind&&c.Team==team) return c;
            Assert.Fail("Missing actor");return null;
        }
        [UnityTest] public IEnumerator DestroyedTowerStopsBlockingAndRendering()
        {
            Combatant tower=Find(UnitKind.Tower,1);tower.ReceiveDamage(100000,Find(UnitKind.Hero,0));
            yield return null;
            Assert.That(tower.Alive,Is.False);
            Assert.That(tower.GetComponent<NavMeshObstacle>().enabled,Is.False);
            Assert.That(tower.GetComponent<Renderer>().enabled,Is.False);
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator HeroDeathRemovesCrowdBlockAndRespawnClearsStun()
        {
            Combatant hero=Find(UnitKind.Hero,0);CharacterMotor motor=hero.GetComponent<CharacterMotor>();
            hero.GetComponent<RespawnController>().Delay=.15f;
            motor.Stun(30);hero.ReceiveDamage(100000,Find(UnitKind.Hero,1));
            Assert.That(hero.GetComponent<NavMeshAgent>().enabled,Is.False);
            yield return new WaitForSeconds(.25f);
            Assert.That(hero.Alive,Is.True);Assert.That(hero.Health,Is.EqualTo(hero.MaxHealth));
            Assert.That(hero.GetComponent<NavMeshAgent>().isOnNavMesh,Is.True);
            Assert.That(motor.StunnedUntil,Is.LessThanOrEqualTo(Time.time));
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator RecycledMinionClearsDeathAnimationAndStun()
        {
            Combatant minion=Find(UnitKind.Minion,0);CharacterMotor motor=minion.GetComponent<CharacterMotor>();
            motor.Stun(30);minion.ReceiveDamage(100000,Find(UnitKind.Hero,1));
            Assert.That(minion.GetComponent<NavMeshAgent>().enabled,Is.False);
            typeof(BattleRuntime).GetField("nextWave",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic).SetValue(battle,0f);
            yield return null;yield return null;
            Assert.That(minion.Alive,Is.True);Assert.That(minion.GetComponent<NavMeshAgent>().isOnNavMesh,Is.True);
            Assert.That(motor.StunnedUntil,Is.LessThanOrEqualTo(Time.time));
            Assert.That(minion.GetComponent<AnimationGate>().Busy,Is.False);
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator RepeatedWavesKeepFixedPoolsAndFiniteVitals()
        {
            Time.timeScale=8;
            float deadline=Time.realtimeSinceStartup+16;
            int samples=0;
            while(Time.realtimeSinceStartup<deadline && !battle.Ended)
            {
                yield return new WaitForSecondsRealtime(.25f);
                samples++;
                foreach(Combatant actor in Combatant.Active)
                {
                    Assert.That(float.IsNaN(actor.Health)||float.IsInfinity(actor.Health),Is.False);
                    Assert.That(actor.Health,Is.InRange(0,actor.MaxHealth));
                    Assert.That(actor.Mana,Is.InRange(0,actor.MaxMana));
                    Vector3 p=actor.transform.position;
                    Assert.That(float.IsNaN(p.x)||float.IsNaN(p.y)||float.IsNaN(p.z),Is.False);
                }
                Assert.That(Object.FindObjectsByType<PooledProjectile>(FindObjectsInactive.Include,FindObjectsSortMode.None).Length,Is.EqualTo(128));
            }
            Assert.That(samples,Is.GreaterThan(1));
            int minions=0;
            foreach(Combatant actor in Object.FindObjectsByType<Combatant>(FindObjectsInactive.Include,FindObjectsSortMode.None)) if(actor.Kind==UnitKind.Minion) minions++;
            Assert.That(minions,Is.EqualTo(18));
            LogAssert.NoUnexpectedReceived();
        }
        [UnityTest] public IEnumerator BaseDeathOffersWorkingRestartAndCleanNewBattle()
        {
            Find(UnitKind.Base,1).ReceiveDamage(100000,Find(UnitKind.Hero,0));yield return null;
            Assert.That(battle.Ended,Is.True);Assert.That(Time.timeScale,Is.Zero);
            Assert.That(battle.RestartButton.gameObject.activeInHierarchy,Is.True);
            battle.RestartButton.onClick.Invoke();
            float deadline=Time.realtimeSinceStartup+10;
            while((battle!=null||Object.FindFirstObjectByType<BattleRuntime>()==null)&&Time.realtimeSinceStartup<deadline) yield return null;
            yield return null;yield return null;
            BattleRuntime replacement=Object.FindFirstObjectByType<BattleRuntime>();
            Assert.That(replacement,Is.Not.Null);Assert.That(replacement.Ended,Is.False);Assert.That(Time.timeScale,Is.EqualTo(1));
            Assert.That(Find(UnitKind.Base,1).Alive,Is.True);
            Assert.That(Object.FindObjectsByType<ProjectilePool>(FindObjectsSortMode.None).Length,Is.EqualTo(1));
            Assert.That(Object.FindObjectsByType<PooledProjectile>(FindObjectsInactive.Include,FindObjectsSortMode.None).Length,Is.EqualTo(128));
            LogAssert.NoUnexpectedReceived();
        }
    }
}
#endif
