#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using SkyStrike.AI;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Core;
using SkyStrike.Targeting;
using SkyStrike.UI;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace SkyStrike.Tests
{
    public sealed class BattleSceneSmokeTests
    {
        const string ScenePath = "Assets/Scenes/Battle/Battle.unity";
        Scene battleScene;
        BattleRuntime battle;
        PlayerController controls;
        Combatant player, rival;
        float previousTimeScale;
        int previousTargetFrameRate, previousVSyncCount;

        [UnitySetUp]
        public IEnumerator LoadGeneratedBattle()
        {
            previousTimeScale = Time.timeScale;
            previousTargetFrameRate = Application.targetFrameRate;
            previousVSyncCount = QualitySettings.vSyncCount;
            Time.timeScale = 1;
            yield return EditorSceneManager.LoadSceneAsyncInPlayMode(ScenePath,
                new LoadSceneParameters(LoadSceneMode.Single));
            battleScene = SceneManager.GetSceneByPath(ScenePath);
            Assert.That(battleScene.IsValid() && battleScene.isLoaded, Is.True);
            SceneManager.SetActiveScene(battleScene);
            // BattleRuntime creates the actors in Start; their own Start methods run next.
            yield return null;
            yield return null;

            BattleRuntime[] runtimes = SceneComponents<BattleRuntime>();
            Assert.That(runtimes, Has.Length.EqualTo(1));
            battle = runtimes[0];
            PlayerController[] players = SceneComponents<PlayerController>();
            Assert.That(players, Has.Length.EqualTo(1));
            controls = players[0];
            player = controls.GetComponent<Combatant>();
            Assert.That(player, Is.Not.Null);
            foreach (Combatant unit in SceneComponents<Combatant>())
                if (unit.Kind == UnitKind.Hero && unit.Team != player.Team) rival = unit;
            Assert.That(rival, Is.Not.Null);
        }

        [UnityTearDown]
        public IEnumerator UnloadGeneratedBattle()
        {
            // The scene owns its spawned actors and fixed pools. Unloading exercises their
            // real destruction callbacks and removes their entries from Combatant.Active.
            if (battleScene.IsValid() && battleScene.isLoaded)
            {
                Scene cleanup = SceneManager.CreateScene("Battle smoke cleanup");
                SceneManager.SetActiveScene(cleanup);
                yield return SceneManager.UnloadSceneAsync(battleScene);
            }
            Time.timeScale = previousTimeScale;
            Application.targetFrameRate = previousTargetFrameRate;
            QualitySettings.vSyncCount = previousVSyncCount;
            battle = null;
            controls = null;
            player = rival = null;
        }

        [UnityTest]
        public IEnumerator GeneratedBattleStartsWithCompletePoolsAndNavigatingOpponent()
        {
            Assert.That(player.Alive && rival.Alive, Is.True);
            Assert.That(player.Team, Is.EqualTo(0));
            Assert.That(rival.Team, Is.EqualTo(1));
            Assert.That(battle.Camera.Target, Is.EqualTo(player.transform));
            Assert.That(battle.Joystick, Is.Not.Null);
            Assert.That(battle.Skills, Has.Length.EqualTo(4));
            foreach (var skill in battle.Skills) Assert.That(skill, Is.Not.Null);
            Assert.That(battle.AttackButton, Is.Not.Null);
            Assert.That(battle.TargetButton, Is.Not.Null);
            Assert.That(battle.Status.text, Does.Contain("Ilyra"));
            Assert.That(EventSystem.current, Is.Not.Null);
            Assert.That(NavMesh.CalculateTriangulation().vertices.Length, Is.GreaterThan(0));

            int heroes = 0, minions = 0, towers = 0, bases = 0;
            int[] activeMinionsByTeam = new int[2];
            foreach (Combatant unit in SceneComponents<Combatant>())
            {
                switch (unit.Kind)
                {
                    case UnitKind.Hero:
                        heroes++;
                        Animator animator = unit.GetComponentInChildren<Animator>();
                        Assert.That(animator, Is.Not.Null);
                        Assert.That(animator.runtimeAnimatorController, Is.Not.Null);
                        Assert.That(animator.HasState(0, Animator.StringToHash("Attack1")), Is.True);
                        Assert.That(unit.GetComponent<NavMeshAgent>().isOnNavMesh, Is.True);
                        break;
                    case UnitKind.Minion:
                        minions++;
                        if (unit.gameObject.activeInHierarchy)
                        {
                            activeMinionsByTeam[unit.Team]++;
                            Assert.That(unit.GetComponent<NavMeshAgent>().isOnNavMesh, Is.True);
                        }
                        break;
                    case UnitKind.Tower: towers++; break;
                    case UnitKind.Base: bases++; break;
                }
            }
            Assert.That(heroes, Is.EqualTo(2));
            Assert.That(minions, Is.EqualTo(18));
            Assert.That(towers, Is.EqualTo(2));
            Assert.That(bases, Is.EqualTo(2));
            Assert.That(activeMinionsByTeam, Is.EqualTo(new[] { 3, 3 }));
            ProjectilePool[] pools = SceneComponents<ProjectilePool>();
            Assert.That(pools, Has.Length.EqualTo(1));
            Assert.That(pools[0].GetComponentsInChildren<PooledProjectile>(true), Has.Length.EqualTo(128));

            LaneBrain brain = rival.GetComponent<LaneBrain>();
            Assert.That(brain != null && brain.enabled, Is.True);
            Assert.That(brain.Goal, Is.Not.Null);
            Combatant goal = brain.Goal.GetComponent<Combatant>();
            Assert.That(goal.Kind, Is.EqualTo(UnitKind.Base));
            Assert.That(goal.Team, Is.EqualTo(player.Team));
            float initialDistance = Vector3.Distance(rival.transform.position, brain.Goal.position);
            yield return new WaitForSeconds(.3f);
            Assert.That(Vector3.Distance(rival.transform.position, brain.Goal.position),
                Is.LessThan(initialDistance - .05f), "The real opposing AI must advance on the baked NavMesh.");
            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator JoystickMovesPlayerAndAttackButtonReleasesPooledProjectileThatHits()
        {
            // Keep the production player, AI target, animation and projectile implementations.
            // Pause unrelated combat so the single observed hit has an unambiguous source.
            battle.enabled = false;
            foreach (LaneBrain brain in SceneComponents<LaneBrain>()) brain.enabled = false;
            foreach (StructureAttack structure in SceneComponents<StructureAttack>()) structure.enabled = false;
            foreach (AttackController attack in SceneComponents<AttackController>())
            {
                attack.Cancel();
                if (attack.gameObject != player.gameObject) attack.enabled = false;
            }
            PooledProjectile[] projectiles = SceneComponents<PooledProjectile>();
            Assert.That(projectiles, Has.Length.EqualTo(128));
            foreach (PooledProjectile shot in projectiles) shot.gameObject.SetActive(false);

            RectTransform area = (RectTransform)battle.Joystick.transform;
            Canvas.ForceUpdateCanvases();
            Vector2 origin = RectTransformUtility.WorldToScreenPoint(null, area.TransformPoint(area.rect.center));
            PointerEventData pointer = new PointerEventData(EventSystem.current)
            {
                pointerId = 91,
                button = PointerEventData.InputButton.Left,
                position = origin
            };
            battle.Joystick.OnPointerDown(pointer);
            pointer.position = RectTransformUtility.WorldToScreenPoint(null,
                area.TransformPoint(area.rect.center + Vector2.right * 180));
            battle.Joystick.OnDrag(pointer);
            Assert.That(battle.Joystick.Value.x, Is.GreaterThan(.5f));
            Vector3 direction = CharacterMotor.CameraRelative(battle.Joystick.Value, controls.CameraTransform).normalized;
            Vector3 start = player.transform.position;
            yield return new WaitForSeconds(.2f);
            battle.Joystick.OnPointerUp(pointer);
            Assert.That(Vector3.Dot(player.transform.position - start, direction), Is.GreaterThan(.1f));
            Assert.That(battle.Joystick.Value, Is.EqualTo(Vector2.zero));
            yield return null;
            CharacterMotor motor = player.GetComponent<CharacterMotor>();
            Assert.That(motor.Moving, Is.False);

            Assert.That(rival.GetComponent<CharacterMotor>().Warp(player.transform.position + Vector3.right * 4), Is.True);
            Assert.That(player.GetComponent<TargetingSystem>().SetManual(rival, battle.Hero.acquisitionRange), Is.True);
            float healthBefore = rival.Health;
            int hits = 0;
            bool releasedWhenHit = false;
            Combatant damagedUnit = null;
            AnimationGate gate = player.GetComponent<AnimationGate>();
            rival.Damaged += (victim, amount) =>
            {
                hits++;
                damagedUnit = victim;
                releasedWhenHit = gate.Released;
            };

            // Suspend only projectile Update until release is observed, avoiding dependence
            // on frame rate or whether a fast projectile reaches its target in one frame.
            foreach (PooledProjectile shot in projectiles) shot.enabled = false;
            battle.AttackButton.onClick.Invoke();
            Assert.That(rival.Health, Is.EqualTo(healthBefore), "Clicking Attack must not deal immediate damage.");
            yield return Until(() => gate.Released, "The player's real attack animation did not release.");
            Assert.That(rival.Health, Is.EqualTo(healthBefore), "Damage must wait for projectile travel.");
            int launched = 0;
            foreach (PooledProjectile shot in projectiles) if (shot.gameObject.activeSelf) launched++;
            Assert.That(launched, Is.EqualTo(1), "One attack must activate exactly one preallocated projectile.");

            foreach (PooledProjectile shot in projectiles) shot.enabled = true;
            yield return Until(() => hits != 0, "The released projectile did not hit the selected opponent.");
            Assert.That(hits, Is.EqualTo(1));
            Assert.That(damagedUnit, Is.SameAs(rival));
            Assert.That(releasedWhenHit, Is.True);
            Assert.That(rival.Health, Is.EqualTo(healthBefore - battle.Hero.attackDamage).Within(.001f));
            foreach (PooledProjectile shot in projectiles) Assert.That(shot.gameObject.activeSelf, Is.False);
            LogAssert.NoUnexpectedReceived();
        }

        static IEnumerator Until(Func<bool> condition, string failure)
        {
            float deadline = Time.realtimeSinceStartup + 10;
            while (!condition() && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.That(condition(), Is.True, failure);
        }

        T[] SceneComponents<T>() where T : Component
        {
            var result = new List<T>();
            foreach (GameObject root in battleScene.GetRootGameObjects())
                result.AddRange(root.GetComponentsInChildren<T>(true));
            return result.ToArray();
        }
    }
}
#endif
