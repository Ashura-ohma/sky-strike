using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Data;
using SkyStrike.Targeting;
using UnityEngine;
namespace SkyStrike.Abilities
{
    public sealed class AbilityController : MonoBehaviour
    {
        HeroDefinition hero;
        ProjectilePool pool;
        Combatant owner;
        CharacterMotor motor;
        AnimationGate gate;
        AttackController attacks;
        TargetingSystem targeting;
        readonly float[] readyAt = new float[4];
        AbilityDefinition pending;
        Vector3 pendingAim;
        Combatant pendingTarget;
        bool released;
        int pendingLife;
        float pointStrength;
        public void Configure(HeroDefinition definition, ProjectilePool projectiles)
        {
            hero = definition; pool = projectiles; owner = GetComponent<Combatant>(); motor = GetComponent<CharacterMotor>();
            gate = GetComponent<AnimationGate>(); attacks = GetComponent<AttackController>(); targeting = GetComponent<TargetingSystem>();
        }
        public float CooldownRemaining(int index) => index >= 0 && index < 4 ? Mathf.Max(0, readyAt[index] - Time.time) : 0;
        public void ReduceCooldown(int index, float seconds) { if (index >= 0 && index < 4) readyAt[index] -= Mathf.Max(0, seconds); }
        public bool Cast(int index, Vector3 aim, bool smart)
        {
            if (hero == null || index < 0 || index >= hero.abilities.Length || index >= 4 || !owner.Alive || pending != null || Time.time < motor.StunnedUntil || Time.timeScale <= 0 || !isActiveAndEnabled) return false;
            AbilityDefinition definition = hero.abilities[index];
            if (definition == null || CooldownRemaining(index) > 0 || owner.Mana < definition.manaCost) return false;
            Combatant target = definition.type == AbilityType.Dash || definition.type == AbilityType.Self
                ? null : targeting.Query(definition.range);
            aim.y = 0;
            if (smart && target != null && definition.type != AbilityType.Dash) aim = target.HitPoint - owner.HitPoint;
            pointStrength = smart ? 1 : Mathf.Clamp01(aim.magnitude);
            if (aim.sqrMagnitude < .001f) aim = transform.forward;
            aim.Normalize();
            if (!smart && definition.allowAssistForManualAim && target != null)
            {
                Vector3 toward = (target.HitPoint - owner.HitPoint).normalized;
                if (Vector3.Angle(aim, toward) <= definition.aimAssistAngle)
                    aim = Vector3.Slerp(aim, toward, definition.aimAssistStrength).normalized;
            }
            if (definition.type == AbilityType.TargetUnit && target == null) return false;
            attacks.Cancel(); motor.Stop(); motor.Face(aim);
            pending = definition; pendingAim = aim; pendingTarget = definition.type == AbilityType.TargetUnit ? target : null; released = false; pendingLife = pendingTarget != null ? pendingTarget.LifeVersion : 0;
            if (!gate.Play(definition.animatorState, definition.releaseNormalizedTime, 1, Release, Finish, this)) { pending = null; return false; }
            owner.SpendMana(definition.manaCost); readyAt[index] = Time.time + definition.cooldown;
            return true;
        }
        void Release()
        {
            if (pending == null || !owner.Alive || Time.time < motor.StunnedUntil) return;
            if (pending.type == AbilityType.TargetUnit && (pendingTarget == null || pendingTarget.LifeVersion != pendingLife || !targeting.Valid(pendingTarget, pending.range))) return;
            motor.FaceImmediate(pendingAim);
            released = true;
            if (pending.type == AbilityType.Dash) motor.Dash(pendingAim, pending.range);
            else if (pending.type == AbilityType.Self || pending.type == AbilityType.AOE || pending.type == AbilityType.TargetPoint)
            {
                Vector3 center = pending.type == AbilityType.TargetPoint ? transform.position + pendingAim * pending.range * pointStrength : transform.position;
                for (int i = 0; i < Combatant.Active.Count; i++)
                {
                    Combatant target = Combatant.Active[i];
                    if (target.Alive && target.Team != owner.Team && (target.transform.position - center).sqrMagnitude <= pending.radius * pending.radius)
                        target.ReceiveDamage(pending.damage, owner);
                }
            }
            else pool.Fire(owner, pendingTarget, transform.position + Vector3.up, pendingAim, pending.damage,
                pending.projectileSpeed, pending.range, pending.radius, pending.effect == AbilityEffect.Snare ? .8f : 0,
                pending.effect == AbilityEffect.RetrieveVolley);
        }
        void Finish() { pending = null; }
        public void CancelForMovement() => Cancel();
        public void Cancel()
        {
            if (pending == null) return;
            // Cancel a cast without damage. A committed cast keeps mana/cooldown, preventing cancel-spam exploits.
            gate.CancelOwnedBy(this); pending = null; pendingTarget = null;
        }
        void OnDisable() => Cancel();
        void Update()
        {
            if (pending == null) return;
            if (!owner.Alive || !gate.IsOwnedBy(this) || Time.time < motor.StunnedUntil) { Cancel(); return; }
            if (!released) motor.Face(pendingAim);
        }
        public float AcquisitionRange => hero != null ? hero.acquisitionRange : 0;
        public bool Casting => pending != null && !released;
    }
}
