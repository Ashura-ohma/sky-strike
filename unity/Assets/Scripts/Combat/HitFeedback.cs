using UnityEngine;
namespace SkyStrike.Combat
{
    public sealed class HitFeedback : MonoBehaviour
    {
        public ParticleSystem HitParticles;
        Combatant owner;
        void Start() { owner = GetComponent<Combatant>(); owner.Damaged += Hit; }
        void Hit(Combatant unit, float damage) { if (HitParticles != null) HitParticles.Play(); }
        void OnDestroy() { if (owner != null) owner.Damaged -= Hit; }
    }
}
