using SkyStrike.Character;
using SkyStrike.Data;
using SkyStrike.Targeting;
using UnityEngine;
namespace SkyStrike.Combat
{
    public sealed class AttackController : MonoBehaviour
    {
        Combatant owner, pending;
        CharacterMotor motor;
        AnimationGate animationGate;
        TargetingSystem targeting;
        ProjectilePool projectiles;
        HeroDefinition definition;
        bool requested, alternate;
        float chaseDeadline, readyAt;
        int pendingLife;
        public bool HasRequestedAttack => requested;
        public bool Windup => animationGate != null && animationGate.IsOwnedBy(this) && !animationGate.Released;
        public void Configure(HeroDefinition hero, ProjectilePool pool)
        {
            definition = hero; projectiles = pool; owner = GetComponent<Combatant>(); motor = GetComponent<CharacterMotor>();
            animationGate = GetComponent<AnimationGate>(); targeting = GetComponent<TargetingSystem>();
        }
        public void Request() { requested = true; chaseDeadline = Time.time + 1.25f; }
        public void CancelForMovement()
        { requested = false; pending = null; if (animationGate != null) animationGate.CancelOwnedBy(this); }
        public void Cancel() { requested = false; pending = null; if (animationGate != null) animationGate.CancelOwnedBy(this); if (motor != null) motor.Stop(); }
        void Update()
        {
            if (owner == null || !owner.Alive || definition == null) return;
            if (Time.time < motor.StunnedUntil) { Cancel(); return; }
            if (Windup && pending != null && pending.Alive && pending.LifeVersion == pendingLife)
                motor.Face(pending.transform.position - transform.position);
            if (animationGate.Busy || !requested) return;
            Combatant target = targeting.Acquire(definition.acquisitionRange);
            if (target == null || Time.time > chaseDeadline) { requested = false; motor.Stop(); return; }
            float distance = Vector3.Distance(transform.position, target.transform.position);
            if (distance > definition.attackRange) { motor.Chase(target.transform.position, definition.attackRange * .95f); return; }
            motor.Stop(); motor.Face(target.transform.position - transform.position);
            if (Time.time < readyAt) return;
            pending = target; pendingLife = target.LifeVersion;
            if (animationGate.Play(alternate ? "Attack2" : "Attack1", .38f, definition.attacksPerSecond, Release, Finish, this))
            { alternate = !alternate; requested = false; readyAt = Time.time + 1 / Mathf.Max(.1f, definition.attacksPerSecond); }
            else { requested = false; pending = null; }
        }
        void Release()
        {
            if (owner == null || !owner.Alive || Time.time < motor.StunnedUntil || pending == null || pending.LifeVersion != pendingLife || !targeting.Valid(pending, definition.attackRange + .6f)) return;
            motor.FaceImmediate(pending.transform.position - transform.position);
            projectiles.Fire(owner, pending, transform.position + Vector3.up, pending.transform.position - transform.position,
                definition.attackDamage, 22, definition.attackRange + 1);
        }
        void Finish() { pending = null; }
        void OnDisable() { Cancel(); }
    }
}
