using UnityEngine;
namespace SkyStrike.Data
{
    public enum AbilityType { Direction, TargetUnit, TargetPoint, Self, AOE, Dash, Projectile }
    public enum AbilityEffect { RetrieveVolley, Dash, Snare, Lance }
    [CreateAssetMenu(menuName = "Sky Strike/Ability")]
    public sealed class AbilityDefinition : ScriptableObject
    {
        public string displayName;
        public AbilityType type;
        public AbilityEffect effect;
        [Min(0)] public float range = 8, radius = 1, cooldown = 6, manaCost = 25;
        [Min(0)] public float castTime = .18f, backswing = .15f, projectileSpeed = 18, damage = 90;
        [Range(0, 30)] public float aimAssistAngle = 8;
        [Range(0, 1)] public float aimAssistStrength = .2f;
        public bool allowAssistForManualAim;
        public string animatorState = "Skill1";
        [Range(0, 1)] public float releaseNormalizedTime = .4f;
        public Color indicatorColor = Color.cyan;
    }
}
