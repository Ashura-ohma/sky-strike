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
using SkyStrike.UI;
using SkyStrike.Targeting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace SkyStrike.Tests
{
    public sealed class TouchGameplayRegressionTests
    {
        Scene scene;
        BattleRuntime battle;
        PlayerController player;
        AbilityController abilities;
        AnimationGate gate;
        float timeScale;
        int frameRate, vSync;
        [UnitySetUp]
        public IEnumerator SetUp()
        {
            timeScale = Time.timeScale; frameRate = Application.targetFrameRate; vSync = QualitySettings.vSyncCount;
            Time.timeScale = 1;
            yield return EditorSceneManager.LoadSceneAsyncInPlayMode("Assets/Scenes/Battle/Battle.unity", new LoadSceneParameters(LoadSceneMode.Single));
            scene = SceneManager.GetSceneByPath("Assets/Scenes/Battle/Battle.unity");
            yield return null; yield return null;
            battle = UnityEngine.Object.FindFirstObjectByType<BattleRuntime>();
            player = UnityEngine.Object.FindFirstObjectByType<PlayerController>();
            abilities = player.GetComponent<AbilityController>(); gate = player.GetComponent<AnimationGate>();
            battle.enabled = false;
            foreach (var brain in UnityEngine.Object.FindObjectsByType<LaneBrain>(FindObjectsSortMode.None)) brain.enabled = false;
            foreach (var structure in UnityEngine.Object.FindObjectsByType<StructureAttack>(FindObjectsSortMode.None)) structure.enabled = false;
            foreach (var attack in UnityEngine.Object.FindObjectsByType<AttackController>(FindObjectsSortMode.None))
            { attack.Cancel(); if (attack.gameObject != player.gameObject) attack.enabled = false; }
            Canvas.ForceUpdateCanvases();
        }
        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (scene.IsValid() && scene.isLoaded)
            {
                var cleanup = SceneManager.CreateScene("Touch regression cleanup");
                SceneManager.SetActiveScene(cleanup);
                yield return SceneManager.UnloadSceneAsync(scene);
            }
            Time.timeScale = timeScale; Application.targetFrameRate = frameRate; QualitySettings.vSyncCount = vSync;
        }
        [UnityTest]
        public IEnumerator HeldJoystickPreservesCommittedSkillUntilReleaseThenResumesMovement()
        {
            PointerEventData stick = PressAndMoveStick();
            float mana = player.GetComponent<Combatant>().Mana;
            PointerEventData finger = PointerFor((RectTransform)battle.Skills[0].transform, 72);
            battle.Skills[0].OnPointerDown(finger); battle.Skills[0].OnPointerUp(finger);
            Assert.That(abilities.Casting, Is.True);
            var animator = player.GetComponentInChildren<Animator>();
            animator.speed = 0;
            Vector3 start = player.transform.position;
            yield return null; yield return null;
            Assert.That(abilities.Casting, Is.True, "Held movement must not cancel the committed windup.");
            Assert.That(Vector3.Distance(start, player.transform.position), Is.LessThan(.01f));
            Assert.That(battle.Joystick.IsPressed, Is.True);
            Assert.That(player.GetComponent<Combatant>().Mana, Is.EqualTo(mana - battle.Hero.abilities[0].manaCost).Within(.001f));
            animator.speed = 1;
            float deadline = Time.realtimeSinceStartup + 5;
            bool emitted = false;
            while (Time.realtimeSinceStartup < deadline && !emitted)
            {
                foreach (var shot in UnityEngine.Object.FindObjectsByType<PooledProjectile>(FindObjectsSortMode.None))
                    if (shot.gameObject.activeSelf) emitted = true;
                yield return null;
            }
            Assert.That(emitted, Is.True, "Movement plus skill must actually release a projectile.");
            yield return new WaitForSeconds(.15f);
            Assert.That(Vector3.Distance(start, player.transform.position), Is.GreaterThan(.1f));
            battle.Joystick.OnPointerUp(stick);
        }
        [UnityTest]
        public IEnumerator HeldJoystickAttackReachesReleaseAndThenResumesMovement()
        {
            Combatant enemy = null;
            foreach (var unit in Combatant.Active)
                if (unit.Kind == UnitKind.Hero && unit.Team != player.GetComponent<Combatant>().Team) enemy = unit;
            Assert.That(enemy, Is.Not.Null);
            Assert.That(enemy.GetComponent<CharacterMotor>().Warp(player.transform.position + Vector3.right * 3), Is.True);
            player.GetComponent<TargetingSystem>().SetManual(enemy, battle.Hero.acquisitionRange);
            float health = enemy.Health;
            PointerEventData stick = PressAndMoveStick();
            battle.AttackButton.onClick.Invoke();
            float deadline = Time.realtimeSinceStartup + 5;
            while (enemy.Health == health && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.That(enemy.Health, Is.LessThan(health), "Held stick must not swallow the basic attack request or windup.");
            Vector3 position = player.transform.position;
            yield return new WaitForSeconds(.15f);
            Assert.That(Vector3.Distance(position, player.transform.position), Is.GreaterThan(.1f));
            battle.Joystick.OnPointerUp(stick);
        }
        [UnityTest]
        public IEnumerator IndicatorTracksOwnerAndEndingOtherFingerDoesNotHideAim()
        {
            SkillButton first = battle.Skills[0], second = battle.Skills[1];
            PointerEventData a = PointerFor((RectTransform)first.transform, 72);
            first.OnPointerDown(a); a.position += Vector2.right * 100; first.OnDrag(a);
            PointerEventData b = PointerFor((RectTransform)second.transform, 73);
            second.OnPointerDown(b); b.position += Vector2.up * 100; second.OnDrag(b);
            yield return null;
            LineRenderer line = player.transform.Find("Ability telegraph").GetComponent<LineRenderer>();
            Assert.That(line.enabled, Is.True);
            first.ResetInput();
            Assert.That(line.enabled, Is.True, "An unrelated finger ending must not hide the active aim.");
            Assert.That(player.GetComponent<CharacterMotor>().Warp(player.transform.position + Vector3.right), Is.True);
            yield return null;
            Assert.That(Vector3.Distance(line.GetPosition(0), player.transform.position + Vector3.up * .12f), Is.LessThan(.01f));
            second.ResetInput();
            Assert.That(line.enabled, Is.False);
        }
        [UnityTest]
        public IEnumerator FocusLossCancelsCaptureAndCommittedCastWithoutLateRelease()
        {
            PressAndMoveStick();
            PointerEventData finger = PointerFor((RectTransform)battle.Skills[0].transform, 72);
            battle.Skills[0].OnPointerDown(finger); battle.Skills[0].OnPointerUp(finger);
            Assert.That(abilities.Casting, Is.True);
            player.GetComponentInChildren<Animator>().speed = 0;
            typeof(PlayerController).GetMethod("OnApplicationFocus", BindingFlags.Instance | BindingFlags.NonPublic).Invoke(player, new object[] { false });
            Assert.That(battle.Joystick.IsPressed, Is.False);
            Assert.That(battle.Joystick.Value, Is.EqualTo(Vector2.zero));
            Assert.That(abilities.Casting, Is.False);
            Assert.That(gate.Busy, Is.False);
            yield return null;
        }
        [UnityTest]
        public IEnumerator DeathClearsGestureSoOldFingerCannotCastAfterRespawn()
        {
            PressAndMoveStick();
            var finger = PointerFor((RectTransform)battle.Skills[0].transform, 72);
            battle.Skills[0].OnPointerDown(finger);
            var owner = player.GetComponent<Combatant>(); owner.ReceiveDamage(owner.MaxHealth, null);
            Assert.That(battle.Joystick.IsPressed, Is.False);
            Assert.That(battle.Skills[0].IsPressed, Is.False);
            owner.Restore(); float mana = owner.Mana;
            battle.Skills[0].OnPointerUp(finger);
            Assert.That(abilities.Casting, Is.False);
            Assert.That(owner.Mana, Is.EqualTo(mana));
            yield return null;
        }
        [UnityTest]
        public IEnumerator PausedMatchRejectsCastWithoutSpendingManaOrStartingCooldown()
        {
            Time.timeScale = 0;
            var owner = player.GetComponent<Combatant>(); float mana = owner.Mana;
            Assert.That(abilities.Cast(0, Vector3.forward, true), Is.False);
            var finger = PointerFor((RectTransform)battle.Skills[0].transform, 72);
            battle.Skills[0].OnPointerDown(finger); battle.Skills[0].OnPointerUp(finger);
            Assert.That(abilities.Casting, Is.False);
            Assert.That(owner.Mana, Is.EqualTo(mana));
            Assert.That(abilities.CooldownRemaining(0), Is.Zero);
            yield return null;
        }
        PointerEventData PressAndMoveStick()
        {
            var pointer = PointerFor((RectTransform)battle.Joystick.transform, 71);
            battle.Joystick.OnPointerDown(pointer); pointer.position += Vector2.right * 180; battle.Joystick.OnDrag(pointer);
            Assert.That(battle.Joystick.Value.sqrMagnitude, Is.GreaterThan(.1f)); return pointer;
        }
        static PointerEventData PointerFor(RectTransform rect, int id) => new PointerEventData(EventSystem.current)
        { pointerId = id, button = PointerEventData.InputButton.Left,
            position = RectTransformUtility.WorldToScreenPoint(null, rect.TransformPoint(rect.rect.center)) };
    }
}
#endif
