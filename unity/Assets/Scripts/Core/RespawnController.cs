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
        void Start() { owner = GetComponent<Combatant>(); spawn = transform.position; owner.Died += OnDeath; }
        void OnDeath(Combatant victim)
        {
            GetComponent<AttackController>().Cancel(); GetComponent<CharacterMotor>().Stop(); GetComponent<TargetingSystem>().Clear();
            GetComponent<AnimationGate>().Play("Death", 1, 1, null, null);
            respawnAt = Time.time + Delay;
        }
        void Update()
        {
            if (owner == null || owner.Alive || Time.time < respawnAt) return;
            GetComponent<CharacterMotor>().Warp(spawn); owner.Restore(); GetComponent<AnimationGate>().Cancel();
        }
        void OnDestroy() { if (owner != null) owner.Died -= OnDeath; }
    }
}
