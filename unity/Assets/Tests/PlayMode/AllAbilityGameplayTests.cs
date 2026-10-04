#if UNITY_EDITOR
using System;
using System.Collections;
using System.Reflection;
using NUnit.Framework;
using SkyStrike.Abilities;
using SkyStrike.AI;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Core;
using SkyStrike.Input;
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
    /// <summary>Production scene, ability assets, skeletal clips, NavMesh and pooled effects.</summary>
    public sealed class AllAbilityGameplayTests
    {
        Scene scene;
        BattleRuntime battle;
        PlayerController controls;
        Combatant player, enemy;
        CharacterMotor motor, enemyMotor;
        AbilityController abilities;
        AnimationGate gate;
        Animator animator;
        PooledProjectile[] shots;
        float oldScale;
        int oldRate, oldVSync;
        readonly Vector3 origin = new Vector3(-8, 0, -4);

        [UnitySetUp]
        public IEnumerator SetUp()
        {
            oldScale = Time.timeScale; oldRate = Application.targetFrameRate; oldVSync = QualitySettings.vSyncCount;
            Time.timeScale = 1;
            yield return EditorSceneManager.LoadSceneAsyncInPlayMode("Assets/Scenes/Battle/Battle.unity", new LoadSceneParameters(LoadSceneMode.Single));
            scene = SceneManager.GetSceneByPath("Assets/Scenes/Battle/Battle.unity");
            yield return null; yield return null;
            battle = UnityEngine.Object.FindFirstObjectByType<BattleRuntime>();
            controls = UnityEngine.Object.FindFirstObjectByType<PlayerController>();
            player = controls.GetComponent<Combatant>(); motor = controls.GetComponent<CharacterMotor>();
            abilities = controls.GetComponent<AbilityController>(); gate = controls.GetComponent<AnimationGate>();
            animator = controls.GetComponentInChildren<Animator>(); animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
            battle.enabled = false;
            foreach (var brain in UnityEngine.Object.FindObjectsByType<LaneBrain>(FindObjectsSortMode.None)) brain.enabled = false;
            foreach (var structure in UnityEngine.Object.FindObjectsByType<StructureAttack>(FindObjectsSortMode.None)) structure.enabled = false;
            foreach (var attack in UnityEngine.Object.FindObjectsByType<AttackController>(FindObjectsSortMode.None))
            { attack.Cancel(); if (attack.gameObject != player.gameObject) attack.enabled = false; }
            // A single live opposing hero makes projectile interception and damage attribution unambiguous.
            foreach (var unit in UnityEngine.Object.FindObjectsByType<Combatant>(FindObjectsSortMode.None))
                if (unit.Kind == UnitKind.Hero && unit.Team != player.Team) enemy = unit;
            Assert.That(enemy, Is.Not.Null);
            foreach (var unit in UnityEngine.Object.FindObjectsByType<Combatant>(FindObjectsSortMode.None))
                if (unit != player && unit != enemy) unit.gameObject.SetActive(false);
            enemyMotor = enemy.GetComponent<CharacterMotor>(); enemyMotor.Stop();
            Assert.That(motor.Warp(origin), Is.True);
            Assert.That(enemyMotor.Warp(origin + Vector3.right * 5), Is.True);
            shots = UnityEngine.Object.FindObjectsByType<PooledProjectile>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            Assert.That(shots, Has.Length.EqualTo(128));
            foreach (var shot in shots) shot.gameObject.SetActive(false);
            Canvas.ForceUpdateCanvases();
        }
        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (scene.IsValid() && scene.isLoaded)
            {
                var cleanup = SceneManager.CreateScene("All ability regression cleanup");
                SceneManager.SetActiveScene(cleanup);
                yield return SceneManager.UnloadSceneAsync(scene);
            }
            Time.timeScale = oldScale; Application.targetFrameRate = oldRate; QualitySettings.vSyncCount = oldVSync;
        }

        [UnityTest]
        public IEnumerator VolleyReleasesDamageThenRetrievalRefundsManaAndDashCooldownOnce()
        {
            // Put the real dash on cooldown first, so retrieval's cooldown reduction is observable.
            Assert.That(abilities.Cast(1, Vector3.left, false), Is.True);
            yield return CrossProductionRelease(1, false);
            abilities.CancelForMovement();
            Assert.That(motor.Warp(origin), Is.True);
            float manaBefore = player.Mana, healthBefore = enemy.Health;
            Tap(0);
            yield return CrossProductionRelease(0, true);
            Assert.That(player.Mana, Is.EqualTo(manaBefore - battle.Hero.abilities[0].manaCost).Within(.001f));
            yield return Until(() => enemy.Health < healthBefore, "Volley failed to hit the isolated target.");
            Assert.That(enemy.Health, Is.EqualTo(healthBefore - battle.Hero.abilities[0].damage).Within(.001f));
            var retrieve = player.GetComponent<WeaponRetrieve>();
            var marker = (Transform)typeof(WeaponRetrieve).GetField("marker", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(retrieve);
            Assert.That(marker.gameObject.activeSelf, Is.True, "Volley impact must leave the actual retrieval marker.");
            float manaAfterCast = player.Mana, cooldownBefore = abilities.CooldownRemaining(1);
            Assert.That(cooldownBefore, Is.GreaterThan(2.2f));
            Assert.That(motor.Warp(enemy.transform.position + Vector3.left), Is.True);
            yield return Until(() => !marker.gameObject.activeSelf, "Walking into the dropped capacitor failed to collect it.");
            Assert.That(player.Mana, Is.EqualTo(manaAfterCast + 18).Within(.001f));
            Assert.That(abilities.CooldownRemaining(1), Is.LessThan(cooldownBefore - 2.1f));
            yield return null; yield return null;
            Assert.That(player.Mana, Is.EqualTo(manaAfterCast + 18).Within(.001f), "One capacitor may refund only once.");
        }

        [UnityTest]
        public IEnumerator DashReleasesOnlyAtClipGateAndClampsToNavMeshBoundary()
        {
            Assert.That(motor.Warp(new Vector3(26, 0, 0)), Is.True);
            Vector3 start = player.transform.position;
            float range = battle.Hero.abilities[1].range;
            int mask = player.GetComponent<NavMeshAgent>().areaMask;
            Assert.That(NavMesh.Raycast(start, start + Vector3.right * range, out NavMeshHit edge, mask), Is.True,
                "Fixture must point beyond the actual baked mesh boundary.");
            Assert.That(NavMesh.SamplePosition(edge.position, out NavMeshHit expected, .5f, mask), Is.True);
            float mana = player.Mana;
            Assert.That(abilities.Cast(1, Vector3.right, false), Is.True);
            yield return CrossProductionRelease(1, false);
            Assert.That(Vector3.Distance(player.transform.position, expected.position), Is.LessThan(.15f));
            float moved = Vector3.Distance(start, player.transform.position);
            Assert.That(moved, Is.GreaterThan(.2f));
            Assert.That(moved, Is.LessThanOrEqualTo(range + .1f));
            Assert.That(player.GetComponent<NavMeshAgent>().isOnNavMesh, Is.True);
            Assert.That(player.Mana, Is.EqualTo(mana - battle.Hero.abilities[1].manaCost).Within(.001f));
        }

        [UnityTest]
        public IEnumerator TetherReleasesProjectileDamageAndAppliesRealMovementStun()
        {
            float health = enemy.Health;
            Tap(2);
            yield return CrossProductionRelease(2, true);
            yield return Until(() => enemy.Health < health, "Tether failed to hit the isolated target.");
            Assert.That(enemy.Health, Is.EqualTo(health - battle.Hero.abilities[2].damage).Within(.001f));
            Assert.That(enemyMotor.StunnedUntil, Is.GreaterThan(Time.time));
            Vector3 position = enemy.transform.position;
            enemyMotor.Move(Vector3.forward);
            Assert.That(enemyMotor.Moving, Is.False);
            Assert.That(Vector3.Distance(position, enemy.transform.position), Is.LessThan(.01f));
            yield return Until(() => Time.time >= enemyMotor.StunnedUntil, "Tether stun never expired.");
            enemyMotor.Move(Vector3.forward);
            Assert.That(enemyMotor.Moving, Is.True, "Target must regain movement when the stun expires.");
        }

        [UnityTest]
        public IEnumerator UltimateTravelsBeyondOtherSkillRangesAndHitsExactlyOnce()
        {
            Assert.That(enemyMotor.Warp(origin + Vector3.right * 18), Is.True);
            float distance = Vector3.Distance(player.transform.position, enemy.transform.position);
            Assert.That(distance, Is.GreaterThan(battle.Hero.abilities[2].range));
            Assert.That(distance, Is.LessThan(battle.Hero.abilities[3].range));
            float health = enemy.Health; int hits = 0;
            enemy.Damaged += (_, amount) => hits++;
            Tap(3);
            yield return CrossProductionRelease(3, true);
            Assert.That(enemy.Health, Is.EqualTo(health), "Ultimate damage must wait for projectile travel.");
            yield return Until(() => hits > 0, "Ultimate failed to reach a long-range target.");
            Assert.That(hits, Is.EqualTo(1));
            Assert.That(enemy.Health, Is.EqualTo(health - battle.Hero.abilities[3].damage).Within(.001f));
            yield return null; yield return null;
            Assert.That(hits, Is.EqualTo(1));
        }

        [UnityTest]
        public IEnumerator ProductionDragToCancelSpendsNothingAndNeverLaunches()
        {
            SkillButton button = battle.Skills[0];
            var pointer = Pointer((RectTransform)button.transform);
            float mana = player.Mana;
            button.OnPointerDown(pointer);
            var zone = (RectTransform)typeof(SkillButton).GetField("cancelZone", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(button);
            Assert.That(zone, Is.Not.Null);
            pointer.position = RectTransformUtility.WorldToScreenPoint(null, zone.TransformPoint(zone.rect.center));
            button.OnDrag(pointer);
            Assert.That(button.IsAiming && button.IsOverCancelZone, Is.True);
            button.OnPointerUp(pointer);
            Assert.That(player.Mana, Is.EqualTo(mana));
            Assert.That(abilities.CooldownRemaining(0), Is.Zero);
            Assert.That(abilities.Casting, Is.False);
            yield return null; yield return null;
            Assert.That(ActiveShots(), Is.Zero);
            Assert.That(player.Mana, Is.EqualTo(mana));
        }

        void Tap(int index)
        {
            Assert.That(player.GetComponent<TargetingSystem>().SetManual(enemy, battle.Hero.abilities[index].range), Is.True);
            var pointer = Pointer((RectTransform)battle.Skills[index].transform);
            battle.Skills[index].OnPointerDown(pointer); battle.Skills[index].OnPointerUp(pointer);
            Assert.That(abilities.Casting, Is.True, "Production button must commit its configured ability.");
        }
        IEnumerator CrossProductionRelease(int index, bool projectile)
        {
            var definition = battle.Hero.abilities[index];
            Vector3 position = player.transform.position;
            float health = enemy.Health;
            foreach (var shot in shots) shot.enabled = false;
            animator.speed = 0; animator.Update(0);
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).IsName(definition.animatorState), Is.True);
            AnimatorClipInfo[] clips = animator.GetCurrentAnimatorClipInfo(0);
            Assert.That(clips, Has.Length.EqualTo(1));
            Assert.That(clips[0].clip, Is.Not.Null);
            Assert.That(clips[0].clip.name, Is.EqualTo(definition.animatorState));
            float duration = clips[0].clip.length;
            Assert.That(duration, Is.GreaterThan(0));
            yield return null;
            Assert.That(gate.Released, Is.False);
            animator.speed = 1; animator.Update(duration * (definition.releaseNormalizedTime - .05f)); animator.speed = 0;
            yield return null;
            Assert.That(gate.Released, Is.False, "Effect must wait for the real clip's normalized release point.");
            Assert.That(enemy.Health, Is.EqualTo(health));
            Assert.That(Vector3.Distance(position, player.transform.position), Is.LessThan(.01f));
            Assert.That(ActiveShots(), Is.Zero);
            animator.speed = 1; animator.Update(duration * .1f); animator.speed = 0;
            yield return null;
            Assert.That(animator.GetCurrentAnimatorStateInfo(0).normalizedTime, Is.GreaterThanOrEqualTo(definition.releaseNormalizedTime));
            Assert.That(gate.Released, Is.True);
            Assert.That(ActiveShots(), Is.EqualTo(projectile ? 1 : 0), "Exactly one pooled projectile may be released.");
            yield return null;
            Assert.That(ActiveShots(), Is.EqualTo(projectile ? 1 : 0), "A held normalized time may not release twice.");
            foreach (var shot in shots) shot.enabled = true;
        }
        int ActiveShots() { int active = 0; foreach (var shot in shots) if (shot.gameObject.activeSelf) active++; return active; }
        static PointerEventData Pointer(RectTransform rect) => new PointerEventData(EventSystem.current)
        { pointerId = 81, button = PointerEventData.InputButton.Left,
            position = RectTransformUtility.WorldToScreenPoint(null, rect.TransformPoint(rect.rect.center)) };
        static IEnumerator Until(Func<bool> condition, string failure)
        {
            float deadline = Time.realtimeSinceStartup + 5;
            while (!condition() && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.That(condition(), Is.True, failure);
        }
    }
}
#endif
