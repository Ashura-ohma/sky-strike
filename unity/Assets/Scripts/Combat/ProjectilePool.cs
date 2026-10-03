using UnityEngine;
using SkyStrike.Character;
namespace SkyStrike.Combat
{
    /// <summary>Fixed-capacity pool. Exhaustion returns false instead of allocating during combat.</summary>
    public sealed class ProjectilePool : MonoBehaviour
    {
        [SerializeField] PooledProjectile prefab;
        [SerializeField] int capacity = 128;
        PooledProjectile[] entries;
        public void Initialize(PooledProjectile source, int size)
        { if (entries != null) return; prefab = source; capacity = size; Build(); }
        void Start() { if (entries == null && prefab != null) Build(); }
        void Build()
        {
            entries = new PooledProjectile[capacity];
            for (int i = 0; i < capacity; i++) { entries[i] = Instantiate(prefab, transform); entries[i].gameObject.SetActive(false); }
        }
        public bool Fire(Combatant source, Combatant target, Vector3 origin, Vector3 direction,
            float damage, float speed, float range, float radius = .35f, float stun = 0, bool returnsShard = false)
        {
            if (entries == null || source == null || !source.Alive) return false;
            for (int i = 0; i < entries.Length; i++)
                if (!entries[i].gameObject.activeSelf)
                { entries[i].Launch(source, target, origin, direction, damage, speed, range, radius, stun, returnsShard); return true; }
            return false;
        }
    }
}
