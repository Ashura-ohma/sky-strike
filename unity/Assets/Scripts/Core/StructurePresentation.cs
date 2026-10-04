using SkyStrike.Combat;
using UnityEngine;
using UnityEngine.AI;
namespace SkyStrike.Core
{
    public sealed class StructurePresentation : MonoBehaviour
    {
        Combatant owner;
        void Awake() { owner = GetComponent<Combatant>(); owner.Died += OnDeath; }
        void OnDeath(Combatant _) {
            if (TryGetComponent(out NavMeshObstacle obstacle)) obstacle.enabled = false;
            if (TryGetComponent(out Renderer visual)) visual.enabled = false;
        }
        void OnDestroy() { if (owner != null) owner.Died -= OnDeath; }
    }
}
