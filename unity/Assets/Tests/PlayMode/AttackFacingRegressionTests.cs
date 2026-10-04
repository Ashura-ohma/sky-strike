#if UNITY_EDITOR
using System.Collections;
using NUnit.Framework;
using SkyStrike.AI;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Core;
using SkyStrike.Targeting;
using SkyStrike.UI;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace SkyStrike.Tests
{
    public sealed class AttackFacingRegressionTests
    {
        Scene scene;
        float timeScale;
        int frameRate, vSync;
        [UnitySetUp] public IEnumerator Setup()
        {
            timeScale = Time.timeScale; frameRate = Application.targetFrameRate; vSync = QualitySettings.vSyncCount;
            Time.timeScale = 1;
            yield return EditorSceneManager.LoadSceneAsyncInPlayMode("Assets/Scenes/Battle/Battle.unity", new LoadSceneParameters(LoadSceneMode.Single));
            scene = SceneManager.GetSceneByPath("Assets/Scenes/Battle/Battle.unity");
            yield return null; yield return null;
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            if (scene.IsValid() && scene.isLoaded)
            {
                SceneManager.SetActiveScene(SceneManager.CreateScene("Attack facing cleanup"));
                yield return SceneManager.UnloadSceneAsync(scene);
            }
            Time.timeScale = timeScale; Application.targetFrameRate = frameRate; QualitySettings.vSyncCount = vSync;
        }
        [UnityTest] public IEnumerator BehindTargetIsFacedThroughoutWindupAndExactlyAtProjectileSpawn()
        {
            BattleRuntime battle = Object.FindFirstObjectByType<BattleRuntime>();
            PlayerController player = Object.FindFirstObjectByType<PlayerController>();
            Combatant owner = player.GetComponent<Combatant>(), enemy = null;
            foreach (Combatant unit in Combatant.Active)
                if (unit.Kind == UnitKind.Hero && unit.Team != owner.Team) enemy = unit;
            Assert.That(enemy, Is.Not.Null);
            battle.enabled = false;
            foreach (var brain in Object.FindObjectsByType<LaneBrain>(FindObjectsSortMode.None)) brain.enabled = false;
            foreach (var structure in Object.FindObjectsByType<StructureAttack>(FindObjectsSortMode.None)) structure.enabled = false;
            foreach (var attack in Object.FindObjectsByType<AttackController>(FindObjectsSortMode.None))
            { attack.Cancel(); if (attack.gameObject != player.gameObject) attack.enabled = false; }
            foreach (var motor in Object.FindObjectsByType<CharacterMotor>(FindObjectsSortMode.None)) motor.Stop();
            PooledProjectile[] shots = Object.FindObjectsByType<PooledProjectile>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            foreach (var shot in shots) { shot.gameObject.SetActive(false); shot.enabled = false; }
            Assert.That(enemy.GetComponent<CharacterMotor>().Warp(player.transform.position + Vector3.back * 3), Is.True);
            player.transform.rotation = Quaternion.identity;
            CharacterMotor movement = player.GetComponent<CharacterMotor>(); movement.TurnSpeed = 90;
            Assert.That(player.GetComponent<TargetingSystem>().SetManual(enemy, battle.Hero.acquisitionRange), Is.True);
            AttackController attacks = player.GetComponent<AttackController>();
            Animator animator = player.GetComponentInChildren<Animator>();
            battle.AttackButton.onClick.Invoke();
            float deadline = Time.realtimeSinceStartup + 5;
            while (!attacks.Windup && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.That(attacks.Windup, Is.True);
            animator.speed = 0;
            float before = Vector3.Angle(player.transform.forward, enemy.transform.position - player.transform.position);
            yield return new WaitForSeconds(.1f);
            float after = Vector3.Angle(player.transform.forward, enemy.transform.position - player.transform.position);
            Assert.That(after, Is.LessThan(before - 1), "Owned attack windup must continue turning toward its locked target.");
            Assert.That(after, Is.GreaterThan(30), "This fixture must still require final release alignment.");
            animator.speed = battle.Hero.attacksPerSecond;
            bool emitted = false;
            deadline = Time.realtimeSinceStartup + 5;
            while (!emitted && Time.realtimeSinceStartup < deadline)
            {
                foreach (var shot in shots) if (shot.gameObject.activeSelf) emitted = true;
                if (!emitted) yield return null;
            }
            Assert.That(emitted, Is.True, "A real Animator release must launch a pooled projectile.");
            Vector3 direction = Vector3.ProjectOnPlane(enemy.transform.position - player.transform.position, Vector3.up).normalized;
            Assert.That(Vector3.Dot(player.transform.forward, direction), Is.GreaterThan(.999f), "The hero must face the target when its projectile appears.");
            LogAssert.NoUnexpectedReceived();
        }
    }
}
#endif
