using SkyStrike.Combat;
using UnityEngine;

namespace SkyStrike.Targeting
{
    public enum TargetPriority { Nearest, LowestHealth, LowestHealthPercent }
    public sealed class TargetingSystem : MonoBehaviour
    {
        [SerializeField] Combatant owner;
        [SerializeField] TargetPriority priority;
        [SerializeField] bool heroesFirst = true;
        int currentLife, manualLife;
        public Combatant Current { get; private set; }
        public Combatant Manual { get; private set; }
        public void Configure(Combatant unit) { owner = unit; Clear(); }
        public bool SetManual(Combatant target, float acquisitionRange)
        { if (!Valid(target, acquisitionRange)) return false; Manual = target; manualLife = target.LifeVersion; Remember(target); return true; }
        public void Clear() { Manual = Current = null; currentLife = manualLife = 0; }
        Combatant Remember(Combatant target)
        { Current = target; currentLife = target != null ? target.LifeVersion : 0; return target; }
        bool SameLife(Combatant target, int life) => target != null && target.LifeVersion == life;
        public bool Valid(Combatant target, float range)
        {
            return owner != null && owner.Alive && target != null && target.Alive &&
                target.Team != owner.Team && (target.transform.position - owner.transform.position).sqrMagnitude <= range * range;
        }
        public Combatant Acquire(float range, bool retainCurrent = true)
        {
            if (SameLife(Manual, manualLife) && Valid(Manual, range)) return Remember(Manual);
            Manual = null;
            if (retainCurrent && SameLife(Current, currentLife) && Valid(Current, range)) return Current;
            return Remember(FindBest(range));
        }
        /// <summary>Find a skill target without changing the player's attack lock.</summary>
        public Combatant Query(float range)
        {
            if (SameLife(Manual, manualLife) && Valid(Manual, range)) return Manual;
            if (SameLife(Current, currentLife) && Valid(Current, range)) return Current;
            return FindBest(range);
        }
        Combatant FindBest(float range)
        {
            Combatant best = null; float bestScore = float.PositiveInfinity;
            for (int i = 0; i < Combatant.Active.Count; i++)
            {
                Combatant candidate = Combatant.Active[i];
                if (!Valid(candidate, range)) continue;
                if (best != null && heroesFirst && best.Kind == UnitKind.Hero && candidate.Kind != UnitKind.Hero) continue;
                float score = Score(candidate);
                bool higherTier = heroesFirst && candidate.Kind == UnitKind.Hero && best != null && best.Kind != UnitKind.Hero;
                if (best == null || higherTier || score < bestScore ||
                    (Mathf.Approximately(score, bestScore) && candidate.GetInstanceID() < best.GetInstanceID()))
                { best = candidate; bestScore = score; }
            }
            return best;
        }
        float Score(Combatant target)
        {
            switch (priority)
            {
                case TargetPriority.LowestHealth: return target.Health;
                case TargetPriority.LowestHealthPercent: return target.Health / target.MaxHealth;
                default: return (target.transform.position - owner.transform.position).sqrMagnitude;
            }
        }
        public void SetPriority(TargetPriority mode, bool preferHeroes)
        { priority = mode; heroesFirst = preferHeroes; Current = null; }
        public Combatant Cycle(float range)
        {
            Combatant previous = Current; Combatant result = null; int nextId = int.MaxValue, smallestId = int.MaxValue;
            Combatant first = null; int id = previous != null ? previous.GetInstanceID() : int.MinValue;
            for (int i = 0; i < Combatant.Active.Count; i++)
            {
                Combatant c = Combatant.Active[i]; if (!Valid(c, range)) continue;
                int candidateId = c.GetInstanceID();
                if (candidateId < smallestId) { first = c; smallestId = candidateId; }
                if (candidateId > id && candidateId < nextId) { result = c; nextId = candidateId; }
            }
            Manual = result != null ? result : first;
            manualLife = Manual != null ? Manual.LifeVersion : 0;
            return Remember(Manual);
        }
    }
}
