using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Targeting;
using UnityEngine;
namespace SkyStrike.Core
{
    public sealed class RespawnController : MonoBehaviour
    {
        public float Delay = 6;
        Combatant owner; Vector3 spawn; float respawnAt;
        public float Remaining => owner != null && !owner.Alive ? Mathf.Max(0, respawnAt - Time.time) : 0;
        void Start() { owner = GetComponent<Combatant>(); spawn = transform.position; owner.Died += OnDeath; }
        void OnDeath(Combatant victim)
        {
            GetComponent<AttackController>().Cancel(); GetComponent<CharacterMotor>().Stop(); GetComponent<TargetingSystem>().Clear();
            respawnAt = Time.time + Delay;
        }
        void Update()
        {
            if (owner == null || owner.Alive || Time.time < respawnAt) return;
            owner.Restore();
            CharacterMotor motor = GetComponent<CharacterMotor>(); motor.ResetForSpawn(); motor.Warp(spawn);
            GetComponent<AnimationGate>().Cancel();
        }
        void OnDestroy() { if (owner != null) owner.Died -= OnDeath; }
    }
}
