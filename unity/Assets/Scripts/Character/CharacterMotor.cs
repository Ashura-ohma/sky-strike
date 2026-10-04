using SkyStrike.Combat;
using UnityEngine;
using UnityEngine.AI;
namespace SkyStrike.Character
{
    [RequireComponent(typeof(NavMeshAgent))]
    public sealed class CharacterMotor : MonoBehaviour
    {
        NavMeshAgent agent;
        Combatant owner;
        public float Speed = 6;
        public float TurnSpeed = 900;
        public bool Moving { get; private set; }
        public float StunnedUntil { get; private set; }
        void Awake()
        {
            agent = GetComponent<NavMeshAgent>(); owner = GetComponent<Combatant>();
            agent.updateRotation = false; agent.acceleration = 100; agent.angularSpeed = 0;
        }
        public static Vector3 CameraRelative(Vector2 input, Transform camera)
        {
            Vector3 forward = Vector3.ProjectOnPlane(camera.forward, Vector3.up).normalized;
            Vector3 right = Vector3.Cross(Vector3.up, forward);
            return (right * input.x + forward * input.y) * Mathf.Min(1, input.magnitude) / Mathf.Max(input.magnitude, .0001f);
        }
        public void Move(Vector3 direction)
        {
            Stop();
            if (!CanMove || direction.sqrMagnitude < .00001f) return;
            Vector3 delta = Vector3.ClampMagnitude(direction, 1) * (Speed * Time.deltaTime);
            agent.Move(delta); Moving = true; Face(direction);
        }
        public void Chase(Vector3 position, float stopDistance)
        {
            if (!CanMove) { Stop(); return; }
            agent.speed = Speed; agent.stoppingDistance = stopDistance;
            agent.isStopped = false;
            if (!agent.hasPath || (agent.destination - position).sqrMagnitude > .16f) agent.SetDestination(position);
            Moving = agent.velocity.sqrMagnitude > .01f;
            if (Moving) Face(agent.velocity);
        }
        public void Face(Vector3 direction)
        {
            direction.y = 0;
            if (direction.sqrMagnitude > .0001f)
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(direction), TurnSpeed * Time.deltaTime);
        }
        public void FaceImmediate(Vector3 direction)
        {
            direction.y = 0;
            if (direction.sqrMagnitude > .0001f) transform.rotation = Quaternion.LookRotation(direction);
        }
        public void Stop()
        {
            Moving = false;
            if (agent == null || !agent.enabled || !agent.isOnNavMesh) return;
            agent.isStopped = true; agent.ResetPath(); agent.velocity = Vector3.zero;
        }
        public void Stun(float seconds) { StunnedUntil = Mathf.Max(StunnedUntil, Time.time + seconds); Stop(); }
        bool CanMove => agent != null && agent.enabled && agent.isOnNavMesh && owner != null && owner.Alive && Time.time >= StunnedUntil;
        public void Dash(Vector3 direction, float distance)
        {
            Stop(); if (!CanMove) return;
            Vector3 end = transform.position + direction.normalized * distance;
            if (NavMesh.Raycast(transform.position, end, out NavMeshHit hit, agent.areaMask)) end = hit.position;
            if (NavMesh.SamplePosition(end, out hit, .5f, agent.areaMask)) agent.Warp(hit.position);
        }
        public void EnterDeath()
        {
            Stop();
            // Disabled agents do not keep pushing live units away from a corpse.
            if (agent != null) agent.enabled = false;
        }
        public void ResetForSpawn()
        {
            StunnedUntil = 0; Moving = false;
            if (agent != null) agent.enabled = true;
            Stop();
        }
        public bool Warp(Vector3 position)
        {
            // Warp is also the recovery path for an agent that has fallen off its mesh.
            if (agent == null || !agent.enabled || !gameObject.activeInHierarchy) return false;
            if (!NavMesh.SamplePosition(position, out NavMeshHit hit, 1, agent.areaMask)) return false;
            bool warped = agent.Warp(hit.position);
            if (warped) Stop();
            return warped;
        }
    }
}
