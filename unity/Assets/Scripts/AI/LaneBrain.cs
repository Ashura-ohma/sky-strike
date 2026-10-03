using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Targeting;
using UnityEngine;
namespace SkyStrike.AI
{
    public sealed class LaneBrain : MonoBehaviour
    {
        public Transform Goal;
        public float AggroRange = 9;
        Combatant owner;
        CharacterMotor motor;
        AttackController attacks;
        AnimationGate animationGate;
        TargetingSystem targeting;
        float thinkAt;
        void Start()
        { owner = GetComponent<Combatant>(); motor = GetComponent<CharacterMotor>(); attacks = GetComponent<AttackController>(); animationGate = GetComponent<AnimationGate>(); targeting = GetComponent<TargetingSystem>(); }
        void Update()
        {
            if (!owner.Alive) { motor.Stop(); return; }
            animationGate.Locomotion(motor.Moving);
            if (Time.time < thinkAt) return;
            thinkAt = Time.time + .2f;
            Combatant target = targeting.Acquire(AggroRange);
            if (target != null) attacks.Request();
            else if (Goal != null && !animationGate.Busy) motor.Chase(Goal.position, 2);
        }
    }
}
