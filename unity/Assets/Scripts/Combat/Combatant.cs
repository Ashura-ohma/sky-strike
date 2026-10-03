using System;
using System.Collections.Generic;
using UnityEngine;

namespace SkyStrike.Combat
{
    public enum UnitKind { Hero, Minion, Tower, Base }
    /// <summary>Shared target identity and vitals. Registry avoids per-frame scene queries.</summary>
    public sealed class Combatant : MonoBehaviour
    {
        public static readonly List<Combatant> Active = new List<Combatant>(128);
        [SerializeField] int team;
        [SerializeField] UnitKind kind;
        [SerializeField, Min(1)] float maxHealth = 900;
        [SerializeField, Min(0)] float maxMana = 260;
        public int Team => team;
        public UnitKind Kind => kind;
        public Vector3 HitPoint => transform.position + ((kind == UnitKind.Tower || kind == UnitKind.Base) ? Vector3.zero : Vector3.up);
        public float Health { get; private set; }
        public float Mana { get; private set; }
        public float MaxHealth => maxHealth;
        public float MaxMana => maxMana;
        public bool Alive => Health > 0 && isActiveAndEnabled;
        public int LifeVersion { get; private set; }
        public event Action<Combatant, float> Damaged;
        public event Action<Combatant> Died;
        void Awake() { Restore(); }
        void OnEnable() { if (!Active.Contains(this)) Active.Add(this); }
        void OnDisable() { Active.Remove(this); }
        public void Configure(int side, UnitKind type, float hp, float mana)
        { team = side; kind = type; maxHealth = Mathf.Max(1, hp); maxMana = Mathf.Max(0, mana); Restore(); }
        public void Restore() { Health = maxHealth; Mana = maxMana; LifeVersion++; }
        public bool SpendMana(float amount)
        { if (!Alive || amount < 0 || Mana < amount) return false; Mana -= amount; return true; }
        public void RefundMana(float amount) { Mana = Mathf.Min(maxMana, Mana + Mathf.Max(0, amount)); }
        public void Heal(float amount) { if (Alive) Health = Mathf.Min(maxHealth, Health + Mathf.Max(0, amount)); }
        public void ReceiveDamage(float amount, Combatant source)
        {
            if (!Alive || amount <= 0 || (source != null && source.Team == team)) return;
            float applied = Mathf.Min(Health, amount); Health -= applied;
            Damaged?.Invoke(this, applied);
            if (Health <= 0) Died?.Invoke(this);
        }
    }
}
