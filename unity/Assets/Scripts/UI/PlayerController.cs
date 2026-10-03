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
        }
        void Update()
        {
            if (!owner.Alive) { motor.Stop(); return; }
            Vector2 input = Joystick != null ? Joystick.Value : Vector2.zero;
#if UNITY_EDITOR || UNITY_STANDALONE
            if (Keyboard.current != null)
            {
                input += new Vector2((Keyboard.current.dKey.isPressed ? 1 : 0) - (Keyboard.current.aKey.isPressed ? 1 : 0),
                    (Keyboard.current.wKey.isPressed ? 1 : 0) - (Keyboard.current.sKey.isPressed ? 1 : 0));
                if (Keyboard.current.spaceKey.wasPressedThisFrame) attacks.Request();
            }
#endif
            if (input.sqrMagnitude > .0001f)
            { attacks.CancelForMovement(); abilities.CancelForMovement(); motor.Move(CharacterMotor.CameraRelative(input, CameraTransform)); wasMoving = true; }
            else if (wasMoving) { motor.Stop(); wasMoving = false; }
            animationGate.Locomotion(motor.Moving);
        }
        public void Attack() { if (owner != null && owner.Alive) attacks.Request(); }
        public void SwitchTarget() { GetComponent<TargetingSystem>().Cycle(12); }
        void Cast(SkillCastRequest request)
        {
            Vector3 aim = CharacterMotor.CameraRelative(request.Aim, CameraTransform);
            abilities.Cast(request.AbilityId, aim, request.IsSmartCast);
        }
        void OnDestroy()
        { if (Skills != null) for (int i = 0; i < Skills.Length; i++) if (Skills[i] != null) Skills[i].CastRequested -= Cast; }
    }
}
