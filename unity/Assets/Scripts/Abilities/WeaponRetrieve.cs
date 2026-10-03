using SkyStrike.Combat;
using UnityEngine;
namespace SkyStrike.Abilities
{
    /// <summary>Ilyra leaves a capacitor on volley impact; walking to it restores mana and reduces dash cooldown.</summary>
    public sealed class WeaponRetrieve : MonoBehaviour
    {
        [SerializeField] Transform marker;
        Combatant owner;
        AbilityController abilities;
        float expiresAt;
        bool dropped;
        public void Configure(Transform visual) { marker = visual; marker.gameObject.SetActive(false); }
        void Awake() { owner = GetComponent<Combatant>(); abilities = GetComponent<AbilityController>(); }
        public void Drop(Vector3 point)
        {
            if (marker == null) return;
            marker.position = point + Vector3.up * .1f; marker.gameObject.SetActive(true);
            expiresAt = Time.time + 4; dropped = true;
        }
        void Update()
        {
            if (!dropped) return;
            if (!owner.Alive || Time.time > expiresAt) { Clear(); return; }
            if ((transform.position - marker.position).sqrMagnitude > 1.7f * 1.7f) return;
            owner.RefundMana(18); abilities.ReduceCooldown(1, 2.2f); Clear();
        }
        void Clear() { dropped = false; if (marker != null) marker.gameObject.SetActive(false); }
        void OnDisable() { Clear(); }
    }
}
