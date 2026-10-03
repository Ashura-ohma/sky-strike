using UnityEngine;
namespace SkyStrike.Data
{
    [CreateAssetMenu(menuName = "Sky Strike/Hero")]
    public sealed class HeroDefinition : ScriptableObject
    {
        public string displayName = "Ilyra, the Arc Courier";
        public float health = 920, mana = 280, movementSpeed = 6.1f;
        public float attackRange = 7.2f, acquisitionRange = 10, attackDamage = 46, attacksPerSecond = 1.35f;
        public AbilityDefinition[] abilities = new AbilityDefinition[4];
    }
}
