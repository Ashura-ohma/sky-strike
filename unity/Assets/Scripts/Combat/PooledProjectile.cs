using UnityEngine;
using SkyStrike.Character;
namespace SkyStrike.Combat
{
    public sealed class PooledProjectile : MonoBehaviour
    {
        Combatant source, target;
        int sourceLife, targetLife;
        Vector3 direction;
        float damage, speed, remaining, radius, stun;
        bool shard, targeted;
        public void Launch(Combatant from, Combatant to, Vector3 origin, Vector3 aim, float amount,
            float velocity, float range, float width, float stunSeconds, bool returnsShard)
        {
            source = from; target = to; targeted = to != null; sourceLife = from.LifeVersion; targetLife = to != null ? to.LifeVersion : 0;
            transform.position = origin; direction = aim.normalized; damage = amount; speed = Mathf.Max(1, velocity);
            remaining = Mathf.Max(.1f, range); radius = width; stun = stunSeconds; shard = returnsShard;
            gameObject.SetActive(true);
        }
        void Update()
        {
            if (source == null || !source.Alive || source.LifeVersion != sourceLife) { Retire(); return; }
            if (targeted && (target == null || !target.Alive || target.LifeVersion != targetLife)) { Retire(); return; }
            Vector3 start = transform.position;
            if (target != null) direction = (target.transform.position + Vector3.up - start).normalized;
            float step = Mathf.Min(remaining, speed * Time.deltaTime);
            Vector3 end = start + direction * step;
            Combatant hit = null; float nearest = float.MaxValue;
            for (int i = 0; i < Combatant.Active.Count; i++)
            {
                Combatant c = Combatant.Active[i];
                if (!c.Alive || c.Team == source.Team || (target != null && c != target)) continue;
                Vector3 center = c.transform.position + Vector3.up;
                float t = Mathf.Clamp01(Vector3.Dot(center - start, end - start) / Mathf.Max(.0001f, (end - start).sqrMagnitude));
                if ((center - Vector3.Lerp(start, end, t)).sqrMagnitude <= (radius + .45f) * (radius + .45f) && t < nearest)
                { hit = c; nearest = t; }
            }
            transform.position = end; remaining -= step;
            if (hit != null)
            {
                hit.ReceiveDamage(damage, source);
                if (stun > 0 && hit.TryGetComponent(out CharacterMotor motor)) motor.Stun(stun);
                if (shard && source.TryGetComponent(out Abilities.WeaponRetrieve retrieve)) retrieve.Drop(hit.transform.position);
                Retire();
            }
            else if (remaining <= 0) Retire();
        }
        void Retire() { gameObject.SetActive(false); source = target = null; }
    }
}
