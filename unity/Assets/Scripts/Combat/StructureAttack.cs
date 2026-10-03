using UnityEngine;
using SkyStrike.Targeting;
namespace SkyStrike.Combat
{
    public sealed class StructureAttack : MonoBehaviour
    {
        public ProjectilePool Pool;
        public float Range = 8, Damage = 95;
        Combatant owner; TargetingSystem targeting; float next;
        void Start() { owner = GetComponent<Combatant>(); targeting = GetComponent<TargetingSystem>(); }
        void Update()
        {
            if (!owner.Alive || Time.time < next) return;
            Combatant target = targeting.Acquire(Range);
            if (target == null) return;
            next = Time.time + 1.2f;
            Pool.Fire(owner, target, transform.position + Vector3.up * 2, target.transform.position - transform.position, Damage, 14, Range + 2, .5f);
        }
    }
}
