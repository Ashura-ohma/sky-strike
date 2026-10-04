using SkyStrike.Combat;
using UnityEngine;
namespace SkyStrike.Character
{
    public sealed class DeathPresentation : MonoBehaviour
    {
        Combatant owner;
        void Start() { owner = GetComponent<Combatant>(); owner.Died += OnDeath; }
        void OnDeath(Combatant unit)
        { GetComponent<AttackController>().Cancel(); GetComponent<CharacterMotor>().EnterDeath(); GetComponent<AnimationGate>().Play("Death", 1, 1, null, null); }
        void OnDestroy() { if (owner != null) owner.Died -= OnDeath; }
    }
}
