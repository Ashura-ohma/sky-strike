using SkyStrike.Abilities;
using SkyStrike.Character;
using SkyStrike.Combat;
using SkyStrike.Input;
using SkyStrike.Targeting;
using UnityEngine;
using UnityEngine.InputSystem;
namespace SkyStrike.UI
{
    public sealed class PlayerController : MonoBehaviour
    {
        public FloatingJoystick Joystick;
        public SkillButton[] Skills;
        public Transform CameraTransform;
        CharacterMotor motor;
        AttackController attacks;
        AbilityController abilities;
        AnimationGate animationGate;
        Combatant owner;
        bool wasMoving;
        void Start()
        {
            motor = GetComponent<CharacterMotor>(); attacks = GetComponent<AttackController>();
            abilities = GetComponent<AbilityController>(); animationGate = GetComponent<AnimationGate>(); owner = GetComponent<Combatant>();
            for (int i = 0; i < Skills.Length; i++) Skills[i].CastRequested += Cast;
            owner.Died += OnDeath;
        }
        void Update()
        {
            if (!owner.Alive || Time.timeScale <= 0) { ResetControls(); return; }
            Vector2 input = Joystick != null ? Joystick.Value : Vector2.zero;
#if UNITY_EDITOR || UNITY_STANDALONE
            if (Keyboard.current != null)
            {
                input += new Vector2((Keyboard.current.dKey.isPressed ? 1 : 0) - (Keyboard.current.aKey.isPressed ? 1 : 0),
                    (Keyboard.current.wKey.isPressed ? 1 : 0) - (Keyboard.current.sKey.isPressed ? 1 : 0));
                if (Keyboard.current.spaceKey.wasPressedThisFrame) attacks.Request();
            }
#endif
            // Alpha3 input policy: a committed skill/basic attack owns its windup.
            // Drag-to-cancel applies before skill release; movement cancels recovery,
            // not an already committed windup. Keep the stick captured for resumption.
            if (abilities.Casting || attacks.Windup) { motor.Stop(); animationGate.Locomotion(false); return; }
            if (attacks.HasRequestedAttack) { animationGate.Locomotion(motor.Moving); return; }
            if (input.sqrMagnitude > .0001f)
            { attacks.CancelForMovement(); abilities.CancelForMovement(); motor.Move(CharacterMotor.CameraRelative(input, CameraTransform)); wasMoving = true; }
            else if (wasMoving) { motor.Stop(); wasMoving = false; }
            animationGate.Locomotion(motor.Moving);
        }
        public void Attack() { if (isActiveAndEnabled && Time.timeScale > 0 && owner != null && owner.Alive) attacks.Request(); }
        public void SwitchTarget() { if (isActiveAndEnabled && owner != null && owner.Alive && Time.timeScale > 0) GetComponent<TargetingSystem>().Cycle(abilities.AcquisitionRange); }
        void Cast(SkillCastRequest request)
        {
            if (!isActiveAndEnabled || Time.timeScale <= 0 || owner == null || !owner.Alive) return;
            Vector3 aim = CharacterMotor.CameraRelative(request.Aim, CameraTransform);
            abilities.Cast(request.AbilityId, aim, request.IsSmartCast);
        }
        void OnDeath(Combatant _) => ResetControls();
        void OnDisable() => ResetControls();
        void OnApplicationFocus(bool focused) { if (!focused) ResetControls(); }
        void OnApplicationPause(bool paused) { if (paused) ResetControls(); }
        void ResetControls()
        {
            if (Joystick != null) Joystick.ResetInput();
            if (Skills != null) foreach (SkillButton skill in Skills) if (skill != null) skill.ResetInput();
            if (abilities != null) abilities.Cancel();
            if (attacks != null) attacks.Cancel();
            if (motor != null) motor.Stop();
            wasMoving = false;
        }
        void OnDestroy()
        { if (owner != null) owner.Died -= OnDeath; if (Skills != null) for (int i = 0; i < Skills.Length; i++) if (Skills[i] != null) Skills[i].CastRequested -= Cast; }
    }
}
